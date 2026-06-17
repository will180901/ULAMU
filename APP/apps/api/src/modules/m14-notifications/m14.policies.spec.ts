/**
 * Tests des règles M14 — EF-14-03 (catalogue), EF-14-04/RM-14-02 (table de vérité push),
 * EF-14-07/PM-37 (rétention, pagination), EF-14-08 (renvoi des critiques),
 * RM-14-03 (pas de contenu médical ni de payload brut dans les textes).
 */
import {
  auditActorTypeFor,
  canRetryCriticalPush,
  clampNotificationPageSize,
  effectivePriority,
  isCriticalNotification,
  isPreferenceAdjustable,
  MAX_CRITICAL_PUSH_ATTEMPTS,
  normalizePriority,
  NOTIFICATION_PAGE_DEFAULT,
  NOTIFICATION_PAGE_MAX,
  purgeBefore,
  pushAllowed,
  renderNotification,
  resolveTemplate,
} from "./m14.policies";
import { GENERIC_TEMPLATE, NOTIFICATION_CATEGORIES, TEMPLATE_CATALOG } from "./m14.templates";

// ── Table de vérité de l'envoi push (EF-14-02/04, RM-14-02) ──────────────────

describe("pushAllowed — table de vérité (EF-14-04, RM-14-02)", () => {
  it.each([
    // [catégorie, priorité, préférence active, push attendu]
    ["critical", "critical", true, true],
    ["critical", "critical", false, true], // RM-14-02 : catégorie critique → préférence ignorée
    ["critical", "normal", false, true], // catégorie critique suffit
    ["system", "critical", false, true], // priorité critique suffit (poignée de main, sécurité)
    ["care", "normal", true, true],
    ["care", "normal", false, false], // préférence désactivée → pas de push
    ["money", "low", true, true],
    ["money", "low", false, false],
    ["reminder", "normal", false, false],
    ["system", "normal", true, true],
    ["system", "low", false, false],
  ] as const)("catégorie=%s priorité=%s préférence=%s → %s", (category, priority, prefEnabled, expected) => {
    expect(pushAllowed(category, priority, prefEnabled)).toBe(expected);
  });
});

describe("isCriticalNotification (EF-14-04/08)", () => {
  it("critique par catégorie OU par priorité, sinon non", () => {
    expect(isCriticalNotification("critical", "normal")).toBe(true);
    expect(isCriticalNotification("system", "critical")).toBe(true);
    expect(isCriticalNotification("system", "normal")).toBe(false);
    expect(isCriticalNotification("care", "low")).toBe(false);
  });
});

describe("Préférences ajustables (RM-14-02)", () => {
  it("toutes les catégories sont ajustables SAUF critical", () => {
    expect(isPreferenceAdjustable("critical")).toBe(false);
    for (const category of NOTIFICATION_CATEGORIES.filter((c) => c !== "critical")) {
      expect(isPreferenceAdjustable(category)).toBe(true);
    }
  });
});

// ── Priorités (EF-14-01) ──────────────────────────────────────────────────────

describe("Priorité effective d'une demande C4 (EF-14-01)", () => {
  it("la priorité explicite du module émetteur prime", () => {
    expect(effectivePriority("critical", "system")).toBe("critical");
    expect(effectivePriority("low", "critical")).toBe("low");
  });
  it("sans priorité : critical si la catégorie est critique, sinon normal", () => {
    expect(effectivePriority(undefined, "critical")).toBe("critical");
    expect(effectivePriority(undefined, "care")).toBe("normal");
  });
  it("priorité inconnue/illisible → repli sans échec (pas de pilule empoisonnée)", () => {
    expect(effectivePriority("URGENT!!", "system")).toBe("normal");
    expect(effectivePriority(42, "critical")).toBe("critical");
    expect(normalizePriority({})).toBeUndefined();
  });
});

// ── Catalogue des modèles (EF-14-03) ─────────────────────────────────────────

