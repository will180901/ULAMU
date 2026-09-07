/**
 * Le recours d'un compte exclu — chantier 63, 07/09/2026 (CU-16-04, loi n° 29-2019).
 *
 * ── Le défaut réparé ──────────────────────────────────────────────────────────────────────────
 *
 * Un compte suspendu reçoit *« Contactez le support pour connaître le motif et les voies de
 * recours »*, et un compte clôturé lit *« contactez le support »* à la connexion. Mais la garde
 * refuse **chacune** de leurs requêtes, la seule voie de support exigeait une session, et l'adresse
 * des mentions légales n'existe pas.
 *
 * ⚠️ Une personne exclue était invitée **par écrit** à exercer un recours qu'aucun chemin ne lui
 * permettait d'exercer.
 *
 * ── Ce qui est verrouillé ici ──────────────────────────────────────────────────────────────────
 *
 *  1. **la porte s'ouvre au bon moment** — sur un refus qui vient du COMPTE (403), jamais sur un
 *     mot de passe faux (401) ni sur un réseau coupé ;
 *  2. **la demande part SANS jeton** — la personne n'en a pas, c'est tout le problème ;
 *  3. **le code demandé porte l'usage dédié** — partagé avec « mot de passe oublié », une demande de
 *     support mangerait le code de réinitialisation (quota PM-19 compté par usage) ;
 *  4. **l'écran annonce que la réponse arrivera par email** — la déposer dans l'application la
 *     mettrait dans un endroit que cette personne ne peut pas atteindre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecoursPage } from '@/modules/auth/pages/RecoursPage'
import { ApiError, api } from '@/lib/api'
import { proposerLeRecours } from '@/lib/recours'

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RecoursPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Quand proposer le recours', () => {
  /*
    Le signal est le STATUT, jamais le message français : une reformulation le ferait dériver en
    silence, et ce serait le recours qui disparaîtrait sans que rien ne le signale.
  */
  it('sur un compte suspendu ou clôturé — le serveur répond 403', () => {
    expect(proposerLeRecours(new ApiError(403, 'FORBIDDEN', 'Compte suspendu (RM-01-05)'))).toBe(true)
    expect(proposerLeRecours(new ApiError(403, 'FORBIDDEN', 'Compte clôturé — contactez le support (PM-21)'))).toBe(true)
  })

  it('PAS sur un mot de passe faux, ni sur un réseau coupé', () => {
    expect(proposerLeRecours(new ApiError(401, 'UNAUTHORIZED', 'Identifiants incorrects'))).toBe(false)
    expect(proposerLeRecours(new Error('réseau'))).toBe(false)
    expect(proposerLeRecours(null)).toBe(false)
  })
})

describe('E-recours — écrire sans pouvoir se connecter', () => {
  it('demande un code avec l’usage DÉDIÉ au support', async () => {
    const utilisateur = userEvent.setup()
    const demander = vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
    monter()

    await utilisateur.type(screen.getByLabelText(/Adresse email/i), 'titulaire@exemple.cg')
    await utilisateur.click(screen.getByRole('button', { name: /Recevoir un code/i }))

    /*
      `SUPPORT_ACCESS` et non `PASSWORD_RESET` : partagés, une demande de support mangerait le code
      de réinitialisation que la personne venait de demander — et inversement.
    */
    expect(demander).toHaveBeenCalledWith({ email: 'titulaire@exemple.cg', purpose: 'SUPPORT_ACCESS' })
  })

  it('annonce que la réponse arrivera par email, AVANT d’envoyer', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
    monter()

    await utilisateur.type(screen.getByLabelText(/Adresse email/i), 'titulaire@exemple.cg')
    await utilisateur.click(screen.getByRole('button', { name: /Recevoir un code/i }))

    // C'est ce qui décide d'écrire maintenant ou d'attendre d'avoir accès à sa boîte.
    expect(await screen.findByText(/la réponse vous sera donc envoyée par email/i)).toBeInTheDocument()
  })

  it('dit d’emblée qu’aucune connexion n’est ouverte', () => {
    monter()
    expect(screen.getByText(/Aucune connexion n’est ouverte/i)).toBeInTheDocument()
  })

  /*
    Le sujet « titulaire de structure injoignable » n'est pas offert : plus personne n'administre de
    structure depuis D-051, et la procédure guidée correspondante a été retirée. Une case qui mène à
    une file morte est une promesse de réponse qu'on ne tiendra pas.
  */
  it('n’offre pas de sujet qui ne mène nulle part', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
    monter()

    await utilisateur.type(screen.getByLabelText(/Adresse email/i), 'titulaire@exemple.cg')
    await utilisateur.click(screen.getByRole('button', { name: /Recevoir un code/i }))
    await screen.findByLabelText(/De quoi s’agit-il/i)

    expect(document.body.textContent).not.toMatch(/titulaire injoignable/i)
  })
})
