/**
 * Vecteurs de test RFC 6238 (annexe B) — SHA-1, secret ASCII "12345678901234567890".
 * Les codes attendus sont les 6 derniers chiffres des vecteurs à 8 chiffres de la RFC.
 */
import {
  base32Encode,
  totpAt,
  verifyTotp,
  base32Decode,
  generateTotpSecret,
  secondsUntilNextTotpStep,
  TOTP_STEP_SECONDS,
} from "./totp";

const RFC_SECRET_B32 = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("TOTP RFC 6238", () => {
  const vectors: Array<[number, string]> = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ];

  it.each(vectors)("epoch %d → %s", (epoch, expected) => {
    expect(totpAt(RFC_SECRET_B32, epoch)).toBe(expected);
  });

  it("accepte une dérive de ±1 pas et refuse au-delà", () => {
    const t = 1111111109;
    const code = totpAt(RFC_SECRET_B32, t);
    expect(verifyTotp(RFC_SECRET_B32, code, t + 30)).toBe(true); // -1 pas
    expect(verifyTotp(RFC_SECRET_B32, code, t - 29)).toBe(true); // +1 pas (même fenêtre)
    expect(verifyTotp(RFC_SECRET_B32, code, t + 61)).toBe(false); // -2 pas
  });

  it("refuse les formats invalides", () => {
    expect(verifyTotp(RFC_SECRET_B32, "12345")).toBe(false);
    expect(verifyTotp(RFC_SECRET_B32, "abcdef")).toBe(false);
  });

  it("base32 aller-retour", () => {
    const secret = generateTotpSecret();
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });
});

/**
 * Le rythme des codes, servi aux écrans — chantier 34, 02/09/2026.
 *
 * Les quatre écrans qui demandent un code TOTP affichent « nouveau code dans N s ». Ce N vient du
 * SERVEUR : calculé depuis l'horloge du navigateur, il serait déphasé dès que celle-ci dérive, et
 * l'écran contredirait le téléphone que l'utilisateur a sous les yeux.
 *
 * ── Ce que ces tests verrouillent ─────────────────────────────────────────────────────────────
 *
 * Les BORNES, qui sont l'erreur classique d'un modulo. À la seconde 0 d'un pas, il reste la période
 * entière — pas zéro : un décompte qui afficherait « 0 » pendant une seconde ferait croire à un code
 * mort alors qu'il vient de naître. Et il n'atteint jamais 0, puisqu'à la dernière seconde du pas il
 * reste encore 1.
 */
describe("Rythme des codes TOTP (chantier 34)", () => {
  it("annonce la période entière à la seconde où un pas commence", () => {
    expect(secondsUntilNextTotpStep(0)).toBe(TOTP_STEP_SECONDS);
    expect(secondsUntilNextTotpStep(30)).toBe(TOTP_STEP_SECONDS);
    expect(secondsUntilNextTotpStep(1_700_000_010)).toBe(TOTP_STEP_SECONDS);
  });

  it("décroît d'une seconde par seconde à l'intérieur d'un pas", () => {
    expect(secondsUntilNextTotpStep(1)).toBe(29);
    expect(secondsUntilNextTotpStep(15)).toBe(15);
    expect(secondsUntilNextTotpStep(29)).toBe(1);
  });

  /*
    La borne qui compte : jamais 0, jamais plus que la période. Un décompte hors de ces bornes
    afficherait soit un code mort qui ne l'est pas, soit un délai qui n'existe pas.
  */
  it("reste toujours dans ]0, période]", () => {
    for (let t = 0; t < 200; t++) {
      const restant = secondsUntilNextTotpStep(t);
      expect(restant).toBeGreaterThan(0);
      expect(restant).toBeLessThanOrEqual(TOTP_STEP_SECONDS);
    }
  });

  /*
    Le rythme doit correspondre au code RÉELLEMENT servi : quand le décompte atteint 1, la seconde
    suivante doit produire un code DIFFÉRENT. Sans cette épreuve, la fonction pourrait être juste
    arithmétiquement et fausse sur ce qu'elle prétend annoncer.
  */
  it("annonce le vrai instant où le code change", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890", "ascii"));
    const t = 1_700_000_000;
    const restant = secondsUntilNextTotpStep(t);

    expect(totpAt(secret, t + restant - 1)).toBe(totpAt(secret, t));
    expect(totpAt(secret, t + restant)).not.toBe(totpAt(secret, t));
  });
});
