/**
 * Administrateurs & sous-rôles — M02, EF-02-08 / CU-02-06.
 *
 * Deux règles réelles sont verrouillées, et la première protège la plateforme entière :
 *
 *  • **On ne révoque pas son propre rôle.** Si le dernier Super administrateur se retire ses droits,
 *    plus personne ne peut en attribuer : la plateforme devient inadministrable, et seule une
 *    intervention en base la débloque. Le serveur refuse déjà ; l'écran doit le dire AVANT le clic,
 *    sinon l'utilisateur croit à une panne et réessaie.
 *  • **Un compte d'administration sans sous-rôle reste visible.** Il n'accède à rien, c'est
 *    précisément celui qui attend une décision — le masquer le rendrait introuvable.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdministrateursPage } from '@/modules/admin/pages/AdministrateursPage'
import { api, type MeResponse, type PlatformAdmin } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const MOI: MeResponse = {
  accountId: 'super-1',
  accountType: 'ADMIN',
  adminRole: 'SUPER_ADMIN',
  username: 'super.admin',
  phone: '+242060000001',
  firstName: 'Deo',
  lastName: 'Bouwayic',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const LISTE: PlatformAdmin[] = [
  {
    accountId: 'super-1', // c'est moi
    username: 'super.admin',
    firstName: 'Deo',
    lastName: 'Bouwayic',
    phone: '+242060000001',
    role: 'SUPER_ADMIN',
    assignedBy: 'seed',
    assignedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    accountId: 'fin-1',
    username: 'finance.demo',
    firstName: 'Sylvie',
    lastName: 'Mabiala',
    phone: '+242060000099',
    role: 'ADMIN_FINANCE',
    assignedBy: 'super-1',
    assignedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    accountId: 'sans-1',
    username: 'nouveau.admin',
    firstName: 'Jean',
    lastName: 'Ondze',
    phone: '+242060000077',
    role: null, // attend une décision
    assignedBy: null,
    assignedAt: null,
  },
]

function monter() {
  useSessionStore.getState().setSession('jeton', MOI)
  return render(
    <MemoryRouter>
      <AdministrateursPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'admins').mockResolvedValue(LISTE)
})

describe('administrateurs (EF-02-08)', () => {
  it('interdit de révoquer SON PROPRE rôle, et explique la conséquence', async () => {
    monter()
    const ligne = (await screen.findByText('Deo Bouwayic')).closest('li') as HTMLElement

    expect(within(ligne).getByRole('button', { name: /Révoquer/i })).toBeDisabled()
    // La raison AVANT le clic : sans elle, un bouton grisé passe pour un bogue.
    expect(ligne.textContent).toMatch(/plus personne ne pourrait en attribuer/i)
  })

  it('autorise la révocation d’un AUTRE administrateur', async () => {
    const u = userEvent.setup({ delay: null })
    const revoquer = vi.spyOn(api, 'revokeAdminRole').mockResolvedValue(undefined)
    monter()
    const ligne = (await screen.findByText('Sylvie Mabiala')).closest('li') as HTMLElement

    const bouton = within(ligne).getByRole('button', { name: /Révoquer/i })
    expect(bouton).toBeEnabled()
    await u.click(bouton)
    expect(revoquer).toHaveBeenCalledWith('fin-1')
  })

  it('affiche les comptes SANS sous-rôle — ce sont ceux qui attendent une décision', async () => {
    monter()
    const ligne = (await screen.findByText('Jean Ondze')).closest('li') as HTMLElement
    expect(within(ligne).getByText(/Sans rôle/i)).toBeInTheDocument()
    // Pas de bouton Révoquer : il n'y a rien à retirer.
    expect(within(ligne).queryByRole('button', { name: /Révoquer/i })).not.toBeInTheDocument()
  })

  it('attribue un sous-rôle en un geste', async () => {
    const u = userEvent.setup({ delay: null })
    const attribuer = vi.spyOn(api, 'assignAdminRole').mockResolvedValue({ accountId: 'sans-1', role: 'ADMIN_VERIFICATION' })
    monter()
    const ligne = (await screen.findByText('Jean Ondze')).closest('li') as HTMLElement

    await u.click(within(ligne).getByRole('button', { name: /^Vérification$/i }))
    expect(attribuer).toHaveBeenCalledWith('sans-1', 'ADMIN_VERIFICATION')
  })

  it('avertit que la révocation coupe les sessions immédiatement', async () => {
    monter()
    await waitFor(() => expect(screen.getByText(/coupe les sessions/i)).toBeInTheDocument())
    expect(screen.getByText(/dans la minute/i)).toBeInTheDocument()
  })
})
