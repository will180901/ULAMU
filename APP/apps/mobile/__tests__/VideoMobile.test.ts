/**
 * @format
 * La vidéo côté patient — chantier 106, 12/09/2026.
 *
 * ── Ce que ce fichier garde ───────────────────────────────────────────────────────────────────
 *
 * Le serveur accepte la vidéo depuis le chantier 99, le web sait l'envoyer et la relire depuis le
 * 101 et le 104. **Le téléphone ne savait ni l'une ni l'autre** — et c'est pourtant lui que tient un
 * patient qui veut montrer ce qui le fait souffrir.
 *
 * Décision du porteur : *« je veux aussi un rogneur sur le mobile ».*
 *
 * ── Ce qui se vérifie ici ─────────────────────────────────────────────────────────────────────
 *
 * Les règles qui décident si un fichier part — et elles ne se voient pas à l'écran : *une vidéo
 * refusée trop tôt, ou acceptée trop tard, produit le même écran jusqu'au moment de l'envoi.*
 */
import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  LIMITE_OCTETS,
  VIDEO_MAX_S,
  formatOctets,
  genreDuMime,
  mimeMedia,
  refusDEnvoi,
} from '../src/lib/media-regles';
import {doitEtreRognee} from '../src/services/rogneur';

const MO = 1024 * 1024;
const source = (rel: string): string => readFileSync(resolve(__dirname, '..', 'src', rel), 'utf8');

describe('Ce qui empêche une pièce de partir, côté patient', () => {
  it('une photo trop lourde est refusée AVEC son poids et la limite', () => {
    const message = refusDEnvoi('image/jpeg', 12 * MO);

    expect(message).toContain('12,0 Mo');
    expect(message).toContain('8,0 Mo');
  });

  /*
    ⚠️ **Une vidéo n'est PAS refusée sur son poids.** Elle dépasse presque toujours les 8 Mo, et le
    rogneur est son seul remède : la refuser d'emblée priverait de la seule chose qui pourrait la
    sauver.

    *Un refus qui précède le remède n'est pas une protection, c'est une porte fermée.* Même règle
    que le web (chantier 99), pour la même raison.
  */
  it('⚠️ mais une vidéo lourde attend le rogneur au lieu d’être refusée', () => {
    expect(refusDEnvoi('video/mp4', 40 * MO)).toBeNull();
  });

  it('et un format que le serveur refuserait est refusé ici, pas après le réseau', () => {
    expect(refusDEnvoi('application/zip', 1000)).toMatch(/Format non accepté/);
  });

  /* Le `.mov` des iPhone passe : sans lui, le film serait refusé avant qu'on puisse le rogner. */
  it('le .mov des iPhone passe, comme sur le web', () => {
    expect(refusDEnvoi('video/quicktime', 30 * MO)).toBeNull();
    expect(genreDuMime('video/quicktime')).toBe('video');
  });
});

describe('Quand faut-il rogner', () => {
  /*
    ⚠️ **Deux raisons, et la seconde est celle qu'on oublie.** Une vidéo de huit secondes peut peser
    30 Mo : sa durée ne dit rien de son poids, et l'inverse est vrai aussi.
  */
  it('⚠️ trop longue OU trop lourde — les deux comptent', () => {
    // Courte mais énorme.
    expect(doitEtreRognee(30 * MO, 8)).toBe(true);
    // Légère mais interminable.
    expect(doitEtreRognee(2 * MO, 120)).toBe(true);
  });

  it('et une vidéo courte et légère part telle quelle', () => {
    expect(doitEtreRognee(2 * MO, 10)).toBe(false);
  });

  /* Les bornes exactes : on peut atteindre la limite, pas la dépasser. */
  it('les bornes sont inclusives', () => {
    expect(doitEtreRognee(LIMITE_OCTETS, VIDEO_MAX_S)).toBe(false);
    expect(doitEtreRognee(LIMITE_OCTETS + 1, VIDEO_MAX_S)).toBe(true);
    expect(doitEtreRognee(LIMITE_OCTETS, VIDEO_MAX_S + 1)).toBe(true);
  });

  /*
    ⚠️ Le MÊME plafond que le web. *Deux plafonds différents pour la même vidéo, selon qu'on
    l'envoie du téléphone ou de l'ordinateur, seraient impossibles à expliquer à qui que ce soit.*
  */
  it('⚠️ et c’est le même plafond des deux côtés', () => {
    const regleWeb = readFileSync(
      resolve(__dirname, '../../web/src/modules/consultation/media.ts'),
      'utf8',
    );

    expect(regleWeb).toContain(`export const VIDEO_MAX_S = ${VIDEO_MAX_S}`);
    expect(regleWeb).toContain('export const LIMITE_OCTETS = 8 * 1024 * 1024');
  });
});

