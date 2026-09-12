/**
 * L'aperçu avant envoi — chantier 75, refait au chantier 101 (12/09/2026).
 *
 * ── Les deux défauts d'origine, toujours valables ─────────────────────────────────────────────
 *
 * **1. On envoyait à l'aveugle.** Choisir un fichier l'expédiait immédiatement. Dans une
 * consultation, une pièce jointe est un acte médical : on veut voir ce qu'on transmet avant de le
 * transmettre, et pouvoir renoncer.
 *
 * **2. La limite se découvrait par l'échec.** Le serveur refuse au-delà de 8 Mo, et l'écran n'en
 * disait rien : un fichier de 20 Mo traversait le réseau en entier avant d'être rejeté.
 *
 * ── Ce que le chantier 101 change, et pourquoi ────────────────────────────────────────────────
 *
 * L'écran ne montrait que des **vignettes carrées de photos**. Depuis que le serveur accepte la
 * vidéo, l'audio et le PDF, une vignette ne dit plus rien : *une vidéo réduite à un carré gris ne
 * se vérifie pas — on ne sait ni ce qu'elle montre, ni où elle commence.*
 *
 * Le modèle est la messagerie de CMS, sur demande du porteur. Quatre pièces :
 *
 *   • le média en GRAND, joué pour de vrai (image, lecteur vidéo, lecteur audio, fiche de document) ;
 *   • une bande de MINIATURES pour passer de l'un à l'autre, avec sa croix de retrait et son « + » ;
 *   • une LÉGENDE, envoyée avec les pièces ;
 *   • le ROGNEUR de vidéo, avec sa pellicule.
 *
 * ⚠️ **Il couvre le fil, alors que le chantier 75 avait décidé l'inverse** (« on peut toujours voir
 * le fil et le message qu'on était en train d'écrire »). Cette raison valait pour trois vignettes de
 * 96 px ; elle ne vaut plus pour un rogneur, qui a besoin de hauteur. *Et l'on ne lit pas la
 * conversation pendant qu'on découpe une vidéo.* L'en-tête de la carte — le nom du patient, le
 * minuteur — reste visible au-dessus : on ne perd donc pas le contexte, seulement le fil.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, FileText, Music, Plus, Scissors, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  compresserImage,
  formatDuree,
  formatOctets,
  genreDuMime,
  LIMITE_OCTETS,
  MIMES_AUDIO,
  MIMES_DOCUMENT,
  MIMES_IMAGE,
  MIMES_VIDEO,
  PHOTOS_MAX,
  refusDEnvoi,
  type GenreMedia,
} from './media'
import { debitPourTenir, dureeMedia, peutRogner, poidsEstime, portionMaximale, rognerVideo, vignettes } from './rogneur'

const TOUS = [...MIMES_IMAGE, ...MIMES_VIDEO, ...MIMES_AUDIO, ...MIMES_DOCUMENT].join(',')

let compteur = 0

/** Une pièce retenue, avec tout ce qu'il faut pour la montrer et décider si elle passera. */
interface Piece {
  id: string
  fichier: File
  genre: GenreMedia
  url: string
  refus: string | null
  /** Ce que la compression a gagné — dit, parce qu'un poids qui change sans explication inquiète. */
  note?: string
  duree?: number
  /** La plus longue portion gardable : bornée par 30 s ET par le poids (voir `rogneur.ts`). */
  portionMax?: number
  /** Vrai quand le film ENTIER ne passe pas : le rognage n'est alors plus une option. */
  rognageRequis?: boolean
  debut?: number
  fin?: number
}

/**
 * Prépare une pièce : compression des images, durée des médias, fenêtre initiale du rogneur.
 *
 * ⚠️ **La compression se fait ICI et non à l'envoi.** Le chantier 75 l'avait mise à l'envoi pour
 * afficher le poids que l'utilisateur reconnaît. C'était juste tant que rien ne l'expliquait ;
 * maintenant que l'écran DIT « 4,2 Mo → 890 Ko », montrer le résultat vaut mieux que montrer une
 * promesse. *Un poids affiché doit être celui qui partira.*
 */
