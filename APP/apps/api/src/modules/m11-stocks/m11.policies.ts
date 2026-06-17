/**
 * M11 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M11_stocks_catalogues.md
 * Invariants : stock jamais négatif, toute variation par un MouvementStock signé (RM-11-01) ;
 * un lot périmé ne compte jamais dans le disponible (RM-11-03) ; fraîcheur obligatoire pour
 * publier (RM-11-06, EF-11-08) ; sélection FEFO (premier périmé, premier sorti, CU-11-02) ;
 * recherche/agrégat anonymes (RM-11-04/05).
 */

import { StockMovementType } from "@prisma/client";

// ── Sélection FEFO (premier périmé, premier sorti — CU-11-02) ────────────────

/** Lot candidat au décrément : seules les données utiles à la sélection, pas d'identité. */
export interface FefoLot {
  stockItemId: string;
  lotCode: string;
  quantity: number;
  expiryDate: Date;
}

/** Un lot entamé par le décrément : combien on y prend. */
export interface FefoPick {
  stockItemId: string;
  lotCode: string;
  taken: number;
}

/**
 * Trie les lots NON périmés par péremption croissante (premier périmé d'abord) ;
 * à péremption égale, lotCode stable pour un résultat déterministe. Les lots déjà
 * périmés (expiryDate <= now) ne sont JAMAIS candidats (RM-11-03).
 */
export function fefoOrder(lots: readonly FefoLot[], now: Date): FefoLot[] {
  return lots
    .filter((l) => l.expiryDate.getTime() > now.getTime() && l.quantity > 0)
    .sort((a, b) => {
      const d = a.expiryDate.getTime() - b.expiryDate.getTime();
      return d !== 0 ? d : a.lotCode.localeCompare(b.lotCode);
    });
}

/**
 * Plan de décrément FEFO pour `quantity` unités sur des lots non périmés.
 * Retourne null si le disponible (somme des lots non périmés) < quantity — l'appelant
 * jette alors « Stock insuffisant » (RM-11-01 : jamais négatif).
 */
export function planFefoConsumption(lots: readonly FefoLot[], quantity: number, now: Date): FefoPick[] | null {
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  const ordered = fefoOrder(lots, now);
  const available = ordered.reduce((s, l) => s + l.quantity, 0);
  if (available < quantity) return null;

  const picks: FefoPick[] = [];
  let remaining = quantity;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    const taken = Math.min(lot.quantity, remaining);
    picks.push({ stockItemId: lot.stockItemId, lotCode: lot.lotCode, taken });
    remaining -= taken;
  }
  return picks;
}

// ── Fraîcheur (EF-11-08, RM-11-06) ───────────────────────────────────────────

/**
 * Stock « frais » si la dernière fraîcheur (dernier mouvement OU confirmation) remonte à
 * MOINS de PM-33. Au-delà, la pharmacie est exclue de la recherche jusqu'à confirmation.
 * pm33Seconds est injecté (jamais codé en dur, RT §3).
 */
export function isFresh(lastFreshAt: Date | null, pm33Seconds: number, now: Date): boolean {
  if (!lastFreshAt) return false;
  const ageSeconds = (now.getTime() - lastFreshAt.getTime()) / 1000;
  return ageSeconds < pm33Seconds;
}

// ── Exclusion par strikes (EF-12-07, PM-34) ──────────────────────────────────

/**
 * Une pharmacie est exclue si elle cumule >= 3 strikes ACTIVE dans les 30 derniers jours
 * (produit promis mais manquant à l'arrivée — anti R-03). Le comptage des strikes récents
 * est fait en base ; cette fonction porte le seuil et la comparaison.
 */
export const STRIKE_EXCLUSION_THRESHOLD = 3;
export const STRIKE_WINDOW_DAYS = 30;

export function isExcludedByStrikes(activeStrikesLast30Days: number): boolean {
  return activeStrikesLast30Days >= STRIKE_EXCLUSION_THRESHOLD;
}

// ── Disponible publié (RM-11-03, RM-12-02) ───────────────────────────────────

/**
 * Disponible publié = somme des lots NON périmés − réservations ACTIVE, jamais < 0
 * (RM-11-03 : un lot périmé ne compte jamais ; RM-12-02 : pas de double promesse).
 */
