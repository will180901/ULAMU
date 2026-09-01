/**
 * C5 — Consultation. D'après `docs/maquettes/C5 - Consultation.dc.html`, l'écran de session du
 * mobile (`apps/mobile/src/screens/SessionScreen.tsx`) et le cahier des charges M06.
 *
 * La séance chronométrée elle-même : messagerie texte et photos, décompteur, contexte patient,
 * Carnet en lecture, compte-rendu. C'est le seul endroit où un message existe (RM-06-03 : « aucun
 * message hors d'une session active — pas de messagerie libre »).
 *
 * ── La forme, telle que la maquette la fixe ────────────────────────────────────────────────────
 *
 * Deux colonnes : le fil à gauche, un rail à droite. Le rail de la maquette porte trois blocs —
 * « Contexte patient », « Livrables », « Terminer la consultation ». On garde ce rail et cet ordre ;
 * ce qui change, ce sont les FAITS que chaque bloc raconte (règle d'arbitrage du 25/08 : la maquette
 * décide de la forme, le cahier décide des faits).
 *
 * ── Les écarts à la maquette, et ce qui les motive ─────────────────────────────────────────────
 *
 * 1. **« 48 heures pour signer le compte-rendu » → un décompte réel.** PM-30 vaut 86 400 s, et
 *    au-delà le dépôt n'est pas toléré : il est REFUSÉ, gains gelés (CU-06-03). Un médecin qui croit
 *    avoir 48 h perd ses honoraires à la 24ᵉ heure. L'écran ne peut pas calculer cette échéance —
 *    PM-30 est réservé aux administrateurs — alors le serveur la lui sert désormais (`reportDueAt`,
 *    ajouté le 28/08). **Plus aucun délai n'est écrit dans ce fichier.** Le « 24 heures » en dur qui
 *    corrigeait le 48 h était la même dette, à moitié payée : il aurait menti dès le premier
 *    changement de PM-30 dans E3.
 * 2. **« Terminer la consultation » → « Prolonger ».** Le professionnel ne PEUT pas clore par
 *    anticipation : `cancel` est réservé au patient (EF-06-10), et la séance se termine quand le
 *    décompteur est épuisé (CU-06-03). Le patient a payé N minutes — les lui couper serait lui
 *    reprendre ce qu'il a acheté. Ce que le professionnel peut, c'est PROLONGER, gratuitement
 *    (EF-06-07), dans la limite de PM-29. Le bloc garde donc sa place au bas du rail, et change de
 *    verbe.
 * 3. **« Retenir pour le compte-rendu » retiré** (famille 3, groupe F). Aucun mécanisme d'épinglage
 *    n'existe en base, et le construire toucherait la table du contenu médical — la plus sensible du
 *    modèle (RM-06-06). Remplacé par mieux : le compte-rendu se rédige PENDANT la séance, à côté du
 *    fil. `listMessages` n'impose aucune contrainte de temps : le fil reste entièrement relisible
 *    pendant toute la rédaction. Le médecin perd du défilement, pas de l'information.
 * 4. **« Livrables » : moitié tenue, moitié annoncée.** Le compte-rendu est là. L'ordonnance ouvre
 *    un écran neuf, **C7**, en panneau depuis ici — chantier 5. La note « M09 hors périmètre » qui
 *    justifiait le retrait complet du bloc était devenue fausse : elle est corrigée.
 * 5. **Le Carnet du patient, que la maquette n'a pas prévu** (EF-06-06, RM-06-05). Le serveur expose
 *    `/record/summary` et `/record`, trace chaque consultation en C5 et referme l'accès à la clôture.
 *    Un médecin qui décide sans dossier médical décide à l'aveugle : le bloc est ajouté au rail.
 * 6. **L'avertissement de remboursement passe AVANT la perte** (D-008, invariant n°9). Il ne servait
 *    à rien au passé — « cette consultation a été remboursée » — alors qu'il vaut tout au présent :
 *    tant que le professionnel n'a pas écrit un seul message, la séance sera intégralement
 *    remboursée à sa fin et il ne percevra rien.
 *
 * ── Le fil, mis au niveau du mobile ────────────────────────────────────────────────────────────
 *
 * Le serveur sert depuis toujours les réponses citées, les réactions, l'édition et la double
 * suppression (`MessageView`) ; le mobile s'en sert entièrement, le web n'en affichait rien. Cet
 * écran rattrape : répondre, réagir, modifier, supprimer pour moi ou pour tout le monde, séparateurs
 * de jour, regroupement des messages consécutifs, saut vers le message cité.
 *
 * Au passage, un bug qui rendait le seul geste existant inopérant : `deleteSessionMessage` partait
 * SANS corps alors que `forEveryone` est obligatoire côté serveur (`@IsBoolean()`). Le bouton
 * « supprimer » répondait 400 depuis le premier jour.
 *
 * ── Ce que le web ne fait pas, et que le mobile fait ───────────────────────────────────────────
 *
 * Les notes vocales. Le mobile les enregistre avec une bibliothèque native ; sur le web il faudrait
 * `MediaRecorder`, un encodage et une gestion de permission micro — un chantier à part. Texte et
 * photos suffisent à la démonstration, et l'API accepte déjà les deux.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCheck,
  Clock,
  CornerUpLeft,
  Ellipsis,
  Eye,
  FileText,
  HeartPulse,
  Hourglass,
  ImagePlus,
  Lock,
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  SmilePlus,
  Stethoscope,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Avis, Carte, Pilule, type TonPilule } from '@/components/ulamu/parts'
import { Liste } from '@/components/ulamu/Liste'
import {
  api,
  ApiError,
  lireMediaSession,
  type CareSession,
  type CareSessionStatus,
  type RecordEntry,
  type RecordEntryType,
  type SessionMessage,
} from '@/lib/api'
import { PanneauOrdonnance } from '@/modules/ordonnance/PanneauOrdonnance'
import { useSessionStore } from '@/state/session.store'
import { mmss, useDecompteurServeur } from '@/hooks/useDecompteurServeur'

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

const heureFr = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const ETATS: Record<CareSessionStatus, { libelle: string; ton: TonPilule }> = {
  PREPARING: { libelle: 'En préparation', ton: 'info' },
  ACTIVE: { libelle: 'En cours', ton: 'succes' },
  ENDED: { libelle: 'Terminée', ton: 'neutre' },
  REFUNDED: { libelle: 'Remboursée', ton: 'erreur' },
}

/**
 * Les six réactions rapides — les MÊMES que le mobile (`components/ChatActionSheet.tsx`). Deux
 * palettes différentes entre les deux bouts d'une même conversation donneraient des réactions que
 * l'autre ne peut pas rendre : ici la parité n'est pas du confort, c'est une contrainte.
 */
