/**
 * Client API ULAMU — VENDORÉ (source de vérité : packages/shared/src/api-client.ts).
 * fetch global (présent en React Native 0.7x). Normalise toute erreur en ApiError typée.
 */
import {
  ACCOUNT_ROUTES,
  ApiErrorBody,
  ApiErrorCode,
  AUTH_HEADER,
  AUTH_ROUTES,
  AvailabilityAlertResponse,
  bearer,
  CareSessionListResponse,
  CatalogResponse,
  CheckUsernameResponse,
  CloseAccountRequest,
  ConfirmPhoneChangeRequest,
  CreateAlertRequest,
  CreateReminderRequest,
  CreateSubProfileRequest,
  DeclareEntryRequest,
  DisableEmailTwoFactorRequest,
  DisableTotpRequest,
  EnableEmailTwoFactorRequest,
  Reminder,
  ReminderListResponse,
  REMINDER_ROUTES,
  SubProfile,
  UpdateProfileRequest,
  UpdateAvatarRequest,
  RegisterDeviceRequest,
  UploadSessionMediaRequest,
  UploadMediaResponse,
  UpdateReminderRequest,
  DisclosurePriceResponse,
  DisclosureView,
  DIRECTORY_ROUTES,
  MEDS_ROUTES,
  RequestDisclosureRequest,
  SearchRequest,
  SearchResult,
  SessionInfo,
  StartPhoneChangeRequest,
  HEALTH_ROUTES,
  HealthSummary,
  HANDSHAKE_ROUTES,
  HandshakeView,
  InitiateHandshakeRequest,
  DeleteMessageRequest,
  EditMessageRequest,
  ReactToMessageRequest,
  MessageListResponse,
  MessageView,
  PayHandshakeRequest,
  PaymentState,
  PRESCRIPTION_ROUTES,
  PrescriptionListResponse,
  PrescriptionView,
  RateSessionRequest,
  RecordEntry,
  RecordExport,
  RecordPage,
  SendMessageRequest,
  SessionView,
  SubmitPreConsultationRequest,
  DirectoryProfile,
  DirectoryQuery,
  DirectorySearchResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  NOTIFICATION_ROUTES,
  NotificationListResponse,
  NotificationPreferencesResponse,
  PatientSpaceResponse,
  UpdatePreferenceRequest,
  PAYMENT_ROUTES,
  Receipt,
  SESSION_ROUTES,
  RegisterPatientRequest,
  RegisterResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  ResetPasswordRequest,
  SPACE_ROUTES,
  TotpConfirmRequest,
  TotpConfirmResponse,
  TotpSetupResponse,
  UnreadCountResponse,
} from './contracts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function codeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'UNKNOWN';
  }
}

