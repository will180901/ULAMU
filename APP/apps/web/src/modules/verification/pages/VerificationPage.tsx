/**
 * C1 — Ma vérification. D'après `docs/maquettes/C1 - Ma verification.dc.html`.
 *
 * L'écran par lequel un soignant devient exerçant : sans badge ET contrat signé, il ne peut rien
 * faire sur ULAMU (RM-03-01). C'est donc le premier écran qu'il voit après son inscription, et le
 * seul qui compte tant qu'il n'est pas vérifié.
 *
 * ── Ce que le serveur a dû apprendre pour cet écran (palier du 23/08, §9 du plan) ───────────────
 *
 * Quatre manques, dont un qui dépassait C1 : AUCUNE route ne savait servir les pièces déposées. Les
 * fichiers partaient chiffrés sous des clés `vd_…` que ni `media/avatars` ni `media/sessions`
 * n'acceptent. Le déposant ne pouvait pas relire son diplôme — et l'administration devait décider de
 * sa vérification sans pouvoir l'ouvrir.
 *
 * ── Trois écarts à la maquette ─────────────────────────────────────────────────────────────────
 *
 * 1. Elle donne un ÉTAT PAR PIÈCE (« Validée », « À corriger » avec son motif). Le serveur ne
 *    connaît que la décision au niveau du DOSSIER, avec un motif libre : `VerificationDecision` n'a
 *    aucun lien vers une pièce. Chaque pièce affiche donc ce qui est vrai — déposée ou attendue — et
 *    le motif de l'administration a son propre bloc, que la maquette prévoit aussi.
 * 2. Elle liste une « Assurance responsabilité civile » facultative. Aucun type de pièce
 *    correspondant n'existe (`ID`, `DIPLOMA`, `LICENSE`, `PHOTO`, `ADDRESS_PROOF`). Omise.
 * 3. Elle ne montre PAS la photo d'identité, que le serveur exige pourtant pour déposer. Sans elle,
 *    le dépôt serait refusé sans que l'écran sache dire pourquoi. Ajoutée.
 * 4. **« Commission de 12 % »** — le taux n'est pas écrit : il vient du contrat, et c'est le contrat
 *    SIGNÉ de ce soignant-là qui s'applique à ses paiements (RM-13-07), pas un paramètre global.
 * 5. **« Versement le 5 de chaque mois » retiré** (famille 1, point 2) — aucun versement mensuel
 *    n'existe : ni tâche planifiée, ni route. Le retrait se demande, à tout moment.
 * 6. **« L'administration répond sous 24 heures ouvrées » retiré** (famille 2, point 3). Aucune
 *    messagerie support n'existe — ni module, ni route, ni écran : la phrase promettait un délai de
 *    réponse sans qu'aucun bouton ne permette de poser la question. Et **« ouvrées »** est faux de
 *    toute façon : le serveur compte des heures pleines, un dossier déposé vendredi soir est en
 *    retard lundi, pas mercredi.
 *
 * ── L'avenant, quand le taux change (S4) ───────────────────────────────────────────────────────
 *
 * Un super-administrateur qui change PM-01 dans E3 déclenche la **ré-édition automatique** de tous
 * les contrats signés (EF-03-07, RM-03-05). La version ré-éditée est **non signée** : `canPractice`
 * tombe à `false`, et le soignant **ne peut plus exercer** jusqu'à sa re-signature. Il peut donc
 * perdre son droit d'exercer du jour au lendemain, sans avoir rien fait.
 *
 * Le serveur ne servait que la version COURANTE : l'écran aurait demandé de signer à l'aveugle. S4
 * ajoute la dernière version réellement signée, pour montrer l'ancien taux à côté du nouveau.
 *
 * ⚠️ **Ce parcours ne se teste entièrement qu'avec E3** (chantier 14) : c'est là que le changement
 * de taux se déclenche. Les deux écrans forment une seule fonctionnalité.
 */
import { useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { ContratImprimable } from '@/components/impression/ContratImprimable'
import { ContratLisible } from '@/components/ulamu/ContratLisible'
import { formatTaille, MIMES_PIECE, refusFichier, TAILLE_MAX_OCTETS } from '@/lib/fichier'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Building2,
  Clock,
  FileText,
  GraduationCap,
  IdCard,
  MessageSquareWarning,
  ScrollText,
  ShieldCheck,
  Stamp,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { api, lirePieceJustificative, type DocumentKind, type VerificationCase, type VerificationStatus } from '@/lib/api'
import { Link } from 'react-router-dom'
import { routeAide } from '@/config/contact.config'
import { useSessionStore } from '@/state/session.store'
import { SqueletteCartes } from '@/components/ulamu/Squelette'
import { messageErreur } from '@/lib/message-erreur'

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

const dateHeureFr = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ── Les sept états du dossier, dits en français ────────────────────────────

const ETATS: Record<VerificationStatus, { libelle: string; aide: string; ton: TonPilule; etape: number }> = {
  DRAFT: { libelle: 'Dossier à compléter', aide: 'Déposez vos pièces, puis envoyez le dossier', ton: 'alerte', etape: 0 },
  SUBMITTED: { libelle: 'Dossier déposé', aide: 'En attente de prise en charge par l’administration', ton: 'info', etape: 1 },
  IN_REVIEW: { libelle: 'En cours d’examen', aide: 'Un vérificateur étudie vos pièces', ton: 'info', etape: 2 },
  NEEDS_INFO: { libelle: 'Complément demandé', aide: 'Lisez le motif ci-dessous, corrigez, puis redéposez', ton: 'alerte', etape: 1 },
  REJECTED: { libelle: 'Dossier refusé', aide: 'Lisez le motif ci-dessous : il dit exactement quoi corriger', ton: 'erreur', etape: 1 },
  VERIFIED: { libelle: 'Vérifié', aide: 'Votre badge est actif', ton: 'succes', etape: 3 },
  REVOKED: { libelle: 'Vérification révoquée', aide: 'Contactez l’administration — le motif est ci-dessous', ton: 'erreur', etape: 0 },
}

const ETAPES = ['Dossier constitué', 'Déposé', 'En examen', 'Vérifié']

/*
  ⚠️ **L'historique affichait « Décision : VERIFIED »** — chantier 135, 16/09/2026.

  Le serveur stocke la décision comme une chaîne libre dont le schéma documente les cinq valeurs
  (`VerificationDecision.decision`). L'écran la recopiait telle quelle : un médecin de Brazzaville
  lisait le mot-clé anglais d'une base de données dans la colonne de son propre dossier.

  > **Un mot que le produit n'a jamais traduit est un mot que le produit n'a jamais lu.**

  📌 Le repli garde la valeur brute plutôt que de la masquer — *effacer ce qu'on ne sait pas dire
  fait disparaître l'information avec le problème.* Un filet compare cette table aux valeurs que le
  schéma du serveur déclare : le jour où une sixième apparaît, il tombe.
*/
const DECISIONS: Record<string, string> = {
  VERIFIED: 'Dossier vérifié',
  REJECTED: 'Dossier refusé',
  NEEDS_INFO: 'Complément demandé',
  REVOKED: 'Vérification révoquée',
  REINSTATED: 'Vérification rétablie',
}

const libelleDecision = (code: string) => DECISIONS[code] ?? code

/** « a, b et c » — pour dire ce qui manque sans aligner des puces sous un bouton gris. */
const enumerer = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} et ${xs.at(-1)}`

/** Frise d'avancement. Le numéro d'étape n'est pas décoratif : il vient de l'état réel du dossier. */
function Frise({ courante, echoue }: { courante: number; echoue: boolean }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {ETAPES.map((label, i) => {
        const faite = i < courante
        const ici = i === courante
        return (
          <li key={label} className="flex items-center gap-1">
            <span
              className={
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] font-medium ' +
                (ici && echoue
                  ? 'bg-[var(--erreur-fond)] text-[var(--erreur-texte)]'
                  : ici
                    ? 'bg-[var(--ap-50)] text-[var(--ap-700)]'
                    : faite
                      ? 'text-[var(--succes-texte)]'
                      : 'text-[var(--texte-tertiaire)]')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ' +
                  (faite
                    ? 'bg-[var(--succes-fond)] text-[var(--succes-texte)]'
                    : ici
                      ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,.08)]'
                      : 'bg-secondary text-muted-foreground')
                }
              >
                {faite ? '✓' : i + 1}
              </span>
              {label}
            </span>
            {i < ETAPES.length - 1 ? (
              <span aria-hidden="true" className="h-px w-4 shrink-0 bg-border sm:w-6" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

// ── Pièces justificatives ──────────────────────────────────────────────────

const PIECES: Record<DocumentKind, { titre: string; icone: typeof IdCard; aide: string }> = {
  ID: {
    titre: 'Pièce d’identité',
    icone: IdCard,
    aide: 'Carte nationale ou passeport en cours de validité. Recto et verso peuvent être déposés séparément.',
  },
  DIPLOMA: {
    titre: 'Diplôme',
    icone: GraduationCap,
    aide: 'Diplôme d’État ou équivalence reconnue par le ministère de la Santé.',
  },
  LICENSE: {
    titre: 'Attestation d’inscription à l’Ordre',
    icone: Stamp,
    aide: 'Attestation de moins de 3 mois délivrée par l’Ordre national dont vous relevez.',
  },
  PHOTO: {
    titre: 'Photo d’identité',
    icone: UserRound,
    aide: 'Portrait récent sur fond uni — c’est le visage que le patient verra avant la consultation.',
  },
  ADDRESS_PROOF: {
    titre: 'Justificatif d’adresse',
    icone: Building2,
    aide: 'Document de moins de 3 mois au nom de la structure.',
  },
}

/*
  ⚠️ **Il y avait TROIS plafonds pour une seule règle** — chantier 130, 15/09/2026.

  Cet écran refusait au-delà de 5 Mo ; le contrat d'envoi acceptait ~8 Mo ; le stockage plafonne à
  8 Mo. Un diplôme scanné de 6 Mo était donc refusé ici alors que le serveur l'aurait pris — et le
  message disait « 5 Mo maximum », si bien que le déposant réduisait son fichier pour rien.

  > **Trois chiffres pour une même règle finissent par faire trois règles.**

  La règle vit maintenant dans `lib/fichier.ts`, vendorée depuis `packages/shared` et miroir du
  serveur. Les deux constantes locales disparaissent : *une valeur recopiée est une valeur qui
  dérive.*
*/
const MIMES = MIMES_PIECE

/**
 * Une pièce justificative et ses fichiers.
 *
 * ── Pourquoi PLUSIEURS fichiers par pièce ──────────────────────────────────────────────────────
 *
 * La maquette dit « recto et verso sur un même fichier », et la première version suivait cette
 * consigne à la lettre : un fichier, un point. À l'usage c'est intenable. Une carte nationale se
 * photographie en deux fois, un diplôme scanné arrive parfois page par page, et personne ne va
 * assembler deux images dans un PDF depuis un téléphone à Brazzaville avant de pouvoir s'inscrire.
 *
 * Le serveur, lui, n'a jamais interdit d'attacher plusieurs pièces du même type — c'était l'écran
 * qui n'en montrait qu'une. On affiche donc toutes les pages, avec un bouton pour en ajouter.
 */
function BlocPiece({
  kind,
  documents,
  modifiable,
  onDeposer,
  onRetirer,
  enCours,
}: {
  kind: DocumentKind
  documents: VerificationCase['documents']
  modifiable: boolean
  onDeposer: (f: File) => void
  onRetirer: (id: string) => void
  enCours: boolean
}) {
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [apercu, setApercu] = useState<{ url: string; type: string; titre: string } | null>(null)
  const [ouverture, setOuverture] = useState<string | null>(null)
  const info = PIECES[kind]
  const Icone = info.icone
  const depose = documents.length > 0

  const choisir = (f: File | undefined) => {
    setErreur(null)
    if (!f) return
    // Refusé avant l'envoi : téléverser 8 Mo depuis Brazzaville pour lire « trop lourd » à l'arrivée,
    // c'est plusieurs minutes perdues sur une connexion mobile. La règle et son message viennent
    // désormais de la source partagée — l'écran ne décide plus du plafond.
    const refus = refusFichier(f, MIMES)
    if (refus) {
      setErreur(refus)
      return
    }
    onDeposer(f)
  }

  const voir = async (id: string, numero: number) => {
    setOuverture(id)
    setErreur(null)
    try {
      const f = await lirePieceJustificative(id)
      setApercu({ ...f, titre: documents.length > 1 ? `${info.titre} — page ${numero}` : info.titre })
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setOuverture(null)
    }
  }

  // L'URL `blob:` retient le fichier DÉCHIFFRÉ en mémoire de l'onglet tant qu'elle vit. On la révoque
  // à la fermeture : une pièce d'identité n'a pas à traîner jusqu'à ce que l'onglet soit fermé.
  const fermerApercu = () => {
    if (apercu) URL.revokeObjectURL(apercu.url)
    setApercu(null)
  }

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className={
            'flex size-8 shrink-0 items-center justify-center rounded-md ' +
            (depose ? 'bg-[var(--succes-fond)] text-[var(--succes-texte)]' : 'bg-secondary text-muted-foreground')
          }
        >
          <Icone size={15} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1 basis-52">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{info.titre}</span>
            {/*
              ⚠️ **« À déposer » est une CONSIGNE, pas un constat** (chantier 127). Quand le dépôt est
              fermé — dossier en examen ou décision prise —, elle demande un geste que l'écran
              interdit trois lignes plus bas : *une consigne qu'on ne peut pas suivre n'est pas une
              consigne, c'est un reproche.* On dit alors ce qui EST.
            */}
            <Pilule ton={depose ? 'succes' : 'neutre'}>
              {depose
                ? documents.length > 1
                  ? `${documents.length} pages`
                  : 'Déposée'
                : modifiable
                  ? 'À déposer'
                  : 'Non fournie'}
            </Pilule>
          </span>
          <span className="mt-0.5 block ul-aide">{info.aide}</span>
        </span>
        {modifiable ? (
          <span className="shrink-0">
            <input
              ref={champ}
              type="file"
              accept={MIMES.join(',')}
              className="sr-only"
              onChange={(e) => {
                choisir(e.target.files?.[0])
                // Remis à zéro : sans cela, redéposer DEUX FOIS le même fichier ne déclenche aucun
                // événement `change`, et l'utilisateur croit que le bouton ne marche pas.
                e.target.value = ''
              }}
            />
            <Button type="button" size="sm" variant={depose ? 'outline' : 'default'} onClick={() => champ.current?.click()} disabled={enCours}>
              {depose ? 'Ajouter une page' : 'Déposer'}
              {depose ? null : <Upload size={13} strokeWidth={1.6} aria-hidden="true" />}
            </Button>
          </span>
        ) : null}
      </div>

      {depose ? (
        <ul className="flex flex-col gap-1.5">
          {documents.map((d, i) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded border border-border bg-secondary px-2.5 py-1.5">
              <FileText size={13} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 basis-40 text-[11px] text-[var(--texte-secondaire)]">
                {documents.length > 1 ? `Page ${i + 1} · ` : ''}
                déposée le {dateFr(d.createdAt)}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => voir(d.id, i + 1)} disabled={ouverture === d.id}>
                {ouverture === d.id ? 'Ouverture…' : 'Voir'}
              </Button>
              {modifiable ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRetirer(d.id)}
                  disabled={enCours}
                  aria-label={`Retirer ${info.titre}${documents.length > 1 ? ` page ${i + 1}` : ''}`}
                >
                  <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      {/*
        L'aperçu glisse depuis la DROITE, il ne se pose pas au milieu de l'écran. La différence n'est
        pas décorative : la liste des pièces reste visible à gauche pendant qu'on regarde un fichier,
        donc on enchaîne recto puis verso sans perdre sa place. Une boîte centrée masque tout et
        oblige à refermer pour se souvenir d'où l'on venait.

        Ouvrir un onglet, comme le faisait la première version, était pire encore : sur un poste
        partagé cet onglet reste ouvert derrière soi avec une pièce d'identité dedans.

        Le PDF est affiché dans un cadre CLOISONNÉ (`sandbox` sans `allow-scripts`) : un PDF peut
        embarquer du script, et il n'a rien à exécuter dans le contexte de l'application. Le bouton
        « Ouvrir dans un onglet » demeure pour les navigateurs dont le lecteur PDF refuse ce
        cloisonnement.
      */}
      <Sheet open={apercu !== null} onOpenChange={(v) => (v ? undefined : fermerApercu())}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="text-[15px]">{apercu?.titre}</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-secondary p-4">
            {apercu ? (
              apercu.type.startsWith('image/') ? (
                <img src={apercu.url} alt={apercu.titre} className="mx-auto max-w-full rounded-md" />
              ) : (
                <iframe src={apercu.url} sandbox="" title={apercu.titre} className="h-full min-h-[70vh] w-full rounded-md border border-border bg-card" />
              )
            ) : null}
          </div>
          <SheetFooter className="flex-row justify-end border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => apercu && window.open(apercu.url, '_blank', 'noopener')}>
              Ouvrir dans un onglet
            </Button>
            <SheetClose asChild>
              <Button type="button" size="sm">
                Fermer
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </li>
  )
}

// ── Contrat de partenariat ─────────────────────────────────────────────────

/**
 * Le contrat de partenariat — chantier 135, 16/09/2026.
 *
 * ── Ce qu'on demandait de signer, et comment on le montrait ───────────────────────────────────
 *
 * ⚠️ Le texte s'affichait dans un `<pre>` gris de **11 px**, haut de **288 px**, replié derrière un
 * bouton « Lire le contrat » — et le bouton de signature s'activait **que cette boîte ait été
 * ouverte ou non**. On pouvait signer onze articles sans en avoir vu un seul.
 *
 * > **Un texte qu'on présente en petit, en gris et replié n'est pas présenté : il est rangé.**
 *
 * 📌 **Le contrat à signer est DÉPLOYÉ, et la signature se trouve en bas.** Pas de case « j'ai
 * lu » : *la preuve qu'on a lu, c'est qu'on a dû passer devant.* Une fois signé, il se replie —
 * *un contrat qu'on doit signer se déplie, un contrat signé se range.*
 *
 * 📌 **Il s'imprime AVANT d'être signé.** Le bouton n'apparaissait qu'une fois l'engagement pris :
 * personne ne pouvait sortir le texte pour le lire au calme ou le montrer à un juriste. *Demander
 * une signature sans laisser emporter le texte, c'est demander de signer sur place.*
 *
 * 📌 **L'empreinte est donnée en entier.** L'écran en montrait huit caractères (`a3f9…c210`) alors
 * que la feuille imprimée dit, elle, qu'« une empreinte tronquée ne prouve rien ». *Deux versions
 * d'une même preuve, c'est une preuve de moins.*
 *
 * 📌 **Le bouton de signature dit ce qui manque.** Quatre conditions le grisaient, une seule était
 * expliquée : *un bouton gris sans raison se lit comme une panne.*
 */
function BlocContrat({ dossier, nomComplet, recharger }: { dossier: VerificationCase; nomComplet: string; recharger: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [otp, setOtp] = useState('')
  const [envoye, setEnvoye] = useState(false)
  /**
   * Où le code est parti — dit par le SERVEUR (chantier 138, 16/09/2026).
   *
   * ⚠️ L'écran annonçait « un code de confirmation vient de vous être envoyé » sans dire OÙ. Le
   * code partait alors par SMS, c'est-à-dire dans les journaux du serveur et nulle part ailleurs :
   * le porteur l'a cherché pendant de longues minutes, pendant que l'annuaire restait vide.
   *
   * > **On ne cherche pas dans une boîte dont on ignore l'existence.**
   */
  const [envoi, setEnvoi] = useState<{ hint?: string } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [imprimable, setImprimable] = useState(false)
  const a = dossier.agreement

  const demarrer = useMutation({
    mutationFn: () => api.verificationSignStart(),
    onSuccess: (r) => {
      setEnvoi(r)
      setEnvoye(true)
      setErreur(null)
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  const signer = useMutation({
    mutationFn: () => api.verificationSign({ password: motDePasse, otpCode: otp.trim() }),
    onSuccess: () => {
      setMotDePasse('')
      setOtp('')
      recharger()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  if (!a) {
    return (
      <Carte icone={ScrollText} titre="Contrat de partenariat" sousTitre="Il vous sera proposé une fois votre dossier vérifié">
        <Avis ton="info">
          Aucun contrat n'est encore émis. L'administration l'établit après avoir vérifié vos pièces.
        </Avis>
      </Carte>
    )
  }

  // Le serveur régénère le texte et recompare son empreinte au sceau. S'ils divergent, il ne sert
  // PAS le texte. On ne présente donc jamais un contrat douteux comme s'il faisait foi.
  if (!a.integrity) {
    return (
      <Carte icone={ScrollText} ton="danger" titre="Contrat de partenariat" sousTitre={`Version ${a.version}`}>
        <Avis ton="erreur">
          Le texte de ce contrat ne correspond plus à son empreinte scellée. Il n'est volontairement pas affiché, et il
          ne peut pas être signé en l'état. Prévenez l'administration ULAMU.
        </Avis>
      </Carte>
    )
  }

  const nomCorrespond = nom.trim().toLocaleLowerCase('fr') === nomComplet.trim().toLocaleLowerCase('fr')

  /**
   * Un AVENANT : ce soignant avait un contrat signé, et la version courante ne l'est plus. C'est que
   * l'administration a changé le taux et que le serveur a ré-édité (EF-03-07). Ce n'est donc pas une
   * première signature, et l'écran ne doit surtout pas la présenter comme telle.
   */
  const avenant = a.signedAt === null && dossier.lastSigned !== null ? dossier.lastSigned : null
  const aSigner = a.signedAt === null

  /*
    ⚠️ **Ce qui manque encore, dit plutôt que deviné.** Le bouton se grisait sur quatre conditions —
    nom recopié, mot de passe, code à six chiffres, envoi en cours — et une seule était expliquée.
    *Un bouton gris sans raison se lit comme une panne, et on recharge la page.*
  */
  const manque = [
    !nomCorrespond ? 'votre nom complet' : null,
    motDePasse.length === 0 ? 'votre mot de passe' : null,
    otp.trim().length !== 6 ? 'le code à 6 chiffres' : null,
  ].filter((x): x is string => x !== null)

  const boutonImprimer = a.body ? (
    <Button type="button" size="sm" variant="outline" onClick={() => setImprimable(true)}>
      <Printer size={14} aria-hidden="true" />
      {aSigner ? 'Imprimer ce projet' : 'Imprimer ou enregistrer en PDF'}
    </Button>
  ) : null

  return (
    <Carte
      icone={ScrollText}
      ton={avenant ? 'danger' : 'accent'}
      titre="Contrat de partenariat"
      sousTitre={`Contrat soignant ULAMU · version ${a.version}`}
    >
      {avenant ? (
        <>
          {/*
            Le fait le plus coûteux de tout l'écran : il ne peut plus exercer, et il n'y est pour
            rien. Dit avant tout le reste, avec sa conséquence — pas seulement sa cause.
          */}
          <Avis ton="erreur">
            Votre contrat a été modifié par l'administration. Tant que vous ne l'avez pas re-signé,
            vous n'apparaissez plus dans l'annuaire et ne pouvez recevoir aucune demande.
          </Avis>

          {/*
            L'ancien taux à côté du nouveau (S4). Signer sans voir ce qui change reviendrait à signer
            à l'aveugle — et c'est précisément sur ce chiffre que porte le changement.
          */}
          <dl className="flex flex-wrap items-stretch gap-2">
            <div className="min-w-0 flex-1 basis-36 rounded-md border border-border bg-secondary p-2.5">
              <dt className="ul-surtitre">
                Ce que vous aviez signé
              </dt>
              <dd className="mt-0.5 text-[19px] font-semibold leading-none text-[var(--texte-tertiaire)] line-through">
                {avenant.commissionPct} %
              </dd>
              <dd className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                Version {avenant.version} · signée le {dateFr(avenant.signedAt)}
              </dd>
            </div>
            <div className="min-w-0 flex-1 basis-36 rounded-md border border-[var(--alerte-bordure)] bg-[var(--alerte-fond)] p-2.5">
              <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--alerte-texte)]">
                Ce qu'on vous propose
              </dt>
              <dd className="mt-0.5 text-[19px] font-semibold leading-none text-[var(--alerte-texte)]">
                {a.commissionPct} %
              </dd>
              <dd className="mt-1 text-[11px] text-[var(--texte-secondaire)]">Version {a.version} · non signée</dd>
            </div>
          </dl>

          <p className="text-[11px] leading-[1.5] text-[var(--texte-secondaire)]">
            Le taux de votre contrat signé est celui qui s'applique à vos consultations — celles déjà
            payées gardent le leur.
          </p>
        </>
      ) : (
        <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          {/*
            Le taux n'est pas écrit en dur : il vient du contrat. Et il n'y a pas de calendrier de
            versement — le retrait se demande, à tout moment (famille 1, points 1 et 2).
          */}
          Commission de {a.commissionPct} % sur les honoraires · vos gains sont retirables à tout
          moment, sans montant minimum.
        </p>
      )}

      {a.body === null ? (
        <Avis ton="erreur">
          Le texte de ce contrat n'a pas été transmis. Rechargez la page — s'il manque encore,
          prévenez l'administration ULAMU avant toute signature.
        </Avis>
      ) : aSigner ? (
        <>
          {/*
            ⚠️ **Emporter le texte AVANT de s'engager.** Le bouton d'impression n'apparaissait
            qu'une fois le contrat signé : personne ne pouvait sortir le document pour le lire au
            calme ou le montrer à un juriste. *Demander une signature sans laisser emporter le texte,
            c'est demander de signer sur place.*
          */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {boutonImprimer}
            <span className="ul-aide">
              Vous pouvez sortir ce texte avant de le signer, pour le lire au calme ou le montrer à
              un juriste.
            </span>
          </div>

          <ContratLisible corps={a.body} />

          {/*
            ⚠️ **La signature se trouve en bas du texte**, et nulle part ailleurs : c'est ce qui fait
            qu'on a dû passer devant les articles pour l'atteindre.
          */}
          <div className="flex flex-col gap-3 rounded-md border border-[var(--ap-200)] bg-[var(--ap-50)] p-4">
            <p className="ul-intitule">Signature du contrat</p>
            <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
              En signant, vous acceptez l'intégralité des articles ci-dessus. La signature est
              électronique : elle demande votre mot de passe et un code à usage unique, et elle a la
              même valeur qu'une signature manuscrite.
            </p>

            <div>
              {/*
                Le nom attendu est DANS l'intitulé, pas en note sous le champ : la cérémonie consiste
                à le recopier, autant dire lequel au moment où on le demande.
              */}
              <Label htmlFor="signature-nom" className="mb-1.5 block text-[13px]">
                Recopiez votre nom complet : <span className="font-semibold text-foreground">{nomComplet}</span>
              </Label>
              <Input id="signature-nom" autoComplete="off" value={nom} onChange={(e) => setNom(e.target.value)} />
              {nom.length > 0 && !nomCorrespond ? (
                <p className="mt-1.5 text-[11px] text-[var(--alerte-texte)]">
                  Le nom saisi ne correspond pas à celui de votre compte.
                </p>
              ) : null}
            </div>

            {/*
              La maquette s'arrête au nom saisi. Le serveur, lui, exige mot de passe ET code
              (EF-03-06), et il a raison : ce contrat engage juridiquement. Le nom reste — il ancre
              l'intention — mais il ne prouve rien à lui seul, et n'importe qui passant derrière un
              poste laissé ouvert saurait le taper.
            */}
            {envoye ? (
              <>
                {/*
                  L'adresse n'est affichée que si le serveur l'a dite — leçon du chantier 137 : le web
                  et l'API ne se déploient pas ensemble. *Un écran qui affiche « undefined » a l'air
                  cassé ; un écran qui invente une réponse est pire.*
                */}
                <Avis ton="info">
                  {envoi?.hint
                    ? `Un code de signature a été envoyé à ${envoi.hint}.`
                    : 'Un code de confirmation vient de vous être envoyé.'}
                </Avis>
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-0 flex-1 basis-44">
                    <Label htmlFor="signature-mdp" className="mb-1.5 block text-[13px]">
                      Mot de passe
                    </Label>
                    <Input
                      id="signature-mdp"
                      type="password"
                      autoComplete="current-password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                    />
                  </div>
                  <div className="min-w-0 flex-1 basis-44">
                    <Label htmlFor="signature-otp" className="mb-1.5 block text-[13px]">
                      Code reçu
                    </Label>
                    <Input
                      id="signature-otp"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Button type="button" onClick={() => signer.mutate()} disabled={signer.isPending || manque.length > 0}>
                    {signer.isPending ? 'Signature…' : avenant ? 'Re-signer et reprendre mon activité' : 'Signer le contrat'}
                  </Button>
                  {manque.length > 0 ? (
                    <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">
                      Il reste à saisir {enumerer(manque)}.
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div>
                {/*
                  « Continuer » ne prévenait de rien. Ce bouton envoie un code à usage unique : son
                  intitulé le dit, sinon le code arrive sans être attendu.
                */}
                <Button type="button" onClick={() => demarrer.mutate()} disabled={demarrer.isPending || !nomCorrespond}>
                  {demarrer.isPending ? 'Envoi du code…' : 'Recevoir mon code de signature'}
                </Button>
                {!nomCorrespond ? (
                  <p className="mt-1.5 text-[11px] text-[var(--texte-tertiaire)]">
                    Recopiez d'abord votre nom complet ci-dessus.
                  </p>
                ) : null}
              </div>
            )}
            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </div>
        </>
      ) : (
        <>
          <Avis ton="succes">Contrat signé le {dateHeureFr(a.signedAt as string)}.</Avis>

          {/*
            ⚠️ **L'empreinte, en entier.** L'écran en montrait huit caractères. Le document imprimé,
            lui, affirme qu'« une empreinte tronquée ne prouve rien » — et il a raison : c'est en
            comparant l'empreinte du papier à celle de l'écran qu'on vérifie qu'ils portent le même
            texte, et huit caractères ne permettent pas cette comparaison.
          */}
          <div className="rounded-md border border-border bg-secondary p-3">
            <p className="ul-surtitre">Empreinte du texte signé (SHA-256)</p>
            <p className="mt-1 font-mono text-[11px] leading-[1.5] break-all text-[var(--texte-secondaire)] select-all">
              {a.bodyHash}
            </p>
            <p className="ul-aide mt-1.5">
              Signé électroniquement par {nomComplet}. Cette empreinte change au moindre caractère
              modifié : elle prouve que le texte affiché est bien celui que vous avez signé.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOuvert((v) => !v)}>
              {ouvert ? 'Masquer le contrat' : 'Lire le contrat'}
            </Button>
            {boutonImprimer}
          </div>
          {ouvert ? <ContratLisible corps={a.body} /> : null}
        </>
      )}

      {imprimable && a.body ? (
        <ContratImprimable
          version={a.version}
          commissionPct={a.commissionPct}
          bodyHash={a.bodyHash}
          corps={a.body}
          signePar={nomComplet}
          signeLe={a.signedAt}
          effectifLe={a.effectiveAt}
          onFermer={() => setImprimable(false)}
        />
      ) : null}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function VerificationPage() {
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const [erreur, setErreur] = useState<string | null>(null)
  const [depot, setDepot] = useState<{ announcedDelayHours: number } | null>(null)

  const dossier = useQuery({ queryKey: ['verification'], queryFn: () => api.verificationMine() })
  const recharger = () => qc.invalidateQueries({ queryKey: ['verification'] })

  // Le message d'accusé de dépôt ne survit pas à un changement de dossier : il porterait sur un état
  // qui n'est plus le bon.
  useEffect(() => {
    if (dossier.data?.status !== 'SUBMITTED') setDepot(null)
  }, [dossier.data?.status])

  const televerser = useMutation({
    mutationFn: ({ kind, file }: { kind: DocumentKind; file: File }) =>
      new Promise<unknown>((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onerror = () => reject(new Error('Fichier illisible'))
        lecteur.onload = () => {
          const brut = String(lecteur.result)
          resolve(api.verificationUpload({ kind, fileBase64: brut.slice(brut.indexOf(',') + 1), mime: file.type }))
        }
        lecteur.readAsDataURL(file)
      }),
    onSuccess: () => {
      setErreur(null)
      recharger()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  const retirer = useMutation({
    mutationFn: (id: string) => api.verificationRemoveDocument(id),
    onSuccess: () => {
      setErreur(null)
      recharger()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  const deposer = useMutation({
    mutationFn: () => api.verificationSubmit(),
    onSuccess: (r) => {
      setDepot({ announcedDelayHours: r.announcedDelayHours })
      setErreur(null)
      recharger()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  if (dossier.isPending) {
    return (
      <SqueletteCartes nombre={3} hauteur={120} libelle="Chargement de votre dossier…" />
    )
  }

  if (dossier.isError) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={ShieldCheck} titre="Votre dossier n'a pas pu être chargé" sousTitre="Aucune pièce n'a été perdue">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos dépôts sont conservés côté serveur. Vérifiez votre connexion, puis réessayez — si le problème persiste,
            prévenez l'administration ULAMU.
          </p>
          <div>
            <Button type="button" onClick={() => dossier.refetch()}>
              Réessayer
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const d = dossier.data
  const etat = ETATS[d.status]

  /*
    ── ⚠️ « On attend » et « c'est décidé » ne sont pas le même état — chantier 127, 15/09/2026 ──

    **Mesuré en ligne sur le compte d'Armel Konaté, dossier VÉRIFIÉ.** L'écran disait, en même
    temps et sur la même hauteur d'écran :

      • « Vérifié » · « Vous pouvez exercer : votre badge est actif »
      • « Le dossier est en cours d'examen — les pièces sont figées jusqu'à la décision »
      • quatre pièces « À déposer »
      • « Ce qui se passe maintenant — Rien n'est attendu de vous », puis un délai de 3 jours

    Un soignant qui lit cela ne sait pas s'il doit déposer ses papiers. Armel, lui, EXERCE : il est
    dans l'annuaire et a reçu des consultations payées.

    > **Un écran qui ne sait pas dire où en est votre dossier est pire qu'un écran laid.**

    📌 La cause n'est pas une donnée fausse — le serveur dit vrai. C'est que l'écran ne lisait qu'un
    seul signal, `documentsEditable`, qui vaut `false` pour DEUX raisons opposées : *le dossier est
    entre les mains d'un vérificateur*, ou *la décision est déjà tombée*. **Un même symptôme pour
    deux causes contraires ne peut pas produire une phrase juste.**

    D'où ces deux mots, lus partout ci-dessous.
  */
  /** Le dossier attend une décision : quelqu'un va se prononcer, il n'y a rien à faire. */
  const enAttenteDeDecision = d.status === 'SUBMITTED' || d.status === 'IN_REVIEW'
  /** La décision est tombée — dans un sens ou dans l'autre. Plus rien n'est « en cours ». */
  const decide = d.status === 'VERIFIED' || d.status === 'REJECTED' || d.status === 'REVOKED'
  const enCours = televerser.isPending || retirer.isPending
  // Regroupé par TYPE : une pièce peut avoir plusieurs pages (recto/verso, diplôme scanné page à page).
  const parKind = new Map<DocumentKind, VerificationCase['documents']>()
  for (const doc of d.documents) parKind.set(doc.kind, [...(parKind.get(doc.kind) ?? []), doc])
  // Les types exigés, plus tout type déposé qui n'y figure pas — sinon un fichier envoyé par une
  // autre voie deviendrait invisible et impossible à retirer.
  const typesAffiches: DocumentKind[] = [
    ...d.requiredDocuments,
    ...[...parKind.keys()].filter((k) => !d.requiredDocuments.includes(k)),
  ]
  const derniereDecision = d.decisions[0]
  const nomComplet = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || (me?.username ?? '')
  const heures = d.announcedDelayHours

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <BadgeCheck size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="ul-titre-page">
            Ma vérification
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">{etat.aide}</p>
        </span>
        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Carte icone={ShieldCheck} titre="Avancement du dossier" sousTitre="Badge et contrat signé conditionnent l'exercice sur ULAMU">
            <Frise courante={etat.etape} echoue={d.status === 'REJECTED' || d.status === 'REVOKED'} />
            {d.canPractice ? (
              <Avis ton="succes">Vous pouvez exercer : votre badge est actif et votre contrat est signé.</Avis>
            ) : null}
          </Carte>

          {derniereDecision ? (
            <Carte
              icone={MessageSquareWarning}
              ton={d.status === 'VERIFIED' ? 'accent' : 'danger'}
              titre="Motif transmis par l'administration"
              sousTitre={`Décision du ${dateFr(derniereDecision.decidedAt)}`}
            >
              {/*
                La pièce VISÉE, quand la décision en désigne une (24/08/2026). Avant, le motif était
                un texte libre attaché au dossier : « copie non certifiée conforme » laissait deviner
                laquelle des quatre pièces reprendre. La nommer transforme un refus en consigne.
              */}
              {derniereDecision.documentKind ? (
                <p className="flex flex-wrap items-center gap-2">
                  <span className="ul-surtitre">
                    Pièce concernée
                  </span>
                  <Pilule ton="alerte">{PIECES[derniereDecision.documentKind].titre}</Pilule>
                </p>
              ) : null}
              <p className="text-[13px] leading-[1.6] whitespace-pre-wrap text-foreground">{derniereDecision.reasons}</p>
              {/*
                ⚠️ **Cet identifiant était affiché sans rien dire** (« dossier 3F8A2C10 », en
                sous-titre). Un numéro technique montré à quelqu'un qui n'a personne à qui le donner
                n'est pas une information, c'est un reste de machine. À quoi il sert est maintenant
                écrit à côté, et un clic le sélectionne en entier.
              */}
              <p className="ul-aide">
                Référence à rappeler si vous écrivez à l'administration :{' '}
                <span className="font-mono text-[var(--texte-secondaire)] select-all">
                  {d.caseId.slice(0, 8).toUpperCase()}
                </span>
              </p>
            </Carte>
          ) : null}

          <Carte
            icone={FileText}
            titre="Pièces justificatives"
            sousTitre={
              d.documentsEditable
                ? `PDF ou image · ${formatTaille(TAILLE_MAX_OCTETS)} maximum`
                : decide
                  ? 'La décision est prise — les pièces restent au dossier et ne se modifient plus'
                  : 'Le dossier est en cours d’examen — les pièces sont figées jusqu’à la décision'
            }
          >
            <ul className="flex flex-col gap-2">
              {typesAffiches.map((kind) => (
                <BlocPiece
                  key={kind}
                  kind={kind}
                  documents={parKind.get(kind) ?? []}
                  modifiable={d.documentsEditable}
                  enCours={enCours}
                  onDeposer={(file) => televerser.mutate({ kind, file })}
                  onRetirer={(id) => retirer.mutate(id)}
                />
              ))}
            </ul>

            {d.missingDocuments.length > 0 && d.documentsEditable ? (
              <Avis ton="info">
                Il manque {d.missingDocuments.length} pièce{d.missingDocuments.length > 1 ? 's' : ''} obligatoire
                {d.missingDocuments.length > 1 ? 's' : ''} : {d.missingDocuments.map((k) => PIECES[k].titre).join(', ')}.
              </Avis>
            ) : null}

            {d.documentsEditable ? (
              <div>
                <Button type="button" onClick={() => deposer.mutate()} disabled={!d.canSubmit || deposer.isPending}>
                  {deposer.isPending ? 'Envoi…' : 'Déposer mon dossier'}
                </Button>
              </div>
            ) : null}

            {depot ? (
              <Avis ton="succes">
                Dossier déposé. L'administration répond sous {depot.announcedDelayHours} heures.
              </Avis>
            ) : null}
            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </Carte>

          <BlocContrat dossier={d} nomComplet={nomComplet} recharger={recharger} />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
          {/*
            ⚠️ **Un délai d'attente n'a de sens que si l'on attend** (chantier 127). Cette carte
            annonçait « 3 jours » et « vous êtes prévenu dès qu'une décision est prise » à quelqu'un
            dont la décision était **déjà prise** — vu en ligne sur un dossier VÉRIFIÉ.

            Elle garde son historique (décisions et dépôts), qui reste vrai dans tous les cas : le
            compte à rebours seul disparaît. *Ce qui s'est passé reste ; ce qui va se passer, non.*
          */}
          <Carte
            icone={Clock}
            titre={decide ? 'Historique du dossier' : 'Délai de traitement'}
            sousTitre={decide ? 'Ce qui a été fait, et quand' : 'Délai annoncé par la plateforme'}
          >
            {decide ? null : (
            <p className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none tracking-[-0.02em] text-foreground">
                {heures < 48 ? heures : Math.round(heures / 24)}
              </span>
              <span className="text-[12px] text-[var(--texte-tertiaire)]">{heures < 48 ? 'heures' : 'jours'}</span>
            </p>
            )}
            {decide ? null : (
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Compté à partir du dépôt. Vous êtes prévenu par notification dès qu'une décision est prise.
            </p>
            )}
            {d.decisions.length > 0 || d.documents.length > 0 ? (
              <>
                <span aria-hidden="true" className="h-px bg-border" />
                <ol className="flex flex-col gap-2">
                  {d.decisions.slice(0, 3).map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--ap-400)]" />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-foreground">{libelleDecision(x.decision)}</span>
                        <span className="block font-mono text-[10px] text-[var(--texte-tertiaire)]">{dateFr(x.decidedAt)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </Carte>

          <Carte icone={BadgeCheck} titre="Ce que la vérification autorise" sousTitre="Une fois le badge actif">
            <ul className="flex flex-col gap-2 text-[12px] leading-[1.45] text-[var(--texte-secondaire)]">
              {[
                'Apparaître dans l’annuaire vu par les patients',
                'Recevoir des demandes de consultation',
                'Signer des comptes-rendus et des ordonnances',
                'Percevoir et retirer vos honoraires',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <BadgeCheck size={13} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--succes-texte)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Carte>

          {/*
            La maquette promet « une réponse sous 24 heures ouvrées, du lundi au vendredi ».

            Trois choses fausses en une phrase. Aucune messagerie support n'existe — ni module, ni
            route, ni écran : elle annonçait un délai de réponse sans qu'aucun bouton ne permette de
            poser la question. « Ouvrées » n'existe pas non plus : le serveur compte des heures
            pleines, un dossier déposé vendredi soir est en retard le lundi, pas le mercredi. Et le
            délai lui-même n'est pas 24 h, c'est PM-11 — affiché juste au-dessus, lu du serveur.

            Reste ce qui est vrai, et qui répond à la vraie inquiétude : rien n'est attendu de vous.
          */}
          {/*
            ⚠️ **La file d'attente ne concerne que ceux qui y sont** (chantier 127). Cette carte
            décrivait « les dossiers examinés du plus ancien au plus récent » et promettait une
            notification à venir — sur un dossier déjà VÉRIFIÉ.

            *Une explication juste, donnée à quelqu'un qu'elle ne concerne pas, devient une fausse
            nouvelle.*

            ⚠️ **Mais la carte ne DISPARAÎT pas** : elle porte « Écrire à l'administration », seul
            chemin vers le support depuis cet écran — et le plus utile justement quand un dossier
            vient d'être refusé. *Masquer une explication périmée ne doit pas emporter le bouton qui
            l'accompagnait* : c'est la faute que ce projet a déjà payée en retirant des chemins avec
            leur habillage. Seule la phrase d'attente s'en va.
          */}
          <Carte
            icone={Clock}
            titre={enAttenteDeDecision ? 'Ce qui se passe maintenant' : 'Une question sur votre dossier ?'}
            sousTitre={enAttenteDeDecision ? "Rien n'est attendu de vous" : "L'administration vous répond ici"}
          >
            {enAttenteDeDecision ? (
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                Les dossiers sont examinés du plus ancien au plus récent : le vôtre avance à chaque
                dossier traité. Vous serez prévenu par notification dès qu'une décision est prise — il
                n'y a rien à relancer.
              </p>
            ) : null}
            {/*
              Le bouton ouvrait un `mailto:` vers `support@ulamu.cg` — un domaine qui n'appartient
              pas au projet, donc une adresse que personne ne relevait. Il mène désormais au
              formulaire de B3, où la RÉPONSE s'affiche aussi. Corrigé le 01/09/2026 (dette 8quater).
            */}
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              ULAMU n'a pas de messagerie interne : les échanges n'existent que pendant une
              consultation. Pour joindre l'administration, écrivez-lui depuis vos paramètres — la
              réponse s'affichera au même endroit.
            </p>
            <div>
              <Button asChild size="sm" variant="outline">
                <Link to={routeAide('OTHER')}>Écrire à l'administration</Link>
              </Button>
            </div>
          </Carte>
        </aside>
      </div>
    </div>
  )
}
