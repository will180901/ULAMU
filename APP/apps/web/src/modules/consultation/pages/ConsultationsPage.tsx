/**
 * C4 — Consultations. D'après `docs/maquettes/C4 - Consultations.dc.html` et M06.
 *
 * Le registre : toutes les séances du soignant, ce qu'il a prescrit, ce qu'elles lui ont rapporté,
 * et surtout **ce qu'il doit encore signer**. C'est cette dernière colonne qui fait l'écran — un
 * compte-rendu manquant gèle des gains (RM-06-04) et alerte l'administration passé PM-30.
 *
 * ── La forme, telle que la maquette la fixe ────────────────────────────────────────────────────
 *
 * Trois tuiles de chiffres, trois onglets comptés, puis **un tableau**. L'écran précédent empilait
 * des cartes et proposait une liste déroulante : ce n'était pas la maquette. Un registre se lit en
 * colonnes — on y cherche une ligne, on la compare aux voisines, on n'y fait pas défiler des fiches.
 *
 * ── Ce que le serveur a dû apprendre à dire (S9) ───────────────────────────────────────────────
 *
 * `orderRef` sur les lignes du registre. C'est la clé qui relie une consultation à l'argent : le
 * journal des gains porte un mouvement `CREDIT` par consultation capturée, référencé par cette même
 * chaîne. Sans elle, la colonne « honoraires » n'avait que deux issues, toutes deux mauvaises —
 * écrire un prix dans la page, ou n'afficher aucun montant. **Deux lignes de serveur.**
 *
 * La capture a lieu au dépôt du compte-rendu (RM-06-04). Une consultation sans compte-rendu n'a donc
 * **aucun** mouvement au journal : ce n'est pas une donnée manquante, c'est de l'argent pas encore
 * gagné, et l'écran le dit ainsi.
 *
 * ── Les écarts à la maquette ──────────────────────────────────────────────────────────────────
 *
 * 1. **« Délai réglementaire de 48 h » → un décompte réel.** PM-30 vaut 86 400 s. Même dette qu'en
 *    C5, réglée de la même façon : `reportDueAt` vient du serveur, et **aucun délai n'est écrit
 *    ici**. La version précédente de cet écran avait corrigé le 48 h en « 24 heures » — un chiffre
 *    juste écrit en dur, c'est-à-dire un chiffre faux en sursis.
 * 2. **La colonne « MODE » (Téléconsultation / En cabinet) retirée.** Elle n'a aucun référent :
 *    *« pas de consultation vidéo/audio en direct au démarrage : la messagerie est le seul
 *    portail »* (famille 3, groupe B), et un médecin n'est rattachable à aucun cabinet — `Facility`
 *    ne vaut que `PHARMACY` ou `LABORATORY` (groupe A). Remplacée par la **durée**, qui existe.
 * 3. **La colonne « PATIENT » (initiales, motif, référence CSL) devient « Consultation ».** Le
 *    registre ne charge aucune identité, et n'a pas à en réclamer une pour décorer un tableau. Le
 *    motif n'est pas non plus dans cette vue — il vit dans la pré-consultation, que seule la séance
 *    ouverte porte. Reste la référence, et la mention « pour un proche » quand la séance a été prise
 *    pour une personne à charge (D-033).
 * 4. **« Suivi en officine » retiré** (famille 3, groupe C) — la branche pharmacie est hors
 *    périmètre, le bloc resterait vide à jamais. Remplacé par le **statut de l'ordonnance**, qui est
 *    ce que le médecin peut réellement savoir.
 * 5. **« Exporter » et « Télécharger le PDF » retirés** (famille 3, groupe D) — EF-04-04 ne prévoit
 *    d'export que pour le journal d'audit, et le code déclare l'export PDF hors MVP.
 * 6. **« ORD-2026-00412 » retiré.** Ce format de référence n'existe pas : les identifiants sont des
 *    UUID opaques. On montre l'état de l'ordonnance, pas un numéro inventé.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Clock,
  Hourglass,
  MoreVertical,
  Pill,
  Search,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { accord } from '@/lib/accord'
import { Input } from '@/components/ui/input'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { api, type CareSessionStatus, type Prescription, type SessionListItem } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { SqueletteTableau } from '@/components/ulamu/Squelette'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DialogueSignalement } from '@/components/ulamu/DialogueSignalement'
import { messageErreur } from '@/lib/message-erreur'

/**
 * La référence courte d'un identifiant — la même forme partout : huit caractères, en capitales.
 *
 * C'est ce qu'on dicte au support et ce qu'on cherche dans un registre. `Prescription` ne porte
 * aucun code métier ; son identifiant technique en tient lieu, comme pour une séance.
 */
