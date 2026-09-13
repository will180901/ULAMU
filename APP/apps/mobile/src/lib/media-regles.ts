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

/**
 * Le VRAI type d'un fichier choisi — image ou vidéo.
 *
 * ⚠️ **Ce qui a manqué au chantier 106.** Le sélecteur passait par `mimeOf`, écrit pour la photo de
 * profil : son type de retour est `AvatarMime`, il ne sait dire que `image/jpeg`, `image/png` ou
 * `image/webp`. Une vidéo choisie repartait donc en `image/jpeg` — plus de lecteur, plus
 * d'avertissement de rognage, et un envoi vide. **Et le compilateur n'a rien dit** : un type plus
 * étroit entre sans bruit là où l'on attend une chaîne.
 *
 * *Une fonction dont le nom ne dit pas ce qu'elle refuse finit par être appelée là où elle ne
 * convient pas.*
 *
 * Android laisse parfois le type vide : l'extension du nom de fichier reste le dernier recours.
 */
export function mimeMedia(a: {type?: string | null; fileName?: string | null; uri?: string | null}): string {
  const t = (a.type || '').toLowerCase();
  if (t.startsWith('video/') || t.startsWith('image/')) {
    return t;
  }
  const nom = (a.fileName || a.uri || '').toLowerCase();
  const ext = nom.includes('.') ? nom.slice(nom.lastIndexOf('.') + 1) : '';
  const parExtension: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    png: 'image/png',
    webp: 'image/webp',
  };
  return parExtension[ext] ?? 'image/jpeg';
}

/** Le genre d'un fichier, tel que l'aperçu le traite. */
export type GenreMedia = 'image' | 'video';

export function genreDuMime(mime: string): GenreMedia {
  return mime.startsWith('video/') ? 'video' : 'image';
}

/**
 * La plus longue portion sélectionnable, en secondes.
 *
 * ⚠️ **Deux bornes, et la seconde est celle qu'on oublie** : la durée maximale voulue (30 s), et ce
 * que la limite de POIDS autorise au débit du fichier. *Une vidéo 4K de dix secondes peut peser
 * 40 Mo : sa portion tient en deux secondes, pas en trente.*
 *
 * La marge de 10 % couvre l'en-tête du conteneur et l'arrondi sur l'image-clé.
 *
 * Miroir de `apps/web/src/modules/consultation/rogneur.ts` — même règle des deux côtés, pour la
 * même raison que le plafond de durée : *deux limites différentes pour la même vidéo, selon
 * l'appareil, seraient impossibles à expliquer.*
 */
export function portionMaximale(tailleOctets: number, dureeSec: number): number {
  if (!(dureeSec > 0)) {
    return VIDEO_MAX_S;
  }
  const octetsParSeconde = tailleOctets / dureeSec;
  const parLePoids = octetsParSeconde > 0 ? (LIMITE_OCTETS * 0.9) / octetsParSeconde : VIDEO_MAX_S;
  return Math.max(1, Math.min(VIDEO_MAX_S, parLePoids, dureeSec));
}

/**
 * Le poids estimé d'une portion, à débit constant.
 *
 * ⚠️ C'est une **estimation**, affichée comme telle : le débit réel varie d'un plan à l'autre. Elle
 * sert à prévenir avant l'envoi, pas à promettre. *Le poids vrai est mesuré sur l'extrait produit,
 * et c'est lui qui décide.*
 */
export function poidsEstime(tailleOctets: number, dureeSec: number, portionSec: number): number {
  if (!(dureeSec > 0)) {
    return tailleOctets;
  }
  return Math.round((tailleOctets / dureeSec) * portionSec);
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
