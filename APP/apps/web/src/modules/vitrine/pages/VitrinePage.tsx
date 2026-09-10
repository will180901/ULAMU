/**
 * C2 — Ma vitrine. D'après `docs/maquettes/C2 - Ma vitrine.dc.html`, **affichée** le 27/08/2026.
 *
 * ── Pourquoi ce fichier a été réécrit ──────────────────────────────────────────────────────────
 *
 * La version précédente avait raison sur les FAITS — elle avait retiré les langues, les lieux et les
 * « vues de fiche » inventées, et pour les bonnes raisons. Mais elle disait aussi d'elle-même :
 * « largement repensé… ce n'est pas un formulaire, c'est un miroir de concurrence… aucun bouton
 * Publier… l'aperçu montre la LISTE, pas une fiche isolée ».
 *
 * C'est précisément ce que le porteur a refusé le 25/08. **La maquette décide de la FORME**, le
 * cahier décide des faits. On restaure donc la forme mesurée sur la maquette — deux colonnes,
 * 968 px d'édition et un rail d'aperçu de 320 px — et on garde les faits corrigés.
 *
 * Sont donc partis avec la refonte : la liste de confrères en guise d'aperçu, le repère de marché
 * (aucun équivalent dans la maquette), et le réglage de présence — qui vit désormais dans la barre
 * du haut, où l'alignement l'a placé (famille 4, point 5).
 *
 * ── Les blocs, et leur sort ────────────────────────────────────────────────────────────────────
 *
 * • **Identité professionnelle** — gardée. Nom et spécialité en lecture seule (arbitrage porteur du
 *   27/08 : le Badge Vérifié atteste d'une qualification contrôlée par pièces ; la laisser modifier
 *   librement ferait mentir le badge). La route serveur reste ouverte — dette signalée au plan.
 * • **Langues de consultation** — retirée. D-005 / PM-15 : français uniquement.
 * • **Lieux de consultation** (cabinets, adresses, horaires) — retirée. La fiche d'un professionnel
 *   ne porte qu'un seul champ géographique, `district`, et EF-05-01 n'en connaît pas d'autre.
 * • **Tarifs affichés** — refondue en « Mes offres ». La maquette propose trois MODES fixes
 *   (téléconsultation / cabinet / créneau prioritaire) ; le modèle serveur n'a pas de modes, mais
 *   des offres libres : libellé, durée, prix, type standard ou suivi. Le « créneau prioritaire »
 *   promettait en plus une « réponse garantie sous 2 heures » qui n'engage personne.
 * • **Aperçu patient** — gardé, en rail de 320 px comme mesuré.
 * • **« Prêt à publier »** (4 contrôles inventés) — remplacée par la vraie règle : RM-05-01, vérifié
 *   ET sous contrat signé. On peut soigner chaque mot et n'apparaître nulle part.
 * • **« Visibilité »** — les 318 vues de fiche ne sont comptées NULLE PART. Les deux autres chiffres
 *   existent : « demandes reçues » et le taux de confirmation. Le bloc devient « Ce que les patients
 *   voient » (famille 4, point 7), alimenté par la VRAIE route publique — **et il reste dans le rail
 *   de droite**, là où la maquette le pose. Il avait d'abord été déplacé à gauche par confort de
 *   lecture ; c'était une raison, pas un fait, et la règle ne l'autorisait pas. Remis le 27/08.
 *
 * ── Deux principes tenus ───────────────────────────────────────────────────────────────────────
 *
 * **Aucun chiffre métier n'est écrit ici.** Le taux de commission vient du contrat signé
 * (`agreement.commissionPct`) — deux médecins peuvent avoir deux taux. Les bornes d'une offre
 * viennent de `GET /v1/offers/limits` (PM-09 / PM-06 / PM-25), ajouté le 27/08 pour cette raison.
 *
 * **Aucun bouton « Publier ».** `PATCH /v1/me/professional-profile` publie immédiatement : il n'y a
 * pas d'état de brouillon à représenter. En inventer un ajouterait la seule question qu'on veut
 * éviter — « ai-je publié ? ». L'enregistrement se fait après la frappe et l'écran dit où il en est.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Camera, Check, Eye, Loader2, Pencil, Plus, ShieldCheck, Star, Store, Tag, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accord } from '@/lib/accord'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Critere, Pilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import {
  api,
  urlAvatar,
  type MeResponse,
  type Offer,
  type OfferKind,
  type OfferLimits,
} from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { messageErreur } from '@/lib/message-erreur'

const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

/**
 * La présentation est bornée à 400 caractères — la contrainte de la MAQUETTE, plus stricte que les
 * 2000 du serveur. Étant plus stricte, elle ne provoque jamais de refus : c'est un choix de forme,
 * et sur la forme la maquette décide. Une bio courte se lit.
 */
const BIO_MAX = 400

/** Traduit un délai de confirmation en langage humain — « 4 min » dit plus que « 240 s ». */
function delaiHumain(secondes: number | null): string | null {
  if (secondes === null) return null
  if (secondes < 60) return `${Math.round(secondes)} ${accord(Math.round(secondes), 'seconde')}`
  const min = Math.round(secondes / 60)
  if (min < 60) return `${min} minute${min > 1 ? 's' : ''}`
  const h = Math.round(min / 60)
  return `${h} heure${h > 1 ? 's' : ''}`
}

// ── Enregistrement automatique ──────────────────────────────────────────────

type EtatEnregistrement = 'repos' | 'en-cours' | 'enregistre' | 'echec'

/**
 * Enregistre après la frappe, sans bouton — voir l'en-tête du fichier.
 * Le délai laisse le temps de finir sa pensée sans envoyer une requête par touche.
 */
