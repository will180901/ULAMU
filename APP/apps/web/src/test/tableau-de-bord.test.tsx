/**
 * B2 « Tableau de bord » — et surtout : la FORME des réponses du serveur.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * Le 24/08/2026, cet écran plantait en production sur une page blanche :
 *
 *     Uncaught TypeError: (t.data ?? []).filter is not a function
 *
 * `GET /v1/handshakes/mine` renvoie `{ items: [...] }`. Le client web le déclarait `Handshake[]`.
 * TypeScript n'a rien vu, et il ne POUVAIT rien voir : une déclaration de type est une **promesse
 * faite au compilateur**, pas une vérification. Le compilateur a cru la promesse, et l'écran a
 * appelé `.filter` sur un objet.
 *
 * Ce qui a rendu la faute invisible plus longtemps : la vérification de B2 s'était faite avec un
 * faux `fetch` qui renvoyait un tableau — c'est-à-dire qui confirmait la supposition au lieu de la
 * contredire. **Un leurre construit sur sa propre croyance ne teste que sa croyance.**
 *
 * Les formes utilisées ici ont donc été relevées SUR L'API DÉPLOYÉE, avec une vraie session :
 *
 *     GET /v1/handshakes/mine   → {"items":[]}
 *     GET /v1/me/dashboard      → {"sessionsThisMonth":0,"earnings":{…},"averageRating":null,…}
 *
 * `averageRating: null` en fait partie : un soignant sans note n'a pas de moyenne, et afficher
 * « note moyenne null / 5 » serait le genre de détail qui décrédibilise tout l'écran.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Handshake, type MeResponse } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'p1',
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
  totpEnabled: false,
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 0,
  backupCodesTotal: 0,
  backupCodesGeneratedAt: null,
}

const demande = (id: string, status: Handshake['status']): Handshake => ({
  id,
  status,
  patientAccountId: 'pat',
  professionalId: 'p1',
  offerId: 'o1',
  subProfileId: null,
  initiatedAt: '2026-08-24T08:00:00.000Z',
  confirmedAt: null,
  confirmExpiresAt: null,
  refusalReason: null,
  windowExpiresAt: null,
  windowRemainingSeconds: 0,
  sessionId: null,
})

async function monter(demandes: Handshake[], note: number | null = null) {
  vi.spyOn(api, 'professionalDashboard').mockResolvedValue({
    sessionsThisMonth: 6,
    earnings: { availableXaf: 486500, pendingXaf: 32000 },
    averageRating: note,
    confirmationRatePct: 92,
  })
  // ⚠️ La forme RÉELLE : un objet `{ items }`, pas un tableau. C'est tout l'objet de ce fichier.
  vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items: demandes })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // On attend une valeur qui n'existe QUE chargé : le titre de page, lui, s'affiche déjà pendant le
  // chargement, et l'attendre laisserait les assertions tomber sur les rectangles de chargement.
  await screen.findByText('92 %')
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('B2 — soignant', () => {
  it("l'écran s'affiche quand les demandes arrivent sous forme d'objet `{ items }`", async () => {
    await monter([demande('h1', 'INITIATED'), demande('h2', 'INITIATED'), demande('h3', 'CONFIRMED')])

    // Le compte ne retient que les poignées de main OUVERTES : une confirmée n'attend plus rien.
    // Avant le correctif, cette ligne ne s'exécutait jamais : l'écran plantait au rendu.
    expect(await screen.findByText('2 poignée(s) de main ouverte(s)')).toBeInTheDocument()
    expect(screen.getByText('486 500')).toBeInTheDocument()
  })

  it('aucune demande : la liste propose une sortie plutôt qu’un vide muet (CG-08 §06)', async () => {
    await monter([])
    expect(screen.getByText(/Aucune demande en attente/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Compléter ma vitrine/ })).toBeInTheDocument()
  })

  it('sans note reçue, on écrit « Aucune note reçue » — jamais « null / 5 »', async () => {
    await monter([], null)
    expect(screen.getByText('Aucune note reçue')).toBeInTheDocument()
    expect(screen.queryByText(/null/)).not.toBeInTheDocument()
  })

  it('avec une note, elle est affichée telle quelle', async () => {
    await monter([], 4.8)
    expect(screen.getByText(/Note moyenne 4.8 \/ 5/)).toBeInTheDocument()
  })

  it("aucune identité de patient n'apparaît dans la file — une poignée de main n'a rien ouvert (C1)", async () => {
    await monter([demande('h1', 'INITIATED')])
    const principal = document.querySelector('main')?.textContent ?? ''
    expect(principal).not.toContain('pat')
  })
})
