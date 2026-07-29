/**
 * Socle de types ULAMU VENDORÉ dans l'app mobile (app RN autonome, hors workspace pnpm).
 * SOURCE DE VÉRITÉ : packages/contracts/src/{http,auth}.ts — garder en phase (re-lier au workspace plus tard).
 */

// ── HTTP ─────────────────────────────────────────────────────────────────────
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN';

export const AUTH_HEADER = 'Authorization';
export const bearer = (token: string): string => `Bearer ${token}`;

// ── M01 — Authentification (username + mot de passe + TOTP) ──────────────────
export type AccountType = 'PATIENT' | 'PROFESSIONAL' | 'FACILITY_MEMBER' | 'ADMIN';
export type Sex = 'M' | 'F';
export type ClientKind = 'mobile' | 'web';
/** OTP SMS : uniquement vérif du téléphone (inscription) + récupération. PAS la connexion. */
export type PublicOtpPurpose = 'REGISTRATION' | 'PASSWORD_RESET';

/** 2026-07 : le code OTP inscription/réinitialisation part par EMAIL (plus par SMS). */
export interface RequestOtpRequest {
  email: string;
  purpose: PublicOtpPurpose;
}
export interface RequestOtpResponse {
  expiresInSeconds: number;
  /** Mode test (backend OTP_ECHO=true) : code renvoyé pour affichage in-app, faute de vrai SMS. Absent en prod. */
  debugCode?: string;
}

/** Réponse commune aux trois vérifications de disponibilité (nom d'utilisateur, email, téléphone).
 * Un identifiant mal formé répond `false` : le champ n'est pas encore utilisable tel quel. */
export interface CheckUsernameResponse {
  available: boolean;
}

