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
  Banknote,
  BookOpen,
  Check,
  CheckCheck,
  Clock,
  ChevronDown,
  Copy,
  CornerUpLeft,
  Eye,
  FileText,
  Flag,
  HeartPulse,
  Hourglass,
  ImagePlus,
  Lock,
  Pause,
  Pencil,
  Play,
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
  lireMediaSession,
  type CareSession,
  type CareSessionStatus,
  type RecordEntry,
  type RecordEntryType,
  type SessionMessage,
} from '@/lib/api'
import { PanneauOrdonnance } from '@/modules/ordonnance/PanneauOrdonnance'
import { RailInfos, type MarqueOnglet, type OngletRail } from '../RailInfos'
import { ApercuMedias } from '../ApercuMedias'
import { BoutonMicro, EnregistreurVocal } from '../EnregistreurVocal'
import { compresserImage, enBase64, formatDuree, MIMES_IMAGE, titreConsultation } from '../media'
import { Emoji, seulementDesEmoji, texteAvecEmoji } from '../Emoji'
import { SelecteurEmoji } from '../SelecteurEmoji'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSessionStore } from '@/state/session.store'
import { mmss, useDecompteurServeur } from '@/hooks/useDecompteurServeur'
import { SqueletteFil, SqueletteLignes } from '@/components/ulamu/Squelette'
import { DialogueSignalement } from '@/components/ulamu/DialogueSignalement'
import { messageErreur } from '@/lib/message-erreur'

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
  // Le TYPE servi par le serveur : c'est lui qui distingue une photo d'une note vocale. Il était
  // renvoyé par `lireMediaSession` depuis toujours, et jeté ici (chantier 75).
  const [type, setType] = useState<string | null>(null)
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
        setType(f.type)
      })
      .catch(() => vivant && setEchec(true))
    // Libéré au démontage : une photo de consultation n'a pas à rester en mémoire de l'onglet.
    return () => {
      vivant = false
      if (cree) URL.revokeObjectURL(cree)
    }
  }, [fileKey])

  if (echec) return <p className="text-[11px] text-[var(--erreur-texte)]">Média indisponible.</p>
  if (!url) return <span className="block h-32 w-48 animate-pulse rounded-md bg-secondary" />
  // Le serveur sert le média avec son type : une note vocale ne se rend pas comme une photo.
  if (type?.startsWith('audio/')) return <LecteurVocal url={url} />
  return <img src={url} alt="Photo transmise en consultation" className="max-h-64 rounded-md" />
}

/**
 * Le lecteur d'une note vocale, DANS la bulle — chantier 75.
 *
 * ── Pourquoi pas `<audio controls>` ────────────────────────────────────────────────────────────
 *
 * Les contrôles natifs mesurent 300 px de large, changent d'allure à chaque navigateur, et ignorent
 * le thème. Dans une bulle de conversation, ils écrasent le message. Celui-ci tient en 200 px,
 * suit les jetons, et ne montre que ce dont on se sert : lire, s'arrêter, savoir où on en est.
 *
 * ⚠️ La durée vient du fichier, jamais d'un calcul : `duration` peut valoir `Infinity` tant que les
 * métadonnées ne sont pas lues — on affiche alors un tiret plutôt qu'un nombre faux.
 */
function LecteurVocal({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [joue, setJoue] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState<number | null>(null)

  const fraction = duree && duree > 0 ? Math.min(1, position / duree) : 0

  return (
    <span className="flex w-full max-w-[260px] items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-1.5">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuree(Number.isFinite(d) && d > 0 ? d : null)
        }}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => {
          setJoue(false)
          setPosition(0)
        }}
        className="sr-only"
      />
      <button
        type="button"
        aria-label={joue ? 'Mettre en pause' : 'Écouter la note vocale'}
        onClick={() => {
          const el = audio.current
          if (!el) return
          if (joue) {
            el.pause()
            setJoue(false)
          } else {
            void el.play().then(() => setJoue(true)).catch(() => setJoue(false))
          }
        }}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ap-400)] text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {joue ? <Pause size={13} strokeWidth={2} aria-hidden="true" /> : <Play size={13} strokeWidth={2} aria-hidden="true" />}
      </button>

      {/* La barre de progression. `aria-hidden` : la durée juste à côté dit déjà tout ce qu'un
          lecteur d'écran a besoin d'entendre, et les contrôles natifs restent accessibles. */}
      <span aria-hidden="true" className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--bordure-normale)]">
        <span className="block h-full rounded-full bg-[var(--ap-400)]" style={{ width: `${fraction * 100}%` }} />
      </span>

      <span className="shrink-0 t-code-sm tabular-nums text-[var(--texte-tertiaire)]">
        {duree === null ? '—' : formatDuree(joue || position > 0 ? duree - position : duree)}
      </span>
    </span>
  )
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
          {/*
            ⚠️ La MÊME feuille que les messages — trouvé en vérifiant le chantier 78 en ligne.

            Les emoji des messages étaient devenus des images, ceux des réactions étaient restés en
            police système : le même 👍 avait deux apparences sur le même écran, à trois pixels de
            distance. Une garantie qui ne vaut que pour la moitié d'un écran n'est pas une garantie.

            `aria-hidden` : le bouton porte déjà « Réagir avec 👍 » ; annoncer l'image en plus
            ferait entendre l'emoji deux fois.
          */}
          <span aria-hidden="true">
            <Emoji natif={r.emoji} taille={15} />
          </span>
          {r.count > 1 ? <span className="tabular-nums text-[var(--texte-tertiaire)]">{r.count}</span> : null}
        </button>
      ))}
    </span>
  )
}

/*
 * ── La poignée du menu : DANS la bulle, sans cadre (chantier 82, 11/09/2026) ──────────────────
 *
 * Demande du porteur : *« le bouton doit être petit, incrusté dans la bulle, placé à droite
 * horizontalement et en haut verticalement, sans background »*.
 *
 * Ce qui la rendait lourde n'était plus utile. Jusqu'au chantier 80 cette poignée était une
 * BARRE de quatre boutons : le cadre, le fond et l'ombre servaient à les tenir ensemble et à les
 * détacher du fil. Depuis que tout vit dans un seul menu, il ne restait qu'un chevron de 14 px
 * au milieu d'une boîte bordée — **un cadre autour d'un seul objet, c'est-à-dire du bruit.**
 *
 * ⚠️ Et le déplacement efface un contournement entier. La barre était posée À CÔTÉ de la bulle
 * (`left-full`) : sur un téléphone où la bulle prend presque toute la largeur, elle débordait de
 * 73 px et le fil se laissait tirer latéralement de 34 px — mesuré à 375 px au chantier 21. Il
 * avait fallu une règle `lg:` pour la rapatrier dans le coin de la ligne en dessous de 1024 px.
 * **Posée DANS la bulle, elle ne peut plus déborder de rien : la règle disparaît.**
 *
 * *Un défaut de placement se contourne ; un bon placement n'a rien à contourner.*
 *
 * `opacity` en STYLE et non en classe : `.ul-au-survol` vit hors d'un `@layer` et battrait
 * silencieusement n'importe quel utilitaire Tailwind. Ouvert au clic droit, le menu doit montrer
 * sa poignée — sinon il flotte, rattaché à rien de visible.
 */