function useEnregistrementAuto<T>(valeur: T, enregistrer: (v: T) => Promise<unknown>, actif: boolean) {
  const [etat, setEtat] = useState<EtatEnregistrement>('repos')
  const derniere = useRef<T>(valeur)
  const premiereFois = useRef(true)

  useEffect(() => {
    if (!actif) return
    // Le montage ne déclenche rien : on n'enregistre pas ce qu'on vient de lire.
    if (premiereFois.current) {
      premiereFois.current = false
      derniere.current = valeur
      return
    }
    if (JSON.stringify(valeur) === JSON.stringify(derniere.current)) return

    const minuteur = setTimeout(() => {
      derniere.current = valeur
      setEtat('en-cours')
      enregistrer(valeur)
        .then(() => setEtat('enregistre'))
        .catch(() => setEtat('echec'))
    }, 800)
    return () => clearTimeout(minuteur)
  }, [valeur, actif, enregistrer])

  return etat
}

function Enregistrement({ etat }: { etat: EtatEnregistrement }) {
  if (etat === 'repos') return null
  const contenu = {
    'en-cours': (
      <>
        <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Enregistrement…
      </>
    ),
    enregistre: (
      <>
        <Check size={11} strokeWidth={2.5} aria-hidden="true" /> Enregistré
      </>
    ),
    echec: <>Non enregistré — vérifiez votre connexion</>,
  }[etat]
  return (
    <span
      role="status"
      className={
        'flex items-center gap-1 text-[11px] ' +
        (etat === 'echec' ? 'text-[var(--erreur-texte)]' : 'text-[var(--texte-tertiaire)]')
      }
    >
      {contenu}
    </span>
  )
}

// ── Les offres ──────────────────────────────────────────────────────────────

/**
 * Une offre, et les trois gestes qu'on peut faire dessus — chantier 66, 07/09/2026.
 *
 * ── Ce qui manquait, et ce que ça coûtait ─────────────────────────────────────────────────────
 *
 * Cette ligne n'offrait qu'UN geste, et seulement sur une offre active : la désactiver. Une fois
 * éteinte, l'offre devenait un objet mort — **impossible de la rallumer, impossible de corriger un
 * prix, une durée ou un libellé.**
 *
 * ⚠️ Le serveur, lui, sait tout faire depuis toujours : `PATCH /v1/offers/:id` modifie ET réactive,
 * avec les mêmes garde-fous qu'une création (droit d'exercer, plafond PM-25). Le client web déclare
 * même `api.updateOffer` — **et aucun écran ne l'appelait.**
 *
 * Conséquence mesurée en production le 07/09 : le seul soignant de la plateforme avait ses deux
 * offres désactivées et **aucun moyen de les réactiver**. Sa fiche était visible et il était
 * injoignable, sans recours autre que créer une offre de plus — jusqu'au plafond.
 *
 * *Une capacité sans chemin pour l'atteindre n'a pas été livrée. C'est la sixième fois de la
 * semaine que ce motif apparaît.*
 *
 * ── Pourquoi la modification se fait ICI, en ligne, et non dans une boîte ─────────────────────
 *
 * Le prix est la décision économique de l'écran, et il se lit « brut − commission = net ». Ouvrir
 * une boîte de dialogue arracherait ce calcul du contexte au moment précis où on le change. On
 * édite donc à sa place, et le net se recalcule sous les doigts.
 */
