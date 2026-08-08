/**
 * Mes gains — M13, EF-13-06 / EF-13-07.
 *
 * Trois règles, chacune protégeant la confiance d'un soignant envers l'argent qu'il a gagné :
 *
 *  1. **Disponible et en attente ne se confondent jamais** (EF-13-06). Les additionner donnerait un
 *     solde flatteur mais faux, et un retrait supérieur à ce qui peut réellement partir.
 *  2. **Les frais sont annoncés AVANT la confirmation** (EF-13-07). Un net découvert après coup est
 *     la meilleure façon de perdre quelqu'un sur son premier virement.
 *  3. **Mot de passe ET code.** L'argent qui sort d'un compte ne part pas d'un clic.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GainsPage } from '@/modules/earnings/pages/GainsPage'
import { api, type Earnings, type MeResponse, type WithdrawalQuote } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const ME: MeResponse = {
  accountId: 'p1',
  accountType: 'PROFESSIONAL',
  adminRole: null,
  username: 'dr.konate',
  phone: '+242060000010',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: null,
  category: 'GENERAL_PRACTITIONER',
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const GAINS: Earnings = {
  holderType: 'PROFESSIONAL',
  holderId: 'p1',
  availableXaf: 45000,
  pendingXaf: 12000,
  entries: [],
}

const DEVIS: WithdrawalQuote = {
  withdrawalId: 'w1',
  amountXaf: 20000,
  ulamuFeeXaf: 500,
  netToReceiveXaf: 19500,
  operator: 'MTN_MOMO',
  otpExpiresInSeconds: 300,
}

function monter() {
  useSessionStore.getState().setSession('jeton', ME)
  return render(
    <MemoryRouter>
      <GainsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'earnings').mockResolvedValue(GAINS)
})

describe('mes gains', () => {
  it('sépare le disponible de l’en-attente, sans jamais les additionner (EF-13-06)', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('45 000 XAF')).toBeInTheDocument())
    expect(screen.getByText('12 000 XAF')).toBeInTheDocument()
    // 57 000 ne doit apparaître nulle part : ce total n'existe pas.
    expect(screen.queryByText(/57 000/)).not.toBeInTheDocument()
  })

  it('refuse un retrait supérieur au solde disponible', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await waitFor(() => expect(screen.getByLabelText(/Montant à retirer/i)).toBeInTheDocument())

    await u.type(screen.getByLabelText(/Montant à retirer/i), '50000')
    expect(screen.getByRole('button', { name: /Continuer/i })).toBeDisabled()
    expect(screen.getByText(/Supérieur à votre solde disponible/i)).toBeInTheDocument()
  })

  it('annonce les frais AVANT de demander mot de passe et code (EF-13-07)', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue(DEVIS)
    monter()
    await waitFor(() => expect(screen.getByLabelText(/Montant à retirer/i)).toBeInTheDocument())

    await u.type(screen.getByLabelText(/Montant à retirer/i), '20000')
    await u.click(screen.getByRole('button', { name: /Continuer/i }))

    // Les trois chiffres doivent être visibles ensemble : demandé, frais, net réellement reçu.
    await waitFor(() => expect(screen.getByText(/Récapitulatif avant confirmation/i)).toBeInTheDocument())
    expect(screen.getByText('20 000 XAF')).toBeInTheDocument()
    expect(screen.getByText('500 XAF')).toBeInTheDocument()
    expect(screen.getByText('19 500 XAF')).toBeInTheDocument()
  })

  it('exige mot de passe ET code pour confirmer un retrait', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue(DEVIS)
    const confirmer = vi.spyOn(api, 'confirmWithdrawal').mockResolvedValue({ status: 'PENDING' })
    monter()
    await waitFor(() => expect(screen.getByLabelText(/Montant à retirer/i)).toBeInTheDocument())
    await u.type(screen.getByLabelText(/Montant à retirer/i), '20000')
    await u.click(screen.getByRole('button', { name: /Continuer/i }))
    await waitFor(() => expect(screen.getByLabelText(/Votre mot de passe/i)).toBeInTheDocument())

    const bouton = screen.getByRole('button', { name: /Confirmer le retrait/i })
    expect(bouton).toBeDisabled()

    await u.type(screen.getByLabelText(/Votre mot de passe/i), 'motdepasse1')
    expect(bouton).toBeDisabled() // le mot de passe seul ne suffit pas

    await u.type(screen.getByLabelText(/Code reçu/i), '123456')
    expect(bouton).toBeEnabled()

    await u.click(bouton)
    expect(confirmer).toHaveBeenCalledWith({ withdrawalId: 'w1', password: 'motdepasse1', otpCode: '123456' })
  })
})
