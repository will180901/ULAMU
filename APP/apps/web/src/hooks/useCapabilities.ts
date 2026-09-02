/**
 * Modèle d'autorisation ULAMU — reproduit le PATTERN de CMS-SARIS (garde déclarative par route +
 * navigation filtrée par capacité), adapté au modèle RÉEL d'ULAMU : accountType + sous-rôle
 * AdminRole. Pas de système de 116 permissions fines comme SARIS — inutile ici.
 *
 * ULAMU a **trois acteurs**, et cette application web n'en sert que deux : le SOIGNANT et
 * l'ADMINISTRATION. Le PATIENT vit sur mobile (D-039/D-044). Le membre de structure, quatrième type
 * hérité du modèle initial, a été **retiré du produit le 02/09/2026** : il n'avait aucune entrée de
 * navigation, donc aucun écran — voir le chantier 25 au §10 du plan.
 */
import { useMemo } from 'react'
import { useSessionStore } from '@/state/session.store'

export type Capability =
  | 'professional'
  | 'admin'
  | 'admin:super'
  | 'admin:finance'
  | 'admin:verification'
  | 'admin:map'

export function useCapabilities() {
  const me = useSessionStore((s) => s.me)

  const set = useMemo(() => {
    const caps = new Set<Capability>()
    if (!me) return caps
    if (me.accountType === 'PROFESSIONAL') caps.add('professional')
    if (me.accountType === 'ADMIN') {
      caps.add('admin')
      if (me.adminRole === 'SUPER_ADMIN') caps.add('admin:super')
      if (me.adminRole === 'ADMIN_FINANCE') caps.add('admin:finance')
      if (me.adminRole === 'ADMIN_VERIFICATION') caps.add('admin:verification')
      if (me.adminRole === 'ADMIN_MAP') caps.add('admin:map')
    }
    return caps
  }, [me])

  // L'objet renvoyé est MÉMOÏSÉ sur l'ensemble des capacités. Sans cela il était recréé à chaque
  // rendu, et le `useMemo` de `useNavigation` — dont la dépendance est `hasAny` — ne retenait donc
  // jamais rien : la navigation entière était refiltrée à chaque frappe au clavier.
  return useMemo(
    () => ({
      has: (cap: Capability) => set.has(cap),
      hasAny: (...caps: Capability[]) => caps.some((c) => set.has(c)),
    }),
    [set],
  )
}
