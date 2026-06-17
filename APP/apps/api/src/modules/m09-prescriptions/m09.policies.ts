/**
 * M09 — règles métier PURES (testables sans base ni réseau).
 * Spec : docs/cahier_des_charges/02_modules/M09_ordonnance_delivrance.md
 *
 * Invariants tenus ici :
 * - RM-09-01 : seul un prescripteur prescrit (catégories prescriptrices) ;
 * - RM-09-02/04 : l'état d'une ordonnance vit côté serveur — qtyDispensed ≤ qtyPrescribed ;
 * - RM-09-05 : une ordonnance annulée/expirée ne se réactive pas (transitions strictes) ;
 * - EF-09-04 : scellement = QR opaque fort + empreinte sha256 du contenu canonique.
 * Aucun chiffre métier en dur : l'expiration (PM-10) est injectée depuis ParamsService.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { ProfessionalCategory, PrescriptionStatus } from "@prisma/client";
import { canonicalJson } from "../../common/crypto/hash-chain";

// ── Catégories prescriptrices (RM-09-01, EF-09-01) ───────────────────────────

/**
 * Catégories autorisées à prescrire. Choix MVP documenté : la spec (EF-09-01) encadre la
 * sage-femme à « son domaine » (liste du référentiel, hors-périmètre MVP : référentiel non
 * stabilisé, R-09). En l'absence de cette liste, on autorise au MVP TOUTES les catégories
 * cliniques (médecin généraliste, spécialiste, dentiste, sage-femme, infirmier) ; SEUL
 * l'agent de santé communautaire (COMMUNITY_HEALTH_WORKER) est exclu — il n'a pas qualité
 * pour prescrire. Le garde-fou domaine de la sage-femme arrivera avec le référentiel (V1).
 */
export const PRESCRIBING_CATEGORIES: readonly ProfessionalCategory[] = [
  ProfessionalCategory.GENERAL_PRACTITIONER,
  ProfessionalCategory.SPECIALIST,
  ProfessionalCategory.DENTIST,
  ProfessionalCategory.MIDWIFE,
  ProfessionalCategory.NURSE,
];

/** Vrai si la catégorie professionnelle peut prescrire (RM-09-01). */
export function isPrescribingCategory(category: ProfessionalCategory): boolean {
  return PRESCRIBING_CATEGORIES.includes(category);
}

// ── Scellement : QR opaque + empreinte (EF-09-04, RM-09-02) ──────────────────

/**
 * Jeton QR opaque, fort et non devinable (RM-09-02 : le QR n'est qu'une clé, jamais une
 * preuve). UUID v4 + 32 octets aléatoires en hex — entropie largement suffisante.
 */
export function generateQrToken(): string {
  return `${randomUUID()}.${randomBytes(32).toString("hex")}`;
}

/** Contenu canonique scellé : ce qui est signé par l'empreinte (ordre des clés indépendant). */
export interface SealableContent {
  prescriptionId: string;
  sessionId: string;
  prescriberId: string;
  patientAccountId: string;
  subProfileId: string | null;
  expiresAtIso: string;
  lines: Array<{
    medicamentId: string | null;
    freeText: string | null;
    posology: string;
    durationDays: number | null;
    qtyPrescribed: number;
  }>;
}

/**
 * Empreinte sha256 du contenu canonique = signature plateforme (EF-09-04). Toute altération
 * du contenu casse l'empreinte. On réutilise la sérialisation canonique de la chaîne d'audit
 * (clés triées récursivement) pour un hash stable indépendant de l'ordre d'insertion.
 */
export function computeBodyHash(content: SealableContent): string {
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}

// ── Validation des quantités (EF-09-02) ──────────────────────────────────────

/** Quantité prescrite valide : entier strictement positif (EF-09-02). */
export function qtyPrescribedValid(qty: number): boolean {
  return Number.isInteger(qty) && qty > 0;
}

/**
 * Une délivrance d'une ligne est valide si elle est strictement positive ET ne dépasse pas
 * le restant (qtyPrescribed - qtyDispensed) — RM-09-02, anti double délivrance.
 */
export function dispenseQuantityValid(quantity: number, alreadyDispensed: number, prescribed: number): boolean {
  if (!Number.isInteger(quantity) || quantity <= 0) return false;
  return alreadyDispensed + quantity <= prescribed;
}