/** Inscription patient : profil complet + nom d'utilisateur, email vérifié par OTP (2026-07). */
export interface RegisterPatientRequest {
  phone: string;
  email: string;
  username: string;
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
export interface RegisterResponse {
  accountId: string;
  sessionToken: string;
}

/** Connexion : nom d'utilisateur OU email + mot de passe (+ TOTP si activé) — 2026-07. */
export interface LoginRequest {
  username: string;
  password: string;
  client: ClientKind;
  deviceLabel?: string;
  totpCode?: string;
  /** 2FA par email (la 2FA du mobile) — code reçu après une 1re tentative renvoyant `otpRequired`. */
  otpCode?: string;
}
/**
 * Réponse de connexion. `otpRequired` : la 2FA par email est active, un code vient d'être envoyé à
 * l'adresse du compte — relancer la connexion avec `otpCode`. Aucun jeton n'est émis d'ici là.
 * (`totpRequired` est le pendant web ; le mobile n'utilise pas le TOTP.)
 */
export interface LoginResponse {
  totpRequired: boolean;
  otpRequired?: boolean;
  /** Mode test (OTP_ECHO côté API) : code renvoyé pour affichage, jamais en production réelle. */
  debugCode?: string;
  sessionToken?: string;
  accountId?: string;
  accountType?: AccountType;
}

// 2FA par email (mobile) — endpoints authentifiés
export interface EnableEmailTwoFactorRequest {
  otpCode: string;
}
export interface DisableEmailTwoFactorRequest {
  password: string;
}

/** 2026-07 : réinitialisation par EMAIL (plus par téléphone). */
export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

// TOTP (2FA) — endpoints authentifiés
export interface TotpSetupResponse {
  secret: string;
  provisioningUri: string;
}
export interface TotpConfirmRequest {
  code: string;
}
export interface TotpConfirmResponse {
  backupCodes: string[];
}

export const AUTH_ROUTES = {
  requestOtp: '/v1/accounts/otp/request',
  usernameAvailable: '/v1/accounts/username-available',
  emailAvailable: '/v1/accounts/email-available',
  phoneAvailable: '/v1/accounts/phone-available',
  registerPatient: '/v1/accounts/register/patient',
  login: '/v1/auth/login',
  resetPassword: '/v1/auth/password-reset',
  totpSetup: '/v1/accounts/me/totp/setup',
  totpConfirm: '/v1/accounts/me/totp/confirm',
} as const;

// ── M01 — Identité du compte connecté (GET /v1/accounts/me) ──────────────────
export interface MeResponse {
  accountId: string;
  accountType: AccountType;
  username: string | null;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  /** ISO AAAA-MM-JJ ou null. */
  birthDate: string | null;
  sex: Sex | null;
  district: string | null;
  /** Clé de la photo de profil (StorageService) — null = initiales. Voir avatarUrl(). */
  avatarKey: string | null;
  /** TOTP — réservé au web ; toujours false côté mobile (conservé pour rester aligné sur l'API). */
  totpEnabled: boolean;
  /** 2FA par email : LA double authentification du mobile. */
  emailTwoFactorEnabled: boolean;
  email: string | null;
}

export interface UpdateAvatarRequest {
  imageBase64: string;
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}
export interface RegisterDeviceRequest {
  token: string;
  platform: 'android' | 'ios';
}
export interface UploadSessionMediaRequest {
  fileBase64: string;
  mime: string;
}
export interface UploadMediaResponse {
  fileKey: string;
}

// ── M05 — Annuaire des professionnels ────────────────────────────────────────
export type ProfessionalCategory =
  | 'GENERAL_PRACTITIONER'
  | 'SPECIALIST'
  | 'DENTIST'
  | 'MIDWIFE'
  | 'NURSE'
  | 'COMMUNITY_HEALTH_WORKER';
export type PresenceState = 'ONLINE' | 'DO_NOT_DISTURB' | 'OFFLINE';
export type DirectorySort = 'relevance' | 'price' | 'rating' | 'reactivity';
export type OfferKind = 'STANDARD' | 'FOLLOW_UP';

/** Offre de soin — prix FINAL patient, commission incluse (RM-05-03, D-010). */
export interface DirectoryOffer {
  id: string;
  label: string;
  durationMin: number;
  priceXaf: number;
  kind: OfferKind;
}

/** Ligne de l'annuaire (EF-05-01) — vue publique, jamais de donnée de santé. */
export interface DirectoryItem {
  professionalId: string;
  displayName: string;
  category: ProfessionalCategory;
  specialty: string | null;
  district: string | null;
  badgeVerified: true;
  rating: {avg: number | null; count: number};
  reactivity: {confirmRatePct: number; avgConfirmDelayS: number | null};
  presence: PresenceState;
  availableNow: boolean;
  cheapestOffer: DirectoryOffer | null;
  relevanceScore: number;
}

/** Fiche publique complète (EF-05-01/07 ; CU-05-02). */
export interface DirectoryProfile extends DirectoryItem {
  biography: string | null;
  offers: DirectoryOffer[];
  ratingDistribution: Record<string, number>;
  latestComments: Array<{score: number; comment: string; createdAt: string}>;
}

export interface DirectorySearchResponse {
  items: DirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  suggestion: string | null;
}

/** Filtres de recherche (EF-05-03) — tous optionnels. */
export interface DirectoryQuery {
  category?: ProfessionalCategory;
  specialty?: string;
  maxPrice?: number;
  minRating?: number;
  availableNow?: boolean;
  district?: string;
  sort?: DirectorySort;
  page?: number;
  pageSize?: number;
}

/** Cloche « m'avertir quand il est disponible » (CU-05-05). */
export interface AvailabilityAlertResponse {
  professionalId: string;
  expiresAt: string;
}

// ── M16 — Mon espace patient (compteurs, jamais le Carnet) ───────────────────
export interface PatientSpaceResponse {
  sessionsCount: number;
  disclosuresCount: number;
  prescriptionsCount: number;
  /** Reçus de paiement — typage souple tant que l'écran « Mes paiements » n'est pas construit. */
  receipts: Array<Record<string, unknown>>;
}

// ── M14 — Notifications ──────────────────────────────────────────────────────
export interface UnreadCountResponse {
  unread: number;
}

// ── M06 — Sessions de soin (liste « mes consultations ») ─────────────────────
export type CareSessionStatus = 'PREPARING' | 'ACTIVE' | 'ENDED' | 'REFUNDED';
export interface CareSessionListItem {
  id: string;
  status: CareSessionStatus;
  patientAccountId: string;
  professionalId: string;
  subProfileId: string | null;
  durationMin: number;
  paidAt: string;
  endsAt: string | null;
  endedAt: string | null;
  remainingSeconds: number;
  reportDepositedAt: string | null;
}
export interface CareSessionListResponse {
  items: CareSessionListItem[];
}

// ── M06 — Session de soin (détail, EF-06-04→11) ──────────────────────────────
export interface PreConsultationView {
  symptoms: string;
  sinceWhen: string | null;
  attachments: string[];
  submittedAt: string;
}
export interface SessionView {
  id: string;
  handshakeId: string;
  status: CareSessionStatus;
  patientAccountId: string;
  professionalId: string;
  subProfileId: string | null;
  durationMin: number;
  paidAt: string;
  startedAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  /** Décompteur serveur (RM-06-02). */
  remainingSeconds: number;
  /** PREPARING : démarrage automatique à paidAt + PM-28. */
  autoStartAt: string | null;
  extensionTotalSec: number;
  /** Retard cumulé du soignant (s) au-delà de la tolérance de 30 s entre messages (D-032). */
  professionalDelaySec: number;
  reportDepositedAt: string | null;
  preConsultation: PreConsultationView | null;
  rated: boolean;
  /** L'AUTRE participant est en train d'écrire/enregistrer (signal éphémère ~6s). */
  otherPartyTyping: boolean;
}
export type SessionMessageKind = 'TEXT' | 'PHOTO' | 'VOICE' | 'DOCUMENT';
export interface MessageReplyPreview {
  id: string;
  senderId: string;
  kind: string;
  preview: string;
}
export interface MessageReaction {
  emoji: string;
  count: number;
  /** J'ai moi-même posé cette réaction (pour la mise en évidence visuelle). */
  mine: boolean;
}
export interface MessageView {
  id: string;
  sessionId: string;
  senderId: string;
  kind: string;
  body: string | null;
  fileKey: string | null;
  mediaKeys: string[];
  clientMsgId: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  replyTo: MessageReplyPreview | null;
  status: 'sent' | 'delivered' | 'read' | null;
  reactions: MessageReaction[];
}
export interface ReactToMessageRequest {
  emoji: string;
}
export interface MessageListResponse {
  items: MessageView[];
  nextCursor: string | null;
}
export interface SubmitPreConsultationRequest {
  symptoms: string;
  sinceWhen?: string;
  attachments?: string[];
}
export interface SendMessageRequest {
  clientMsgId: string;
  kind: SessionMessageKind;
  body?: string;
  fileKey?: string;
  mediaKeys?: string[];
  replyToId?: string;
}
export interface EditMessageRequest {
  body: string;
}
export interface DeleteMessageRequest {
  forEveryone: boolean;
}
export interface RateSessionRequest {
  score: number;
  comment?: string;
}

// ── M06 — Poignée de main (CU-06-01) ─────────────────────────────────────────
export type HandshakeStatus = 'INITIATED' | 'CONFIRMED' | 'PAID' | 'EXPIRED' | 'REFUSED' | 'ABANDONED';
export interface InitiateHandshakeRequest {
  offerId: string;
  subProfileId?: string;
}
export interface HandshakeView {
  id: string;
  status: HandshakeStatus;
  patientAccountId: string;
  professionalId: string;
  offerId: string;
  subProfileId: string | null;
  initiatedAt: string;
  confirmedAt: string | null;
  confirmExpiresAt: string | null;
  refusalReason: string | null;
  windowExpiresAt: string | null;
  /** Compte à rebours PM-07 calculé SERVEUR (RM-06-02). */
  windowRemainingSeconds: number;
  /** Posé quand la poignée est PAID — porte d'entrée de la session (CU-06-02). */
  sessionId: string | null;
}

// ── M13 — Paiement Mobile Money (CU-06-01, RM-06-01) ─────────────────────────
export type MomoOperator = 'MTN_MOMO' | 'AIRTEL_MONEY';
export type PaymentStatus = 'INITIATED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export interface PayHandshakeRequest {
  operator: MomoOperator;
}
export interface PaymentState {
  paymentId: string;
  orderRef: string;
  status: PaymentStatus;
  amountXaf: number;
  operator: MomoOperator;
  failReason: string | null;
}