const POIGNEE_CADRE = 'ul-au-survol absolute top-0.5 right-0.5 z-10'

/*
 * Sans fond, et sans fond au survol non plus. Les deux bulles sont des surfaces claires
 * (`--ap-50` pour les miennes, `--fond-carte` pour celles de l'autre), et l'encre tertiaire porte
 * sur les deux dans les deux thèmes : un fond n'apporterait rien qu'une tache.
 *
 * Le survol change l'ENCRE, pas le fond — c'est le seul retour dont un chevron a besoin.
 */
const POIGNEE_BOUTON =
  'rounded p-1 text-[var(--texte-tertiaire)] transition-colors hover:text-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

/**
 * Le menu d'un message — UN SEUL menu, ouvert par la poignée OU par le clic droit sur la bulle.
 *
 * ── Chantier 80, 11/09/2026 : le web rattrape son propre produit ──────────────────────────────
 *
 * Il y avait ici QUATRE icônes flottantes. Le porteur ne les a pas trouvées, et il avait raison de
 * ne pas les trouver : elles sont invisibles tant qu'on ne survole pas exactement le bon endroit,
 * et il n'existait **aucun autre chemin** pour les atteindre.
 *
 * Or les deux autres surfaces du même produit faisaient déjà mieux :
 *
 * | | Le geste | Le menu |
 * |---|---|---|
 * | **Mobile ULAMU** (`ChatActionSheet.tsx`) | appui long | un seul, réactions + « + » + actions |
 * | **CMS-SARIS** | clic droit **et** chevron | un seul, réactions + « + » + actions |
 * | **Web ULAMU**, avant ce chantier | survol précis, et rien d'autre | quatre boutons épars |
 *
 * Ce n'était donc pas une idée à emprunter dehors : **c'était un écart à réduire chez nous.** Le
 * web est aligné sur le mobile, geste pour geste, et gagne le clic droit — celui qu'on tente
 * d'instinct sur un message.
 *
 * ── Ce que ce menu ajoute, et qui manquait vraiment ───────────────────────────────────────────
 *
 * **Le « + » vers le sélecteur complet.** Le serveur accepte n'importe quel emoji en réaction
 * (`ReactToMessageDto`, 8 caractères — de quoi porter un emoji composé). Le mobile offre déjà ce
 * choix. Le web n'offrait que six emoji figés : **une capacité existait des deux côtés, et l'écran
 * du soignant était le seul à ne pas y mener.** C'est la onzième fois que ce motif apparaît dans
 * ce projet, et cette fois il séparait nos deux propres clients.
 *
 * **« Copier le texte »**, que le mobile ne PEUT pas offrir (pas de bibliothèque presse-papier
 * native installée) et que le web obtient sans rien ajouter. On n'aligne pas par le bas.
 */
