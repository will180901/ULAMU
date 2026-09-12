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
    expect(ecran).toContain('await ouvrirLeRogneur(');
    // Et l'encodage vient APRÈS l'ouverture du rogneur, jamais avant.
    expect(ecran.indexOf('ouvrirLeRogneur(')).toBeLessThan(ecran.indexOf('await fileToBase64(chemin)'));
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