export function publishableQuantity(freshLotsTotal: number, activeReservedTotal: number): number {
  return Math.max(0, freshLotsTotal - activeReservedTotal);
}

// ── Classement « meilleure pharmacie » (EF-12-03, RM-12-04) ──────────────────

/** Candidate au choix optimal — agrégats anonymes, AUCUNE identité exposée au patient. */
export interface FacilityCandidate {
  facilityId: string;
  /** Nb de produits demandés dont le disponible publié >= quantité demandée. */
  coverage: number;
  /** Fraîcheur du stock (lastFreshAt) — départage à couverture égale. */
  freshnessAt: Date;
}

/**
 * Score documenté (RM-12-04), du plus déterminant au moins :
 * 1) couverture maximale ; 2) stock le plus frais (lastFreshAt récent) ;
 * 3) à égalité parfaite, facilityId stable (tri lexicographique). Retourne null si
 * aucune candidate ne couvre AU MOINS un produit (coverage === 0).
 */
export function pickOptimal(candidates: readonly FacilityCandidate[]): FacilityCandidate | null {
  const eligible = candidates.filter((c) => c.coverage > 0);
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    if (a.coverage !== b.coverage) return b.coverage - a.coverage;
    const f = b.freshnessAt.getTime() - a.freshnessAt.getTime();
    return f !== 0 ? f : a.facilityId.localeCompare(b.facilityId);
  })[0];
}

// ── Alertes (EF-11-05, CU-11-04) ─────────────────────────────────────────────

export type StockAlertKind = "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON";

export interface StockAlert {
  medicamentId: string;
  kind: StockAlertKind;
  /** Disponible non périmé du produit (rupture/faible) ou quantité du lot (péremption). */
  quantity: number;
  /** Lot concerné pour une péremption proche. */
  lotCode?: string;
  expiryDate?: Date;
}

/**
 * Rupture si le disponible non périmé est 0, stock faible s'il est <= seuil configuré
 * (et > 0). Un produit sans seuil n'émet pas d'alerte « faible » (seulement rupture).
 */
export function evaluateStockLevel(
  medicamentId: string,
  freshAvailable: number,
  lowStockThreshold: number | null,
): StockAlert | null {
  if (freshAvailable <= 0) return { medicamentId, kind: "OUT_OF_STOCK", quantity: 0 };
  if (lowStockThreshold != null && freshAvailable <= lowStockThreshold) {
    return { medicamentId, kind: "LOW_STOCK", quantity: freshAvailable };
  }
  return null;
}

/**
 * Péremption proche : un lot encore valide (expiryDate > now) dont la péremption tombe
 * dans les PM-32 jours à venir (CU-11-04). PM-32 injecté en jours.
 */
export function isExpiringSoon(expiryDate: Date, pm32Days: number, now: Date): boolean {
  const horizon = now.getTime() + pm32Days * 24 * 60 * 60 * 1000;
  const at = expiryDate.getTime();
  return at > now.getTime() && at <= horizon;
}

// ── Mouvements signés (RM-11-01, EF-11-06) ───────────────────────────────────

/**
 * Signe d'un mouvement : ENTRY et CORRECTION peuvent être positifs ou négatifs (la
 * correction porte un delta signé) ; EXIT et DISPENSE sont toujours négatifs. Cette
 * fonction valide la cohérence type/signe AVANT écriture (le journal est inaltérable).
 */
export function movementSignIsValid(type: StockMovementType, quantity: number): boolean {
  if (!Number.isInteger(quantity) || quantity === 0) return false;
  switch (type) {
    case StockMovementType.ENTRY:
      return quantity > 0;
    case StockMovementType.EXIT:
    case StockMovementType.DISPENSE:
      return quantity < 0;
    case StockMovementType.CORRECTION:
      return true; // delta signé
    default:
      return false;
  }
}

/**
 * Invariant de cohérence (RM-11-01) : la somme signée des mouvements d'un lot est égale
 * à la quantité courante du lot. Les tests rejouent des séquences pour le vérifier.
 */
export function quantityFromMovements(signedMovements: readonly number[]): number {
  return signedMovements.reduce((s, q) => s + q, 0);
}

/** Delta d'une correction d'inventaire vers une quantité cible (EF-11-09). */
export function correctionDelta(currentQuantity: number, targetQuantity: number): number {
  return targetQuantity - currentQuantity;
}
