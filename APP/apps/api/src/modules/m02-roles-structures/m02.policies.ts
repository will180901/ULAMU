/**
 * M02 — règles métier pures (testables sans base).
 * Spec : docs/cahier_des_charges/02_modules/M02_roles_espaces_structures.md
 * Invariants : un seul titulaire actif par structure (RM-02-01) ; contrôle d'accès côté
 * serveur à chaque requête (EF-02-02, RM-02-03) ; un compte = une seule structure au MVP (RM-02-05).
 */

// ── Droits internes d'un membre (EF-02-05) ───────────────────────────────────

/**
 * Droits internes attribuables par le titulaire (EF-02-05) :
 * - "stock"    : gérer le stock (M11)
 * - "dispense" : traiter les délivrances (M09)
 * - "stats"    : consulter les statistiques
 * Les actions « membres / contrat / retraits » sont RÉSERVÉES au titulaire et ne sont
 * jamais délégables par un droit interne.
 */
export const FACILITY_RIGHTS = ["stock", "dispense", "stats"] as const;
export type FacilityRight = (typeof FACILITY_RIGHTS)[number];

/** Liste de droits valide : uniquement des droits connus, sans doublon (EF-02-05). */
export function rightsAreValid(rights: string[]): rights is FacilityRight[] {
  if (!Array.isArray(rights)) return false;
  if (new Set(rights).size !== rights.length) return false;
  return rights.every((r) => (FACILITY_RIGHTS as readonly string[]).includes(r));
}

// ── Rôles internes d'un espace structure ─────────────────────────────────────

export type FacilityRole = "OWNER" | "MEMBER";

/**
 * Un membre actif a-t-il le droit demandé ? (matrice §5)
 * Le titulaire (OWNER) a TOUS les droits internes d'office ; un simple membre
 * n'a que les droits que le titulaire lui a confiés (EF-02-05).
 */
export function memberHasRight(role: FacilityRole, rights: readonly string[], right: FacilityRight): boolean {
  if (role === "OWNER") return true;
  return rights.includes(right);
}

/** Actions du titulaire sur un membre (EF-02-05/07, CU-02-03/04). */
export type MemberAction = "UPDATE_RIGHTS" | "SUSPEND";

/**
 * Seul le titulaire gère les membres (EF-02-05), et jamais le titulaire lui-même :
 * la titularité ne se modifie que par transfert (CU-02-05) — garantit RM-02-01.
 */
export function canModifyMember(actorRole: FacilityRole, targetRole: FacilityRole, action: MemberAction): boolean {
  if (actorRole !== "OWNER") return false; // réservé au titulaire (EF-02-05)
  if (targetRole === "OWNER") return false; // le titulaire ne se suspend/modifie pas — transfert d'abord (RM-02-01)
  return action === "UPDATE_RIGHTS" || action === "SUSPEND";
}

// ── Acceptation d'une invitation (EF-02-04, CU-02-02) ────────────────────────

export interface InvitationSnapshot {
  /** Statut persistant — seule une invitation PENDING est acceptable (usage unique, §6). */
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  /** Téléphone invité, normalisé E.164 (RM-01-01). */
  phone: string;
  /** Échéance PM-22 en millisecondes epoch. */
  expiresAtMs: number;
}

export interface AcceptanceContext {
  nowMs: number;
  /** Téléphone (normalisé) du compte qui tente d'accepter. */
  phone: string;
  /** Le compte a-t-il déjà un rattachement actif quelque part ? (RM-02-05) */
  hasActiveMembership: boolean;
}

export type InvitationRefusal = "NOT_PENDING" | "EXPIRED" | "PHONE_MISMATCH" | "ALREADY_MEMBER";

/**
 * Motif de refus d'une acceptation, ou null si acceptable (CU-02-02).
 * L'ordre des contrôles est stable : statut → expiration (PM-22) → destinataire → RM-02-05.
 * Le rôle global (RM-02-06) se vérifie à part, car il dépend du type de compte (voir service).
 */
