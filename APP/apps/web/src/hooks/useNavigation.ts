/**
 * Navigation filtrée par capacité — un groupe vide disparaît entièrement, intitulé compris.
 *
 * Le filtrage n'est PAS une mesure de sécurité : le serveur vérifie le sous-rôle à chaque requête
 * (EF-02-02). Il évite seulement d'afficher des portes qui ne s'ouvriraient pas.
 */
import { useMemo } from 'react'
import { NAV_GROUPS, type NavGroup } from '@/config/navigation.config'
import { useCapabilities } from '@/hooks/useCapabilities'

export function useNavigation(): NavGroup[] {
  const { hasAny } = useCapabilities()

  return useMemo(
    () =>
      NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => hasAny(...i.capabilities)) })).filter(
        (g) => g.items.length > 0,
      ),
    [hasAny],
  )
}
