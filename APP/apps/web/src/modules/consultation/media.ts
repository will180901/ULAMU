/**
 * Les règles des médias d'une consultation — chantier 75, 11/09/2026.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * Trois écrans ont besoin des mêmes vérités : l'aperçu avant envoi, l'enregistreur vocal, et la
 * bulle qui rend le média. Recopier la limite de taille à trois endroits, c'est la voir diverger —
 * *une règle recopiée est une règle qui dérive.* Elle est écrite ici, une fois.
 *
 * ── ⚠️ Le défaut que ce fichier corrige ────────────────────────────────────────────────────────
 *
 * Le serveur accepte un corps de **112 millions de caractères** en base64 (~84 Mo de fichier), et
 * son stockage **refuse tout ce qui dépasse 8 Mo** (`common/storage.service.ts`). Un envoi de 20 Mo
 * traversait donc le réseau EN ENTIER avant de se faire refuser à l'arrivée — sur une connexion
 * congolaise, c'est plusieurs minutes perdues pour un refus.
 *
 * Et l'écran n'annonçait aucune limite : on la découvrait par l'échec.
 *
 * *(Le commentaire du DTO serveur annonce « ≈ 80 Mo, cohérent avec StorageService » : il est faux
 * d'un facteur dix. Noté au plan comme dette serveur ; ici on s'aligne sur le CHIFFRE RÉEL.)*
 */

/**
 * La limite du stockage serveur, en octets. Miroir de `StorageService.maxBytes`.
 *
 * ⚠️ Si elle change côté serveur, elle doit changer ici — c'est le prix d'un miroir. Le serveur ne
 * la sert dans aucune route : la seule alternative serait de la découvrir par un refus, ce que
 * précisément on veut éviter.
 */
export const LIMITE_OCTETS = 8 * 1024 * 1024

/** Les images que le serveur accepte (`UploadSessionMediaDto`). Aucun autre format ne passe. */
export const MIMES_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const

/**
 * Les audios que le serveur accepte. ⚠️ **`audio/webm` n'y est PAS** — et c'est le format que la
 * plupart des navigateurs produisent par défaut. Voir `mimeVocal()`.
 */
export const MIMES_AUDIO = ['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/ogg', 'audio/wav'] as const

/** Photos par bulle — le serveur en accepte dix (`fileKeys`, `@ArrayMaxSize(10)`). */
export const PHOTOS_MAX = 10

/**
 * Durée maximale d'une note vocale.
 *
 * Deux minutes, et le chiffre se démontre : une note vocale est un complément de consultation, pas
 * un monologue — et à ce format, deux minutes tiennent largement sous les 8 Mo du stockage. Un
 * plafond plus haut ferait découvrir la limite de taille au moment de l'envoi, c'est-à-dire au
 * pire moment.
 */
export const VOCAL_MAX_S = 120