// ── M01 — Compte avancé (sessions, n°, clôture, 2FA off) ─────────────────────
export interface SessionInfo {
  id: string;
  client: string;
  deviceLabel: string | null;
  lastActiveAt: string;
  current: boolean;
}
export interface StartPhoneChangeRequest {
  newPhone: string;
}
export interface ConfirmPhoneChangeRequest {
  newPhone: string;
  oldPhoneCode: string;
  newPhoneCode: string;
}
export interface CloseAccountRequest {
  password: string;
  otpCode: string;
}
export interface DisableTotpRequest {
  password: string;
  code: string;
}

/** Mise à jour du profil patient (CRUD compte) — tous champs optionnels. */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: Sex;
  district?: string;
}

// ── M14 — Rappels de médicaments (CRUD patient) ──────────────────────────────
export interface Reminder {
  id: string;
  medicationName: string;
  dosage: string | null;
  times: string[];
  active: boolean;
  lastTakenAt: string | null;
  createdAt: string;
}
export interface ReminderListResponse {
  items: Reminder[];
}
export interface CreateReminderRequest {
  medicationName: string;
  dosage?: string;
  times: string[];
}
export interface UpdateReminderRequest {
  medicationName?: string;
  dosage?: string;
  times?: string[];
  active?: boolean;
}

