/**
 * Expiration par inactivité — ENF-07 / CU-01-03.
 *
 * Le serveur reste seul juge : il refuse toute requête dont la session dort depuis plus de
 * `WEB_IDLE_SECONDS`. Le minuteur du navigateur ne protège pas les données — il protège l'ÉCRAN,
 * qui sinon continue d'afficher un dossier patient sur un poste d'officine laissé sans surveillance.
 *
 * D'où le dernier test, le plus important des trois : les deux horloges doivent afficher la même
 * durée. Si un jour quelqu'un change `WEB_IDLE_SECONDS` côté serveur sans toucher au client, l'écran
 * resterait allumé après la fermeture de la session — exactement le trou qu'on vient de boucher.
 *
 * ⚠️ **Ce test est tombé le 06/09/2026, et il avait raison.** Le chantier 53 a sorti la constante de
 * `auth.guard.ts` vers `session-expiry.ts`, pour que la garde qui REFUSE et la liste des appareils
 * qui MONTRE disent la même chose. Le test lisait encore l'ancien fichier : il ne trouvait plus la
 * valeur et le disait, au lieu de comparer dans le vide. Il suit désormais la constante.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render } from '@testing-library/react'
import { DELAI_INACTIVITE_MS, useIdleLogout } from '@/state/useIdleLogout'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const ME: MeResponse = {
  accountId: 'a1',
  accountType: 'PROFESSIONAL',
  adminRole: null,
  username: 'dr.nouveau',
  phone: '+242060000000',
  firstName: 'Ange',
  lastName: 'Makaya',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
  totpEnabledAt: '2026-03-12T10:00:00.000Z',
  email: 'pharma.demo@exemple.test',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: '2026-03-12T10:00:00.000Z',
}

function Sonde() {
  useIdleLogout(true)
  return null
}

beforeEach(() => {
  vi.useFakeTimers()
  useSessionStore.getState().setSession('jeton', ME)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('expiration par inactivité (ENF-07)', () => {
  it('vide la session après 30 minutes sans le moindre geste', () => {
    render(<Sonde />)
    expect(useSessionStore.getState().isAuthenticated).toBe(true)

    act(() => {
      vi.advanceTimersByTime(DELAI_INACTIVITE_MS + 1000)
    })

    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    // Le motif sert à EXPLIQUER l'écran de connexion : sans lui, la déconnexion passe pour un bogue.
    expect(useSessionStore.getState().motif).toBe('expiration')
  })

  it('repart de zéro au moindre geste — une longue lecture ne déconnecte pas', () => {
    render(<Sonde />)

    act(() => {
      vi.advanceTimersByTime(DELAI_INACTIVITE_MS - 5000)
      window.dispatchEvent(new Event('pointerdown'))
      vi.advanceTimersByTime(DELAI_INACTIVITE_MS - 5000)
    })

    // Presque une heure s'est écoulée, mais jamais 30 min d'affilée sans activité.
    expect(useSessionStore.getState().isAuthenticated).toBe(true)
  })

  it('affiche la MÊME durée que la garde serveur', () => {
    // La constante vit dans `session-expiry.ts` depuis le chantier 53 — voir l'en-tête.
    const regle = readFileSync(
      resolve(__dirname, '../../../api/src/common/auth/session-expiry.ts'),
      'utf8',
    )
    const m = regle.match(/WEB_IDLE_SECONDS\s*=\s*(\d+)\s*\*\s*(\d+)/)
    expect(m, 'WEB_IDLE_SECONDS introuvable dans session-expiry.ts').not.toBeNull()

    const secondesServeur = Number(m![1]) * Number(m![2])
    expect(DELAI_INACTIVITE_MS).toBe(secondesServeur * 1000)
  })
})
