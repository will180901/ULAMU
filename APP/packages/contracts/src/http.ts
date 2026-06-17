/**
 * Socle HTTP partagé entre l'API (NestJS) et les apps (mobile/desktop).
 * Forme d'erreur = celle des exceptions NestJS par défaut ; les apps la normalisent
 * en `ApiError` (voir @ulamu/shared). Aucune logique ici — uniquement des types.
 */

/** Corps d'erreur renvoyé par NestJS (HttpException). `message` peut être une liste (validation class-validator). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Codes d'erreur logiques exposés par certains endpoints (ex. garde-fou allergies M09). */
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "RATE_LIMITED"
  | "NETWORK"
  | "UNKNOWN";

/** En-tête d'authentification : jeton de session opaque en Bearer (auth.guard côté API). */
export const AUTH_HEADER = "Authorization";
export const bearer = (token: string): string => `Bearer ${token}`;
