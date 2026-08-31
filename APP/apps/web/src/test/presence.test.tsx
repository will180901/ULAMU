/**
 * B1 — la présence du soignant, et le rideau de confidentialité.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────────────────────
 *
 * La présence est le PREMIER chantier de la reconstruction, et pas par goût : sans elle,
 * `isAvailableForInitiation` renvoie `false` côté serveur, le bouton « initier » du patient reste
 * gris, et aucune consultation ne peut commencer. Un défaut ici ne casse pas un écran, il casse
 * la plateforme entière.
 *
 * ── Les deux mensonges que ces tests interdisent ──────────────────────────────────────────────
 *
 * **1. Dire « En ligne » à quelqu'un qui ne l'est pas.** Le serveur n'accorde ONLINE qu'avec un
 * battement plus frais que PM-26 : un ONLINE rassis vaut absent, et c'est LUI qui tranche, à
 * chaque lecture (RM-05-04). Un écran qui afficherait l'état brut mentirait à son médecin — qui
 * attendrait des demandes ne pouvant pas arriver.
 *
 * **2. Écrire le plafond en dur.** PM-27 vaut 3 aujourd'hui et se règle dans E3. Un « sur 3 »
 * codé dans la page est exactement la dette qui a produit les « 12 % » et les « 48 h » des
 * maquettes. Le test 4 change le plafond côté serveur et exige que l'écran suive.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse, type OwnPresence, type SessionListItem } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'x1',
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

const MAINTENANT = '2026-08-27T08:00:00.000Z'

function presence(p: Partial<OwnPresence> = {}): OwnPresence {
  return {
    state: 'ONLINE',
    since: MAINTENANT,
    lastHeartbeatAt: MAINTENANT,
    availableForInitiation: true,
    maxConcurrentSessions: 3,
    ...p,
  }
}

/** Une session au statut voulu — seul `status` compte pour le plafond (PREPARING + ACTIVE). */
function session(status: SessionListItem['status'], id: string): SessionListItem {
  return {
    id,
    status,
    patientAccountId: 'p1',
    professionalId: 'x1',
    subProfileId: null,
    durationMin: 30,
    paidAt: MAINTENANT,
    endsAt: null,
    endedAt: null,
    remainingSeconds: 0,
    reportDepositedAt: null,
    reportDueAt: null,
    // S9 : la clé qui relie la consultation à son mouvement au journal des gains.
    orderRef: 'ord-ref-1',
  }
}

