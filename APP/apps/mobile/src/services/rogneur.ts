/**
 * Le rogneur de vidéo, côté patient — chantier 106, 12/09/2026.
 *
 * ── Pourquoi il existe ────────────────────────────────────────────────────────────────────────
 *
 * Le stockage plafonne à **8 Mo** et une vidéo de téléphone pèse de 1 à 4 Mo par seconde : sans
 * découpe, ouvrir la vidéo aux consultations reviendrait à l'ouvrir puis à la refuser presque
 * toujours. *Un refus qui précède le remède n'est pas une protection, c'est une porte fermée.*
 *
 * Le porteur a tranché : **le rogneur est obligatoire sur le téléphone aussi.**
 *
 * ── ⚠️ Pourquoi une brique NATIVE, et laquelle ────────────────────────────────────────────────
 *
 * Le rogneur du web repose sur `MediaRecorder`, qui n'existe pas en React Native. Les seules voies
 * étaient une brique native ou rien.
 *
 *   • `react-native-video-processing` : resté à React Native 0.4x, son rognage Android n'a jamais
 *     été écrit — écarté ;
 *   • `ffmpeg-kit-react-native` : **abandonné par son auteur en 2025** — écarté ;
 *   • **`react-native-video-trim`** : publié le 12/08/2026, MIT, aucune dépendance de code, et il
 *     réclame exactement le `minSdk 24` et le NDK que ce projet a déjà. Retenu.
 *
 * ⚠️ **Ce qu'il coûte** : il embarque des binaires FFmpeg, et l'application est construite pour deux
 * architectures. Compter **+15 à 25 Mo sur l'APK**. C'est le prix d'un rogneur sur téléphone ; il
 * n'y en a pas d'autre. *Dit au porteur avant de l'installer, pas après.*
 *
 * ── L'écran de découpe est celui de la brique, habillé aux couleurs d'ULAMU ────────────────────
 *
 * Elle apporte un écran natif avec pellicule, poignées et accélération matérielle. En réécrire un
 * en React Native donnerait moins bien, plus lentement. *On reprend donc le sien — et comme il
 * accepte nos couleurs, il ne ressemble pas à une pièce rapportée.*
 */
import {NativeEventEmitter, NativeModules} from 'react-native';

import {LIMITE_OCTETS, VIDEO_MAX_S} from '../lib/media-regles';

/** Ce que rend l'écran de découpe : le chemin de l'extrait, ou rien si l'on a renoncé. */
export interface Extrait {
  chemin: string;
  dureeSec: number;
}

/**
 * Un évènement du rogneur, tel qu'il arrive sur l'émetteur natif.
 *
 * ⚠️ **On passe par `NativeEventEmitter` et non par les rappels typés de la brique**, parce qu'ils
 * n'existent que sur la NOUVELLE architecture React Native : les atteindre lève une exception sur
 * l'ancienne, avant même d'avoir ouvert le moindre écran. *Une API plus élégante qui ne marche que
 * sur la moitié des appareils n'est pas plus élégante.*
 */
interface EvenementRogneur {
  name: string;
  outputPath?: string;
  duration?: number;
  message?: string;
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
 */
function chargerLaBrique(): {showEditor: (chemin: string, config: object) => void} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-video-trim');
  } catch {
    return null;
  }
}

function moduleNatif(): object | null {
  const m = (NativeModules as Record<string, unknown>).VideoTrim;
  return m && typeof m === 'object' ? (m as object) : null;
}

/** Le rogneur est-il utilisable ici ? Sans lui, une vidéo trop lourde n'a aucun remède. */
export function rogneurDisponible(): boolean {
  return moduleNatif() !== null;
}

/**
 * Une vidéo doit-elle être rognée avant d'être envoyée ?
 *
 * **Deux raisons, et la seconde est celle qu'on oublie** : elle est trop longue (plus de
 * `VIDEO_MAX_S`), ou elle est trop lourde. *Une vidéo de huit secondes peut peser 30 Mo ; sa durée
 * ne dit rien de son poids.*
 */
export function doitEtreRognee(tailleOctets: number, dureeSec: number): boolean {
  return tailleOctets > LIMITE_OCTETS || dureeSec > VIDEO_MAX_S;
}

/**
 * Ouvre l'écran de découpe et rend l'extrait — ou `null` si l'on a renoncé.
 *
 * ⚠️ **Les écouteurs sont posés AVANT l'ouverture et retirés dans tous les cas.** Un écouteur
 * oublié survit à l'écran : la découpe suivante en trouverait deux, et le même extrait partirait
 * deux fois.
 */
export function ouvrirLeRogneur(
  chemin: string,
  couleurs: {accent: string; fond: string; texte: string},
): Promise<Extrait | null> {
  const natif = moduleNatif();
  if (!natif) return Promise.reject(new Error('rogneur-indisponible'));

  return new Promise((resoudre, rejeter) => {
    const emetteur = new NativeEventEmitter(natif as never);
    const abonnement = emetteur.addListener('VideoTrim', (e: EvenementRogneur) => {
      switch (e.name) {
        case 'onFinishTrimming':
          abonnement.remove();
          resoudre({chemin: e.outputPath ?? '', dureeSec: Math.round((e.duration ?? 0) / 1000)});
          break;
        case 'onCancel':
          abonnement.remove();
          resoudre(null);
          break;
        case 'onError':
          abonnement.remove();
          rejeter(new Error(e.message || 'rognage-echoue'));
          break;
        default:
          /* Les autres évènements — ouverture, statistiques, journal — ne nous regardent pas. */
          break;
      }
    });

    const brique = chargerLaBrique();
    if (!brique) {
      abonnement.remove();
      rejeter(new Error('rogneur-indisponible'));
      return;
    }

    brique.showEditor(chemin, {
      // La borne de durée est posée ICI : l'écran ne laisse pas choisir un passage qui sera refusé.
      maxDuration: VIDEO_MAX_S * 1000,
      saveToPhoto: false,
      enableCancelDialog: false,
      trimmerColor: couleurs.accent,
      handleIconColor: couleurs.texte,
      headerTextColor: couleurs.texte,
      waveformColor: couleurs.accent,
      waveformBackgroundColor: couleurs.fond,
    });
  });
}
