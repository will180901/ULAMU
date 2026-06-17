/**
 * M07 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M07_carnet.md
 * Invariants : un propriétaire = un Carnet (RM-07-01) ; entrées immuables, une correction
 * référence l'ancienne entrée (RM-07-02, EF-07-04) ; provenance toujours visible (RM-07-03) ;
 * le patient voit tout (RM-07-04).
 */

// ── Types d'entrées (EF-07-02) — alignés sur l'enum Prisma RecordEntryType ───

export type RecordEntryTypeCode =
  | "CONSULTATION_REPORT"
  | "PRESCRIPTION"
  | "LAB_RESULTS"
  | "VITALS"
  | "ALLERGY"
  | "MEDICAL_HISTORY"
  | "VACCINATION"
  | "PERSONAL_NOTE";

export const RECORD_ENTRY_TYPES: readonly RecordEntryTypeCode[] = [
  "CONSULTATION_REPORT",
  "PRESCRIPTION",
  "LAB_RESULTS",
  "VITALS",
  "ALLERGY",
  "MEDICAL_HISTORY",
  "VACCINATION",
  "PERSONAL_NOTE",
];

/**
 * EF-07-06 : le patient ne DÉCLARE que allergies, antécédents, vaccinations et notes
 * personnelles — les comptes-rendus/ordonnances/résultats arrivent par les modules C2
 * (EF-07-05 : M06, M09, M10, M08-V1), jamais par déclaration directe.
 */
export const PATIENT_DECLARABLE_TYPES = ["ALLERGY", "MEDICAL_HISTORY", "VACCINATION", "PERSONAL_NOTE"] as const;
export type PatientDeclarableType = (typeof PATIENT_DECLARABLE_TYPES)[number];

export function isPatientDeclarable(type: string): type is PatientDeclarableType {
  return (PATIENT_DECLARABLE_TYPES as readonly string[]).includes(type);
}

// ── Correction d'une entrée (RM-07-02, EF-07-04) ─────────────────────────────

export interface SupersedeRef {
  recordId: string;
  type: string;
}

/**
 * Une entrée ne peut en remplacer une autre QUE si les deux appartiennent au même
 * Carnet ET sont du même type (EF-07-04 : « une correction est une nouvelle entrée
 * qui remplace l'ancienne ») — l'historique reste visible, rien n'est réécrit.
 */
export function canSupersede(existing: SupersedeRef, candidate: SupersedeRef): boolean {
  return existing.recordId === candidate.recordId && existing.type === candidate.type;
}

/**
 * Ensemble des entrées « remplacées » : toute entrée référencée par le supersedesId
 * d'une autre. Une chaîne A←B←C laisse C seule effective (A et B restent visibles
 * dans la chronologie, RM-07-04, mais sont ignorées des calculs de synthèse).
 */
export function supersededIdSet(entries: ReadonlyArray<{ supersedesId: string | null }>): Set<string> {
  const set = new Set<string>();
  for (const e of entries) {
    if (e.supersedesId) set.add(e.supersedesId);
  }
  return set;
}

// ── Fiche synthèse (EF-07-03) — vue CALCULÉE, jamais saisie directement ───────

export interface SummaryEntryInput {
  id: string;
  type: string;
  payload: unknown;
  supersedesId: string | null;
  createdAt: Date;
}

export interface HealthSummary {
  /** Groupe sanguin, ou null si jamais renseigné. */
  bloodType: string | null;
  /** Libellés des allergies actives (CU-07-02 : prises en compte par le garde-fou M09). */
  activeAllergies: string[];
  /** Libellés des maladies chroniques connues. */
  chronicDiseases: string[];
}

/** Lecture défensive d'un champ texte du payload JSON — null si absent ou d'un autre type. */
function strField(payload: unknown, key: string): string | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Lecture défensive d'un champ booléen du payload JSON. */
function boolField(payload: unknown, key: string): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return false;
  return (payload as Record<string, unknown>)[key] === true;
}

