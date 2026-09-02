/**
 * Contrat M01 — Comptes & Authentification (le socle).
 * Source : apps/api/src/modules/m01-accounts/{m01.controller,m01.dto,m01.service}.ts
 * Ces types sont la SEULE vérité partagée entre l'API et les apps : toute évolution de
 * l'endpoint se reflète ici (et le typecheck casse côté client si ça diverge).
 */

// ── Énumérations partagées (alignées sur le schéma Prisma) ───────────────────

/**
 * Les TROIS acteurs d'ULAMU : le patient (mobile), le professionnel et l'administration (web).
 *
 * ⚠️ L'énumération Prisma `AccountType` en compte un QUATRIÈME, `FACILITY_MEMBER`, et ce n'est pas
 * une désynchronisation : ce type est **fermé depuis le 02/09/2026** (chantier 25) — sa route
 * d'inscription est retirée, aucun compte ne peut plus naître. La valeur reste en base parce que
 * l'en retirer demanderait une migration sur la base de production, et parce que le journal d'audit
 * — en insertion seule — porte encore des lignes qui la nomment.
 *
 * Un compte hérité qui se connecterait quand même retombe sur le parcours professionnel : aucun
 * client ne plante sur une valeur inattendue, chacun a son repli.
 */
export type AccountType = "PATIENT" | "PROFESSIONAL" | "ADMIN";
export type Sex = "M" | "F";
/** Le client appelant — mobile = patients, web = professionnels et administration (D-012). */
export type ClientKind = "mobile" | "web";
/** Catégories de professionnels (M01/M05). */
export type ProfessionalCategory =
  | "GENERAL_PRACTITIONER"
  | "SPECIALIST"
  | "DENTIST"
  | "MIDWIFE"
  | "NURSE"
  | "COMMUNITY_HEALTH_WORKER";
/** Motifs d'OTP exposés publiquement (inscription, récupération). */
export type PublicOtpPurpose = "REGISTRATION" | "PASSWORD_RESET";

// ── Requêtes (miroir de m01.dto.ts) ──────────────────────────────────────────

export interface RequestOtpRequest {
  phone: string;
  purpose: PublicOtpPurpose;
}

export interface RegisterPatientRequest {
  phone: string;
  otpCode: string;
  password: string;
  firstName: string;
  lastName: string;
  /** ISO 8601 (AAAA-MM-JJ). */
  birthDate: string;
  sex: Sex;
  district: string;
  client: ClientKind;
  deviceLabel?: string;
}

export interface RegisterProfessionalRequest {
  phone: string;
  otpCode: string;
  password: string;
  firstName: string;
  lastName: string;
  category: ProfessionalCategory;
  specialty?: string;
  client: ClientKind;
  deviceLabel?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
  client: ClientKind;
  deviceLabel?: string;
  /** TOTP (pros/admin avec 2ᵉ facteur actif). */
  totpCode?: string;
}

export interface ResetPasswordRequest {
  phone: string;
  otpCode: string;
  newPassword: string;
}

// ── Réponses (miroir des retours de m01.service.ts) ──────────────────────────

export interface RequestOtpResponse {
  expiresInSeconds: number;
}

/** Inscription : un compte créé + une session ouverte (jeton opaque Bearer). */
export interface RegisterResponse {
  accountId: string;
  sessionToken: string;
}

/** Connexion : jeton de session + identité minimale (jamais de données sensibles). */
export interface LoginResponse {
  sessionToken: string;
  accountId: string;
  accountType: AccountType;
}

// ── Routes (chemins exacts du M01Controller, préfixe "v1") ───────────────────

export const AUTH_ROUTES = {
  requestOtp: "/v1/accounts/otp/request",
  registerPatient: "/v1/accounts/register/patient",
  registerProfessional: "/v1/accounts/register/professional",
  login: "/v1/auth/login",
  resetPassword: "/v1/auth/password-reset",
} as const;
