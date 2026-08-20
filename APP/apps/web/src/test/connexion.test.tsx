/**
 * A1 — Connexion, seconde étape.
 *
 * Ces deux tests couvrent ce que l'œil ne peut pas vérifier aujourd'hui : depuis que le compte
 * administrateur n'a plus de TOTP, l'étape du second facteur ne s'affiche plus en naviguant. Sans
 * test, elle ne serait donc contrôlée par personne.
 *
 * Le second test garde un écart ASSUMÉ avec la maquette. Celle-ci montre six cases pour le code, et
 * juste dessous « un code de secours à 10 caractères est aussi accepté » — deux affirmations qui ne
 * tiennent pas ensemble. Le 20/08/2026, un compte administrateur s'est retrouvé enfermé dehors
 * précisément parce que le code de secours était injoignable. Le jour où quelqu'un simplifiera cet
 * écran en retirant la bascule, ce test doit tomber.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { useSessionStore } from '@/state/session.store'
import { api } from '@/lib/api'

function monter() {
  useSessionStore.getState().logout() // sinon la page redirige vers le tableau de bord
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Amène l'écran à sa seconde étape : le serveur répond que le compte réclame un second facteur. */
async function allerAuSecondFacteur() {
  const u = userEvent.setup({ delay: null })
  monter()
  // `fireEvent` pour le remplissage : saisir touche par touche ne teste rien ici et rend le test lent.
  fireEvent.change(screen.getByPlaceholderText(/dr_kouma/i), { target: { value: 'admin' } })
  fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'Admin123!' } })
  await u.click(screen.getByRole('button', { name: /se connecter/i }))
  await screen.findByText(/code de votre application/i)
  return u
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'login').mockResolvedValue({ totpRequired: true } as Awaited<ReturnType<typeof api.login>>)
})

describe('A1 — second facteur', () => {
  it('présente le code en SIX cases distinctes, comme la maquette', async () => {
    await allerAuSecondFacteur()
    const cases = document.querySelectorAll('[data-slot="input-otp-slot"]')
    expect(cases).toHaveLength(6)
  })

  it('laisse toujours saisir un code de secours de 10 caractères', async () => {
    const u = await allerAuSecondFacteur()

    // Six cases ne contiennent pas dix caractères : la bascule est le seul chemin vers un code de
    // secours, et un code de secours est le seul recours quand l'authentificateur est perdu.
    await u.click(screen.getByRole('button', { name: /utiliser un code de secours/i }))

    const champ = await screen.findByLabelText(/code de secours/i)
    expect(champ).toHaveAttribute('maxLength', '10')
    expect(document.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(0)

    // Et le retour en arrière reste possible : se tromper de mode ne doit pas coincer.
    await u.click(screen.getByRole('button', { name: /code à 6 chiffres/i }))
    await waitFor(() => expect(document.querySelectorAll('[data-slot="input-otp-slot"]')).toHaveLength(6))
  })
})
