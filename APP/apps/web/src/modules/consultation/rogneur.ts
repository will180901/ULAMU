/**
 * Le rogneur de vidéo — chantier 100, 12/09/2026.
 *
 * ── Pourquoi une vidéo doit être rognée ───────────────────────────────────────────────────────
 *
 * Le stockage plafonne à **8 Mo** (`LIMITE_OCTETS`), et une vidéo de téléphone pèse de 1 à 4 Mo par
 * seconde. Trois secondes de film peuvent déjà dépasser. Sans découpe, ouvrir la vidéo aux
 * consultations reviendrait à l'ouvrir puis à la refuser presque toujours — *une porte qu'on montre
 * et qu'on ferme.*
 *
 * Le porteur a tranché : **le rogneur est obligatoire**, sur le web comme sur le téléphone.
 *
 * ── ⚠️ Ce qu'on NE reprend pas de CMS, et pourquoi ────────────────────────────────────────────
 *
 * CMS découpe d'abord avec **ffmpeg.wasm** — une copie de flux, quasi instantanée — et ne retombe
 * sur `MediaRecorder` qu'en second. Le cœur ffmpeg pèse **31 Mo**, versionnés dans leur dépôt et
 * téléchargés au premier usage.
 *
 * ULAMU n'a que le second chemin, et c'est un choix mesuré : *sur une connexion congolaise,
 * télécharger 31 Mo pour économiser vingt secondes de traitement est une mauvaise affaire.* Le
 * ré-encodage prend le temps de l'extrait — trente secondes au pire, avec une barre de progression
 * honnête — et ne coûte pas un octet de réseau.
 *
 * La porte reste ouverte : si le porteur constate que l'attente gêne, `rognerVideo` peut recevoir
 * un chemin rapide sans que rien d'autre bouge.
 *
 * ── Le piège du débit ─────────────────────────────────────────────────────────────────────────
 *
 * `MediaRecorder` choisi sans consigne produit un fichier **plus gros que l'original**. On borne
 * donc le débit à ce que la limite autorise pour la durée retenue. *Un rogneur qui rend un extrait
 * plus lourd que le film n'a rien rogné du tout.*
 */
import { LIMITE_OCTETS, VIDEO_MAX_S } from './media'

/**
 * La durée d'un fichier, lue dans ses métadonnées.
 *
 * ⚠️ **`duration` peut valoir `Infinity`** sur un WebM produit par un enregistreur : la durée n'est
 * écrite dans le conteneur qu'à la fermeture, et le navigateur ne la connaît qu'après avoir cherché
 * la fin. On force donc la recherche en sautant très loin.
 *
 * Rend `0` si rien ne se charge — *un aperçu qui attend indéfiniment une métadonnée est pire qu'un
 * aperçu qui avoue ne pas savoir.*
 */
export function dureeMedia(fichier: File, genre: 'video' | 'audio'): Promise<number> {
  return new Promise((resoudre) => {
    const el = document.createElement(genre) as HTMLMediaElement
    el.preload = 'metadata'
    const url = URL.createObjectURL(fichier)
    let fini = false

    const rendre = (d: number) => {
      if (fini) return
      fini = true
      clearTimeout(minuteur)
      URL.revokeObjectURL(url)
      el.removeAttribute('src')
      try {
        el.load()
      } catch {
        /* sans conséquence */
      }
      resoudre(d)
    }

    const minuteur = setTimeout(() => rendre(0), 5000)
    el.onloadedmetadata = () => {
      if (!Number.isFinite(el.duration)) {
        el.ontimeupdate = () => {
          el.ontimeupdate = null
          rendre(Number.isFinite(el.duration) ? el.duration : 0)
        }
        try {
          el.currentTime = 1e7
        } catch {
          rendre(0)
        }
        return
      }
      rendre(el.duration)
    }
    el.onerror = () => rendre(0)
    el.src = url
  })
}

/**
 * La plus longue portion sélectionnable, en secondes.
 *
 * Deux bornes, et la seconde est celle qu'on oublie : la **durée maximale** voulue (30 s), et ce
 * que la **limite de poids** autorise au débit du fichier. Une vidéo 4K de dix secondes peut peser
 * 40 Mo : sa portion tient en deux secondes, pas en trente.
 *
 * La marge de 10 % couvre l'en-tête du conteneur et l'arrondi sur l'image-clé.
 */
export function portionMaximale(taille: number, duree: number): number {
  if (!(duree > 0)) return VIDEO_MAX_S
  const octetsParSeconde = taille / duree
  const parLePoids = octetsParSeconde > 0 ? (LIMITE_OCTETS * 0.9) / octetsParSeconde : VIDEO_MAX_S
  return Math.max(1, Math.min(VIDEO_MAX_S, parLePoids, duree))
}

/**
 * Le poids estimé d'une portion, à débit constant.
 *
 * ⚠️ C'est une **estimation**, affichée comme telle : le débit réel d'une vidéo varie d'un plan à
 * l'autre. Elle sert à prévenir avant l'envoi, pas à promettre. Le poids vrai est mesuré sur
 * l'extrait produit, et c'est lui qui décide.
 */
export function poidsEstime(taille: number, duree: number, portion: number): number {
  if (!(duree > 0)) return taille
  return Math.round((taille / duree) * portion)
}

/** Ce navigateur sait-il découper une vidéo ? Sans cela, la vidéo trop lourde n'a aucun remède. */
export function peutRogner(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLMediaElement !== 'undefined' &&
    ('captureStream' in HTMLMediaElement.prototype || 'mozCaptureStream' in HTMLMediaElement.prototype)
  )
}

