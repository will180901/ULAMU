/**
 * Le rendu d'une pièce jointe dans une bulle — chantier 104, 12/09/2026.
 *
 * ── Le défaut que ce fichier corrige ──────────────────────────────────────────────────────────
 *
 * Depuis que le serveur accepte la vidéo et le PDF (chantier 99), on pouvait en envoyer — et **pas
 * les relire** : le fil ne connaissait que deux rendus, le son et l'image. Une vidéo reçue tombait
 * dans une balise `<img>`, c'est-à-dire nulle part. Le porteur l'a dit en une phrase : *« je ne peux
 * ni rogner la vidéo, ni la lire après l'envoi »*.
 *
 * Le modèle est la messagerie de CMS, à sa demande : image cliquable, vidéo en carte « ▶ », document
 * en fiche téléchargeable, et un lecteur plein panneau pour tout ouvrir en grand.
 *
 * ── ⚠️ Ce qu'on fait AUTREMENT que CMS, et pourquoi ───────────────────────────────────────────
 *
 * CMS télécharge chaque pièce dès que la bulle apparaît. ULAMU **ne télécharge que ce qui se regarde
 * sans être demandé** : l'image et la note vocale. Une vidéo pèse plusieurs mégaoctets — les charger
 * toutes en ouvrant un fil, sur une connexion congolaise, c'est faire payer à quelqu'un ce qu'il n'a
 * pas demandé à voir.
 *
 * *Le genre se lit dans la CLÉ* (`sm_<uuid>.mp4`), qui porte son extension depuis toujours : on sait
 * donc quoi montrer sans avoir rien téléchargé.
 */
import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, Film, Play } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { lireMediaSession } from '@/lib/api'
import { genreDeLaCle, type GenreMedia } from './media'
import { LecteurVocal } from './LecteurVocal'

/** Un média téléchargé : l'URL locale et son type réel, tel que le serveur l'a servi. */
interface Charge {
  url: string
  type: string
}

/**
 * Télécharge une pièce — et **seulement quand on le demande**.
 *
 * L'URL est libérée au démontage : une consultation ne laisse rien derrière elle dans la mémoire de
 * l'onglet.
 */
function useMedia(cle: string, actif: boolean): { charge: Charge | null; echec: boolean } {
  const [charge, setCharge] = useState<Charge | null>(null)
  const [echec, setEchec] = useState(false)

  useEffect(() => {
    if (!actif) return
    let vivant = true
    let cree: string | null = null
    lireMediaSession(cle)
      .then((f) => {
        if (!vivant) {
          URL.revokeObjectURL(f.url)
          return
        }
        cree = f.url
        setCharge({ url: f.url, type: f.type })
      })
      .catch(() => vivant && setEchec(true))
    return () => {
      vivant = false
      if (cree) URL.revokeObjectURL(cree)
    }
  }, [cle, actif])

  return { charge, echec }
}

export function PieceJointe({
  cle,
  surAccent = false,
  dureeAnnoncee,
  avatar,
  genreDeSecours,
  onOuvrir,
}: {
  cle: string
  surAccent?: boolean
  /** Voir `LecteurVocal` : la durée envoyée par l'expéditeur, avant que le son soit chargé. */
  dureeAnnoncee?: number | null
  /** La photo de l'expéditeur, pour le cercle du lecteur vocal (chantier 97). */
  avatar?: string | null
  /** Le genre qu'annonce le TYPE du message, quand la clé ne le dit pas (voir `genreDeLaCle`). */
  genreDeSecours?: GenreMedia
  /**
   * Ouvre la pièce en grand — le lecteur plein panneau.
   *
   * ⚠️ **Facultatif.** Là où aucun lecteur ne peut s'ouvrir — le Carnet, qui vit dans le rail — la
   * pièce se montre sans être cliquable. *Une commande qui ne peut pas tenir sa promesse ne doit pas
   * être offerte ; un bouton mort se remarque plus qu'un bouton absent.*
   */
  onOuvrir?: (cle: string) => void
}) {
  const genre = genreDeLaCle(cle, genreDeSecours)
  /*
    ⚠️ Image et son se chargent tout de suite : ce sont les deux qu'on regarde sans les demander, et
    les deux qui restent légers. Vidéo et document attendent le clic.
  */
  const chargeDirecte = genre === 'image' || genre === 'audio'
  const { charge, echec } = useMedia(cle, chargeDirecte)

  if (echec) return <p className="text-[11px] text-[var(--erreur-texte)]">Pièce indisponible.</p>

  if (genre === 'audio') {
    if (!charge) return <SqueletteBarre />
    return <LecteurVocal url={charge.url} surAccent={surAccent} dureeAnnoncee={dureeAnnoncee} avatar={avatar} />
  }

  if (genre === 'image') {
    if (!charge) return <span className="block h-32 w-48 animate-pulse rounded-md bg-secondary" />
    const photo = <img src={charge.url} alt="Photo transmise en consultation" className="max-h-64 rounded-md" />
    if (!onOuvrir) return photo
    return (
      <button
        type="button"
        onClick={() => onOuvrir(cle)}
        aria-label="Voir la photo en grand"
        className="block max-w-full rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        {photo}
      </button>
    )
  }

  if (genre === 'video') {
    /*
      ⚠️ **Rien n'est téléchargé tant qu'on n'a pas cliqué.** La carte dit ce qu'elle contient — un
      film, son nom de fichier — et le ▶ ouvre le lecteur. *Charger dix vidéos pour en regarder une
      est un coût qu'on fait payer à quelqu'un qui n'a rien demandé.*
    */
    return (
      <button
        type="button"
        onClick={() => onOuvrir?.(cle)}
        disabled={!onOuvrir}
        aria-label="Lire la vidéo"
        className="flex h-[132px] w-[220px] max-w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-[#0B1220] text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-white/20">
          <Play size={20} strokeWidth={2} fill="currentColor" />
        </span>
        <span className="flex items-center gap-1 text-[11px] text-white/80">
          <Film size={11} strokeWidth={1.8} aria-hidden="true" />
          Vidéo
        </span>
      </button>
    )
  }

  // Document : une fiche. Un PDF ne se rend jamais dans la page — il s'ouvre isolé.
  return (
    <button
      type="button"
      onClick={() => onOuvrir?.(cle)}
      disabled={!onOuvrir}
      aria-label="Ouvrir le document"
      className={
        'flex w-[240px] max-w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
        (surAccent ? 'border-white/25 bg-white/10' : 'border-border bg-[var(--fond-surface-2)]')
      }
    >
      <span
        aria-hidden="true"
        className={
          'flex size-9 shrink-0 items-center justify-center rounded-md ' +
          (surAccent ? 'bg-white/20 text-white' : 'bg-[var(--ap-50)] text-[var(--ap-600)]')
        }
      >
        <FileText size={17} strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={'block truncate text-[12.5px] font-medium ' + (surAccent ? 'text-white' : 'text-foreground')}>
          Document
        </span>
        <span className={'block text-[11px] ' + (surAccent ? 'text-white/70' : 'text-[var(--texte-tertiaire)]')}>
          PDF · à ouvrir
        </span>
      </span>
    </button>
  )
}