const refCourte = (id: string) => id.slice(0, 8).toUpperCase()

const dateFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
const heureFr = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Les montants en XAF s'écrivent sans décimale et avec une espace tous les trois chiffres. */
const xaf = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })

/** Lignes par page — voir la note sur `page` dans l'écran. */
const TAILLE_PAGE = 15

const ETATS: Record<CareSessionStatus, { libelle: string; ton: TonPilule }> = {
  PREPARING: { libelle: 'En préparation', ton: 'info' },
  ACTIVE: { libelle: 'En cours', ton: 'succes' },
  ENDED: { libelle: 'Terminée', ton: 'neutre' },
  REFUNDED: { libelle: 'Remboursée', ton: 'erreur' },
}

const ETATS_ORDONNANCE: Record<Prescription['status'], { libelle: string; ton: TonPilule }> = {
  ACTIVE: { libelle: 'Active', ton: 'succes' },
  PARTIALLY_DISPENSED: { libelle: 'Partiellement délivrée', ton: 'info' },
  DISPENSED: { libelle: 'Délivrée', ton: 'neutre' },
  CANCELLED: { libelle: 'Annulée', ton: 'erreur' },
  EXPIRED: { libelle: 'Expirée', ton: 'alerte' },
}

/**
 * « compte-rendu » → « compteS-renduS » : les DEUX mots s'accordent.
 *
 * Écrire « compte-rendus » est une faute, et sur un écran qu'un médecin regarde tous les jours,
 * elle se voit. Le pluriel est donc calculé ici, une fois, plutôt qu'ajouté à la main à chaque
 * endroit — où l'on finit toujours par n'accorder que le dernier mot.
 */
const comptesRendus = (n: number) => (n > 1 ? 'comptes-rendus' : 'compte-rendu')

/** « 3 h 20 min », « 41 min » — ce qui reste avant une échéance servie par le serveur. */
function dureeFr(secondes: number): string {
  const s = Math.max(0, secondes)
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  if (h >= 24) return `${Math.floor(h / 24)} j ${h % 24} h`
  if (h >= 1) return `${h} h ${String(min).padStart(2, '0')} min`
  return `${Math.max(1, min)} min`
}

/** À signer : terminée, non remboursée, et sans compte-rendu déposé (D-021). */
const aSigner = (s: SessionListItem) => s.status === 'ENDED' && !s.reportDepositedAt

type Onglet = 'toutes' | 'a-signer' | 'signees'

// ── Les trois tuiles de tête ───────────────────────────────────────────────

