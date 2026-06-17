/**
 * Notifications LOCALES de rappel de médicament (notifee) — programmées sur l'appareil, sans serveur
 * ni Firebase. Chaque rappel actif planifie une notification quotidienne à chacune de ses heures.
 * Le push SERVEUR (FCM, app fermée) viendra plus tard avec le projet Firebase de l'utilisateur.
 */
import notifee, {AndroidImportance, AuthorizationStatus, RepeatFrequency, TriggerType} from '@notifee/react-native';
import {Reminder} from '../lib/contracts';

const CHANNEL_ID = 'reminders';

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Rappels de médicaments',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
}

async function isGranted(): Promise<boolean> {
  const s = await notifee.getNotificationSettings();
  return s.authorizationStatus === AuthorizationStatus.AUTHORIZED || s.authorizationStatus === AuthorizationStatus.PROVISIONAL;
}

/** Demande l'autorisation de notifier (à appeler dans un contexte clair, ex. écran Rappels). */
export async function requestNotificationPermission(): Promise<boolean> {
  const s = await notifee.requestPermission();
  await ensureChannel();
  return s.authorizationStatus === AuthorizationStatus.AUTHORIZED || s.authorizationStatus === AuthorizationStatus.PROVISIONAL;
}

/** Prochaine occurrence (timestamp ms) d'une heure "HH:MM" : aujourd'hui si à venir, sinon demain. */
function nextOccurrence(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const t = new Date();
  t.setHours(h || 0, m || 0, 0, 0);
  if (t.getTime() <= now.getTime()) {
    t.setDate(t.getDate() + 1);
  }
  return t.getTime();
}

/**
 * Reprogramme TOUTES les notifications de rappel à partir de la liste donnée (annule puis recrée).
 * Ne demande PAS l'autorisation ; ne planifie que si déjà autorisé (sinon no-op silencieux).
 */
export async function syncReminderNotifications(reminders: Reminder[]): Promise<void> {
  try {
    await ensureChannel();
    if (!(await isGranted())) {
      return;
    }
    await notifee.cancelTriggerNotifications();
    for (const r of reminders) {
      if (!r.active) {
        continue;
      }
      for (const time of r.times) {
        if (!/^\d{2}:\d{2}$/.test(time)) {
          continue;
        }
        await notifee.createTriggerNotification(
          {
            id: `rem-${r.id}-${time.replace(':', '')}`,
            title: '💊 Rappel de médicament',
            body: `${r.medicationName}${r.dosage ? ' · ' + r.dosage : ''} — c'est l'heure (${time}).`,
            android: {channelId: CHANNEL_ID, smallIcon: 'ic_launcher', pressAction: {id: 'default'}},
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: nextOccurrence(time),
            repeatFrequency: RepeatFrequency.DAILY,
            alarmManager: {allowWhileIdle: true},
          },
        );
      }
    }
  } catch {
    // notifee absent (vieux build) ou erreur de planification : on n'interrompt jamais l'app.
  }
}
