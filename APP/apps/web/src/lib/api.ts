/**
 * Client API ULAMU (app web pro/structure/admin) — même contrat REST que le backend NestJS déjà
 * consommé par l'app mobile patiente (apps/mobile/src/lib/api-client.ts) ; ce fichier est un client
 * minimal indépendant (pas de package partagé, cohérent avec l'app mobile qui a elle aussi son propre
 * client vendoré plutôt qu'un package @ulamu/shared).
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'NETWORK'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function codeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'RATE_LIMITED'
    default:
      return status >= 500 ? 'SERVER' : 'BAD_REQUEST'
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

let getToken: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

/** Branché une fois par le store de session (évite une dépendance circulaire lib -> state -> lib). */
export function configureApi(opts: { getToken: () => string | null; onUnauthorized: () => void }): void {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

async function request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken?.()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    throw new ApiError(0, 'NETWORK', 'Connexion impossible — vérifiez votre réseau et réessayez.', err)
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const parsed = text.length > 0 ? safeJson(text) : undefined

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.()
    const message =
      parsed && typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: unknown }).message)
        : `Erreur ${res.status}`
    throw new ApiError(res.status, codeFromStatus(res.status), message, parsed)
  }

  return parsed as T
}

// ── Contrats minimaux (Phase 0 : auth) ─────────────────────────────────────

export interface LoginRequest {
  /** Nom d'utilisateur OU adresse email (2026-07 — l'API accepte les deux, cf. m01.service). */
  username: string
  password: string
  client: 'web'
  deviceLabel?: string
  totpCode?: string
}
export interface LoginResponse {
  totpRequired: boolean
  sessionToken?: string
  accountId?: string
  accountType?: 'PATIENT' | 'PROFESSIONAL' | 'FACILITY_MEMBER' | 'ADMIN'
}
export interface MeResponse {
  accountId: string
  accountType: 'PATIENT' | 'PROFESSIONAL' | 'FACILITY_MEMBER' | 'ADMIN'
  username: string | null
  phone: string
  firstName: string | null
  lastName: string | null
  district: string | null
  category: string | null
  specialty: string | null
  biography: string | null
  adminRole: 'SUPER_ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_VERIFICATION' | 'ADMIN_MAP' | null
  totpEnabled: boolean
}

// ── Inscription (Étape 2) ───────────────────────────────────────────────────

/**
 * Vérification à l'inscription : par EMAIL (2026-07 — remplace le SMS, cf. common/email/email.service).
 * Le TOTP ne peut pas servir ici : à l'inscription, aucun secret n'est encore associé au compte. Il prend
 * le relais ensuite, et lui seul, pour la connexion (2e facteur) et la réinitialisation de mot de passe —
 * règle « jamais de SMS ni de code par email pour récupérer un compte web ».
 */
export interface RequestOtpRequest {
  email: string
  purpose: 'REGISTRATION' | 'PASSWORD_RESET'
}
export interface RequestOtpResponse {
  expiresInSeconds: number
  /** Présent uniquement en mode démo (OTP_ECHO=true côté API). */
  debugCode?: string
}
export type ProfessionalCategory = 'GENERAL_PRACTITIONER' | 'SPECIALIST' | 'DENTIST' | 'MIDWIFE' | 'NURSE' | 'COMMUNITY_HEALTH_WORKER'
export interface RegisterProfessionalRequest {
  phone: string
  email: string
  username: string
  otpCode: string
  password: string
  firstName: string
  lastName: string
  category: ProfessionalCategory
  specialty?: string
  /**
   * Acceptation explicite des CGU et de la politique de confidentialité (EF-01-08, loi n° 29-2019).
   * L'API refuse l'inscription si ce champ n'est pas `true` : le serveur écrit un enregistrement de
   * consentement qualifié de « preuve légale, immuable », il ne peut pas le fabriquer tout seul.
   */
  acceptTerms: boolean
  client: 'web'
  deviceLabel?: string
}
export interface RegisterFacilityMemberRequest {
  phone: string
  email: string
  username: string
  otpCode: string
  password: string
  firstName: string
  lastName: string
  /**
   * Acceptation explicite des CGU et de la politique de confidentialité (EF-01-08, loi n° 29-2019).
   * L'API refuse l'inscription si ce champ n'est pas `true` : le serveur écrit un enregistrement de
   * consentement qualifié de « preuve légale, immuable », il ne peut pas le fabriquer tout seul.
   */
  acceptTerms: boolean
  client: 'web'
  deviceLabel?: string
}
export interface RegisterResponse {
  accountId: string
  sessionToken: string
}

