/**
 * Où l'application ouvre après la connexion.
 *
 * La préférence de B3 doit AGIR, sinon c'est un réglage décoratif — le genre de détail qui fait
 * douter de tout le reste. Elle est donc lue ici, à l'unique endroit où la redirection se décide.
 *
 * Deux garde-fous :
 *  • une cible qui n'existe plus dans la navigation retombe sur le tableau de bord ;
 *  • une cible que le rôle actuel n'a plus le droit de voir aussi. Un soignant promu administrateur
 *    garderait sinon « Mes gains » en page d'accueil et serait redirigé à chaque connexion.
 */
import { NAV_GROUPS } from '@/config/navigation.config'
import { useCapabilities } from '@/hooks/useCapabilities'
import { usePreferencesStore } from '@/state/preferences.store'

export const ACCUEIL_PAR_DEFAUT = '/dashboard'

export function usePageAccueil(): string {
  const choix = usePreferencesStore((s) => s.pageAccueil)
  const capacites = useCapabilities()

  if (choix === 'auto') return ACCUEIL_PAR_DEFAUT
  const cible = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === choix)
  if (!cible || !capacites.hasAny(...cible.capabilities)) return ACCUEIL_PAR_DEFAUT
  return cible.href
}
