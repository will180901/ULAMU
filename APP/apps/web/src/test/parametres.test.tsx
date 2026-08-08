/**
 * Mes paramètres — sécurité du compte (CU-01-05/06/07).
 *
 * La règle centrale testée ici vient de `CU-01-06` : la session COURANTE ne doit pas offrir de bouton
 * de révocation. Se déconnecter soi-même depuis une liste d'appareils, en croyant couper celui du
 * voisin, laisserait la vraie session suspecte ouverte — l'exact contraire du geste voulu.
 *
 * Et la révocation d'un autre appareil passe par une confirmation en deux temps : réversible, donc
 * pas de modale, mais jamais au premier clic non plus.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { api, type SessionInfo } from '@/lib/api'

const SESSIONS: SessionInfo[] = [
  { id: 's-courante', client: 'web', deviceLabel: 'ULAMU Web', lastActiveAt: '2026-08-05T10:00:00.000Z', current: true },
  { id: 's-autre', client: 'mobile', deviceLabel: 'Galaxy S8', lastActiveAt: '2026-08-04T18:00:00.000Z', current: false },
]

function monter() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'sessions').mockResolvedValue(SESSIONS)
})

describe('mes paramètres — sécurité du compte', () => {
  it('n’offre AUCUN bouton de déconnexion sur la session courante (CU-01-06)', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('ULAMU Web')).toBeInTheDocument())

    const ligneCourante = screen.getByText('ULAMU Web').closest('li') as HTMLElement
    expect(within(ligneCourante).getByText('Cet appareil')).toBeInTheDocument()
    expect(within(ligneCourante).queryByRole('button', { name: /Déconnecter/i })).not.toBeInTheDocument()
  })

  it('exige une confirmation avant de couper un autre appareil', async () => {
    const u = userEvent.setup({ delay: null })
    const revoke = vi.spyOn(api, 'revokeSession').mockResolvedValue(undefined)
    monter()
    await waitFor(() => expect(screen.getByText('Galaxy S8')).toBeInTheDocument())

    const ligne = screen.getByText('Galaxy S8').closest('li') as HTMLElement
    await u.click(within(ligne).getByRole('button', { name: /Déconnecter/i }))

    // Premier clic : rien n'est encore parti au serveur, on demande confirmation.
    expect(revoke).not.toHaveBeenCalled()
    await u.click(within(ligne).getByRole('button', { name: /^Confirmer$/i }))
    expect(revoke).toHaveBeenCalledWith('s-autre')
  })

  it('rappelle que le changement de numéro exige les DEUX codes (EF-01-07)', async () => {
    monter()
    const titre = await screen.findByRole('heading', { name: /Numéro de téléphone/i })
    // On lit le TEXTE DE LA SECTION entière : la phrase est volontairement coupée par un <strong>
    // sur le « et », donc aucun nœud isolé ne la contient en entier.
    const section = titre.closest('section') as HTMLElement
    expect(section.textContent).toMatch(/ancien/i)
    expect(section.textContent).toMatch(/nouveau/i)
  })

  it('annonce la conséquence d’une clôture avant de proposer le moindre bouton', async () => {
    monter()
    await waitFor(() => expect(screen.getByText(/Clôturer mon compte/i)).toBeInTheDocument())
    expect(screen.getByText(/sessions sont révoquées/i)).toBeInTheDocument()
    expect(screen.getByText(/30 jours/i)).toBeInTheDocument()
  })
})
