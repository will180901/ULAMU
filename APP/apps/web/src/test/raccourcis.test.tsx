/**
 * Les raccourcis clavier — chantier 47, 05/09/2026.
 *
 * ── Ce que ce fichier défend ──────────────────────────────────────────────────────────────────
 *
 * **1. Une touche simple appartient à qui écrit.** C'est le test central. `/` et `?` sont des
 * CARACTÈRES : sans garde, écrire « 20/09 » dans un motif de refus ouvrirait la recherche au milieu
 * du mot et perdrait la saisie. Le motif d'un refus de vérification fait deux mille caractères — le
 * perdre à la barre oblique n'est pas un désagrément, c'est un travail à refaire.
 *
 * **2. Ctrl+K est l'exception, et elle est voulue.** Une combinaison à modificateur ne produit aucun
 * caractère : elle doit passer même en pleine frappe, comme dans toute application qui en propose.
 *
 * **3. Le panneau d'aide est la moitié utile du chantier.** Ctrl+K existait depuis la veille et
 * personne ne pouvait le deviner. Un raccourci sans endroit où le lire est un secret partagé entre
 * le code et celui qui l'a écrit.
 *
 * **4. Le panneau n'invente rien.** Il rend `RACCOURCIS`, la seule liste, et la filtre par capacité :
 * un administrateur n'a pas de consultation, donc pas la ligne « Entrée envoie le message ».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { RACCOURCIS } from '@/config/raccourcis.config'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse } from '@/lib/api'

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

const ADMIN: MeResponse = {
  ...SOIGNANT,
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'admin',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  category: null,
  specialty: null,
  district: null,
  adminRole: 'SUPER_ADMIN',
}

function monter(me: MeResponse = SOIGNANT) {
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
              {/* Un écran porteur d'un champ et d'une zone de texte : c'est là que la garde compte. */}
              <Route
                path="*"
                element={
                  <>
                    <input aria-label="un champ" />
                    <textarea aria-label="une zone de texte" />
                    <div contentEditable aria-label="un texte riche" role="textbox" tabIndex={0} />
                  </>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const palette = () => screen.queryByPlaceholderText(/Un écran/)
const aide = () => screen.queryByRole('heading', { name: /Raccourcis clavier/ })

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Les raccourcis globaux', () => {
  it('« / » ouvre la recherche', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('/')

    expect(palette()).toBeInTheDocument()
  })

  it('« ? » ouvre le panneau d’aide', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('?')

    expect(aide()).toBeInTheDocument()
  })

  it('Ctrl+K ouvre toujours la recherche', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('{Control>}k{/Control}')

    expect(palette()).toBeInTheDocument()
  })
})

/*
  ── LE cœur du chantier ─────────────────────────────────────────────────────────────────────────

  Un motif de refus de vérification accepte deux mille caractères, et un administrateur y écrit des
  dates. Si « / » ouvrait la recherche au milieu de « 20/09 », il perdrait sa saisie — et il ne
  comprendrait même pas ce qui vient de se passer.
*/
describe('Une touche simple appartient à qui écrit', () => {
  it.each([
    ['un champ', 'champ de saisie'],
    ['une zone de texte', 'zone de texte'],
    ['un texte riche', 'élément contenteditable'],
  ])('« / » n’ouvre RIEN quand on écrit dans %s', async (etiquette) => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(screen.getByLabelText(etiquette))
    await utilisateur.keyboard('/')

    expect(palette()).not.toBeInTheDocument()
  })

  it('« ? » n’ouvre rien non plus pendant une saisie', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(screen.getByLabelText('une zone de texte'))
    await utilisateur.keyboard('?')

    expect(aide()).not.toBeInTheDocument()
  })

  /*
    L'exception, et elle est voulue : une combinaison à modificateur ne produit aucun caractère.
    L'interdire en saisie retirerait le raccourci exactement là où on en a le plus besoin — au
    milieu d'un long texte, quand on veut vérifier un nom.
  */
  it('Ctrl+K passe MÊME en pleine saisie — c’est l’exception', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(screen.getByLabelText('une zone de texte'))
    await utilisateur.keyboard('{Control>}k{/Control}')

    expect(palette()).toBeInTheDocument()
  })
})

describe('Le panneau d’aide', () => {
  it('liste tous les raccourcis déclarés, y compris ceux d’un autre écran', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('?')

    // Les raccourcis du composeur sont implémentés ailleurs ; on les cherche AU MÊME endroit.
    expect(screen.getByText('Envoyer le message')).toBeInTheDocument()
    expect(screen.getByText('Ouvrir la recherche')).toBeInTheDocument()
    expect(screen.getByText('Passer à la ligne sans envoyer')).toBeInTheDocument()
  })

  /*
    Un administrateur n'a pas de consultation. Lui montrer « Entrée envoie le message » serait lui
    promettre un écran qu'il n'a pas — la même faute que la navigation évite depuis toujours.
  */
  it('ne montre pas à un administrateur les raccourcis d’un écran qu’il n’a pas', async () => {
    monter(ADMIN)
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('?')

    expect(screen.getByText('Ouvrir la recherche')).toBeInTheDocument()
    expect(screen.queryByText('Envoyer le message')).not.toBeInTheDocument()
  })

  it('dit que la souris suffit — les raccourcis ne font que raccourcir', async () => {
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.keyboard('?')

    expect(screen.getByText(/Tout se fait aussi à la souris/)).toBeInTheDocument()
  })
})

/*
  ── Le garde-fou contre la dérive ───────────────────────────────────────────────────────────────

  `RACCOURCIS` sert de documentation ; `useRaccourcisGlobaux` fait le travail. Rien n'empêche
  d'ajouter une ligne à la liste sans écrire le code — le panneau annoncerait alors un raccourci qui
  ne fait rien, ce que le projet nomme « proposer ce qu'on ne tient pas ».

  Ce test ne prouve pas qu'un raccourci fonctionne (les tests ci-dessus s'en chargent pour les deux
  qui existent) : il **refuse qu'on en déclare un troisième sans venir ici**.
*/
describe('La liste déclarée et le code ne divergent pas', () => {
  it('les seuls raccourcis annoncés comme globaux sont ceux qui sont éprouvés plus haut', () => {
    const globaux = RACCOURCIS.filter((r) => r.porteeGlobale).map((r) => r.cle)

    expect(globaux.sort()).toEqual(['aide', 'recherche'])
  })

  it('chaque raccourci déclaré dit où il s’applique, et porte au moins une touche', () => {
    for (const r of RACCOURCIS) {
      expect(r.portee.length, `${r.cle} sans portée`).toBeGreaterThan(0)
      expect(r.touches.length, `${r.cle} sans touche`).toBeGreaterThan(0)
      expect(r.libelle.length, `${r.cle} sans libellé`).toBeGreaterThan(0)
    }
  })
})
