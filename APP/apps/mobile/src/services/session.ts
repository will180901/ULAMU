/**
 * Persistance de la session (jeton + identité minimale) — react-native-keychain (Android Keystore /
 * iOS Keychain), plus AsyncStorage en clair. Le jeton reste de toute façon opaque et révocable côté
 * serveur (logout révoque la session serveur), mais un stockage chiffré protège contre une lecture
 * locale du jeton (appareil root/débogueur) tant qu'il est valide.
 */
import * as Keychain from 'react-native-keychain';
import {AuthSession} from '../lib/auth-state';

/** Namespace dédié — évite de partager un service générique avec une autre lib qui utiliserait Keychain. */
const SERVICE = 'ulamu.session.v1';

export async function saveSession(session: AuthSession): Promise<void> {
  await Keychain.setGenericPassword('ulamu-session', JSON.stringify(session), {service: SERVICE});
}

export async function loadSession(): Promise<AuthSession | null> {
  const creds = await Keychain.getGenericPassword({service: SERVICE});
  if (!creds) {
    return null;
  }
  try {
    const parsed = JSON.parse(creds.password) as Partial<AuthSession>;
    if (parsed && typeof parsed.sessionToken === 'string' && typeof parsed.accountId === 'string') {
      return parsed as AuthSession;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await Keychain.resetGenericPassword({service: SERVICE});
}
