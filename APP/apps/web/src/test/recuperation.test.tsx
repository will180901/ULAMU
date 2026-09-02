/**
 * A3 — les trois voies de récupération d'un mot de passe.
 *
 * Ce test garde une propriété de sûreté, pas une préférence d'affichage : **aucun compte ne doit
 * pouvoir se retrouver enfermé dehors**.
 *
 * L'écran ne proposait que le TOTP, ce qui tenait tant que le second facteur était imposé à tous.
 * Il est devenu volontaire le 20/08/2026, et un compte sans authentificateur n'avait alors plus
 * aucun recours. *(02/09/2026, D-053 : `disableTotp` accepte désormais tous les types de compte —
 * le défaut décrit ici reste réparé, ce test le garde.)* Le
 * jour où quelqu'un « simplifiera » cet écran en retirant la voie email, ce test doit tomber.
 *
 * Le parcours compte trois étapes depuis le 20/08/2026 : compte → code → nouveau mot de passe. Tout
 * afficher d'un coup dépassait la hauteur disponible sur une fenêtre courte.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
const continuer = (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByRole('button', { name: /^Continuer$/i }))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('A3 — récupération du mot de passe', () => {
  it('démarre sur l’identifiant, puis présente le code en six cases', async () => {
    const u = monter()

    // Étape 1 : le compte. Aucune case de code ici — elles arrivent à l'étape suivante.
    expect(screen.getByLabelText(/nom d’utilisateur|nom d'utilisateur/i)).toBeInTheDocument()
    expect(cases()).toBe(0)

    fireEvent.change(screen.getByLabelText(/nom d’utilisateur|nom d'utilisateur/i), { target: { value: 'admin' } })
    await continuer(u)

    expect(cases()).toBe(6)
  })

  it('bascule vers un code de secours de 10 caractères', async () => {
    const u = monter()
    await u.click(screen.getByRole('button', { name: /^code de secours$/i }))

    fireEvent.change(screen.getByLabelText(/nom d’utilisateur|nom d'utilisateur/i), { target: { value: 'admin' } })
    await continuer(u)

    const champ = await screen.findByLabelText(/code de secours/i)
    expect(champ).toHaveAttribute('maxLength', '10')
    expect(cases()).toBe(0)
  })

  it('⭐ offre TOUJOURS la voie email — le seul recours sans authentificateur', async () => {
    const demande = vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
    const u = monter()

    // Atteignable dès la première étape, sans avoir à chercher.
    await u.click(screen.getByRole('button', { name: /recevoir un code par email/i }))
    const champEmail = await screen.findByLabelText(/email du compte/i)
    expect(champEmail).toHaveAttribute('type', 'email')

    // Le code part avec le bon objet : PASSWORD_RESET, pas REGISTRATION. Se tromper d'objet
    // enverrait un code que le serveur refuserait ensuite, sans que rien ne l'explique.
    fireEvent.change(champEmail, { target: { value: 'moi@exemple.test' } })
    await continuer(u)
    expect(demande).toHaveBeenCalledWith({ email: 'moi@exemple.test', purpose: 'PASSWORD_RESET' })
    expect(cases()).toBe(6)
  })

  it('mène jusqu’au nouveau mot de passe, et le retour reste possible', async () => {
    const u = monter()
    fireEvent.change(screen.getByLabelText(/nom d’utilisateur|nom d'utilisateur/i), { target: { value: 'admin' } })
    await continuer(u)

    // Six chiffres saisis : l'écran passe seul à l'étape suivante.
    fireEvent.change(document.querySelector('input[data-slot="input-otp"]') as HTMLInputElement, { target: { value: '123456' } })

    expect(await screen.findByLabelText(/nouveau mot de passe/i)).toBeInTheDocument()

    // Se tromper d'étape ne doit jamais coincer.
    await u.click(screen.getByRole('button', { name: /^Retour$/i }))
    expect(cases()).toBe(6)
  })
})