describe("Catalogue des modèles (EF-14-03)", () => {
  /** Tous les modèles réellement émis par M01–M13 via notify.request (C4). */
  const EMITTED_TEMPLATES: Array<[string, string]> = [
    ["m02.member.rights_updated", "system"],
    ["m02.member.suspended", "system"],
    ["m02.ownership.transferred.from", "system"],
    ["m02.ownership.transferred.to", "system"],
    ["m03.case.submitted", "system"],
    ["m03.case.decided", "system"],
    ["m03.case.revoked", "system"],
    ["m03.agreement.reissued", "money"],
    ["m04.report.resolved", "system"],
    ["m04.report.warning", "system"],
    ["m04.integrity.broken", "critical"],
    ["m13.receipt", "money"],
    ["m13.payment.failed", "money"],
    ["m13.refund", "critical"], // EF-14-04 : remboursement = critique, jamais désactivable
    ["m13.earnings.credited", "money"],
    ["m13.withdrawal.executed", "money"],
    ["m13.withdrawal.failed", "money"],
    ["m13.refund.gateway_failed", "critical"],
    ["m13.reconciliation.gap", "critical"],
    // Chantier 3 — M05 / M07 / M06 (D-048 : tout modèle émis via C4 a son entrée au catalogue).
    ["m05.pro.available", "care"],
    ["m07.entry.added", "care"],
    ["m07.record.transferred.to", "care"],
    ["m07.record.transferred.from", "care"],
    ["m06.handshake.initiated", "care"],
    ["m06.handshake.confirmed", "care"],
    ["m06.handshake.refused", "care"],
    ["m06.handshake.expired", "care"],
    ["m06.session.preparing.patient", "care"],
    ["m06.session.preparing.professional", "care"],
    ["m06.session.started", "care"],
    ["m06.message.received", "care"],
    ["m06.session.extended", "care"],
    ["m06.session.cancelled", "care"],
    ["m06.session.refunded", "critical"],
    ["m06.payment.failed", "money"],
    ["m06.report.deposited", "care"],
    ["m06.followup.offered", "care"],
    ["m06.report.reminder", "system"],
    ["m06.report.overdue", "critical"],
    ["m06.report.overdue.admin", "critical"],
    // Chantier 4 — M09 Ordonnance & Délivrance
    ["m09.prescription.sealed", "care"],
    ["m09.prescription.cancelled", "care"],
    ["m09.prescription.expired", "care"],
    ["m09.prescription.dispensed", "care"],
    ["m09.prescription.partially_dispensed", "care"],
    // Chantier 4 — M12 Recherche & Dévoilement
    ["m12.disclosure.revealed", "critical"],
    ["m12.disclosure.payment_failed", "money"],
    ["m12.disclosure.served", "care"],
    ["m12.disclosure.redisclosed", "care"],
    ["m12.disclosure.refunded", "critical"],
    ["m12.disclosure.expired", "care"],
    ["m12.facility.excluded", "critical"],
    ["m12.refund.payment_missing", "critical"],
    ["m12.strike.upheld", "system"],
    ["m12.strike.cancelled", "system"],
    // Chantier 5 — M16 Pilotage & Administration
    ["m16.account.suspended", "critical"],
    ["m16.account.reactivated", "system"],
    ["m16.account.banned", "critical"],
    ["m16.account.ban_pending_approval", "critical"],
  ];

  it.each(EMITTED_TEMPLATES)("%s est au catalogue, catégorie %s", (key, category) => {
    expect(TEMPLATE_CATALOG[key]).toBeDefined();
    expect(TEMPLATE_CATALOG[key].category).toBe(category);
  });

  it("chaque modèle du catalogue rend un titre et un corps non vides, même payload vide", () => {
    for (const [key] of Object.entries(TEMPLATE_CATALOG)) {
      const { title, body } = renderNotification(key, {});
      expect(title.length).toBeGreaterThan(0);
      expect(body.length).toBeGreaterThan(0);
    }
  });

  it("modèle inconnu → repli générique catégorie system, sans JAMAIS jeter", () => {
    const resolved = resolveTemplate("m99.tout.nouveau");
    expect(resolved).toBe(GENERIC_TEMPLATE);
    const rendered = renderNotification("m99.tout.nouveau", { nimporte: "quoi" });
    expect(rendered.category).toBe("system");
    expect(rendered.title).toBe("Notification ULAMU");
  });

  it("payload illisible (null/objets imbriqués) → rendu défensif, jamais de payload brut", () => {
    const rendered = renderNotification("m03.case.submitted", {
      announcedDelayHours: { nested: true } as unknown,
    });
    expect(rendered.body).not.toContain("[object Object]");
    // payload null : ne jette pas non plus
    expect(() => renderNotification("m13.receipt", null as unknown as Record<string, unknown>)).not.toThrow();
  });

  it("les données du payload remplissent le modèle (RM-14-01 : modèles remplis)", () => {
    expect(renderNotification("m03.case.submitted", { announcedDelayHours: 48 }).body).toContain("48");
    expect(renderNotification("m03.agreement.reissued", { commissionPct: 10 }).body).toContain("10 %");
    expect(renderNotification("m04.integrity.broken", { brokenAtSeq: "1234" }).body).toContain("1234");
  });

  it("RM-14-03 : décision rendue en clair maîtrisé, jamais de contenu hors catalogue", () => {
    const approved = renderNotification("m03.case.decided", { decision: "VERIFIED" });
    const unknownDecision = renderNotification("m03.case.decided", { decision: "diagnostic: angine" });
    expect(approved.body).toContain("approuvé");
    // une valeur inattendue ne fuit JAMAIS dans le texte : repli générique
    expect(unknownDecision.body).not.toContain("angine");
  });

  it("RM-14-03/EF-14-03 : les motifs libres (failReason, reason) ne sont JAMAIS rendus", () => {
    const failed = renderNotification("m13.payment.failed", { amountXaf: 5000, failReason: "code interne X42" });
    const refund = renderNotification("m13.refund", { amountXaf: 5000, reason: "annulation consultation cardiologie" });
    const withdrawal = renderNotification("m13.withdrawal.failed", { amountXaf: 9000, failReason: "PAYOUT_TIMEOUT" });
    expect(failed.body).not.toContain("X42");
    expect(refund.body).not.toContain("cardiologie");
    expect(withdrawal.body).not.toContain("PAYOUT_TIMEOUT");
  });
});

