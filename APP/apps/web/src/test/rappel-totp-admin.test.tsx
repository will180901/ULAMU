/**
 * Le rappel de double authentification sur l'administration — chantier 24, 02/09/2026.
 *
 * ── Ce qu'il répare ───────────────────────────────────────────────────────────────────────────
 *
 * RM-01-06 est rétablie sur l'API en ligne depuis le 01/09 : un compte d'administration sans TOTP
 * activé reçoit 403 sur toutes les routes admin. Les sept écrans affichaient donc leur message de
 * panne et proposaient « Réessayer » — un geste qui ne pouvait pas aboutir — sans jamais nommer la
 * sortie, qui existe pourtant et n'est pas gardée : `/configuration-totp`.
 *
 * ── Pourquoi ces tests-ci ─────────────────────────────────────────────────────────────────────
 *
 * Le rappel est une ABSENCE la plupart du temps : il ne doit apparaître que dans un seul état, et
 * c'est de ne pas apparaître ailleurs qu'il tire sa valeur. Un bandeau d'avertissement qu'on voit
 * sur tous les écrans cesse d'être lu — même famille que la phrase rassurante du chantier 8, qui
 * ne coûtait rien tant qu'on ne la lisait pas.
 *
 * On verrouille donc les quatre états, et un cinquième que le code seul ne laisse pas deviner :
 * le rappel vit HORS de la limite d'erreur, pour survivre à un écran qui tombe.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ActionApresEchec } from '@/components/layout/RappelTotpAdmin'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const BASE: MeResponse = {
  accountId: 'x1',
  accountType: 'ADMIN',
  username: 'admin',
  phone: '+242069000100',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'SUPER_ADMIN',
  totpEnabled: false,
  totpEnabledAt: null,
  email: 'admin@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 0,
  backupCodesTotal: 0,
  backupCodesGeneratedAt: null,
}

function monter(chemin: string, moi: Partial<MeResponse> = {}, ecran = <p>contenu de l’écran</p>) {
  window.innerWidth = 1280
  useSessionStore.setState({ token: 'jeton', me: { ...BASE, ...moi }, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[chemin]}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="*" element={ecran} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/** Le lien de sortie — c'est LUI qu'on cherche, pas une tournure de phrase. */
const sortie = () => screen.queryByRole('link', { name: /double authentification/i })

beforeEach(() => {
  window.innerWidth = 1280
})

describe('Le rappel de double authentification (RM-01-06)', () => {
  it('un administrateur sans TOTP, sur un écran d’administration, voit la sortie nommée', () => {
    monter('/admin/comptes')

    expect(sortie()).toHaveAttribute('href', '/configuration-totp')
  })

  /*
    Le fond de l'affaire : l'écran disait que la lecture avait échoué, et proposait de recommencer.
    Le rappel doit dire l'inverse — que recommencer ne servira à rien — sinon il ne fait qu'ajouter
    du texte à côté d'un bouton qui continue d'inviter au même geste vain.
  */
  it('il dit que réessayer ne changera rien', () => {
    monter('/admin/verification')

    expect(screen.getByRole('status')).toHaveTextContent(/réessayer n.y changera rien/i)
  })

  it('TOTP activé : plus aucun rappel', () => {
    monter('/admin/comptes', { totpEnabled: true })

    expect(sortie()).toBeNull()
  })

  /*
    Hors de l'administration, le même compte ne subit rien : ses écrans se lisent normalement. Un
    rappel y serait un reproche sans panne à expliquer.
  */
  it('hors de l’administration, il se tait', () => {
    monter('/dashboard')

    expect(sortie()).toBeNull()
  })

  /*
    Un soignant n'est pas concerné par RM-01-06 : la règle porte sur les ACTIONS d'administration.
    Lui montrer ce bandeau lui annoncerait une obligation qui n'est pas la sienne — c'est
    exactement la fausseté que ce chantier corrige par ailleurs dans B3.
  */
  it('un soignant sans TOTP ne le voit jamais, même sur une route d’administration', () => {
    monter('/admin/comptes', { accountType: 'PROFESSIONAL', adminRole: null })

    expect(sortie()).toBeNull()
  })

  /*
    Le cas qui a décidé de sa POSITION dans la coquille. `GardeFou` remplace le contenu de l'écran
    quand celui-ci lève ; un rappel posé DEDANS disparaîtrait donc au moment précis où il est le
    plus utile — une page d'administration en panne est ce qu'un compte sans TOTP voit d'abord.
  */
  it('il survit à un écran qui tombe', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Explose = (): never => {
      throw new Error('rendu impossible')
    }

    monter('/admin/finance', {}, <Explose />)

    expect(sortie()).toHaveAttribute('href', '/configuration-totp')
  })
})