describe('Le chemin de la vidéo dans l’écran', () => {
  /*
    ⚠️ **L'encodage se fait à l'ENVOI, pas à la sélection.** Une vidéo de 8 Mo fait une chaîne de
    11 Mo en mémoire : la produire pour un fichier qu'on va peut-être retirer, ou dont on ne gardera
    que trois secondes, serait payer d'avance pour un peut-être.
  */
  it('⚠️ la vidéo est encodée à l’envoi, après le rognage', () => {
    const ecran = source('screens/SessionScreen.tsx');

    expect(ecran).toContain('const preparerPourEnvoi');
    expect(ecran).toContain('await demanderLePassage(p)');
    // Et l'encodage vient APRÈS la découpe, jamais avant.
    expect(ecran.indexOf('await rognerVideo(')).toBeLessThan(ecran.indexOf('await fileToBase64(chemin)'));
  });

  /*
    ⚠️ **En SÉRIE, pas en parallèle.** Le rogneur ouvre un écran : deux découpes simultanées se
    recouvriraient. *Ce qui demande un geste ne se parallélise pas.*
  */
  it('⚠️ et plusieurs pièces partent l’une après l’autre, pas toutes à la fois', () => {
    const ecran = source('screens/SessionScreen.tsx');
    const envoi = ecran.slice(ecran.indexOf('const sendPreview'), ecran.indexOf('const startRec'));

    expect(envoi).toContain('for (const p of preview)');
    expect(envoi).not.toContain('Promise.all');
  });

  /*
    ⚠️ **La découpe s'annonce avant de s'ouvrir.** Un écran de rognage venu de nulle part ressemble à
    une panne, même quand il fait exactement ce qu'il faut.
  */
  it('⚠️ et l’aperçu prévient que la vidéo devra être coupée', () => {
    const apercu = source('components/MediaPreview.tsx');

    expect(apercu).toContain('doitEtreRognee(');
    expect(apercu).toContain('vous choisirez le');
  });

  /* Une vidéo reçue se lit : ni carré vide dans la bulle, ni image morte en plein écran. */
  it('une vidéo reçue a sa carte et son lecteur', () => {
    expect(source('screens/SessionScreen.tsx')).toContain('estUneVideo(keys[0])');
    expect(source('components/MediaViewer.tsx')).toContain('<Video');
  });
});

describe('Ce que le format dit', () => {
  it('les poids se lisent comme on les dit', () => {
    expect(formatOctets(8 * MO)).toBe('8,0 Mo');
    expect(formatOctets(200_000)).toBe('195 Ko');
  });
});

/*
  ── Chantier 107 : la couture entre le sélecteur et les règles ────────────────────────────────

  Le chantier 106 avait des règles justes et testées une par une — et une vidéo choisie dans la
  galerie repartait quand même en `image/jpeg`, parce que le sélecteur la faisait passer par la
  fonction écrite pour les photos de profil. *Ce n'est jamais la pièce qui a cédé, c'est le joint.*

  Ces tests-ci regardent le joint.
*/
describe('Le type que le sélecteur annonce', () => {
  it('⚠️ une vidéo choisie est annoncée comme une vidéo, pas comme une photo', () => {
    expect(mimeMedia({type: 'video/mp4', fileName: 'VID_0001.mp4'})).toBe('video/mp4');
    expect(genreDuMime(mimeMedia({type: 'video/mp4'}))).toBe('video');
  });

  /* Android laisse parfois le type vide : l'extension reste le dernier recours. */
  it('et sans type annoncé, l’extension décide', () => {
    expect(mimeMedia({type: null, fileName: 'VID_20260912.mp4'})).toBe('video/mp4');
    expect(mimeMedia({type: '', uri: 'file:///stockage/film.MOV'})).toBe('video/quicktime');
    expect(mimeMedia({type: '', fileName: 'photo.png'})).toBe('image/png');
  });

  it('une photo reste une photo', () => {
    expect(mimeMedia({type: 'image/jpeg'})).toBe('image/jpeg');
    expect(genreDuMime(mimeMedia({type: 'image/webp'}))).toBe('image');
  });

  /*
    ⚠️ **Le joint lui-même.** `mimeOf` ne sait dire que des images — son type de retour l'annonce,
    et le compilateur ne s'en émeut pas puisqu'une `AvatarMime` EST une chaîne. Seul un regard sur
    l'appel voit le problème.
  */
  it('⚠️ et le sélecteur de consultation ne passe pas par la fonction des photos de profil', () => {
    const svc = source('services/media.ts');
    const choix = svc.slice(svc.indexOf('export async function pickSessionImageAssets'));

    expect(choix).toContain('mimeMedia(a)');
    expect(choix).not.toContain('mimeOf(a)');
  });
});