async function preparer(f: File): Promise<Piece> {
  const genre = genreDuMime(f.type)
  const base: Piece = {
    id: `p${++compteur}`,
    fichier: f,
    genre,
    url: URL.createObjectURL(f),
    refus: refusDEnvoi(f),
  }
  if (base.refus) return base

  if (genre === 'image') {
    const avant = f.size
    const compressee = await compresserImage(f)
    if (compressee !== f) {
      URL.revokeObjectURL(base.url)
      base.fichier = compressee
      base.url = URL.createObjectURL(compressee)
      if (compressee.size < avant * 0.92) {
        base.note = `allégée : ${formatOctets(avant)} → ${formatOctets(compressee.size)}`
      }
    }
    base.refus = refusDEnvoi(base.fichier)
    return base
  }

  if (genre === 'video') {
    const d = await dureeMedia(f, 'video')
    base.duree = d
    if (d > 0) {
      const entierPasse = f.size <= LIMITE_OCTETS
      const max = entierPasse ? Math.min(d, portionMaximale(f.size, d)) : portionMaximale(f.size, d)
      base.portionMax = max
      base.rognageRequis = !entierPasse || d > max + 0.5
      base.debut = 0
      base.fin = Math.min(d, max)
    } else if (f.size > LIMITE_OCTETS) {
      // Durée illisible ET fichier trop lourd : on ne peut rien proposer d'honnête.
      base.refus = `${formatOctets(f.size)} — vidéo illisible, impossible d'en extraire un passage.`
    }
    return base
  }

  if (genre === 'audio') {
    const d = await dureeMedia(f, 'audio')
    base.duree = d || undefined
  }
  return base
}

