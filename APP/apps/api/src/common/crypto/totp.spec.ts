/**
 * Vecteurs de test RFC 6238 (annexe B) — SHA-1, secret ASCII "12345678901234567890".
 * Les codes attendus sont les 6 derniers chiffres des vecteurs à 8 chiffres de la RFC.
 */
import { base32Encode, totpAt, verifyTotp, base32Decode, generateTotpSecret } from "./totp";

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