/**
 * Le bouton qui ne pouvait pas aboutir.
 *
 * Les six branches d'échec de l'administration offraient « Réessayer ». Sur un refus RM-01-06, le
 * dixième essai est refusé comme le premier : le bouton occupait la place de la seule action utile.
 */
describe('Ce qu’on propose après un échec de lecture', () => {
  function monterAction(moi: Partial<MeResponse> = {}) {
    useSessionStore.setState({ token: 'jeton', me: { ...BASE, ...moi }, isAuthenticated: true, hasHydrated: true })
    const surReessayer = vi.fn()
    render(
      <MemoryRouter initialEntries={['/admin/pilotage']}>
        <ActionApresEchec surReessayer={surReessayer} />
      </MemoryRouter>,
    )
    return surReessayer
  }

  it('sans TOTP : l’activation remplace « Réessayer »', () => {
    monterAction()

    expect(screen.getByRole('link', { name: /activer ma double authentification/i })).toHaveAttribute(
      'href',
      '/configuration-totp',
    )
    expect(screen.queryByRole('button', { name: /réessayer/i })).toBeNull()
  })

  /*
    Le défaut symétrique coûterait autant : retirer « Réessayer » à qui a bien son TOTP lui prendrait
    le seul geste qui, sur une panne réseau, marche vraiment. Même règle qu'au chantier 14 avec la
    case de confirmation, dont un test vérifie qu'elle N'apparaît PAS quand rien n'est en jeu.
  */
  it('avec TOTP : « Réessayer » revient, et relance bien la lecture', async () => {
    const surReessayer = monterAction({ totpEnabled: true })

    expect(screen.queryByRole('link', { name: /double authentification/i })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    expect(surReessayer).toHaveBeenCalledTimes(1)
  })

  /*
    Ce test lit la SOURCE, comme `responsive.test.ts` lit celle des cinq tableaux.

    Ce qui peut se casser n'est pas le rendu : c'est qu'un écran ajouté demain — ou l'un des six
    remanié — reprenne le `<Button>Réessayer</Button>` écrit à la main, et rétablisse en silence le
    bouton vain. Un test de rendu ne verrait rien : il faudrait penser à monter cet écran-là, dans
    cet état-là, avec un compte sans TOTP.
  */
  it('aucun écran d’administration ne rétablit un « Réessayer » écrit à la main', () => {
    const dossier = resolve(__dirname, '../modules/admin/pages')
    const ecrans = [
      'AdministrateursPage.tsx',
      'ComptesPage.tsx',
      'FileVerificationPage.tsx',
      'FinancePage.tsx',
      'ParametresMetierPage.tsx',
      'PilotagePage.tsx',
      'SignalementsPage.tsx',
    ]

    for (const fichier of ecrans) {
      const source = readFileSync(resolve(dossier, fichier), 'utf8')
      expect(source, `${fichier} : « Réessayer » écrit en dur, hors de ActionApresEchec`).not.toMatch(
        /<Button[\s\S]{0,120}?Réessayer/,
      )
    }
  })
})