function GestesBulle({
  aMoi,
  editable,
  copiable,
  retirableParTous,
  ouvert,
  surOuvert,
  onRepondre,
  onReagir,
  onReagirLibre,
  onCopier,
  onModifier,
  onSupprimer,
  onSignaler,
  actif,
}: {
  aMoi: boolean
  editable: boolean
  /** Un texte, non vide : on ne propose pas de copier une photo ou une note vocale. */
  copiable: boolean
  retirableParTous: boolean
  ouvert: boolean
  surOuvert: (o: boolean) => void
  onRepondre: () => void
  onReagir: (emoji: string) => void
  /** Ouvre le sélecteur complet — le « + » de la bande, comme sur le mobile. */
  onReagirLibre: () => void
  onCopier: () => void
  onModifier: () => void
  onSupprimer: (pourTous: boolean) => void
  onSignaler: () => void
  /**
   * La séance est-elle en cours ?
   *
   * ── Ce que cette valeur décide, et pourquoi (chantier 41 ter, 04/09/2026) ────────────────────
   *
   * **Séance close = archive.** Aucun geste ne la modifie : ni répondre, ni réagir, ni modifier,
   * ni retirer. C'est une décision du projet, éprouvée par un test depuis le chantier 4 — « une
   * séance close n'offre plus aucun geste : le fil est archivé ».
   *
   * **Une seule exception : SIGNALER.** Elle a été trouvée en vérifiant le chantier 41 en ligne —
   * sur une consultation terminée, il n'y avait aucun moyen de signaler un message, et c'est
   * précisément après coup qu'on repense à un propos déplacé. Le message est la preuve.
   *
   * Signaler n'est pas une modification de l'archive : c'est une alerte À SON SUJET. La règle tient
   * donc entière, et l'exception ne l'entame pas.
   *
   * *La première version de cette correction rouvrait TOUS les gestes après la clôture, au motif
   * que le serveur les accepte (seul `sendMessage` exige `status === ACTIVE`). Le test existant l'a
   * refusée, et il avait raison : **ce que le serveur autorise n'est pas ce que le produit veut.***
   */
  actif: boolean
}) {
  /*
    ── Séance close : LE MÊME MENU, réduit à ce qui reste permis (chantier 81, 11/09/2026) ──────

    Il y avait ici un bouton « signaler » posé nu sur la bulle — un geste au dessin différent de
    tous les autres, à l'endroit où les autres vivent dans un menu. **Deux grammaires sur le même
    écran**, et celle de l'archive était la plus rare : on l'apprend une fois sur cent.

    Demande du porteur, 11/09 : *« au lieu du bouton directement sur le message, je veux le même
    bouton flottant qui fait apparaître un menu, mais un menu avec uniquement les fonctionnalités
    autorisées »*. C'est la bonne règle, et elle vaut mieux que l'économie d'un clic : **le geste
    ne change pas selon l'état de la séance, seul son CONTENU change.**

    ⚠️ Et ce menu révèle un geste qui manquait. Sur une archive, « Copier le texte » est
    parfaitement légitime — copier ne modifie rien, et c'est **précisément après coup**, en
    rédigeant le compte-rendu, qu'on veut reprendre mot pour mot ce que le patient a écrit. Le
    bouton nu ne pouvait pas le porter ; le menu, oui. Sur ses PROPRES messages, une archive
    n'offrait rien du tout : elle offre maintenant la copie.

    Ce qui reste exclu, et pourquoi : « Retirer de mon fil » modifie ce que l'archive montre, même
    si c'est à moi seul. Un fil clos est une pièce, pas un brouillon.
  */
  if (!actif) {
    // Ni texte à copier, ni personne à signaler : pas de menu vide, pas de poignée qui ment.
    if (!copiable && aMoi) return null
    return (
      <span style={{ opacity: ouvert ? 1 : undefined }} className={POIGNEE_CADRE}>
        <DropdownMenu open={ouvert} onOpenChange={surOuvert}>
          <DropdownMenuTrigger aria-label="Actions sur ce message" className={POIGNEE_BOUTON}>
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={aMoi ? 'end' : 'start'} sideOffset={4} className="w-60">
            {copiable ? (
              <DropdownMenuItem onSelect={onCopier}>
                <Copy size={14} strokeWidth={1.6} aria-hidden="true" />
                Copier le texte
              </DropdownMenuItem>
            ) : null}
            {aMoi ? null : (
              <DropdownMenuItem variant="destructive" onSelect={onSignaler}>
                <Flag size={14} strokeWidth={1.6} aria-hidden="true" />
                Signaler ce message
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    )
  }

  return (
    <span
      style={{ opacity: ouvert ? 1 : undefined }}
      className={POIGNEE_CADRE}
    >
      <DropdownMenu open={ouvert} onOpenChange={surOuvert}>
        <DropdownMenuTrigger aria-label="Actions sur ce message" className={POIGNEE_BOUTON}>
          <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={aMoi ? 'end' : 'start'} sideOffset={4} className="w-60">
          {/*
            La bande de réactions EN HAUT du menu — mobile et CMS la placent là tous les deux, et
            c'est aussi l'ordre de WhatsApp : réagir est le geste le plus fréquent, il ne se mérite
            pas au bout d'une liste.

            Ce ne sont PAS des `DropdownMenuItem` : six éléments de menu en ligne casseraient la
            navigation au clavier (haut/bas passerait de l'un à l'autre au lieu de descendre dans
            la liste). Des boutons simples, dans un conteneur qui ne prétend pas être une liste.
          */}
          <div className="flex items-center gap-0.5 px-1 pt-1 pb-1.5">
            {REACTIONS_RAPIDES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReagir(e)
                  surOuvert(false)
                }}
                aria-label={`Réagir avec ${e}`}
                className="flex size-8 items-center justify-center rounded-md leading-none hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span aria-hidden="true">
                  <Emoji natif={e} taille={20} />
                </span>
              </button>
            ))}
            {/*
              Le « + » — le chemin qui manquait. Le serveur accepte n'importe quel emoji, le mobile
              le propose déjà ; le web s'arrêtait à six. Il ferme ce menu et ouvre le sélecteur
              complet, car la recherche du sélecteur a besoin d'un champ de saisie, et un champ dans
              un menu se fait voler ses touches par la navigation au clavier du menu lui-même.
            */}
            <button
              type="button"
              onClick={() => {
                surOuvert(false)
                onReagirLibre()
              }}
              aria-label="Choisir un autre emoji"
              className="flex size-8 items-center justify-center rounded-md text-[var(--texte-tertiaire)] hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={onRepondre}>
            <CornerUpLeft size={14} strokeWidth={1.6} aria-hidden="true" />
            Répondre
          </DropdownMenuItem>
          {/* Le mobile ne peut pas l'offrir — aucune bibliothèque presse-papier native installée.
              Le web le peut sans rien ajouter : on n'aligne pas les surfaces par le bas. */}
          {copiable ? (
            <DropdownMenuItem onSelect={onCopier}>
              <Copy size={14} strokeWidth={1.6} aria-hidden="true" />
              Copier le texte
            </DropdownMenuItem>
          ) : null}
          {editable ? (
            <DropdownMenuItem onSelect={onModifier}>
              <Pencil size={14} strokeWidth={1.6} aria-hidden="true" />
              Modifier
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => onSupprimer(false)}>
            <Eye size={14} strokeWidth={1.6} aria-hidden="true" />
            Retirer de mon fil
          </DropdownMenuItem>
          {retirableParTous ? (
            <DropdownMenuItem variant="destructive" onSelect={() => onSupprimer(true)}>
              <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
              Supprimer pour tout le monde
            </DropdownMenuItem>
          ) : null}
          {/*
            Signaler — chantier 41. Uniquement sur les messages de L'AUTRE : se signaler soi-même
            n'a aucun sens, et l'offrir ferait douter de ce que le geste veut dire. « Retirer de mon
            fil » reste au-dessus parce qu'il répond au même problème sans engager personne.
          */}
          {aMoi ? null : (
            <DropdownMenuItem variant="destructive" onSelect={onSignaler}>
              <Flag size={14} strokeWidth={1.6} aria-hidden="true" />
              Signaler ce message
            </DropdownMenuItem>
          )}
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
  onSignaler,
  onReagir,
  onReagirLibre,
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
  onSignaler: () => void
  onReagir: (emoji: string) => void
  /** Ouvre le sélecteur complet pour CE message — le « + » de la bande de réactions. */
  onReagirLibre: () => void
  onAllerAuCite: (id: string) => void
}) {
  const cles = m.mediaKeys.length > 0 ? m.mediaKeys : m.fileKey ? [m.fileKey] : []
  const dansLaFenetre = Date.now() - new Date(m.createdAt).getTime() <= FENETRE_EDITION_MS

  /*
    Le menu est PILOTÉ ici, et non par sa poignée : il doit pouvoir s'ouvrir depuis deux endroits
    — le clic sur la poignée, et le clic droit n'importe où sur la bulle. Un menu qui ne s'ouvre
    que par son propre déclencheur ne peut pas recevoir le second geste.
  */
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [copie, setCopie] = useState<'ok' | 'echec' | null>(null)

  /*
    Y a-t-il un menu à ouvrir ? La règle est lue ICI, une seule fois, parce que deux endroits en
    dépendent : la poignée (qui ne doit pas s'afficher pour rien) et le clic droit (qui ne doit pas
    confisquer le menu du navigateur pour rien).

    Séance ouverte : toujours. Séance close : seulement s'il reste quelque chose — un texte à
    copier, ou quelqu'un d'autre à signaler.
  */
  const copiable = m.kind === 'TEXT' && !!m.body?.trim()
  const menuPossible = !!actif || copiable || !aMoi

  /*
    ⚠️ Ces trois crochets sont AVANT le `return` du message supprimé, et doivent y rester : React
    exige le même nombre de crochets à chaque rendu, et une trace de suppression en appellerait
    moins que la bulle qu'elle remplace.
  */
  useEffect(() => {
    if (!copie) return
    const t = setTimeout(() => setCopie(null), 2200)
    return () => clearTimeout(t)
  }, [copie])

  /*
    La copie peut échouer sans bruit : `navigator.clipboard` n'existe pas hors contexte sécurisé,
    et un navigateur peut refuser l'autorisation. **On le dit.** Croire qu'on a copié le passage
    d'un patient, puis coller autre chose dans un compte-rendu, est pire que ne pas avoir le geste.
  */
  const copier = () => {
    const presse = navigator.clipboard
    if (!presse?.writeText) {
      setCopie('echec')
      return
    }
    void presse
      .writeText(m.body ?? '')
      .then(() => setCopie('ok'))
      .catch(() => setCopie('echec'))
  }

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
      <div
        className="relative max-w-[min(34rem,85%)]"
        /*
          CLIC DROIT = le menu du message, comme sur WhatsApp et comme CMS-SARIS. C'est le geste
          qu'on tente d'instinct, et c'est ce qui manquait : la poignée reste, mais il fallait
          d'abord survoler exactement le bon endroit pour la voir. Le porteur ne l'a pas trouvée.

          Il suit le MENU, pas l'état de la séance (chantier 81) : depuis qu'une archive a le sien,
          le clic droit y ouvre la version réduite. La seule fois où on rend la main au navigateur,
          c'est quand il n'y a rien à montrer — confisquer son menu pour ouvrir le vide serait le
          pire des deux mondes.
        */
        onContextMenu={(e) => {
          if (!menuPossible) return
          e.preventDefault()
          setMenuOuvert(true)
        }}
      >
        {/*
          ── La barre est montée même séance close (chantier 41 ter, 04/09/2026) ────────────────

          Elle ne l'était pas, et le signalement d'un message était donc impossible dès la clôture
          — trouvé EN LIGNE en vérifiant le chantier 41. Or c'est après coup qu'on repense à un
          propos déplacé, et le message est la preuve.

          `GestesBulle` décide de ce qu'elle montre : tout si la séance est ouverte, **le seul
          signalement** si elle est close. Un fil clos reste une archive — on ne le modifie pas, on
          alerte à son sujet.
        */}
        <GestesBulle
          actif={!!actif}
          aMoi={aMoi}
          editable={aMoi && m.kind === 'TEXT' && dansLaFenetre}
          copiable={copiable}
          retirableParTous={aMoi && dansLaFenetre}
          ouvert={menuOuvert}
          surOuvert={setMenuOuvert}
          onRepondre={onRepondre}
          onReagir={onReagir}
          onReagirLibre={onReagirLibre}
          onCopier={copier}
          onModifier={onModifier}
          onSupprimer={onSupprimer}
          onSignaler={onSignaler}
        />

        {/*
          Le retour de la copie. `role="status"` : un lecteur d'écran l'annonce sans voler le
          focus — la main de l'utilisateur est déjà repartie ailleurs.
        */}
        {copie ? (
          <span
            role="status"
            className={
              'absolute -top-5 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-medium ' +
              'shadow-[0_1px_3px_rgba(15,23,42,.10)] ' +
              (aMoi ? 'right-0' : 'left-0')
            }
            style={
              copie === 'ok'
                ? { background: 'var(--succes-fond)', color: 'var(--succes-texte)' }
                : { background: 'var(--erreur-fond)', color: 'var(--erreur-texte)' }
            }
          >
            {copie === 'ok' ? 'Texte copié' : 'Copie refusée par le navigateur'}
          </span>
        ) : null}

        <div
          /*
            `ul-bulle` ne sert qu'aux écrans SANS survol (chantier 82). Là, la poignée est affichée
            en permanence — une commande qu'on n'atteint qu'à la souris est absente pour qui n'en a
            pas — et, posée dans la bulle, elle couvrirait la fin de la première ligne. La classe
            réserve sa place. Sur un écran à souris elle ne fait rien : la poignée n'apparaît qu'au
            survol, l'instant où l'on ne lit pas.

            Elle n'est posée que si un menu existe : réserver la place d'une poignée absente
            décalerait le texte pour rien.
          */
          className={
            'rounded-lg px-3 py-2 ' +
            (menuPossible ? 'ul-bulle ' : '') +
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
          {/*
            ── Le rendu des emoji — chantier 78 ──────────────────────────────────────────────────

            Les emoji deviennent des IMAGES, servies par le site : le même 🙏 a la même forme chez
            le patient et chez le soignant, quel que soit l'appareil. Écrits en texte, ils sont
            dessinés par le système — et certains manquent tout simplement.

            Un message qui n'est QUE des emoji, et pas plus de huit, se rend en grand : un « 👍 »
            seul tient lieu de phrase, et le rendre à la taille d'un mot le rate.

            ⚠️ Le texte non-emoji n'est PAS interprété — ni balises, ni liens automatiques. Le corps
            d'un message de consultation porte des données de santé : on l'affiche, on ne le
            transforme pas.
          */}
          {m.body ? (
            seulementDesEmoji(m.body) ? (
              <p className="leading-none">{texteAvecEmoji(m.body, 34)}</p>
            ) : (
              <p className="text-[13px] leading-[1.55] whitespace-pre-wrap">{texteAvecEmoji(m.body)}</p>
            )
          ) : null}
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
          Le Carnet n'est lisible que pendant la séance. Ce que vous en avez retenu doit
          figurer dans votre compte-rendu — il ne se rouvrira pas pour le rédiger.
        </p>
      </Carte>
    )
  }

  const echec = synthese.error ?? chronologie.error
  const entrees = chronologie.data?.items ?? []

  return (
    <Carte icone={BookOpen} titre="Carnet du patient" sousTitre="Lecture seule · votre consultation est enregistrée">
      {echec ? <Avis ton="erreur">{messageErreur(echec)}</Avis> : null}

      {synthese.isPending ? (
        <p className="flex items-center gap-2 text-[12px] text-[var(--texte-tertiaire)]">
          <Spinner className="size-3.5" /> Ouverture du Carnet…
        </p>
      ) : synthese.data ? (
        <div className="rounded-lg border border-border bg-secondary/50 p-2.5">
          <p className="ul-surtitre">
            Groupe sanguin
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-foreground">{synthese.data.bloodType ?? 'Non renseigné'}</p>

          {/*
            Les allergies d'abord, et en rouge : c'est la seule information de cet écran qui peut
            tuer. Le garde-fou M09 s'en sert déjà pour bloquer une prescription (CU-07-02) — le
            médecin doit la voir avant d'en arriver là.
          */}
          <p className="mt-2.5 ul-surtitre">
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

          <p className="mt-2.5 ul-surtitre">
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
        <SqueletteLignes nombre={3} libelle="Lecture du Carnet…" />
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
    onError: (e) => setErreur(messageErreur(e)),
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
      sousTitre="Obligatoire — vos gains ne sont crédités qu'à son dépôt"
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
  /*
    Les deux surfaces d'envoi de média — chantier 75.

    `apercu` porte les photos CHOISIES mais pas encore parties : elles s'affichent, on en ajoute,
    on en retire, on voit leur poids, et on renonce si besoin. `null` = pas d'aperçu ouvert.

    `vocalOuvert` ouvre l'enregistreur à la place de la barre de saisie. Les deux ne coexistent
    jamais : on ne dicte pas une note vocale en regardant des photos.
  */
  const [apercu, setApercu] = useState<File[] | null>(null)
  const [vocalOuvert, setVocalOuvert] = useState(false)
  /*
    Signalement (chantier 41). Deux états et non un : on signale soit LE PATIENT, soit UN MESSAGE
    précis — et l'administration a besoin de savoir lequel des deux. Le second porte l'identifiant
    du message ; `null` ferme la boîte.
  */
  const [signalerPatient, setSignalerPatient] = useState(false)
  const [messageSignale, setMessageSignale] = useState<string | null>(null)
  /** Le message dont on choisit librement la réaction — le « + » de la bande. */
  const [reactionLibre, setReactionLibre] = useState<string | null>(null)
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
  /*
    ── Ce que cette consultation rapporte — chantier 76 ─────────────────────────────────────────

    L'écran où un médecin passe trente minutes ne disait nulle part ce qu'elles lui rapportent. La
    maquette C5 met les honoraires dans le rail, et elle a raison.

    ⚠️ **Le montant n'est pas sur la séance.** `GET /v1/care-sessions/:id` ne porte aucun prix — il
    vit sur la DEMANDE qui l'a précédée (`offerPriceXaf`), et la demande porte le `sessionId` qui
    les relie. La jointure se fait donc ici, côté écran, sur une route que le client appelle déjà
    ailleurs (tableau de bord, registre) : la requête est servie par le cache, elle ne part qu'une
    fois.

    C'est le **prix payé par le patient**, pas le net : la commission se lit au contrat, elle
    dépend du soignant (RM-13-07), et aucun écran ne la calcule — « Mes gains » montre le net, qui
    n'existe qu'au dépôt du compte-rendu.
  */
  const demandes = useQuery({ queryKey: ['handshakes', 'mine'], queryFn: () => api.myHandshakes(), retry: false })

  /*
    ── Les ordonnances, lues ICI pour que l'ONGLET puisse les compter (chantier 83) ─────────────

    `PanneauOrdonnance` fait déjà cette requête, avec exactement cette clé. Ce n'est donc pas un
    second appel : react-query sert le même cache aux deux. C'est ce qui permet à l'onglet
    d'annoncer « 2 » sans qu'on ouvre la carte — et sans rien coûter au réseau.
  */
  const prescrites = useQuery({
    queryKey: ['prescriptions', 'prescribed'],
    queryFn: () => api.myPrescribed(),
    retry: false,
    staleTime: 60_000,
  })

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
    onError: (e) => setErreur(messageErreur(e)),
  })

  const modifier = useMutation({
    mutationFn: ({ id, texte }: { id: string; texte: string }) => api.editSessionMessage(sessionId, id, texte),
    onSuccess: () => {
      quitterLeMode()
      rafraichir()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  /**
   * Les photos — chantier 75.
   *
   * ⚠️ Trois choses ont changé :
   *
   * 1. **Plusieurs à la fois.** `SendMessageDto` accepte `fileKeys`, jusqu'à dix clés dans une
   *    seule bulle, et le fil savait déjà les afficher (`mediaKeys`). Rien ne savait les envoyer.
   * 2. **Compressées avant de partir.** Une photo de téléphone pèse 4 à 9 Mo ; sur un réseau
   *    mobile, l'envoyer telle quelle coûte des minutes pour aucun gain de lecture médicale.
   * 3. **Un seul message, pas dix.** Les clés partent groupées : dix bulles pour une éruption
   *    photographiée sous dix angles rendraient le fil illisible.
   *
   * Les deux temps sont conservés : on téléverse, puis on envoie les CLÉS. Le message ne porte
   * jamais les octets.
   */
  const envoyerPhotos = useMutation({
    mutationFn: async (fichiers: File[]) => {
      const cles: string[] = []
      for (const f of fichiers) {
        const leger = await compresserImage(f)
        const up = await api.uploadSessionMedia(sessionId, { fileBase64: await enBase64(leger), mime: leger.type })
        cles.push(up.fileKey)
      }
      return api.sendMessage(sessionId, {
        clientMsgId: crypto.randomUUID(),
        kind: 'PHOTO',
        // Une seule photo garde `fileKey` : c'est la forme que le serveur a toujours reçue, et
        // rien ne gagne à envoyer un tableau d'un élément.
        ...(cles.length === 1 ? { fileKey: cles[0] } : { fileKeys: cles }),
      })
    },
    onSuccess: () => {
      setApercu(null)
      rafraichir()
    },
    onError: (e) => setErreur(messageErreur(e)),
  })

  /**
   * La note vocale — chantier 75.
   *
   * Le serveur accepte le type `VOICE` depuis le premier jour et six formats audio. Le web n'a
   * jamais rien envoyé d'autre que du texte et des photos : dixième occurrence du motif « la
   * capacité existe, l'écran ne l'offre pas ».
   *
   * Le fichier arrive déjà au format que le SERVEUR accepte — c'est `EnregistreurVocal` qui s'en
   * charge, parce que le format par défaut des navigateurs Chromium (`audio/webm`) serait refusé.
   */
  const envoyerVocal = useMutation({
    mutationFn: async (f: File) => {
      const up = await api.uploadSessionMedia(sessionId, { fileBase64: await enBase64(f), mime: f.type })
      return api.sendMessage(sessionId, { clientMsgId: crypto.randomUUID(), kind: 'VOICE', fileKey: up.fileKey })
    },
    onSuccess: () => {
      setVocalOuvert(false)
      rafraichir()
    },
    onError: (e) => {
      setVocalOuvert(false)
      setErreur(messageErreur(e))
    },
  })

  const supprimer = useMutation({
    // `forEveryone` est OBLIGATOIRE côté serveur : cet appel partait sans corps et se faisait
    // refuser en 400. Le bouton « supprimer » n'a jamais rien supprimé jusqu'au 28/08/2026.
    mutationFn: ({ id, pourTous }: { id: string; pourTous: boolean }) =>
      api.deleteSessionMessage(sessionId, id, pourTous),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageErreur(e)),
  })

  const reagir = useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => api.reactToSessionMessage(sessionId, id, emoji),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageErreur(e)),
  })

  const prolonger = useMutation({
    mutationFn: () => api.extendSession(sessionId, 10),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageErreur(e)),
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
  /* Le prix payé par le patient pour CETTE séance — voir la note sur `demandes` plus haut. */
  const prixPatient = (demandes.data?.items ?? []).find((h) => h.sessionId === s.id)?.offerPriceXaf ?? null
  const peutProlonger = active && s.extensionTotalSec < 1800
  const nomAuteur = (senderId: string) => (senderId === s.professionalId ? 'Vous' : 'Le patient')
  const enCoursDEnvoi = envoyer.isPending || modifier.isPending
  const nbOrdonnances = (prescrites.data?.items ?? []).filter((p) => p.sessionId === s.id).length

  /*
    ── Ce que l'onglet « Compte-rendu » annonce sans qu'on l'ouvre ──────────────────────────────

    C'est la marque qui justifie tout ce chantier. Le compte-rendu a 24 h (PM-30) et les gains sont
    **gelés** passé ce délai (CU-06-03) : c'est la seule carte du rail dont l'ignorance coûte de
    l'argent. Elle porte donc son état sur l'onglet lui-même.

    Le format est COURT — « 6 h », « 41 min » — parce qu'une pastille d'onglet ne tient pas
    « 6 h 12 min ». Le détail exact reste dans la carte, qui a la place de le dire.

    ⚠️ L'échéance vient du SERVEUR (`reportDueAt`, RM-06-02). L'horloge de ce poste n'est
    qu'indicative, et un soignant qui croirait son navigateur pourrait déposer trop tard.
  */
  /*
    ── L'échéance, lue UNE SEULE FOIS — chantier 84, 11/09/2026 ─────────────────────────────────

    ⚠️ **Corrigé après vérification en ligne, sur une consultation réelle du porteur.** L'onglet
    disait « **expiré** » pendant que la bande, trois centimètres plus bas, annonçait « moins d'une
    minute **restantes** » — et la carte, juste en dessous, « le délai est dépassé depuis le
    29/08/2026, vos gains sont gelés ». **Trois affichages du même fait, dont deux qui se
    contredisaient.**

    La cause : la bande recalculait le temps restant de son côté, avec un `Math.max(0, …)` qui
    transforme silencieusement « dépassé de deux semaines » en « zéro seconde », c'est-à-dire en
    « moins d'une minute ». Un plancher à zéro n'est pas une protection : **il fabrique une valeur
    fausse au lieu de dire qu'il n'y en a pas.**

    *Deux endroits qui calculent la même chose finissent toujours par ne plus dire la même chose.*
    L'échéance est donc lue ici, une fois, et les deux affichages la consomment.

    Ce n'est pas cosmétique : ce délai décide du paiement (CU-06-03, gains gelés). Annoncer « il
    reste moins d'une minute » à un soignant dont les gains sont gelés depuis deux semaines, c'est
    lui faire croire qu'il peut encore les sauver.
  */
  const echeanceCompteRendu = ((): { secondes: number; depasse: boolean } | null => {
    if (s.reportDepositedAt || !s.reportDueAt) return null
    // ⚠️ Pas de plancher à zéro : une valeur NÉGATIVE est l'information, pas une anomalie à corriger.
    const secondes = Math.floor((new Date(s.reportDueAt).getTime() - Date.now()) / 1000)
    return { secondes, depasse: secondes <= 0 }
  })()

  const marqueCompteRendu = ((): MarqueOnglet | undefined => {
    if (s.reportDepositedAt) return { texte: 'déposé', ton: 'succes' }
    if (!echeanceCompteRendu) return undefined
    if (echeanceCompteRendu.depasse) return { texte: 'expiré', ton: 'urgence' }
    const restant = echeanceCompteRendu.secondes
    const heures = Math.floor(restant / 3600)
    return {
      texte: heures >= 1 ? `${heures} h` : `${Math.max(1, Math.round(restant / 60))} min`,
      // Sous six heures, le délai n'est plus une information : c'est un avertissement.
      ton: restant < 6 * 3600 ? 'urgence' : 'neutre',
    }
  })()

  /*
    L'onglet ouvert par défaut, quand on n'a aucun souvenir sur cette consultation.

    Pendant la séance, c'est le CONTEXTE du patient : on ouvre l'écran pour savoir de quoi il
    souffre. Une fois la séance close et le compte-rendu non déposé, c'est le COMPTE-RENDU : il n'y
    a plus qu'une chose à faire, et elle est chronométrée.

    *Une capacité doit avoir un chemin — et le meilleur chemin, c'est parfois être déjà là.*
  */
  const ongletParDefaut = !active && !s.reportDepositedAt && s.reportDueAt ? 'compte-rendu' : 'contexte'

  return (
    /*
      ── Deux zones FIXES, chacune défilant chez elle (chantier 83, demande du porteur) ──────────

      *« La zone du contenant des messages doit être fixe, le scroll se passe à l'intérieur ; à
      l'extérieur le bloc ne bouge pas. »*

      Au-dessus de 1024 px, l'écran occupe exactement la hauteur disponible et ne la dépasse jamais :
      le fil défile dans le fil, le rail défile dans le rail, **la page ne bouge plus**. En dessous,
      les deux colonnes s'empilent et la page redevient un document qui défile — sur un téléphone,
      deux zones de défilement l'une sous l'autre s'annulent, on ne sait plus laquelle on tire.

      ⚠️ Au passage, cela corrige un vrai défaut : le fil était bloqué à **46 % de la hauteur de
      l'écran**, quelle que soit la taille de l'écran. Sur un grand moniteur on perdait la moitié de
      la place ; sur un portable c'était à l'étroit. Une hauteur en pourcentage n'est pas une mise en
      page, c'est une moyenne — et personne ne travaille sur un écran moyen.
    */
    <div className="mx-auto flex w-full max-w-[1160px] flex-col lg:h-full lg:min-h-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Stethoscope size={18} strokeWidth={1.5} />
        </span>
        {/* `basis-44` : sans largeur de base, `flex-1` cède tout à la pastille d'état et au
            chronomètre. À 320 px le titre tombait à 74 px pour 108 nécessaires — « Consultati ».
            Avec un plancher, c'est la pastille qui passe à la ligne, et le titre reste entier. */}
        <span className="min-w-0 flex-1 basis-44">
          {/*
            ── La consultation prend un NOM — chantier 76 ─────────────────────────────────────────

            Le titre était le mot « Consultation ». Un médecin qui ouvre trois séances dans la
            journée ne pouvait pas les distinguer : trois onglets identiques, trois fois le même
            mot. La maquette C5 titre par le MOTIF (« Palpitations nocturnes ») — et elle a raison.

            Le motif vient des symptômes de la pré-consultation, qui étaient déjà servis et déjà
            affichés… tout en bas du rail de droite. La matière était là, rangée là où on ne la
            cherche pas.

            ⚠️ Le titre reste « Consultation » tant que la pré-consultation n'est pas transmise —
            une séance en préparation n'a pas encore de motif, et inventer un titre à partir de rien
            serait pire que le mot générique.
          */}
          <h1 className="ul-titre-page">{titreConsultation(s.preConsultation)}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-[var(--texte-tertiaire)]">
            <Lock size={12} strokeWidth={1.8} aria-hidden="true" />
            Échange chiffré · {s.durationMin} minutes
            {/*
              La RÉFÉRENCE de la séance. La maquette la met au fil d'Ariane ; le nôtre est calculé
              par la coquille à partir des routes et ne sait pas porter une valeur d'écran. Elle vit
              donc ici, en chasse fixe — c'est elle qu'on dicte au support ou qu'on cherche dans le
              registre des consultations, où elle sert déjà d'identifiant.
            */}
            <span className="t-code-sm">· {s.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </span>
        <Pilule ton={etat.ton}>{etat.libelle}</Pilule>
        {/*
          ── Le minuteur devient un INSTRUMENT — chantier 75 ─────────────────────────────────────

          Il s'écrivait en 20 px nus, posés entre une pastille d'état et le titre : la chose qui
          DÉCIDE de cet écran était la moins mise en scène de la page. La maquette C5 l'encadre et
          l'étiquette « HORLOGE SERVEUR » — et elle a raison, pour une raison qui n'est pas
          esthétique : ce chiffre n'est pas une information parmi d'autres, c'est le temps que le
          patient a payé.

          L'étiquette dit SERVEUR, et ce n'est pas un détail : l'horloge de ce poste n'est
          qu'indicative (RM-06-02). Un médecin qui croit son navigateur plutôt que le serveur se
          fait couper en pleine phrase.

          L'encre d'urgence est posée en style inline : `.ul-chiffre` fixe `color` et vit hors d'un
          `@layer` — un utilitaire `text-[…]` n'aurait eu aucun effet, et le rouge des deux
          dernières minutes ne se serait jamais allumé. Piège du chantier 74, déjà payé une fois.
        */}
        {s.status === 'ACTIVE' || s.status === 'PREPARING' ? (
          <span
            className={
              'flex shrink-0 flex-col items-end rounded-[10px] border px-3 py-1.5 ' +
              (reste < 120 && active
                ? 'border-[var(--erreur-bordure)] bg-[var(--erreur-fond)]'
                : 'border-border bg-[var(--fond-surface-2)]')
            }
          >
            <span
              className="ul-chiffre-ligne"
              style={{ color: reste < 120 && active ? 'var(--erreur-texte)' : undefined }}
              aria-label="Temps restant"
            >
              {mmss(reste)}
            </span>
            <span className="ul-surtitre">Horloge serveur</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-5">
        <section aria-label="Fil de la consultation" className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0">
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
              intégralement remboursée au patient et vous ne percevrez rien.
            </Avis>
          ) : null}

          <Carte
            icone={UserRound}
            titre="Échange"
            sousTitre={active ? 'Chiffré de bout en bout au repos' : "L'échange est clos et archivé"}
            pleineHauteur
          >
            {messages.isPending ? (
              <SqueletteFil nombre={4} libelle="Chargement du fil…" />
            ) : (
              <div className="max-h-[46dvh] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                <ul className="flex flex-col gap-3">
                  {/*
                    ── La ligne qui ouvre le fil — chantier 76 ──────────────────────────────────

                    La maquette C5 pose une ligne système en tête : « Consultation ouverte · échange
                    chiffré de bout en bout ». Elle n'est pas décorative — c'est le seul endroit où
                    la garantie de chiffrement se dit DANS le fil, là où les messages passent.

                    Elle ne s'affiche que s'il y a des messages : sur un fil vide, la phrase d'état
                    juste en dessous dit déjà tout, et deux phrases pour un fil vide, c'est du bruit.

                    ⚠️ **Corrigé le 11/09 (chantier 81), vu sur une capture du porteur.** La phrase
                    était FIXE : sur une consultation terminée, le fil annonçait « Consultation
                    ouverte » pendant que la pastille juste au-dessus affichait « Terminée ». Deux
                    états contraires à trois centimètres l'un de l'autre, et rien pour départager.

                    La phrase de la maquette a été recopiée sans sa condition. C'est le même défaut
                    que les emoji des réactions au chantier 79 : ce qu'on vient d'écrire, on le
                    relit tel qu'on voulait qu'il soit. **Seul l'écran en vrai état le dément.**
                  */}
                  {items.length > 0 ? (
                    <li className="flex items-center justify-center gap-1.5 pt-1 ul-aide">
                      <Lock size={11} strokeWidth={1.8} aria-hidden="true" />
                      {active
                        ? 'Consultation ouverte · échange chiffré de bout en bout'
                        : 'Consultation terminée · échange chiffré et archivé'}
                    </li>
                  ) : null}
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
                            onSignaler={() => setMessageSignale(m.id)}
                            onReagir={(emoji) => reagir.mutate({ id: m.id, emoji })}
                            onReagirLibre={() => setReactionLibre(m.id)}
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

                {/*
                  Les deux surfaces d'envoi de média — chantier 75.

                  Elles s'ouvrent AU-DESSUS de la barre de saisie et ne la remplacent pas : on peut
                  toujours voir le fil et le message qu'on était en train d'écrire. L'aperçu des
                  photos et l'enregistreur ne coexistent jamais — le micro est désactivé tant qu'un
                  aperçu est ouvert, et réciproquement.
                */}
                {apercu ? (
                  <ApercuMedias
                    fichiers={apercu}
                    enCours={envoyerPhotos.isPending}
                    onFermer={() => setApercu(null)}
                    onEnvoyer={(f) => envoyerPhotos.mutate(f)}
                  />
                ) : null}

                {vocalOuvert ? (
                  <EnregistreurVocal
                    enCours={envoyerVocal.isPending}
                    onAnnuler={() => setVocalOuvert(false)}
                    onEnvoyer={(f) => envoyerVocal.mutate(f)}
                  />
                ) : null}

                <div className="flex items-end gap-2">
                  <input
                    ref={champFichier}
                    type="file"
                    accept={MIMES_IMAGE.join(',')}
                    /* `multiple` : le serveur accepte dix photos par bulle. Sans cet attribut, la
                       capacité restait inatteignable depuis le sélecteur lui-même. */
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const choisis = Array.from(e.target.files ?? [])
                      e.target.value = ''
                      // On n'envoie plus au choix : on OUVRE l'aperçu. Voir `ApercuMedias`.
                      if (choisis.length > 0) setApercu(choisis)
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
                    disabled={envoyerPhotos.isPending || mode.type === 'edition'}
                  >
                    {envoyerPhotos.isPending ? <Spinner className="size-4" /> : <ImagePlus size={16} strokeWidth={1.6} aria-hidden="true" />}
                  </Button>
                  {/* Le micro, à côté de l'appareil photo : les deux ouvrent une surface d'envoi,
                      aucun n'envoie directement. Désactivé pendant une retouche, pour la même
                      raison que la photo. */}
                  <BoutonMicro
                    onOuvrir={() => {
                      setErreur(null)
                      setVocalOuvert(true)
                    }}
                    disabled={envoyerVocal.isPending || mode.type === 'edition'}
                  />
                  {/*
                    ── Le sélecteur d'emoji — chantier 78 ─────────────────────────────────────

                    Il INSÈRE dans le brouillon plutôt que d'envoyer : on compose une phrase, on
                    n'expédie pas un emoji isolé par accident. Et il reste ouvert après un choix —
                    on en met souvent deux.

                    Contrairement à la photo et au micro, il fonctionne aussi pendant une RETOUCHE :
                    corriger un message pour y ajouter un emoji est un usage courant, et le serveur
                    l'accepte (c'est du texte).
                  */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" size="icon" variant="outline" aria-label="Choisir un emoji">
                        <SmilePlus size={16} strokeWidth={1.6} aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-2">
                      <SelecteurEmoji
                        onChoisir={(natif) => {
                          setBrouillon((b) => b + natif)
                          champTexte.current?.focus()
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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

        <aside className="flex w-full shrink-0 flex-col gap-3 lg:min-h-0 lg:w-[22rem]">
          {/*
            ── Le rail devient un jeu d'ONGLETS NOMMÉS (chantier 83) ────────────────────────────

            Le porteur demandait deux flèches ◀ ▶ pour passer d'une carte à l'autre. Le raisonnement
            qui a conduit à faire autrement est écrit en tête de `RailInfos.tsx` ; l'essentiel tient
            en une phrase : **une information qui porte une échéance ne doit jamais dépendre d'un
            clic**, et le compte-rendu gèle des gains au bout de 24 h.

            ⚠️ **L'ordre a changé, et la raison a changé avec le contenant.** Le chantier 76 avait
            mis « Honoraires » en tête, et c'était juste : dans une PILE, le premier est celui qu'on
            voit en arrivant, et c'est la seule ligne du rail qui parle du soignant lui-même. Dans
            des ONGLETS, le premier est celui qui s'OUVRE — et ce qu'on vient chercher en ouvrant
            une consultation, c'est de quoi souffre le patient.

            *Le même argument donne deux résultats opposés selon la forme qui le porte. Quand on
            change le contenant, il faut relire les raisons, pas seulement déplacer le contenu.*
          */}
          <RailInfos
            session={s.id}
            defaut={ongletParDefaut}
            alerte={(aller) =>
              /*
                ── Le garde-fou : l'échéance ne descend jamais dans un onglet ──────────────────

                Tout système de navigation cache — c'est son métier. On n'accepte pas qu'il cache
                CELA : passé 24 h sans compte-rendu, les gains de la séance sont gelés (CU-06-03).
                La bande reste donc visible quel que soit l'onglet ouvert, et **elle conduit à la
                carte** : une alerte qui ne mène nulle part ne fait qu'inquiéter.
              */
              echeanceCompteRendu && !active ? (
                <button
                  type="button"
                  onClick={() => aller('compte-rendu')}
                  className="flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] leading-[1.4] transition-colors hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  style={{
                    borderColor: 'var(--erreur-bordure, var(--erreur-texte))',
                    background: 'var(--erreur-fond)',
                    color: 'var(--erreur-texte)',
                  }}
                >
                  <AlertTriangle size={13} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    {echeanceCompteRendu.depasse
                      ? 'Compte-rendu hors délai — vos gains sont gelés. Il reste dû.'
                      : `Compte-rendu à déposer — il reste ${dureeFr(echeanceCompteRendu.secondes)}.`}
                  </span>
                  {/*
                    Le mot d'action change avec la situation : on ne « rédige » pas une chose en
                    retard de la même façon qu'une chose à venir. Et il reste un chemin dans les
                    deux cas — le serveur accepte encore un dépôt tardif, et le compte-rendu reste
                    obligatoire (D-021). Retirer le bouton parce que c'est trop tard laisserait un
                    soignant devant un reproche sans issue.
                  */}
                  <span className="shrink-0 font-semibold underline">
                    {echeanceCompteRendu.depasse ? 'Déposer' : 'Rédiger'}
                  </span>
                </button>
              ) : null
            }
            onglets={[
              {
                id: 'contexte',
                nom: 'Contexte',
                contenu: (
                  <Carte icone={FileText} titre="Contexte patient" sousTitre="Transmis avec la pré-consultation">
                    {pre ? (
                      <>
                        <div>
                          <p className="ul-surtitre">Symptômes</p>
                          <p className="mt-0.5 text-[13px] leading-[1.55] whitespace-pre-wrap text-foreground">{pre.symptoms}</p>
                        </div>
                        {pre.sinceWhen ? (
                          <div>
                            <p className="ul-surtitre">Depuis</p>
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
                ),
              },
              /* Le Carnet n'a de sens qu'une fois la séance ouverte : avant, le serveur refuse (409). */
              ...(s.status !== 'REFUNDED'
                ? [
                    {
                      id: 'carnet',
                      nom: 'Carnet',
                      // « clos » plutôt qu'un cadenas : un mot se lit, un pictogramme se devine.
                      marque: active ? undefined : ({ texte: 'clos' } as MarqueOnglet),
                      contenu: <CarnetPatient sessionId={s.id} active={!!active} />,
                    },
                    {
                      id: 'ordonnance',
                      nom: 'Ordonnance',
                      marque: nbOrdonnances > 0 ? ({ texte: String(nbOrdonnances) } as MarqueOnglet) : undefined,
                      contenu: <PanneauOrdonnance sessionId={s.id} active={!!active} />,
                    },
                    {
                      id: 'compte-rendu',
                      nom: 'Compte-rendu',
                      marque: marqueCompteRendu,
                      contenu: <CompteRendu session={s} onDepose={rafraichir} />,
                    },
                  ]
                : []),
              ...(prixPatient !== null
                ? [
                    {
                      id: 'honoraires',
                      nom: 'Honoraires',
                      contenu: (
                        <Carte icone={Banknote} titre="Honoraires" sousTitre="Ce que le patient a payé pour cette séance">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="ul-surtitre">Prix patient</span>
                            <span className="ul-chiffre-ligne">{new Intl.NumberFormat('fr-FR').format(prixPatient)} F</span>
                          </p>
                          {/*
                            ⚠️ On ne calcule PAS le net ici. La commission vient du contrat signé du
                            soignant (RM-13-07) et diffère d'un médecin à l'autre : l'écran ne peut
                            que lire ce qui a été prélevé, et cette lecture n'existe qu'après le
                            dépôt du compte-rendu. « Mes gains » la montre ; ici on dirait un chiffre
                            faux.
                          */}
                          <p className="ul-aide">
                            Votre part nette, commission déduite, se lit dans Mes gains — elle est créditée au dépôt
                            du compte-rendu.
                          </p>
                        </Carte>
                      ),
                    },
                  ]
                : []),
              /*
                À la place de « Terminer la consultation » de la maquette. Le professionnel ne peut
                pas clore — mais il peut donner du temps, gratuitement (EF-06-07), jusqu'à PM-29.
              */
              ...(peutProlonger
                ? [
                    {
                      id: 'prolonger',
                      nom: 'Prolonger',
                      contenu: (
                        <Carte icone={HeartPulse} titre="Prolonger" sousTitre="Gratuit pour le patient">
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
                      ),
                    },
                  ]
                : []),
            ] satisfies OngletRail[]}
          />

          {/*
            ── Signaler, tout en bas du rail (chantier 41, 04/09/2026) ────────────────────────────

            Placement délibéré. Signaler est RARE — le mettre en évidence à côté des gestes de soin
            reviendrait à suggérer qu'on s'y attend. Mais l'absence de porte était pire : jusqu'ici
            personne ne pouvait créer un signalement, et toute la file de modération attendait
            derrière un bouton qui n'existait pas.

            La cible est le COMPTE du patient (`PROFILE`) et non la séance : un comportement se
            signale à propos d'une personne. Le message fautif, lui, se signale depuis sa bulle —
            l'administration a besoin de savoir LEQUEL.
          */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSignalerPatient(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[var(--texte-tertiaire)] transition-colors hover:bg-secondary hover:text-[var(--erreur-texte)] focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <Flag size={12} strokeWidth={1.6} aria-hidden="true" />
              Signaler ce patient
            </button>
          </div>
        </aside>
      </div>

      {/*
        Les deux boîtes vivent ICI, au niveau de la page, et non dans chaque bulle : une boîte de
        dialogue par message monterait autant de formulaires qu'il y a de messages, pour n'en
        montrer qu'un. Ce sont les deux états du haut qui décident lequel s'ouvre.
      */}
      <DialogueSignalement
        ouvert={signalerPatient}
        surFermer={() => setSignalerPatient(false)}
        cible="PROFILE"
        cibleId={s.patientAccountId}
        quoi="ce patient"
      />
      <DialogueSignalement
        ouvert={messageSignale !== null}
        surFermer={() => setMessageSignale(null)}
        cible="SESSION_MESSAGE"
        cibleId={messageSignale ?? ''}
        quoi="ce message"
      />

      {/*
        Le sélecteur complet en RÉACTION — le chemin qui manquait au web.

        En dialogue et non dans le menu : le sélecteur a un champ de recherche, et un champ posé
        dans un menu se fait voler ses touches par la navigation au clavier du menu. Le dialogue
        lui rend son clavier, et donne au passage un titre — « Réagir à ce message » — là où une
        grille d'emoji sans intitulé ne dit pas ce qu'elle va faire.
      */}
      <Dialog open={reactionLibre !== null} onOpenChange={(o) => (o ? undefined : setReactionLibre(null))}>
        <DialogContent className="max-w-[min(26rem,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Réagir à ce message</DialogTitle>
            <DialogDescription>
              Votre réaction remplace la précédente — une seule par message, comme sur le mobile.
            </DialogDescription>
          </DialogHeader>
          <SelecteurEmoji
            onChoisir={(emoji) => {
              if (reactionLibre) reagir.mutate({ id: reactionLibre, emoji })
              setReactionLibre(null)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