// ── M07 — Carnet familial / sous-profils (CU-07-04) ──────────────────────────
export interface SubProfile {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: Sex;
  status: string;
  createdAt: string;
}
export interface CreateSubProfileRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: Sex;
}

export const REMINDER_ROUTES = {
  mine: '/v1/reminders/me',
  create: '/v1/reminders',
  one: (id: string): string => `/v1/reminders/${encodeURIComponent(id)}`,
  taken: (id: string): string => `/v1/reminders/${encodeURIComponent(id)}/taken`,
} as const;

export const ACCOUNT_ROUTES = {
  me: '/v1/accounts/me',
  avatar: '/v1/accounts/me/avatar',
  sessions: '/v1/accounts/me/sessions',
  session: (id: string): string => `/v1/accounts/me/sessions/${encodeURIComponent(id)}`,
  logout: '/v1/accounts/me/logout',
  phoneChangeStart: '/v1/accounts/me/phone-change/start',
  phoneChangeConfirm: '/v1/accounts/me/phone-change/confirm',
  closeRequestOtp: '/v1/accounts/me/close/request-otp',
  close: '/v1/accounts/me/close',
  totpDisable: '/v1/accounts/me/totp/disable',
  // 2FA par email (mobile) — remplace le TOTP, réservé au web.
  twoFactorEmailRequest: '/v1/accounts/me/2fa/email/request',
  twoFactorEmailEnable: '/v1/accounts/me/2fa/email/enable',
  twoFactorEmailDisable: '/v1/accounts/me/2fa/email/disable',
} as const;

export const DIRECTORY_ROUTES = {
  search: '/v1/directory',
  profile: (id: string): string => `/v1/directory/${encodeURIComponent(id)}`,
  availabilityAlert: (id: string): string => `/v1/directory/${encodeURIComponent(id)}/availability-alert`,
} as const;

export const SPACE_ROUTES = {
  patientSpace: '/v1/me/space',
} as const;

// ── M14 — Préférences de notification (EF-14-04) ─────────────────────────────
export type NotificationCategory = 'care' | 'money' | 'reminder' | 'system' | 'critical';
export interface NotificationPreference {
  category: string;
  enabled: boolean;
  /** false pour « critical » (non désactivable, RM-14-02). */
  adjustable: boolean;
}
export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
}
export interface UpdatePreferenceRequest {
  category: NotificationCategory;
  enabled: boolean;
}

