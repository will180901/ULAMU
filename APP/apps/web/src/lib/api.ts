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
  totpEnabledAt: string | null
  /** Adresse du compte — `null` tant qu'aucune n'a été ajoutée. C'est le canal de récupération. */
  email: string | null
  emailTwoFactorEnabled: boolean
  /** Clé de la photo de profil (patients, soignants, membres de structure). `null` = initiales. */
  avatarKey: string | null
  /** Codes de secours encore utilisables. À 0, un incident enferme le compte dehors. */
  backupCodesRemaining: number
  backupCodesTotal: number
  backupCodesGeneratedAt: string | null
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
/**
 * Tableaux de bord — module M16, EF-16-01. Ces routes existaient côté serveur sans être appelées
 * par le web. Elles renvoient PEU de chiffres, et c'est une contrainte réelle du produit : ni
 * tendance, ni série temporelle, ni répartition par type ne sont calculées nulle part. Ce que la
 * maquette B2 en demande n'existe donc pas encore — voir §9 du plan.
 */
export interface ProfessionalDashboard {
  sessionsThisMonth: number
  earnings: { availableXaf: number; pendingXaf: number }
  averageRating: number | null
  confirmationRatePct: number
}
export interface FacilityDashboard {
  facilityId: string
  reservationsServed: number
  earnings: { availableXaf: number; pendingXaf: number }
}

export interface ResetPasswordTotpRequest {
  username: string
  code: string
  newPassword: string
}
/**
 * Réinitialisation par code reçu par EMAIL — seconde voie de récupération.
 *
 * Elle existait côté serveur (`POST /v1/auth/password-reset`, publique) sans être exposée ici, parce
 * que le web imposait le TOTP à tous. Depuis que le second facteur est volontaire (20/08/2026), un
 * compte sans authentificateur qui oublie son mot de passe n'aurait plus AUCUN recours.
 */
export interface ResetPasswordRequest {
  email: string
  otpCode: string
  newPassword: string
}

// ── M01 — Sécurité du compte (CU-01-05/06/07) ──────────────────────────────

/** Une session de connexion ouverte. `current` = celle de cet onglet — on ne se révoque pas soi-même. */
export type NotificationCategory = 'care' | 'money' | 'reminder' | 'system' | 'critical'

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

// ── M12 — Dévoilements reçus par l'officine (CU-12-03) ─────────────────────

export type DisclosureStatus = 'PENDING' | 'ACTIVE' | 'SERVED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'

export interface DisclosureItem {
  dci?: string
  label?: string
  quantity?: number
}

export interface Disclosure {
  id: string
  status: DisclosureStatus
  district: string
  requestedItems: DisclosureItem[]
  createdAt: string
  paidAt: string | null
  expiresAt: string | null
  servedAt: string | null
  /** Compte à rebours calculé par le SERVEUR — 0 hors dévoilement actif. */
  remainingSeconds: number
  /** Référence opaque du paiement (contrat C1) — jamais une identité. */
  orderRef: string
  amountXaf: number
}

// ── M02 — Sous-rôles d'administration (EF-02-08) ───────────────────────────

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_VERIFICATION' | 'ADMIN_MAP'

/**
 * Un membre de l'équipe ULAMU et son sous-rôle.
 *
 * ⚠️ Nommé `PlatformAdmin` et NON `AdminAccount` : ce dernier existe déjà plus bas et désigne tout
 * autre chose — un compte utilisateur *vu depuis* la console d'administration (`ComptesPage`).
 * Réutiliser le nom aurait silencieusement changé le sens d'un type déjà employé ailleurs.
 */
export interface PlatformAdmin {
  accountId: string
  username: string | null
  firstName: string | null
  lastName: string | null
  phone: string
  /** `null` = compte d'administration SANS sous-rôle : il n'accède à rien tant qu'on ne lui en donne pas. */
  role: AdminRole | null
  assignedBy: string | null
  assignedAt: string | null
}

// ── M16 — Paramètres métier (EF-16-04, CU-16-02) ───────────────────────────

export interface PlatformParameter {
  /** « PM-17 », « PM-35 »… */
  key: string
  /** Sérialisée en texte : un entier, une liste, une durée ISO — selon le paramètre. */
  value: string
  description: string
  effectiveAt: string
  updatedAt: string
}

