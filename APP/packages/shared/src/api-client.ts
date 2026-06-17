/**
 * Client API ULAMU — framework-agnostique (fetch global : présent en React Native 0.7x et Node 18+).
 * Réutilisé par mobile (RN) et desktop (Next/Electron). Aucune dépendance native.
 *
 * Responsabilités : URL de base, injection du jeton Bearer (fourni paresseusement), sérialisation
 * JSON, et NORMALISATION des erreurs en `ApiError` typée (jamais une 500 brute remontée à l'UI).
 */
import {
  ApiErrorBody,
  ApiErrorCode,
  AUTH_HEADER,
  AUTH_ROUTES,
  bearer,
  LoginRequest,
  LoginResponse,
  RegisterFacilityMemberRequest,
  RegisterPatientRequest,
  RegisterProfessionalRequest,
  RegisterResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  ResetPasswordRequest,
} from "@ulamu/contracts";

/** Erreur normalisée présentée à l'UI — jamais l'exception brute. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Le code logique dérivé du statut HTTP (pour brancher l'UI sans parser les messages). */
export function codeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "UNKNOWN" : "UNKNOWN";
  }
}

/** Premier message lisible d'un corps d'erreur NestJS (message peut être une liste de validation). */
export function firstMessage(body: ApiErrorBody | undefined, fallback: string): string {
  if (!body) return fallback;
  if (Array.isArray(body.message)) return body.message[0] ?? fallback;
  return typeof body.message === "string" && body.message.length > 0 ? body.message : fallback;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Fourniture paresseuse du jeton de session (lu au stockage sécurisé) — null si anonyme. */
  getToken?: () => string | null | Promise<string | null>;
  /** Permet d'injecter un fetch (tests) ; défaut = fetch global. */
  fetchImpl?: typeof fetch;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => string | null | Promise<string | null>;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.getToken = opts.getToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  /** Requête JSON typée. `auth: true` injecte le Bearer. Lève toujours une `ApiError` en cas d'échec. */
  async request<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth && this.getToken) {
      const token = await this.getToken();
      if (token) headers[AUTH_HEADER] = bearer(token);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      // Coupure réseau / serveur injoignable (fréquent en 3G — ENF-03).
      throw new ApiError(0, "NETWORK", "Connexion impossible — vérifiez votre réseau et réessayez.", err);
    }

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const parsed = text.length > 0 ? (safeJson(text) as unknown) : undefined;

    if (!res.ok) {
      const errBody = parsed as ApiErrorBody | undefined;
      throw new ApiError(res.status, codeFromStatus(res.status), firstMessage(errBody, "Une erreur est survenue."), errBody);
    }
    return parsed as T;
  }

  // ── M01 — Authentification (routes publiques) ──────────────────────────────

  requestOtp(dto: RequestOtpRequest): Promise<RequestOtpResponse> {
    return this.request("POST", AUTH_ROUTES.requestOtp, dto);
  }
  registerPatient(dto: RegisterPatientRequest): Promise<RegisterResponse> {
    return this.request("POST", AUTH_ROUTES.registerPatient, dto);
  }
  registerProfessional(dto: RegisterProfessionalRequest): Promise<RegisterResponse> {
    return this.request("POST", AUTH_ROUTES.registerProfessional, dto);
  }
  registerFacilityMember(dto: RegisterFacilityMemberRequest): Promise<RegisterResponse> {
    return this.request("POST", AUTH_ROUTES.registerFacilityMember, dto);
  }
  login(dto: LoginRequest): Promise<LoginResponse> {
    return this.request("POST", AUTH_ROUTES.login, dto);
  }
  resetPassword(dto: ResetPasswordRequest): Promise<void> {
    return this.request("POST", AUTH_ROUTES.resetPassword, dto);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