/**
 * Calcule la fiche synthèse depuis les entrées ALLERGY / MEDICAL_HISTORY (EF-07-03).
 *
 * Conventions de payload (documentées — choix M07, Chantier 3) :
 * - une entrée REMPLACÉE (référencée par le supersedesId d'une autre, RM-07-02) est IGNORÉE ;
 * - allergie active = entrée ALLERGY effective avec payload.label (texte) ; une correction
 *   peut clore l'allergie en posant payload.resolved=true (elle remplace la déclaration
 *   initiale et n'apparaît plus comme active) ;
 * - maladie chronique = entrée MEDICAL_HISTORY effective payload {kind:"chronic_disease", label} ;
 * - groupe sanguin = entrée MEDICAL_HISTORY effective payload {kind:"blood_type", value}
 *   LA PLUS RÉCENTE non remplacée (et NON une constante VITALS — choix documenté : le groupe
 *   sanguin est un antécédent stable, pas une mesure).
 * Les libellés sont dédupliqués en conservant l'ordre chronologique.
 */
export function computeSummary(entries: ReadonlyArray<SummaryEntryInput>): HealthSummary {
  const replaced = supersededIdSet(entries);
  const effective = entries.filter((e) => !replaced.has(e.id));

  const activeAllergies: string[] = [];
  for (const e of effective) {
    if (e.type !== "ALLERGY" || boolField(e.payload, "resolved")) continue;
    const label = strField(e.payload, "label");
    if (label && !activeAllergies.includes(label)) activeAllergies.push(label);
  }

  const chronicDiseases: string[] = [];
  let bloodType: string | null = null;
  let bloodTypeAt = -Infinity;
  for (const e of effective) {
    if (e.type !== "MEDICAL_HISTORY") continue;
    const kind = strField(e.payload, "kind");
    if (kind === "chronic_disease") {
      const label = strField(e.payload, "label");
      if (label && !chronicDiseases.includes(label)) chronicDiseases.push(label);
    } else if (kind === "blood_type") {
      const value = strField(e.payload, "value");
      // La plus récente non remplacée l'emporte ; à date égale, la dernière insérée.
      if (value && e.createdAt.getTime() >= bloodTypeAt) {
        bloodType = value;
        bloodTypeAt = e.createdAt.getTime();
      }
    }
  }

  return { bloodType, activeAllergies, chronicDiseases };
}

// ── Majorité du sous-profil (EF-07-09, PM-16) ─────────────────────────────────

/**
 * Le sous-profil a-t-il l'âge du transfert (CU-07-05) ? Même calcul que m01.policies
 * isAdult : en UTC (PM-14), minYears injecté depuis PM-16 — jamais en dur.
 */
export function isOwnerAdult(birthDate: Date, minYears: number, now: Date): boolean {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - minYears, now.getUTCMonth(), now.getUTCDate()));
  return birthDate.getTime() <= cutoff.getTime();
}

// ── Pagination de la chronologie (EF-07-03) ──────────────────────────────────

/** Bornes TECHNIQUES de pagination (pas des paramètres métier PM-xx). */
export const RECORD_PAGE_MAX = 100;
export const RECORD_PAGE_DEFAULT = 20;

/** Taille de page effective : défaut si absente, plancher 1, plafond RECORD_PAGE_MAX. */
export function clampRecordPageSize(requested?: number): number {
  const wanted = requested === undefined ? RECORD_PAGE_DEFAULT : Math.floor(requested);
  return Math.min(Math.max(1, wanted), RECORD_PAGE_MAX);
}

// ── Garde-fou de taille d'une déclaration (ENF-02 : Carnet ≤ 50 Mo) ──────────

/** Borne TECHNIQUE d'une déclaration patient (pas un PM-xx) — protège le cache chiffré local. */
export const MAX_DECLARED_PAYLOAD_BYTES = 16_384;

/** La taille se mesure sur la sérialisation JSON du payload (UTF-8 approximé en longueur). */
export function declaredPayloadSizeOk(payload: Record<string, unknown>): boolean {
  try {
    return JSON.stringify(payload).length <= MAX_DECLARED_PAYLOAD_BYTES;
  } catch {
    return false; // structure cyclique ou non sérialisable : refusée
  }
}

// ── Audit C5 — type d'acteur ──────────────────────────────────────────────────

/** Type d'acteur C5 à partir du type de compte (AccountType → AuditEntry.actorType). */
export function auditActorTypeFor(
  accountType: string,
): "patient" | "professional" | "facility_member" | "admin" | "system" {
  switch (accountType) {
    case "PATIENT":
      return "patient";
    case "PROFESSIONAL":
      return "professional";
    case "FACILITY_MEMBER":
      return "facility_member";
    case "ADMIN":
      return "admin";
    default:
      return "system";
  }
}
