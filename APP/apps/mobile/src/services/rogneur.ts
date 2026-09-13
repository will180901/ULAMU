/**
 * Le rogneur de vidéo, côté patient — chantiers 106 et 107, 12/09/2026.
 *
 * ── Pourquoi il existe ────────────────────────────────────────────────────────────────────────
 *
 * Le stockage plafonne à **8 Mo** et une vidéo de téléphone pèse de 1 à 4 Mo par seconde : sans
 * découpe, ouvrir la vidéo aux consultations reviendrait à l'ouvrir puis à la refuser presque
 * toujours. *Un refus qui précède le remède n'est pas une protection, c'est une porte fermée.*
 *
 * Le porteur a tranché : **le rogneur est obligatoire sur le téléphone aussi.**
 *
 * ── ⚠️ Pourquoi l'écran de découpe est le NÔTRE, et non celui de la brique ─────────────────────
 *
 * `react-native-video-trim` apporte un écran de découpe tout fait. Il a été essayé en séance
 * réelle, le 12/09 : **l'application quittait d'elle-même à l'instant où cet écran s'affichait.**
 * Le journal du téléphone nomme le coupable à la ligne près —
 *
 *     BaseVideoTrimModule.showEditor → onShow → NativeVideoTrimSpec.emitOnShow
 *     → AsyncEventEmitter<folly::dynamic>::emit → SIGSEGV
 *
 * — c'est-à-dire au moment où la brique **annonce** « je suis à l'écran ». L'annonce traverse le
 * pont entre le code natif et le nôtre, et le pont casse. Trois pistes essayées, trois échecs :
 * écouter les dix évènements plutôt que trois, vérifier que la brique est bien reliée (elle l'est :
 * `libappmodules.so` contient son fournisseur), chercher une version corrigée (8.2.2 est la
 * dernière, publiée il y a un mois).
 *
 * > **Une bibliothèque a rarement une seule porte.** Celle-ci en a deux : l'écran tout fait, qui
 * > crie ses évènements — et des fonctions qui **répondent** au lieu de crier. Les secondes ne
 * > touchent jamais le pont qui casse.
 *
 * On garde donc d'elle ce qui marche — extraire une image, découper un passage, mesurer une durée,
 * le tout en FFmpeg natif — et **l'écran, lui, est à nous** (`components/RogneurVideo.tsx`). Il
 * porte les couleurs d'ULAMU, il dit les secondes et le poids estimé, et il ne dépend d'aucun
 * évènement. *Ce que le détour coûte en travail, il le rend en maîtrise.*
 */
import {LIMITE_OCTETS, VIDEO_MAX_S} from '../lib/media-regles';

/** Ce que rend la découpe : le chemin de l'extrait, et sa durée réelle. */
export interface Extrait {
  chemin: string;
  dureeSec: number;
}

/** La brique, réduite aux trois fonctions qui répondent au lieu de crier. */
interface Brique {
  isValidFile: (url: string) => Promise<{isValid: boolean; fileType: string; duration: number}>;
  getFrameAt: (url: string, o: {time: number; maxWidth: number}) => Promise<{outputPath: string}>;
  trim: (url: string, o: {startTime: number; endTime: number}) => Promise<{outputPath: string; duration: number; success: boolean}>;
}

/**
 * ⚠️ **La brique se charge TARD, au moment de s'en servir — jamais à l'import.**
 *
 * `react-native-video-trim` appelle `TurboModuleRegistry.getEnforcing('VideoTrim')` dès qu'on
 * l'importe, et cet appel **lève une exception** là où le binaire natif n'est pas là : un APK
 * construit avant l'ajout de la brique, un appareil où l'édition a échoué, et surtout la suite de
 * tests. L'écran entier tombait alors — *avant même d'avoir pu vérifier que le rogneur existe.*
 *
 * *Un garde-fou placé après le chargement ne garde rien : ce qu'il devait empêcher a déjà eu lieu.*
 *
 * Même motif que `services/ota.ts`, pour la même raison, et il y était déjà écrit.
 *
 * ── ⚠️ Et la croyance qui a coûté une séance au porteur ───────────────────────────────────────
 *
 * La première version lisait `NativeModules.VideoTrim` pour savoir si le rogneur était là. Un
 * commentaire affirmait même que ce projet tournait sur l'ANCIENNE architecture React Native.
 * **C'était faux** : `android/gradle.properties` porte `newArchEnabled=true` depuis toujours, et
 * sur la nouvelle architecture un TurboModule **n'apparaît pas dans `NativeModules`**. Le test
 * répondait donc *non* sur un téléphone où la brique était parfaitement installée.
 *
 * > **Une croyance sur la configuration du projet n'est pas une connaissance tant qu'on n'a pas
 * > ouvert le fichier qui la porte.**
 *
 * La seule question qui se vérifie honnêtement : *est-ce que la brique se charge et répond ?*
 */
