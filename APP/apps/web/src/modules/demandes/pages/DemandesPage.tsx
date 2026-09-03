/**
 * C3 — Demandes. D'après `docs/maquettes/C3 - Demandes.dc.html`, corrigée par le cahier des charges.
 *
 * L'écran où un médecin accepte ou refuse une sollicitation, **en cinq minutes** (PM-07). C'est le
 * maillon central : sans confirmation, le bouton payer n'existe pas côté patient (EF-06-02, D-007).
 *
 * ── Quatre écarts à la maquette, tous imposés par la spec ──────────────────────────────────────
 *
 * 1. **« Message du patient » retiré.** RM-06-03 : « Aucun message n'existe hors d'une session
 *    active (D-006) — pas de messagerie libre. » Un message avant confirmation viole une règle.
 * 2. **« Éléments transmis » et « Pièces jointes » retirés.** EF-06-04 : la pré-consultation est
 *    remplie APRÈS PAIEMENT. Au moment de décider, elle n'existe pas — elle arrive trois étapes
 *    plus loin : confirmer → payer → pré-consultation.
 * 3. **« Créneau proposé » retiré.** Zéro occurrence de « créneau », « rendez-vous », « agenda »
 *    dans tout M06. ULAMU ne prend pas de rendez-vous : c'est une poignée de main immédiate.
 * 4. **Le refus n'exige plus 30 caractères.** EF-06-02 dit « motif COURT (occupé, hors domaine) ».
 *
 * ── Ce que la spec accorde, et qui manquait au serveur ─────────────────────────────────────────
 *
 * EF-06-01, mot pour mot : « le professionnel est notifié [...] avec fiche anonymisée du patient
 * (prénom, âge — pas plus avant paiement) ». La vue ne portait qu'un identifiant technique. Ajouté
 * dans le même palier — le médecin ne pouvait pas même savoir s'il s'agissait d'un enfant.
 */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Handshake as HandshakeIcon,
  Inbox,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { accord } from '@/lib/accord'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, Segments, type TonPilule } from '@/components/ulamu/parts'
import { api, type Handshake, type HandshakeStatus } from '@/lib/api'
import { mmss, useDecompteurServeur } from '@/hooks/useDecompteurServeur'
import { SqueletteCartes } from '@/components/ulamu/Squelette'
import { messageErreur } from '@/lib/message-erreur'

/**
 * L'heure de réception, comme la maquette l'affiche sur chaque ligne (« 09:12 », « Hier »).
 *
 * Elle vient d'`initiatedAt`, qui existe. Je l'avais omise en reconstruisant la file — rattrapée par
 * le comparatif bloc à bloc du 27/08. Ce qui EXISTE et que la maquette montre n'a aucune raison de
 * disparaître : ce n'est pas un écart, c'est un oubli.
 */
function heureRecue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const auj = new Date()
  const memeJour = d.toDateString() === auj.toDateString()
  return memeJour
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
const xaf = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const ETATS: Record<HandshakeStatus, { libelle: string; ton: TonPilule }> = {
  INITIATED: { libelle: 'À décider', ton: 'alerte' },
  CONFIRMED: { libelle: 'En attente de paiement', ton: 'info' },
  PAID: { libelle: 'Payée', ton: 'succes' },
  REFUSED: { libelle: 'Refusée', ton: 'neutre' },
  EXPIRED: { libelle: 'Expirée', ton: 'neutre' },
  ABANDONED: { libelle: 'Abandonnée', ton: 'neutre' },
}

/** Motifs de refus proposés — ceux que la spec nomme (EF-06-02 : « occupé, hors domaine »). */
const MOTIFS_RAPIDES = [
  'Je suis occupé pour le moment',
  'Hors de mon domaine de compétence',
  'Situation à traiter en présentiel',
]

// ── L'urgence, et l'anneau qui la montre ────────────────────────────────────────

