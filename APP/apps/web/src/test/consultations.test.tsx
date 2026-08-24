/**
 * C4 « Consultations » — le registre du soignant.
 *
 * Ce que cet écran doit faire, et qu'aucun autre ne fait : **rappeler les comptes-rendus qui
 * manquent**. RM-06-04 gèle les gains tant qu'ils ne sont pas déposés, et EF-06-08 alerte
 * l'administration au-delà de PM-30 — 24 heures, pas 48.
 *
 * Un médecin qui ne voit pas cette dette la découvre en constatant que son argent ne vient pas.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConsultationsPage } from '@/modules/consultation/pages/ConsultationsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse, type Prescription, type SessionListItem } from '@/lib/api'

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

const ilYA = (heures: number) => new Date(Date.now() - heures * 3600e3).toISOString()

function seance(over: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: 's1',
    status: 'ENDED',
    patientAccountId: 'pat-1',
    professionalId: 'pro-1',
    subProfileId: null,
    durationMin: 30,
    paidAt: ilYA(30),
    endsAt: ilYA(29),
    endedAt: ilYA(29),
    remainingSeconds: 0,
    reportDepositedAt: null,
    ...over,
  }
}

function ordonnance(over: Partial<Prescription> = {}): Prescription {
  return {
    id: 'o1',
    sessionId: 's1',
    status: 'ACTIVE',
    qrToken: 'tok',
    subProfileId: null,
    expiresAt: '2026-09-24T00:00:00.000Z',
    createdAt: '2026-08-24T10:00:00.000Z',
    cancelReason: null,
    lines: [
      {
        id: 'l1',
        medicamentId: 'm1',
        medicationName: 'Amlodipine 5 mg',
        freeText: null,
        posology: '1 comprimé le matin',
        durationDays: 30,
        qtyPrescribed: 30,
        qtyDispensed: 0,
      },
    ],
    ...over,
  }
}

async function monter(seances: SessionListItem[], ordos: Prescription[] = []) {
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: seances })
  vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: ordos })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConsultationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Consultations' })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C4 — les comptes-rendus qui manquent', () => {
  it('annonce 24 heures, jamais 48 — c’est le délai qui gèle les gains', async () => {
    await monter([seance()])
    expect(await screen.findByText(/24 heures/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('48 h')
  })

  it('compte les comptes-rendus en attente en tête d’écran', async () => {
    await monter([
      seance({ id: 's1' }),
      seance({ id: 's2' }),
      // Déposé : celui-ci ne compte plus.
      seance({ id: 's3', reportDepositedAt: ilYA(1) }),
      // En cours : rien à déposer tant qu'elle n'est pas finie.
      seance({ id: 's4', status: 'ACTIVE', endedAt: null }),
    ])
    expect(await screen.findByText(/2 comptes-rendus à déposer/)).toBeInTheDocument()
  })

  it('dit les heures RESTANTES, pas une date — c’est ce qui pousse à agir', async () => {
    await monter([seance({ endedAt: ilYA(20) })])
    // Fini il y a 20 h : il en reste 4.
    expect(await screen.findByText(/reste 4 heures pour déposer/)).toBeInTheDocument()
  })

  it('un délai dépassé dit que les gains sont gelés', async () => {
    await monter([seance({ endedAt: ilYA(30) })])
    expect(await screen.findByText(/Délai dépassé — vos gains sont gelés/)).toBeInTheDocument()
  })

  it('aucun rappel quand tout est déposé — un écran ne parle pas pour rien', async () => {
    await monter([seance({ reportDepositedAt: ilYA(1) })])
    await screen.findByText('Compte-rendu déposé')
    expect(screen.queryByText(/en attente/)).not.toBeInTheDocument()
  })
})

describe('C4 — les ordonnances de la consultation', () => {
  it('range chaque ordonnance sous SA consultation', async () => {
    await monter([seance({ id: 's1' }), seance({ id: 's2', reportDepositedAt: ilYA(1) })], [
      ordonnance({ id: 'o1', sessionId: 's2' }),
    ])

    // C'est `sessionId` — ajouté le 24/08 — qui rend ce rattachement possible.
    const carte = (await screen.findByText(/référence S2/i)).closest('section') as HTMLElement
    expect(within(carte).getByText('Lignes prescrites')).toBeInTheDocument()
    expect(within(carte).getByText(/Amlodipine 5 mg/)).toBeInTheDocument()
    expect(within(carte).getByText(/1 comprimé le matin/)).toBeInTheDocument()
  })

  it('nomme le médicament du référentiel, jamais son identifiant', async () => {
    await monter([seance()], [ordonnance()])
    expect(await screen.findByText(/Amlodipine 5 mg/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('m1')
  })

  it('une consultation sans ordonnance n’affiche pas de bloc vide', async () => {
    await monter([seance()])
    await screen.findByText(/Consultation du/)
    expect(screen.queryByText('Lignes prescrites')).not.toBeInTheDocument()
  })
})

describe('C4 — filtrer et chercher', () => {
  it('le filtre « à signer » ne garde que les comptes-rendus manquants', async () => {
    const utilisateur = userEvent.setup()
    await monter([
      seance({ id: 's1' }),
      seance({ id: 's2', reportDepositedAt: ilYA(1) }),
      seance({ id: 's3', status: 'REFUNDED' }),
    ])

    await utilisateur.selectOptions(await screen.findByLabelText('Afficher'), 'a-signer')
    await waitFor(() => expect(screen.getAllByText(/Consultation du/)).toHaveLength(1))
  })

  it('un filtre sans résultat propose de l’effacer (CG-08 §06)', async () => {
    const utilisateur = userEvent.setup()
    await monter([seance({ reportDepositedAt: ilYA(1) })])

    await utilisateur.selectOptions(await screen.findByLabelText('Afficher'), 'a-signer')
    expect(await screen.findByText('Aucun résultat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Effacer les filtres/ })).toBeInTheDocument()
  })

  it('registre vide : on dit quoi attendre et où aller', async () => {
    await monter([])
    expect(await screen.findByText('Aucune consultation enregistrée')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir mes demandes/ })).toBeInTheDocument()
  })
})

describe('C4 — la vie privée du patient', () => {
  it('aucune identité de patient n’apparaît dans le registre', async () => {
    await monter([seance()], [ordonnance()])
    await screen.findByText(/Consultation du/)
    // La liste ne charge aucun nom, et l'écran n'en réclame pas pour agrémenter un filtre.
    expect(document.body.textContent).not.toContain('pat-1')
  })
})

describe('C4 — la panne', () => {
  it('rassure sur les comptes-rendus déjà déposés et les brouillons', async () => {
    vi.spyOn(api, 'mySessions').mockRejectedValue(new Error('réseau'))
    vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: [] })
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ConsultationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/Le registre n'a pas pu être chargé/)).toBeInTheDocument()
    expect(screen.getByText(/restent intacts côté serveur/)).toBeInTheDocument()
  })
})
