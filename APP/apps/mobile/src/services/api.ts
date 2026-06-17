/**
 * Instance unique du client API. Le jeton courant est gardé en mémoire (mis à jour à la
 * connexion / restauration / déconnexion) et injecté en Bearer par le client.
 */
import {API_BASE_URL} from '../config';
import {ApiClient} from '../lib/api-client';

let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

/** Jeton courant — pour les médias authentifiés (Image/Audio avec header Authorization). */
export function getAuthToken(): string | null {
  return currentToken;
}

/** Enregistré par AuthContext : déconnecte proprement quand une requête authentifiée renvoie 401. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => currentToken,
  onUnauthorized: () => unauthorizedHandler?.(),
});
