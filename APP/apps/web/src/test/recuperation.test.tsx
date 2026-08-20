/**
 * A3 — les trois voies de récupération d'un mot de passe.
 *
 * Ce test garde une propriété de sûreté, pas une préférence d'affichage : **aucun compte ne doit
 * pouvoir se retrouver enfermé dehors**.
 *
 * L'écran ne proposait que le TOTP, ce qui tenait tant que le second facteur était imposé à tous.
 * Il est devenu volontaire le 20/08/2026, et un compte sans authentificateur n'avait alors plus
 * aucun recours — `disableTotp` refusant par ailleurs de dépanner un administrateur (RM-01-06). Le
 * jour où quelqu'un « simplifiera » cet écran en retirant la voie email, ce test doit tomber.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage'
import { api } from '@/lib/api'

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup({ delay: null })
}

const cases = () => document.querySelectorAll('[data-slot="input-otp-slot"]').length

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('A3 — récupération du mot de passe', () => {
  it('propose le TOTP par défaut, en six cases', () => {
    monter()
    expect(screen.getByLabelText(/nom d’utilisateur|nom d'utilisateur/i)).toBeInTheDocument()
    expect(cases()).toBe(6)
  })

  it('bascule vers un code de secours de 10 caractères', async () => {
    const u = monter()
    await u.click(screen.getByRole('button', { name: /utiliser un code de secours/i }))

    const champ = await screen.findByLabelText(/code de secours/i)
    expect(champ).toHaveAttribute('maxLength', '10')
    expect(cases()).toBe(0)
  })

  it('⭐ offre TOUJOURS la voie email — le seul recours sans authentificateur', async () => {
    const u = monter()

    // Atteignable depuis le mode TOTP…
    await u.click(screen.getByRole('button', { name: /recevoir un code par email/i }))
    const champEmail = await screen.findByLabelText(/email du compte/i)
    expect(champEmail).toHaveAttribute('type', 'email')

    // …et le code part vers le bon objet : PASSWORD_RESET, pas REGISTRATION. Se tromper d'objet
    // renverrait un code que le serveur refuserait ensuite, sans que rien ne l'explique.
    const demande = vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
    await u.type(champEmail, 'moi@exemple.test')
    await u.click(screen.getByRole('button', { name: /recevoir un code par email/i }))
    expect(demande).toHaveBeenCalledWith({ email: 'moi@exemple.test', purpose: 'PASSWORD_RESET' })

    // Le retour reste possible : se tromper de voie ne doit pas coincer.
    await u.click(screen.getByRole('button', { name: /authentificateur/i }))
    expect(await screen.findByLabelText(/nom d’utilisateur|nom d'utilisateur/i)).toBeInTheDocument()
  })
})