export function ApercuMedias({
  fichiers,
  onFermer,
  onEnvoyer,
  enCours,
}: {
  /** La première sélection, venue du trombone de la barre de saisie. */
  fichiers: File[]
  onFermer: () => void
  onEnvoyer: (f: File[], legende: string) => void
  enCours: boolean
}) {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [active, setActive] = useState(0)
  const [legende, setLegende] = useState('')
  const [prepare, setPrepare] = useState(true)
  const [travail, setTravail] = useState<number | null>(null)
  const champAjout = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])

  useEffect(() => {
    let annule = false
    setPrepare(true)
    void Promise.all(fichiers.slice(0, PHOTOS_MAX).map(preparer)).then((p) => {
      if (annule) {
        p.forEach((x) => URL.revokeObjectURL(x.url))
        return
      }
      p.forEach((x) => urls.current.push(x.url))
      setPieces(p)
      setPrepare(false)
    })
    return () => {
      annule = true
    }
  }, [fichiers])

  // Les URL d'aperçu sont libérées au démontage — une consultation ne garde rien en mémoire.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const ajouter = useCallback(async (liste: FileList | null) => {
    if (!liste?.length) return
    setPrepare(true)
    const place = PHOTOS_MAX - pieces.length
    const ajoutees = await Promise.all(Array.from(liste).slice(0, Math.max(0, place)).map(preparer))
    ajoutees.forEach((x) => urls.current.push(x.url))
    setPieces((p) => [...p, ...ajoutees].slice(0, PHOTOS_MAX))
    setPrepare(false)
  }, [pieces.length])

  const retirer = (i: number) => {
    setPieces((p) => {
      const reste = p.filter((_, j) => j !== i)
      setActive((a) => (a >= reste.length ? Math.max(0, reste.length - 1) : a))
      return reste
    })
  }

  const poser = (id: string, debut: number, fin: number) =>
    setPieces((p) => p.map((x) => (x.id === id ? { ...x, debut, fin } : x)))

  const courante = pieces[active]
  const refusees = pieces.filter((p) => p.refus !== null)
  const bonnes = pieces.filter((p) => p.refus === null)
  const poidsTotal = bonnes.reduce((t, p) => t + p.fichier.size, 0)
  const peutEnvoyer = !prepare && travail === null && !enCours && bonnes.length > 0 && refusees.length === 0

  /**
   * Envoie — en découpant d'abord les vidéos qui le demandent.
   *
   * ⚠️ **Le poids se vérifie sur l'EXTRAIT, pas sur l'estimation.** L'estimation suppose un débit
   * constant ; le débit réel varie d'un plan à l'autre. *Une estimation sert à prévenir, pas à
   * promettre — c'est le fichier produit qui décide.*
   */
  const envoyer = async () => {
    if (!peutEnvoyer) return
    const sortie: File[] = []
    try {
      for (let i = 0; i < bonnes.length; i += 1) {
        const p = bonnes[i]
        const rogner =
          p.genre === 'video' &&
          p.duree !== undefined &&
          p.debut !== undefined &&
          p.fin !== undefined &&
          (p.rognageRequis || p.debut > 0.15 || p.fin < p.duree - 0.15)

        if (!rogner) {
          sortie.push(p.fichier)
          continue
        }
        if (!peutRogner()) {
          setPieces((tout) =>
            tout.map((x) =>
              x.id === p.id
                ? { ...x, refus: 'Ce navigateur ne sait pas découper une vidéo — envoyez un film plus court.' }
                : x,
            ),
          )
          return
        }
        setTravail(0)
        const portion = Math.max(0.5, (p.fin ?? 0) - (p.debut ?? 0))
        const extrait = await rognerVideo(
          p.fichier,
          p.debut ?? 0,
          p.fin ?? 0,
          (q) => setTravail(q),
          debitPourTenir(p.fichier.size, p.duree ?? 1, portion),
        )
        setTravail(null)
        if (extrait.size > LIMITE_OCTETS) {
          setPieces((tout) =>
            tout.map((x) =>
              x.id === p.id
                ? {
                    ...x,
                    refus: `L'extrait pèse ${formatOctets(extrait.size)} — maximum ${formatOctets(LIMITE_OCTETS)}. Gardez un passage plus court.`,
                  }
                : x,
            ),
          )
          return
        }
        sortie.push(extrait)
      }
      onEnvoyer(sortie, legende.trim())
    } catch {
      setTravail(null)
      setPieces((tout) =>
        tout.map((x) => (x.genre === 'video' ? { ...x, refus: "La découpe a échoué — essayez un passage plus court." } : x)),
      )
    }
  }

  return (
    <div
      role="group"
      aria-label="Aperçu avant envoi"
      className="absolute inset-0 z-20 flex min-h-0 flex-col bg-card"
    >
      {/* En-tête : ce qu'on regarde, son poids, sa durée, et où l'on en est dans la pile. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Button type="button" size="icon" variant="ghost" aria-label="Annuler l'envoi" onClick={onFermer} disabled={enCours || travail !== null}>
          <X size={16} strokeWidth={1.6} aria-hidden="true" />
        </Button>
        <span className="min-w-0 flex-1">
          <span className="block truncate ul-titre-panneau">{courante?.fichier.name ?? 'Aperçu'}</span>
          <span className="block ul-aide">
            {courante ? formatOctets(courante.fichier.size) : formatOctets(poidsTotal)}
            {courante?.duree ? ` · ${formatDuree(courante.duree)}` : ''}
            {pieces.length > 1 ? ` · ${active + 1}/${pieces.length}` : ''}
          </span>
        </span>
      </div>

      {/* L'aperçu, en grand. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[var(--fond-surface-2)] p-3">
        {prepare && pieces.length === 0 ? (
          <span className="flex items-center gap-2 ul-aide">
            <Spinner className="size-4" /> Préparation…
          </span>
        ) : courante ? (
          <ApercuPrincipal piece={courante} onFenetre={(d, f) => poser(courante.id, d, f)} />
        ) : (
          <span className="ul-aide">Aucune pièce à envoyer.</span>
        )}

        {courante?.refus ? (
          <span className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] px-3 py-1 text-[11px] font-semibold text-[var(--erreur-texte)]">
            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
            {courante.refus}
          </span>
        ) : courante?.note ? (
          <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-[var(--succes-bordure)] bg-[var(--succes-fond)] px-3 py-1 text-[11px] font-semibold text-[var(--succes-texte)]">
            {courante.note}
          </span>
        ) : null}
      </div>

      {/* La légende, envoyée avec les pièces. */}
      <div className="shrink-0 border-t border-border px-3 py-2">
        <label className="sr-only" htmlFor="legende-pieces">
          Légende
        </label>
        <input
          id="legende-pieces"
          value={legende}
          onChange={(e) => setLegende(e.target.value)}
          disabled={enCours || travail !== null}
          placeholder="Ajouter une légende…"
          maxLength={4000}
          className="h-9 w-full rounded-full border border-border bg-[var(--fond-surface-2)] px-4 text-[13px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </div>

      {/* Les miniatures, le « + », et l'envoi. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
        <ul className="m-0 flex min-w-0 flex-1 list-none items-center gap-2 overflow-x-auto p-0">
          {pieces.map((p, i) => (
            <li key={p.id} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                disabled={enCours || travail !== null}
                aria-label={`Voir ${p.fichier.name}`}
                aria-current={i === active}
                className={
                  'flex size-12 items-center justify-center overflow-hidden rounded-md border-2 bg-[var(--fond-surface-2)] ' +
                  (i === active
                    ? 'border-[var(--ap-400)]'
                    : p.refus
                      ? 'border-[var(--erreur-bordure)]'
                      : 'border-border')
                }
              >
                <Miniature piece={p} />
              </button>
              <button
                type="button"
                aria-label={`Retirer ${p.fichier.name}`}
                onClick={() => retirer(i)}
                disabled={enCours || travail !== null}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-card text-foreground"
              >
                <X size={10} strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
          {pieces.length < PHOTOS_MAX ? (
            <li className="shrink-0">
              <button
                type="button"
                aria-label="Ajouter une pièce"
                onClick={() => champAjout.current?.click()}
                disabled={enCours || prepare || travail !== null}
                className="flex size-12 items-center justify-center rounded-md border border-dashed border-[var(--bordure-normale)] text-[var(--texte-tertiaire)]"
              >
                {prepare ? <Spinner className="size-4" /> : <Plus size={16} strokeWidth={1.6} aria-hidden="true" />}
              </button>
              <input
                ref={champAjout}
                type="file"
                accept={TOUS}
                multiple
                className="sr-only"
                onChange={(e) => {
                  void ajouter(e.target.files)
                  e.target.value = ''
                }}
              />
            </li>
          ) : null}
        </ul>

        <Button type="button" onClick={() => void envoyer()} disabled={!peutEnvoyer} className="shrink-0 rounded-full">
          {enCours || travail !== null ? <Spinner className="size-4" /> : <Send size={16} strokeWidth={1.6} aria-hidden="true" />}
          Envoyer
        </Button>
      </div>

      {/*
        ⚠️ Le voile de découpe. Le ré-encodage prend le TEMPS DE L'EXTRAIT — jusqu'à trente secondes.
        *Une demi-minute sans un mot fait croire que l'application est morte ;* la barre dit que le
        travail avance, et le chiffre dit combien il en reste.
      */}
      {travail !== null ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[color-mix(in_srgb,var(--fond-surface)_92%,transparent)]">
          <Scissors size={24} strokeWidth={1.6} aria-hidden="true" className="text-[var(--ap-400)]" />
          <span className="text-[13px] font-semibold text-foreground">Découpe de l'extrait…</span>
          <span
            role="progressbar"
            aria-valuenow={Math.round(travail * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de la découpe"
            className="h-1.5 w-48 overflow-hidden rounded-full bg-[var(--fond-surface-2)]"
          >
            <span className="block h-full bg-[var(--ap-400)] transition-[width]" style={{ width: `${Math.round(travail * 100)}%` }} />
          </span>
          <span className="ul-aide">La découpe dure le temps du passage gardé.</span>
        </div>
      ) : null}
    </div>
  )
}

