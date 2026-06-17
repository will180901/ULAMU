/**
 * Machine d'états d'authentification — VENDORÉ (source : packages/shared/src/auth.ts). Pure.
 */
import {AccountType} from './contracts';

export interface AuthSession {
  accountId: string;
  accountType: AccountType;
  /** Jeton opaque Bearer (jamais journalisé, jamais affiché). */
  sessionToken: string;
}

export type AuthState =
  | {status: 'loading'}
  | {status: 'anonymous'}
  | {status: 'authenticating'}
  | {status: 'authenticated'; session: AuthSession};

export type AuthAction =
  | {type: 'RESTORED'; session: AuthSession | null}
  | {type: 'AUTH_START'}
  | {type: 'AUTH_SUCCESS'; session: AuthSession}
  | {type: 'AUTH_FAILURE'}
  | {type: 'LOGOUT'};

export const initialAuthState: AuthState = {status: 'loading'};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORED':
      return action.session ? {status: 'authenticated', session: action.session} : {status: 'anonymous'};
    case 'AUTH_START':
      return state.status === 'authenticated' ? state : {status: 'authenticating'};
    case 'AUTH_SUCCESS':
      return {status: 'authenticated', session: action.session};
    case 'AUTH_FAILURE':
      return {status: 'anonymous'};
    case 'LOGOUT':
      return {status: 'anonymous'};
    default:
      return state;
  }
}

export function isAuthenticated(
  state: AuthState,
): state is {status: 'authenticated'; session: AuthSession} {
  return state.status === 'authenticated';
}
