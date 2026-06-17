/**
 * Persistance « onboarding vu » — l'écran Bienvenue (proposition de valeur) ne s'affiche
 * qu'au premier lancement. En cas d'erreur de stockage, on considère vu (ne pas re-bloquer).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ulamu-onboarded';

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true;
  }
}

export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* best-effort */
  }
}
