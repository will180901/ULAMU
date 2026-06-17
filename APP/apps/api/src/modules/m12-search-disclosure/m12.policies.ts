/**
 * M12 — règles métier PURES du Recherche & Dévoilement (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M12_recherche_devoilement.md
 *
 * Tous les chiffres MÉTIER (PM-03 prix du dévoilement, PM-08 durée 24 h, PM-34 DURÉE d'exclusion
 * après strikes) sont INJECTÉS par les services via ParamsService — jamais codés en dur ici
 * (RT §3). Les seules constantes locales sont des chiffres DE SPEC non paramétrés (seuil de
 * 3 strikes et fenêtre de comptage de 30 j, EF-12-07) ou des bornes techniques (taille de page).
 *
 * Le « modèle signature » (D-009) : la recherche dit GRATUITEMENT « ça existe près de chez toi » ;
 * le dévoilement VEND « voici exactement où, réservé pour toi ». RM-12-01 (règle d'or) :
 * aucune identité de structure n'est jamais exposée sans un dévoilement ACTIVE du patient.
 */

// ── Référence d'ordre C1 (RM-13-01 : opaque pour M13, structurée pour M12) ───

export const DISCLOSURE_ORDER_REF_PREFIX = "disclosure:";

/** Référence d'ordre du dévoilement (paiement 100 % ULAMU, PM-03). */
export function orderRefForDisclosure(disclosureId: string): string {
  return `${DISCLOSURE_ORDER_REF_PREFIX}${disclosureId}`;
}

/**
 * Identifiant de dévoilement porté par une référence d'ordre — null si la référence vient
 * d'un autre module (poignée de main M06…) : le webhook M13 est PARTAGÉ (C1, canal unique).
 * M12 ignore (no-op) tout orderRef qui ne commence pas par "disclosure:", comme M06 ignore
 * les nôtres — chacun ne traite que ses propres ordres.
 */
export function disclosureIdFromOrderRef(orderRef: string): string | null {
  if (!orderRef.startsWith(DISCLOSURE_ORDER_REF_PREFIX)) return null;
  const id = orderRef.slice(DISCLOSURE_ORDER_REF_PREFIX.length);
  return id.length > 0 ? id : null;
}

// ── Cycle de vie du dévoilement (spec §5 ; D-009) ────────────────────────────

/** `en attente de paiement → actif → servi` (sorties : expiré PM-08, remboursé Q-004). */
export const DISCLOSURE_STATUSES = ["PENDING_PAYMENT", "ACTIVE", "SERVED", "EXPIRED", "REFUNDED"] as const;
export type DisclosureStatusCode = (typeof DISCLOSURE_STATUSES)[number];

/**
 * Machine d'états du dévoilement (spec §5) :
 * - PENDING_PAYMENT → ACTIVE (paiement confirmé, CU-12-02) | REFUNDED (aucune pharmacie à la
 *   confirmation → remboursement automatique RM-12-06) | EXPIRED (paiement jamais confirmé) ;
 * - ACTIVE → SERVED (remise/scan M09, CU-12-03) | EXPIRED (24 h écoulées, CU-12-05) |
 *   REFUNDED (« non disponible » sans alternative, EF-12-06) | EXPIRED (re-dévoilement :
 *   l'ancien dévoilement passe à un état terminal au profit du nouveau, RM-12-06) ;
 * - SERVED / EXPIRED / REFUNDED : terminaux — racheter un dévoilement est nécessaire (D-009).
 */
const DISCLOSURE_TRANSITIONS: Record<DisclosureStatusCode, readonly DisclosureStatusCode[]> = {
  PENDING_PAYMENT: ["ACTIVE", "REFUNDED", "EXPIRED"],
  ACTIVE: ["SERVED", "EXPIRED", "REFUNDED"],
  SERVED: [],
  EXPIRED: [],
  REFUNDED: [],
};

/** Toute écriture de statut passe par ici ET par un updateMany conditionnel en base (D-046). */
export function canTransitionDisclosure(from: DisclosureStatusCode, to: DisclosureStatusCode): boolean {
  return (DISCLOSURE_TRANSITIONS[from] ?? []).includes(to);
}

// ── Expiration paresseuse de la session 24 h (EF-12-04, CU-12-05) ────────────

/**
 * Un dévoilement ACTIVE est expiré quand now ≥ expiresAt (paidAt + PM-08). expiresAt absent
 * sur un ACTIVE = anomalie de données → EXPIRÉ (fail-closed : jamais d'identité révélée sans
 * fenêtre valide, RM-12-01). Tout autre statut n'est jamais « expirable ».
 */
export function disclosureExpired(status: DisclosureStatusCode, expiresAt: Date | null, nowMs: number): boolean {
  if (status !== "ACTIVE") return false;
  if (expiresAt === null) return true; // fail-closed (RM-12-01)
  return nowMs >= expiresAt.getTime();
}

/**
 * RM-06-02 / D-025 : le compte à rebours est calculé par le SERVEUR — les horloges clientes
 * sont indicatives. expiresAt absent ou dépassé → 0. Arrondi au plafond : tant qu'il reste une
 * fraction de seconde, elle compte (le patient en route ne perd jamais une seconde due).
 */
export function remainingSeconds(expiresAt: Date | null, nowMs: number): number {
  if (expiresAt === null) return 0;
  return Math.max(0, Math.ceil((expiresAt.getTime() - nowMs) / 1000));
}

