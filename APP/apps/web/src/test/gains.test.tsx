/**
 * C6 « Mes gains » — l'argent.
 *
 * Deux choses doivent être vraies sur cet écran, faute de quoi il détruit la confiance :
 *
 *  1. **Un solde en attente doit s'EXPLIQUER.** RM-06-04 : « gains crédités uniquement après dépôt
 *     du compte-rendu (qualité avant trésorerie) ». Un médecin qui voit de l'argent bloqué sans
 *     savoir pourquoi accuse la plateforme ; celui qui sait va écrire son compte-rendu.
 *  2. **Les frais sont annoncés AVANT confirmation** (EF-13-07). C'est tout le sens du retrait en
 *     deux temps : on ne confirme jamais un montant dont on ignore ce qui en sera retenu.
 *
 * Et l'écran ne doit pas promettre un « compte de versement » enregistré : il n'en existe aucun en
 * base. Le retrait part sur le TÉLÉPHONE DU COMPTE ULAMU (`actorAccount.phone`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GainsPage } from '@/modules/gains/pages/GainsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Earnings, type MeResponse } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'pro-1',
  accountType: 'PROFESSIONAL',
  username: 'dr.nouveau',
  phone: '+242069000110',
  firstName: 'Ange',
  lastName: 'Makaya',
  district: 'Bacongo',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecin généraliste',
  biography: null,
  adminRole: null,
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

function gains(over: Partial<Earnings> = {}): Earnings {
  return {
    holderType: 'PROFESSIONAL',
    holderId: 'pro-1',
    availableXaf: 45000,
    pendingXaf: 0,
    entries: [],
    withdrawals: [],
    ...over,
  }
}

async function monter(g: Earnings) {
  vi.spyOn(api, 'earnings').mockResolvedValue(g)
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GainsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Mes gains' })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C6 — les soldes', () => {
  it('un solde en attente EXPLIQUE pourquoi il est bloqué (RM-06-04)', async () => {
    await monter(gains({ pendingXaf: 12000 }))

    expect(await screen.findByText(/Consultations honorées, compte-rendu manquant/)).toBeInTheDocument()
    // Le lien de cause à effet, dit en clair : c'est ce qui transforme une frustration en action.
    expect(screen.getByText(/dès que vous déposez le compte-rendu/)).toBeInTheDocument()
  })

  it('sans attente, on n’affiche pas l’explication — un écran ne parle pas pour rien', async () => {
    await monter(gains({ pendingXaf: 0 }))
    await screen.findByText('Disponible au retrait')
    expect(screen.queryByText(/dès que vous déposez le compte-rendu/)).not.toBeInTheDocument()
  })

  it('le décompte du mois ne compte QUE les crédits du mois en cours', async () => {
    const maintenant = new Date()
    const ceMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 2).toISOString()
    const moisDernier = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 15).toISOString()

    await monter(
      gains({
        entries: [
          { id: 'a', type: 'CREDIT', amountXaf: 5000, reference: 'r1', createdAt: ceMois },
          { id: 'b', type: 'CREDIT', amountXaf: 3000, reference: 'r2', createdAt: ceMois },
          { id: 'c', type: 'CREDIT', amountXaf: 9000, reference: 'r3', createdAt: moisDernier },
          { id: 'd', type: 'WITHDRAWAL', amountXaf: -4000, reference: 'r4', createdAt: ceMois },
        ],
      }),
    )

    // 5 000 + 3 000 : ni le mois dernier, ni le retrait. C'est un calcul sur des dates réelles.
    const bloc = (await screen.findByText('Ce mois-ci')).closest('section') as HTMLElement
    expect(within(bloc).getByText(/8 000/)).toBeInTheDocument()
    expect(within(bloc).getByText(/2 consultations créditées/)).toBeInTheDocument()
  })
})

describe('C6 — le retrait en deux temps (EF-13-07)', () => {
  it('les frais sont annoncés AVANT toute confirmation', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startWithdrawal').mockResolvedValue({
      withdrawalId: 'w1',
      amountXaf: 20000,
      ulamuFeeXaf: 0,
      netToReceiveXaf: 20000,
      operator: 'MTN_MOMO',
      otpExpiresInSeconds: 300,
    })
    const confirmer = vi.spyOn(api, 'confirmWithdrawal').mockResolvedValue(undefined as never)
    await monter(gains())

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))

    await waitFor(() => expect(demarrer).toHaveBeenCalled())
    // Rien n'est encore parti : c'est un devis, pas un ordre.
    expect(confirmer).not.toHaveBeenCalled()
    expect(await screen.findByText('Vous recevrez')).toBeInTheDocument()
    expect(screen.getByText('Frais ULAMU')).toBeInTheDocument()
  })

  it('la confirmation exige mot de passe ET code — la session ouverte ne suffit pas', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue({
      withdrawalId: 'w1',
      amountXaf: 20000,
      ulamuFeeXaf: 0,
      netToReceiveXaf: 20000,
      operator: 'MTN_MOMO',
      otpExpiresInSeconds: 300,
    })
    const confirmer = vi.spyOn(api, 'confirmWithdrawal').mockResolvedValue(undefined as never)
    await monter(gains())

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))
    await screen.findByText('Vous recevrez')

    const bouton = screen.getByRole('button', { name: 'Confirmer le retrait' })
    expect(bouton).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'motdepasse1')
    expect(screen.getByRole('button', { name: 'Confirmer le retrait' })).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Code reçu'), '123456')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmer le retrait' })).toBeEnabled())
    expect(confirmer).not.toHaveBeenCalled()
  })

  it('un montant supérieur au solde est refusé avant l’appel', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startWithdrawal')
    await monter(gains({ availableXaf: 10000 }))

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '50000')
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
    expect(screen.getByText(/supérieur à votre solde disponible/)).toBeInTheDocument()
    expect(demarrer).not.toHaveBeenCalled()
  })

  it('solde à zéro : pas de formulaire, mais l’explication de ce qui débloque l’argent', async () => {
    await monter(gains({ availableXaf: 0 }))
    expect(await screen.findByText(/Rien à retirer pour l'instant/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Montant à retirer')).not.toBeInTheDocument()
  })
})

describe('C6 — le compte de versement, qui n’existe pas', () => {
  it('l’écran dit que l’argent part sur le numéro du COMPTE, sans promettre un compte séparé', async () => {
    await monter(gains())

    expect(await screen.findByText(/pas de compte de versement séparé/)).toBeInTheDocument()
    // La maquette affichait un badge « Vérifié » sur un compte enregistré qui n'existe nulle part.
    const texte = document.body.textContent ?? ''
    expect(texte).not.toContain('Changer de compte')
    expect(texte).not.toContain('Configurer mon compte de versement')
  })

  it('renvoie là où le numéro se change VRAIMENT', async () => {
    await monter(gains())
    const lien = await screen.findByRole('link', { name: /Modifier mon numéro/ })
    expect(lien).toHaveAttribute('href', '/parametres?section=securite')
  })

  it('le numéro est masqué : reconnaissable, pas lisible par-dessus l’épaule', async () => {
    await monter(gains())
    await screen.findByText(/Où part l.argent/)
    const texte = document.body.textContent ?? ''
    expect(texte).toContain('•• ••')
    expect(texte).not.toContain('+242069000110')
  })
})

describe('C6 — les mouvements et les retraits', () => {
  it('nomme les trois types en français, jamais en code', async () => {
    await monter(
      gains({
        entries: [
          { id: 'a', type: 'CREDIT', amountXaf: 5000, reference: 'r1', createdAt: '2026-08-20T10:00:00.000Z' },
          { id: 'b', type: 'WITHDRAWAL', amountXaf: -4000, reference: 'r2', createdAt: '2026-08-21T10:00:00.000Z' },
          { id: 'c', type: 'REVERSAL', amountXaf: -5000, reference: 'r3', createdAt: '2026-08-22T10:00:00.000Z' },
        ],
      }),
    )

    const bloc = within(screen.getByRole('region', { name: 'Mouvements' }))
    expect(await bloc.findByText('Consultation')).toBeInTheDocument()
    expect(bloc.getByText('Retrait')).toBeInTheDocument()
    expect(bloc.getByText('Remboursement')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('REVERSAL')
  })

  it('un retrait échoué affiche TOUJOURS son motif', async () => {
    await monter(
      gains({
        withdrawals: [
          {
            id: 'w1',
            amountXaf: 20000,
            operator: 'MTN_MOMO',
            status: 'FAILED',
            failReason: 'Numéro Mobile Money inactif',
            requestedAt: '2026-08-22T10:00:00.000Z',
            executedAt: null,
          },
        ],
      }),
    )

    // Un échec sans motif laisse le médecin sans recours : il ne sait ni quoi corriger, ni qui appeler.
    expect(await screen.findByText('Numéro Mobile Money inactif')).toBeInTheDocument()
    expect(screen.getByText('Échoué')).toBeInTheDocument()
  })

  it('journal vide : on dit quoi attendre, au lieu d’un cadre muet (CG-08 §06)', async () => {
    await monter(gains())
    expect(await screen.findByText(/première consultation créditée apparaîtra ici/)).toBeInTheDocument()
  })

  it('un échec de chargement rassure : le journal reste intact côté serveur', async () => {
    vi.spyOn(api, 'earnings').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GainsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/n'ont pas pu être chargés/)).toBeInTheDocument()
    expect(screen.getByText(/reste intact/)).toBeInTheDocument()
  })
})
