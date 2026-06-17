/**
 * Hook partagé pour changer la photo de profil depuis n'importe où (Modifier le profil, visionneuse…).
 * Ouvre la modale ULAMU de choix de source, téléverse, et met à jour le profil GLOBAL (setMe) →
 * la nouvelle photo apparaît instantanément partout. DRY : une seule logique pour tous les écrans.
 */
import {useCallback, useState} from 'react';
import {useMe} from './MeContext';
import {useDialog} from '../components/Dialog';
import {pickAndUploadAvatar} from '../services/media';
import {api} from '../services/api';

export function useAvatarPicker(): {change: (hasPhoto: boolean) => Promise<void>; busy: boolean} {
  const {setMe} = useMe();
  const {actionSheet, alert} = useDialog();
  const [busy, setBusy] = useState(false);

  const change = useCallback(
    async (hasPhoto: boolean) => {
      const choice = await actionSheet({
        title: 'Photo de profil',
        message: 'Choisissez une source',
        actions: [
          {label: 'Galerie', value: 'library', icon: 'image'},
          {label: 'Appareil photo', value: 'camera', icon: 'user'},
          ...(hasPhoto ? [{label: 'Retirer la photo', value: 'remove', icon: 'trash' as const, danger: true}] : []),
        ],
      });
      if (choice === 'library' || choice === 'camera') {
        setBusy(true);
        const me = await pickAndUploadAvatar(choice);
        if (me) {
          setMe(me);
        }
        setBusy(false);
      } else if (choice === 'remove') {
        setBusy(true);
        try {
          setMe(await api.removeAvatar());
        } catch {
          alert({title: 'Photo de profil', message: 'Suppression impossible — réessayez.'});
        }
        setBusy(false);
      }
    },
    [actionSheet, alert, setMe],
  );

  return {change, busy};
}
