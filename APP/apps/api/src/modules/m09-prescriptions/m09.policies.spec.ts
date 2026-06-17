/**
 * Tests des règles PURES M09 — catégories prescriptrices (RM-09-01), validation des quantités
 * et statut global (EF-09-08), transitions/annulation/expiration (RM-09-05), garde-fou allergies
 * (EF-09-03), scellement (QR opaque + empreinte sha256, EF-09-04).
 */
import { PrescriptionStatus, ProfessionalCategory } from "@prisma/client";
import {
  canCancel,
  computeBodyHash,
  dispenseQuantityValid,
  expiryDate,
  generateQrToken,
  isDispensable,
  isExpired,
  isPrescribingCategory,
  lineFullyDispensed,
  matchingAllergies,
  normalizeLabel,
  qtyPrescribedValid,
  remaining,
  SealableContent,
  statusAfterDispensation,
} from "./m09.policies";

// ── Catégories prescriptrices (RM-09-01) ──────────────────────────────────────

describe("isPrescribingCategory (RM-09-01)", () => {
  it("autorise médecin, spécialiste, dentiste, sage-femme, infirmier", () => {
    expect(isPrescribingCategory(ProfessionalCategory.GENERAL_PRACTITIONER)).toBe(true);
    expect(isPrescribingCategory(ProfessionalCategory.SPECIALIST)).toBe(true);
    expect(isPrescribingCategory(ProfessionalCategory.DENTIST)).toBe(true);
    expect(isPrescribingCategory(ProfessionalCategory.MIDWIFE)).toBe(true);
    expect(isPrescribingCategory(ProfessionalCategory.NURSE)).toBe(true);
  });
  it("exclut l'agent de santé communautaire", () => {
    expect(isPrescribingCategory(ProfessionalCategory.COMMUNITY_HEALTH_WORKER)).toBe(false);
  });
});

// ── Validation des quantités (EF-09-02/07) ────────────────────────────────────

describe("qtyPrescribedValid (EF-09-02)", () => {
  it("accepte un entier strictement positif", () => {
    expect(qtyPrescribedValid(1)).toBe(true);
    expect(qtyPrescribedValid(30)).toBe(true);
  });
  it("refuse 0, négatif et non entier", () => {
    expect(qtyPrescribedValid(0)).toBe(false);
    expect(qtyPrescribedValid(-2)).toBe(false);
    expect(qtyPrescribedValid(1.5)).toBe(false);
  });
});

describe("dispenseQuantityValid (RM-09-02, anti double délivrance)", () => {
  it("accepte une quantité qui ne dépasse pas le restant", () => {
    expect(dispenseQuantityValid(5, 0, 10)).toBe(true);
    expect(dispenseQuantityValid(5, 5, 10)).toBe(true); // solde exact
  });
  it("refuse de dépasser le restant", () => {
    expect(dispenseQuantityValid(6, 5, 10)).toBe(false);
    expect(dispenseQuantityValid(1, 10, 10)).toBe(false); // déjà soldée
  });
  it("refuse 0, négatif et non entier", () => {
    expect(dispenseQuantityValid(0, 0, 10)).toBe(false);
    expect(dispenseQuantityValid(-1, 0, 10)).toBe(false);
    expect(dispenseQuantityValid(2.5, 0, 10)).toBe(false);
  });
});

describe("remaining", () => {
  it("calcule le restant et ne descend jamais sous zéro", () => {
    expect(remaining(10, 3)).toBe(7);
    expect(remaining(10, 10)).toBe(0);
    expect(remaining(10, 12)).toBe(0);
  });
});

// ── Statut global (EF-09-08) ──────────────────────────────────────────────────

describe("statusAfterDispensation (EF-09-08)", () => {
  it("ACTIVE tant que rien n'est délivré", () => {
    expect(statusAfterDispensation([{ qtyPrescribed: 10, qtyDispensed: 0 }])).toBe(PrescriptionStatus.ACTIVE);
  });
  it("PARTIALLY_DISPENSED si une ligne est entamée mais pas tout soldé", () => {
    expect(
      statusAfterDispensation([
        { qtyPrescribed: 10, qtyDispensed: 5 },
        { qtyPrescribed: 4, qtyDispensed: 0 },
      ]),
    ).toBe(PrescriptionStatus.PARTIALLY_DISPENSED);
  });
  it("DISPENSED quand toutes les lignes sont soldées", () => {
    expect(
      statusAfterDispensation([
        { qtyPrescribed: 10, qtyDispensed: 10 },
        { qtyPrescribed: 4, qtyDispensed: 4 },
      ]),
    ).toBe(PrescriptionStatus.DISPENSED);
  });
  it("une seule ligne soldée parmi plusieurs → PARTIALLY_DISPENSED", () => {
    expect(
      statusAfterDispensation([
        { qtyPrescribed: 10, qtyDispensed: 10 },
        { qtyPrescribed: 4, qtyDispensed: 1 },
      ]),
    ).toBe(PrescriptionStatus.PARTIALLY_DISPENSED);
  });
});

describe("lineFullyDispensed", () => {
  it("vrai au solde exact", () => {
    expect(lineFullyDispensed({ qtyPrescribed: 5, qtyDispensed: 5 })).toBe(true);
  });
  it("faux si reste à délivrer", () => {
    expect(lineFullyDispensed({ qtyPrescribed: 5, qtyDispensed: 4 })).toBe(false);
  });
});

