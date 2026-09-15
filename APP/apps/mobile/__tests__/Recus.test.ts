/**
 * @format
 * Le reçu dit ce qui a été ACHETÉ — chantier 126, 15/09/2026 (EF-13-05).
 *
 * ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────
 *
 * ⚠️ **L'écran écrivait « Consultation » pour tout ce qui venait d'une poignée de main** : un mot
 * DÉDUIT de la référence d'ordre. Or le soignant nomme son offre librement, jusqu'à 120
 * caractères — quelqu'un qui avait payé « Bilan santé 60 min » recevait un reçu disant
 * « Consultation ».
 *
 * > **Un reçu est une trace : il doit dire ce qui a été acheté, pas la catégorie dans laquelle on
 * > le range.**
 *
 * Le chantier 118 avait déjà figé ce libellé sur la poignée pour que le montant payé soit celui
 * qui avait été montré ; il n'atteignait simplement jamais le reçu.
 *
 * 📌 **La déduction reste, en second.** Les reçus d'avant la colonne n'ont pas de libellé : pour
 * eux, *une catégorie honnête vaut mieux qu'un nom inventé.*
 */
import {describe, expect, it} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const source = readFileSync(resolve(__dirname, '..', 'src', 'screens', 'PaymentsScreen.tsx'), 'utf8');

/*
  L'écran n'exporte pas `describe()` — il n'a aucune raison de le faire pour un test. On éprouve
  donc la règle sur la source, comme le filet des promesses le fait déjà : ce qui compte ici est
  qu'un libellé servi soit PRÉFÉRÉ à la déduction, et que la déduction survive.
*/
describe('Le reçu d’une consultation', () => {
  it('préfère le libellé servi par le serveur', () => {
    expect(/const nomme = \(r\.label \?\? ''\)\.trim\(\)/.test(source)).toBe(true);
    expect(/nomme\.length > 0[\s\S]{0,120}label: nomme/.test(source)).toBe(true);
  });

  /*
    ⚠️ Sans cette condition, un libellé servi par erreur sur un ordre d'un AUTRE type (dévoilement,
    triage) prendrait la place de sa propre étiquette. Le libellé ne remplace la déduction que là
    où la déduction disait « Consultation ».
  */
  it('ne l’applique qu’aux ordres de consultation', () => {
    expect(/nomme\.length > 0 && \(ref\.startsWith\('handshake'\) \|\| ref\.startsWith\('session'\)\)/.test(source)).toBe(true);
  });

  it('garde la déduction pour les reçus d’avant, qui n’ont pas de libellé', () => {
    expect(/ref\.startsWith\('handshake'\) \|\| ref\.startsWith\('session'\)\) return \{label: 'Consultation'/.test(source)).toBe(true);
  });

  /*
    Un libellé vide ou fait d'espaces n'est pas un libellé : il laisserait une ligne de reçu sans
    aucun mot. *Ce qui ne dit rien ne doit pas remplacer ce qui disait quelque chose.*
  */
  it('ne se laisse pas remplacer par un libellé vide', () => {
    expect(/\.trim\(\)/.test(source)).toBe(true);
    expect(/nomme\.length > 0/.test(source)).toBe(true);
  });

  it('garde les autres genres d’opération intacts', () => {
    expect(/disclosure[\s\S]{0,80}Dévoilement pharmacie/.test(source)).toBe(true);
    expect(/mission[\s\S]{0,80}Triage à domicile/.test(source)).toBe(true);
  });
});
