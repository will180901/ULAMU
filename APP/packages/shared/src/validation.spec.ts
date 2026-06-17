import { isAcceptablePassword, isAdultIso, isNonEmptyBounded, isValidOtp, isValidPhone, normalizePhone } from "./validation";

describe("normalizePhone (miroir m01.policies)", () => {
  it("canonise les formes valides en +242…", () => {
    expect(normalizePhone("061234567")).toBe("+242061234567");
    expect(normalizePhone("+242061234567")).toBe("+242061234567");
    expect(normalizePhone("242061234567")).toBe("+242061234567");
    expect(normalizePhone("06 12 34 567")).toBe("+242061234567");
    expect(normalizePhone("05.99.88.777")).toBe("+242059988777");
  });
  it("rejette les numéros invalides", () => {
    expect(normalizePhone("0612345")).toBeNull(); // trop court
    expect(normalizePhone("091234567")).toBeNull(); // préfixe national non autorisé (9)
    expect(normalizePhone("0012345678")).toBeNull();
    expect(normalizePhone("abc")).toBeNull();
    expect(isValidPhone("061234567")).toBe(true);
    expect(isValidPhone("xxx")).toBe(false);
  });
});

describe("isAcceptablePassword (RM-01-02)", () => {
  it("exige ≥ 8 caractères, au moins une lettre et un chiffre", () => {
    expect(isAcceptablePassword("motdepasse1")).toBe(true);
    expect(isAcceptablePassword("Abcdefg9")).toBe(true);
    expect(isAcceptablePassword("court1")).toBe(false);
    expect(isAcceptablePassword("quehuitlettres")).toBe(false); // pas de chiffre
    expect(isAcceptablePassword("12345678")).toBe(false); // pas de lettre
  });
});

describe("isValidOtp", () => {
  it("exige exactement 6 chiffres par défaut", () => {
    expect(isValidOtp("123456")).toBe(true);
    expect(isValidOtp("12345")).toBe(false);
    expect(isValidOtp("1234567")).toBe(false);
    expect(isValidOtp("abcdef")).toBe(false);
    expect(isValidOtp("12345678", 8)).toBe(true);
  });
});

describe("isAdultIso (PM-16, UTC PM-14)", () => {
  const now = new Date("2026-06-13T10:00:00Z");
  it("vrai pour un majeur, faux pour un mineur, faux pour une date invalide", () => {
    expect(isAdultIso("2000-01-01", 18, now)).toBe(true);
    expect(isAdultIso("2010-01-01", 18, now)).toBe(false);
    expect(isAdultIso("2008-06-13", 18, now)).toBe(true); // pile 18 ans
    expect(isAdultIso("2008-06-14", 18, now)).toBe(false); // 18 ans moins un jour
    expect(isAdultIso("pas-une-date", 18, now)).toBe(false);
  });
});

describe("isNonEmptyBounded", () => {
  it("non vide après trim, borné", () => {
    expect(isNonEmptyBounded("Talangaï")).toBe(true);
    expect(isNonEmptyBounded("   ")).toBe(false);
    expect(isNonEmptyBounded("x".repeat(81))).toBe(false);
  });
});