// ── Strikes de fiabilité (EF-12-07, PM-34) ───────────────────────────────────

/**
 * Seuil de spec (EF-12-07) : 3 strikes ACTIVE en 30 jours → exclusion temporaire PM-34. La
 * fenêtre (30 jours) et la décision d'exclusion vivent côté M11 (isPublishable, qui compte
 * déjà les strikes — on ne duplique pas la logique). Ce prédicat sert UNIQUEMENT à décider si
 * l'on notifie le titulaire (alerte contractuelle, CU-12-04) au moment où un strike est posé.
 */
export const STRIKE_EXCLUSION_THRESHOLD = 3;

/** Vrai si, avec ce nouveau strike, la pharmacie ATTEINT le seuil d'exclusion (alerte titulaire). */
export function reachesStrikeThreshold(activeStrikesLast30DaysIncludingNew: number): boolean {
  return activeStrikesLast30DaysIncludingNew >= STRIKE_EXCLUSION_THRESHOLD;
}

// ── Masquage de la révélation selon le statut (RM-12-01 — RÈGLE D'OR) ─────────

/** Champs révélés UNIQUEMENT pendant un dévoilement ACTIVE (nom, téléphone, quartier, GPS…). */
export interface RevealedFacility {
  facilityId: string;
  name: string;
  phone: string | null;
  quarter: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * RM-12-01 (règle d'or) : nom / téléphone / quartier / GPS / itinéraire / compte à rebours ne
 * sont exposés QUE si le dévoilement est ACTIVE. Tout autre statut → informations MASQUÉES
 * (null), même si la pharmacie est techniquement connue en base (D-009). Cette fonction est le
 * point UNIQUE de décision du masquage — aucun champ d'identité ne sort sans passer par ici.
 */
export function revealIfActive(
  status: DisclosureStatusCode,
  facility: RevealedFacility | null,
): RevealedFacility | null {
  if (status !== "ACTIVE") return null;
  return facility;
}

// ── Lignes restantes d'une ordonnance (EF-12-01 : recherche par ordonnance) ──

/** Une ligne de prescription, réduite à ce qui sert à la recherche (pas de posologie). */
export interface PrescriptionLineQty {
  medicamentId: string | null;
  qtyPrescribed: number;
  qtyDispensed: number;
}

/** Item de recherche : un médicament référencé et la quantité voulue. */
export interface SearchItem {
  medicamentId: string;
  quantity: number;
}

/**
 * Lignes RESTANTES d'une ordonnance (qtyPrescribed − qtyDispensed > 0), cohérent avec la
 * délivrance partielle (CU-09-03). On ignore les lignes hors référentiel (medicamentId null,
 * EF-09-02) : la recherche de disponibilité s'appuie sur le référentiel M11. À médicament
 * répété sur plusieurs lignes, les restes se cumulent (un seul item par médicament).
 */
export function remainingItemsFromLines(lines: readonly PrescriptionLineQty[]): SearchItem[] {
  const byMed = new Map<string, number>();
  for (const line of lines) {
    if (!line.medicamentId) continue;
    const remaining = line.qtyPrescribed - line.qtyDispensed;
    if (remaining <= 0) continue;
    byMed.set(line.medicamentId, (byMed.get(line.medicamentId) ?? 0) + remaining);
  }
  return [...byMed.entries()].map(([medicamentId, quantity]) => ({ medicamentId, quantity }));
}

/**
 * Normalise les items d'une recherche/dévoilement libre : déduplique par médicament (cumul des
 * quantités), écarte les quantités non entières ou ≤ 0. Garantit des items propres avant l'appel
 * à M11 (searchAnonymous / pickOptimalFacility) et avant la pose de réservation.
 */
export function normalizeItems(items: readonly SearchItem[]): SearchItem[] {
  const byMed = new Map<string, number>();
  for (const item of items) {
    if (!item.medicamentId) continue;
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) continue;
    byMed.set(item.medicamentId, (byMed.get(item.medicamentId) ?? 0) + item.quantity);
  }
  return [...byMed.entries()].map(([medicamentId, quantity]) => ({ medicamentId, quantity }));
}

// ── Chaîne de re-dévoilement (EF-12-06 : exclure les pharmacies déjà essayées) ──

/**
 * Pharmacies à EXCLURE du re-dévoilement gratuit : la pharmacie fautive du dévoilement courant
 * et toutes celles déjà révélées le long de la chaîne `supersedes` (on ne re-propose jamais une
 * pharmacie qui a déjà échoué pour ce patient — RM-12-06). Les facilityId null (dévoilements
 * jamais activés) sont ignorés.
 */
export function excludedFacilityIds(facilityIds: ReadonlyArray<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const id of facilityIds) {
    if (id) set.add(id);
  }
  return [...set];
}

// ── Pagination (bornes TECHNIQUES, pas des paramètres métier) ────────────────

export const DEFAULT_HISTORY_PAGE_SIZE = 50;
export const MAX_HISTORY_PAGE_SIZE = 100;

/** Taille de page demandée → bornée [1;MAX], défaut DEFAULT. */
export function clampHistoryPageSize(requested?: number): number {
  if (requested === undefined || !Number.isInteger(requested) || requested < 1) return DEFAULT_HISTORY_PAGE_SIZE;
  return Math.min(requested, MAX_HISTORY_PAGE_SIZE);
}
