/**
 * Garde-fou d'abandon — confirme avant de quitter un formulaire d'authentification déjà entamé.
 *
 * Les trois façons de fermer le tiroir (bouton retour matériel, appui hors du tiroir, glissement vers
 * le bas) sont faciles à déclencher sans le vouloir. Sans garde-fou, elles effacent une saisie en cours
 * en silence — et sur les écrans à code, elles rendent inutilisable un code déjà envoyé par email, qui
 * compte dans le quota horaire de l'utilisateur (PM-19).
 *
 * Regroupé ici, et pas recopié dans chaque écran : la protection n'existait au départ que sur
 * l'inscription, alors que « mot de passe oublié » et « code de connexion » ont exactement le même
 * geste et la même perte. Trois copies auraient fini par diverger — un écran oublié, une formulation
 * différente, une définition de « déjà entamé » qui ne veut plus dire la même chose.
 */
import {useCallback} from 'react';
import {useDialog} from '../components/Dialog';

export function useAbandonGuard({
  dirty,
  title,
  message,
  onLeave,
}: {
  /** Y a-t-il quelque chose à perdre ? Sur un formulaire resté vierge, on ne retient personne. */
  dirty: boolean;
  title: string;
  message: string;
  onLeave: () => void;
}): () => Promise<void> {
  const {confirm} = useDialog();
  return useCallback(async () => {
    if (dirty) {
      // « Continuer » plutôt que « Annuler » : le mot « Annuler » est ambigu ici — on ne sait plus s'il
      // annule l'abandon ou l'inscription elle-même.
      const ok = await confirm({title, message, confirmLabel: 'Abandonner', cancelLabel: 'Continuer', danger: true});
      if (!ok) {
        return;
      }
    }
    onLeave();
  }, [dirty, title, message, onLeave, confirm]);
}
