/**
 * Notes vocales (adaptation RN de la messagerie SARIS §5.5/§9.7) — ENREGISTREMENT avec niveau
 * d'amplitude (metering) pour l'onde temps réel. La LECTURE (avec vitesse variable 1×/1,5×/2×,
 * seek, position) est assurée par react-native-video dans VoiceNotePlayer — voir ce composant.
 * Limite RN assumée : l'onde du lecteur est approximée (pas de Web Audio API pour décoder les pics).
 */
import {PermissionsAndroid, Platform} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const arp = new AudioRecorderPlayer();
arp.setSubscriptionDuration(0.08); // ~80 ms : cadence des barres d'onde

/** Demande la permission micro à l'exécution (Android) — RECORD_AUDIO est au manifeste mais n'était jamais demandé en JS. */
async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Microphone',
      message: 'ULAMU a besoin du microphone pour enregistrer une note vocale.',
      buttonPositive: 'Autoriser',
      buttonNegative: 'Refuser',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ── Enregistrement ───────────────────────────────────────────────────────────
/** Démarre l'enregistrement ; onTick(secondes, niveau 0..1) à chaque ~80 ms (metering). */
export async function startRecording(onTick: (sec: number, level: number) => void): Promise<void> {
  const granted = await ensureMicPermission();
  if (!granted) {
    throw new Error('Permission microphone refusée');
  }
  await arp.startRecorder(undefined, undefined, true); // meteringEnabled = true
  arp.addRecordBackListener(e => {
    const sec = Math.floor((e.currentPosition || 0) / 1000);
    const db = typeof e.currentMetering === 'number' ? e.currentMetering : -60;
    const level = Math.max(0, Math.min(1, (db + 60) / 60)); // dB (~-60..0) → 0..1
    onTick(sec, level);
  });
}
export async function stopRecording(): Promise<string | null> {
  const uri = await arp.stopRecorder();
  arp.removeRecordBackListener();
  return uri || null;
}
export async function cancelRecording(): Promise<void> {
  try {
    await arp.stopRecorder();
  } catch {
    /* déjà arrêté */
  }
  arp.removeRecordBackListener();
}

// ── Fichier → base64 (sans lib FS) pour l'upload ─────────────────────────────
export async function fileToBase64(uri: string): Promise<string> {
  const full = uri.startsWith('file') || uri.startsWith('content') || uri.startsWith('http') ? uri : `file://${uri}`;
  const resp = await fetch(full);
  const blob = await resp.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