// ── Transitions / annulation / expiration (RM-09-05, EF-09-08) ────────────────

describe("isDispensable (EF-09-07)", () => {
  it("ACTIVE et PARTIALLY_DISPENSED sont délivrables", () => {
    expect(isDispensable(PrescriptionStatus.ACTIVE)).toBe(true);
    expect(isDispensable(PrescriptionStatus.PARTIALLY_DISPENSED)).toBe(true);
  });
  it("DISPENSED, EXPIRED, CANCELLED ne le sont plus", () => {
    expect(isDispensable(PrescriptionStatus.DISPENSED)).toBe(false);
    expect(isDispensable(PrescriptionStatus.EXPIRED)).toBe(false);
    expect(isDispensable(PrescriptionStatus.CANCELLED)).toBe(false);
  });
});

describe("canCancel (RM-09-05, CU-09-04)", () => {
  it("annulable depuis ACTIVE et PARTIALLY_DISPENSED", () => {
    expect(canCancel(PrescriptionStatus.ACTIVE)).toBe(true);
    expect(canCancel(PrescriptionStatus.PARTIALLY_DISPENSED)).toBe(true);
  });
  it("non annulable une fois délivrée, expirée ou déjà annulée (pas de réactivation)", () => {
    expect(canCancel(PrescriptionStatus.DISPENSED)).toBe(false);
    expect(canCancel(PrescriptionStatus.EXPIRED)).toBe(false);
    expect(canCancel(PrescriptionStatus.CANCELLED)).toBe(false);
  });
});

describe("expiration (PM-10, EF-09-08)", () => {
  it("expiryDate = now + PM-10 jours", () => {
    const now = new Date("2026-06-13T00:00:00Z");
    const exp = expiryDate(now, 30);
    expect(exp.toISOString()).toBe("2026-07-13T00:00:00.000Z");
  });
  it("isExpired vrai dès l'échéance atteinte", () => {
    const exp = new Date("2026-07-13T00:00:00Z");
    expect(isExpired(exp, new Date("2026-07-12T23:59:59Z"))).toBe(false);
    expect(isExpired(exp, new Date("2026-07-13T00:00:00Z"))).toBe(true);
    expect(isExpired(exp, new Date("2026-07-14T00:00:00Z"))).toBe(true);
  });
});

// ── Garde-fou allergies (EF-09-03) ────────────────────────────────────────────

describe("normalizeLabel", () => {
  it("met en minuscule, retire les accents et compacte les espaces", () => {
    expect(normalizeLabel("  Pénicilline   G ")).toBe("penicilline g");
    expect(normalizeLabel("AMOXICILLINE")).toBe("amoxicilline");
  });
});

describe("matchingAllergies (EF-09-03)", () => {
  it("détecte une correspondance directe (DCI)", () => {
    expect(matchingAllergies(["Amoxicilline", "Clamoxyl"], ["amoxicilline"])).toEqual(["amoxicilline"]);
  });
  it("détecte par inclusion (allergie « pénicilline » vs nom contenant le mot)", () => {
    expect(matchingAllergies(["Pénicilline V"], ["pénicilline"])).toEqual(["pénicilline"]);
  });
  it("ignore les accents et la casse", () => {
    expect(matchingAllergies(["Pénicilline"], ["PENICILLINE"])).toEqual(["PENICILLINE"]);
  });
  it("ne renvoie rien sans correspondance", () => {
    expect(matchingAllergies(["Paracétamol"], ["pénicilline", "iode"])).toEqual([]);
  });
  it("ignore les libellés vides", () => {
    expect(matchingAllergies(["Amoxicilline"], ["", "   "])).toEqual([]);
  });
});

// ── Scellement (EF-09-04) ─────────────────────────────────────────────────────

function content(overrides: Partial<SealableContent> = {}): SealableContent {
  return {
    prescriptionId: "p1",
    sessionId: "s1",
    prescriberId: "pr1",
    patientAccountId: "pat1",
    subProfileId: null,
    expiresAtIso: "2026-07-13T00:00:00.000Z",
    lines: [{ medicamentId: "m1", freeText: null, posology: "3x/j", durationDays: 7, qtyPrescribed: 21 }],
    ...overrides,
  };
}

describe("generateQrToken (RM-09-02)", () => {
  it("produit des jetons uniques et non triviaux", () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });
});

describe("computeBodyHash (EF-09-04)", () => {
  it("empreinte sha256 (64 hex), déterministe pour un même contenu", () => {
    const h1 = computeBodyHash(content());
    const h2 = computeBodyHash(content());
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
  });
  it("change dès qu'une quantité change (infalsifiable)", () => {
    const base = computeBodyHash(content());
    const altered = computeBodyHash(content({ lines: [{ medicamentId: "m1", freeText: null, posology: "3x/j", durationDays: 7, qtyPrescribed: 22 }] }));
    expect(altered).not.toBe(base);
  });
  it("indépendante de l'ordre d'insertion des clés (canonicalisation)", () => {
    const a = content();
    const b: SealableContent = {
      lines: a.lines,
      expiresAtIso: a.expiresAtIso,
      subProfileId: a.subProfileId,
      patientAccountId: a.patientAccountId,
      prescriberId: a.prescriberId,
      sessionId: a.sessionId,
      prescriptionId: a.prescriptionId,
    };
    expect(computeBodyHash(a)).toBe(computeBodyHash(b));
  });
});
