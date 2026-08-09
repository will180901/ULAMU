/**
 * Supervision financière — M13, sous-rôle ADMIN_FINANCE.
 *
 * La règle centrale testée ici est **RM-13-06, la double validation** : au-delà du seuil PM-35, un
 * remboursement exige un second administrateur **différent du demandeur**. Le serveur le refuse déjà,
 * mais l'écran doit l'annoncer AVANT le clic — découvrir l'interdiction par une erreur rouge après
 * coup ressemble à une panne, et pousse à réessayer.
 *
 * Le montant est aussi vérifié : c'est ce qui manquait structurellement tant qu'aucune route ne
 * listait les demandes. Décider d'un remboursement sans voir la somme n'a pas de sens.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FinancePage } from '@/modules/admin/pages/FinancePage'
import { api, type MeResponse, type RefundRequest } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const MOI: MeResponse = {
  accountId: 'admin-1',
  accountType: 'ADMIN',
  adminRole: 'ADMIN_FINANCE',
  username: 'finance.demo',
  phone: '+242060000099',
  firstName: 'Sylvie',
  lastName: 'Mabiala',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const MIENNE: RefundRequest = {
  requestId: 'r-mienne',
  paymentId: 'p1',
  reason: 'Session jamais honorée',
  status: 'PENDING_SECOND_APPROVAL',
  requestedBy: 'admin-1', // c'est moi
  approvedBy: null,
  createdAt: '2026-08-05T09:00:00.000Z',
  decidedAt: null,
  amountXaf: 25000,
  payerId: 'pat-1',
}

const AUTRE: RefundRequest = {
  ...MIENNE,
  requestId: 'r-autre',
  requestedBy: 'admin-2', // quelqu'un d'autre
  reason: 'Double débit constaté',
  amountXaf: 40000,
}

function monter() {
  useSessionStore.getState().setSession('jeton', MOI)
  return render(
    <MemoryRouter>
      <FinancePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'adminRefunds').mockResolvedValue([MIENNE, AUTRE])
})

describe('supervision financière (RM-13-06)', () => {
  it('empêche d’approuver sa PROPRE demande, et dit pourquoi', async () => {
    monter()
    const ligne = (await screen.findByText(/Session jamais honorée/)).closest('li') as HTMLElement

    expect(within(ligne).getByRole('button', { name: /Approuver/i })).toBeDisabled()
    // L'explication AVANT le clic, pas une erreur serveur après coup.
    expect(ligne.textContent).toMatch(/autre administrateur/i)
  })

  it('autorise l’approbation d’une demande formulée par quelqu’un d’autre', async () => {
    const u = userEvent.setup({ delay: null })
    const approuver = vi.spyOn(api, 'approveRefund').mockResolvedValue({})
    monter()
    const ligne = (await screen.findByText(/Double débit constaté/)).closest('li') as HTMLElement

    const bouton = within(ligne).getByRole('button', { name: /Approuver/i })
    expect(bouton).toBeEnabled()
    await u.click(bouton)
    expect(approuver).toHaveBeenCalledWith('r-autre')
  })

  it('affiche le montant de chaque demande — décider sans le voir n’a pas de sens', async () => {
    monter()
    await waitFor(() => expect(screen.getByText(/25\s*000\s*XAF/)).toBeInTheDocument())
    expect(screen.getByText(/40\s*000\s*XAF/)).toBeInTheDocument()
  })

  it('rappelle la règle des deux administrateurs', async () => {
    monter()
    const titre = await screen.findByRole('heading', { name: /Remboursements à trancher/i })
    const section = titre.closest('section') as HTMLElement
    expect(section.textContent).toMatch(/deux administrateurs différents/i)
  })
})