function monter(opts: { presence?: Partial<OwnPresence>; sessions?: SessionListItem[]; largeur?: number } = {}) {
  const vue = presence(opts.presence)
  vi.spyOn(api, 'myPresence').mockResolvedValue(vue)
  vi.spyOn(api, 'presenceHeartbeat').mockResolvedValue(vue)
  vi.spyOn(api, 'setPresence').mockImplementation(async (state) => ({ ...vue, state }))
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: opts.sessions ?? [] })

  // `useIsMobile` lit `window.innerWidth` au montage : c'est le seul levier pour choisir le format.
  window.innerWidth = opts.largeur ?? 1280
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="*" element={<p>contenu de l’écran</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/** Le déclencheur de la pastille — repéré par son rôle, pas par un texte qui change. */
const pastille = () => screen.getByRole('button', { name: /Ma présence/ })

beforeEach(() => {
  vi.restoreAllMocks()
  window.innerWidth = 1280
})

describe('B1 — la pastille de présence', () => {
  it('affiche l’état du serveur, et le plafond QU’IL a servi', async () => {
    monter({ sessions: [session('ACTIVE', 's1')] })

    await waitFor(() => expect(pastille()).toHaveTextContent('En ligne'))
    await waitFor(() => expect(pastille()).toHaveTextContent('1 / 3'))
  })

  it('un « en ligne » RASSIS s’affiche Absent — le serveur tranche, pas l’écran', async () => {
    // C'est le piège : l'état brut vaut ONLINE, mais le battement est trop vieux (PM-26). Afficher
    // « En ligne » ferait attendre des demandes qui ne peuvent pas arriver.
    monter({ presence: { state: 'ONLINE', availableForInitiation: false } })

    await waitFor(() => expect(pastille()).toHaveTextContent('Absent'))
    expect(pastille()).not.toHaveTextContent('En ligne')
  })

  it('au plafond, le mot devient « Occupé » et la raison est écrite', async () => {
    monter({
      // PREPARING compte autant qu'ACTIVE : une session payée dont le décompteur n'a pas démarré
      // occupe déjà une place (EF-06-14).
      sessions: [session('ACTIVE', 's1'), session('ACTIVE', 's2'), session('PREPARING', 's3')],
    })

    await waitFor(() => expect(pastille()).toHaveTextContent('Occupé'))
    await waitFor(() => expect(pastille()).toHaveTextContent('3 / 3'))

    await userEvent.click(pastille())
    expect(await screen.findByText(/Aucune nouvelle demande ne vous parviendra/)).toBeInTheDocument()
  })

  it('suit PM-27 si le super-admin le change dans E3 — aucun « 3 » en dur', async () => {
    monter({ presence: { maxConcurrentSessions: 5 }, sessions: [session('ACTIVE', 's1')] })

    await waitFor(() => expect(pastille()).toHaveTextContent('1 / 5'))
    expect(pastille()).not.toHaveTextContent('/ 3')
  })

  it('les sessions TERMINÉES ne comptent pas dans le plafond', async () => {
    monter({ sessions: [session('ACTIVE', 's1'), session('ENDED', 's2'), session('REFUNDED', 's3')] })

    await waitFor(() => expect(pastille()).toHaveTextContent('1 / 3'))
    expect(pastille()).toHaveTextContent('En ligne')
  })

  it('propose les trois états, et n’en invente aucun autre', async () => {
    monter()
    await waitFor(() => expect(pastille()).toHaveTextContent('En ligne'))

    await userEvent.click(pastille())
    expect(await screen.findByText('Ne pas déranger')).toBeInTheDocument()
    expect(screen.getByText('Absent')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /En ligne/ })).toBeInTheDocument()
  })

  it('ne montre aucune présence à un administrateur — il n’a rien à déclarer', async () => {
    vi.spyOn(api, 'myPresence').mockResolvedValue(presence())
    vi.spyOn(api, 'presenceHeartbeat').mockResolvedValue(presence())
    vi.spyOn(api, 'mySessions').mockResolvedValue({ items: [] })
    window.innerWidth = 1280
    useSessionStore.setState({
      token: 'jeton',
      me: { ...MOI, accountType: 'ADMIN', adminRole: 'SUPER_ADMIN' },
      isAuthenticated: true,
      hasHydrated: true,
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="*" element={<p>contenu de l’écran</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    )

    await screen.findByText('contenu de l’écran')
    expect(screen.queryByRole('button', { name: /Ma présence/ })).not.toBeInTheDocument()
    expect(api.presenceHeartbeat).not.toHaveBeenCalled()
  })
})

describe('B1 — le rideau de confidentialité', () => {
  const bouton = () => screen.getByRole('button', { name: /rideau de confidentialité|Révéler l’écran/i })

  it('masque le contenu, et le rend INERTE — sinon on taperait dans un formulaire invisible', async () => {
    monter()
    await screen.findByText('contenu de l’écran')

    await userEvent.click(bouton())

    expect(await screen.findByText('Écran masqué')).toBeInTheDocument()
    // Le contenu reste dans le DOM (on ne démonte pas l'écran pour un voile), mais il est inerte.
    const contenu = screen.getByText('contenu de l’écran').closest('[inert]')
    expect(contenu).not.toBeNull()
  })

  it('se lève au clic sur le voile, et la session n’est pas fermée', async () => {
    monter()
    await screen.findByText('contenu de l’écran')
    await userEvent.click(bouton())

    await userEvent.click(await screen.findByRole('button', { name: 'Lever le rideau' }))

    await waitFor(() => expect(screen.queryByText('Écran masqué')).not.toBeInTheDocument())
    // Le rideau n'est PAS une mesure de sécurité : il ne déconnecte rien, et le dit à l'écran.
    expect(useSessionStore.getState().isAuthenticated).toBe(true)
  })

  it('n’existe pas sur mobile, comme dans la maquette', async () => {
    monter({ largeur: 500 })
    await screen.findByText('contenu de l’écran')

    expect(screen.queryByRole('button', { name: /rideau de confidentialité/i })).not.toBeInTheDocument()
  })
})