function LigneOffre({
  offre,
  commissionPct,
  bornes,
  onDesactiver,
  onModifier,
  onReactiver,
  enCours,
}: {
  offre: Offer
  commissionPct: number
  /** Bornes du serveur — la ligne les annonce au lieu de laisser découvrir un refus. */
  bornes: OfferLimits | null
  onDesactiver: () => void
  onModifier: (dto: { label: string; durationMin: number; priceXaf: number }) => void
  onReactiver: () => void
  enCours: boolean
}) {
  const [edition, setEdition] = useState(false)
  const [label, setLabel] = useState(offre.label)
  const [duree, setDuree] = useState(String(offre.durationMin))
  const [prix, setPrix] = useState(String(offre.priceXaf))

  const prixAffiche = edition ? Number(prix) || 0 : offre.priceXaf
  const commission = Math.round((prixAffiche * commissionPct) / 100)
  const net = prixAffiche - commission

  const plancher = bornes?.priceFloorXaf ?? 0
  const valide = label.trim().length > 0 && Number(duree) > 0 && Number(prix) >= plancher

  /*
    Repartir en arrière remet les valeurs du serveur. Sans cela, rouvrir l'édition après une
    annulation montrerait le brouillon abandonné comme s'il avait été enregistré.
  */
  const annuler = () => {
    setLabel(offre.label)
    setDuree(String(offre.durationMin))
    setPrix(String(offre.priceXaf))
    setEdition(false)
  }

  return (
    /*
      ⚠️ Une offre éteinte doit se VOIR — chantier 71.

      Le mot « désactivée » vivait au milieu de « 30 min · consultation · désactivée », en 11 px
      gris. Or c'est la CAUSE de tout le reste de l'écran : c'est parce qu'une offre est éteinte
      qu'aucun patient ne peut solliciter, et que le bandeau d'état s'allume en haut. La cause était
      écrite plus discrètement que sa conséquence.

      Le trait discontinu plutôt qu'un fond ou une opacité : un fond réintroduirait le piège du
      chantier 70 (l'encre tertiaire tombe à 4,30:1 sur `--fond-surface-2` en clair), et baisser
      l'opacité ferait passer TOUTE la ligne sous le seuil — y compris le montant. Une bordure ne
      touche à aucun contraste de texte.
    */
    <li
      className={
        'flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 ' +
        (offre.active ? 'border-border' : 'border-dashed border-[var(--bordure-normale)]')
      }
    >
      {edition ? (
        <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <span className="grid gap-1">
            <Label htmlFor={`edit-label-${offre.id}`} className="text-[11px]">
              Libellé
            </Label>
            <Input id={`edit-label-${offre.id}`} value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
          </span>
          <span className="grid gap-1">
            <Label htmlFor={`edit-duree-${offre.id}`} className="text-[11px]">
              Durée
            </Label>
            <Input
              id={`edit-duree-${offre.id}`}
              type="number"
              inputMode="numeric"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
              min={bornes?.durationMinMinutes}
              max={bornes?.durationMaxMinutes}
              className="w-24"
            />
          </span>
          <span className="grid gap-1">
            <Label htmlFor={`edit-prix-${offre.id}`} className="text-[11px]">
              Prix patient
            </Label>
            <Input
              id={`edit-prix-${offre.id}`}
              type="number"
              inputMode="numeric"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              min={plancher}
              step={100}
              className="w-32"
            />
          </span>
        </div>
      ) : (
        <span className="min-w-0 flex-1 basis-44">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{offre.label}</span>
            {/*
              L'état devient une pastille — le composant qui sert déjà partout ailleurs à dire un
              statut. Jamais la couleur seule (CG-11) : c'est le mot « Désactivée » qui porte
              l'information, la teinte ne fait que la répéter. Rien n'est affiché pour une offre
              active : une pastille « Active » sur chaque ligne redeviendrait du bruit, et c'est
              l'exception qu'on doit repérer.
            */}
            {offre.active ? null : <Pilule ton="neutre">Désactivée</Pilule>}
          </span>
          <span className="mt-0.5 block ul-aide">
            {offre.durationMin} min · {offre.kind === 'FOLLOW_UP' ? 'suivi' : 'consultation'}
          </span>
        </span>
      )}

      {/*
        Brut → commission → net, sur une seule ligne. La maquette posait un champ et une mention de
        commission ailleurs, laissant le médecin faire le calcul. Or c'est LA décision économique de
        l'écran : il doit voir ce qu'il touche sans sortir une calculatrice. En édition, le net suit
        la saisie — c'est le moment où il compte le plus.
      */}
      {/*
        ⚠️ Les trois nombres n'ont PAS le même poids — corrigé au chantier 71.

        Ils s'écrivaient 11 px, 11 px et 16 px, avec « net pour vous » à **9 px**. Or les deux
        premiers EXPLIQUENT et le troisième DÉCIDE : c'est la seule ligne de cet écran qui a une
        conséquence sur un compte en banque, et c'est le soignant qui la fixe. Le calcul restait
        juste, mais l'œil ne trouvait pas où il aboutissait.

        Le brut et la commission gardent donc l'encre discrète du palier de code ; le net prend la
        voix de chiffre, et son libellé le surtitre — 11 px au lieu de 9, une taille qui existe.
      */}
      <span className="flex shrink-0 items-center gap-2 t-code-sm text-[var(--texte-tertiaire)]">
        <span>{xaf(prixAffiche)}</span>
        <span aria-hidden="true">−</span>
        <span>{xaf(commission)}</span>
        <span aria-hidden="true">=</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block ul-chiffre-ligne">{xaf(net)}</span>
        <span className="mt-1 block ul-surtitre">net pour vous</span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        {edition ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={!valide || enCours}
              onClick={() => {
                onModifier({ label: label.trim(), durationMin: Number(duree), priceXaf: Number(prix) })
                setEdition(false)
              }}
            >
              Enregistrer
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={annuler} disabled={enCours}>
              Annuler
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEdition(true)}
              disabled={enCours}
              aria-label={`Modifier ${offre.label}`}
            >
              <Pencil size={14} strokeWidth={1.6} aria-hidden="true" />
            </Button>
            {offre.active ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDesactiver}
                disabled={enCours}
                aria-label={`Désactiver ${offre.label}`}
              >
                <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
              </Button>
            ) : (
              /*
                Le geste qui manquait complètement. Le serveur applique à la réactivation les mêmes
                garde-fous qu'à une création — droit d'exercer, plafond d'offres actives — et refuse
                avec son motif, que l'écran affiche tel quel.
              */
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onReactiver}
                disabled={enCours}
                aria-label={`Réactiver ${offre.label}`}
              >
                Réactiver
              </Button>
            )}
          </>
        )}
      </span>
    </li>
  )
}

/**
 * Formulaire d'ajout — les bornes sont ANNONCÉES, jamais découvertes par un refus.
 *
 * Elles viennent de `GET /v1/offers/limits` : la page n'écrit ni « 10 à 60 minutes », ni
 * « 500 XAF », ni « 5 offres ». Si le super-admin les change dans E3, cet écran suit.
 */