/**
 * Une modification de paramètre, telle que le serveur la renvoie (`ParameterChange`, insertion seule).
 *
 * ⚠️ Le client déclarait auparavant `{ items: Array<{ value, effectiveAt, changedBy }> }` — une forme
 * inventée qui ne correspondait à rien : la route renvoie les lignes du modèle, sans enveloppe. Toute
 * lecture de l'historique aurait échoué silencieusement.
 */
export interface ParameterChange {
  id: string
  key: string
  oldValue: string
  newValue: string
  reason: string
  effectiveAt: string
  /** Horodatage de la décision. Le champ s'appelle `createdAt` côté serveur, pas `changedAt`. */
  createdAt: string
  changedBy: string
}

// ── M13 — Finance (EF-13-09/10) ────────────────────────────────────────────

export type RefundStatus = 'PENDING_SECOND_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED'

export interface RefundRequest {
  requestId: string
  paymentId: string
  reason: string
  status: RefundStatus
  /** Admin 1. RM-13-06 : l'approbateur doit être quelqu'un d'AUTRE. */
  requestedBy: string
  approvedBy: string | null
  createdAt: string
  decidedAt: string | null
  amountXaf: number | null
  payerId: string | null
}

export interface ReconciliationReport {
  checkedAtIso: string
  aggregatorLines: number
  dbLines: number
  missingInDb: Array<{ aggregatorRef: string; kind: string; amountXaf: number }>
  missingAtAggregator: Array<{ aggregatorRef: string; kind: string; amountXaf: number }>
  amountMismatch: Array<{ aggregatorRef: string; kind: string; dbAmountXaf: number; aggregatorAmountXaf: number }>
  hasGaps: boolean
}

// ── M06 — Poignée de main (CU-06-01) ───────────────────────────────────────

export type HandshakeStatus = 'INITIATED' | 'CONFIRMED' | 'PAID' | 'REFUSED' | 'EXPIRED' | 'ABANDONED'

export interface Handshake {
  id: string
  status: HandshakeStatus
  patientAccountId: string
  professionalId: string
  offerId: string
  subProfileId: string | null
  initiatedAt: string
  confirmedAt: string | null
  confirmExpiresAt: string | null
  refusalReason: string | null
  windowExpiresAt: string | null
  /**
   * Calculé par le SERVEUR (RM-06-02). L'horloge du navigateur n'est qu'indicative : c'est cette
   * valeur qui fait foi, et elle est resynchronisée à chaque interrogation.
   */
  windowRemainingSeconds: number
  /** Posé quand la poignée est PAID — porte d'entrée de la session de soin. */
  sessionId: string | null
}

// ── M06 — Session de soin (CU-06-02 à CU-06-05) ────────────────────────────

export type CareSessionStatus = 'PREPARING' | 'ACTIVE' | 'ENDED' | 'REFUNDED' | 'CANCELLED'

export interface CareSession {
  id: string
  handshakeId: string
  status: CareSessionStatus
  patientAccountId: string
  professionalId: string
  subProfileId: string | null
  durationMin: number
  paidAt: string
  startedAt: string | null
  endsAt: string | null
  endedAt: string | null
  /** Seule vérité du décompteur (RM-06-02) — l'horloge locale n'anime qu'entre deux réponses. */
  remainingSeconds: number
  /** PREPARING : démarrage automatique à cette échéance (PM-28), même sans pré-consultation. */
  autoStartAt: string | null
  extensionTotalSec: number
  /** Retard cumulé du soignant au-delà de la tolérance de 30 s entre messages (D-032). */
  professionalDelaySec: number
  /** D-021 : le compte-rendu est OBLIGATOIRE. Tant que c'est `null`, la consultation reste inachevée. */
  reportDepositedAt: string | null
  preConsultation: { symptoms: string; sinceWhen: string | null; attachments: string[]; submittedAt: string } | null
  rated: boolean
  otherPartyTyping: boolean
}

export interface SessionMessage {
  id: string
  sessionId: string
  senderId: string
  kind: string
  body: string | null
  fileKey: string | null
  mediaKeys: string[]
  clientMsgId: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  status: 'sent' | 'delivered' | 'read' | null
  reactions: Array<{ emoji: string; count: number; mine: boolean }>
}

// ── M09 — Ordonnance (CU-09-01) ────────────────────────────────────────────