export function firstMessage(body: ApiErrorBody | undefined, fallback: string): string {
  if (!body) {
    return fallback;
  }
  if (Array.isArray(body.message)) {
    return body.message[0] ?? fallback;
  }
  return typeof body.message === 'string' && body.message.length > 0 ? body.message : fallback;
}

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  fetchImpl?: typeof fetch;
  /** Appelé quand une requête AUTHENTIFIÉE reçoit 401 (jeton invalide/expiré) → déconnexion propre. */
  onUnauthorized?: () => void;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => string | null | Promise<string | null>;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => void;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.getToken = opts.getToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.onUnauthorized = opts.onUnauthorized;
  }

  async request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    if (auth && this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers[AUTH_HEADER] = bearer(token);
      }
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new ApiError(0, 'NETWORK', 'Connexion impossible — vérifiez votre réseau et réessayez.', err);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    const parsed = text.length > 0 ? (safeJson(text) as unknown) : undefined;

    if (!res.ok) {
      // Jeton de session mort sur une requête authentifiée → on prévient l'app (déconnexion propre).
      if (res.status === 401 && auth) {
        this.onUnauthorized?.();
      }
      const errBody = parsed as ApiErrorBody | undefined;
      throw new ApiError(res.status, codeFromStatus(res.status), firstMessage(errBody, 'Une erreur est survenue.'), errBody);
    }
    return parsed as T;
  }

  requestOtp(dto: RequestOtpRequest): Promise<RequestOtpResponse> {
    return this.request('POST', AUTH_ROUTES.requestOtp, dto);
  }
  checkUsername(username: string): Promise<CheckUsernameResponse> {
    return this.request('GET', `${AUTH_ROUTES.usernameAvailable}?username=${encodeURIComponent(username)}`);
  }
  checkEmail(email: string): Promise<CheckUsernameResponse> {
    return this.request('GET', `${AUTH_ROUTES.emailAvailable}?email=${encodeURIComponent(email)}`);
  }
  checkPhone(phone: string): Promise<CheckUsernameResponse> {
    return this.request('GET', `${AUTH_ROUTES.phoneAvailable}?phone=${encodeURIComponent(phone)}`);
  }
  registerPatient(dto: RegisterPatientRequest): Promise<RegisterResponse> {
    return this.request('POST', AUTH_ROUTES.registerPatient, dto);
  }
  login(dto: LoginRequest): Promise<LoginResponse> {
    return this.request('POST', AUTH_ROUTES.login, dto);
  }
  resetPassword(dto: ResetPasswordRequest): Promise<void> {
    return this.request('POST', AUTH_ROUTES.resetPassword, dto);
  }
  /** TOTP (2FA) — endpoints authentifiés (session active requise). */
  totpSetup(): Promise<TotpSetupResponse> {
    return this.request('POST', AUTH_ROUTES.totpSetup, undefined, true);
  }
  totpConfirm(dto: TotpConfirmRequest): Promise<TotpConfirmResponse> {
    return this.request('POST', AUTH_ROUTES.totpConfirm, dto, true);
  }

  // ── M01 — identité (authentifié) ──────────────────────────────────────────
  getMe(): Promise<MeResponse> {
    return this.request('GET', ACCOUNT_ROUTES.me, undefined, true);
  }
  updateProfile(dto: UpdateProfileRequest): Promise<MeResponse> {
    return this.request('PATCH', ACCOUNT_ROUTES.me, dto, true);
  }
  setAvatar(dto: UpdateAvatarRequest): Promise<MeResponse> {
    return this.request('POST', ACCOUNT_ROUTES.avatar, dto, true);
  }
  removeAvatar(): Promise<MeResponse> {
    return this.request('DELETE', ACCOUNT_ROUTES.avatar, undefined, true);
  }
  registerDevice(dto: RegisterDeviceRequest): Promise<{ok: true}> {
    return this.request('POST', NOTIFICATION_ROUTES.devices, dto, true);
  }
  unregisterDevice(token: string): Promise<{ok: true}> {
    return this.request('DELETE', NOTIFICATION_ROUTES.device(token), undefined, true);
  }
  uploadSessionMedia(sessionId: string, dto: UploadSessionMediaRequest): Promise<UploadMediaResponse> {
    return this.request('POST', SESSION_ROUTES.media(sessionId), dto, true);
  }

  // ── M14 — rappels de médicaments (CRUD patient) ───────────────────────────
  listReminders(): Promise<ReminderListResponse> {
    return this.request('GET', REMINDER_ROUTES.mine, undefined, true);
  }
  createReminder(dto: CreateReminderRequest): Promise<Reminder> {
    return this.request('POST', REMINDER_ROUTES.create, dto, true);
  }
  updateReminder(id: string, dto: UpdateReminderRequest): Promise<Reminder> {
    return this.request('PATCH', REMINDER_ROUTES.one(id), dto, true);
  }
  deleteReminder(id: string): Promise<void> {
    return this.request('DELETE', REMINDER_ROUTES.one(id), undefined, true);
  }
  markReminderTaken(id: string): Promise<Reminder> {
    return this.request('POST', REMINDER_ROUTES.taken(id), undefined, true);
  }

  // ── M07 — carnet familial / sous-profils (authentifié) ────────────────────
  listSubProfiles(): Promise<SubProfile[]> {
    return this.request('GET', HEALTH_ROUTES.subProfiles, undefined, true);
  }
  createSubProfile(dto: CreateSubProfileRequest): Promise<{subProfileId: string; healthRecordId: string}> {
    return this.request('POST', HEALTH_ROUTES.subProfiles, dto, true);
  }

  // ── M01 — compte avancé (authentifié) ─────────────────────────────────────
  listSessions(): Promise<SessionInfo[]> {
    return this.request('GET', ACCOUNT_ROUTES.sessions, undefined, true);
  }
  revokeSession(id: string): Promise<void> {
    return this.request('DELETE', ACCOUNT_ROUTES.session(id), undefined, true);
  }
  /** Révoque la session COURANTE côté serveur (déconnexion réelle, pas seulement locale). */
  logout(): Promise<void> {
    return this.request('POST', ACCOUNT_ROUTES.logout, undefined, true);
  }
  startPhoneChange(dto: StartPhoneChangeRequest): Promise<unknown> {
    return this.request('POST', ACCOUNT_ROUTES.phoneChangeStart, dto, true);
  }
  confirmPhoneChange(dto: ConfirmPhoneChangeRequest): Promise<unknown> {
    return this.request('POST', ACCOUNT_ROUTES.phoneChangeConfirm, dto, true);
  }
  requestCloseOtp(): Promise<unknown> {
    return this.request('POST', ACCOUNT_ROUTES.closeRequestOtp, undefined, true);
  }
  closeAccount(dto: CloseAccountRequest): Promise<unknown> {
    return this.request('POST', ACCOUNT_ROUTES.close, dto, true);
  }
  disableTotp(dto: DisableTotpRequest): Promise<unknown> {
    return this.request('POST', ACCOUNT_ROUTES.totpDisable, dto, true);
  }

  // ── 2FA par email (mobile) ────────────────────────────────────────────────
  /** Envoie un code à l'adresse du compte pour confirmer l'activation. */
  requestEmailTwoFactorOtp(): Promise<RequestOtpResponse> {
    return this.request('POST', ACCOUNT_ROUTES.twoFactorEmailRequest, undefined, true);
  }
  enableEmailTwoFactor(dto: EnableEmailTwoFactorRequest): Promise<{enabled: true}> {
    return this.request('POST', ACCOUNT_ROUTES.twoFactorEmailEnable, dto, true);
  }
  disableEmailTwoFactor(dto: DisableEmailTwoFactorRequest): Promise<{enabled: false}> {
    return this.request('POST', ACCOUNT_ROUTES.twoFactorEmailDisable, dto, true);
  }

  // ── M05 — annuaire (vitrine publique + cloche authentifiée) ───────────────
  searchDirectory(query: DirectoryQuery = {}): Promise<DirectorySearchResponse> {
    return this.request('GET', `${DIRECTORY_ROUTES.search}${buildQuery(query)}`);
  }
  getProfessionalProfile(id: string): Promise<DirectoryProfile> {
    return this.request('GET', DIRECTORY_ROUTES.profile(id));
  }
  poseAvailabilityAlert(id: string): Promise<AvailabilityAlertResponse> {
    return this.request('POST', DIRECTORY_ROUTES.availabilityAlert(id), undefined, true);
  }

  // ── M16 / M14 — espace patient & notifications (authentifié) ──────────────
  patientSpace(): Promise<PatientSpaceResponse> {
    return this.request('GET', SPACE_ROUTES.patientSpace, undefined, true);
  }
  notificationsUnreadCount(): Promise<UnreadCountResponse> {
    return this.request('GET', NOTIFICATION_ROUTES.unreadCount, undefined, true);
  }
  listNotifications(limit = 30): Promise<NotificationListResponse> {
    return this.request('GET', `${NOTIFICATION_ROUTES.list}?limit=${limit}`, undefined, true);
  }
  markNotificationRead(id: string): Promise<unknown> {
    return this.request('POST', NOTIFICATION_ROUTES.read(id), undefined, true);
  }
  deleteNotification(id: string): Promise<unknown> {
    return this.request('DELETE', NOTIFICATION_ROUTES.delete(id), undefined, true);
  }
  deleteNotifications(ids: string[]): Promise<unknown> {
    return this.request('DELETE', NOTIFICATION_ROUTES.deleteBulk, {ids}, true);
  }
  getNotificationPreferences(): Promise<NotificationPreferencesResponse> {
    return this.request('GET', NOTIFICATION_ROUTES.preferences, undefined, true);
  }
  setNotificationPreference(dto: UpdatePreferenceRequest): Promise<unknown> {
    return this.request('PUT', NOTIFICATION_ROUTES.preferences, dto, true);
  }

  // ── M13 — reçus de paiement (authentifié) ─────────────────────────────────
  listReceipts(): Promise<Receipt[]> {
    return this.request('GET', PAYMENT_ROUTES.receipts, undefined, true);
  }

  // ── M06 — mes sessions de soin (authentifié) ──────────────────────────────
  listMyCareSessions(): Promise<CareSessionListResponse> {
    return this.request('GET', SESSION_ROUTES.mine, undefined, true);
  }

  // ── M06 — poignée de main & paiement (authentifié) ────────────────────────
  initiateHandshake(dto: InitiateHandshakeRequest): Promise<HandshakeView> {
    return this.request('POST', HANDSHAKE_ROUTES.initiate, dto, true);
  }
  getHandshake(id: string): Promise<HandshakeView> {
    return this.request('GET', HANDSHAKE_ROUTES.one(id), undefined, true);
  }
  payHandshake(id: string, dto: PayHandshakeRequest): Promise<PaymentState> {
    return this.request('POST', HANDSHAKE_ROUTES.pay(id), dto, true);
  }
  /** Annule la demande de consultation tant que le soignant n'a pas confirmé (INITIATED). */
  abandonHandshake(id: string): Promise<HandshakeView> {
    return this.request('POST', HANDSHAKE_ROUTES.abandon(id), undefined, true);
  }

  // ── M06 — session de soin (authentifié, participants) ─────────────────────
  getCareSession(id: string): Promise<SessionView> {
    return this.request('GET', SESSION_ROUTES.one(id), undefined, true);
  }
  submitPreConsultation(id: string, dto: SubmitPreConsultationRequest): Promise<SessionView> {
    return this.request('POST', SESSION_ROUTES.preConsultation(id), dto, true);
  }
  sendSessionMessage(id: string, dto: SendMessageRequest): Promise<MessageView> {
    return this.request('POST', SESSION_ROUTES.messages(id), dto, true);
  }
  listSessionMessages(id: string, cursor?: string, limit = 100): Promise<MessageListResponse> {
    const q = cursor ? `?limit=${limit}&cursor=${encodeURIComponent(cursor)}` : `?limit=${limit}`;
    return this.request('GET', `${SESSION_ROUTES.messages(id)}${q}`, undefined, true);
  }
  editSessionMessage(id: string, messageId: string, dto: EditMessageRequest): Promise<MessageView> {
    return this.request('PATCH', SESSION_ROUTES.message(id, messageId), dto, true);
  }
  deleteSessionMessage(id: string, messageId: string, dto: DeleteMessageRequest): Promise<{ok: true}> {
    return this.request('POST', SESSION_ROUTES.messageDelete(id, messageId), dto, true);
  }
  reactToMessage(id: string, messageId: string, dto: ReactToMessageRequest): Promise<MessageView> {
    return this.request('POST', SESSION_ROUTES.messageReactions(id, messageId), dto, true);
  }
  setTyping(id: string): Promise<void> {
    return this.request('POST', SESSION_ROUTES.typing(id), {}, true);
  }
  cancelSession(id: string): Promise<SessionView> {
    return this.request('POST', SESSION_ROUTES.cancel(id), undefined, true);
  }
  rateSession(id: string, dto: RateSessionRequest): Promise<unknown> {
    return this.request('POST', SESSION_ROUTES.rate(id), dto, true);
  }

  // ── M07 — Carnet de santé (authentifié ; subProfileId = carnet d'une personne à charge) ──
  getHealthSummary(subProfileId?: string): Promise<HealthSummary> {
    const q = subProfileId ? `?subProfileId=${encodeURIComponent(subProfileId)}` : '';
    return this.request('GET', `${HEALTH_ROUTES.summary}${q}`, undefined, true);
  }
  getHealthRecord(type?: string, limit = 50, subProfileId?: string): Promise<RecordPage> {
    const parts = [`limit=${limit}`];
    if (type) {
      parts.push(`type=${encodeURIComponent(type)}`);
    }
    if (subProfileId) {
      parts.push(`subProfileId=${encodeURIComponent(subProfileId)}`);
    }
    return this.request('GET', `${HEALTH_ROUTES.record}?${parts.join('&')}`, undefined, true);
  }
  declareHealthEntry(dto: DeclareEntryRequest, subProfileId?: string): Promise<RecordEntry> {
    const q = subProfileId ? `?subProfileId=${encodeURIComponent(subProfileId)}` : '';
    return this.request('POST', `${HEALTH_ROUTES.entries}${q}`, dto, true);
  }
  exportHealthRecord(subProfileId?: string): Promise<RecordExport> {
    const q = subProfileId ? `?subProfileId=${encodeURIComponent(subProfileId)}` : '';
    return this.request('GET', `${HEALTH_ROUTES.export}${q}`, undefined, true);
  }

  // ── M09 — ordonnances du patient (authentifié) ────────────────────────────
  listMyPrescriptions(): Promise<PrescriptionListResponse> {
    return this.request('GET', PRESCRIPTION_ROUTES.mine, undefined, true);
  }
  getPrescription(id: string): Promise<PrescriptionView> {
    return this.request('GET', PRESCRIPTION_ROUTES.one(id), undefined, true);
  }

  // ── M12 — recherche & dévoilement (authentifié) ───────────────────────────
  searchCatalog(q: string, limit = 20): Promise<CatalogResponse> {
    return this.request('GET', `${MEDS_ROUTES.catalog}?q=${encodeURIComponent(q)}&limit=${limit}`, undefined, true);
  }
  searchAvailability(dto: SearchRequest): Promise<SearchResult> {
    return this.request('POST', MEDS_ROUTES.search, dto, true);
  }
  createMedAlert(dto: CreateAlertRequest): Promise<unknown> {
    return this.request('POST', MEDS_ROUTES.alerts, dto, true);
  }
  requestDisclosure(dto: RequestDisclosureRequest): Promise<DisclosureView> {
    return this.request('POST', MEDS_ROUTES.disclosures, dto, true);
  }
  getDisclosure(id: string): Promise<DisclosureView> {
    return this.request('GET', MEDS_ROUTES.disclosure(id), undefined, true);
  }
  getDisclosurePrice(): Promise<DisclosurePriceResponse> {
    return this.request('GET', MEDS_ROUTES.disclosurePrice, undefined, true);
  }
}

/** Sérialise les filtres définis en query-string (ignore undefined). */
function buildQuery<T extends object>(params: T): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
