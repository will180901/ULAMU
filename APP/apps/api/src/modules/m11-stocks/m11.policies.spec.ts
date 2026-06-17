/**
 * Tests des règles M11 — critères d'acceptation CU-11-02 (FEFO), EF-11-08/RM-11-06 (fraîcheur),
 * EF-12-03/RM-12-04 (choix optimal), EF-11-05/CU-11-04 (alertes) et RM-11-01 (invariant signé).
 */
import { StockMovementType } from "@prisma/client";
import {
  correctionDelta,
  evaluateStockLevel,
  fefoOrder,
  isExcludedByStrikes,
  isExpiringSoon,
  isFresh,
  movementSignIsValid,
  pickOptimal,
  planFefoConsumption,
  publishableQuantity,
  quantityFromMovements,
} from "./m11.policies";

const NOW = new Date("2026-06-13T00:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

const lot = (id: string, lotCode: string, quantity: number, expiryOffsetDays: number) => ({
  stockItemId: id,
  lotCode,
  quantity,
  expiryDate: day(expiryOffsetDays),
});

describe("FEFO — premier périmé, premier sorti (CU-11-02, RM-11-03)", () => {
  it("ordonne par péremption croissante et exclut les lots périmés", () => {
    const lots = [lot("c", "L3", 10, 30), lot("a", "L1", 10, 10), lot("b", "L2", 10, -1)];
    const ordered = fefoOrder(lots, NOW);
    expect(ordered.map((l) => l.lotCode)).toEqual(["L1", "L3"]); // L2 périmé exclu
  });

  it("départage les péremptions égales par lotCode stable", () => {
    const lots = [lot("y", "L-B", 5, 10), lot("x", "L-A", 5, 10)];
    expect(fefoOrder(lots, NOW).map((l) => l.lotCode)).toEqual(["L-A", "L-B"]);
  });

  it("planifie le décrément en entamant le lot le plus proche de la péremption d'abord", () => {
    const lots = [lot("c", "L3", 100, 30), lot("a", "L1", 5, 10), lot("b", "L2", 8, 20)];
    const plan = planFefoConsumption(lots, 10, NOW);
    expect(plan).toEqual([
      { stockItemId: "a", lotCode: "L1", taken: 5 },
      { stockItemId: "b", lotCode: "L2", taken: 5 },
    ]);
  });

  it("renvoie null si le disponible non périmé est insuffisant (RM-11-01 : jamais négatif)", () => {
    const lots = [lot("a", "L1", 5, 10), lot("b", "L2", 3, -2)]; // L2 périmé ne compte pas
    expect(planFefoConsumption(lots, 6, NOW)).toBeNull();
  });

  it("rejette une quantité non entière ou non positive", () => {
    const lots = [lot("a", "L1", 100, 10)];
    expect(planFefoConsumption(lots, 0, NOW)).toBeNull();
    expect(planFefoConsumption(lots, -3, NOW)).toBeNull();
    expect(planFefoConsumption(lots, 2.5, NOW)).toBeNull();
  });

  it("consomme exactement un lot quand la quantité l'épuise pile", () => {
    const lots = [lot("a", "L1", 10, 10), lot("b", "L2", 10, 20)];
    expect(planFefoConsumption(lots, 10, NOW)).toEqual([{ stockItemId: "a", lotCode: "L1", taken: 10 }]);
  });
});

describe("Fraîcheur du stock (EF-11-08, RM-11-06, PM-33)", () => {
  const PM33 = 604800; // 7 jours en secondes (valeur seedée)

  it("frais si la dernière fraîcheur remonte à moins de PM-33", () => {
    expect(isFresh(day(-6), PM33, NOW)).toBe(true);
  });
  it("exclu au-delà de PM-33 (7e jour sans mouvement ni confirmation)", () => {
    expect(isFresh(day(-8), PM33, NOW)).toBe(false);
  });
  it("au seuil exact (7 jours pile) : exclu (ancienneté >= PM-33)", () => {
    expect(isFresh(new Date(NOW.getTime() - PM33 * 1000), PM33, NOW)).toBe(false);
  });
  it("jamais de fraîcheur connue → exclu", () => {
    expect(isFresh(null, PM33, NOW)).toBe(false);
  });
});

describe("Exclusion par strikes (EF-12-07, PM-34)", () => {
  it.each([
    [0, false],
    [2, false],
    [3, true],
    [5, true],
  ])("%i strikes ACTIVE en 30 j → exclu %s", (count, excluded) => {
    expect(isExcludedByStrikes(count)).toBe(excluded);
  });
});

describe("Disponible publié (RM-11-03, RM-12-02)", () => {
  it("retranche les réservations actives du disponible non périmé", () => {
    expect(publishableQuantity(20, 8)).toBe(12);
  });
  it("jamais négatif même si les réservations dépassent (libération imminente)", () => {
    expect(publishableQuantity(5, 9)).toBe(0);
  });
});

describe("Choix de la meilleure pharmacie (EF-12-03, RM-12-04)", () => {
  it("priorise la couverture maximale", () => {
    const best = pickOptimal([
      { facilityId: "f1", coverage: 1, freshnessAt: day(0) },
      { facilityId: "f2", coverage: 2, freshnessAt: day(-5) },
    ]);
    expect(best?.facilityId).toBe("f2");
  });

  it("à couverture égale, choisit le stock le plus frais", () => {
    const best = pickOptimal([
      { facilityId: "f1", coverage: 2, freshnessAt: day(-3) },
      { facilityId: "f2", coverage: 2, freshnessAt: day(-1) },
    ]);
    expect(best?.facilityId).toBe("f2");
  });

  it("à égalité parfaite, facilityId stable (déterministe)", () => {
    const best = pickOptimal([
      { facilityId: "f-b", coverage: 1, freshnessAt: day(0) },
      { facilityId: "f-a", coverage: 1, freshnessAt: day(0) },
    ]);
    expect(best?.facilityId).toBe("f-a");
  });

  it("retourne null si aucune candidate ne couvre au moins un produit", () => {
    expect(pickOptimal([{ facilityId: "f1", coverage: 0, freshnessAt: day(0) }])).toBeNull();
    expect(pickOptimal([])).toBeNull();
  });
});

describe("Alertes de niveau (EF-11-05, CU-11-04)", () => {
  it("rupture quand le disponible non périmé est 0", () => {
    expect(evaluateStockLevel("m1", 0, 10)).toEqual({ medicamentId: "m1", kind: "OUT_OF_STOCK", quantity: 0 });
  });
  it("stock faible au seuil ou en dessous (> 0)", () => {
    expect(evaluateStockLevel("m1", 10, 10)).toEqual({ medicamentId: "m1", kind: "LOW_STOCK", quantity: 10 });
    expect(evaluateStockLevel("m1", 3, 10)?.kind).toBe("LOW_STOCK");
  });
  it("pas d'alerte au-dessus du seuil", () => {
    expect(evaluateStockLevel("m1", 11, 10)).toBeNull();
  });
  it("sans seuil configuré : seule la rupture alerte", () => {
    expect(evaluateStockLevel("m1", 2, null)).toBeNull();
    expect(evaluateStockLevel("m1", 0, null)?.kind).toBe("OUT_OF_STOCK");
  });

  it("péremption proche dans la fenêtre PM-32, pas avant ni après l'expiration", () => {
    const PM32 = 60;
    expect(isExpiringSoon(day(30), PM32, NOW)).toBe(true);
    expect(isExpiringSoon(day(60), PM32, NOW)).toBe(true);
    expect(isExpiringSoon(day(61), PM32, NOW)).toBe(false); // hors fenêtre
    expect(isExpiringSoon(day(-1), PM32, NOW)).toBe(false); // déjà périmé : sort du disponible, pas une alerte « proche »
  });
});

describe("Mouvements signés et invariant (RM-11-01, EF-11-06)", () => {
  it.each([
    [StockMovementType.ENTRY, 10, true],
    [StockMovementType.ENTRY, -10, false],
    [StockMovementType.EXIT, -5, true],
    [StockMovementType.EXIT, 5, false],
    [StockMovementType.DISPENSE, -3, true],
    [StockMovementType.DISPENSE, 3, false],
    [StockMovementType.CORRECTION, 7, true],
    [StockMovementType.CORRECTION, -7, true],
    [StockMovementType.CORRECTION, 0, false],
    [StockMovementType.ENTRY, 2.5, false],
  ])("%s %p → %s", (type, qty, ok) => {
    expect(movementSignIsValid(type, qty)).toBe(ok);
  });

  it("invariant : la somme signée des mouvements == quantité du lot", () => {
    // ENTRY +200, DISPENSE -50, EXIT -10 (péremption), CORRECTION -5 (inventaire) → 135
    expect(quantityFromMovements([200, -50, -10, -5])).toBe(135);
    expect(quantityFromMovements([])).toBe(0);
  });

  it("delta de correction d'inventaire vers la cible", () => {
    expect(correctionDelta(120, 100)).toBe(-20); // comptage physique inférieur
    expect(correctionDelta(80, 100)).toBe(20); // surplus retrouvé
    expect(correctionDelta(50, 50)).toBe(0); // pas d'écart
  });
});