function AjoutOffre({
  bornes,
  commissionPct,
  onAjouter,
  enCours,
}: {
  bornes: OfferLimits
  commissionPct: number
  onAjouter: (dto: { label: string; durationMin: number; priceXaf: number; kind: OfferKind }) => void
  enCours: boolean
}) {
  const [label, setLabel] = useState('')
  const [duree, setDuree] = useState(String(bornes.durationMinMinutes))
  const [prix, setPrix] = useState(String(bornes.priceFloorXaf))
  const [kind, setKind] = useState<OfferKind>('STANDARD')

  const prixNum = Number(prix) || 0
  const net = prixNum - Math.round((prixNum * commissionPct) / 100)
  const complet = label.trim().length > 0 && Number(duree) > 0 && prixNum >= bornes.priceFloorXaf
  const plein = bornes.activeOffers >= bornes.maxActiveOffers

  if (plein) {
    return (
      <Avis ton="alerte">
        Vous avez {bornes.activeOffers} offres actives, soit le maximum. Désactivez-en une avant d’en publier
        une autre.
      </Avis>
    )
  }

  return (
    <form
      className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-[1fr_auto_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!complet) return
        onAjouter({ label: label.trim(), durationMin: Number(duree), priceXaf: prixNum, kind })
        setLabel('')
      }}
    >
      <span className="grid gap-1">
        <Label htmlFor="offre-label" className="text-[11px]">
          Libellé
        </Label>
        <Input
          id="offre-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Consultation de cardiologie"
          maxLength={120}
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-duree" className="text-[11px]">
          Durée
        </Label>
        <Input
          id="offre-duree"
          type="number"
          inputMode="numeric"
          value={duree}
          onChange={(e) => setDuree(e.target.value)}
          min={bornes.durationMinMinutes}
          max={bornes.durationMaxMinutes}
          className="w-24"
          aria-describedby="offre-bornes"
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-prix" className="text-[11px]">
          Prix patient
        </Label>
        <Input
          id="offre-prix"
          type="number"
          inputMode="numeric"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          min={bornes.priceFloorXaf}
          step={100}
          className="w-32"
          aria-describedby="offre-bornes"
        />
      </span>

      <span className="grid gap-1">
        <Label htmlFor="offre-type" className="text-[11px]">
          Type
        </Label>
        <Liste
          id="offre-type"
          valeur={kind}
          onChange={setKind}
          options={[
            { cle: 'STANDARD' as OfferKind, label: 'Consultation' },
            { cle: 'FOLLOW_UP' as OfferKind, label: 'Suivi', aide: 'Déclenche la proposition automatique après un compte-rendu' },
          ]}
        />
      </span>

      <p id="offre-bornes" className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)] sm:col-span-4">
        Durée entre <strong className="text-foreground">{bornes.durationMinMinutes}</strong> et{' '}
        <strong className="text-foreground">{bornes.durationMaxMinutes}</strong> minutes · prix minimum{' '}
        <strong className="text-foreground">{xaf(bornes.priceFloorXaf)} XAF</strong>, commission comprise ·{' '}
        <strong className="text-foreground">
          {bornes.activeOffers} sur {bornes.maxActiveOffers}
        </strong>{' '}
        offres actives.
        {prixNum >= bornes.priceFloorXaf ? (
          <>
            {' '}
            À ce prix, vous percevez <strong className="text-foreground">{xaf(net)} XAF</strong> par consultation.
          </>
        ) : null}
      </p>

      <span className="sm:col-span-4">
        <Button type="submit" size="sm" disabled={!complet || enCours}>
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
          Ajouter cette offre
        </Button>
      </span>
    </form>
  )
}

// ── Écran ───────────────────────────────────────────────────────────────────

/**
 * Le bandeau d'état — chantier 71.
 *
 * ── Ce qu'il corrige ──────────────────────────────────────────────────────────────────────────
 *
 * L'état de la vitrine était dit **trois fois**, et jamais fort : dans le sous-titre de la page
 * (13 px), dans la carte « Êtes-vous visible ? » du rail de droite, et sous les offres
 * (« 0 sur 5 offres actives »). Trois endroits pour un seul fait — et le fait le plus important
 * de l'écran, celui qui décide si le soignant existe commercialement ou non.
 *
 * *Un fait répété trois fois en petit se lit moins bien qu'énoncé une fois clairement.*
 *
 * ── Trois états, pas deux ─────────────────────────────────────────────────────────────────────
 *
 * La distinction héritée du 01/09 est conservée telle quelle : **« pas visible » est une
 * AFFIRMATION**, elle ne peut se dire que si le serveur a répondu. Quand la lecture échoue, on dit
 * qu'on ne sait pas — une panne réseau ne doit pas annoncer à un médecin en règle qu'il est
 * invisible des patients.
 *
 * ── Ce qu'il n'est pas ────────────────────────────────────────────────────────────────────────
 *
 * Ce n'est pas une alerte de plus : la carte « Êtes-vous visible ? » garde ses trois critères, qui
 * disent le DÉTAIL. Le bandeau dit la conséquence et le geste ; la carte dit lequel des trois
 * verrous est fermé. Le doublon supprimé est l'alerte qui répétait la conséquence dans la carte.
 */
function BandeauEtat({
  lectureFaite,
  peutExercer,
  offresActives,
}: {
  lectureFaite: boolean
  peutExercer: boolean
  offresActives: number
}) {
  // Tout va bien : pas de bandeau. Un bandeau permanent redevient un décor, et la seule chose
  // qu'on remarquerait alors, c'est son absence.
  if (lectureFaite && peutExercer && offresActives > 0) return null

  const inconnu = !lectureFaite
  const titre = inconnu
    ? 'Visibilité inconnue tant que votre dossier n’a pas pu être lu'
    : !peutExercer
      ? 'Votre fiche n’est pas encore visible des patients'
      : 'Aucun patient ne peut vous solliciter'

  return (
    <section
      // `status` et non `alert` : l'information est vraie en permanence, elle ne survient pas.
      // `alert` interromprait le lecteur d'écran à chaque frappe dans le formulaire.
      role="status"
      className={
        'flex flex-wrap items-start gap-3 rounded-[10px] border px-4 py-[var(--espace-5)] ' +
        (inconnu
          ? 'border-[var(--info-bordure)] bg-[var(--info-fond)]'
          : 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)]')
      }
    >
      <span
        aria-hidden="true"
        className={
          'flex size-9 shrink-0 items-center justify-center rounded-md ' +
          (inconnu ? 'text-[var(--info-accent)]' : 'text-[var(--alerte-accent)]')
        }
      >
        <ShieldCheck size={20} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block ul-surtitre">Votre vitrine</span>
        <h2 className="mt-1 ul-titre-panneau">{titre}</h2>
        {/*
          En style inline plutôt qu'en utilitaire : `.ul-aide` fixe déjà `color` et vit hors d'un
          `@layer`, elle l'emporterait sur `text-[…]` sans que rien ne le signale (piège du
          chantier 70). L'encre sémantique se lit sur son propre fond, l'encre tertiaire non.
        */}
        <p
          className="mt-1 ul-aide"
          style={{ color: inconnu ? 'var(--info-texte)' : 'var(--alerte-texte)' }}
        >
          {inconnu
            ? 'Rien n’a changé côté serveur — seul cet affichage manque. Rechargez la page dans un instant.'
            : !peutExercer
              ? 'Tant que votre dossier n’est pas vérifié et votre contrat signé, votre fiche n’apparaît pas dans l’annuaire — quel que soit le soin apporté à cette page.'
              : 'Vous êtes vérifié et sous contrat, mais sans offre active un patient n’a aucun moyen de vous solliciter.'}
        </p>
      </span>
      {inconnu ? null : (
        <span className="shrink-0">
          {!peutExercer ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/verification">Voir mon dossier</Link>
            </Button>
          ) : (
            /*
              Une ancre, pas une navigation : les offres sont sur CETTE page, plus bas. Envoyer
              ailleurs pour revenir aussitôt ferait perdre le formulaire en cours de saisie.
            */
            <Button variant="outline" size="sm" asChild>
              <a href="#mes-offres">Activer une offre</a>
            </Button>
          )}
        </span>
      )}
    </section>
  )
}