// ── Livraison garantie des critiques (EF-14-08) ───────────────────────────────

describe("Renvoi des push critiques en échec (EF-14-08)", () => {
  it("borne à 5 tentatives", () => {
    expect(MAX_CRITICAL_PUSH_ATTEMPTS).toBe(5);
  });
  it.each([
    [0, true],
    [4, true],
    [5, false], // borne atteinte → échec persistant, événement vers le demandeur
    [6, false],
  ] as const)("attempts=%s → rejouable %s", (attempts, expected) => {
    expect(canRetryCriticalPush(attempts)).toBe(expected);
  });
});

// ── Rétention PM-37 (EF-14-07) ───────────────────────────────────────────────

describe("Rétention du centre (PM-37)", () => {
  const now = new Date("2026-06-12T12:00:00Z");
  it("purgeBefore recule d'exactement N jours", () => {
    // 90 = valeur seedée de PM-37 — passée en paramètre, jamais en dur dans le service
    expect(purgeBefore(90, now).toISOString()).toBe("2026-03-14T12:00:00.000Z");
    expect(purgeBefore(1, now).toISOString()).toBe("2026-06-11T12:00:00.000Z");
    expect(purgeBefore(0, now).toISOString()).toBe(now.toISOString());
  });
});

// ── Pagination du centre (EF-14-07) ──────────────────────────────────────────

describe("Pagination du centre in-app (EF-14-07)", () => {
  it("défaut si absente, plancher 1, plafond NOTIFICATION_PAGE_MAX", () => {
    expect(clampNotificationPageSize(undefined)).toBe(NOTIFICATION_PAGE_DEFAULT);
    expect(clampNotificationPageSize(0)).toBe(1);
    expect(clampNotificationPageSize(-3)).toBe(1);
    expect(clampNotificationPageSize(10_000)).toBe(NOTIFICATION_PAGE_MAX);
    expect(clampNotificationPageSize(25.9)).toBe(25);
  });
});

// ── Audit C5 ──────────────────────────────────────────────────────────────────

describe("Type d'acteur C5", () => {
  it.each([
    ["PATIENT", "patient"],
    ["PROFESSIONAL", "professional"],
    ["FACILITY_MEMBER", "facility_member"],
    ["ADMIN", "admin"],
    ["???", "system"],
  ] as const)("%s → %s", (accountType, expected) => {
    expect(auditActorTypeFor(accountType)).toBe(expected);
  });
});
