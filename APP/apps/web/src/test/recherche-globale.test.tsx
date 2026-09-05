/**
 * La recherche globale — chantier 46, 05/09/2026.
 *
 * ── Ce que ce fichier défend ──────────────────────────────────────────────────────────────────
 *
 * **1. Une lecture qui échoue n'est ni un zéro ni un « non ».** C'est le test le plus important du
 * fichier. Si la recherche de comptes échoue et que la palette affiche « aucun compte », un
 * administrateur conclut qu'une personne n'existe pas — alors que le serveur n'a simplement pas
 * répondu. Sur une plateforme de santé, cette confusion décide de suspensions.
 *
 * **2. Le droit de chercher des comptes n'est pas recopié.** Il se lit sur l'entrée `admin-comptes`
 * de `NAV_GROUPS`, qui porte exactement ce que le serveur accepte. Un administrateur Finance n'y a
 * pas droit, et la palette ne doit pas le lui proposer — c'est la faute du chantier 37, où une liste
 * de capacités écrite à la main avait narrowé un écran au seul super-administrateur.
 *
 * **3. La palette dit ce qu'elle NE cherche PAS.** Aucune route de l'API ne cherche du texte dans
 * les consultations, les pièces ou le journal. Sans cette phrase, on cherche longtemps ce qui n'y
 * sera jamais.
 *
 * **4. Le plafond du serveur ne reste pas silencieux.** `searchAccounts` s'arrête à 50 lignes ;
 * afficher 50 résultats sans le dire les ferait prendre pour la totalité — la même faute que
 * l'export d'audit tronqué, corrigée au chantier 45.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/state/session.store'
import { api, type AdminRole, type MeResponse } from '@/lib/api'

const SOIGNANT: MeResponse = {
  accountId: 'x1',
  accountType: 'PROFESSIONAL',
  username: 'dr.armel',
  phone: '+242069000110',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: 'Moungali',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecin généraliste',
  biography: null,
  adminRole: null,
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'dr.armel@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const admin = (role: AdminRole): MeResponse => ({
  ...SOIGNANT,
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'admin',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  category: null,
  specialty: null,
  district: null,
  adminRole: role,
})

function compte(p: Partial<Awaited<ReturnType<typeof api.searchAccounts>>[number]> = {}) {
  return {
    accountId: 'c1',
    phone: '+242069000200',
    type: 'PATIENT' as const,
    status: 'ACTIVE' as const,
    displayName: 'Mireille Okemba',
    ...p,
  }
}

function monter(me: MeResponse = SOIGNANT) {
  // La coquille lit la présence, les sessions et les notifications : le réseau est coupé en test.
  vi.spyOn(api, 'notificationsUnreadCount').mockResolvedValue({ unread: 0 })
  vi.spyOn(api, 'notifications').mockResolvedValue({ items: [], nextCursor: null })
  vi.spyOn(api, 'myPresence').mockResolvedValue({
    state: 'ONLINE',
    since: '2026-09-05T08:00:00.000Z',
    lastHeartbeatAt: '2026-09-05T08:00:00.000Z',
    availableForInitiation: true,
    maxConcurrentSessions: 3,
  })
  vi.spyOn(api, 'presenceHeartbeat').mockResolvedValue({
    state: 'ONLINE',
    since: '2026-09-05T08:00:00.000Z',
    lastHeartbeatAt: '2026-09-05T08:00:00.000Z',
    availableForInitiation: true,
  })
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: [] })

  window.innerWidth = 1280
  useSessionStore.setState({ token: 'jeton', me, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/parametres" element={<p>écran des paramètres</p>} />
              <Route path="*" element={<p>contenu de l’écran</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const bouton = () => screen.getByRole('button', { name: /Rechercher/ })

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('La recherche globale — ouverture', () => {
  /*
    Le bouton d'abord, le raccourci ensuite. Une fonction qui n'existe qu'au clavier n'existe pas
    pour qui ne la connaît pas — et personne ne devine Ctrl+K.
  */
  it('s’ouvre par un bouton visible, pas seulement au clavier', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())

    expect(await screen.findByPlaceholderText(/Un écran/)).toBeInTheDocument()
  })

  it('s’ouvre aussi à Ctrl+K, et le bouton l’annonce aux lecteurs d’écran', async () => {
    monter()
    const utilisateur = userEvent.setup()

    expect(bouton()).toHaveAttribute('aria-keyshortcuts', 'Control+K')

    await utilisateur.keyboard('{Control>}k{/Control}')

    expect(await screen.findByPlaceholderText(/Un écran/)).toBeInTheDocument()
  })
})