export interface Medicament {
  id: string
  dci: string
  commercialNames: string[]
  form: string | null
  dosage: string | null
}

export interface PrescriptionLineInput {
  /** Exclusif avec `freeText`. Seule une ligne RÉFÉRENTIELLE déclenche le garde-fou allergies. */
  medicamentId?: string
  /** Ligne hors référentiel — acceptée, mais **sans garde-fou automatique** (EF-09-02). */
  freeText?: string
  posology: string
}

/** Un médicament prescrit qui heurte une allergie active du Carnet (EF-09-03). */
export interface AllergyConflict {
  medicamentId: string
  medicamentLabel: string
  allergies: string[]
}

/** Charge utile du 409 renvoyé par le garde-fou allergies. */
export interface AllergyGuardError {
  code: 'ALLERGY_GUARD'
  message: string
  conflicts: AllergyConflict[]
}

export function estAlerteAllergie(details: unknown): details is AllergyGuardError {
  return (
    typeof details === 'object' &&
    details !== null &&
    (details as { code?: unknown }).code === 'ALLERGY_GUARD' &&
    Array.isArray((details as { conflicts?: unknown }).conflicts)
  )
}

// ── M13 — Gains et retraits (CU-13-04) ─────────────────────────────────────

export type EarningsHolderType = 'PROFESSIONAL' | 'FACILITY'
export type MomoOperator = 'MTN_MOMO' | 'AIRTEL_MONEY'

export interface Earnings {
  holderType: EarningsHolderType
  holderId: string
  /** Retirable maintenant. */
  availableXaf: number
  /** Confirmé mais pas encore capturé (EF-13-06) — visible, mais pas encore disponible. */
  pendingXaf: number
  entries: Array<{ id: string; type: string; amountXaf: number; reference: string; createdAt: string }>
}

/** Récapitulatif d'un retrait : les frais sont annoncés AVANT confirmation (EF-13-07). */
export interface WithdrawalQuote {
  withdrawalId: string
  amountXaf: number
  ulamuFeeXaf: number
  netToReceiveXaf: number
  operator: string
  otpExpiresInSeconds: number
}

// ── M02 / M11 — Espace structure (CU-02-01/02/03, CU-11-01) ────────────────

export type FacilityRight = 'stock' | 'dispense' | 'stats'

export interface FacilityMember {
  id: string
  accountId: string
  firstName: string | null
  lastName: string | null
  role: string
  rights: FacilityRight[]
  active: boolean
}

export interface Facility {
  id: string
  type: string
  name: string
  district: string
  quarter: string
  hours: string | null
  status: string
  members: FacilityMember[]
}

export interface StockItem {
  id: string
  medicamentId: string
  dci: string
  form: string | null
  dosage: string | null
  lotCode: string
  quantity: number
  expiryDate: string
  priceXaf: number
  /** Tranché par le SERVEUR, pour que toutes les interfaces disent la même chose. */
  expired: boolean
}

/** Résultat d'un scan de QR d'ordonnance (CU-09-02). Lecture seule : ne délivre rien. */
export interface ScannedPrescription {
  prescriptionId: string
  status: string
  /** Tranché par le SERVEUR d'après SON horloge (RM-09-02) — jamais recalculé côté client. */
  dispensable: boolean
  expiresAt: string
  lines: Array<{
    id: string
    medicamentId: string | null
    freeText: string | null
    posology: string
    durationDays: number | null
    qtyPrescribed: number | null
    qtyDispensed: number
    /** Ce qu'il RESTE à servir — une ordonnance peut être délivrée en plusieurs fois. */
    remaining: number | null
  }>
}

// ── Administration — M03 (vérification), M16 (pilotage) ────────────────────

export interface VerificationQueue {
  /** Objectif de traitement en heures (PM-11) — au-delà, le dossier est « en retard ». */
  targetHours: number
  overdueAfterHours: number
  items: Array<{
    caseId: string
    subjectKind: string
    subject: string
    subjectName: string
    status: string
    waitingSince: string
    documentCount: number
    /** Dépasse l'objectif PM-11. */
    overdueTarget: boolean
    /** Dépasse le seuil critique. */
    overdue: boolean
  }>
}

/** Un des 7 indicateurs du pilote (plan_releases §3, CU-16-03). */
export interface PilotKpi {
  key: string
  label: string
  value: number
  target: number
  unit: 'count' | '%'
  /** Vert/rouge tranché par le SERVEUR — les seuils sont du métier, pas de la présentation. */
  status: string
}

