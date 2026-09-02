/**
 * M16 — règles de pilotage PURES (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M16_pilotage_administration.md
 *
 * RM-16-01 : ces fonctions ne décrivent que des seuils, des taux et des machines d'états —
 * aucune écriture métier. RM-16-04 / EF-16-07 : la double validation du bannissement vit ici.
 *
 * Les CIBLES des 7 KPIs sont des chiffres DE SPEC (plan_releases §3, critères de succès du
 * pilote) — PAS des paramètres métier (PM-xx) configurables. Ils sont donc des CONSTANTES
 * documentées ici, et non lus via ParamsService (RT §3 vise les chiffres du métier opérant ;
 * les cibles du pilote relèvent de la décision « V1 ou pivot »).
 */

// ── Cibles des 7 KPIs du pilote (plan_releases §3) ───────────────────────────

/** Sens d'évaluation d'un KPI : "gte" = au moins la cible (vert si value >= target) ;
 *  "lte" = au plus la cible (vert si value <= target). */
export type KpiDirection = "gte" | "lte";

export type KpiStatus = "green" | "red";

export interface KpiTarget {
  /** Identifiant stable du KPI (clé technique, jamais traduite). */
  key: string;
  /** Cible chiffrée de spec (plan_releases §3). */
  target: number;
  /** Sens de comparaison value↔target. */
  direction: KpiDirection;
}

/**
 * Les 7 critères de succès du pilote (plan_releases §3) — EXACTEMENT sept, pas un de plus (EF-16-05).
 * Les unités (count / %) sont portées par le KPI assemblé dans le service, pas ici.
 */
export const KPI_TARGETS = {
  /** ≥ 30 professionnels vérifiés ET actifs (contrat signé). */
  PROS_VERIFIES: { key: "pros_verifies_actifs", target: 30, direction: "gte" },
  /* PHARMACIES_STOCK_VIVANT et DEVOILEMENTS_PAYES sont RETIRÉS le 02/09/2026 (chantier 26) : la
     chaîne du médicament en pharmacie sort du périmètre d'ULAMU. Le plan de sortie compte
     toujours sept critères de succès — DEUX NE SONT PLUS MESURÉS, ni mesurables. L'écart
     appartient au porteur et il est inscrit au §9 du plan d'exécution web. */
  /** ≥ 1000 sessions de consultation réalisées (terminées). */
  SESSIONS: { key: "sessions_realisees", target: 1000, direction: "gte" },
  /** ≥ 70 % de taux de confirmation des poignées de main. */
  TAUX_CONFIRMATION: { key: "taux_confirmation", target: 70, direction: "gte" },
  /** ≤ 5 % de remboursements automatiques (incidents). */
  TAUX_REMBOURSEMENT_AUTO: { key: "taux_remboursement_auto", target: 5, direction: "lte" },
  /** ≥ 40 % de patients revenus (≥ 2 sessions parmi ceux en ayant ≥ 1). */
  PATIENTS_REVENUS: { key: "patients_revenus", target: 40, direction: "gte" },
} as const satisfies Record<string, KpiTarget>;

/** Liste ordonnée des 7 cibles (ordre d'affichage du tableau « critères du pilote »). */
export const KPI_TARGET_LIST: readonly KpiTarget[] = [
  KPI_TARGETS.PROS_VERIFIES,
  KPI_TARGETS.SESSIONS,
  KPI_TARGETS.TAUX_CONFIRMATION,
  KPI_TARGETS.TAUX_REMBOURSEMENT_AUTO,
  KPI_TARGETS.PATIENTS_REVENUS,
];

// ── Évaluation des KPIs (CU-16-03) ───────────────────────────────────────────

/**
 * Pourcentage numerator/denominator borné à une décimale d'usage (taux KPI/dashboards).
 * Dénominateur nul (aucune donnée encore) → 0 % : on n'invente pas un taux sur du vide.
 */
export function rate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** Statut vert/rouge d'un KPI selon sa cible et son sens (seuils du pilote, CU-16-03). */
export function evaluateKpi(value: number, target: number, direction: KpiDirection): KpiStatus {
  if (direction === "lte") return value <= target ? "green" : "red";
  return value >= target ? "green" : "red";
}

// ── Paramètres de taux contractuel (EF-16-04, D-022) ─────────────────────────

/**
 * Un changement du TAUX DE COMMISSION sur consultation (PM-01) déclenche la mécanique d'avenant
 * (M03/D-022) : les contrats signés sont réédités au nouveau taux — c'est le SEUL taux porté par
 * la version d'avenant (M03 ne lit que PM-01). PM-02 (commission de retrait, 0 %) n'apparaît PAS
 * dans le contrat : le changer ne génère donc aucun avenant. Les autres PM-xx (prix, délais…) non plus.
 */
const RATE_PARAMETER_KEYS: readonly string[] = ["PM-01"];

export function isRateParameter(key: string): boolean {
  return RATE_PARAMETER_KEYS.includes(key);
}

// ── Double validation du bannissement (RM-16-04, EF-16-07) ───────────────────

/**
 * Le bannissement définitif exige une approbation par un admin DISTINCT du demandeur
 * (même esprit que PM-35 côté finance). Un identifiant vide n'approuve jamais.
 */
export function canSecondApproveBan(requestedBy: string, approverId: string): boolean {
  return approverId.length > 0 && requestedBy !== approverId;
}

// ── Machine d'états des sanctions (EF-16-03/07) ──────────────────────────────

export type SanctionTypeCode = "SUSPENSION" | "REACTIVATION" | "BAN";
export type SanctionStatusCode = "EXECUTED" | "PENDING_SECOND_APPROVAL" | "REVERSED" | "REJECTED";

/**
 * Statut INITIAL d'une sanction selon son type :
 * - SUSPENSION / REACTIVATION : effet IMMÉDIAT → EXECUTED dès l'enregistrement (CU-16-01) ;
 * - BAN : irréversible → PENDING_SECOND_APPROVAL, en attente du 2ᵉ admin (EF-16-07).
 */
export function initialSanctionStatus(type: SanctionTypeCode): SanctionStatusCode {
  return type === "BAN" ? "PENDING_SECOND_APPROVAL" : "EXECUTED";
}

/**
 * Transitions LÉGALES d'une sanction. Seul le BAN évolue après création
 * (approbation → EXECUTED, refus → REJECTED) ; les autres sont terminales à l'exécution.
 * Chaque transition est doublée d'un updateMany conditionnel en base (anti-TOCTOU, D-046).
 */
const SANCTION_TRANSITIONS: Record<SanctionStatusCode, readonly SanctionStatusCode[]> = {
  PENDING_SECOND_APPROVAL: ["EXECUTED", "REJECTED"],
  EXECUTED: ["REVERSED"], // réactivation lève une suspension (trace dédiée côté service)
  REVERSED: [],
  REJECTED: [],
};

export function canTransitionSanction(from: SanctionStatusCode, to: SanctionStatusCode): boolean {
  return (SANCTION_TRANSITIONS[from] ?? []).includes(to);
}