/**
 * Les deux bascules de couleur, arrêtées par le porteur le 25/08.
 *
 * La maquette virait à l'ambre « sous 2 h » et au rouge « sous 30 min » — sur une fenêtre de
 * **douze heures** qui n'existe pas. La vraie vaut cinq minutes (PM-07), et ces deux seuils y
 * seraient déjà passés avant l'affichage. Redéfinis à l'échelle réelle : ambre à deux minutes,
 * rouge à une. Des paliers lisibles par un humain pressé, pas des proportions recopiées.
 *
 * Ce sont des seuils d'AFFICHAGE, pas des règles métier — aucun PM ne les gouverne, rien ne se
 * déclenche à leur franchissement. C'est pourquoi ils peuvent vivre ici.
 */
type Onglet = 'attente' | 'confirmees' | 'closes'

const AMBRE_S = 120
const ROUGE_S = 60

type Urgence = 'calme' | 'ambre' | 'rouge' | 'ecoule'

function urgenceDe(reste: number, actif: boolean): Urgence {
  if (!actif) return 'calme'
  if (reste <= 0) return 'ecoule'
  if (reste < ROUGE_S) return 'rouge'
  if (reste < AMBRE_S) return 'ambre'
  return 'calme'
}

const COULEUR: Record<Urgence, string> = {
  calme: 'var(--ap-500)',
  ambre: 'var(--ton-ambre-icone)',
  rouge: 'var(--erreur-texte)',
  ecoule: 'var(--texte-tertiaire)',
}

const CLASSE_TEXTE: Record<Urgence, string> = {
  calme: 'text-foreground',
  ambre: 'text-[var(--ton-ambre-icone)]',
  rouge: 'text-[var(--erreur-texte)]',
  ecoule: 'text-[var(--texte-tertiaire)]',
}

/**
 * L'anneau qui décrémente — la forme de la maquette, conservée telle quelle.
 *
 * ⚠️ **La fenêtre totale n'est PAS écrite ici.** Elle se déduit de ce que le serveur envoie :
 * `windowExpiresAt` moins le début de la fenêtre courante (`initiatedAt` tant qu'on décide,
 * `confirmedAt` une fois confirmé). Si le super-admin change PM-07 dans E3, l'anneau suit sans
 * qu'une ligne de ce fichier bouge.
 */
