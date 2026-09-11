/**
 * @format
 * L'onde de la note vocale, côté patient — chantier 96, 12/09/2026.
 *
 * ── Ce que ce fichier garde ───────────────────────────────────────────────────────────────────
 *
 * Le lecteur du téléphone dessinait **36 barres, quoi qu'il arrive**. Sa rangée fait 244 px, dont
 * **128** reviennent à l'onde une fois retirés le bouton, la durée, la pastille de vitesse et les
 * écarts. Or trente-six barres de 3 px espacées de 2 px en réclament **178** : chaque barre tombait
 * à **1,6 px**. Le lecteur affichait un trait fin là où son propre en-tête annonçait une onde.
 *
 * Le web souffrait du même mal en pire — 70 px seulement, donc des barres de **0 px** et plus
 * d'onde du tout (chantier 95). La règle est maintenant écrite une fois, dans
 * `packages/shared/src/onde-vocale.ts`, et vendorée des deux côtés.
 *
 * *Une densité relevée sur un écran n'est pas une densité : c'est un nombre de barres ET une
 * largeur. Reprendre le nombre sans la largeur, c'est reprendre la moitié de la mesure.*
 *
 * ⚠️ **Le calcul lui-même est éprouvé côté web** (`apps/web/src/test/consultation.test.tsx`), et un
 * test de vendorage prouve que les trois copies sont identiques à l'octet près. Ce qui se vérifie
 * ICI est ce que le web ne peut pas savoir : **les mesures propres au téléphone**.
 */
import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  BARRES_MAX,
  ECART_BARRE,
  LARGEUR_BARRE,
  barresQuiTiennent,
  formatDureeVocale,
} from '../src/lib/onde-vocale';

/** La place que la rangée du lecteur laisse à l'onde, dérivée de ses propres mesures. */
const RANGEE = 244; // styles.row.width
const BOUTON = 34; // styles.play
const DUREE = 28; // styles.dur.minWidth
const VITESSE = 30; // styles.speed.minWidth
const ECARTS = 3 * 8; // styles.row.gap, entre les quatre éléments
const ONDE = RANGEE - BOUTON - DUREE - VITESSE - ECARTS;

const source = (rel: string): string => readFileSync(resolve(__dirname, '..', 'src', rel), 'utf8');

describe("L'onde d'une note vocale", () => {
  /*
    ⚠️ Le cas réel du téléphone : 128 px. C'est celui qui produisait des barres de 1,6 px.
  */
  it('⚠️ dans la rangée du téléphone, chaque barre garde ses 3 px', () => {
    const combien = barresQuiTiennent(ONDE);

    expect(combien * LARGEUR_BARRE + (combien - 1) * ECART_BARRE).toBeLessThanOrEqual(ONDE);
    // Et il en reste assez pour que ce soit une onde, pas trois traits.
    expect(combien).toBeGreaterThanOrEqual(20);
  });

  it('et jamais plus que les 36 de la maquette', () => {
    expect(barresQuiTiennent(400)).toBe(BARRES_MAX);
    expect(barresQuiTiennent(ONDE)).toBeLessThan(BARRES_MAX);
  });

  /*
    ⚠️ Le lecteur ne doit plus décider seul du nombre de barres : il le demande à la règle partagée,
    à partir de la largeur qu'il a MESURÉE. Sans cela, les deux applications redivergeraient — et
    c'est précisément ce qui s'était produit.
  */
  it('⚠️ le lecteur suit la largeur mesurée, il ne fixe plus un nombre', () => {
    const lecteur = source('components/VoiceNotePlayer.tsx');

    expect(lecteur).toContain('barresQuiTiennent(width)');
    expect(lecteur).not.toMatch(/const BARS = \d+/);
  });

  /*
    La durée, enfin : le téléphone arrondissait, le web tronquait. Pour un même fichier de 76,7 s, le
    patient lisait `1:17` et le soignant `1:16` — une seconde d'écart sur la même note vocale.
  */
  it('et la durée se dit comme sur le web, à la seconde près', () => {
    expect(formatDureeVocale(76.693333)).toBe('1:17');
    expect(formatDureeVocale(8.419542)).toBe('0:08');
  });
});
