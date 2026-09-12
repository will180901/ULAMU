/**
 * Les règles de média du téléphone — chantier 106, 12/09/2026.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * Le web a les siennes depuis le chantier 75 (`apps/web/src/modules/consultation/media.ts`). Le
 * téléphone n'en avait aucune : il envoyait des photos et une note vocale, et la limite de taille
 * n'existait qu'au moment du refus — *sur une connexion congolaise, un fichier de 20 Mo traversait
 * le réseau en entier avant d'être rejeté.*
 *
 * ⚠️ **Ces chiffres sont des MIROIRS du serveur.** S'ils changent là-bas, ils doivent changer ici.
 * C'est le prix d'un miroir, et l'alternative — découvrir la limite par l'échec — est pire.
 */

/** Miroir de `StorageService.maxBytes`. */
export const LIMITE_OCTETS = 8 * 1024 * 1024;

/** Les images que le serveur accepte. */
export const MIMES_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

/**
 * Les vidéos que le serveur accepte (chantier 99).
 *
 * `video/quicktime` est le `.mov` des iPhone : sans lui, le sélecteur refuserait le film avant même
 * qu'on puisse proposer de le rogner.
 */
export const MIMES_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

/**
 * Durée maximale d'une vidéo envoyée — **30 secondes**.
 *
 * ⚠️ Ce n'est pas une préférence, c'est une conséquence : le stockage plafonne à 8 Mo et une vidéo
 * de téléphone pèse de 1 à 4 Mo par seconde. C'est aussi le seuil qui rend un rogneur UTILISABLE —
 * au-delà de la durée du film, la fenêtre de sélection couvre tout et ne se déplace plus, ce qui
 * fait croire qu'elle est bloquée.
 *
 * Le même chiffre que le web (`VIDEO_MAX_S`) : *deux plafonds différents pour la même vidéo, selon
 * qu'on l'envoie du téléphone ou de l'ordinateur, seraient impossibles à expliquer.*
 */
export const VIDEO_MAX_S = 30;

/** « 320 Ko », « 2,4 Mo » — une taille dite comme on la lit. */
export function formatOctets(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Le genre d'un fichier, tel que l'aperçu le traite. */
export type GenreMedia = 'image' | 'video';

export function genreDuMime(mime: string): GenreMedia {
  return mime.startsWith('video/') ? 'video' : 'image';
}

/**
 * Ce qui empêche un fichier de partir — dit AVANT le réseau, avec son poids et la limite.
 *
 * ⚠️ **Une vidéo n'est PAS refusée sur son poids.** Elle dépasse presque toujours les 8 Mo, et le
 * rogneur est son seul remède : la refuser d'emblée priverait de la seule chose qui pourrait la
 * sauver. Le contrôle se fait sur l'extrait, juste avant l'envoi. *Même règle que le web
 * (chantier 99), pour la même raison.*
 */
export function refusDEnvoi(mime: string, tailleOctets: number): string | null {
  const accepte = [...MIMES_IMAGE, ...MIMES_VIDEO] as readonly string[];
  if (!accepte.includes(mime)) {
    return `Format non accepté (${mime || 'inconnu'}) — photo ou vidéo uniquement.`;
  }
  if (genreDuMime(mime) !== 'video' && tailleOctets > LIMITE_OCTETS) {
    return `${formatOctets(tailleOctets)} — maximum ${formatOctets(LIMITE_OCTETS)} par fichier.`;
  }
  return null;
}