function AnneauDecompte({ reste, total, urgence }: { reste: number; total: number; urgence: Urgence }) {
  const rayon = 26
  const perimetre = 2 * Math.PI * rayon
  const part = total > 0 ? Math.max(0, Math.min(1, reste / total)) : 0

  return (
    <span aria-hidden="true" className="relative flex size-[62px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 62 62" className="size-full -rotate-90">
        <circle cx="31" cy="31" r={rayon} fill="none" stroke="var(--bordure-legere)" strokeWidth="4" />
        <circle
          cx="31"
          cy="31"
          r={rayon}
          fill="none"
          stroke={COULEUR[urgence]}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={perimetre}
          strokeDashoffset={perimetre * (1 - part)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms' }}
        />
      </svg>
      <span className={'absolute font-mono text-[11px] font-semibold tabular-nums ' + CLASSE_TEXTE[urgence]}>
        {reste > 0 ? `${Math.ceil(reste / 60)}′` : '—'}
      </span>
    </span>
  )
}

/** Durée de la fenêtre courante, déduite du serveur — jamais un PM écrit dans la page. */
function fenetreTotaleS(h: Handshake): number {
  const fin = h.windowExpiresAt ? Date.parse(h.windowExpiresAt) : NaN
  const debut = h.status === 'CONFIRMED' && h.confirmedAt ? Date.parse(h.confirmedAt) : Date.parse(h.initiatedAt)
  if (Number.isNaN(fin) || Number.isNaN(debut) || fin <= debut) return 0
  return Math.round((fin - debut) / 1000)
}

// ── La file ────────────────────────────────────────────────────────────────

function LigneFile({ h, actif, recuA, onChoisir }: { h: Handshake; actif: boolean; recuA: number; onChoisir: () => void }) {
  const reste = useDecompteurServeur(h.windowRemainingSeconds, recuA)
  const etat = ETATS[h.status]
  const urgence = urgenceDe(reste, h.status === 'INITIATED' || h.status === 'CONFIRMED')

  return (
    <li>
      <button
        type="button"
        onClick={onChoisir}
        aria-current={actif ? 'true' : undefined}
        className={
          'flex w-full flex-col gap-1.5 rounded-md border px-3 py-2.5 text-left transition-colors ' +
          'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
          (actif ? 'border-[var(--ap-200)] bg-[var(--ap-50)]' : 'border-border bg-card hover:bg-secondary')
        }
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-muted-foreground"
          >
            {(h.patientFirstName ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {h.patientFirstName ?? 'Patient'}
            {h.patientAge !== null ? <span className="font-normal text-muted-foreground"> · {h.patientAge} ans</span> : null}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-[var(--texte-tertiaire)]">{heureRecue(h.initiatedAt)}</span>
          {h.status === 'INITIATED' || h.status === 'CONFIRMED' ? (
            <span
              className={'shrink-0 font-mono text-[12px] font-semibold tabular-nums ' + CLASSE_TEXTE[urgence]}
            >
              {mmss(reste)}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-2">
          <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
          <span className="min-w-0 truncate text-[11px] text-[var(--texte-tertiaire)]">
            {h.offerLabel ?? 'Consultation'}
            {h.offerPriceXaf !== null ? ` · ${xaf(h.offerPriceXaf)} F` : ''}
          </span>
        </span>
      </button>
    </li>
  )
}

// ── Le détail et la décision ───────────────────────────────────────────────

function Detail({ h, recuA, onFait }: { h: Handshake; recuA: number; onFait: () => void }) {
  const [refusOuvert, setRefusOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const reste = useDecompteurServeur(h.windowRemainingSeconds, recuA)
  const urgence = urgenceDe(reste, h.status === 'INITIATED' || h.status === 'CONFIRMED')
  const decidable = h.status === 'INITIATED' && reste > 0

  const confirmer = useMutation({
    mutationFn: () => api.confirmHandshake(h.id),
    onSuccess: onFait,
    onError: (e) => setErreur(messageErreur(e)),
  })
  const refuser = useMutation({
    mutationFn: () => api.refuseHandshake(h.id, motif.trim()),
    onSuccess: onFait,
    onError: (e) => setErreur(messageErreur(e)),
  })

  return (
    <div className="flex flex-col gap-4">
      <Carte icone={UserRound} titre="Qui demande" sousTitre="Prénom et âge — le reste ne s'ouvre qu'après paiement">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ap-600)]"
          >
            {(h.patientFirstName ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-display)] text-[17px] font-bold leading-tight text-foreground">
              {h.patientFirstName ?? 'Patient'}
            </span>
            <span className="mt-0.5 block text-[12px] text-[var(--texte-tertiaire)]">
              {h.patientAge !== null ? `${h.patientAge} ${accord(h.patientAge, 'an')}` : 'Âge non communiqué'}
            </span>
          </span>
        </div>
        {/*
          Le dire explicitement plutôt que de laisser croire à un manque : c'est une règle, pas une
          lacune. Un médecin qui cherche « où sont les symptômes ? » perd des secondes qu'il n'a pas.
        */}
        <Avis ton="info">
          Vous n'en voyez pas plus tant que la consultation n'est pas payée. Les symptômes, la durée
          des troubles et les photos vous seront transmis juste après, avant que le décompte ne démarre.
        </Avis>
      </Carte>

      <Carte
        icone={Clock}
        ton={h.status === 'INITIATED' && reste === 0 ? 'danger' : 'accent'}
        titre="Temps restant"
        sousTitre="Compté par le serveur — l'horloge de ce poste n'est qu'indicative (RM-06-02)"
      >
        {h.status === 'INITIATED' || h.status === 'CONFIRMED' ? (
          <div className="flex items-center gap-4">
            {/* L'anneau à gauche, les chiffres à droite — la disposition de la maquette, mesurée. */}
            <AnneauDecompte reste={reste} total={fenetreTotaleS(h)} urgence={urgence} />
            <div className="min-w-0 flex-1">
              <p
                className={
                  'font-[family-name:var(--font-display)] text-[34px] font-bold leading-none tabular-nums ' +
                  CLASSE_TEXTE[urgence]
                }
              >
                {mmss(reste)}
              </p>
              <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
                {h.status === 'INITIATED'
                  ? 'Passé ce délai, la demande expire d’elle-même. Rien n’est débité au patient, et vous êtes libéré — mais votre taux de confirmation, lui, baisse. Une réponse même négative vaut mieux qu’une expiration.'
                  : 'Le patient dispose de ce temps pour payer. Sans paiement, la demande expire et vous êtes libéré.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Cette demande est close.</p>
        )}
      </Carte>

      <Carte icone={HandshakeIcon} titre="Ce qui est demandé" sousTitre="L'offre choisie par le patient dans votre vitrine">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">Offre</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-foreground">{h.offerLabel ?? 'Consultation'}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">Durée</dt>
            <dd className="mt-0.5 text-[14px] font-medium text-foreground">
              {h.offerDurationMin !== null ? `${h.offerDurationMin} ${accord(h.offerDurationMin, 'minute')}` : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">Montant</dt>
            <dd className="mt-0.5 font-[family-name:var(--font-display)] text-[17px] font-bold text-foreground">
              {h.offerPriceXaf !== null ? `${xaf(h.offerPriceXaf)} F` : '—'}
            </dd>
          </div>
        </dl>
      </Carte>

      {/*
        « Ce qui se passe ensuite » — arbitrage du porteur, 27/08.

        Une fois retirés le motif inventé, le message du patient, les antécédents et les pièces
        jointes, il ne restait dans ce panneau de 958 px qu'un prénom, un âge, une offre et deux
        boutons. La question a été posée plutôt que tranchée seul : le porteur a choisi d'y mettre
        la SUITE du parcours, qui est réelle et qu'un médecin ignore au moment de décider.

        ⚠️ **Aucun délai n'est écrit dans ce texte.** Après confirmation, le serveur rouvre une
        fenêtre de même durée pour le paiement (PM-07 des deux côtés) : on dit « le même compte à
        rebours », et le chiffre reste au serveur. Le démarrage automatique (PM-28) se dit de même
        sans nombre.
      */}
      {h.status === 'INITIATED' || h.status === 'CONFIRMED' ? (
        <Carte icone={HandshakeIcon} titre="Ce qui se passe ensuite" sousTitre="Le parcours complet, pour décider en connaissance de cause">
          <ol className="grid gap-2.5">
            <li className="flex gap-2.5">
              <span
                aria-hidden="true"
                className={
                  'mt-px flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ' +
                  (h.status === 'INITIATED' ? 'bg-[var(--ap-500)] text-white' : 'bg-secondary text-muted-foreground')
                }
              >
                1
              </span>
              <span className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                <strong className="font-semibold text-foreground">Vous confirmez.</strong> Rien n’est encore
                débité : votre accord ouvre simplement le paiement (D-007, aucun paiement sans confirmation).
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                aria-hidden="true"
                className={
                  'mt-px flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ' +
                  (h.status === 'CONFIRMED' ? 'bg-[var(--ap-500)] text-white' : 'bg-secondary text-muted-foreground')
                }
              >
                2
              </span>
              <span className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                <strong className="font-semibold text-foreground">Le patient paie</strong>, dans le même compte
                à rebours que celui-ci. S’il ne paie pas, la demande expire et vous êtes libéré.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-bold text-muted-foreground"
              >
                3
              </span>
              <span className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                <strong className="font-semibold text-foreground">Il remplit sa pré-consultation</strong> —
                symptômes, durée des troubles, photos. C’est là seulement que vous les recevez (EF-06-04).
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[10px] font-bold text-muted-foreground"
              >
                4
              </span>
              <span className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                <strong className="font-semibold text-foreground">La consultation démarre</strong>, et son
                décompteur avec. S’il tarde à transmettre, elle démarre d’elle-même — le temps payé
                commence à courir.
              </span>
            </li>
          </ol>
        </Carte>
      ) : null}

      {h.status === 'REFUSED' && h.refusalReason ? (
        <Carte icone={Ban} titre="Motif que vous avez transmis" sousTitre="Le patient l'a reçu avec des suggestions de confrères">
          <p className="text-[13px] leading-[1.6] text-foreground">{h.refusalReason}</p>
        </Carte>
      ) : null}

      {decidable ? (
        <Carte icone={CheckCircle2} titre="Votre décision" sousTitre="Sans confirmation, le patient ne peut pas payer (D-007)">
          {!refusOuvert ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="lg" onClick={() => confirmer.mutate()} disabled={confirmer.isPending}>
                {confirmer.isPending ? <Spinner className="size-4" /> : <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" />}
                Je suis prêt à recevoir
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={() => setRefusOuvert(true)}>
                Refuser
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <Label htmlFor="motif-refus" className="mb-1.5 block text-[13px]">
                  Motif transmis au patient
                </Label>
                {/* Choix rapides : un refus se décide en secondes, et la spec veut un motif COURT. */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {MOTIFS_RAPIDES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMotif(m)}
                      className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="motif-refus"
                  rows={2}
                  maxLength={200}
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Occupé, hors domaine…"
                />
                <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                  {motif.length}/200 · le patient recevra ce motif avec des suggestions de confrères.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => refuser.mutate()}
                  disabled={refuser.isPending || motif.trim().length === 0}
                >
                  {refuser.isPending ? 'Envoi…' : 'Envoyer le refus'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setRefusOuvert(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
        </Carte>
      ) : null}

      {h.status === 'INITIATED' && reste === 0 ? (
        <Avis ton="erreur">
          Le délai est écoulé. Cette demande va passer en « expirée » — le patient n'a rien payé, et
          vous êtes libéré.
        </Avis>
      ) : null}
    </div>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

export function DemandesPage() {
  const qc = useQueryClient()
  const [choisi, setChoisi] = useState<string | null>(null)
  // L'onglet ouvert. « En attente » d'abord : c'est la seule file où le temps court.
  const [onglet, setOnglet] = useState<Onglet>('attente')
  const recuA = useRef(Date.now())

  /**
   * Relecture toutes les 10 s.
   *
   * La spec promet une notification en moins de 5 s (ENF-09), et il n'y a pas de canal poussé côté
   * web : le mobile lui-même interroge en boucle. Dix secondes est le compromis — assez court pour
   * qu'une demande n'attende pas dans le vide sur une fenêtre de cinq minutes, assez long pour ne
   * pas réveiller sans cesse une instance qui s'endort.
   */
  const demandes = useQuery({
    queryKey: ['handshakes', 'mine'],
    queryFn: async () => {
      const r = await api.myHandshakes()
      recuA.current = Date.now() // ancre du compte à rebours : l'instant où le serveur a répondu
      return r
    },
    refetchInterval: 10_000,
    retry: false,
  })

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['handshakes', 'mine'] })

  if (demandes.isPending) {
    return (
      <SqueletteCartes nombre={3} hauteur={128} libelle="Lecture de vos demandes…" />
    )
  }

  if (demandes.isError) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Vos demandes n'ont pas pu être chargées" sousTitre="Aucune demande n'est perdue">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Les compteurs continuent de tourner côté serveur. Vérifiez votre connexion, puis réessayez.
          </p>
          <div>
            <Button type="button" onClick={() => demandes.refetch()}>
              Réessayer
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const toutes = demandes.data.items
  // Les plus urgentes d'abord : sur une fenêtre de cinq minutes, l'ordre d'arrivée compte moins que
  // le temps qu'il reste.
  const aDecider = toutes
    .filter((h) => h.status === 'INITIATED')
    .sort((a, b) => a.windowRemainingSeconds - b.windowRemainingSeconds)
  const enCours = toutes.filter((h) => h.status === 'CONFIRMED' || h.status === 'PAID')
  const closes = toutes.filter((h) => ['REFUSED', 'EXPIRED', 'ABANDONED'].includes(h.status)).slice(0, 8)

  // Le repli parcourt les TROIS files, closes comprises : un professionnel qui n'a que des demandes
  // refusées voyait sinon « sélectionnez une demande » à droite, avec une liste pleine à gauche.
  const filtrees = onglet === 'attente' ? aDecider : onglet === 'confirmees' ? enCours : closes
  // La sélection suit l'onglet : une demande choisie dans une autre file resterait au détail alors
  // qu'elle a disparu de la liste — on ne comprendrait plus ce qu'on regarde.
  const courante = filtrees.find((h) => h.id === choisi) ?? filtrees[0] ?? null

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <HandshakeIcon size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">Demandes</h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">
            {aDecider.length > 0
              ? `${aDecider.length} demande${aDecider.length > 1 ? 's' : ''} attend${aDecider.length > 1 ? 'ent' : ''} votre réponse`
              : 'Aucune demande n’attend votre réponse'}
          </p>
        </span>
        {aDecider.length > 0 ? <Pilule ton="alerte">{aDecider.length} à décider</Pilule> : null}
      </div>

      {toutes.length === 0 ? (
        <Carte icone={Inbox} titre="Aucune demande pour l’instant" sousTitre="Elles arriveront ici dès qu’un patient vous sollicite">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Un patient ne peut vous solliciter que si vous apparaissez dans l’annuaire : dossier vérifié,
            contrat signé, et au moins une offre active.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/vitrine">Vérifier ma vitrine</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/verification">Où en est mon dossier ?</Link>
            </Button>
          </div>
        </Carte>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          {/*
            Trois ONGLETS, une liste à la fois — la forme de la maquette, restaurée le 27/08.

            L'écran empilait auparavant trois cartes visibles ensemble. C'était lisible, mais ce
            n'était pas le dessin : la maquette pose « En attente · Confirmées · Closes » avec leurs
            compteurs, et n'affiche qu'une file. Sur une fenêtre de cinq minutes, ne montrer que ce
            qui réclame une décision est d'ailleurs plus juste que de tout montrer.
          */}
          <section aria-label="File des demandes" className="flex w-full shrink-0 flex-col gap-3 lg:w-[340px]">
            <Segments
              label="Filtrer les demandes"
              valeur={onglet}
              onChange={setOnglet}
              options={[
                { cle: 'attente', label: `En attente · ${aDecider.length}` },
                { cle: 'confirmees', label: `Confirmées · ${enCours.length}` },
                { cle: 'closes', label: `Closes · ${closes.length}` },
              ]}
            />

            {filtrees.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {filtrees.map((h) => (
                  <LigneFile key={h.id} h={h} actif={courante?.id === h.id} recuA={recuA.current} onChoisir={() => setChoisi(h.id)} />
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-[var(--texte-tertiaire)]">
                {onglet === 'attente'
                  ? 'Aucune demande n’attend votre réponse.'
                  : onglet === 'confirmees'
                    ? 'Aucune demande confirmée en attente de paiement.'
                    : 'Aucune demande close.'}
              </p>
            )}
          </section>

          <section aria-label="Détail de la demande" className="min-w-0 flex-1">
            {courante ? (
              <Detail h={courante} recuA={recuA.current} onFait={rafraichir} />
            ) : (
              <Carte icone={Inbox} titre="Sélectionnez une demande" sousTitre="Le détail, le compte à rebours et les actions s’affichent ici">
                <p className="text-[12px] text-[var(--texte-secondaire)]">Choisissez une demande dans la file à gauche.</p>
              </Carte>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
