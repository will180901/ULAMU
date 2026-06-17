/**
 * Configuration de l'app mobile.
 *
 * API_BASE_URL : l'adresse du backend ULAMU (apps/api). Résolue selon le type de build :
 *  - BUILD DE PRODUCTION (APK release distribué aux utilisateurs) → serveur hébergé en ligne (HTTPS).
 *  - BUILD DE DÉVELOPPEMENT (Metro, __DEV__===true) → 'http://localhost:3000' via `adb reverse tcp:3000 tcp:3000`.
 *    (Émulateur sans adb reverse : 'http://10.0.2.2:3000'. Wi-Fi : 'http://<IP_DU_PC>:3000'.)
 */
export const PROD_API_BASE_URL = 'https://ulamu-api.onrender.com';
// Pendant le dev (Fast Refresh), on pointe aussi vers le serveur EN LIGNE (aucun backend local lancé).
// Mets USE_LOCAL_API=true seulement si tu démarres l'API en local (localhost:3000 + `adb reverse tcp:3000 tcp:3000`).
const USE_LOCAL_API = false;
export const API_BASE_URL = __DEV__ && USE_LOCAL_API ? 'http://localhost:3000' : PROD_API_BASE_URL;

/**
 * OTA (#12) : adresse du manifeste de mise à jour JS, servi par le serveur en ligne.
 * L'app (en RELEASE) le consulte au démarrage ; si une version plus récente existe, elle télécharge
 * le nouveau bundle JS et l'applique au prochain lancement — sans réinstaller l'APK (changements JS only).
 */
export const OTA_MANIFEST_URL = `${PROD_API_BASE_URL}/ota/android/manifest`;

/** Ce client est « mobile » (D-012 : mobile = patients). */
export const CLIENT_KIND = 'mobile' as const;

/**
 * Numéro composé par le bouton Urgence (M15). Ouvre le clavier d'appel natif (`tel:`),
 * l'utilisateur valide lui-même l'appel — on ne déclenche jamais d'appel automatiquement.
 * Par défaut « 112 » : numéro d'urgence GSM universel qui route vers les secours locaux
 * sur la plupart des réseaux. À remplacer par le numéro du service de garde ULAMU une fois fourni.
 */
export const EMERGENCY_NUMBER = '112';