describe('La recherche globale — les écrans', () => {
  it('propose les écrans du rôle, et y navigue', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.click(await screen.findByRole('option', { name: /Mes paramètres|Paramètres/ }))

    expect(await screen.findByText('écran des paramètres')).toBeInTheDocument()
  })

  /*
    « parametres » sans accent doit trouver « Paramètres ». Un utilisateur pressé ne pose pas ses
    accents, et une palette qui les exige rate le seul mot qu'on lui donne.
  */
  it('trouve un écran accentué depuis un terme sans accent', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran/), 'parametres')

    expect(await screen.findByRole('option', { name: /paramètres/i })).toBeInTheDocument()
  })

  /*
    La palette lit `useNavigation()`, déjà filtré par capacité. Un soignant ne doit donc pas voir
    d'écran d'administration — sans quoi la palette rouvrirait une porte que le tiroir ferme.
  */
  it('ne propose à un soignant aucun écran d’administration', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await screen.findByPlaceholderText(/Un écran/)

    expect(screen.queryByRole('option', { name: /Pilotage|Administrateurs|Comptes/ })).not.toBeInTheDocument()
  })
})

describe('La recherche globale — les comptes', () => {
  /*
    Le droit vient de l'entrée `admin-comptes` de NAV_GROUPS, qui porte ce que le serveur accepte
    (`@AdminOnly(ADMIN_VERIFICATION, ADMIN_MAP)`). Un administrateur Finance reçoit 403 : lui
    proposer la recherche serait promettre ce qu'on ne tient pas.
  */
  it('n’offre PAS la recherche de comptes à un administrateur Finance', async () => {
    const chercher = vi.spyOn(api, 'searchAccounts')
    monter(admin('ADMIN_FINANCE'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    const champ = await screen.findByPlaceholderText(/Un écran/)
    await utilisateur.type(champ, 'Okemba')

    // Le libellé du champ le dit, et surtout : rien n'est demandé au serveur.
    expect(champ).toHaveAttribute('placeholder', expect.not.stringContaining('nom'))
    await waitFor(() => expect(chercher).not.toHaveBeenCalled())
  })

  it('cherche les comptes pour un administrateur Vérification', async () => {
    vi.spyOn(api, 'searchAccounts').mockResolvedValue([compte()])
    monter(admin('ADMIN_VERIFICATION'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran, un nom/), 'Okemba')

    expect(await screen.findByRole('option', { name: /Mireille Okemba/ })).toBeInTheDocument()
  })

  /*
    ── LE test de ce fichier ──────────────────────────────────────────────────────────────────

    « Aucun compte » et « je n'ai pas pu chercher » sont deux phrases différentes, et les confondre
    fait conclure à un administrateur qu'une personne n'existe pas. Le projet le dit ainsi : une
    lecture qui échoue n'est ni un zéro ni un « non ».
  */
  it('ne dit JAMAIS « aucun compte » quand la recherche a échoué', async () => {
    vi.spyOn(api, 'searchAccounts').mockRejectedValue(new Error('réseau'))
    monter(admin('ADMIN_VERIFICATION'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran, un nom/), 'Okemba')

    expect(await screen.findByRole('alert')).toHaveTextContent(/n'a pas abouti/)
    expect(screen.getByRole('alert')).toHaveTextContent(/Ce n'est pas une réponse/)
    expect(screen.queryByText(/Aucun compte ne porte/)).not.toBeInTheDocument()
  })

  it('dit « aucun compte » quand le serveur a bien répondu, et n’a rien trouvé', async () => {
    vi.spyOn(api, 'searchAccounts').mockResolvedValue([])
    monter(admin('ADMIN_VERIFICATION'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran, un nom/), 'Zzzz')

    expect(await screen.findByText(/Aucun compte ne porte ce nom/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /* Le serveur s'arrête à 50 (`take: 50`). Cinquante lignes muettes passent pour la totalité. */
  it('annonce le plafond quand le serveur a rendu ses 50 lignes', async () => {
    vi.spyOn(api, 'searchAccounts').mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => compte({ accountId: `c${i}`, displayName: `Compte ${i}` })),
    )
    monter(admin('ADMIN_VERIFICATION'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran, un nom/), 'Compte')

    expect(await screen.findByText(/50 premiers comptes seulement/)).toBeInTheDocument()
  })

  /*
    Une seule lettre ramènerait cinquante comptes sans rapport, et chaque appel est un accès à des
    données de comptes — tracé, et à ne pas multiplier pour rien.
  */
  it('n’interroge pas le serveur sur une seule lettre', async () => {
    const chercher = vi.spyOn(api, 'searchAccounts').mockResolvedValue([])
    monter(admin('ADMIN_VERIFICATION'))
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())
    await utilisateur.type(await screen.findByPlaceholderText(/Un écran, un nom/), 'O')

    await waitFor(() => expect(chercher).not.toHaveBeenCalled())
  })
})

describe('La recherche globale — ce qu’elle ne cherche pas', () => {
  /*
    Aucune route de l'API ne cherche du texte dans les consultations, les pièces ou le journal : le
    journal se filtre par action et acteur EXACTS, les pièces se listent par dossier, les
    consultations par participant. Le dire évite de chercher ce qui n'y sera jamais.
  */
  it('annonce en toutes lettres ce qui n’est pas cherchable', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())

    expect(
      await screen.findByText(/Les consultations, les\s+pièces et le journal ne se cherchent pas ici/),
    ).toBeInTheDocument()
  })

  it('dit à un soignant que la palette ne porte que sur les écrans', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(bouton())

    expect(await screen.findByText(/Écrans seulement/)).toBeInTheDocument()
  })
})