// ── Sécurité TOTP (Étape 3 — obligatoire sur le web, jamais de SMS pour la récupération) ──

export interface SetupTotpResponse {
  secret: string
  provisioningUri: string
}
export interface ConfirmTotpResponse {
  backupCodes: string[]
}
export interface ResetPasswordTotpRequest {
  username: string
  code: string
  newPassword: string
}

// ── M01 — Sécurité du compte (CU-01-05/06/07) ──────────────────────────────

/** Une session de connexion ouverte. `current` = celle de cet onglet — on ne se révoque pas soi-même. */
export interface SessionInfo {
  id: string
  client: string
  deviceLabel: string | null
  lastActiveAt: string
  current: boolean
}

// ── M05 — Vitrine, offres et présence du professionnel (CU-05-01/03/04) ────

export type OfferKind = 'STANDARD' | 'FOLLOW_UP'
export type PresenceState = 'ONLINE' | 'DO_NOT_DISTURB' | 'OFFLINE'

export interface Offer {
  id: string
  professionalId: string
  label: string
  durationMin: number
  /** Prix FINAL payé par le patient, commission incluse (D-010 / RM-05-03). */
  priceXaf: number
  kind: OfferKind
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Presence {
  state: PresenceState
  since: string
  lastHeartbeatAt: string
  /** Calculé par le serveur à l'instant de la réponse : un « en ligne » rassis vaut hors ligne (PM-26). */
  availableForInitiation: boolean
}

// ── M03 — Vérification & contrat (CU-03-01/02/03) ──────────────────────────

/** Machine d'états du dossier, côté serveur (m03.policies). */
export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO' | 'REVOKED'
export type DocumentKind = 'ID' | 'DIPLOMA' | 'LICENSE' | 'PHOTO' | 'ADDRESS_PROOF'

/** Jeu minimal de pièces exigé avant dépôt (m03.policies REQUIRED_DOCS). Dupliqué ici pour
 *  guider l'utilisateur AVANT l'appel — le serveur reste seul juge au moment du dépôt. */
export const REQUIRED_DOCS: Record<'PROFESSIONAL' | 'FACILITY', DocumentKind[]> = {
  PROFESSIONAL: ['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'],
  FACILITY: ['LICENSE', 'ID', 'ADDRESS_PROOF'],
}

export interface VerificationCase {
  caseId: string
  subjectKind: 'PROFESSIONAL' | 'FACILITY'
  status: VerificationStatus
  canPractice: boolean
  documents: Array<{ id: string; kind: DocumentKind; fileKey: string; expiresAt: string | null; createdAt: string }>
  decisions: Array<{ id: string; decision: string; reasons: string; decidedAt: string }>
  agreement: {
    version: number
    commissionPct: number
    bodyHash: string
    body: string | null
    /** `false` = le texte régénéré ne correspond plus au sceau : on ne le présente jamais comme conforme. */
    integrity: boolean
    signedAt: string | null
    effectiveAt: string | null
  } | null
}

export interface UploadDocumentRequest {
  kind: DocumentKind
  fileBase64: string
  mime: string
  expiresAt?: string
}

export const api = {
  login: (dto: LoginRequest) => request<LoginResponse>('POST', '/v1/auth/login', dto),
  logout: () => request<void>('POST', '/v1/accounts/me/logout', undefined, true),
  me: () => request<MeResponse>('GET', '/v1/accounts/me', undefined, true),
  requestOtp: (dto: RequestOtpRequest) => request<RequestOtpResponse>('POST', '/v1/accounts/otp/request', dto),
  registerProfessional: (dto: RegisterProfessionalRequest) =>
    request<RegisterResponse>('POST', '/v1/accounts/register/professional', dto),
  registerFacilityMember: (dto: RegisterFacilityMemberRequest) =>
    request<RegisterResponse>('POST', '/v1/accounts/register/facility-member', dto),
  setupTotp: () => request<SetupTotpResponse>('POST', '/v1/accounts/me/totp/setup', undefined, true),
  confirmTotp: (code: string) => request<ConfirmTotpResponse>('POST', '/v1/accounts/me/totp/confirm', { code }, true),
  resetPasswordByTotp: (dto: ResetPasswordTotpRequest) => request<void>('POST', '/v1/auth/password-reset/totp', dto),

  // M01 — sécurité du compte
  sessions: () => request<SessionInfo[]>('GET', '/v1/accounts/me/sessions', undefined, true),
  revokeSession: (id: string) => request<void>('DELETE', `/v1/accounts/me/sessions/${id}`, undefined, true),
  startPhoneChange: (dto: { newPhone: string }) =>
    request<{ expiresInSeconds: number }>('POST', '/v1/accounts/me/phone-change/start', dto, true),
  confirmPhoneChange: (dto: { newPhone: string; oldPhoneCode: string; newPhoneCode: string }) =>
    request<MeResponse>('POST', '/v1/accounts/me/phone-change/confirm', dto, true),
  requestCloseOtp: () => request<{ expiresInSeconds: number }>('POST', '/v1/accounts/me/close/request-otp', undefined, true),
  closeAccount: (dto: { password: string; otpCode: string }) =>
    request<void>('POST', '/v1/accounts/me/close', dto, true),

  // M05 — vitrine, offres, présence
  updateMyProfessionalProfile: (dto: { specialty?: string; biography?: string; district?: string }) =>
    request<MeResponse>('PATCH', '/v1/me/professional-profile', dto, true),
  myOffers: () => request<Offer[]>('GET', '/v1/offers', undefined, true),
  createOffer: (dto: { label: string; durationMin: number; priceXaf: number; kind?: OfferKind }) =>
    request<Offer>('POST', '/v1/offers', dto, true),
  updateOffer: (id: string, dto: { label?: string; durationMin?: number; priceXaf?: number; kind?: OfferKind; active?: boolean }) =>
    request<Offer>('PATCH', `/v1/offers/${id}`, dto, true),
  /** ⚠️ Le serveur DÉSACTIVE (deactivateOffer), il ne supprime pas : l'historique des sessions déjà
   *  vendues sur cette offre doit rester lisible. L'interface doit donc dire « désactiver ». */
  deactivateOffer: (id: string) => request<void>('DELETE', `/v1/offers/${id}`, undefined, true),
  myPresence: () => request<Presence>('GET', '/v1/presence/me', undefined, true),
  setPresence: (state: PresenceState) => request<Presence>('POST', '/v1/presence/state', { state }, true),
  presenceHeartbeat: () => request<Presence>('POST', '/v1/presence/heartbeat', undefined, true),

  // M03 — dossier de vérification du déposant
  verificationMine: () => request<VerificationCase>('GET', '/v1/verification/me', undefined, true),
  verificationUpload: (dto: UploadDocumentRequest) =>
    request<{ documentId: string; kind: string }>('POST', '/v1/verification/me/documents/upload', dto, true),
  verificationSubmit: () => request<VerificationCase>('POST', '/v1/verification/me/submit', undefined, true),
  verificationSignStart: () => request<{ expiresInSeconds: number; debugCode?: string }>(
    'POST',
    '/v1/verification/me/agreement/sign/start',
    undefined,
    true,
  ),
  verificationSign: (dto: { password: string; otpCode: string }) =>
    request<VerificationCase>('POST', '/v1/verification/me/agreement/sign', dto, true),
}

export { request }