const REACTIONS_RAPIDES = ['👍', '❤️', '😂', '😮', '😢', '🙏']

/**
 * Fenêtre d'édition et de suppression « pour tout le monde ». C'est un MIROIR de
 * `EDIT_DELETE_WINDOW_MS` (`m06.session.service.ts`), pas une règle : le serveur tranche, et il
 * refuse en 409. L'écran s'en sert seulement pour ne pas proposer un geste qui échouera — proposer
 * « Modifier » sur un message de deux heures serait promettre ce qu'on ne tient pas.
 */
const FENETRE_EDITION_MS = 15 * 60 * 1000

/** Deux messages du même auteur à moins de cinq minutes se lisent comme un seul bloc. */
const REGROUPEMENT_MS = 5 * 60 * 1000

// ── Repères de temps ───────────────────────────────────────────────────────

const MEME_JOUR = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString()

/** « Aujourd'hui », « Hier », sinon « mardi 12 août ». Le séparateur de jour du fil. */
function jourFr(iso: string): string {
  const d = new Date(iso)
  const aujourdhui = new Date()
  const hier = new Date(aujourdhui.getTime() - 86_400_000)
  if (d.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === hier.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** « 22 h 41 min », « 41 min », « 3 min » — la durée restante avant une échéance, en clair. */
function dureeFr(secondes: number): string {
  const s = Math.max(0, secondes)
  const h = Math.floor(s / 3600)
  const min = Math.floor((s % 3600) / 60)
  if (h >= 1) return `${h} h ${String(min).padStart(2, '0')} min`
  if (min >= 1) return `${min} min`
  return 'moins d’une minute'
}

// ── Une bulle du fil ───────────────────────────────────────────────────────

function Media({ fileKey }: { fileKey: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [echec, setEchec] = useState(false)

  useEffect(() => {
    let vivant = true
    let cree: string | null = null
    lireMediaSession(fileKey)
      .then((f) => {
        if (!vivant) {
          URL.revokeObjectURL(f.url)
          return
        }
        cree = f.url
        setUrl(f.url)
      })
      .catch(() => vivant && setEchec(true))
    // Libéré au démontage : une photo de consultation n'a pas à rester en mémoire de l'onglet.
    return () => {
      vivant = false
      if (cree) URL.revokeObjectURL(cree)
    }
  }, [fileKey])

  if (echec) return <p className="text-[11px] text-[var(--erreur-texte)]">Image indisponible.</p>
  if (!url) return <span className="block h-32 w-48 animate-pulse rounded-md bg-secondary" />
  return <img src={url} alt="Photo transmise en consultation" className="max-h-64 rounded-md" />
}

/** Les réactions agrégées, sous la bulle. Un clic sur la mienne la retire — le serveur bascule. */
function Reactions({
  reactions,
  onBasculer,
}: {
  reactions: SessionMessage['reactions']
  onBasculer: (emoji: string) => void
}) {
  if (reactions.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1 px-1">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onBasculer(r.emoji)}
          aria-label={r.mine ? `Retirer la réaction ${r.emoji}` : `Réagir avec ${r.emoji}`}
          aria-pressed={r.mine}
          className={
            'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none transition-colors ' +
            'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
            (r.mine ? 'border-[var(--ap-300)] bg-[var(--ap-50)]' : 'border-border bg-card hover:bg-secondary')
          }
        >
          <span aria-hidden="true">{r.emoji}</span>
          {r.count > 1 ? <span className="tabular-nums text-[var(--texte-tertiaire)]">{r.count}</span> : null}
        </button>
      ))}
    </span>
  )
}

/**
 * La barre de gestes, au survol de la bulle. Elle n'affiche QUE ce qui est possible : pas de
 * « Modifier » sur une photo, pas de « Supprimer pour tout le monde » passé un quart d'heure.
 */
