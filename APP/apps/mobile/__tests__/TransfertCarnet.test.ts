/**
 * @format
 * Le code de transfert d'un Carnet à la majorité — chantier 48, 06/09/2026 (écart D).
 *
 * ── Ce que ce fichier défend ──────────────────────────────────────────────────────────────────
 *
 * `POST /sub-profiles/:id/claim` exige du majeur un `subProfileId` ET un `intentId`, deux UUID qu'il
 * ne possède pas et ne peut pas deviner. Son tuteur les lui transmet — par SMS, par WhatsApp, de
 * vive voix : **deux personnes, deux téléphones**.
 *
 * Tout ce qui peut arriver à une chaîne qui traverse une messagerie arrive donc ici :
 *
 * **1. Elle est décorée.** Espaces, retours à la ligne, majuscule automatique en début de message.
 * Rien de tout cela ne change les identifiants — refuser un code pour un espace ferait accuser le
 * tuteur d'une faute qu'il n'a pas commise.
 *
 * **2. Elle est coupée.** Et c'est le cas dangereux : un UUID tronqué reste *plausible*. Envoyé au
 * serveur, il revient « sous-profil introuvable » — et le majeur, comme le tuteur, cherchera un
 * défaut du côté du transfert alors que le message a simplement été tronqué. On refuse donc AVANT
 * l'appel, avec une phrase qui désigne la vraie cause.
 *
 * **3. Elle n'est pas un secret.** Ce code désigne, il n'autorise pas : sans l'OTP à six chiffres,
 * reçu par le tuteur sur son propre téléphone, le serveur refuse. Le message partagé ne doit donc
 * jamais le contenir — un dernier test s'en assure.
 */
import {describe, expect, it} from '@jest/globals';
import {composerCode, lireCode, messageDePartage} from '../src/lib/transfert-carnet';

const SOUS_PROFIL = '3f1a6c2e-8b4d-4a9f-9e10-7c5b2d4e6a81';
const INTENTION = 'a7e3d901-2c4b-4f68-b5a2-91d0e8c3b47f';
const CODE = `${SOUS_PROFIL}.${INTENTION}`;

describe('Composer le code', () => {
  it('joint les deux identifiants que le serveur réclame', () => {
    expect(composerCode({subProfileId: SOUS_PROFIL, intentId: INTENTION})).toBe(CODE);
  });

  it('ce qui est composé se relit à l’identique', () => {
    const relu = lireCode(composerCode({subProfileId: SOUS_PROFIL, intentId: INTENTION}));

    expect(relu).toEqual({subProfileId: SOUS_PROFIL, intentId: INTENTION});
  });
});

describe('Relire un code qui a traversé une messagerie', () => {
  it.each([
    ['tel quel', CODE],
    ['avec des espaces autour', `  ${CODE}  `],
    ['coupé sur deux lignes', `${SOUS_PROFIL}.\n${INTENTION}`],
    ['en majuscules', CODE.toUpperCase()],
    ['avec des espaces au milieu', `${SOUS_PROFIL} . ${INTENTION}`],
  ])('accepte un code %s', (_cas, brut) => {
    expect(lireCode(brut)).toEqual({subProfileId: SOUS_PROFIL, intentId: INTENTION});
  });
});

describe('Refuser un code qui ne tient pas debout', () => {
  /*
    LE cas de ce fichier. Un UUID amputé de sa fin ressemble encore à un UUID : c'est exactement ce
    que produit un message coupé au partage. Laisser passer enverrait un identifiant inexistant, et
    la réponse « introuvable » ferait chercher au mauvais endroit — chez le tuteur, ou dans le
    serveur, jamais dans le collage.
  */
  it.each([
    ['le second identifiant est tronqué', `${SOUS_PROFIL}.a7e3d901-2c4b-4f68`],
    ['le premier identifiant est tronqué', `3f1a6c2e-8b4d.${INTENTION}`],
    ['il manque une moitié', SOUS_PROFIL],
    ['il y a une moitié de trop', `${CODE}.${INTENTION}`],
    ['ce n’est pas un code du tout', 'bonjour, voici le code'],
    ['la chaîne est vide', ''],
    ['le séparateur est seul', '.'],
  ])('refuse quand %s', (_cas, brut) => {
    expect(lireCode(brut)).toBeNull();
  });
});

describe('Le message que le tuteur partage', () => {
  const message = messageDePartage('Mireille', CODE);

  it('porte le code et dit quoi en faire', () => {
    expect(message).toContain(CODE);
    expect(message).toContain('Récupérer mon Carnet');
    expect(message).toContain('Mireille');
  });

  /*
    Le code désigne, l'OTP autorise. Les mettre tous deux dans la même conversation en ferait un
    sésame complet pour qui la lirait — et une conversation partagée se relit longtemps après.
  */
  it('ne contient AUCUN code à six chiffres', () => {
    expect(message).not.toMatch(/\b\d{6}\b/);
  });

  it('annonce que le code à six chiffres arrivera séparément', () => {
    expect(message).toContain('séparément');
  });
});