function SqueletteBarre() {
  return (
    <span className="flex h-[38px] w-[244px] max-w-full items-center gap-2 rounded-md bg-secondary px-2">
      <Spinner className="size-4" />
    </span>
  )
}

/**
 * Le lecteur plein panneau — chantier 104.
 *
 * Il couvre le fil, comme l'aperçu avant envoi, et pour la même raison : *une photo de soin à la
 * taille d'une bulle ne se lit pas, et une vidéo encore moins.* Lecture seule — voir, écouter,
 * fermer.
 *
 * ⚠️ **Pas de téléchargement proposé.** CMS en offre un ; ici les pièces sont des données de santé
 * servies aux deux seules personnes autorisées. *Ajouter un bouton qui les pose en clair sur un
 * disque partagé est une décision de produit, pas une commodité d'écran* — elle n'a pas été prise.
 */
export function LecteurPiece({ cle, onFermer }: { cle: string; onFermer: () => void }) {
  const { charge, echec } = useMedia(cle, true)
  const genre: GenreMedia = charge ? genreDuType(charge.type) : genreDeLaCle(cle)

  return (
    <div
      role="group"
      aria-label="Pièce en grand"
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-card"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="flex size-8 items-center justify-center rounded-md text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          ✕
        </button>
        <span className="min-w-0 flex-1">
          <span className="block ul-titre-panneau">
            {genre === 'video' ? 'Vidéo' : genre === 'image' ? 'Photo' : genre === 'audio' ? 'Note vocale' : 'Document'}
          </span>
          <span className="block ul-aide">Transmis dans cette consultation</span>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--fond-surface-2)] p-3">
        {echec ? (
          <span className="flex items-center gap-2 text-[13px] text-[var(--erreur-texte)]">
            <AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />
            Cette pièce n'a pas pu être ouverte.
          </span>
        ) : !charge ? (
          <span className="flex items-center gap-2 ul-aide">
            <Spinner className="size-4" /> Ouverture…
          </span>
        ) : genre === 'video' ? (
          <video src={charge.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-md bg-black" />
        ) : genre === 'image' ? (
          <img src={charge.url} alt="Pièce transmise en consultation" className="max-h-full max-w-full rounded-md object-contain" />
        ) : genre === 'audio' ? (
          <audio src={charge.url} controls autoPlay className="w-72 max-w-full" />
        ) : (
          /*
            ⚠️ Le PDF s'ouvre dans un cadre ISOLÉ (`sandbox`), jamais dans le contexte de
            l'application : un PDF peut embarquer du script, et celui-ci ne doit rien pouvoir lire
            de la consultation autour. Même précaution que pour les pièces de vérification.
          */
          <iframe
            src={charge.url}
            title="Document transmis en consultation"
            sandbox=""
            className="size-full rounded-md border border-border bg-white"
          />
        )}
      </div>
    </div>
  )
}

function genreDuType(mime: string): GenreMedia {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}
