/**
 * Le test le plus important de la coquille : **un rôle ne doit jamais voir l'espace d'un autre**.
 *
 * Ce n'est pas de la sécurité — celle-ci est au serveur, vérifiée à chaque requête (`EF-02-02`, règle
 * non négociable). C'est une question de confidentialité de structure : montrer « File de
 * vérification » à un pharmacien lui apprend qu'un back-office existe, et l'invite à en chercher
 * l'adresse. La palette de commandes hérite du même filtre, pour la même raison.
 */
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useNavigation } from '@/hooks/useNavigation'
import { useSessionStore } from '@/state/session.store'
import { NAV_GROUPS, type NavGroup } from '@/config/navigation.config'
import type { MeResponse } from '@/lib/api'

function connectAs(accountType: MeResponse['accountType'], adminRole: MeResponse['adminRole'] = null) {
  const me: MeResponse = {
    accountId: 'a1',
    accountType,
    adminRole,
    username: 'test.user',
    phone: '+242060000000',
    firstName: 'Test',
    lastName: 'User',
    district: null,
    category: null,
    specialty: null,
    biography: null,
    totpEnabled: true,
  }
  useSessionStore.getState().setSession('jeton-de-test', me)
}

const labelsOf = (groups: NavGroup[]) => groups.flatMap((g) => g.items.map((i) => i.label))

describe('navigation filtrée par capacité', () => {
  it('ne montre rien à un visiteur non connecté', () => {
    useSessionStore.getState().logout()
    const { result } = renderHook(() => useNavigation())
    expect(labelsOf(result.current)).toEqual([])
  })

  it.each([
    ['PROFESSIONAL' as const, null],
    ['FACILITY_MEMBER' as const, null],
    ['ADMIN' as const, 'SUPER_ADMIN' as const],
  ])('ne montre à %s que des destinations dont il porte la capacité', (accountType, adminRole) => {
    connectAs(accountType, adminRole)
    const { result } = renderHook(() => useNavigation())

    const visibles = result.current.flatMap((g) => g.items)
    expect(visibles.length).toBeGreaterThan(0)

    // Chaque item visible doit exiger au moins une capacité que ce compte possède réellement.
    const attendues: Record<string, string[]> = {
      PROFESSIONAL: ['professional'],
      FACILITY_MEMBER: ['facility'],
      ADMIN: ['admin', 'admin:super'],
    }
    for (const item of visibles) {
      expect(
        item.capabilities.some((c) => attendues[accountType].includes(c)),
        `« ${item.label} » est visible pour ${accountType} sans capacité correspondante`,
      ).toBe(true)
    }
  })

  it('ne laisse jamais un groupe vide s’afficher', () => {
    connectAs('FACILITY_MEMBER')
    const { result } = renderHook(() => useNavigation())
    for (const group of result.current) {
      expect(group.items.length).toBeGreaterThan(0)
    }
  })

  it('garde la configuration de navigation intègre : pas d’item sans capacité déclarée', () => {
    // Un item sans capacité serait visible de TOUS les rôles — c'est exactement le genre d'oubli
    // qu'on fait en ajoutant une entrée à la hâte. Le test le refuse par avance.
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        expect(item.capabilities.length, `« ${item.label} » ne déclare aucune capacité`).toBeGreaterThan(0)
        expect(item.href.startsWith('/'), `« ${item.label} » a une adresse invalide`).toBe(true)
      }
    }
  })

  it('n’a aucune clé d’item en double', () => {
    const keys = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key))
    expect(new Set(keys).size).toBe(keys.length)
  })
})