function chargerLaBrique(): Brique | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('react-native-video-trim');
    if (typeof m?.trim !== 'function' || typeof m?.getFrameAt !== 'function' || typeof m?.isValidFile !== 'function') {
      return null;
    }
    return {isValidFile: m.isValidFile, getFrameAt: m.getFrameAt, trim: m.trim};
  } catch {
    return null;
  }
}

/** Le rogneur est-il utilisable ici ? Sans lui, une vidéo trop lourde n'a aucun remède. */
export function rogneurDisponible(): boolean {
  return chargerLaBrique() !== null;
}

/**
 * Une vidéo doit-elle être rognée avant d'être envoyée ?
 *
 * **Deux raisons, et la seconde est celle qu'on oublie** : elle est trop longue (plus de
 * `VIDEO_MAX_S`), ou elle est trop lourde. *Une vidéo de huit secondes peut peser 30 Mo ; sa durée
 * ne dit rien de son poids.*
 */
export function doitEtreRognee(tailleOctets: number, dureeSec: number): boolean {
  /*
    ⚠️ **Ni poids ni durée : on rogne.** Le sélecteur ne renseigne pas toujours ces deux champs, et
    sans eux la vidéo passait pour minuscule — puis on l'encodait en entier en mémoire. *Ne rien
    savoir d'une vidéo n'est pas une raison de la croire petite.*
  */
  if (tailleOctets <= 0 && dureeSec <= 0) {
    return true;
  }
  return tailleOctets > LIMITE_OCTETS || dureeSec > VIDEO_MAX_S;
}

/**
 * La durée réelle d'une vidéo, en millisecondes — mesurée par la brique, pas devinée.
 *
 * ⚠️ **C'est la source qui fait autorité, pas le sélecteur.** La galerie annonce parfois une durée
 * absente ou fausse ; ici, c'est FFmpeg qui lit le fichier. `0` veut dire « illisible ».
 */
export async function dureeVideoMs(chemin: string): Promise<number> {
  const brique = chargerLaBrique();
  if (!brique) {
    return 0;
  }
  try {
    const info = await brique.isValidFile(chemin);
    return info.isValid && info.duration > 0 ? info.duration : 0;
  } catch {
    return 0;
  }
}

/**
 * Les images de la pellicule, rendues UNE PAR UNE au fur et à mesure.
 *
 * ⚠️ **En série, et en rendant chaque image dès qu'elle arrive.** Extraire douze images d'un coup
 * ferait attendre devant un écran vide pendant plusieurs secondes ; les donner au fil de l'eau
 * remplit la pellicule sous les yeux. *Un écran qui se remplit lentement est vivant ; un écran vide
 * qui se remplit d'un coup est une panne qui finit bien.*
 *
 * `surChaque` peut être appelée après la fermeture de l'écran : c'est à l'appelant d'ignorer ce
 * qui arrive trop tard (`annule`).
 */
export async function pellicule(
  chemin: string,
  dureeMs: number,
  combien: number,
  surChaque: (index: number, fichier: string) => void,
  annule?: () => boolean,
): Promise<void> {
  const brique = chargerLaBrique();
  if (!brique || dureeMs <= 0) {
    return;
  }
  for (let i = 0; i < combien; i += 1) {
    if (annule?.()) {
      return;
    }
    // Au MILIEU de chaque tranche : la première image d'une vidéo est souvent noire.
    const instant = Math.round((dureeMs * (i + 0.5)) / combien);
    try {
      const r = await brique.getFrameAt(chemin, {time: instant, maxWidth: 160});
      if (!annule?.()) {
        surChaque(i, r.outputPath);
      }
    } catch {
      /* Une image manquante laisse un trou dans la pellicule — ce n'est pas une raison d'arrêter. */
    }
  }
}

/**
 * Découpe le passage choisi et rend l'extrait.
 *
 * ⚠️ **Aucun évènement n'est écouté ici** : la brique répond par une promesse, et c'est tout ce
 * dont nous avons besoin. Voir l'en-tête du fichier pour ce que cette prudence a coûté à apprendre.
 */
export async function rognerVideo(chemin: string, debutMs: number, finMs: number): Promise<Extrait> {
  const brique = chargerLaBrique();
  if (!brique) {
    throw new Error('rogneur-indisponible');
  }
  const r = await brique.trim(chemin, {startTime: Math.max(0, Math.round(debutMs)), endTime: Math.round(finMs)});
  if (!r?.success || !r.outputPath) {
    throw new Error('rognage-echoue');
  }
  return {chemin: r.outputPath, dureeSec: Math.round((r.duration ?? finMs - debutMs) / 1000)};
}
