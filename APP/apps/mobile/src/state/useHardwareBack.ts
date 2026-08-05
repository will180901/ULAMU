/**
 * Branche le bouton retour MATÉRIEL d'Android sur un gestionnaire, tant que l'écran est au premier plan.
 *
 * Sans ça, Android applique son comportement par défaut — dépiler l'écran — qui court-circuite tout ce
 * que l'écran voulait faire : reculer d'une étape plutôt que sortir, ou demander confirmation avant
 * d'abandonner une saisie. On se retrouvait avec deux « retours » aux effets différents sur le même
 * écran : la flèche du bandeau et le bouton du téléphone.
 *
 * Deux précautions que ce regroupement évite de réécrire (et d'oublier) à chaque écran :
 *  • l'abonnement est LIÉ AU FOCUS, pas au montage — un écran resté monté sous un autre continuerait
 *    sinon d'intercepter le bouton retour de l'écran affiché par-dessus ;
 *  • le gestionnaire est lu PAR RÉFÉRENCE — les écrans passent une fonction recréée à chaque rendu, on
 *    se réabonnerait donc en boucle pour rien.
 *
 * `AuthPage` porte déjà la même mécanique pour toute la pile d'authentification ; ce hook est son
 * équivalent pour les écrans qui n'ont pas de coquille commune.
 */
import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useRef} from 'react';
import {BackHandler} from 'react-native';

export function useHardwareBack(onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBackRef.current();
        return true; // l'écran décide seul de ce que « retour » veut dire
      });
      return () => sub.remove();
    }, []),
  );
}
