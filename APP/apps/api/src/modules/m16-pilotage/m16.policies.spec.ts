/**
 * Tests des règles M16 (PURES) — cibles & évaluation des 7 KPIs (CU-16-03, plan_releases §3),
 * détection des taux contractuels (EF-16-04/D-022), double validation du bannissement
 * (RM-16-04/EF-16-07) et machine d'états des sanctions (EF-16-03/07).
 */
import {
  canSecondApproveBan,
  canTransitionSanction,
  evaluateKpi,
  initialSanctionStatus,
  isRateParameter,
  KPI_TARGET_LIST,
  KPI_TARGETS,
  rate,
} from "./m16.policies";

describe("Cibles des KPIs du pilote (EF-16-05, plan_releases §3)", () => {
  /*
    ── Sept critères au plan de sortie, CINQ mesurés (02/09/2026, chantier 26) ──────────────────

    Deux mesuraient la chaîne du médicament en pharmacie : « ≥ 20 pharmacies au stock vivant » et
    « ≥ 500 dévoilements payés ». ULAMU ne la couvre plus — elle sortait du périmètre des trois
    acteurs (patient, médecin, administration).

    Ce test disait « EXACTEMENT sept — pas un de plus ». Il dit maintenant cinq, et surtout il dit
    POURQUOI il n'en dit plus sept : sans cette phrase, quelqu'un remettrait un jour le chiffre à
    sept en croyant réparer une régression. **L'écart avec le plan de sortie est réel et il
    appartient au porteur** — il est inscrit au §9 du plan d'exécution web.
  */
  it("expose EXACTEMENT cinq critères mesurés — les deux autres n'ont plus d'objet", () => {
    expect(KPI_TARGET_LIST).toHaveLength(5);
    expect(KPI_TARGET_LIST.map((k) => k.key)).not.toContain("pharmacies_stock_vivant");
    expect(KPI_TARGET_LIST.map((k) => k.key)).not.toContain("devoilements_payes");
  });

  it("porte les chiffres de spec (30, 1000, 70, 5, 40) avec le bon sens", () => {
    expect(KPI_TARGETS.PROS_VERIFIES).toMatchObject({ target: 30, direction: "gte" });
    expect(KPI_TARGETS.SESSIONS).toMatchObject({ target: 1000, direction: "gte" });
    expect(KPI_TARGETS.TAUX_CONFIRMATION).toMatchObject({ target: 70, direction: "gte" });
    expect(KPI_TARGETS.TAUX_REMBOURSEMENT_AUTO).toMatchObject({ target: 5, direction: "lte" });
    expect(KPI_TARGETS.PATIENTS_REVENUS).toMatchObject({ target: 40, direction: "gte" });
  });

  it("les clés techniques des KPIs sont uniques", () => {
    const keys = KPI_TARGET_LIST.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("rate(numerator, denominator) en %", () => {
  it("dénominateur nul → 0 (on n'invente pas un taux sur du vide)", () => {
    expect(rate(0, 0)).toBe(0);
    expect(rate(5, 0)).toBe(0);
  });
  it("calcul classique, arrondi à une décimale", () => {
    expect(rate(70, 100)).toBe(70);
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(2, 3)).toBe(66.7);
    expect(rate(1, 8)).toBe(12.5);
  });
  it("100 % quand numerator == denominator", () => {
    expect(rate(40, 40)).toBe(100);
  });
  it("résiste aux entrées non finies", () => {
    expect(rate(Number.NaN, 10)).toBe(0);
    expect(rate(10, Number.NaN)).toBe(0);
    expect(rate(10, -5)).toBe(0);
  });
});

describe("evaluateKpi(value, target, direction) → vert/rouge (CU-16-03)", () => {
  it("sens gte : vert au seuil exact et au-dessus", () => {
    expect(evaluateKpi(30, 30, "gte")).toBe("green");
    expect(evaluateKpi(31, 30, "gte")).toBe("green");
    expect(evaluateKpi(29, 30, "gte")).toBe("red");
  });
  it("sens lte (remboursements ≤ 5 %) : vert au seuil exact et en-dessous", () => {
    expect(evaluateKpi(5, 5, "lte")).toBe("green");
    expect(evaluateKpi(4.9, 5, "lte")).toBe("green");
    expect(evaluateKpi(5.1, 5, "lte")).toBe("red");
  });
  it("évalue chaque cible du référentiel sans erreur", () => {
    for (const t of KPI_TARGET_LIST) {
      expect(["green", "red"]).toContain(evaluateKpi(t.target, t.target, t.direction));
    }
  });
});

describe("isRateParameter (EF-16-04, avenant D-022)", () => {
  it("vrai pour le taux de commission contractuel PM-01 (seul taux porté par l'avenant)", () => {
    expect(isRateParameter("PM-01")).toBe(true);
  });
  it("faux pour PM-02 (commission de retrait, 0 %, non inscrite au contrat) et les autres paramètres", () => {
    // PM-02 ne figure pas dans la version d'avenant (M03 ne lit que PM-01) → pas de ré-édition.
    expect(isRateParameter("PM-02")).toBe(false);
    expect(isRateParameter("PM-03")).toBe(false);
    expect(isRateParameter("PM-08")).toBe(false);
    expect(isRateParameter("")).toBe(false);
  });
});

describe("Double validation du bannissement (RM-16-04, EF-16-07)", () => {
  it("l'approbateur doit être un admin DISTINCT du demandeur", () => {
    expect(canSecondApproveBan("admin-a", "admin-b")).toBe(true);
    expect(canSecondApproveBan("admin-a", "admin-a")).toBe(false);
    expect(canSecondApproveBan("admin-a", "")).toBe(false);
  });
});

describe("Machine d'états des sanctions (EF-16-03/07)", () => {
  it("statut initial : SUSPENSION/REACTIVATION immédiates, BAN en attente", () => {
    expect(initialSanctionStatus("SUSPENSION")).toBe("EXECUTED");
    expect(initialSanctionStatus("REACTIVATION")).toBe("EXECUTED");
    expect(initialSanctionStatus("BAN")).toBe("PENDING_SECOND_APPROVAL");
  });

  it.each([
    ["PENDING_SECOND_APPROVAL", "EXECUTED", true], // approbation du 2ᵉ admin
    ["PENDING_SECOND_APPROVAL", "REJECTED", true], // refus du 2ᵉ admin
    ["EXECUTED", "REVERSED", true], // réactivation lève une suspension
    ["PENDING_SECOND_APPROVAL", "REVERSED", false],
    ["EXECUTED", "EXECUTED", false], // rejeu = no-op (D-046)
    ["REJECTED", "EXECUTED", false], // terminal
    ["REVERSED", "EXECUTED", false], // terminal
  ] as const)("%s → %s : %s", (from, to, ok) => {
    expect(canTransitionSanction(from, to)).toBe(ok);
  });
});
