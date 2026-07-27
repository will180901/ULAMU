/**
 * Contexte d'authentification PATIENT — RÉEL (aucune simulation).
 * Inscription : profil + username + OTP SMS (vérif téléphone). Connexion : username + mot de passe
 * (+ TOTP si activé). La session obtenue est « en attente » jusqu'au bouton « Accéder à mon espace ».
 * TOTP (2FA) : initiation guidée post-connexion (QR + confirmation + codes de secours).
 */
import React, {createContext, useContext, useEffect, useMemo, useReducer, useRef} from 'react';
import {Platform} from 'react-native';
import {CLIENT_KIND} from '../config';
import {authReducer, AuthSession, AuthState, initialAuthState} from '../lib/auth-state';
import {PublicOtpPurpose, RequestOtpResponse, Sex, TotpSetupResponse} from '../lib/contracts';
import {api, setAuthToken, setUnauthorizedHandler} from '../services/api';
import {clearSession, loadSession, saveSession} from '../services/session';

/** Profil collecté à l'inscription (avant l'OTP). */
export interface RegisterProfile {
  firstName: string;
  lastName: string;
  username: string;
  email: string; // canal de l'OTP inscription (2026-07)
  birthDate: string; // ISO AAAA-MM-JJ
  sex: Sex;
  password: string;
}

interface AuthContextValue {
  state: AuthState;
  /** 2026-07 : le code OTP part par EMAIL (plus par SMS) — inscription/réinitialisation. */
  requestOtp: (email: string, purpose?: PublicOtpPurpose) => Promise<RequestOtpResponse>;
  /** Connexion. Renvoie {totpRequired} : si true, redemander avec le code TOTP. */
  loginPassword: (username: string, password: string, totpCode?: string) => Promise<{totpRequired: boolean}>;
  /** Vérifie l'OTP et crée le compte patient (réel). Session mise « en attente ». */
  verifyRegister: (profile: RegisterProfile, district: string, phone: string, otpCode: string) => Promise<void>;
  /** Active la session en attente (→ entre dans l'app). */
  activatePending: () => Promise<void>;
  /** TOTP (2FA) — session active requise. */
  totpStartSetup: () => Promise<TotpSetupResponse>;
  totpConfirm: (code: string) => Promise<string[]>;
  logout: () => Promise<void>;
}

/**
 * Nom réel de l'appareil (marque + modèle, ex. « samsung SM-G950F ») via les constantes natives déjà
 * embarquées par React Native (aucune lib/rebuild nécessaire) — pour distinguer 2 téléphones dans
 * « Appareils connectés » (SettingsScreen), au lieu du littéral générique 'Android' envoyé jusqu'ici.
 */
function deviceLabel(): string {
  if (Platform.OS === 'android') {
    const c = Platform.constants as {Brand?: string; Model?: string} | undefined;
    const brand = c?.Brand?.trim();
    const model = c?.Model?.trim();
    if (model) {
      return brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${model}` : model;
    }
  }
  return 'Android';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const pending = useRef<AuthSession | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await loadSession();
      if (!active) {
        return;
      }
      if (session) {
        setAuthToken(session.sessionToken);
      }
      dispatch({type: 'RESTORED', session});
    })();
    return () => {
      active = false;
    };
  }, []);

  // Jeton mort (session révoquée/expirée, base ré-initialisée…) → déconnexion propre vers l'écran de
  // connexion, au lieu d'un « Connexion impossible » sur chaque écran connecté.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setAuthToken(null);
      dispatch({type: 'LOGOUT'});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function requestOtp(email: string, purpose: PublicOtpPurpose = 'REGISTRATION'): Promise<RequestOtpResponse> {
      return api.requestOtp({email, purpose});
    }

    async function loginPassword(username: string, password: string, totpCode?: string): Promise<{totpRequired: boolean}> {
      const res = await api.login({username, password, client: CLIENT_KIND, deviceLabel: deviceLabel(), totpCode});
      if (res.totpRequired) {
        return {totpRequired: true};
      }
      pending.current = {accountId: res.accountId!, accountType: res.accountType ?? 'PATIENT', sessionToken: res.sessionToken!};
      return {totpRequired: false};
    }

    async function verifyRegister(profile: RegisterProfile, district: string, phone: string, otpCode: string): Promise<void> {
      const res = await api.registerPatient({
        phone,
        email: profile.email,
        username: profile.username,
        otpCode,
        password: profile.password,
        firstName: profile.firstName,
        lastName: profile.lastName,
        birthDate: profile.birthDate,
        sex: profile.sex,
        district,
        client: CLIENT_KIND,
        deviceLabel: deviceLabel(),
      });
      pending.current = {accountId: res.accountId, accountType: 'PATIENT', sessionToken: res.sessionToken};
    }

    async function activatePending(): Promise<void> {
      const session = pending.current;
      if (!session) {
        return;
      }
      await saveSession(session);
      setAuthToken(session.sessionToken);
      dispatch({type: 'AUTH_SUCCESS', session});
      pending.current = null;
    }

    async function totpStartSetup(): Promise<TotpSetupResponse> {
      return api.totpSetup();
    }
    async function totpConfirm(code: string): Promise<string[]> {
      const res = await api.totpConfirm({code});
      return res.backupCodes;
    }

    async function logout(): Promise<void> {
      // Révoque la session COURANTE côté serveur (best-effort — un échec réseau ne doit jamais
      // empêcher la déconnexion locale, sinon l'utilisateur resterait bloqué connecté).
      try {
        await api.logout();
      } catch {
        // ignoré : la session expirera d'elle-même (PM-20) si la révocation réseau échoue ici.
      }
      await clearSession();
      setAuthToken(null);
      dispatch({type: 'LOGOUT'});
    }

    return {state, requestOtp, loginPassword, verifyRegister, activatePending, totpStartSetup, totpConfirm, logout};
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  }
  return ctx;
}