export function invitationRefusalReason(invitation: InvitationSnapshot, ctx: AcceptanceContext): InvitationRefusal | null {
  if (invitation.status !== "PENDING") return "NOT_PENDING";
  if (invitation.expiresAtMs <= ctx.nowMs) return "EXPIRED"; // expiration PM-22, gérée à la lecture
  if (invitation.phone !== ctx.phone) return "PHONE_MISMATCH"; // l'invitation vise un numéro précis
  if (ctx.hasActiveMembership) return "ALREADY_MEMBER"; // un compte = une structure (RM-02-05)
  return null;
}

/** Forme booléenne — même règle que invitationRefusalReason. */
export function isInvitationAcceptable(invitation: InvitationSnapshot, ctx: AcceptanceContext): boolean {
  return invitationRefusalReason(invitation, ctx) === null;
}

// ── Matrice statique des rôles globaux (EF-02-01/02, spec §5) ────────────────

export type GlobalRole = "PATIENT" | "PROFESSIONAL" | "FACILITY_MEMBER" | "ADMIN";
/** Sous-rôles admin (EF-02-08) — alignés sur l'enum Prisma AdminRole. */
export type AdminSubRole = "SUPER_ADMIN" | "ADMIN_FINANCE" | "ADMIN_VERIFICATION" | "ADMIN_MAP";

export interface PermissionRule {
  /** Identifiant stable de l'action (identifiants EN — GLOSSARY). */
  action: string;
  /** Module consommateur de la règle. */
  module: string;
  /** Rôles globaux autorisés (EF-02-01). */
  roles: readonly GlobalRole[];
  /** Pour FACILITY_MEMBER : droit interne exigé d'un simple membre — le titulaire l'a d'office. */
  facilityRight?: FacilityRight;
  /** Réservé au titulaire (EF-02-05) — jamais délégable. */
  ownerOnly?: boolean;
  /** Pour ADMIN : sous-rôle exigé ; le SUPER_ADMIN passe partout (AdminGuard). */
  adminRole?: AdminSubRole;
  /** Exige le badge Vérifié C6 (M03) — RM-02-04. */
  requiresVerification?: boolean;
}

/**
 * Matrice des permissions MVP — transcription fidèle de la spec M02 §5.
 * EF-02-02 / RM-02-03 : cette matrice se vérifie CÔTÉ SERVEUR à chaque requête,
 * jamais seulement masquée à l'interface. Tenue à jour à chaque module validé.
 */
export const GLOBAL_PERMISSIONS_MATRIX: readonly PermissionRule[] = [
  // Patient
  { action: "handshake.initiate", module: "M06", roles: ["PATIENT"] },
  // Professionnel (si vérifié — C6 ← M03)
  { action: "careOffer.publish", module: "M05", roles: ["PROFESSIONAL"], requiresVerification: true },
  // Membre (si droit interne) + Titulaire — espace vérifié requis pour publier (RM-02-04)
  { action: "stock.manage", module: "M11", roles: ["FACILITY_MEMBER"], facilityRight: "stock" },
  { action: "dispensation.process", module: "M09", roles: ["FACILITY_MEMBER"], facilityRight: "dispense" },
  { action: "stats.view", module: "M02", roles: ["FACILITY_MEMBER"], facilityRight: "stats" },
  // Réservé au titulaire (EF-02-05)
  { action: "members.manage", module: "M02", roles: ["FACILITY_MEMBER"], ownerOnly: true },
  { action: "digitalAgreement.manage", module: "M03", roles: ["FACILITY_MEMBER"], ownerOnly: true },
  { action: "withdrawal.request", module: "M13", roles: ["FACILITY_MEMBER"], ownerOnly: true },
  // Admin — chaque sous-rôle n'accède qu'à son domaine (EF-02-08)
  { action: "verification.review", module: "M03", roles: ["ADMIN"], adminRole: "ADMIN_VERIFICATION" },
  { action: "payments.supervise", module: "M13", roles: ["ADMIN"], adminRole: "ADMIN_FINANCE" },
];