describe('Ce qui est branché, et pas seulement écrit', () => {
  /*
    ⚠️ **Une règle jamais appelée protège autant qu'une règle qui n'existe pas.** `refusDEnvoi`
    était juste, testée, et personne ne l'appelait : un fichier refusé par le serveur traversait
    quand même le réseau pour l'apprendre.
  */
  it('⚠️ le refus est prononcé à la sélection, avant l’aperçu', () => {
    const ecran = source('screens/SessionScreen.tsx');
    const choix = ecran.slice(ecran.indexOf('const attachPhoto'), ecran.indexOf('const preparerPourEnvoi'));

    expect(choix).toContain('refusDEnvoi(');
  });

  /*
    ⚠️ **Ne rien savoir n'est pas une raison de croire que c'est petit.** Sans poids ni durée, la
    vidéo passait pour minuscule — et on l'encodait en entier en mémoire.
  */
  it('⚠️ une vidéo dont on ne sait rien est rognée quand même', () => {
    expect(doitEtreRognee(0, 0)).toBe(true);
  });
});

describe('La brique et l’architecture que le projet construit vraiment', () => {
  /*
    ⚠️ **Le 12/09, en séance ouverte et payée**, le rogneur a répondu « cet appareil ne sait pas
    découper une vidéo » sur un téléphone où il était parfaitement installé. Le code cherchait le
    module dans `NativeModules` — où un TurboModule **n'apparaît pas**. Et un commentaire du même
    fichier affirmait que le projet tournait sur l'ANCIENNE architecture, quand
    `android/gradle.properties` porte `newArchEnabled=true` depuis toujours.

    > *Une croyance sur la configuration du projet n'est pas une connaissance tant qu'on n'a pas
    > ouvert le fichier qui la porte.*

    Ce test relie les deux : le fichier de configuration, et la façon de s'abonner qu'il impose.
  */
  it('⚠️ le rogneur n’écoute AUCUN évènement de la brique', () => {
    const props = readFileSync(resolve(__dirname, '../android/gradle.properties'), 'utf8');
    const src = source('services/rogneur.ts');

    expect(props).toMatch(/^newArchEnabled=true$/m);
    /*
      Les évènements de la brique font quitter l'application sur cette architecture (chantier 107).
      On ne passe que par ses fonctions qui répondent : mesurer, extraire, découper.
    */
    expect(src).not.toContain('new NativeEventEmitter');
    expect(src).not.toContain('onFinishTrimming');
    // (`showEditor` est nommé dans l'en-tête du fichier — c'est l'APPEL qui doit avoir disparu.)
    expect(src).not.toContain('.showEditor(');
    expect(src).toContain('brique.trim(');
    expect(src).toContain('brique.getFrameAt(');
  });

  /* L'écran de découpe est le nôtre, et il est bien branché à l'envoi. */
  it('⚠️ et l’écran de découpe est le nôtre', () => {
    const ecran = source('screens/SessionScreen.tsx');

    expect(ecran).toContain('<RogneurVideo');
    expect(source('components/RogneurVideo.tsx')).toContain('PanResponder');
  });

  /* Le chargement reste tardif : la brique lève une exception à l'import sans binaire natif. */
  it('et elle se charge toujours au moment de s’en servir', () => {
    expect(source('services/rogneur.ts')).toContain("require('react-native-video-trim')");
  });
});
