/**
 * Le refus de démarrer sans clé de chiffrement valide (§8.1 de la procédure, appliqué le 01/09/2026).
 *
 * ── Ce qui est verrouillé ici ──────────────────────────────────────────────────────────────────
 *
 *  1. **Une clé absente ou mal formée arrête la production.** C'est tout l'objet : `secretbox.ts`
 *     retombait en silence sur `sha256("ulamu-dev-secretbox")`, une valeur écrite en clair dans le
 *     dépôt. Le serveur continuait de tourner en scellant avec une clé publique.
 *  2. **Le développement et les tests ne sont pas touchés.** Un garde-fou qui empêcherait de lancer
 *     l'API sur un poste local serait abandonné dans la semaine.
 *  3. **Le message dit quoi faire.** Un démarrage refusé sans mode d'emploi, sur un service en
 *     ligne, coûte plus cher que le défaut qu'il signale.
 *
 * ── Le seuil exact, et pourquoi il n'est pas négociable ────────────────────────────────────────
 *
 * 32 octets, parce que c'est le critère de `secretbox.ts` lui-même. Un garde-fou plus indulgent que
 * le code qu'il protège laisserait passer précisément les clés qui déclenchent le repli silencieux.
 */
import { cleValide, garderLaCleDeChiffrement } from "./garde-secretbox";

/** 32 octets exactement, encodés en base64 — la forme attendue. */
const CLE_VALIDE = Buffer.alloc(32, 7).toString("base64");
/** 31 octets : le collage tronqué d'un caractère, exactement le cas du §2.6 de la procédure. */
const CLE_TRONQUEE = Buffer.alloc(31, 7).toString("base64");

describe("cleValide — le même critère que secretbox.ts", () => {
  it("accepte 32 octets", () => {
    expect(cleValide(CLE_VALIDE)).toBe(true);
  });

  it("refuse une clé tronquée d'un seul octet", () => {
    // C'est le cas réel : un copier-coller qui perd un caractère. Rien ne le signale à l'œil.
    expect(cleValide(CLE_TRONQUEE)).toBe(false);
  });

  it("refuse une clé trop longue", () => {
    expect(cleValide(Buffer.alloc(33, 7).toString("base64"))).toBe(false);
  });

  it("refuse l'absence et la chaîne vide", () => {
    expect(cleValide(undefined)).toBe(false);
    expect(cleValide("")).toBe(false);
  });
});

describe("garderLaCleDeChiffrement — en production", () => {
  it("laisse démarrer avec une clé valide", () => {
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "production", SECRETBOX_KEY: CLE_VALIDE })).not.toThrow();
  });

  it("arrête le démarrage quand la clé manque", () => {
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "production" })).toThrow(/DÉMARRAGE REFUSÉ/);
  });

  it("arrête le démarrage quand la clé est mal formée — le cas qui ne se voyait pas", () => {
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "production", SECRETBOX_KEY: CLE_TRONQUEE })).toThrow(
      /ne décode pas en 32 octets/,
    );
  });

  it("dit combien d'octets il a lus : c'est ce qui permet de reconnaître un collage tronqué", () => {
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "production", SECRETBOX_KEY: CLE_TRONQUEE })).toThrow(
      /31 octets lus/,
    );
  });

  it("rassure sur ce qui n'est PAS perdu, et dit où trouver la copie", () => {
    let message = "";
    try {
      garderLaCleDeChiffrement({ NODE_ENV: "production" });
    } catch (e) {
      message = (e as Error).message;
    }
    // Un service qui refuse de partir doit dire immédiatement si les données sont en danger.
    expect(message).toMatch(/Rien n'est perdu/);
    expect(message).toMatch(/procedure_sauvegarde_SECRETBOX_KEY\.md/);
  });
});

describe("garderLaCleDeChiffrement — hors production", () => {
  it("ne dit rien en développement", () => {
    // `secretbox.ts` dérive alors sa clé de démonstration, et c'est le comportement voulu : personne
    // ne scelle de vraie donnée de santé sur un poste local.
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "development" })).not.toThrow();
  });

  it("ne dit rien en test", () => {
    expect(() => garderLaCleDeChiffrement({ NODE_ENV: "test" })).not.toThrow();
  });

  it("ne dit rien quand NODE_ENV n'est pas posé", () => {
    // Le cas d'un `node dist/src/main.js` lancé à la main pour inspecter : on ne l'empêche pas.
    expect(() => garderLaCleDeChiffrement({})).not.toThrow();
  });
});