/** La vignette d'une pièce dans la bande du bas — une image, ou l'icône de son genre. */
function Miniature({ piece }: { piece: Piece }) {
  if (piece.genre === 'image') return <img src={piece.url} alt="" className="size-full object-cover" />
  if (piece.genre === 'video') return <video src={piece.url} muted className="size-full object-cover" aria-hidden="true" />
  if (piece.genre === 'audio') return <Music size={16} strokeWidth={1.6} aria-hidden="true" />
  return <FileText size={16} strokeWidth={1.6} aria-hidden="true" />
}

/** Le média en grand — joué pour de vrai, parce qu'une vignette ne se vérifie pas. */
function ApercuPrincipal({ piece, onFenetre }: { piece: Piece; onFenetre: (debut: number, fin: number) => void }) {
  if (piece.genre === 'image') {
    return <img src={piece.url} alt={piece.fichier.name} className="max-h-full max-w-full rounded-md object-contain" />
  }
  if (piece.genre === 'video') return <ApercuVideo piece={piece} onFenetre={onFenetre} />
  if (piece.genre === 'audio') {
    return (
      <span className="flex flex-col items-center gap-2">
        <Music size={28} strokeWidth={1.5} aria-hidden="true" className="text-[var(--ap-400)]" />
        {/* Le lecteur natif suffit : ce son n'est pas encore un message, c'est un fichier qu'on vérifie. */}
        <audio src={piece.url} controls className="w-64" />
      </span>
    )
  }
  return (
    <span className="flex flex-col items-center gap-2 text-center">
      <FileText size={28} strokeWidth={1.5} aria-hidden="true" className="text-[var(--ap-400)]" />
      <span className="max-w-64 truncate text-[13px] text-foreground">{piece.fichier.name}</span>
      <span className="ul-aide">{formatOctets(piece.fichier.size)}</span>
    </span>
  )
}

