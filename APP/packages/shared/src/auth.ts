/**
 * Modèle de session + machine d'états d'authentification — PURE (testable sans RN/réseau).
 * Les apps branchent ce réducteur sur leur store (Zustand/Context) ; le jeton vit dans un
 * stockage sécurisé (Keychain/MMKV chiffré côté mobile), jamais en clair persistant ailleurs.
 */
import { AccountType } from "@ulamu/contracts";

export interface AuthSession {
  accountId: string;
  accountType: AccountType;
  /** Jeton opaque Bearer (jamais journalisé, jamais affiché). */
  sessionToken: string;
}

export type AuthState =
  | { status: "loading" } // démarrage : lecture du stockage sécurisé en cours
  | { status: "anonymous" }
  | { status: "authenticating" } // appel login/register en cours
  | { status: "authenticated"; session: AuthSession };

export type AuthAction =
  | { type: "RESTORED"; session: AuthSession | null }
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; session: AuthSession }
  | { type: "AUTH_FAILURE" }
  | { type: "LOGOUT" };

export const initialAuthState: AuthState = { status: "loading" };

/** Réducteur pur : aucune E/S, entièrement déterministe. */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "RESTORED":
      return action.session ? { status: "authenticated", session: action.session } : { status: "anonymous" };
    case "AUTH_START":
      // On ne (re)lance une authentification que depuis un état stable (pas pendant le chargement).
      return state.status === "authenticated" ? state : { status: "authenticating" };
    case "AUTH_SUCCESS":
      return { status: "authenticated", session: action.session };
    case "AUTH_FAILURE":
      return { status: "anonymous" };
    case "LOGOUT":
      return { status: "anonymous" };
    default:
      return state;
  }
}

export function isAuthenticated(
  state: AuthState,
): state is { status: "authenticated"; session: AuthSession } {
  return state.status === "authenticated";
}