function GestesBulle({
  aMoi,
  editable,
  retirableParTous,
  onRepondre,
  onReagir,
  onModifier,
  onSupprimer,
}: {
  aMoi: boolean
  editable: boolean
  retirableParTous: boolean
  onRepondre: () => void
  onReagir: (emoji: string) => void
  onModifier: () => void
  onSupprimer: (pourTous: boolean) => void
}) {
  return (
    <span
      /*
        Placement : À CÔTÉ de la bulle sur grand écran, DANS le coin de la ligne en dessous.

        `left-full` posait la barre juste après la bulle — parfait tant qu'il reste de la place à
        droite. Sur un téléphone la bulle occupe presque toute la largeur : la barre sortait de
        73 px, et le fil se laissait tirer latéralement de 34 px. Mesuré à 375 px le 01/09/2026
        (chantier 21). En dessous de 1024 px elle se cale donc à droite de la LIGNE, à l'intérieur.
      */
      className={
        'ul-au-survol absolute top-0 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 ' +
        'shadow-[0_1px_3px_rgba(15,23,42,.10)] right-0 ' +
        (aMoi ? 'lg:right-full lg:mr-1' : 'lg:right-auto lg:left-full lg:ml-1')
      }
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Réagir à ce message"
          className="rounded-md p-1 text-[var(--texte-tertiaire)] hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <SmilePlus size={13} strokeWidth={1.8} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={aMoi ? 'end' : 'start'} sideOffset={4} className="flex w-auto gap-0.5 p-1">
          {REACTIONS_RAPIDES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onReagir(e)}
              aria-label={`Réagir avec ${e}`}
              className="rounded-md px-1.5 py-1 text-[16px] leading-none hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <span aria-hidden="true">{e}</span>
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={onRepondre}
        aria-label="Répondre à ce message"
        className="rounded-md p-1 text-[var(--texte-tertiaire)] hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <CornerUpLeft size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {editable ? (
        <button
          type="button"
          onClick={onModifier}
          aria-label="Modifier ce message"
          className="rounded-md p-1 text-[var(--texte-tertiaire)] hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <Pencil size={13} strokeWidth={1.8} aria-hidden="true" />
        </button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Autres actions sur ce message"
          className="rounded-md p-1 text-[var(--texte-tertiaire)] hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <Ellipsis size={13} strokeWidth={1.8} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={aMoi ? 'end' : 'start'} sideOffset={4} className="w-56">
          <DropdownMenuItem onSelect={() => onSupprimer(false)}>
            <Eye size={14} strokeWidth={1.6} aria-hidden="true" />
            Retirer de mon fil
          </DropdownMenuItem>
          {retirableParTous ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => onSupprimer(true)}>
                <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
                Supprimer pour tout le monde
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

/** L'accusé de réception, sur MES messages uniquement — `status` est nul sur ceux de l'autre. */
function Accuse({ status }: { status: NonNullable<SessionMessage['status']> }) {
  if (status === 'sent') return <Check size={12} strokeWidth={2} aria-label="Envoyé" className="text-[var(--texte-tertiaire)]" />
  if (status === 'delivered') return <CheckCheck size={12} strokeWidth={2} aria-label="Reçu" className="text-[var(--texte-tertiaire)]" />
  return <CheckCheck size={12} strokeWidth={2} aria-label="Lu" className="text-[var(--ap-600)]" />
}

function Bulle({
  m,
  aMoi,
  groupee,
  surlignee,
  actif,
  nomAuteur,
  onRepondre,
  onModifier,
  onSupprimer,
  onReagir,
  onAllerAuCite,
}: {
  m: SessionMessage
  aMoi: boolean
  groupee: boolean
  surlignee: boolean
  /** Session close = fil en lecture seule : plus aucun geste, le serveur les refuserait de toute façon. */
  actif: boolean
  nomAuteur: (senderId: string) => string
  onRepondre: () => void
  onModifier: () => void
  onSupprimer: (pourTous: boolean) => void
  onReagir: (emoji: string) => void
  onAllerAuCite: (id: string) => void
}) {
  const cles = m.mediaKeys.length > 0 ? m.mediaKeys : m.fileKey ? [m.fileKey] : []
  const dansLaFenetre = Date.now() - new Date(m.createdAt).getTime() <= FENETRE_EDITION_MS

  if (m.deletedAt) {
    return (
      <li id={`msg-${m.id}`} className={'flex ' + (aMoi ? 'justify-end' : 'justify-start')}>
        <span className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] italic text-[var(--texte-tertiaire)]">
          Message supprimé
        </span>
      </li>
    )
  }

  return (
    <li
      id={`msg-${m.id}`}
      className={
        'group relative flex flex-col gap-1 scroll-mt-4 ' +
        (aMoi ? 'items-end' : 'items-start') +
        (groupee ? ' -mt-1.5' : '') +
        (surlignee ? ' rounded-lg ring-3 ring-[var(--ap-300)]' : '')
      }
    >
      <div className="relative max-w-[min(34rem,85%)]">
        {actif ? (
          <GestesBulle
            aMoi={aMoi}
            editable={aMoi && m.kind === 'TEXT' && dansLaFenetre}
            retirableParTous={aMoi && dansLaFenetre}
            onRepondre={onRepondre}
            onReagir={onReagir}
            onModifier={onModifier}
            onSupprimer={onSupprimer}
          />
        ) : null}

        <div
          className={
            'rounded-lg px-3 py-2 ' +
            (aMoi ? 'bg-[var(--ap-50)] text-foreground' : 'border border-border bg-card text-foreground')
          }
        >
          {/*
            Le message cité. Cliquable : dans un fil de vingt messages, une citation sans retour
            oblige à chercher à la main ce que l'autre a déjà retrouvé pour nous.
          */}
          {m.replyTo ? (
            <button
              type="button"
              onClick={() => onAllerAuCite(m.replyTo!.id)}
              className="mb-1.5 block w-full rounded-md border-l-2 border-[var(--ap-400)] bg-black/[.03] px-2 py-1 text-left hover:bg-black/[.06] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 dark:bg-white/[.04] dark:hover:bg-white/[.08]"
            >
              <span className="block text-[10px] font-semibold text-[var(--ap-600)]">{nomAuteur(m.replyTo.senderId)}</span>
              <span className="block truncate text-[11px] text-[var(--texte-secondaire)]">{m.replyTo.preview}</span>
            </button>
          ) : null}

          {cles.map((k) => (
            <Media key={k} fileKey={k} />
          ))}
          {m.body ? <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{m.body}</p> : null}
        </div>
      </div>

      <Reactions reactions={m.reactions} onBasculer={onReagir} />

      <span className="flex items-center gap-1.5 px-1 text-[10px] text-[var(--texte-tertiaire)]">
        {heureFr(m.createdAt)}
        {m.editedAt ? <span>· modifié</span> : null}
        {/* Accusés : `status` n'est renseigné que sur MES messages (contrat M06). */}
        {aMoi && m.status ? <Accuse status={m.status} /> : null}
      </span>
    </li>
  )
}

// ── Le Carnet du patient, lu pendant la séance ─────────────────────────────

const LIBELLE_TYPE: Record<RecordEntryType, string> = {
  CONSULTATION_REPORT: 'Consultation',
  PRESCRIPTION: 'Ordonnance',
  LAB_RESULTS: "Résultats d'examens",
  VITALS: 'Constantes',
  ALLERGY: 'Allergie',
  MEDICAL_HISTORY: 'Antécédent',
  VACCINATION: 'Vaccination',
  PERSONAL_NOTE: 'Note personnelle',
}

/**
 * RM-07-03 : « une déclaration du patient n'est JAMAIS présentée comme un diagnostic. » La
 * provenance n'est donc pas un détail d'affichage — c'est la règle qui empêche de confondre
 * « le patient dit qu'il est allergique » et « un soignant a constaté l'allergie ».
 */
const LIBELLE_PROVENANCE: Record<string, string> = {
  DECLARED_BY_PATIENT: 'déclaré par le patient',
  RECORDED_BY_PROFESSIONAL: 'constaté par un soignant',
  SYSTEM: 'système',
}

/**
 * Le contenu d'une entrée. Le payload est un JSON libre : on lit les clés dans le même ordre que le
 * mobile (`CarnetScreen.entrySubtitle`) pour que les deux applications racontent la même chose du
 * même Carnet.
 */
function texteEntree(e: RecordEntry): string {
  const p = e.payload ?? {}
  const s = (k: string): string | null => {
    const v = p[k]
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }
  if (p.kind === 'blood_type') return `Groupe sanguin : ${s('value') ?? '—'}`
  return s('label') ?? s('value') ?? s('diagnosis') ?? s('name') ?? s('summary') ?? LIBELLE_TYPE[e.type]
}

/**
 * Le Carnet, EN LECTURE SEULE, pendant la session active (EF-06-06, RM-06-05).
 *
 * Trois mentions sont imposées par l'alignement du 25/08, et aucune n'est décorative :
 * • « lecture seule » — toute écriture passe par le compte-rendu ou l'ordonnance, jamais d'ici ;
 * • « votre consultation est enregistrée » — chaque lecture émet `m06.record.accessed` au journal
 *   d'audit (sans contenu médical, RM-04-03). Le médecin doit le savoir AVANT d'ouvrir, pas après ;
 * • « l'accès s'est refermé » — le serveur ferme l'accès dès la clôture. Le compte-rendu rédigé à la
 *   23ᵉ heure n'aura plus le Carnet sous les yeux : autant que ce soit dit tant qu'il est encore là.
 */
function CarnetPatient({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [type, setType] = useState<RecordEntryType | 'TOUT'>('TOUT')

  const synthese = useQuery({
    queryKey: ['session', sessionId, 'carnet', 'synthese'],
    queryFn: () => api.sessionRecordSummary(sessionId),
    enabled: active,
    retry: false,
    // Le Carnet ne bouge pas pendant une consultation de vingt minutes : inutile de le relire
    // toutes les trois secondes, chaque appel écrit une ligne au journal d'audit.
    staleTime: 5 * 60_000,
  })

  const chronologie = useQuery({
    queryKey: ['session', sessionId, 'carnet', type],
    queryFn: () => api.sessionRecord(sessionId, type === 'TOUT' ? {} : { type }),
    enabled: active,
    retry: false,
    staleTime: 5 * 60_000,
  })

  if (!active) {
    return (
      <Carte icone={BookOpen} titre="Carnet du patient" sousTitre="L'accès s'est refermé avec la consultation">
        <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
          Le Carnet n'est lisible que pendant la séance (EF-06-06). Ce que vous en avez retenu doit
          figurer dans votre compte-rendu — il ne se rouvrira pas pour le rédiger.
        </p>
      </Carte>
    )
  }

  const echec = synthese.error ?? chronologie.error
  const entrees = chronologie.data?.items ?? []

  return (
    <Carte icone={BookOpen} titre="Carnet du patient" sousTitre="Lecture seule · votre consultation est enregistrée">
      {echec ? <Avis ton="erreur">{messageDe(echec)}</Avis> : null}

      {synthese.isPending ? (
        <p className="flex items-center gap-2 text-[12px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3.5" /> Ouverture du Carnet…
        </p>
      ) : synthese.data ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            Groupe sanguin
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground">{synthese.data.bloodType ?? 'Non renseigné'}</p>

          {/*
            Les allergies d'abord, et en rouge : c'est la seule information de cet écran qui peut
            tuer. Le garde-fou M09 s'en sert déjà pour bloquer une prescription (CU-07-02) — le
            médecin doit la voir avant d'en arriver là.
          */}
          <p className="mt-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            Allergies actives
          </p>
          {synthese.data.activeAllergies.length === 0 ? (
            <p className="mt-0.5 text-[12px] text-[var(--texte-secondaire)]">Aucune déclarée.</p>
          ) : (
            <span className="mt-1 flex flex-wrap gap-1">
              {synthese.data.activeAllergies.map((a) => (
                <span
                  key={a}
                  className="flex items-center gap-1 rounded-full border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] px-2 py-0.5 text-[11px] font-medium text-[var(--erreur-texte)]"
                >
                  <ShieldAlert size={11} strokeWidth={1.9} aria-hidden="true" />
                  {a}
                </span>
              ))}
            </span>
          )}

          <p className="mt-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            Maladies chroniques
          </p>
          {synthese.data.chronicDiseases.length === 0 ? (
            <p className="mt-0.5 text-[12px] text-[var(--texte-secondaire)]">Aucune connue.</p>
          ) : (
            <p className="mt-0.5 text-[13px] leading-[1.5] text-foreground">{synthese.data.chronicDiseases.join(' · ')}</p>
          )}
        </div>
      ) : null}

      <div>
        <Label htmlFor="carnet-type" className="mb-1.5 block text-[12px]">
          Chronologie
        </Label>
        <Liste
          id="carnet-type"
          taille="sm"
          valeur={type}
          onChange={setType}
          options={[
            { cle: 'TOUT' as const, label: 'Tout le Carnet' },
            ...(Object.keys(LIBELLE_TYPE) as RecordEntryType[]).map((t) => ({ cle: t, label: LIBELLE_TYPE[t] })),
          ]}
        />
      </div>

      {chronologie.isPending ? (
        <p className="flex items-center gap-2 text-[12px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3.5" /> Lecture…
        </p>
      ) : entrees.length === 0 ? (
        <p className="text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
          {type === 'TOUT' ? 'Ce Carnet est encore vide.' : 'Aucune entrée de ce type.'}
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {entrees.map((e) => (
            <li key={e.id} className="border-l-2 border-border pl-2.5">
              <p className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-[var(--texte-tertiaire)]">
                <span className="font-semibold uppercase tracking-[0.05em]">{LIBELLE_TYPE[e.type]}</span>
                <span>· {new Date(e.createdAt).toLocaleDateString('fr-FR')}</span>
                <span>· {LIBELLE_PROVENANCE[e.provenance] ?? e.provenance}</span>
              </p>
              <p
                className={
                  'text-[13px] leading-[1.5] ' +
                  // EF-07-04 : une entrée remplacée reste VISIBLE mais corrigée. La barrer serait
                  // effacer l'histoire ; la montrer comme les autres serait mentir sur l'actuel.
                  (e.superseded ? 'text-[var(--texte-tertiaire)] line-through' : 'text-foreground')
                }
              >
                {texteEntree(e)}
              </p>
            </li>
          ))}
          {chronologie.data?.nextCursor ? (
            <li className="pt-1 text-[11px] italic text-[var(--texte-tertiaire)]">
              Les entrées les plus anciennes ne sont pas affichées.
            </li>
          ) : null}
        </ul>
      )}
    </Carte>
  )
}

// ── Le compte-rendu ────────────────────────────────────────────────────────

/**
 * Le compte-rendu, rédigeable PENDANT la séance (EF-06-08).
 *
 * D-021 le rend obligatoire, et RM-06-04 en fait la condition du paiement : « Gains crédités
 * uniquement après dépôt du compte-rendu (qualité avant trésorerie). » Le brouillon est conservé
 * localement — une fermeture d'onglet en pleine rédaction ne doit pas coûter vingt minutes de texte.
 */
function CompteRendu({ session, onDepose }: { session: CareSession; onDepose: () => void }) {
  const cle = `ulamu-compte-rendu-${session.id}`
  const [diagnostic, setDiagnostic] = useState('')
  const [recommandations, setRecommandations] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  // Rafraîchi toutes les trente secondes : le décompte porte sur des heures, pas sur des secondes.
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      const brut = localStorage.getItem(cle)
      if (brut) {
        const d = JSON.parse(brut) as { diagnostic?: string; recommandations?: string }
        setDiagnostic(d.diagnostic ?? '')
        setRecommandations(d.recommandations ?? '')
      }
    } catch {
      // Un brouillon illisible n'est pas une raison de bloquer l'écran : on repart d'une page vierge.
    }
  }, [cle])

  useEffect(() => {
    if (diagnostic || recommandations) localStorage.setItem(cle, JSON.stringify({ diagnostic, recommandations }))
  }, [cle, diagnostic, recommandations])

  const deposer = useMutation({
    mutationFn: () => api.depositReport(session.id, { diagnosis: diagnostic.trim(), recommendations: recommandations.trim() }),
    onSuccess: () => {
      localStorage.removeItem(cle)
      onDepose()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  if (session.reportDepositedAt) {
    return (
      <Carte icone={FileText} titre="Compte-rendu" sousTitre="Déposé — vos gains sont crédités">
        <Avis ton="succes">Compte-rendu déposé le {new Date(session.reportDepositedAt).toLocaleString('fr-FR')}.</Avis>
      </Carte>
    )
  }

  /*
    L'échéance vient du SERVEUR (`endedAt` + PM-30). Aucun délai n'est écrit ici : si le
    super-administrateur change PM-30 dans E3, ce bloc suit sans qu'on y retouche.

    Le décompte est comparé à l'horloge de CE poste, qui peut être fausse — d'où la date absolue
    affichée juste en dessous : elle, elle est exacte quoi qu'il arrive. Et surtout, un dépassement
    calculé localement ne DÉSACTIVE jamais le bouton : c'est le serveur qui refuse (409), pas une
    horloge de bureau. Bloquer sur une machine en avance ferait perdre des honoraires bien réels.
  */
  const echeance = session.reportDueAt ? new Date(session.reportDueAt) : null
  const resteS = echeance ? Math.floor((echeance.getTime() - maintenant) / 1000) : null
  const depasse = resteS !== null && resteS <= 0
  const tonDelai = depasse || (resteS !== null && resteS < 7200) ? 'erreur' : 'alerte'

  return (
    <Carte
      icone={FileText}
      titre="Compte-rendu"
      sousTitre="Obligatoire — vos gains ne sont crédités qu'à son dépôt (RM-06-04)"
    >
      {echeance ? (
        depasse ? (
          <Avis ton="erreur">
            Le délai de dépôt est dépassé depuis le {echeance.toLocaleString('fr-FR')}. Vos gains sont
            gelés et l'administration a été alertée. Déposez tout de même : le serveur tranchera.
          </Avis>
        ) : (
          <div
            className={
              'flex items-baseline gap-2 rounded-lg border px-3 py-2 ' +
              (tonDelai === 'erreur'
                ? 'border-[var(--erreur-bordure)] bg-[var(--erreur-fond)]'
                : 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)]')
            }
          >
            <Hourglass
              size={14}
              strokeWidth={1.8}
              aria-hidden="true"
              className={tonDelai === 'erreur' ? 'text-[var(--erreur-texte)]' : 'text-[var(--alerte-texte)]'}
            />
            <span className="min-w-0">
              <span
                className={
                  'block text-[15px] font-semibold tabular-nums ' +
                  (tonDelai === 'erreur' ? 'text-[var(--erreur-texte)]' : 'text-[var(--alerte-texte)]')
                }
              >
                {dureeFr(resteS ?? 0)} pour déposer
              </span>
              <span className="block text-[11px] text-[var(--texte-secondaire)]">
                Jusqu'au {echeance.toLocaleString('fr-FR')}. Passé ce délai, le dépôt est refusé et vos
                gains sont gelés.
              </span>
            </span>
          </div>
        )
      ) : (
        <p className="text-[11px] leading-[1.5] text-[var(--texte-tertiaire)]">
          Rédigez-le pendant la consultation : le délai ne commence à courir qu'à la fin de la séance,
          et l'accès au Carnet, lui, se referme à cet instant-là.
        </p>
      )}

      <div>
        <Label htmlFor="cr-diagnostic" className="mb-1.5 block text-[13px]">
          Diagnostic
        </Label>
        <Textarea id="cr-diagnostic" rows={4} maxLength={8000} value={diagnostic} onChange={(e) => setDiagnostic(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="cr-recommandations" className="mb-1.5 block text-[13px]">
          Recommandations
        </Label>
        <Textarea
          id="cr-recommandations"
          rows={4}
          maxLength={8000}
          value={recommandations}
          onChange={(e) => setRecommandations(e.target.value)}
        />
      </div>
      <div>
        <Button
          type="button"
          onClick={() => deposer.mutate()}
          disabled={deposer.isPending || diagnostic.trim().length === 0 || recommandations.trim().length === 0}
        >
          {deposer.isPending ? 'Dépôt…' : 'Déposer le compte-rendu'}
        </Button>
      </div>
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────

/** Ce que le champ de saisie est en train de faire : un nouveau message, une réponse, ou une retouche. */
type ModeSaisie =
  | { type: 'nouveau' }
  | { type: 'reponse'; cible: SessionMessage }
  | { type: 'edition'; cible: SessionMessage }

export function ConsultationPage() {
  const { sessionId = '' } = useParams()
  const qc = useQueryClient()
  const moi = useSessionStore((s) => s.me)
  const [brouillon, setBrouillon] = useState('')
  const [mode, setMode] = useState<ModeSaisie>({ type: 'nouveau' })
  const [surligne, setSurligne] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const recuA = useRef(Date.now())
  const finFil = useRef<HTMLDivElement>(null)
  const champFichier = useRef<HTMLInputElement>(null)
  const champTexte = useRef<HTMLTextAreaElement>(null)

  const session = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const s = await api.session(sessionId)
      recuA.current = Date.now()
      return s
    },
    // Trois secondes : le décompteur, l'indicateur de frappe et les accusés ne valent que frais.
    // Le mobile fait de même — il n'y a pas de canal poussé (M06 est interrogé en boucle).
    refetchInterval: 3_000,
    retry: false,
  })

  const active = session.data?.status === 'ACTIVE'
  const messages = useQuery({
    queryKey: ['session', sessionId, 'messages'],
    queryFn: () => api.sessionMessages(sessionId),
    refetchInterval: active ? 3_000 : false,
    enabled: !!session.data,
    retry: false,
  })

  const reste = useDecompteurServeur(session.data?.remainingSeconds ?? 0, recuA.current)

  // On suit le bas du fil à chaque arrivée : une consultation se lit dans l'ordre, pas à rebours.
  useEffect(() => {
    finFil.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.items.length])

  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['session', sessionId] })
    void qc.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] })
  }

  const quitterLeMode = () => {
    setMode({ type: 'nouveau' })
    setBrouillon('')
  }

  const envoyer = useMutation({
    mutationFn: (texte: string) =>
      // `clientMsgId` : si le réseau coupe après l'envoi mais avant la réponse, le rejeu ne crée pas
      // un doublon (ADR-12). C'est le serveur qui reconnaît la clé.
      api.sendMessage(sessionId, {
        clientMsgId: crypto.randomUUID(),
        kind: 'TEXT',
        body: texte,
        ...(mode.type === 'reponse' ? { replyToId: mode.cible.id } : {}),
      }),
    onSuccess: () => {
      quitterLeMode()
      rafraichir()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const modifier = useMutation({
    mutationFn: ({ id, texte }: { id: string; texte: string }) => api.editSessionMessage(sessionId, id, texte),
    onSuccess: () => {
      quitterLeMode()
      rafraichir()
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const envoyerPhoto = useMutation({
    mutationFn: (f: File) =>
      new Promise<unknown>((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onerror = () => reject(new Error('Fichier illisible'))
        lecteur.onload = async () => {
          const brut = String(lecteur.result)
          // Deux temps : on téléverse, puis on envoie la CLÉ. Le message ne porte jamais les octets.
          const up = await api.uploadSessionMedia(sessionId, {
            fileBase64: brut.slice(brut.indexOf(',') + 1),
            mime: f.type,
          })
          resolve(await api.sendMessage(sessionId, { clientMsgId: crypto.randomUUID(), kind: 'PHOTO', fileKey: up.fileKey }))
        }
        lecteur.readAsDataURL(f)
      }),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const supprimer = useMutation({
    // `forEveryone` est OBLIGATOIRE côté serveur : cet appel partait sans corps et se faisait
    // refuser en 400. Le bouton « supprimer » n'a jamais rien supprimé jusqu'au 28/08/2026.
    mutationFn: ({ id, pourTous }: { id: string; pourTous: boolean }) =>
      api.deleteSessionMessage(sessionId, id, pourTous),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const reagir = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => api.reactToSessionMessage(sessionId, id, emoji),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const prolonger = useMutation({
    mutationFn: () => api.extendSession(sessionId, 10),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  // Signal de frappe, au plus une fois toutes les quatre secondes : le serveur lui donne ~6 s de vie.
  const dernierPing = useRef(0)
  const signalerFrappe = () => {
    const t = Date.now()
    if (t - dernierPing.current < 4000) return
    dernierPing.current = t
    void api.typing(sessionId).catch(() => undefined)
  }

  const ouvrirEdition = (m: SessionMessage) => {
    setMode({ type: 'edition', cible: m })
    setBrouillon(m.body ?? '')
    // Le focus part au champ, curseur en fin de texte : sans cela le médecin doit cliquer pour
    // écrire ce qu'il vient de demander à corriger.
    setTimeout(() => {
      const c = champTexte.current
      if (!c) return
      c.focus()
      c.setSelectionRange(c.value.length, c.value.length)
    }, 0)
  }

  const ouvrirReponse = (m: SessionMessage) => {
    setMode({ type: 'reponse', cible: m })
    setTimeout(() => champTexte.current?.focus(), 0)
  }

  const allerAuCite = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setSurligne(id)
    setTimeout(() => setSurligne((v) => (v === id ? null : v)), 1600)
  }

  const valider = () => {
    const texte = brouillon.trim()
    if (!texte) return
    if (mode.type === 'edition') modifier.mutate({ id: mode.cible.id, texte })
    else envoyer.mutate(texte)
  }

  const items = messages.data?.items ?? []

  /**
   * D-008, invariant n°9 : une séance terminée SANS aucun message du professionnel est intégralement
   * remboursée au patient — il ne perçoit rien. Le serveur compte tous ses messages, y compris ceux
   * qu'il a supprimés. On applique la même règle ici.
   *
   * Limite assumée : un message que le professionnel a retiré de SON fil seul (masquage) disparaît
   * de cette liste sans disparaître du compte du serveur. L'avertissement s'affiche alors à tort —
   * dans le sens prudent : il fait écrire, il n'empêche jamais de percevoir.
   */
  const aRepondu = useMemo(
    () => (session.data ? items.some((m) => m.senderId === session.data!.professionalId) : false),
    [items, session.data],
  )

  if (session.isPending) {
    return (
      <p className="flex items-center gap-2 py-8 text-[13px] text-[var(--texte-tertiaire)]">
        <Spinner className="size-4" /> Ouverture de la consultation…
      </p>
    )
  }

  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <Carte icone={AlertTriangle} titre="Connexion au fil interrompue" sousTitre="La consultation n'est pas perdue">
          <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
            Vos messages déjà envoyés sont arrivés, et le minuteur continue de tourner côté serveur.
          </p>
          <div>
            <Button type="button" onClick={() => session.refetch()}>
              Reprendre la consultation
            </Button>
          </div>
        </Carte>
      </div>
    )
  }

  const s = session.data
  const etat = ETATS[s.status]
  const pre = s.preConsultation
  const peutProlonger = active && s.extensionTotalSec < 1800
  const nomAuteur = (senderId: string) => (senderId === s.professionalId ? 'Vous' : 'Le patient')
  const enCoursDEnvoi = envoyer.isPending || modifier.isPending

  return (
    <div className="mx-auto flex w-full max-w-[1160px] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Stethoscope size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">Consultation</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--texte-tertiaire)]">
            <Lock size={12} strokeWidth={1.8} aria-hidden="true" />
            Échange chiffré · {s.durationMin} minutes
          </p>
        </span>
        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
        {s.status === 'ACTIVE' || s.status === 'PREPARING' ? (
          <span
            className={
              'font-mono text-[20px] font-bold tabular-nums ' + (reste < 120 && active ? 'text-[var(--erreur-texte)]' : 'text-foreground')
            }
            aria-label="Temps restant"
          >
            {mmss(reste)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        <section aria-label="Fil de la consultation" className="flex min-w-0 flex-1 flex-col gap-4">
          {s.status === 'PREPARING' ? (
            <Carte icone={Clock} titre="En attente du patient" sousTitre="Le décompteur n'a pas encore démarré">
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                Le patient remplit sa pré-consultation. La séance démarrera à sa transmission — ou
                automatiquement dix minutes après le paiement, sans quoi personne n'attendrait indéfiniment.
              </p>
            </Carte>
          ) : null}

          {s.status === 'REFUNDED' ? (
            <Avis ton="erreur">
              Cette consultation a été remboursée au patient, faute de réponse de votre part. Aucun gain
              ne sera crédité.
            </Avis>
          ) : null}

          {/*
            L'avertissement au PRÉSENT, pas au passé. Dit après le remboursement, il ne sert à rien ;
            dit maintenant, il suffit d'un message pour qu'il disparaisse.
          */}
          {active && !aRepondu && !messages.isPending ? (
            <Avis ton="alerte">
              Vous n'avez encore écrit aucun message. Si la séance se termine ainsi, elle sera
              intégralement remboursée au patient et vous ne percevrez rien (D-008).
            </Avis>
          ) : null}

          <Carte icone={UserRound} titre="Échange" sousTitre={active ? 'Chiffré de bout en bout au repos' : "L'échange est clos et archivé"}>
            {messages.isPending ? (
              <p className="flex items-center gap-2 py-4 text-[12px] text-[var(--texte-tertiaire)]">
                <Spinner className="size-3.5" /> Chargement du fil…
              </p>
            ) : (
              <div className="max-h-[46vh] overflow-y-auto">
                <ul className="flex flex-col gap-3">
                  {items.length === 0 ? (
                    <li className="py-6 text-center text-[12px] text-[var(--texte-tertiaire)]">
                      {active ? 'La consultation vient de commencer.' : 'Aucun message n’a été échangé.'}
                    </li>
                  ) : (
                    items.map((m, i) => {
                      const precedent = i > 0 ? items[i - 1] : null
                      const nouveauJour = !precedent || !MEME_JOUR(precedent.createdAt, m.createdAt)
                      const groupee =
                        !nouveauJour &&
                        !!precedent &&
                        precedent.senderId === m.senderId &&
                        !m.replyTo &&
                        new Date(m.createdAt).getTime() - new Date(precedent.createdAt).getTime() < REGROUPEMENT_MS

                      return (
                        <div key={m.id} className="contents">
                          {nouveauJour ? (
                            <li className="flex items-center gap-2 py-1" aria-hidden="true">
                              <span className="h-px flex-1 bg-border" />
                              <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--texte-tertiaire)]">
                                {jourFr(m.createdAt)}
                              </span>
                              <span className="h-px flex-1 bg-border" />
                            </li>
                          ) : null}
                          <Bulle
                            m={m}
                            aMoi={m.senderId === moi?.accountId}
                            groupee={groupee}
                            surlignee={surligne === m.id}
                            actif={!!active}
                            nomAuteur={nomAuteur}
                            onRepondre={() => ouvrirReponse(m)}
                            onModifier={() => ouvrirEdition(m)}
                            onSupprimer={(pourTous) => supprimer.mutate({ id: m.id, pourTous })}
                            onReagir={(emoji) => reagir.mutate({ id: m.id, emoji })}
                            onAllerAuCite={allerAuCite}
                          />
                        </div>
                      )
                    })
                  )}
                </ul>
                <div ref={finFil} />
              </div>
            )}

            {s.otherPartyTyping && active ? (
              <p className="flex items-center gap-1.5 text-[11px] italic text-[var(--texte-tertiaire)]">
                <span className="flex gap-0.5" aria-hidden="true">
                  <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="size-1 animate-bounce rounded-full bg-current" />
                </span>
                Le patient écrit…
              </p>
            ) : null}

            {active ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  valider()
                }}
              >
                {/* Le bandeau de contexte : à quoi je réponds, ou quel message je retouche. */}
                {mode.type !== 'nouveau' ? (
                  <div className="flex items-start gap-2 rounded-lg border-l-2 border-[var(--ap-400)] bg-secondary px-2.5 py-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--ap-600)]">
                        {mode.type === 'edition' ? (
                          <>
                            <Pencil size={10} strokeWidth={2} aria-hidden="true" /> Modification de votre message
                          </>
                        ) : (
                          <>
                            <CornerUpLeft size={10} strokeWidth={2} aria-hidden="true" /> Réponse à{' '}
                            {nomAuteur(mode.cible.senderId)}
                          </>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-[var(--texte-secondaire)]">
                        {mode.cible.body ?? 'Photo'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={quitterLeMode}
                      aria-label="Annuler"
                      className="rounded p-0.5 text-[var(--texte-tertiaire)] hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <X size={13} strokeWidth={1.9} aria-hidden="true" />
                    </button>
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <input
                    ref={champFichier}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) envoyerPhoto.mutate(f)
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Envoyer une photo"
                    className="rounded-full"
                    onClick={() => champFichier.current?.click()}
                    // Une photo ne se glisse pas au milieu d'une retouche de texte : le serveur ne
                    // sait pas « modifier un message en y ajoutant une image ».
                    disabled={envoyerPhoto.isPending || mode.type === 'edition'}
                  >
                    {envoyerPhoto.isPending ? <Spinner className="size-4" /> : <ImagePlus size={16} strokeWidth={1.6} aria-hidden="true" />}
                  </Button>
                  <Textarea
                    ref={champTexte}
                    aria-label={mode.type === 'edition' ? 'Modifier votre message' : 'Votre message'}
                    rows={1}
                    maxLength={8000}
                    value={brouillon}
                    placeholder={mode.type === 'edition' ? 'Modifier le message…' : 'Écrivez votre message…'}
                    /* « Composeur SARIS : champ en pilule, envoi rond » — la maquette le note en toutes
                       lettres (rayon 18, hauteur 36). C'est de la forme : elle tranche. */
                    className="min-h-9 resize-none rounded-[18px] px-3.5 py-2"
                    onChange={(e) => {
                      setBrouillon(e.target.value)
                      if (mode.type !== 'edition') signalerFrappe()
                    }}
                    onKeyDown={(e) => {
                      // Entrée envoie, Maj+Entrée passe à la ligne — la convention de toute messagerie.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        valider()
                      }
                      // Échap sort du mode réponse ou modification, comme partout ailleurs.
                      if (e.key === 'Escape' && mode.type !== 'nouveau') {
                        e.preventDefault()
                        quitterLeMode()
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full"
                    aria-label={mode.type === 'edition' ? 'Enregistrer la modification' : 'Envoyer'}
                    disabled={enCoursDEnvoi || brouillon.trim().length === 0}
                  >
                    {enCoursDEnvoi ? (
                      <Spinner className="size-4" />
                    ) : mode.type === 'edition' ? (
                      <Check size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <Send size={16} strokeWidth={1.6} aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </form>
            ) : null}

            {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          </Carte>
        </section>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <Carte icone={FileText} titre="Contexte patient" sousTitre="Transmis avec la pré-consultation">
            {pre ? (
              <>
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                    Symptômes
                  </p>
                  <p className="mt-0.5 text-[13px] leading-[1.55] whitespace-pre-wrap text-foreground">{pre.symptoms}</p>
                </div>
                {pre.sinceWhen ? (
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
                      Depuis
                    </p>
                    <p className="mt-0.5 text-[13px] text-foreground">{pre.sinceWhen}</p>
                  </div>
                ) : null}
                {pre.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {pre.attachments.map((k) => (
                      <Media key={k} fileKey={k} />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[12px] leading-[1.5] text-[var(--texte-tertiaire)]">
                Le patient n'a pas encore transmis sa pré-consultation.
              </p>
            )}
          </Carte>

          {/* Le Carnet n'a de sens qu'une fois la séance ouverte : avant, le serveur refuse (409). */}
          {s.status !== 'REFUNDED' ? <CarnetPatient sessionId={s.id} active={!!active} /> : null}

          {/*
            Le bloc « Livrables » de la maquette, désormais tenu des deux côtés : l'ordonnance ouvre
            C7 en panneau (le médecin ne quitte pas le fil), le compte-rendu se rédige juste en
            dessous. La maquette les groupait sous un même titre parce que les deux n'étaient que
            des boutons vers ailleurs ; ici le compte-rendu est un éditeur à part entière, et les
            réunir sous un titre commun ferait une carte à deux corps.
          */}
          {s.status !== 'REFUNDED' ? <PanneauOrdonnance sessionId={s.id} active={!!active} /> : null}

          {s.status !== 'REFUNDED' ? <CompteRendu session={s} onDepose={rafraichir} /> : null}

          {/*
            À la place de « Terminer la consultation » de la maquette. Le professionnel ne peut pas
            clore — mais il peut donner du temps, gratuitement (EF-06-07), jusqu'à PM-29.
          */}
          {peutProlonger ? (
            <Carte icone={HeartPulse} titre="Prolonger" sousTitre="Gratuit pour le patient (EF-06-07)">
              <p className="text-[12px] leading-[1.55] text-[var(--texte-secondaire)]">
                Vous ne pouvez pas mettre fin à la séance : le patient a payé {s.durationMin} minutes, elles
                lui appartiennent. Vous pouvez en revanche lui en offrir.
              </p>
              <div>
                <Button type="button" size="sm" variant="outline" onClick={() => prolonger.mutate()} disabled={prolonger.isPending}>
                  <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                  {prolonger.isPending ? 'Prolongation…' : 'Prolonger de 10 minutes'}
                </Button>
                <p className="mt-1 text-[11px] text-[var(--texte-tertiaire)]">
                  {Math.round(s.extensionTotalSec / 60)} min déjà offertes sur 30 au maximum.
                </p>
              </div>
            </Carte>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
