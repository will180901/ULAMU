/**
 * OTA (#12) — mise à jour du bundle JS de l'app DISTRIBUÉE sans réinstaller l'APK.
 * Au démarrage (release Android uniquement), on consulte le manifeste servi par le serveur en ligne ;
 * si une version plus récente existe, on télécharge le nouveau bundle et on l'applique au prochain lancement.
 * Tout échoue SILENCIEUSEMENT (hors-ligne, serveur endormi…) → l'app garde son bundle actuel (jamais bloquée).
 * Ne couvre QUE le JS : un changement natif (lib, permission, icône) impose toujours de redistribuer l'APK.
 *
 * ⚠️ Les modules natifs (react-native-ota-hot-update, react-native-blob-util) sont chargés en LAZY require,
 * APRÈS le garde __DEV__ : ainsi le build de DEV (qui ne les contient pas) ne les évalue jamais → pas de crash.
 */
import {Platform} from 'react-native';
import {OTA_MANIFEST_URL} from '../config';

interface OtaManifest {
  version: number; // entier croissant ; 0 = aucune mise à jour publiée
  url: string; // URL absolue du bundle (zip) à télécharger
}

/** À appeler une fois au démarrage (non bloquant). Inerte en dev (Fast Refresh fait déjà le travail) et sur iOS. */
export async function checkForOtaUpdate(): Promise<void> {
  if (__DEV__ || Platform.OS !== 'android') {
    return;
  }
  try {
    const res = await fetch(OTA_MANIFEST_URL, {method: 'GET'});
    if (!res.ok) {
      return;
    }
    const manifest = (await res.json()) as Partial<OtaManifest>;
    if (typeof manifest?.version !== 'number' || !manifest.url) {
      return;
    }
    // Chargement natif différé (release uniquement) — voir l'avertissement en tête de fichier.
    const OtaHotUpdate = require('react-native-ota-hot-update').default;
    const ReactNativeBlobUtil = require('react-native-blob-util').default;
    const current: number = await OtaHotUpdate.getCurrentVersion();
    if (manifest.version <= current) {
      return; // déjà à jour
    }
    await OtaHotUpdate.downloadBundleUri(ReactNativeBlobUtil, manifest.url, manifest.version, {
      restartAfterInstall: false, // appliqué au PROCHAIN lancement (pas de redémarrage brutal en pleine session)
      updateFail: () => undefined,
    });
  } catch {
    // silencieux : pas de réseau, serveur endormi, manifeste absent… → on garde le bundle embarqué.
  }
}
