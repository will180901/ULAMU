/**
 * M04 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M04_audit_signalements.md
 * Invariants : journal en écriture seule (RM-04-01) ; consulter = acte audité (RM-04-02) ;
 * jamais de contenu médical dans l'audit (RM-04-03) ; signaleur anonyme vis-à-vis du signalé (RM-04-04).
 */
import { ChainablePayload, computeEventHash, GENESIS_HASH } from "../../common/crypto/hash-chain";

// ── Chaînage du journal (EF-04-01/02) ────────────────────────────────────────

/**
 * Calcule le maillon suivant de la chaîne (EF-04-02) : prevHash = empreinte du dernier
 * événement, ou GENESIS_HASH pour le tout premier. C'est la logique d'append de
 * AuditChainService — pure, donc validée de bout en bout dans m04.policies.spec.ts.
 */
export function chainEvent(lastHash: string | null, payload: ChainablePayload): { prevHash: string; hash: string } {
  const prevHash = lastHash ?? GENESIS_HASH;
  return { prevHash, hash: computeEventHash(prevHash, payload) };
}

// ── Consultation du journal (EF-04-04) ───────────────────────────────────────

/** Borne TECHNIQUE de pagination (pas un paramètre métier PM-xx) — exigée ≤ 200 par l'API. */
export const AUDIT_QUERY_MAX_PAGE_SIZE = 200;
/** Taille de page par défaut quand le client ne précise rien. */
export const AUDIT_QUERY_DEFAULT_PAGE_SIZE = 50;

/** Taille de page effective : défaut si absente, plancher 1, plafond AUDIT_QUERY_MAX_PAGE_SIZE. */
export function clampAuditPageSize(requested?: number): number {
  const wanted = requested === undefined ? AUDIT_QUERY_DEFAULT_PAGE_SIZE : Math.floor(requested);
  return Math.min(Math.max(1, wanted), AUDIT_QUERY_MAX_PAGE_SIZE);
}

/** Bornes TECHNIQUES de la vérification d'intégrité (EF-04-02) — lot lu en une passe. */
export const INTEGRITY_CHECK_MAX_EVENTS = 100_000;
export const INTEGRITY_CHECK_DEFAULT_EVENTS = 10_000;

// ── Signalements (EF-04-05/06/07) ────────────────────────────────────────────

/** Cibles signalables au MVP (EF-04-05) — alignées sur l'enum Prisma ReportTargetType. */
export const REPORT_TARGET_TYPES = ["PROFILE", "FACILITY", "SESSION_MESSAGE"] as const;
export type ReportTargetTypeCode = (typeof REPORT_TARGET_TYPES)[number];

/** Liste fermée des motifs (EF-04-05) — le texte libre est porté par reasonText, jamais par le code. */
export const REPORT_REASON_CODES = [
  "INAPPROPRIATE_BEHAVIOR",
  "MISLEADING_INFORMATION",
  "SUSPECTED_FAKE_PROFILE",
  "HARASSMENT",
  "SPAM",
  "OTHER",
] as const;
export type ReportReasonCode = (typeof REPORT_REASON_CODES)[number];

/** Issues possibles d'un signalement (EF-04-06) : rejet motivé, avertissement, transmission M16/M03. */
export const REPORT_DECISIONS = ["DISMISSED", "WARNING", "ESCALATED_M16", "ESCALATED_M03"] as const;
export type ReportDecision = (typeof REPORT_DECISIONS)[number];

export type ReportFinalStatus = "DISMISSED" | "ACTION_TAKEN";

/**
 * Statut final du signalement selon la décision (EF-04-06, CU-04-04) :
 * DISMISSED → DISMISSED ; WARNING / ESCALATED_* → ACTION_TAKEN.
 */
export function mapDecisionToStatus(decision: ReportDecision): ReportFinalStatus {
  return decision === "DISMISSED" ? "DISMISSED" : "ACTION_TAKEN";
}

/**
 * Dépassement du délai cible de traitement (PM-23, CU-04-04) :
 * en retard si STRICTEMENT plus de `slaHours` heures se sont écoulées depuis la création.
 */
export function isReportOverdue(createdAt: Date, nowMs: number, slaHours: number): boolean {
  return nowMs - createdAt.getTime() > slaHours * 3_600_000;
}

/**
 * RM-04-04 / EF-04-07 — protection du signaleur : son identité ne sort JAMAIS dans les
 * réponses admin de liste. Tout signalement passe par ce mapper avant d'être renvoyé.
 */
export function redactReportForAdmin<T extends { reporterId: unknown }>(report: T): Omit<T, "reporterId"> {
  const { reporterId: _reporterId, ...redacted } = report;
  void _reporterId;
  return redacted;
}

// ── Audit C5 — type d'acteur ─────────────────────────────────────────────────

/** Type d'acteur C5 à partir du type de compte (AccountType → AuditEntry.actorType). */
export function auditActorType(accountType: string): "patient" | "professional" | "facility_member" | "admin" | "system" {
  switch (accountType) {
    case "PATIENT":
      return "patient";
    case "PROFESSIONAL":
      return "professional";
    /* ⚠️ NE PAS RETIRER CE CAS (chantier 25, 02/09/2026).

       `FACILITY_MEMBER` sort du PRODUIT (D-051) : plus aucun compte de ce type ne peut naître. Mais
       cette fonction ne décrit pas ce qu'on peut créer — elle traduit un type **déjà stocké** vers
       le journal d'audit, qui est chaîné par hachage et en INSERTION SEULE.

       Retirer le cas ferait retomber sur le `default` : l'action d'un compte hérité serait inscrite
       comme venant du « système », **définitivement**, et l'intégrité de la chaîne interdirait de la
       corriger. Un nettoyage produirait une falsification. */
    case "FACILITY_MEMBER":
      return "facility_member";
    case "ADMIN":
      return "admin";
    default:
      return "system";
  }
}