/** Vérification de la chaîne sha256 du journal d'audit (EF-04-03). */
export interface AuditIntegrity {
  ok: boolean
  checked: number
  brokenAtSeq?: number | null
}

/** Signalement d'utilisateur en attente de modération (M04, CU-04-04). */
export interface UserReport {
  id: string
  targetType: string
  targetId: string
  reasonCode: string
  reasonText: string | null
  status: string
  createdAt: string
  /** Au-delà du délai cible PM-23 — c'est ce qui décide de l'ordre de traitement. */
  isOverdue: boolean
}

export type ReportDecision = 'DISMISSED' | 'WARNING' | 'ESCALATED_M16' | 'ESCALATED_M03'

/** Compte trouvé par la recherche du back-office (M16). */
export interface AdminAccount {
  id: string
  username: string | null
  phone: string
  type: string
  status: string
}

// ── M03 — Vérification & contrat (CU-03-01/02/03) ──────────────────────────

/** Machine d'états du dossier, côté serveur (m03.policies). */
export type VerificationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO' | 'REVOKED'
export type DocumentKind = 'ID' | 'DIPLOMA' | 'LICENSE' | 'PHOTO' | 'ADDRESS_PROOF'

export interface VerificationCase {
  caseId: string
  subjectKind: 'PROFESSIONAL' | 'FACILITY'
  status: VerificationStatus
  canPractice: boolean
  /**
   * Pièces exigées et pièces manquantes — calculées PAR LE SERVEUR (2026-08).
   *
   * La liste était auparavant recopiée ici, en dur. Deux vérités pour une même règle finissent
   * toujours par diverger, et c'est l'écran qui aurait menti : le serveur reste le seul juge au
   * moment du dépôt.
   */
  requiredDocuments: DocumentKind[]
  missingDocuments: DocumentKind[]
  canSubmit: boolean
  /** Les pièces sont-elles encore modifiables ? Faux dès que le dossier est en examen. */
  documentsEditable: boolean
  /** Délai de traitement annoncé, en heures (PM-11). */
  announcedDelayHours: number
  documents: Array<{ id: string; kind: DocumentKind; expiresAt: string | null; createdAt: string }>
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

/**
 * Ouvre une pièce justificative dans un nouvel onglet.
 *
 * Impossible de mettre l'URL dans un `<a href>` : la route exige un jeton `Authorization`, et un
 * lien ne sait pas en porter. On récupère donc le fichier avec le jeton, puis on l'ouvre depuis un
 * `blob:` local. C'est aussi ce qui empêche l'URL d'une pièce d'identité de finir dans l'historique
 * du navigateur ou dans un journal de serveur mandataire.
 *
 * L'URL rendue est révoquée par l'appelant quand il n'en a plus besoin — sinon le fichier déchiffré
 * reste en mémoire de l'onglet jusqu'à sa fermeture.
 */
export async function ouvrirPieceJustificative(documentId: string): Promise<string> {
  const token = getToken?.()
  const res = await fetch(`${API_BASE_URL}/v1/verification/me/documents/${documentId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.()
    throw new ApiError(res.status, codeFromStatus(res.status), "Cette pièce n'a pas pu être ouverte.")
  }
  return URL.createObjectURL(await res.blob())
}

/**
 * URL publique d'une photo de profil. La route `media/avatars` est `@Public` côté API : la clé est un
 * uuid non devinable, et une photo de vitrine n'est pas une donnée de santé.
 *
 * ⚠️ Le stockage est le disque local de l'instance API, et `render.yaml` ne déclare AUCUN disque
 * persistant : sur le plan gratuit, les photos disparaissent au redéploiement. C'est acceptable en
 * pilote, pas à la livraison — voir §7 du plan.
 */
export function urlAvatar(key: string): string {
  return `${API_BASE_URL}/v1/media/avatars/${key}`
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
  resetPasswordByEmail: (dto: ResetPasswordRequest) => request<void>('POST', '/v1/auth/password-reset', dto),

  // M01 — sécurité du compte
  sessions: () => request<SessionInfo[]>('GET', '/v1/accounts/me/sessions', undefined, true),
  revokeSession: (id: string) => request<void>('DELETE', `/v1/accounts/me/sessions/${id}`, undefined, true),
  startPhoneChange: (dto: { newPhone: string }) =>
    request<{ expiresInSeconds: number }>('POST', '/v1/accounts/me/phone-change/start', dto, true),
  confirmPhoneChange: (dto: { newPhone: string; oldPhoneCode: string; newPhoneCode: string }) =>
    request<MeResponse>('POST', '/v1/accounts/me/phone-change/confirm', dto, true),
  /**
   * Mot de passe changé depuis une session ouverte — à ne pas confondre avec `resetPasswordBy*`, qui
   * sert quand l'accès est perdu. Le serveur ferme les AUTRES appareils et renvoie combien.
   */
  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    request<{ otherSessionsClosed: number }>('POST', '/v1/accounts/me/password', dto, true),
  /**
   * Première adresse email du compte, ou remplacement.
   * `requiresOldEmailCode` dit si le compte en avait déjà une : dans ce cas il faut DEUX codes, sans
   * quoi une session volée suffirait à détourner le canal de récupération.
   */
  startEmailChange: (dto: { newEmail: string }) =>
    request<{ requiresOldEmailCode: boolean; oldEmailHint: string | null }>('POST', '/v1/accounts/me/email/start', dto, true),
  confirmEmailChange: (dto: { newEmail: string; newEmailCode: string; oldEmailCode?: string }) =>
    request<{ email: string }>('POST', '/v1/accounts/me/email/confirm', dto, true),
  /** Nouveau lot de codes de secours — l'ancien est détruit, ceux-ci ne s'affichent qu'une fois. */
  regenerateBackupCodes: (dto: { password: string; code: string }) =>
    request<ConfirmTotpResponse>('POST', '/v1/accounts/me/totp/backup-codes', dto, true),
  /** Ré-association de l'appareil : renvoie un secret à scanner, puis on enchaîne sur `confirmTotp`. */
  resetTotp: (dto: { password: string; code: string }) =>
    request<SetupTotpResponse>('POST', '/v1/accounts/me/totp/reset', dto, true),
  setAvatar: (dto: { imageBase64: string; mime: string }) =>
    request<MeResponse>('POST', '/v1/accounts/me/avatar', dto, true),
  removeAvatar: () => request<MeResponse>('DELETE', '/v1/accounts/me/avatar', undefined, true),
  /** Les trois conditions de clôture, telles que le serveur les appliquera — l'écran n'en invente aucune. */
  closePrerequisites: () =>
    request<Array<{ key: string; label: string; ok: boolean }>>('GET', '/v1/accounts/me/close/prerequisites', undefined, true),
  /** `channel` dit si le code part par email ou par SMS — l'écran ne doit pas le deviner. */
  requestCloseOtp: () =>
    request<{ channel: 'email' | 'sms'; hint: string }>('POST', '/v1/accounts/me/close/request-otp', undefined, true),
  closeAccount: (dto: { password: string; otpCode: string }) =>
    request<void>('POST', '/v1/accounts/me/close', dto, true),

  // M14 — préférences de notification (les seules du lot qui suivent le compte)
  /** `critical` remonte toujours `adjustable: false` — les alertes vitales ne se coupent pas (RM-14-02). */
  notificationPreferences: () =>
    request<{ preferences: Array<{ category: NotificationCategory; enabled: boolean; adjustable: boolean }> }>(
      'GET',
      '/v1/notifications/me/preferences',
      undefined,
      true,
    ),
  setNotificationPreference: (dto: { category: NotificationCategory; enabled: boolean }) =>
    request<{ category: string; enabled: boolean }>('PUT', '/v1/notifications/me/preferences', dto, true),

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

  // M12 — dévoilements reçus par l'officine
  facilityDisclosures: (facilityId: string) =>
    request<{ items: Disclosure[] }>('GET', `/v1/disclosures/facility/${facilityId}`, undefined, true),
  /** Clôture propre (RM-12-03). Le serveur refuse si le dévoilement a expiré entre-temps. */
  markDisclosureServed: (disclosureId: string) =>
    request<Disclosure>('POST', `/v1/disclosures/${disclosureId}/mark-served`, undefined, true),

  // M02 — sous-rôles d'administration (SUPER_ADMIN)
  admins: () => request<PlatformAdmin[]>('GET', '/v1/admins', undefined, true),
  createAdmin: (dto: { phone: string; username: string; password: string; firstName: string; lastName: string; role: AdminRole }) =>
    request<{ accountId: string }>('POST', '/v1/admins', dto, true),
  assignAdminRole: (accountId: string, role: AdminRole, reason?: string) =>
    request<{ accountId: string; role: string }>('POST', `/v1/admins/${accountId}/role`, { role, reason }, true),
  /** Le serveur refuse l'auto-révocation (continuité d'administration) et coupe les sessions du révoqué. */
  revokeAdminRole: (accountId: string) => request<void>('DELETE', `/v1/admins/${accountId}/role`, undefined, true),

  // M16 — paramètres métier (SUPER_ADMIN)
  parameters: () => request<PlatformParameter[]>('GET', '/v1/admin/parameters', undefined, true),
  parameterHistory: (key: string) =>
    request<ParameterChange[]>('GET', `/v1/admin/parameters/${key}/history`, undefined, true),
  /** Le motif est OBLIGATOIRE (RM-16-03) : un seuil qui change sans explication est ingérable. */
  updateParameter: (key: string, dto: { value: string; effectiveAt: string; reason: string }) =>
    request<unknown>('PUT', `/v1/admin/parameters/${key}`, dto, true),

  // M13 — administration Finance
  adminRefunds: (status?: RefundStatus) =>
    request<RefundRequest[]>('GET', `/v1/admin/finance/refunds${status ? `?status=${status}` : ''}`, undefined, true),
  approveRefund: (id: string) => request<unknown>('POST', `/v1/admin/finance/refunds/${id}/approve`, undefined, true),
  rejectRefund: (id: string) => request<unknown>('POST', `/v1/admin/finance/refunds/${id}/reject`, undefined, true),
  runReconciliation: () => request<ReconciliationReport>('POST', '/v1/admin/finance/reconcile', undefined, true),

  // M06 — poignées de main reçues
  myHandshakes: () => request<Handshake[]>('GET', '/v1/handshakes/mine', undefined, true),
  confirmHandshake: (id: string) => request<Handshake>('POST', `/v1/handshakes/${id}/confirm`, undefined, true),
  /** Le motif est OBLIGATOIRE côté serveur : un refus sans explication laisse le patient sans recours. */
  refuseHandshake: (id: string, reason: string) =>
    request<Handshake>('POST', `/v1/handshakes/${id}/refuse`, { reason }, true),

  // M06 — session de soin
  mySessions: () => request<CareSession[]>('GET', '/v1/care-sessions/mine', undefined, true),
  session: (id: string) => request<CareSession>('GET', `/v1/care-sessions/${id}`, undefined, true),
  sessionMessages: (id: string) =>
    request<{ items: SessionMessage[]; nextCursor: string | null }>('GET', `/v1/care-sessions/${id}/messages`, undefined, true),
  /** `clientMsgId` est une clé d'idempotence (ADR-12) : un rejeu réseau ne crée pas un doublon. */
  sendMessage: (id: string, dto: { clientMsgId: string; kind: 'TEXT'; body: string }) =>
    request<SessionMessage>('POST', `/v1/care-sessions/${id}/messages`, dto, true),
  typing: (id: string) => request<void>('POST', `/v1/care-sessions/${id}/typing`, undefined, true),
  extendSession: (id: string, minutes: number) =>
    request<CareSession>('POST', `/v1/care-sessions/${id}/extend`, { minutes }, true),
  /** D-021 : compte-rendu obligatoire. Sans lui, la consultation n'est pas close pour le patient. */
  depositReport: (id: string, dto: { diagnosis: string; recommendations: string }) =>
    request<CareSession>('POST', `/v1/care-sessions/${id}/report`, dto, true),

  // M09 — ordonnance (depuis une session ACTIVE uniquement, RM-09-01)
  /** Référentiel médicaments — 2 caractères minimum côté serveur, en dessous il renvoie une liste vide. */
  searchMedicaments: (q: string, limit = 12) =>
    request<{ items: Medicament[] }>('GET', `/v1/medicaments?q=${encodeURIComponent(q)}&limit=${limit}`, undefined, true),
  createPrescription: (
    sessionId: string,
    dto: { lines: PrescriptionLineInput[]; overrides?: Array<{ medicamentId: string; reason: string }> },
  ) => request<{ id: string }>('POST', `/v1/prescriptions/sessions/${sessionId}`, dto, true),

  // M13 — gains et retraits
  earnings: (holderType: EarningsHolderType, holderId: string) =>
    request<Earnings>('GET', `/v1/me?holderType=${holderType}&holderId=${holderId}`, undefined, true),
  startWithdrawal: (dto: { holderType: EarningsHolderType; holderId: string; amountXaf: number; operator: MomoOperator }) =>
    request<WithdrawalQuote>('POST', '/v1/withdrawals/start', dto, true),
  /** Action sensible : mot de passe **et** code OTP (EF-13-07). */
  confirmWithdrawal: (dto: { withdrawalId: string; password: string; otpCode: string }) =>
    request<{ status: string }>('POST', '/v1/withdrawals/confirm', dto, true),

  // M02 — ma structure
  /** `null` quand le compte n'est rattaché à aucune structure — ce n'est pas une erreur. */
  myFacility: () => request<Facility | null>('GET', '/v1/facilities/me', undefined, true),
  createFacility: (dto: { type: 'PHARMACY'; name: string; district: string; quarter: string; hours?: string }) =>
    request<Facility>('POST', '/v1/facilities', dto, true),
  inviteMember: (facilityId: string, dto: { phone: string; proposedRights: FacilityRight[] }) =>
    request<{ id: string }>('POST', `/v1/facilities/${facilityId}/invitations`, dto, true),
  updateMemberRights: (facilityId: string, memberId: string, rights: FacilityRight[]) =>
    request<FacilityMember>('PATCH', `/v1/facilities/${facilityId}/members/${memberId}`, { rights }, true),
  /**
   * Transfert de titularité (EF-02-06 / CU-02-05) — en deux temps.
   *
   * `start` crée une intention PERSISTÉE et liée à UNE cible : un code demandé pour transférer à A ne
   * peut jamais confirmer un transfert vers B. Le serveur envoie ensuite un code au titulaire ET un
   * à la personne visée — « les deux confirment » n'est pas une formule, c'est la garantie qu'aucune
   * officine ne change de main à l'insu de l'un des deux.
   */
  startTransfer: (facilityId: string, toMemberId: string) =>
    request<{ intentId: string; expiresInSeconds: number }>('POST', `/v1/facilities/${facilityId}/transfer/start`, { toMemberId }, true),
  confirmTransfer: (facilityId: string, dto: { intentId: string; ownerOtpCode: string; targetOtpCode: string }) =>
    request<Facility>('POST', `/v1/facilities/${facilityId}/transfer/confirm`, dto, true),
  removeMember: (facilityId: string, memberId: string) =>
    request<void>('DELETE', `/v1/facilities/${facilityId}/members/${memberId}`, undefined, true),

  // M11 — stock
  stockItems: (facilityId: string) =>
    request<{ items: StockItem[] }>('GET', `/v1/stocks/${facilityId}/items`, undefined, true),
  stockAlerts: (facilityId: string) =>
    request<{ alerts: Array<{ kind: string; medicamentId: string; label?: string; detail?: string }> }>(
      'GET',
      `/v1/stocks/${facilityId}/alerts`,
      undefined,
      true,
    ),
  /** RM-11-05 : confirmer la fraîcheur remet le compteur à zéro et garde la pharmacie visible. */
  confirmFreshness: (facilityId: string) =>
    request<{ lastFreshAt: string }>('POST', `/v1/stocks/${facilityId}/freshness`, undefined, true),

  // M11 — écritures de stock
  stockEntry: (
    facilityId: string,
    dto: { medicamentId: string; lotCode: string; quantity: number; expiryDate: string; priceXaf: number; supplier?: string },
  ) => request<StockItem>('POST', `/v1/stocks/${facilityId}/entries`, dto, true),
  /** EF-11-03 : le motif est OBLIGATOIRE — une sortie sans raison est un trou dans l'inventaire. */
  stockExit: (facilityId: string, dto: { medicamentId: string; lotCode: string; quantity: number; reason: string }) =>
    request<StockItem>('POST', `/v1/stocks/${facilityId}/exits`, dto, true),

  // M09 — délivrance en pharmacie (scan du QR de l'ordonnance)
  /** Vérifie le QR et renvoie l'ordonnance + ce qu'il reste à servir. Ne délivre RIEN. */
  scanPrescription: (qrToken: string, facilityId: string) =>
    request<ScannedPrescription>('POST', `/v1/prescriptions/scan/${encodeURIComponent(qrToken)}?facilityId=${facilityId}`, undefined, true),
  dispense: (qrToken: string, dto: { facilityId: string; lines: Array<{ prescriptionLineId: string; quantity: number }> }) =>
    request<{ status: string }>('POST', `/v1/prescriptions/scan/${encodeURIComponent(qrToken)}/dispense`, dto, true),

  // Administration — file de vérification (sous-rôle Vérification)
  verificationQueue: (status?: string) =>
    request<VerificationQueue>('GET', `/v1/admin/verification/queue${status ? `?status=${status}` : ''}`, undefined, true),
  /** S'attribuer le dossier avant de décider : deux vérificateurs ne travaillent pas sur le même. */
  claimCase: (caseId: string) => request<void>('POST', `/v1/admin/verification/${caseId}/claim`, undefined, true),
  decideCase: (caseId: string, dto: { decision: 'VERIFIED' | 'REJECTED' | 'NEEDS_INFO'; reasons: string }) =>
    request<void>('POST', `/v1/admin/verification/${caseId}/decide`, dto, true),

  // Administration — pilotage et audit (sous-rôle Super)
  professionalDashboard: () => request<ProfessionalDashboard>('GET', '/v1/me/dashboard', undefined, true),
  facilityDashboard: (facilityId: string) =>
    request<FacilityDashboard>('GET', `/v1/me/facility/${facilityId}/dashboard`, undefined, true),
  pilotKpis: () => request<PilotKpi[]>('GET', '/v1/admin/pilot-kpis', undefined, true),
  /** EF-04-03 : revérifie la chaîne sha256 du journal. Une rupture signale une altération. */
  auditIntegrity: () => request<AuditIntegrity>('GET', '/v1/admin/audit/integrity', undefined, true),

  // Administration — signalements (M04) et comptes (M16)
  reports: (status?: string) =>
    request<{ items: UserReport[] }>('GET', `/v1/admin/reports${status ? `?status=${status}` : ''}`, undefined, true),
  /** CU-04-04 : toute décision est motivée, y compris un rejet. */
  decideReport: (id: string, dto: { decision: ReportDecision; reasons: string }) =>
    request<void>('POST', `/v1/admin/reports/${id}/decide`, dto, true),
  searchAccounts: (query: string) =>
    request<{ items: AdminAccount[] }>('GET', `/v1/admin/accounts?query=${encodeURIComponent(query)}`, undefined, true),
  suspendAccount: (id: string, reason: string) =>
    request<void>('POST', `/v1/admin/accounts/${id}/suspend`, { reason }, true),
  reactivateAccount: (id: string, reason: string) =>
    request<void>('POST', `/v1/admin/accounts/${id}/reactivate`, { reason }, true),

  // M03 — dossier de vérification du déposant
  verificationMine: () => request<VerificationCase>('GET', '/v1/verification/me', undefined, true),
  verificationUpload: (dto: UploadDocumentRequest) =>
    request<{ documentId: string; kind: string }>('POST', '/v1/verification/me/documents/upload', dto, true),
  /** ⚠️ Ne renvoie PAS le dossier complet — seulement l'accusé de dépôt (CU-03-01). */
  verificationSubmit: () =>
    request<{ caseId: string; status: VerificationStatus; announcedDelayHours: number }>(
      'POST',
      '/v1/verification/me/submit',
      undefined,
      true,
    ),
  /** Retrait d'une pièce, pour la remplacer. Refusé dès que le dossier est en examen. */
  verificationRemoveDocument: (id: string) =>
    request<{ removed: true }>('DELETE', `/v1/verification/me/documents/${id}`, undefined, true),
  verificationSignStart: () => request<{ expiresInSeconds: number; debugCode?: string }>(
    'POST',
    '/v1/verification/me/agreement/sign/start',
    undefined,
    true,
  ),
  /** ⚠️ Renvoie l'accusé de signature, pas le dossier : rechargez `verificationMine` après. */
  verificationSign: (dto: { password: string; otpCode: string }) =>
    request<{ caseId: string; version: number; signedAt: string; effectiveAt: string; canPractice: boolean }>(
      'POST',
      '/v1/verification/me/agreement/sign',
      dto,
      true,
    ),
}

export { request }