/** Restant délivrable d'une ligne (jamais négatif). */
export function remaining(prescribed: number, dispensed: number): number {
  return Math.max(0, prescribed - dispensed);
}

// ── Statut global d'une ordonnance (EF-09-08) ────────────────────────────────

export interface LineSettlement {
  qtyPrescribed: number;
  qtyDispensed: number;
}

/** Une ligne est soldée quand le cumul délivré atteint la quantité prescrite. */
export function lineFullyDispensed(line: LineSettlement): boolean {
  return line.qtyDispensed >= line.qtyPrescribed;
}

/**
 * Statut après délivrance, calculé depuis l'état des lignes (EF-09-08) :
 * - toutes les lignes soldées → DISPENSED ;
 * - au moins une ligne entamée mais pas tout soldé → PARTIALLY_DISPENSED ;
 * - rien encore délivré → ACTIVE.
 * Ne s'applique qu'à une ordonnance en cours (ACTIVE / PARTIALLY_DISPENSED) ; l'expiration et
 * l'annulation sont des transitions distinctes et terminales (RM-09-05).
 */
export function statusAfterDispensation(lines: readonly LineSettlement[]): PrescriptionStatus {
  const anyDispensed = lines.some((l) => l.qtyDispensed > 0);
  if (!anyDispensed) return PrescriptionStatus.ACTIVE;
  const allDone = lines.every(lineFullyDispensed);
  return allDone ? PrescriptionStatus.DISPENSED : PrescriptionStatus.PARTIALLY_DISPENSED;
}

// ── Transitions de statut (EF-09-08, RM-09-05) ───────────────────────────────

/** Statuts depuis lesquels une ordonnance reste délivrable (CU-09-03 : solde ailleurs). */
export const DISPENSABLE_STATUSES: readonly PrescriptionStatus[] = [
  PrescriptionStatus.ACTIVE,
  PrescriptionStatus.PARTIALLY_DISPENSED,
];

/** Vrai si l'ordonnance est dans un statut acceptant encore des délivrances (EF-09-07). */
export function isDispensable(status: PrescriptionStatus): boolean {
  return DISPENSABLE_STATUSES.includes(status);
}

/**
 * Annulation possible UNIQUEMENT depuis ACTIVE / PARTIALLY_DISPENSED (CU-09-04) — jamais
 * une ordonnance déjà soldée, expirée ou annulée (RM-09-05 : pas de réactivation).
 */
export function canCancel(status: PrescriptionStatus): boolean {
  return status === PrescriptionStatus.ACTIVE || status === PrescriptionStatus.PARTIALLY_DISPENSED;
}

/** Vrai si l'ordonnance est expirée selon l'horloge serveur (PM-10, EF-09-08). */
export function isExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/** Échéance d'expiration : now + PM-10 jours (PM-10 injecté, jamais en dur). */
export function expiryDate(now: Date, pm10Days: number): Date {
  return new Date(now.getTime() + pm10Days * 24 * 60 * 60 * 1000);
}

// ── Garde-fou allergies (EF-09-03) ───────────────────────────────────────────

/**
 * Normalise un libellé pour la comparaison allergie ↔ médicament : minuscule, accents
 * retirés, espaces compactés. La correspondance est volontairement permissive (garde-fou,
 * pas verrou) : une allergie active dont le libellé est contenu dans un libellé du médicament
 * (ou l'inverse) déclenche l'alerte.
 */
export function normalizeLabel(label: string): string {
  return label
    .normalize("NFD") // d\u00e9compose "\u00e9" \u2192 "e" + accent combinant
    .replace(/[\u0300-\u036f]/g, "") // marques diacritiques combinantes (accents)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cherche, parmi les allergies actives, celles qui « matchent » l'un des libellés du
 * médicament (DCI + noms commerciaux). Retourne les libellés d'allergie en cause (EF-09-03).
 * Comparaison par inclusion bidirectionnelle sur libellés normalisés.
 */
export function matchingAllergies(medicamentLabels: readonly string[], activeAllergies: readonly string[]): string[] {
  const meds = medicamentLabels.map(normalizeLabel).filter((s) => s.length > 0);
  const hits: string[] = [];
  for (const allergy of activeAllergies) {
    const a = normalizeLabel(allergy);
    if (a.length === 0) continue;
    if (meds.some((m) => m.includes(a) || a.includes(m))) hits.push(allergy);
  }
  return hits;
}