function Tuile({
  icone: Icone,
  intitule,
  valeur,
  detail,
  ton = 'neutre',
}: {
  icone: typeof Wallet
  intitule: string
  valeur: string
  detail: string
  ton?: 'neutre' | 'alerte' | 'erreur'
}) {
  const couleur =
    ton === 'erreur' ? 'text-[var(--erreur-texte)]' : ton === 'alerte' ? 'text-[var(--alerte-texte)]' : 'text-foreground'
  return (
    <div className="min-w-0 flex-1 basis-52 rounded-[10px] border border-border bg-card p-3.5">
      <p className="flex items-center gap-1.5 ul-surtitre">
        <Icone size={12} strokeWidth={1.9} aria-hidden="true" />
        {intitule}
      </p>
      <p className={'mt-1 font-[family-name:var(--font-display)] text-[26px] font-bold leading-none ' + couleur}>
        {valeur}
      </p>
      <p className="mt-1.5 ul-aide">{detail}</p>
    </div>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────


/**
 * Le menu d'actions secondaires d'une ligne du registre — chantier 77.
 *
 * ── Ce qu'il corrige ──────────────────────────────────────────────────────────────────────────
 *
 * Chaque ligne n'offrait qu'un bouton. Voir une ordonnance, l'annuler, signaler un patient : trois
 * gestes qui existent tous côté serveur, et qui obligeaient à ENTRER dans la consultation pour en
 * ressortir.
 *
 * ── Ce qu'il ne contient PAS, et pourquoi ─────────────────────────────────────────────────────
 *
 * • **Exporter** — aucune route ne produit d'export. Un bouton qui ment est pire qu'un bouton
 *   absent.
 * • **Supprimer la consultation** — rien de tel n'existe, et rien de tel ne doit exister : un acte
 *   de soin ne s'efface pas.
 *
 * ⚠️ Le menu ne montre que ce qui est FAISABLE sur CETTE ligne : pas d'ordonnance, pas d'entrée
 * d'ordonnance. Une entrée grisée n'apprend rien de plus qu'une entrée absente, et elle fait
 * espérer.
 */
function MenuLigne({
  seance,
  ordonnances,
  surSignaler,
  surAnnuler,
}: {
  seance: SessionListItem
  ordonnances: Prescription[]
  surSignaler: () => void
  surAnnuler: (o: Prescription) => void
}) {
  /* Annulable = le SERVEUR l'accepterait. Vérifié dans `m09` : la règle ne regarde que l'état de
     l'ordonnance (ACTIVE ou partiellement délivrée), jamais celui de la séance — une ordonnance
     d'une consultation terminée reste donc annulable, et c'est voulu (CU-09-04). */
  const annulables = ordonnances.filter((o) => o.status === 'ACTIVE' || o.status === 'PARTIALLY_DISPENSED')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" aria-label={`Autres actions — consultation du ${dateFr(seance.paidAt)}`}>
          <MoreVertical size={16} strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem asChild>
          <Link to={`/consultations/${seance.id}`}>Ouvrir le fil de la consultation</Link>
        </DropdownMenuItem>

        {ordonnances.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {/* « Voir » mène au fil : l'ordonnance vit dans le panneau de la consultation, et c'est
                là qu'elle se relit avec son contexte. On ne duplique pas un écran pour un raccourci. */}
            <DropdownMenuItem asChild>
              <Link to={`/consultations/${seance.id}`}>
                Voir {accord(ordonnances.length, "l'ordonnance", 'les ordonnances')}
              </Link>
            </DropdownMenuItem>
            {annulables.map((o) => (
              <DropdownMenuItem key={o.id} onSelect={() => surAnnuler(o)}>
                Annuler l'ordonnance {refCourte(o.id)}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={surSignaler}>Signaler ce patient</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * L'annulation d'une ordonnance, depuis le registre — chantier 77.
 *
 * ⚠️ **Le motif est obligatoire côté serveur**, et ce n'est pas une formalité : une ordonnance
 * annulée reste au dossier du patient, et le motif est ce qui explique l'annulation à qui la
 * relira. Le bouton attend donc qu'il soit écrit.
 *
 * ⚠️ Et l'acte est **irréversible** : le QR devient inerte (RM-09-05). La boîte le dit avant, pas
 * après.
 */
function BoiteAnnulation({
  ordonnance,
  surFermer,
  surFait,
}: {
  ordonnance: Prescription
  surFermer: () => void
  surFait: () => void
}) {
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  const annuler = useMutation({
    mutationFn: () => api.cancelPrescription(ordonnance.id, motif.trim()),
    onSuccess: () => {
      surFait()
      surFermer()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && surFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler l'ordonnance {refCourte(ordonnance.id)}</DialogTitle>
          <DialogDescription>
            Elle restera au dossier du patient, marquée annulée, avec votre motif. Le code cesse
            définitivement d'être valable.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label htmlFor="motif-annulation" className="text-[13px]">
            Motif de l'annulation
          </Label>
          <Textarea
            id="motif-annulation"
            rows={3}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ce que vous voulez que le prochain lecteur du dossier sache."
          />
        </div>

        {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={surFermer} disabled={annuler.isPending}>
            Ne pas annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => annuler.mutate()}
            disabled={motif.trim().length === 0 || annuler.isPending}
          >
            {annuler.isPending ? <Spinner className="size-4" /> : null}
            Annuler l'ordonnance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConsultationsPage() {
  const [recherche, setRecherche] = useState('')
  const [onglet, setOnglet] = useState<Onglet>('toutes')
  /*
    ── La pagination — chantier 77 ───────────────────────────────────────────────────────────────

    ⚠️ Elle est **côté écran**, et c'est une contrainte, pas un choix : `listMine` renvoie au plus
    cent séances (`take: 100`), **sans curseur, sans page, sans total**. Il n'y a donc rien à
    paginer côté serveur — on découpe ce qui est arrivé.

    Conséquence à ne jamais masquer : **au-delà de cent, les plus anciennes n'arrivent pas**, et
    tourner les pages ne les fera pas revenir. La phrase qui le dit reste sous le tableau.
  */
  const [page, setPage] = useState(0)
  /*
    Les deux gestes du menu qui demandent une confirmation. `null` = fermé.

    ⚠️ Ils vivent ICI et non dans `MenuLigne` : une boîte de dialogue montée dans une cellule de
    tableau se ferme avec sa ligne dès que la page tourne ou qu'un filtre change — et l'annulation
    partirait à moitié.
  */
  const qc = useQueryClient()
  const [signale, setSignale] = useState<SessionListItem | null>(null)
  const [aAnnuler, setAAnnuler] = useState<Prescription | null>(null)
  const moi = useSessionStore((s) => s.me)

  const seances = useQuery({ queryKey: ['sessions', 'mine'], queryFn: () => api.mySessions(), retry: false })
  const ordonnances = useQuery({ queryKey: ['prescriptions', 'prescribed'], queryFn: () => api.myPrescribed(), retry: false })
  const offres = useQuery({ queryKey: ['offers', 'mine'], queryFn: () => api.myOffers(), retry: false })

  /**
   * Le journal des gains. C'est LUI qui porte les montants — pas la vue des séances, qui n'a jamais
   * connu de prix. On ne calcule donc rien : on lit ce qui a réellement été crédité.
   */
  const gains = useQuery({
    queryKey: ['earnings', moi?.accountId],
    queryFn: () => api.earnings('PROFESSIONAL', moi!.accountId),
    enabled: !!moi?.accountId,
    retry: false,
  })

  /** Les ordonnances rangées par séance — c'est `sessionId` qui rend ce regroupement possible. */
  const parSeance = useMemo(() => {
    const m = new Map<string, Prescription[]>()
    for (const o of ordonnances.data?.items ?? []) m.set(o.sessionId, [...(m.get(o.sessionId) ?? []), o])
    return m
  }, [ordonnances.data])

  /**
   * Le montant crédité par consultation, indexé sur `orderRef` (S9).
   *
   * On additionne les mouvements de même référence : un remboursement (`REVERSAL`) porte un montant
   * négatif sur la même référence que le crédit qu'il annule. Le total dit donc la vérité nette,
   * sans qu'on ait à connaître les règles de la commission.
   */
  const creditParCommande = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of gains.data?.entries ?? []) {
      if (e.type === 'WITHDRAWAL') continue // un retrait ne concerne aucune consultation
      m.set(e.reference, (m.get(e.reference) ?? 0) + e.amountXaf)
    }
    return m
  }, [gains.data])

  const items = seances.data?.items ?? []
  const enAttente = items.filter(aSigner)
  const signees = items.filter((s) => s.reportDepositedAt !== null)

  /** Ce mois-ci : les séances payées depuis le 1er du mois courant. */
  const ceMois = useMemo(() => {
    const debut = new Date()
    debut.setDate(1)
    debut.setHours(0, 0, 0, 0)
    return items.filter((s) => new Date(s.paidAt) >= debut)
  }, [items])

  /** Les honoraires du mois : la somme des crédits du journal, pas une multiplication de prix. */
  const honorairesDuMois = useMemo(
    () => ceMois.reduce((total, s) => total + Math.max(0, creditParCommande.get(s.orderRef) ?? 0), 0),
    [ceMois, creditParCommande],
  )

  /** L'échéance la plus proche parmi les comptes-rendus en attente — celle qui presse. */
  const echeanceLaPlusProche = useMemo(() => {
    const dates = enAttente.map((s) => s.reportDueAt).filter((d): d is string => d !== null)
    if (dates.length === 0) return null
    return dates.reduce((min, d) => (new Date(d) < new Date(min) ? d : min))
  }, [enAttente])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return items.filter((s) => {
      if (onglet === 'a-signer' && !aSigner(s)) return false
      if (onglet === 'signees' && s.reportDepositedAt === null) return false
      // La recherche porte sur la date et la référence : aucune identité de patient n'est chargée
      // ici, et il n'est pas question d'en réclamer une pour agrémenter un filtre.
      if (!q) return true
      return dateFr(s.paidAt).toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    })
  }, [items, recherche, onglet])

  /*
    Quinze lignes : une hauteur d'écran de bureau sans défilement, et assez peu pour qu'une page se
    balaye d'un regard. En dessous de ce seuil, aucune commande de page ne s'affiche — des boutons
    « précédent / suivant » pour une seule page sont du décor.
  */
  const pages = Math.max(1, Math.ceil(visibles.length / TAILLE_PAGE))
  /* Changer d'onglet ou taper dans la recherche peut vider la page courante : on la ramène dans les
     bornes plutôt que d'afficher un tableau vide sous un « page 4 sur 2 ». */
  const pageSure = Math.min(page, pages - 1)
  const lignes = visibles.slice(pageSure * TAILLE_PAGE, (pageSure + 1) * TAILLE_PAGE)

  if (seances.isPending) {
    return (
      <SqueletteTableau colonnes={7} lignes={4} libelle="Chargement du registre…" />
    )
  }

  if (seances.isError) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Le registre n'a pas pu être chargé" sousTitre="Rien n'est perdu">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos comptes-rendus déposés restent intacts côté serveur, et les brouillons en cours vivent
            sur cet appareil : ni les uns ni les autres ne dépendent de cet affichage.
          </p>
          <div>
            <Button type="button" onClick={() => seances.refetch()}>
              Réessayer
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const offreDeSuivi = (offres.data ?? []).some((o) => o.kind === 'FOLLOW_UP' && o.active)

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <ClipboardList size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="ul-titre-page">
            Consultations
          </h1>
          {/*
            La phrase est construite d'un bloc plutôt qu'assemblée par interpolations : découpée en
            « compte-rendu » + « s » + « à déposer », elle devient trois nœuds de texte que ni un
            lecteur d'écran ni une recherche dans la page ne recomposent.
          */}
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {`${items.length} consultation${items.length > 1 ? 's' : ''} · ${signees.length} ${comptesRendus(
              signees.length,
            )} déposé${signees.length > 1 ? 's' : ''}`}
          </p>
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Tuile
          icone={ClipboardList}
          intitule="Ce mois-ci"
          valeur={String(ceMois.length)}
          detail={`${ceMois.filter((s) => s.status === 'ENDED' || s.status === 'REFUNDED').length} terminée${
            ceMois.filter((s) => s.status === 'ENDED' || s.status === 'REFUNDED').length > 1 ? 's' : ''
          }`}
        />
        <Tuile
          icone={Hourglass}
          intitule="À signer"
          valeur={String(enAttente.length)}
          ton={enAttente.length > 0 ? 'erreur' : 'neutre'}
          /*
            Aucun délai écrit : l'échéance la plus proche vient du serveur (`reportDueAt`). Si le
            super-administrateur change PM-30 dans E3, cette tuile suit sans qu'on y retouche.
          */
          detail={
            echeanceLaPlusProche
              ? `Le plus urgent : ${dureeFr((new Date(echeanceLaPlusProche).getTime() - Date.now()) / 1000)}`
              : enAttente.length > 0
                ? 'Le délai court dès la clôture'
                : 'Rien en attente'
          }
        />
        <Tuile
          icone={Wallet}
          intitule="Honoraires du mois"
          valeur={gains.isPending ? '…' : xaf(honorairesDuMois)}
          detail="XAF · net après commission, crédité au dépôt du compte-rendu"
        />
      </div>

      {/*
        Le rappel le plus utile de l'écran, et il ne s'affiche que s'il a lieu d'être. Aucun nombre
        d'heures : la conséquence suffit, et elle est exacte quelle que soit la valeur de PM-30.
      */}
      {enAttente.length > 0 ? (
        <div className="mb-4">
          <Avis ton="erreur">
            {`${enAttente.length} ${comptesRendus(enAttente.length)} en attente. Passé le délai, vos gains sont gelés et l'administration est alertée.`}
          </Avis>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segments
          label="Filtrer le registre"
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { cle: 'toutes', label: `Toutes ${items.length}` },
            { cle: 'a-signer', label: `À signer ${enAttente.length}` },
            { cle: 'signees', label: `Signées ${signees.length}` },
          ]}
        />
        <span className="relative min-w-0 flex-1 basis-56">
          <Search
            size={14}
            strokeWidth={1.6}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Rechercher une consultation"
            className="pl-8"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Une date, une référence…"
          />
        </span>
      </div>

      {items.length === 0 ? (
        <Carte icone={ClipboardList} titre="Aucune consultation enregistrée" sousTitre="Votre registre est vide">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos consultations apparaîtront ici dès qu'un patient aura confirmé et payé une demande.
          </p>
          <div>
            <Button asChild size="sm" variant="outline">
              <Link to="/demandes">Voir mes demandes</Link>
            </Button>
          </div>
        </Carte>
      ) : visibles.length === 0 ? (
        <Carte icone={Search} titre="Aucun résultat" sousTitre="Aucune consultation ne correspond">
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setRecherche('')
                setOnglet('toutes')
              }}
            >
              Effacer les filtres
            </Button>
          </div>
        </Carte>
      ) : (
        /* Un registre se lit en colonnes — au-dessus de 1024 px. En dessous, chaque ligne devient
           une carte (`ul-tableau-cartes`, globals.css) : les sept colonnes faisaient 880 px, dont
           549 hors écran sur un téléphone, et rien n'indiquait qu'il fallait tirer latéralement. */
        <div className="ul-tableau-defilant overflow-x-auto rounded-[10px] border border-border">
          <table role="table" className="ul-tableau-cartes w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr role="row" className="border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)]">
                {['Date', 'Consultation', 'Durée', 'Compte-rendu', 'Ordonnance', 'Honoraires', ''].map((t, i) => (
                  <th
                    key={t || `action-${i}`}
                    role="columnheader"
                    scope="col"
                    className="px-3 py-2.5 ul-surtitre"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((s) => {
                const etat = ETATS[s.status]
                const ordo = parSeance.get(s.id) ?? []
                const manque = aSigner(s)
                const restantS = s.reportDueAt ? (new Date(s.reportDueAt).getTime() - Date.now()) / 1000 : null
                const credit = creditParCommande.get(s.orderRef)

                return (
                  <tr key={s.id} className="border-b border-border last:border-b-0 align-top">
                    <td role="cell" data-libelle="Date" className="px-3 py-3 whitespace-nowrap">
                      <span className="block text-[13px] font-medium text-foreground">{dateFr(s.paidAt)}</span>
                      <span className="block text-[11px] text-[var(--texte-tertiaire)]">{heureFr(s.paidAt)}</span>
                    </td>

                    <td role="cell" data-libelle="Consultation" className="px-3 py-3">
                      <span className="block font-mono text-[12px] text-foreground">{s.id.slice(0, 8).toUpperCase()}</span>
                      {/* D-033 : une séance peut avoir été prise pour une personne à charge. */}
                      {s.subProfileId ? (
                        <span className="block text-[11px] text-[var(--texte-tertiaire)]">pour un proche</span>
                      ) : null}
                      <span className="mt-1 block">
                        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
                      </span>
                    </td>

                    <td role="cell" data-libelle="Durée" className="px-3 py-3 whitespace-nowrap text-[13px] text-[var(--texte-secondaire)]">
                      {s.durationMin} min
                    </td>

                    <td role="cell" data-libelle="Compte-rendu" className="px-3 py-3">
                      {s.reportDepositedAt ? (
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--succes-texte)]">
                          <Check size={13} strokeWidth={2} aria-hidden="true" />
                          Déposé le {dateFr(s.reportDepositedAt)}
                        </span>
                      ) : s.status === 'REFUNDED' ? (
                        <span className="text-[12px] text-[var(--texte-tertiaire)]">Sans objet</span>
                      ) : manque && restantS !== null ? (
                        <span
                          className={
                            'flex items-center gap-1.5 text-[12px] ' +
                            (restantS <= 0 ? 'text-[var(--erreur-texte)]' : 'text-[var(--alerte-texte)]')
                          }
                        >
                          <Clock size={13} strokeWidth={1.8} aria-hidden="true" />
                          {restantS <= 0 ? 'Délai dépassé — gains gelés' : `${dureeFr(restantS)} pour déposer`}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--texte-tertiaire)]">
                          {s.status === 'ENDED' ? 'À déposer' : 'Après la séance'}
                        </span>
                      )}
                    </td>

                    <td role="cell" data-libelle="Ordonnance" className="px-3 py-3">
                      {ordo.length === 0 ? (
                        <span className="text-[12px] text-[var(--texte-tertiaire)]">—</span>
                      ) : (
                        <span className="flex flex-col items-start gap-1">
                          {ordo.map((o) => (
                            <Pilule key={o.id} ton={ETATS_ORDONNANCE[o.status].ton}>
                              {ETATS_ORDONNANCE[o.status].libelle}
                            </Pilule>
                          ))}
                          <span className="flex items-center gap-1 text-[11px] text-[var(--texte-tertiaire)]">
                            <Pill size={11} strokeWidth={1.8} aria-hidden="true" />
                            {ordo.reduce((n, o) => n + o.lines.length, 0)} ligne
                            {ordo.reduce((n, o) => n + o.lines.length, 0) > 1 ? 's' : ''}
                          </span>
                        </span>
                      )}
                    </td>

                    <td role="cell" data-libelle="Honoraires" className="px-3 py-3 whitespace-nowrap">
                      {/*
                        Aucun prix n'est calculé ici. Ou le journal des gains porte un mouvement pour
                        cette commande, et on l'affiche ; ou il n'en porte pas, et c'est que la
                        capture n'a pas eu lieu — l'argent n'est pas « manquant », il n'est pas
                        encore gagné (RM-06-04).
                      */}
                      {credit === undefined ? (
                        <span className="text-[12px] text-[var(--texte-tertiaire)]">
                          {s.status === 'REFUNDED' ? '—' : 'Au dépôt du compte-rendu'}
                        </span>
                      ) : credit <= 0 ? (
                        <span className="text-[12px] text-[var(--erreur-texte)]">Remboursé au patient</span>
                      ) : (
                        <span className="text-[13px] font-medium tabular-nums text-foreground">{xaf(credit)} XAF</span>
                      )}
                    </td>

                    <td role="cell" data-libelle="" className="px-3 py-3 whitespace-nowrap text-right">
                      {/*
                        ── Le geste principal DEHORS, les secondaires dans un menu — chantier 77 ──

                        Chaque ligne n'offrait qu'un bouton, et tout le reste obligeait à ENTRER dans
                        la consultation pour en ressortir : voir une ordonnance, l'annuler, signaler
                        un patient. Trois capacités qui existent depuis longtemps, à une seconde de
                        distance et pourtant à trois clics.

                        Le geste qui presse reste **nommé et visible** — « Déposer » quand un
                        compte-rendu manque, « Ouvrir » sinon. Le cacher derrière trois points
                        reviendrait à cacher ce qui coûte des gains gelés.
                      */}
                      <span className="inline-flex items-center gap-1.5">
                        <Button asChild size="sm" variant={manque ? 'default' : 'outline'}>
                          <Link to={`/consultations/${s.id}`}>{manque ? 'Déposer' : 'Ouvrir'}</Link>
                        </Button>
                        <MenuLigne
                          seance={s}
                          ordonnances={ordo}
                          surSignaler={() => setSignale(s)}
                          surAnnuler={(o) => setAAnnuler(o)}
                        />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/*
        Les commandes de page — chantier 77.

        Elles ne s'affichent qu'à partir de deux pages : des boutons « précédent / suivant » sur une
        liste qui tient sur un écran sont du décor, et un décor qu'on clique par réflexe.

        Le compte est dit en toutes lettres (« 1–15 sur 42 ») plutôt qu'en numéros de page seuls :
        c'est ce qui permet de savoir qu'il reste quelque chose à voir.
      */}
      {/*
        ── Les deux boîtes du menu — chantier 77 ────────────────────────────────────────────────

        Montées ICI, au niveau de l'écran, et non dans la cellule qui les ouvre : une boîte rendue
        dans une ligne de tableau disparaît avec sa ligne dès qu'on tourne la page ou qu'on change
        de filtre — et l'annulation partirait à moitié.
      */}
      {aAnnuler ? (
        <BoiteAnnulation
          ordonnance={aAnnuler}
          surFermer={() => setAAnnuler(null)}
          surFait={() => {
            // Le registre relit les ordonnances : la pastille de la ligne doit suivre l'annulation.
            void qc.invalidateQueries({ queryKey: ['prescriptions', 'prescribed'] })
          }}
        />
      ) : null}

      {/*
        Le signalement vise le PATIENT de la séance, pas la séance : c'est la cible que
        l'administration sait instruire. L'identité du signaleur n'est jamais transmise (RM-04-04) —
        la boîte le dit elle-même.
      */}
      <DialogueSignalement
        ouvert={signale !== null}
        surFermer={() => setSignale(null)}
        /* `PROFILE` et non « PATIENT » : la liste des cibles est FERMÉE côté serveur — un profil
           ou un message, rien d'autre. C'est le profil du patient qu'on signale. */
        cible="PROFILE"
        cibleId={signale?.patientAccountId ?? ''}
        quoi="ce patient"
      />

      {pages > 1 ? (
        <nav aria-label="Pages du registre" className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="ul-aide">
            {pageSure * TAILLE_PAGE + 1}–{Math.min((pageSure + 1) * TAILLE_PAGE, visibles.length)} sur{' '}
            {visibles.length} {accord(visibles.length, 'consultation')}
          </span>
          <span className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={pageSure === 0}
            >
              Précédent
            </Button>
            <span className="t-code-sm tabular-nums text-[var(--texte-tertiaire)]">
              {pageSure + 1} / {pages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={pageSure >= pages - 1}
            >
              Suivant
            </Button>
          </span>
        </nav>
      ) : null}

      <div className="mt-3 flex flex-col gap-1 text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
        <p>
          {visibles.length === items.length
            ? `${items.length} consultation${items.length > 1 ? 's' : ''}`
            : `${visibles.length} sur ${items.length} ${accord(items.length, 'consultation')}`}
        </p>

        {/*
          Le serveur en renvoie cent au maximum, sans pagination. Tant qu'il n'y en a pas cent, la
          phrase serait du bruit ; à cent, se taire ferait croire à un registre complet.
        */}
        {items.length >= 100 ? (
          <p>Seules les cent consultations les plus récentes sont affichées.</p>
        ) : null}

        {/*
          EF-06-12 : la proposition de suivi part TOUTE SEULE au dépôt du compte-rendu, si une offre
          de suivi est active. Aucun bouton — il ferait doublon avec l'envoi du serveur.

          La phrase décrit l'état ACTUEL de vos offres, pas l'historique de chaque consultation : le
          serveur ne conserve pas trace, séance par séance, de la proposition envoyée.
        */}
        {offres.data ? (
          <p>
            {offreDeSuivi
              ? 'Vous avez une offre de suivi active : à chaque compte-rendu déposé, une proposition de suivi part automatiquement au patient.'
              : "Vous n'avez aucune offre de suivi active — aucune proposition de suivi n'est envoyée à vos patients."}
          </p>
        ) : null}
      </div>
    </div>
  )
}