// ── M14 — Centre de notifications (EF-14-07) ─────────────────────────────────
export interface NotificationItem {
  id: string;
  template: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationListResponse {
  items: NotificationItem[];
  nextCursor: string | null;
}

// ── M13 — Reçus de paiement du payeur (EF-13-05) ─────────────────────────────
export interface Receipt {
  number: string;
  kind: string;
  orderRef: string;
  amountXaf: number;
  createdAt: string;
}

export const NOTIFICATION_ROUTES = {
  list: '/v1/notifications/me',
  unreadCount: '/v1/notifications/me/unread-count',
  read: (id: string): string => `/v1/notifications/me/${encodeURIComponent(id)}/read`,
  delete: (id: string): string => `/v1/notifications/me/${encodeURIComponent(id)}`,
  deleteBulk: '/v1/notifications/me',
  preferences: '/v1/notifications/me/preferences',
  devices: '/v1/notifications/devices',
  device: (token: string): string => `/v1/notifications/devices/${encodeURIComponent(token)}`,
} as const;

export const PAYMENT_ROUTES = {
  receipts: '/v1/payments/receipts',
} as const;

export const SESSION_ROUTES = {
  mine: '/v1/care-sessions/mine',
  one: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}`,
  preConsultation: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/pre-consultation`,
  messages: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/messages`,
  message: (id: string, messageId: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}`,
  messageDelete: (id: string, messageId: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/delete`,
  messageReactions: (id: string, messageId: string): string =>
    `/v1/care-sessions/${encodeURIComponent(id)}/messages/${encodeURIComponent(messageId)}/reactions`,
  typing: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/typing`,
  media: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/media`,
  cancel: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/cancel`,
  rate: (id: string): string => `/v1/care-sessions/${encodeURIComponent(id)}/rating`,
} as const;

/** URL absolue d'un média servi par le backend (photo de profil, média de session). */
export const MEDIA_ROUTES = {
  avatar: (key: string): string => `/v1/media/avatars/${encodeURIComponent(key)}`,
  sessionMedia: (key: string): string => `/v1/media/sessions/${encodeURIComponent(key)}`,
} as const;

export const HANDSHAKE_ROUTES = {
  initiate: '/v1/handshakes',
  one: (id: string): string => `/v1/handshakes/${encodeURIComponent(id)}`,
  pay: (id: string): string => `/v1/handshakes/${encodeURIComponent(id)}/pay`,
  abandon: (id: string): string => `/v1/handshakes/${encodeURIComponent(id)}/abandon`,
} as const;

// ── M07 — Carnet de santé à vie (EF-07-03/06/08) ─────────────────────────────
export type RecordEntryType =
  | 'CONSULTATION_REPORT'
  | 'PRESCRIPTION'
  | 'LAB_RESULTS'
  | 'VITALS'
  | 'ALLERGY'
  | 'MEDICAL_HISTORY'
  | 'VACCINATION'
  | 'PERSONAL_NOTE';
export type RecordProvenance = 'DECLARED_BY_PATIENT' | 'RECORDED_BY_PROFESSIONAL' | 'SYSTEM';
/** Types déclarables par le patient (CU-07-02, EF-07-06). */
export type DeclarableType = 'ALLERGY' | 'MEDICAL_HISTORY' | 'VACCINATION' | 'PERSONAL_NOTE';

/** Fiche synthèse calculée (jamais stockée) — alimente aussi la fiche d'urgence M15. */
export interface HealthSummary {
  bloodType: string | null;
  activeAllergies: string[];
  chronicDiseases: string[];
}
export interface RecordEntry {
  id: string;
  type: RecordEntryType;
  provenance: RecordProvenance;
  authorId: string | null;
  sourceRef: string | null;
  payload: Record<string, unknown>;
  supersedesId: string | null;
  createdAt: string;
  superseded: boolean;
}
export interface RecordPage {
  recordId: string | null;
  items: RecordEntry[];
  nextCursor: string | null;
}
export interface DeclareEntryRequest {
  type: DeclarableType;
  payload: Record<string, unknown>;
  supersedesId?: string;
}
export interface RecordExport {
  generatedAt: string;
  algorithm: string;
  fingerprint: string;
  content: Record<string, unknown>;
  signedPdf: null;
  note: string;
}

export const HEALTH_ROUTES = {
  summary: '/v1/health-record/me/summary',
  record: '/v1/health-record/me',
  entries: '/v1/health-record/me/entries',
  export: '/v1/health-record/me/export',
  subProfiles: '/v1/health-record/me/sub-profiles',
} as const;

// ── M09 — Ordonnance & délivrance (EF-09-09, CU-09-01) ───────────────────────
export type PrescriptionStatus = 'ACTIVE' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';
export interface PrescriptionLine {
  id: string;
  medicamentId: string | null;
  /** Nom réel (DCI + dosage) résolu côté serveur pour une ligne référentielle — null si texte libre. */
  medicationName: string | null;
  freeText: string | null;
  posology: string;
  durationDays: number | null;
  qtyPrescribed: number;
  qtyDispensed: number;
  remaining: number;
}
export interface PrescriptionView {
  id: string;
  status: PrescriptionStatus;
  /** Clé du QR — null si l'ordonnance n'est plus active (RM-09-02). */
  qrToken: string | null;
  subProfileId: string | null;
  expiresAt: string;
  createdAt: string;
  cancelReason: string | null;
  lines: PrescriptionLine[];
}
export interface PrescriptionListResponse {
  items: PrescriptionView[];
}

export const PRESCRIPTION_ROUTES = {
  mine: '/v1/prescriptions/me',
  one: (id: string): string => `/v1/prescriptions/${encodeURIComponent(id)}`,
} as const;

// ── M12 — Recherche & dévoilement-réservation (CU-12-01/02) ──────────────────
export interface CatalogItem {
  id: string;
  dci: string;
  commercialNames: string[];
  form: string | null;
  dosage: string | null;
}
export interface CatalogResponse {
  items: CatalogItem[];
}
export interface SearchItem {
  medicamentId: string;
  quantity: number;
}
export interface AnonymousDistrictResult {
  district: string;
  pharmacyCount: number;
  products: Array<{medicamentId: string; totalAvailable: number; pharmaciesWithIt: number}>;
}
export interface SearchRequest {
  district?: string;
  items: SearchItem[];
}
export interface SearchResult {
  districts: AnonymousDistrictResult[];
  items: SearchItem[];
  suggestAlert: boolean;
}
export type DisclosureStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'SERVED' | 'EXPIRED' | 'REFUNDED';
export interface RevealedFacility {
  facilityId: string;
  name: string;
  phone: string | null;
  quarter: string | null;
  latitude: number | null;
  longitude: number | null;
}
export interface RequestDisclosureRequest {
  district: string;
  items: SearchItem[];
  operator: MomoOperator;
}
export interface DisclosureView {
  id: string;
  status: DisclosureStatus;
  district: string;
  requestedItems: SearchItem[];
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  servedAt: string | null;
  /** Compte à rebours serveur — 0 hors dévoilement ACTIVE. */
  remainingSeconds: number;
  orderRef: string;
  /** Prix effectivement facturé pour CE dévoilement (PM-03 au moment du paiement) — jamais en dur. */
  amountXaf: number;
  /** Identité de la pharmacie — présente UNIQUEMENT si ACTIVE (RM-12-01), sinon null. */
  facility: RevealedFacility | null;
}
export interface CreateAlertRequest {
  district: string;
  medicamentIds: string[];
}
export interface DisclosurePriceResponse {
  amountXaf: number;
}

export const MEDS_ROUTES = {
  catalog: '/v1/medicaments',
  search: '/v1/search',
  alerts: '/v1/search/alerts',
  disclosures: '/v1/disclosures',
  disclosurePrice: '/v1/disclosures/price',
  disclosure: (id: string): string => `/v1/disclosures/${encodeURIComponent(id)}`,
} as const;