/** « 320 Ko », « 2,4 Mo » — une taille dite comme on la lit, jamais en octets bruts. */
export function formatOctets(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** « 1:07 » — la durée d'une note vocale, comme sur un lecteur. */
export function formatDuree(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Le format d'enregistrement à demander au micro.
 *
 * ── ⚠️ Le piège, vérifié sur un vrai navigateur le 11/09 ───────────────────────────────────────
 *
 * `MediaRecorder` produit du **`audio/webm`** sur les navigateurs Chromium, et le serveur ULAMU
 * **ne l'accepte pas**. Relevé à l'exécution :
 *
 *   • accepté par le navigateur : `audio/mp4`, `audio/webm;codecs=opus`, `audio/webm`
 *   • refusé par le navigateur  : `audio/ogg`, `audio/wav`, `audio/mpeg`
 *
 * L'intersection avec la liste du serveur tient donc en **un seul format : `audio/mp4`**. Sur
 * Firefox, qui ne fait pas de mp4 mais fait de l'ogg/opus, c'est `audio/ogg` qui tombe juste.
 *
 * D'où cette liste de préférence. Elle renvoie `null` quand aucun format commun n'existe — et
 * l'écran DOIT alors désactiver le micro en disant pourquoi, plutôt que d'enregistrer quelque
 * chose que le serveur refusera après coup.
 */
export function mimeVocal(): { enregistrement: string; envoi: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidats: Array<{ enregistrement: string; envoi: string }> = [
    { enregistrement: 'audio/mp4', envoi: 'audio/mp4' },
    { enregistrement: 'audio/ogg;codecs=opus', envoi: 'audio/ogg' },
    { enregistrement: 'audio/ogg', envoi: 'audio/ogg' },
    { enregistrement: 'audio/aac', envoi: 'audio/aac' },
  ]
  return candidats.find((c) => MediaRecorder.isTypeSupported(c.enregistrement)) ?? null
}

/** Le fichier en base64, sans son préfixe `data:` — la forme qu'attend `uploadSessionMedia`. */
export function enBase64(f: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader()
    lecteur.onerror = () => reject(new Error('Fichier illisible'))
    lecteur.onload = () => {
      const brut = String(lecteur.result)
      resolve(brut.slice(brut.indexOf(',') + 1))
    }
    lecteur.readAsDataURL(f)
  })
}

/**
 * Réduit une photo pour qu'elle passe — et pour qu'elle parte vite.
 *
 * ── Pourquoi compresser, alors que le serveur accepte 8 Mo ─────────────────────────────────────
 *
 * Parce qu'une photo de téléphone moderne pèse 4 à 9 Mo, et qu'une consultation se tient souvent
 * sur un réseau mobile. Réduire à 1600 px de côté ne retire **rien** de ce qu'un soignant regarde —
 * une lésion, une éruption, un relevé — et divise le poids par cinq à dix.
 *
 * ⚠️ Le format de sortie est **JPEG**, qui est dans la liste du serveur. Un PNG de 6 Mo réencodé en
 * PNG resterait énorme : c'est le format qui coûte, pas seulement les pixels.
 *
 * Si quoi que ce soit échoue — navigateur sans canvas, image corrompue — on rend le fichier
 * d'origine tel quel. Une compression ratée ne doit pas empêcher un envoi : le contrôle de taille,
 * lui, se fait après, et il est explicite.
 */
export async function compresserImage(f: File, cote = 1600, qualite = 0.82): Promise<File> {
  if (!f.type.startsWith('image/')) return f
  try {
    const bitmap = await createImageBitmap(f)
    const ratio = Math.min(1, cote / Math.max(bitmap.width, bitmap.height))
    // Déjà petite ET déjà légère : la réencoder ne ferait que la dégrader.
    if (ratio === 1 && f.size <= LIMITE_OCTETS / 2) {
      bitmap.close()
      return f
    }
    const toile = document.createElement('canvas')
    toile.width = Math.round(bitmap.width * ratio)
    toile.height = Math.round(bitmap.height * ratio)
    const ctx = toile.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return f
    }
    ctx.drawImage(bitmap, 0, 0, toile.width, toile.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((r) => toile.toBlob(r, 'image/jpeg', qualite))
    if (!blob || blob.size >= f.size) return f
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return f
  }
}

/**
 * Ce qui empêche un fichier de partir — ou `null` s'il peut partir.
 *
 * La phrase est rendue telle quelle à l'écran : elle doit dire le POIDS et la LIMITE, pas
 * « fichier trop volumineux ». Quelqu'un qui voit « 12,4 Mo · maximum 8 Mo » sait quoi faire.
 */
export function refusDEnvoi(f: File): string | null {
  const accepte = [...MIMES_IMAGE, ...MIMES_AUDIO] as readonly string[]
  if (!accepte.includes(f.type)) {
    return `Format non accepté (${f.type || 'inconnu'}) — images JPEG, PNG, WebP ou notes vocales uniquement.`
  }
  if (f.size > LIMITE_OCTETS) {
    return `${formatOctets(f.size)} — maximum ${formatOctets(LIMITE_OCTETS)} par fichier.`
  }
  return null
}
