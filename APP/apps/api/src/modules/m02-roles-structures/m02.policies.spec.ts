/**
 * Tests des règles M02 — critères d'acceptation CU-02-02/03/04 (RM-02-01/05, PM-22).
 */
import {
  canModifyMember,
  FACILITY_RIGHTS,
  GLOBAL_PERMISSIONS_MATRIX,
  invitationRefusalReason,
  isInvitationAcceptable,
  memberHasRight,
  rightsAreValid,
} from "./m02.policies";

describe("Droits internes valides (EF-02-05)", () => {
  it.each([
    [[], true],
    [["stock"], true],
    [["stock", "dispense", "stats"], true],
    [["stock", "stock"], false], // doublon
    [["stock", "members"], false], // « membres » n'est PAS délégable — réservé au titulaire
    [["STOCK"], false], // sensible à la casse : identifiants stables
  ])("%j → %s", (rights, ok) => {
    expect(rightsAreValid(rights as string[])).toBe(ok);
  });
});

describe("Possession d'un droit (matrice §5)", () => {
  it("le titulaire a TOUS les droits d'office, même avec une liste vide", () => {
    for (const right of FACILITY_RIGHTS) {
      expect(memberHasRight("OWNER", [], right)).toBe(true);
    }
  });
  it("un membre n'a que les droits confiés par le titulaire", () => {
    expect(memberHasRight("MEMBER", ["stock"], "stock")).toBe(true);
    expect(memberHasRight("MEMBER", ["stock"], "dispense")).toBe(false);
    expect(memberHasRight("MEMBER", [], "stats")).toBe(false);
  });
});

describe("Gestion des membres par le titulaire (EF-02-05/07, RM-02-01)", () => {
  it("le titulaire modifie les droits d'un membre", () => {
    expect(canModifyMember("OWNER", "MEMBER", "UPDATE_RIGHTS")).toBe(true);
  });
  it("le titulaire suspend un membre", () => {
    expect(canModifyMember("OWNER", "MEMBER", "SUSPEND")).toBe(true);
  });
  it("un simple membre ne gère personne", () => {
    expect(canModifyMember("MEMBER", "MEMBER", "UPDATE_RIGHTS")).toBe(false);
    expect(canModifyMember("MEMBER", "MEMBER", "SUSPEND")).toBe(false);
  });
  it("personne ne modifie/suspend un titulaire — la titularité passe par le transfert (CU-02-05)", () => {
    expect(canModifyMember("OWNER", "OWNER", "UPDATE_RIGHTS")).toBe(false);
    expect(canModifyMember("OWNER", "OWNER", "SUSPEND")).toBe(false);
    expect(canModifyMember("MEMBER", "OWNER", "SUSPEND")).toBe(false);
  });
});

describe("Acceptation d'une invitation (CU-02-02, PM-22, RM-02-05)", () => {
  const now = Date.parse("2026-06-12T10:00:00Z");
  const day = 86_400_000;
  const base = {
    status: "PENDING" as const,
    phone: "+242061234567",
    expiresAtMs: now + 7 * day, // PM-22 = 7 jours (D-028)
  };
  const ctx = { nowMs: now, phone: "+242061234567", hasActiveMembership: false };

  it("invitation PENDING, non expirée, bon numéro, sans rattachement → acceptable", () => {
    expect(isInvitationAcceptable(base, ctx)).toBe(true);
    expect(invitationRefusalReason(base, ctx)).toBeNull();
  });

  it("invitation déjà traitée ou annulée → refus (usage unique)", () => {
    expect(invitationRefusalReason({ ...base, status: "ACCEPTED" }, ctx)).toBe("NOT_PENDING");
    expect(invitationRefusalReason({ ...base, status: "CANCELLED" }, ctx)).toBe("NOT_PENDING");
    expect(invitationRefusalReason({ ...base, status: "EXPIRED" }, ctx)).toBe("NOT_PENDING");
  });

  it("invitation au-delà de PM-22 → EXPIRED (géré à la lecture)", () => {
    expect(invitationRefusalReason({ ...base, expiresAtMs: now - 1 }, ctx)).toBe("EXPIRED");
    expect(invitationRefusalReason({ ...base, expiresAtMs: now }, ctx)).toBe("EXPIRED"); // échéance atteinte = expirée
  });

  it("numéro du compte différent du numéro invité → refus", () => {
    expect(invitationRefusalReason(base, { ...ctx, phone: "+242069999999" })).toBe("PHONE_MISMATCH");
  });

  it("compte déjà rattaché à une structure → refus (RM-02-05 : une seule structure au MVP)", () => {
    expect(invitationRefusalReason(base, { ...ctx, hasActiveMembership: true })).toBe("ALREADY_MEMBER");
  });

  it("l'ordre des contrôles est stable : le statut prime sur l'expiration", () => {
    expect(invitationRefusalReason({ ...base, status: "ACCEPTED", expiresAtMs: now - 1 }, ctx)).toBe("NOT_PENDING");
  });
});

describe("Matrice statique des rôles globaux (spec M02 §5)", () => {
  it("chaque action réservée au titulaire n'est pas délégable par droit interne", () => {
    for (const rule of GLOBAL_PERMISSIONS_MATRIX.filter((r) => r.ownerOnly)) {
      expect(rule.facilityRight).toBeUndefined();
      expect(rule.roles).toEqual(["FACILITY_MEMBER"]);
    }
  });
  it("gérer membres/contrat/retraits → titulaire uniquement", () => {
    const actions = GLOBAL_PERMISSIONS_MATRIX.filter((r) => r.ownerOnly).map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(["members.manage", "digitalAgreement.manage", "withdrawal.request"]));
  });
  it("stock/délivrance/stats → membre selon droit interne (le titulaire l'a d'office)", () => {
    const byAction = new Map(GLOBAL_PERMISSIONS_MATRIX.map((r) => [r.action, r]));
    expect(byAction.get("stock.manage")?.facilityRight).toBe("stock");
    expect(byAction.get("dispensation.process")?.facilityRight).toBe("dispense");
    expect(byAction.get("stats.view")?.facilityRight).toBe("stats");
  });
  it("les actions admin sont cantonnées à leur sous-rôle (EF-02-08)", () => {
    const byAction = new Map(GLOBAL_PERMISSIONS_MATRIX.map((r) => [r.action, r]));
    expect(byAction.get("verification.review")?.adminRole).toBe("ADMIN_VERIFICATION");
    expect(byAction.get("payments.supervise")?.adminRole).toBe("ADMIN_FINANCE");
  });
});