/**
 * La vidéo, et son rogneur.
 *
 * La **pellicule** est ce qui rend le geste possible : *choisir un passage dans une barre grise,
 * c'est choisir au hasard.* La fenêtre se déplace d'un bloc — sa largeur est la portion maximale, et
 * elle ne se redimensionne pas : une poignée de 8 px sur un téléphone ne s'attrape pas, et on veut
 * la durée la plus longue qui passe, pas une plus courte.
 */
function ApercuVideo({ piece, onFenetre }: { piece: Piece; onFenetre: (debut: number, fin: number) => void }) {
  const [images, setImages] = useState<string[]>([])
  const pellicule = useRef<HTMLDivElement>(null)
  const duree = piece.duree ?? 0
  const portion = Math.max(0.5, (piece.fin ?? 0) - (piece.debut ?? 0))

  useEffect(() => {
    let annule = false
    setImages([])
    if (duree <= 0) return
    void vignettes(piece.url, duree, 12).then((v) => {
      if (!annule) setImages(v)
    })
    return () => {
      annule = true
    }
  }, [piece.url, duree])

  /** Déplace la fenêtre : le point cliqué devient son CENTRE, borné aux deux extrémités. */
  const deplacer = (clientX: number) => {
    const el = pellicule.current
    if (!el || duree <= 0) return
    const r = el.getBoundingClientRect()
    const part = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const centre = part * duree
    const debut = Math.min(Math.max(0, centre - portion / 2), Math.max(0, duree - portion))
    onFenetre(debut, Math.min(duree, debut + portion))
  }

  if (duree <= 0) {
    return <video src={piece.url} controls className="max-h-full max-w-full rounded-md" />
  }

  const gauche = ((piece.debut ?? 0) / duree) * 100
  const largeur = (portion / duree) * 100
  const estime = poidsEstime(piece.fichier.size, duree, portion)

  return (
    <span className="flex min-h-0 w-full flex-col items-center gap-2">
      <video src={piece.url} controls className="min-h-0 w-full flex-1 rounded-md object-contain" />

      {piece.rognageRequis || portion < duree - 0.5 ? (
        <span className="w-full max-w-[520px]">
          <span className="mb-1 flex items-center justify-between text-[11px] text-[var(--texte-tertiaire)]">
            <span className="flex items-center gap-1">
              <Scissors size={11} strokeWidth={2} aria-hidden="true" />
              {piece.rognageRequis ? 'Choisissez le passage à envoyer' : 'Passage retenu'}
            </span>
            <span className="ul-chiffre-clair tabular-nums">
              {formatDuree(piece.debut ?? 0)} → {formatDuree(piece.fin ?? 0)} · ≈ {formatOctets(estime)}
            </span>
          </span>

          <span
            ref={pellicule}
            role="slider"
            tabIndex={0}
            aria-label="Début du passage à envoyer"
            aria-valuemin={0}
            aria-valuemax={Math.round(Math.max(0, duree - portion))}
            aria-valuenow={Math.round(piece.debut ?? 0)}
            aria-valuetext={`de ${formatDuree(piece.debut ?? 0)} à ${formatDuree(piece.fin ?? 0)}`}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              deplacer(e.clientX)
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) deplacer(e.clientX)
            }}
            /* Au clavier aussi : une commande qui n'existe qu'à la souris n'existe pas pour tout le monde. */
            onKeyDown={(e) => {
              const pas = e.shiftKey ? 5 : 1
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const delta = e.key === 'ArrowLeft' ? -pas : pas
                const debut = Math.min(Math.max(0, (piece.debut ?? 0) + delta), Math.max(0, duree - portion))
                onFenetre(debut, Math.min(duree, debut + portion))
              }
            }}
            className="relative flex h-12 w-full cursor-pointer overflow-hidden rounded-md border border-border bg-[var(--fond-surface-2)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {images.length > 0
              ? images.map((src, i) => (
                  <img key={i} src={src} alt="" aria-hidden="true" className="h-full min-w-0 flex-1 object-cover opacity-70" />
                ))
              : null}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 rounded-[4px] border-2 border-[var(--ap-400)] bg-[color-mix(in_srgb,var(--ap-400)_18%,transparent)]"
              style={{ left: `${gauche}%`, width: `${largeur}%` }}
            />
          </span>
        </span>
      ) : null}
    </span>
  )
}
