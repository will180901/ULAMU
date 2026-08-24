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
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  Building2,
  Clock,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
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
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { api, ApiError, lirePieceJustificative, type DocumentKind, type VerificationCase, type VerificationStatus } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

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

const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const TAILLE_MAX = 5 * 1024 * 1024

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
    // c'est plusieurs minutes perdues sur une connexion mobile.
    if (f.size > TAILLE_MAX) {
      setErreur('Fichier trop lourd : 5 Mo maximum.')
      return
    }
    if (!MIMES.includes(f.type)) {
      setErreur('Format accepté : PDF, JPEG, PNG ou WebP.')
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
      setErreur(messageDe(e))
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
            <Pilule ton={depose ? 'succes' : 'neutre'}>
              {depose ? (documents.length > 1 ? `${documents.length} pages` : 'Déposée') : 'À déposer'}
            </Pilule>
          </span>
          <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{info.aide}</span>
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
        L'aperçu reste DANS la page. Ouvrir un onglet pour chaque pièce oblige à faire l'aller-retour
        à chaque fois, et sur un poste partagé cet onglet reste ouvert derrière soi avec une pièce
        d'identité dedans.

        Le PDF est affiché dans un cadre CLOISONNÉ (`sandbox` sans `allow-scripts`) : un PDF peut
        embarquer du script, et il n'a rien à exécuter dans le contexte de l'application. Le bouton
        « Ouvrir dans un onglet » reste là pour les navigateurs dont le lecteur PDF refuse le
        cloisonnement.
      */}
      <Dialog open={apercu !== null} onOpenChange={(v) => (v ? undefined : fermerApercu())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{apercu?.titre}</DialogTitle>
          </DialogHeader>
          {apercu ? (
            apercu.type.startsWith('image/') ? (
              <img src={apercu.url} alt={apercu.titre} className="max-h-[70vh] w-full rounded-md object-contain" />
            ) : (
              <iframe src={apercu.url} sandbox="" title={apercu.titre} className="h-[70vh] w-full rounded-md border border-border bg-card" />
            )
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => apercu && window.open(apercu.url, '_blank', 'noopener')}>
              Ouvrir dans un onglet
            </Button>
            <DialogClose asChild>
              <Button type="button" size="sm">
                Fermer
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}

// ── Contrat de partenariat ─────────────────────────────────────────────────

function BlocContrat({ dossier, nomComplet, recharger }: { dossier: VerificationCase; nomComplet: string; recharger: () => void }) {
  const [ouvert, setOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [otp, setOtp] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const a = dossier.agreement

  const demarrer = useMutation({
    mutationFn: () => api.verificationSignStart(),
    onSuccess: () => {
      setEnvoye(true)
      setErreur(null)
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const signer = useMutation({
    mutationFn: () => api.verificationSign({ password: motDePasse, otpCode: otp.trim() }),
    onSuccess: () => {
      setMotDePasse('')
      setOtp('')
      recharger()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const telecharger = () => {
    if (!a?.body) return
    const url = URL.createObjectURL(new Blob([a.body], { type: 'text/plain;charset=utf-8' }))
    const lien = window.document.createElement('a')
    lien.href = url
    lien.download = `contrat-ulamu-v${a.version}.txt`
    lien.click()
    URL.revokeObjectURL(url)
  }

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

  return (
    <Carte icone={ScrollText} titre="Contrat de partenariat" sousTitre={`Contrat soignant ULAMU · version ${a.version}`}>
      <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
        Commission de {a.commissionPct} % sur les honoraires · versement selon le calendrier de la plateforme.
      </p>

      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOuvert((v) => !v)}>
          {ouvert ? 'Masquer le contrat' : 'Lire le contrat'}
        </Button>
      </div>
      {ouvert ? (
        <pre className="max-h-72 overflow-auto rounded-md border border-border bg-secondary p-3 text-[11px] leading-[1.6] whitespace-pre-wrap text-[var(--texte-secondaire)]">
          {a.body}
        </pre>
      ) : null}

      {a.signedAt ? (
        <>
          <Avis ton="succes">Contrat signé le {dateHeureFr(a.signedAt)}.</Avis>
          <p className="font-mono text-[11px] break-all text-[var(--texte-tertiaire)]">
            Signé électroniquement par {nomComplet} · empreinte {a.bodyHash.slice(0, 4)}…{a.bodyHash.slice(-4)}
          </p>
          <div>
            <Button type="button" size="sm" variant="outline" onClick={telecharger}>
              Télécharger
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary p-3">
          <div>
            <Label htmlFor="signature-nom" className="mb-1.5 block text-[13px]">
              Signature — saisissez votre nom complet
            </Label>
            <Input id="signature-nom" autoComplete="off" value={nom} onChange={(e) => setNom(e.target.value)} />
            <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
              Doit correspondre au nom de votre pièce d'identité : {nomComplet}.
            </p>
          </div>

          {/*
            La maquette s'arrête au nom saisi. Le serveur, lui, exige mot de passe ET code (EF-03-06),
            et il a raison : ce contrat engage juridiquement. Le nom reste — il ancre l'intention —
            mais il ne prouve rien à lui seul, et n'importe qui passant derrière un poste laissé
            ouvert saurait le taper.
          */}
          {envoye ? (
            <>
              <Avis ton="info">Un code de confirmation vient de vous être envoyé.</Avis>
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
                <Button
                  type="button"
                  onClick={() => signer.mutate()}
                  disabled={signer.isPending || !nomCorrespond || motDePasse.length === 0 || otp.trim().length !== 6}
                >
                  {signer.isPending ? 'Signature…' : 'Signer le contrat'}
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button type="button" onClick={() => demarrer.mutate()} disabled={demarrer.isPending || !nomCorrespond}>
                {demarrer.isPending ? 'Envoi du code…' : 'Continuer'}
              </Button>
              {nom.length > 0 && !nomCorrespond ? (
                <p className="mt-1.5 text-[11px] text-[var(--alerte-texte)]">
                  Le nom saisi ne correspond pas à celui de votre compte.
                </p>
              ) : null}
            </div>
          )}
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
        </div>
      )}
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
    onError: (e) => setErreur(messageDe(e)),
  })

  const retirer = useMutation({
    mutationFn: (id: string) => api.verificationRemoveDocument(id),
    onSuccess: () => {
      setErreur(null)
      recharger()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const deposer = useMutation({
    mutationFn: () => api.verificationSubmit(),
    onSuccess: (r) => {
      setDepot({ announcedDelayHours: r.announcedDelayHours })
      setErreur(null)
      recharger()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  if (dossier.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Chargement de votre dossier…
      </p>
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
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">
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
              sousTitre={`Décision du ${dateFr(derniereDecision.decidedAt)} · dossier ${d.caseId.slice(0, 8).toUpperCase()}`}
            >
              <p className="text-[13px] leading-[1.6] whitespace-pre-wrap text-foreground">{derniereDecision.reasons}</p>
            </Carte>
          ) : null}

          <Carte
            icone={FileText}
            titre="Pièces justificatives"
            sousTitre={
              d.documentsEditable
                ? 'PDF ou image · 5 Mo maximum'
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
          <Carte icone={Clock} titre="Délai de traitement" sousTitre="Délai annoncé par la plateforme">
            <p className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-[26px] font-bold leading-none tracking-[-0.02em] text-foreground">
                {heures < 48 ? heures : Math.round(heures / 24)}
              </span>
              <span className="text-[12px] text-[var(--texte-tertiaire)]">{heures < 48 ? 'heures' : 'jours'}</span>
            </p>
            <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Compté à partir du dépôt. Vous êtes prévenu par notification dès qu'une décision est prise.
            </p>
            {d.decisions.length > 0 || d.documents.length > 0 ? (
              <>
                <span aria-hidden="true" className="h-px bg-border" />
                <ol className="flex flex-col gap-2">
                  {d.decisions.slice(0, 3).map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--ap-400)]" />
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-foreground">Décision : {x.decision}</span>
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

          <Carte icone={Mail} titre="Une question sur votre dossier ?" sousTitre="Réponse sous 24 heures ouvrées, du lundi au vendredi">
            {/*
              La maquette montre un bouton « Écrire à l'administration ». Aucun module de messagerie
              support n'existe côté serveur — un bouton qui n'envoie rien serait pire que pas de
              bouton. On ouvre donc le client mail du poste, avec la référence du dossier déjà
              remplie pour que l'administration sache de quoi on parle.
            */}
            <div>
              <Button asChild size="sm" variant="outline">
                <a
                  href={`mailto:support@ulamu.cg?subject=${encodeURIComponent(
                    `Dossier de vérification ${d.caseId.slice(0, 8).toUpperCase()}`,
                  )}`}
                >
                  Écrire à l'administration
                </a>
              </Button>
            </div>
          </Carte>
        </aside>
      </div>
    </div>
  )
}
