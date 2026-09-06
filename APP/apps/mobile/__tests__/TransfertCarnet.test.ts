/**
 * @format
 * Le code de transfert d'un Carnet à la majorité — chantier 48, puis dette n°26 le 06/09/2026.
 *
 * ── Ce que ce fichier défendait hier, et ce qu'il défend aujourd'hui ─────────────────────────
 *
 * Hier : que deux UUID réunis en une chaîne survivent à une messagerie. C'était juste, et
 * insuffisant — **73 caractères ne se dictent pas**, alors que le cas le plus fréquent est que le
 * tuteur et le majeur soient dans la même pièce.
 *
 * Aujourd'hui le serveur émet **huit signes**, et tout ce fichier tourne autour d'une seule idée :
 * ce code passe par une OREILLE.
 *
 * **1. L'alphabet n'a aucune paire douteuse.** Ni 0/O, ni 1/I/L, ni U — et les DEUX membres de
 * chaque paire sont exclus. Garder « O » en écartant « 0 » laisserait celui qui écoute hésiter
 * quand même, et sa faute serait alors silencieuse.
 *
 * **2. Tolérant sur la forme, strict sur le fond.** Écrit sous la dictée, un code arrive avec un
 * tiret, des espaces, en minuscules. Rien de cela ne le change. Un signe hors alphabet, en
 * revanche, ne peut venir que d'une erreur d'écoute : le laisser passer ferait répondre au serveur
 * « aucun transfert avec ce code », et chercher le défaut dans le transfert plutôt que dans la
 * dictée.
 *
 * **3. Le code désigne, l'OTP autorise.** Le message partagé ne porte jamais les six chiffres.
 */
import {describe, expect, it} from '@jest/globals';
import {formaterCode, lireCode, LONGUEUR_CODE, messageDePartage} from '../src/lib/transfert-carnet';

const CODE = 'ABCD2345';

describe('Relire un code écrit sous la dictée', () => {
  it.each([
    ['tel quel', CODE],
    ['avec le tiret d’affichage', 'ABCD-2345'],
    ['en minuscules', 'abcd2345'],
    ['avec des espaces', '  ABCD 2345 '],
    ['tiret et minuscules, comme on l’écrit vite', 'abcd-2345'],
  ])('accepte un code %s', (_cas, brut) => {
    expect(lireCode(brut)).toBe(CODE);
  });
});

describe('Refuser ce qui ne peut venir que d’une erreur d’écoute', () => {
  /*
    Les six signes exclus de l'alphabet sont exactement ceux qu'on confond en écoutant ou en
    relisant. Les voir apparaître dans un code veut dire que la transmission s'est mal passée — et
    le dire tout de suite évite de faire porter le doute sur le transfert lui-même.
  */
  it.each([
    ['un zéro', 'ABCD2340'],
    ['un O', 'ABCDO345'],
    ['un un', 'ABCD2341'],
    ['un I', 'ABCDI345'],
    ['un L', 'ABCDL345'],
    ['un U', 'ABCDU345'],
  ])('refuse un code contenant %s', (_cas, brut) => {
    expect(lireCode(brut)).toBeNull();
  });

  it.each([
    ['trop court', 'ABCD234'],
    ['trop long', 'ABCD23456'],
    ['vide', ''],
    ['pas un code du tout', 'bonjour !'],
    ['seulement le tiret', '-'],
  ])('refuse un code %s', (_cas, brut) => {
    expect(lireCode(brut)).toBeNull();
  });
});

describe('La mise en forme', () => {
  it('groupe par quatre — on ne dicte pas huit signes d’affilée', () => {
    expect(formaterCode(CODE)).toBe('ABCD-2345');
  });

  /* La boucle doit être fermée : ce qu'on affiche, on doit pouvoir le retaper tel quel. */
  it('ce qui est affiché se relit', () => {
    expect(lireCode(formaterCode(CODE))).toBe(CODE);
  });

  it('la longueur annoncée est bien celle qu’on exige', () => {
    expect(CODE).toHaveLength(LONGUEUR_CODE);
    expect(lireCode('A'.repeat(LONGUEUR_CODE - 1))).toBeNull();
  });
});

describe('Le message que le tuteur partage', () => {
  const message = messageDePartage('Mireille', CODE);

  it('porte le code lisible et dit quoi en faire', () => {
    expect(message).toContain('ABCD-2345');
    expect(message).toContain('Récupérer mon Carnet');
    expect(message).toContain('Mireille');
  });

  /*
    Le code désigne le transfert, l'OTP l'autorise. Les mettre dans le même message en ferait un
    sésame complet — et ce message restera des mois dans une conversation, sur un téléphone prêté,
    revendu, ou simplement relu par quelqu'un d'autre.
  */
  it('ne contient AUCUN code à six chiffres', () => {
    expect(message).not.toMatch(/\d{6}/);
  });

  it('annonce que les six chiffres arriveront séparément', () => {
    expect(message).toContain('séparément');
  });
});
