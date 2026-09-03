/**
 * Tests des règles M01 — critères d'acceptation CU-01-01/03 (PM-16/17/18/19).
 */
import {
  canSendOtp,
  doitTracerConnexionSansSecondFacteur,
  isAcceptablePassword,
  isAdult,
  lockoutUntil,
  normalizePhone,
} from "./m01.policies";

const CFG = { maxFailures: 5, windowSeconds: 900, blockSeconds: 900 }; // PM-18

describe("Blocage de connexion (EF-01-06, PM-18)", () => {
  const t0 = Date.parse("2026-06-11T10:00:00Z");
  const min = (n: number) => t0 + n * 60_000;

  it("4 échecs en 15 min → pas de blocage", () => {
    expect(lockoutUntil([min(1), min(2), min(3), min(4)], CFG, min(5))).toBeNull();
  });

  it("5 échecs en 15 min → blocage de 15 min après le 1er des 5", () => {
    const fails = [min(1), min(2), min(3), min(4), min(5)];
    const until = lockoutUntil(fails, CFG, min(6));
    expect(until).toBe(min(1) + 900_000); // = min(16)
  });

  it("le blocage se lève après la fenêtre", () => {
    const fails = [min(1), min(2), min(3), min(4), min(5)];
    expect(lockoutUntil(fails, CFG, min(17))).toBeNull();
  });

  it("les vieux échecs hors fenêtre ne comptent pas", () => {
    const fails = [min(-30), min(-20), min(1), min(2), min(3)];
    expect(lockoutUntil(fails, CFG, min(4))).toBeNull();
  });
});

describe("Limite d'OTP (PM-19)", () => {
  const now = Date.parse("2026-06-11T12:00:00Z");
  it("3 envois dans l'heure → refus du 4e", () => {
    const sent = [now - 50 * 60_000, now - 30 * 60_000, now - 10 * 60_000];
    expect(canSendOtp(sent, 3, now)).toBe(false);
  });
  it("les envois de plus d'une heure ne comptent plus", () => {
    const sent = [now - 70 * 60_000, now - 30 * 60_000, now - 10 * 60_000];
    expect(canSendOtp(sent, 3, now)).toBe(true);
  });
});

describe("Normalisation du téléphone (identifiant racine)", () => {
  it.each([
    ["+242061234567", "+242061234567"],
    ["242061234567", "+242061234567"],
    ["061234567", "+242061234567"],
    ["06 12 34 567", "+242061234567"],
    ["05-555-44-33", "+242055554433"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([["12345"], ["+33612345678"], ["abc"], ["+2420612345678"]])("%s → rejeté", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("Âge minimum (PM-16)", () => {
  const now = new Date("2026-06-11T00:00:00Z");
  it("18 ans révolus aujourd'hui → accepté", () => {
    expect(isAdult(new Date("2008-06-11T00:00:00Z"), 18, now)).toBe(true);
  });
  it("18 ans demain → refusé", () => {
    expect(isAdult(new Date("2008-06-12T00:00:00Z"), 18, now)).toBe(false);
  });
});

describe("Mot de passe acceptable (RM-01-02)", () => {
  it.each([["motdepasse1", true], ["abc12345", true], ["court1", false], ["sanschiffres", false], ["12345678", false]])(
    "%s → %s",
    (pw, ok) => {
      expect(isAcceptablePassword(pw as string)).toBe(ok);
    },
  );
});

/**
 * La trace d'une connexion d'administration sans second facteur — chantier 32, 02/09/2026.
 *
 * Contrepartie de D-053 : le TOTP est optionnel pour tous, comptes d'administration compris. On
 * n'empêche rien — on inscrit, pour qu'un accès par mot de passe seul ne soit pas indistinguable
 * des autres après coup.
 *
 * Le test verrouille les DEUX sens. Ce qui doit être tracé l'est, et — c'est ce qui coûterait le
 * plus cher — **ce qui ne doit pas l'être ne l'est pas** : un journal en insertion seule qui se
 * remplirait à chaque connexion de patient cesserait d'être lu, et la trace utile s'y noierait.
 */
describe("Trace d'une connexion d'administration sans second facteur (D-053)", () => {
  it("trace un administrateur qui n'a que son mot de passe", () => {
    expect(doitTracerConnexionSansSecondFacteur("ADMIN", false, false)).toBe(true);
  });

  it("ne trace pas un administrateur protégé par son application d'authentification", () => {
    expect(doitTracerConnexionSansSecondFacteur("ADMIN", true, false)).toBe(false);
  });

  it("ne trace pas un administrateur protégé par un code email", () => {
    expect(doitTracerConnexionSansSecondFacteur("ADMIN", false, true)).toBe(false);
  });

  /*
    Le sens qui protège le journal. Un patient ou un soignant sans second facteur n'ouvre pas la
    console d'administration : le tracer produirait du bruit, et le bruit fait qu'on cesse de lire.
  */
  it.each(["PATIENT", "PROFESSIONAL"])("ne trace pas un compte %s sans second facteur", (type) => {
    expect(doitTracerConnexionSansSecondFacteur(type, false, false)).toBe(false);
  });
});