/**
 * Le débit à demander pour que l'extrait TIENNE sous la limite.
 *
 * ⚠️ **Sans consigne, `MediaRecorder` produit souvent plus gros que l'original.** On prend donc le
 * plus petit de deux débits : celui de la source (inutile de dépasser sa qualité) et celui que la
 * limite autorise pour la durée retenue. Le plancher de 300 kbit/s empêche une bouillie
 * illisible — *une vidéo de soin qu'on ne peut pas regarder ne vaut pas mieux qu'une absente.*
 */
export function debitPourTenir(taille: number, duree: number, portion: number): number {
  const parSeconde = duree > 0 ? (taille * 8) / duree : 1_200_000
  const budget = (LIMITE_OCTETS * 0.82 * 8) / Math.max(0.5, portion)
  return Math.round(Math.max(300_000, Math.min(4_000_000, parSeconde, budget)))
}

/**
 * La pellicule : `nombre` vignettes réparties sur la durée.
 *
 * C'est ce qui rend le rogneur utilisable — *choisir un passage dans une barre grise, c'est choisir
 * au hasard.* Le décodage se fait par sauts successifs ; il dégrade en liste partielle ou vide
 * plutôt que d'échouer, car une pellicule manquante gêne, une pellicule qui bloque empêche.
 */
export function vignettes(url: string, duree: number, nombre = 12, l = 96, h = 56): Promise<string[]> {
  return new Promise((resoudre) => {
    if (!(duree > 0)) {
      resoudre([])
      return
    }
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.preload = 'auto'
    const toile = document.createElement('canvas')
    toile.width = l
    toile.height = h
    const ctx = toile.getContext('2d')
    const sorties: string[] = []
    const instants = Array.from({ length: nombre }, (_, k) =>
      Math.min(duree * 0.999, (duree * (k + 0.5)) / nombre),
    )
    let i = 0
    let fini = false

    const terminer = () => {
      if (fini) return
      fini = true
      clearTimeout(minuteur)
      v.removeAttribute('src')
      try {
        v.load()
      } catch {
        /* sans conséquence */
      }
      resoudre(sorties)
    }

    const saisir = () => {
      if (i >= instants.length) {
        terminer()
        return
      }
      try {
        v.currentTime = instants[i]
      } catch {
        terminer()
      }
    }

    v.onloadeddata = () => saisir()
    v.onseeked = () => {
      try {
        if (ctx) {
          ctx.drawImage(v, 0, 0, l, h)
          sorties.push(toile.toDataURL('image/jpeg', 0.55))
        }
      } catch {
        /* une vignette manquante n'arrête pas la pellicule */
      }
      i += 1
      saisir()
    }
    v.onerror = () => terminer()
    const minuteur = setTimeout(terminer, 12_000)
  })
}

/**
 * Découpe `[debut, fin]` et rend un nouveau fichier WebM.
 *
 * Le film est joué **muet** dans un élément caché, son flux est capté et ré-enregistré. Le temps de
 * traitement est donc celui de l'extrait — trente secondes au pire. `onProgres` va de 0 à 1 : sans
 * elle, l'écran resterait figé pendant une demi-minute sans rien dire.
 */
export async function rognerVideo(
  fichier: File,
  debut: number,
  fin: number,
  onProgres?: (p: number) => void,
  debitVideo?: number,
): Promise<File> {
  if (!peutRogner()) throw new Error('rognage-indisponible')
  const portion = Math.max(0.1, fin - debut)
  const url = URL.createObjectURL(fichier)
  const v = document.createElement('video')
  v.src = url
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'

  const nettoyer = (flux?: MediaStream) => {
    try {
      flux?.getTracks().forEach((p) => p.stop())
    } catch {
      /* sans conséquence */
    }
    try {
      v.pause()
    } catch {
      /* sans conséquence */
    }
    v.removeAttribute('src')
    try {
      v.load()
    } catch {
      /* sans conséquence */
    }
    URL.revokeObjectURL(url)
  }

  try {
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res()
      v.onerror = () => rej(new Error('video-illisible'))
      setTimeout(() => rej(new Error('video-trop-lente')), 8000)
    })

    const candidats = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    const mime = candidats.find((c) => MediaRecorder.isTypeSupported(c)) ?? 'video/webm'
    const source = v as HTMLVideoElement & {
      captureStream?: () => MediaStream
      mozCaptureStream?: () => MediaStream
    }
    const flux = source.captureStream ? source.captureStream() : source.mozCaptureStream?.()
    if (!flux) throw new Error('rognage-indisponible')

    const enregistreur = new MediaRecorder(flux, {
      mimeType: mime,
      videoBitsPerSecond: debitVideo ?? 1_200_000,
      audioBitsPerSecond: 96_000,
    })
    const morceaux: BlobPart[] = []
    enregistreur.ondataavailable = (e) => {
      if (e.data && e.data.size) morceaux.push(e.data)
    }
    const arrete = new Promise<void>((res) => {
      enregistreur.onstop = () => res()
    })

    await new Promise<void>((res) => {
      v.onseeked = () => res()
      v.currentTime = Math.max(0, debut)
    })
    enregistreur.start(150)
    await v.play()

    await new Promise<void>((res) => {
      const battre = () => {
        onProgres?.(Math.min(1, (v.currentTime - debut) / portion))
        if (v.currentTime >= fin - 0.03 || v.ended) res()
        else requestAnimationFrame(battre)
      }
      requestAnimationFrame(battre)
    })

    enregistreur.stop()
    await arrete
    onProgres?.(1)
    nettoyer(flux)

    const blob = new Blob(morceaux, { type: 'video/webm' })
    if (!blob.size) throw new Error('extrait-vide')
    return new File([blob], `${fichier.name.replace(/\.\w+$/, '')}-extrait.webm`, {
      type: 'video/webm',
      lastModified: Date.now(),
    })
  } catch (e) {
    nettoyer()
    throw e
  }
}