export function VitrinePage() {
  const qc = useQueryClient()
  const me = useSessionStore((s) => s.me)
  const setMe = useSessionStore((s) => s.setMe)
  const [erreur, setErreur] = useState<string | null>(null)

  // Brouillon local : l'aperçu suit la frappe, l'enregistrement suit à 800 ms.
  const [bio, setBio] = useState(me?.biography ?? '')
  const [district, setDistrict] = useState(me?.district ?? '')

  const verif = useQuery({ queryKey: ['verification'], queryFn: () => api.verificationMine(), retry: false })
  const offres = useQuery({ queryKey: ['offers'], queryFn: () => api.myOffers() })
  const bornes = useQuery({ queryKey: ['offer-limits'], queryFn: () => api.offerLimits() })
  /*
    ── L'ASSIETTE du taux de confirmation — chantier 71 ──────────────────────────────────────────

    La règle est déjà écrite dans le serveur, au-dessus de `confirmDenominator()` : *« un pourcentage
    sans son assiette ne se vérifie pas : 100 % sur deux demandes et 100 % sur deux cents ne disent
    pas la même chose »*. Le tableau de bord la respecte — « 100 % · sur 2 demandes ». Cet écran-ci
    affichait le pourcentage seul.

    ⚠️ Vérifié avant de le brancher, parce que coller une assiette à un pourcentage qui n'est pas le
    sien serait pire que le silence : les deux écrans appellent **la même fonction** `confirmRate()`
    sur les mêmes compteurs `ProfessionalStats`. Seul l'arrondi diffère — la route publique arrondit
    à l'entier, le tableau de bord au dixième. Sur un même compte, les deux peuvent donc afficher
    « 67 % » et « 66,7 % » : c'est le même taux, pas une contradiction.

    La route publique, elle, ne sert PAS le dénominateur, et il n'a pas été demandé qu'elle le fasse :
    ce chiffre dit combien de sollicitations le soignant a reçues, et c'est son affaire, pas celle des
    patients. Il est donc lu sur SA route à lui — même clé de cache que le tableau de bord, la
    requête ne part qu'une fois.
  */
  const bord = useQuery({ queryKey: ['dashboard', 'pro'], queryFn: () => api.professionalDashboard(), retry: false })

  /**
   * « Ce que les patients voient » n'est pas une reconstitution : on appelle la VRAIE route publique
   * avec son propre identifiant. Elle filtre sur RM-05-01 — un refus est donc l'information même :
   * le médecin n'est pas dans l'annuaire.
   */
  const publique = useQuery({
    queryKey: ['directory-me', me?.accountId],
    queryFn: () => api.directoryProfile(me?.accountId ?? ''),
    enabled: !!me?.accountId,
    retry: false,
  })

  const enregistrerProfil = useMutation({
    mutationFn: (v: { biography: string; district: string }) => api.updateMyProfessionalProfile(v),
    onSuccess: (m: MeResponse) => {
      setMe(m)
      void qc.invalidateQueries({ queryKey: ['directory-me'] })
    },
  })
  const etatProfil = useEnregistrementAuto({ biography: bio, district }, (v) => enregistrerProfil.mutateAsync(v), !!me)

  const rafraichirOffres = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['offers'] })
    void qc.invalidateQueries({ queryKey: ['offer-limits'] })
    void qc.invalidateQueries({ queryKey: ['directory-me'] })
  }, [qc])

  const creerOffre = useMutation({
    mutationFn: (dto: { label: string; durationMin: number; priceXaf: number; kind: OfferKind }) => api.createOffer(dto),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageErreur(e)),
  })
  const desactiverOffre = useMutation({
    mutationFn: (id: string) => api.deactivateOffer(id),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageErreur(e)),
  })
  /*
    ── Les deux gestes qui manquaient (chantier 66, 07/09/2026) ──────────────────────────────────

    `api.updateOffer` était déclaré et **aucun écran ne l'appelait**. Une offre désactivée ne pouvait
    donc plus jamais être rallumée, ni un prix corrigé. Mesuré en production : le seul soignant de la
    plateforme avait ses deux offres éteintes, sans aucun moyen de revenir en arrière — sinon en
    créer d'autres, jusqu'au plafond.

    Le serveur applique à la réactivation les mêmes garde-fous qu'à une création — droit d'exercer,
    plafond PM-25 d'offres actives — et son refus arrive avec son motif, qu'on affiche tel quel.
  */
  const modifierOffre = useMutation({
    mutationFn: (v: { id: string; dto: { label: string; durationMin: number; priceXaf: number } }) =>
      api.updateOffer(v.id, v.dto),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageErreur(e)),
  })
  const reactiverOffre = useMutation({
    mutationFn: (id: string) => api.updateOffer(id, { active: true }),
    onSuccess: rafraichirOffres,
    onError: (e) => setErreur(messageErreur(e)),
  })

  const avatar = useMutation({
    mutationFn: (dto: { imageBase64: string; mime: string } | null) =>
      dto ? api.setAvatar(dto) : api.removeAvatar(),
    onSuccess: (m: MeResponse) => {
      setMe(m)
      void qc.invalidateQueries({ queryKey: ['directory-me'] })
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  // Le taux vient du CONTRAT SIGNÉ, jamais d'une constante : deux médecins peuvent avoir deux taux
  // en même temps, selon qu'ils ont re-signé leur avenant ou non (RM-13-07).
  const commissionPct = verif.data?.agreement?.commissionPct ?? null
  const peutExercer = verif.data?.canPractice ?? false

  const nomAffiche = [me?.firstName, me?.lastName].filter(Boolean).join(' ') || me?.username || '—'
  const listeOffres = offres.data ?? []
  const offresActives = useMemo(() => listeOffres.filter((o) => o.active), [listeOffres])

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ul-titre-page">
            Ma vitrine
          </h1>
          {/*
            ⚠️ Ce sous-titre portait le VERDICT de l'écran — « aucun patient ne peut vous
            solliciter » — en 13 px, au milieu d'une phrase de contexte. Il est monté dans
            `BandeauEtat` au chantier 71 ; ce qui reste ici est le fait neutre : où la fiche est
            visible, et combien d'offres tournent.

            Les trois états sont conservés : « pas visible » est une AFFIRMATION, qui ne peut se
            dire que si le serveur a répondu. C'est la correction du 01/09/2026 — `canPractice`
            valait `false` par défaut, et une panne réseau annonçait à un médecin en règle qu'il
            était invisible des patients.
          */}
          <p className="mt-1 text-[13px] text-[var(--texte-secondaire)]">
            {!verif.isSuccess ? (
              'Votre dossier n’a pas pu être lu'
            ) : peutExercer ? (
              <>
                Visible dans l’annuaire{me?.district ? ` de ${me.district}` : ''} · {offresActives.length} offre
                {offresActives.length > 1 ? 's' : ''} active{offresActives.length > 1 ? 's' : ''}
              </>
            ) : (
              'Fiche non publiée dans l’annuaire'
            )}
          </p>
        </div>
        <Enregistrement etat={etatProfil} />
      </header>

      <BandeauEtat
        lectureFaite={verif.isSuccess}
        peutExercer={peutExercer}
        offresActives={offresActives.length}
      />

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

      {/*
        Deux colonnes, mesurées sur la maquette le 27/08 : 968 px d'édition et un rail d'aperçu de
        320 px. L'aperçu n'est ni un onglet ni une fenêtre — il vit À CÔTÉ du formulaire et suit la
        frappe. C'est le cœur de l'écran, et c'est ce que la version précédente avait remplacé par
        une liste de confrères.
      */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <Carte icone={Store} titre="Identité professionnelle" sousTitre="Le nom et la spécialité proviennent de votre dossier vérifié">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--ap-600)]">
                  {me?.avatarKey ? (
                    <img src={urlAvatar(me.avatarKey)} alt="" className="size-full object-cover" />
                  ) : (
                    ((me?.firstName?.[0] ?? '') + (me?.lastName?.[0] ?? '')).toUpperCase() || '·'
                  )}
                </span>
                <span className="min-w-0 flex-1 basis-52">
                  <span className="block text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                    Photo visible par les patients dans l’annuaire · JPEG ou PNG, 2 Mo maximum.
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const lecteur = new FileReader()
                        lecteur.onload = () =>
                          avatar.mutate({ imageBase64: String(lecteur.result).split(',')[1] ?? '', mime: f.type })
                        lecteur.readAsDataURL(f)
                        e.target.value = ''
                      }}
                    />
                    <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-secondary">
                      <Camera size={14} strokeWidth={1.6} aria-hidden="true" />
                      Téléverser
                    </span>
                  </label>
                  {me?.avatarKey ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => avatar.mutate(null)} disabled={avatar.isPending}>
                      Retirer
                    </Button>
                  ) : null}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <span className="grid gap-1">
                  <Label className="text-[11px]">Nom affiché</Label>
                  <Input value={nomAffiche} readOnly disabled />
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">Issu de votre pièce d’identité vérifiée.</span>
                </span>
                <span className="grid gap-1">
                  <Label className="text-[11px]">Spécialité</Label>
                  <Input value={me?.specialty ?? '—'} readOnly disabled />
                  {/*
                    Lecture seule par arbitrage du porteur (27/08). Le serveur l'autorise pourtant :
                    le Badge Vérifié atteste d'une qualification contrôlée par pièces, et un
                    cardiologue qui se renommerait « neurochirurgien » garderait son badge — le badge
                    mentirait. Fermer la route côté serveur reste une dette ouverte (§9 du plan).
                  */}
                  <span className="text-[11px] text-[var(--texte-tertiaire)]">Une modification passe par l’administration.</span>
                </span>
              </div>

              <span className="grid gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="bio" className="text-[11px]">
                    Présentation
                  </Label>
                  <span className="t-code-sm text-[var(--texte-tertiaire)]">
                    {bio.length} / {BIO_MAX}
                  </span>
                </span>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  rows={4}
                  placeholder="Décrivez votre pratique en quelques phrases."
                />
                <span className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Évitez les promesses de résultat : la charte de l’Ordre l’interdit. {BIO_MAX} caractères maximum.
                </span>
              </span>

              {/*
                Remplace le bloc « Lieux de consultation » de la maquette — cabinets, adresses,
                horaires. Rien de tout cela n'existe : la fiche d'un professionnel ne porte qu'un
                seul champ géographique, et EF-05-01 n'en connaît pas d'autre.
              */}
              <span className="grid gap-1 sm:max-w-xs">
                <Label htmlFor="district" className="text-[11px]">
                  Arrondissement
                </Label>
                <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bacongo" />
                <span className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  C’est la seule information de lieu visible des patients, et elle sert aussi à vous trouver dans la
                  recherche.
                </span>
              </span>
            </div>
          </Carte>

          {/* La cible de « Activer une offre » du bandeau d'état. `scroll-mt` réserve la hauteur de
              la barre du haut : sans elle, l'ancre poserait le titre du panneau SOUS la barre, et on
              arriverait sur un écran qui semble n'avoir pas bougé. */}
          <div id="mes-offres" className="scroll-mt-[var(--layout-topbar-height)]">
          <Carte
            icone={Tag}
            titre="Mes offres"
            sousTitre="Montants en XAF, visibles avant toute demande"
            action={
              commissionPct !== null ? (
                <Pilule ton="neutre">commission {commissionPct} %</Pilule>
              ) : null
            }
          >
            <div className="grid gap-3">
              {offres.isLoading ? (
                <Spinner />
              ) : listeOffres.length === 0 ? (
                <p className="text-[13px] text-[var(--texte-tertiaire)]">
                  Aucune offre pour l’instant. Un patient ne peut vous solliciter que par une offre.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {listeOffres.map((o) => (
                    <LigneOffre
                      key={o.id}
                      offre={o}
                      commissionPct={commissionPct ?? 0}
                      bornes={bornes.data ?? null}
                      onDesactiver={() => desactiverOffre.mutate(o.id)}
                      onModifier={(dto) => modifierOffre.mutate({ id: o.id, dto })}
                      onReactiver={() => reactiverOffre.mutate(o.id)}
                      enCours={desactiverOffre.isPending || modifierOffre.isPending || reactiverOffre.isPending}
                    />
                  ))}
                </ul>
              )}

              {bornes.data && commissionPct !== null ? (
                <AjoutOffre
                  bornes={bornes.data}
                  commissionPct={commissionPct}
                  onAjouter={(dto) => creerOffre.mutate(dto)}
                  enCours={creerOffre.isPending}
                />
              ) : null}

              {/*
                Famille 4, point 8 : la relance de suivi part TOUTE SEULE au dépôt du compte-rendu,
                si une offre « suivi » active existe. Aucun bouton — il ferait doublon avec l'envoi
                serveur. Deux phrases suffisent, et c'est ici qu'elles ont un sens.
              */}
              <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Une offre de type <strong className="text-foreground">suivi</strong> déclenche une proposition
                automatique au patient dès que vous déposez votre compte-rendu. Vous n’avez rien à envoyer.
              </p>
            </div>
          </Carte>
          </div>

        </div>

        {/* Rail d'aperçu — 320 px, collant : il reste en vue pendant qu'on édite à gauche. */}
        <div className="grid content-start gap-4 lg:sticky lg:top-4">
          <Carte icone={Eye} titre="Aperçu patient" sousTitre="Tel qu’il apparaît dans l’annuaire">
            <div className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start gap-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-[12px] font-bold text-[var(--ap-600)]">
                  {me?.avatarKey ? (
                    <img src={urlAvatar(me.avatarKey)} alt="" className="size-full object-cover" />
                  ) : (
                    ((me?.firstName?.[0] ?? '') + (me?.lastName?.[0] ?? '')).toUpperCase() || '·'
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-foreground">{nomAffiche}</span>
                    {peutExercer ? (
                      <ShieldCheck size={13} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[var(--succes-accent)]" />
                    ) : null}
                  </span>
                  <span className="mt-px block truncate text-[11px] text-[var(--texte-tertiaire)]">
                    {[me?.specialty, district].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
              </div>

              {bio.trim() ? (
                <p className="mt-2.5 text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">{bio}</p>
              ) : (
                <p className="mt-2.5 text-[12px] leading-[1.55] text-[var(--texte-tertiaire)]">
                  Sans présentation, votre fiche paraît vide à côté de celles de vos confrères.
                </p>
              )}

              {offresActives.length > 0 ? (
                <p className="mt-2.5 border-t border-border pt-2.5 text-[12px] text-[var(--texte-secondaire)]">
                  À partir de{' '}
                  <strong className="font-[family-name:var(--font-display)] text-[15px] font-bold text-foreground">
                    {xaf(Math.min(...offresActives.map((o) => o.priceXaf)))} XAF
                  </strong>
                </p>
              ) : null}
            </div>

            <p className="mt-2 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
              Votre pastille de disponibilité s’affiche aussi sur cette fiche. Elle se règle dans la barre du haut.
            </p>
          </Carte>

          {/*
            Remplace « Prêt à publier » et ses quatre contrôles inventés (80 caractères de bio, une
            langue, un lieu, un tarif par mode). La VRAIE règle est RM-05-01 : seuls les
            professionnels vérifiés ET sous contrat signé apparaissent. On peut soigner chaque mot
            de cet écran et n'être visible nulle part.
          */}
          {/*
            Le ton rouge est un VERDICT. Sans réponse du serveur, il n'y a pas de verdict : la carte
            reste neutre et dit ce qu'elle sait — c'est-à-dire rien. Trois croix rouges affichées
            sur une panne réseau feraient croire à un dossier refusé.
          */}
          <Carte
            icone={ShieldCheck}
            titre="Êtes-vous visible ?"
            ton={!verif.isSuccess ? 'accent' : peutExercer ? 'accent' : 'danger'}
          >
            <div className="grid gap-2">
              {!verif.isSuccess ? (
                /*
                  ⚠️ « Rien n'a changé côté serveur — seul cet affichage manque » a été retiré d'ici
                  au chantier 71 : le bandeau d'état le dit désormais, en haut de l'écran. Le garder
                  aux deux endroits aurait recréé le doublon que ce chantier supprime — et je l'avais
                  recréé sans le voir, la phrase étant coupée sur deux lignes dans le fichier.

                  Cette carte garde ce qu'elle seule sait dire : que ce sont ces TROIS conditions-là
                  qui restent inconnues.
                */
                <Avis ton="info">Votre dossier n’a pas pu être lu : ces trois conditions restent inconnues.</Avis>
              ) : null}
              <Critere ok={verif.data?.status === 'VERIFIED'} label="Dossier vérifié par l’administration" />
              <Critere ok={!!verif.data?.agreement?.signedAt} label="Contrat de partenariat signé" />
              <Critere ok={offresActives.length > 0} label="Au moins une offre active" />

              {/*
                ⚠️ Les deux alertes qui vivaient ici ont été RETIRÉES au chantier 71, et non
                perdues : elles disaient la conséquence, que `BandeauEtat` dit maintenant une seule
                fois, en haut de l'écran et en grand. Cette carte garde ce qu'elle seule sait dire —
                LEQUEL des trois verrous est fermé.

                *Un fait répété trois fois en petit se lit moins bien qu'énoncé une fois clairement.*
              */}
            </div>
          </Carte>

          {/*
            Remplace le bloc « Visibilité » de la maquette, **à sa place** — dans le rail de droite.
            Ses 318 vues de fiche ne sont comptées nulle part ; ce qui suit vient de la VRAIE route
            publique, c'est littéralement ce qu'un patient lit (famille 4, point 7).

            ⚠️ Ce bloc avait d'abord été posé dans la colonne de GAUCHE, au motif que la liste des
            commentaires tenait mal dans 320 px. C'était une raison, pas un fait — et la règle est
            que seule une contrainte réelle autorise à s'écarter de la maquette. Remis à droite le
            27/08 : les trois chiffres s'empilent, les avis sont compacts.
          */}
          <Carte icone={Users} titre="Ce que les patients voient" sousTitre="Chiffres publics, mis à jour tout seuls">
            {publique.isLoading ? (
              <Spinner />
            ) : publique.data ? (
              <div className="grid gap-3">
                <div className="grid gap-2.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="ul-surtitre">
                      Note moyenne
                    </span>
                    <span className="flex items-baseline gap-1.5">
                      <Star size={12} strokeWidth={1.8} aria-hidden="true" className="translate-y-px text-[var(--ton-ambre-icone)]" />
                      <strong className="ul-chiffre-ligne">{publique.data.rating.avg ?? '—'}</strong>
                      <span className="text-[11px] text-[var(--texte-tertiaire)]">{publique.data.rating.count} avis</span>
                    </span>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="ul-surtitre">
                      Taux de confirmation
                    </span>
                    <strong className="ul-chiffre-ligne">{publique.data.reactivity.confirmRatePct ?? '—'} %</strong>
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="ul-surtitre">
                      Délai moyen
                    </span>
                    <strong className="ul-chiffre-ligne">{delaiHumain(publique.data.reactivity.avgConfirmDelayS) ?? '—'}</strong>
                  </span>
                </div>

                {/*
                  ⚠️ L'assiette est dite SOUS les chiffres publics, et non collée au pourcentage.

                  Ce panneau promet « c'est littéralement ce qu'un patient lit ». Glisser « sur
                  2 demandes » à côté du taux ferait mentir cette promesse : les patients ne voient
                  pas ce nombre. La phrase dit donc explicitement qui voit quoi.

                  Et rien ne s'affiche si la lecture n'a pas abouti : une assiette absente n'est pas
                  une assiette de zéro.
                */}
                {bord.data ? (
                  <p className="t-caption text-[var(--texte-tertiaire)]">
                    Votre taux porte sur{' '}
                    <strong className="text-foreground">
                      {bord.data.confirmationBase} {accord(bord.data.confirmationBase, 'demande')}
                    </strong>{' '}
                    — les refus motivés n’y comptent pas. Les patients voient le pourcentage, pas ce détail.
                  </p>
                ) : null}

                <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
                  Le taux baisse quand une demande expire sans réponse — même une réponse négative vaut mieux
                  qu’une expiration. <strong className="text-foreground">Vous ne pouvez ni répondre à un avis, ni
                  le masquer</strong> ; un avis abusif se signale à l’administration.
                </p>

                {publique.data.latestComments.length > 0 ? (
                  <ul className="grid gap-1.5 border-t border-border pt-2.5">
                    {publique.data.latestComments.slice(0, 3).map((c, i) => (
                      <li key={i}>
                        {/*
                          ⚠️ La date d'un avis était le SEUL texte de cet écran sous le seuil de
                          lisibilité : 10 px, encre tertiaire, **3,49:1** mesuré en thème clair sur
                          le site en ligne. Elle passe au palier de légende (11 px) et à l'encre
                          secondaire, qui tient dans les deux thèmes.
                          Les étoiles gardent leur teinte : elles ne portent pas de texte à lire,
                          et le score est déjà dit par leur nombre.
                        */}
                        <span className="flex items-baseline gap-1.5 t-caption text-[var(--ton-ambre-icone)]">
                          {'★'.repeat(c.score)}
                          <span className="text-[var(--texte-secondaire)]">
                            {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </span>
                        <p className="text-[12px] leading-[1.45] text-[var(--texte-secondaire)]">{c.comment}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Ces chiffres apparaîtront dès que votre fiche sera publiée et qu’un patient vous aura sollicité.
              </p>
            )}
          </Carte>
        </div>
      </div>
    </div>
  )
}
