/**
 * Service média mobile — photo de profil + médias de consultation, via react-native-image-picker.
 * Le client encode en base64 et envoie au backend (StorageService) ; les URLs de lecture pointent
 * vers MediaController (avatars publics ; médias de session authentifiés + vérifiés participant).
 */
import {PermissionsAndroid, Platform} from 'react-native';
import {Asset, ImageLibraryOptions, launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {API_BASE_URL} from '../config';
import {MeResponse, MEDIA_ROUTES} from '../lib/contracts';
import {dialogs} from '../components/Dialog';
import {api} from './api';

/** Demande la permission caméra à l'exécution (Android). Requis par image-picker quand CAMERA est au manifeste. */
async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Caméra',
      message: 'ULAMU a besoin de la caméra pour prendre votre photo.',
      buttonPositive: 'Autoriser',
      buttonNegative: 'Refuser',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/** URL absolue de la photo de profil (route publique). */
export function avatarUrl(key: string | null | undefined): string | null {
  return key ? `${API_BASE_URL}${MEDIA_ROUTES.avatar(key)}` : null;
}

/** URL absolue d'un média de consultation (route authentifiée — fournir le header Authorization). */
export function sessionMediaUrl(key: string | null | undefined): string | null {
  return key ? `${API_BASE_URL}${MEDIA_ROUTES.sessionMedia(key)}` : null;
}

type AvatarMime = 'image/jpeg' | 'image/png' | 'image/webp';

const AVATAR_OPTS: ImageLibraryOptions = {mediaType: 'photo', includeBase64: true, maxWidth: 640, maxHeight: 640, quality: 0.8};

function mimeOf(asset: Asset): AvatarMime {
  const t = (asset.type || '').toLowerCase();
  if (t.includes('png')) return 'image/png';
  if (t.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

/** Photo de profil : galerie ou caméra → upload → renvoie le profil mis à jour (null si annulé/échec). */
export async function pickAndUploadAvatar(source: 'library' | 'camera'): Promise<MeResponse | null> {
  if (source === 'camera' && !(await ensureCameraPermission())) {
    dialogs.alert({title: 'Caméra', message: 'Autorisation caméra refusée. Activez-la dans les réglages, ou choisissez une photo dans la galerie.'});
    return null;
  }
  const res =
    source === 'camera'
      ? await launchCamera({...AVATAR_OPTS, saveToPhotos: false})
      : await launchImageLibrary(AVATAR_OPTS);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    dialogs.alert({title: 'Photo de profil', message: res.errorMessage || "Impossible d'accéder à l'image (autorisation refusée ?)."});
    return null;
  }
  const asset = res.assets?.[0];
  if (!asset?.base64) {
    dialogs.alert({title: 'Photo de profil', message: 'Image illisible — réessayez avec une autre photo.'});
    return null;
  }
  try {
    return await api.setAvatar({imageBase64: asset.base64, mime: mimeOf(asset)});
  } catch {
    dialogs.alert({title: 'Photo de profil', message: "L'envoi a échoué — vérifiez votre connexion et réessayez."});
    return null;
  }
}

/** Photo dans une consultation : galerie → upload → renvoie le fileKey (null si annulé/échec). */
export async function pickAndUploadSessionImage(sessionId: string): Promise<string | null> {
  const res = await launchImageLibrary({mediaType: 'photo', includeBase64: true, maxWidth: 1280, maxHeight: 1280, quality: 0.7});
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    dialogs.alert({title: 'Photo', message: res.errorMessage || "Impossible d'accéder à l'image."});
    return null;
  }
  const asset = res.assets?.[0];
  if (!asset?.base64) {
    return null;
  }
  const up = await api.uploadSessionMedia(sessionId, {fileBase64: asset.base64, mime: mimeOf(asset)});
  return up.fileKey;
}

export interface PickedImage {
  uri: string;
  base64: string;
  mime: string;
}

/** Choisit une photo SANS l'envoyer (pour l'aperçu avant envoi). null si annulé. */
export async function pickSessionImageAsset(): Promise<PickedImage | null> {
  const res = await launchImageLibrary({mediaType: 'photo', includeBase64: true, maxWidth: 1280, maxHeight: 1280, quality: 0.7});
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    dialogs.alert({title: 'Photo', message: res.errorMessage || "Impossible d'accéder à l'image."});
    return null;
  }
  const a = res.assets?.[0];
  if (!a?.base64 || !a.uri) {
    return null;
  }
  return {uri: a.uri, base64: a.base64, mime: mimeOf(a)};
}

/** Choisit 1..N photos (album) SANS les envoyer — pour l'aperçu groupé. [] si annulé. */
export async function pickSessionImageAssets(limit = 10): Promise<PickedImage[]> {
  const res = await launchImageLibrary({
    mediaType: 'photo',
    includeBase64: true,
    selectionLimit: limit,
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.7,
  });
  if (res.didCancel) {
    return [];
  }
  if (res.errorCode) {
    dialogs.alert({title: 'Photos', message: res.errorMessage || "Impossible d'accéder aux images."});
    return [];
  }
  return (res.assets ?? [])
    .filter(a => a.base64 && a.uri)
    .map(a => ({uri: a.uri as string, base64: a.base64 as string, mime: mimeOf(a)}));
}
