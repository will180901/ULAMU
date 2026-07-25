import { useMemo } from 'react'
import { NAV_GROUPS, type NavGroup } from '@/config/navigation.config'
import { useCapabilities } from './useCapabilities'

export function useNavigation(): NavGroup[] {
  const { hasAny } = useCapabilities()
  return useMemo(
    () =>
      NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => hasAny(...item.capabilities)) })).filter(
        (group) => group.items.length > 0,
      ),
    [hasAny],
  )
}
