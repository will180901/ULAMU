/**
 * Ma vitrine — M05 (CU-05-01 / CU-05-03 / CU-05-04).
 *
 * Trois règles métier sont verrouillées ici, et chacune protège d'une erreur qui coûterait cher au
 * soignant ou au patient :
 *
 *  1. **Le prix saisi est le prix FINAL, commission incluse** (D-010 / RM-05-03). C'est
 *     contre-intuitif : beaucoup de plateformes demandent le net perçu. Si l'écran cesse de le dire,
 *     un soignant saisira son net attendu et découvrira l'écart sur son premier virement.
 *  2. **Retirer une offre ne la supprime pas** — le serveur appelle `deactivateOffer`. Écrire
 *     « Supprimer » serait un mensonge sur une action que l'utilisateur croit irréversible.
 *  3. **Les trois états de présence sont visibles en même temps**, avec leur conséquence. Cacher
 *     « Ne pas déranger » derrière un menu déroulant, c'est garantir que personne ne l'utilise.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { VitrinePage } from '@/modules/directory/pages/VitrinePage'
import { api, type Offer, type Presence } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import type { MeResponse } from '@/lib/api'

const ME: MeResponse = {
  accountId: 'p1',
  accountType: 'PROFESSIONAL',
  adminRole: null,
  username: 'dr.konate',
  phone: '+242060000010',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: 'Bacongo',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecine générale',
  biography: null,
  totpEnabled: true,
}

const PRESENCE: Presence = {
  state: 'OFFLINE',
  since: '2026-08-05T10:00:00.000Z',
  lastHeartbeatAt: '2026-08-05T10:00:00.000Z',
  availableForInitiation: false,
}

const OFFRE: Offer = {
  id: 'o1',
  professionalId: 'p1',
  label: 'Consultation générale',
  durationMin: 30,
  priceXaf: 5000,
  kind: 'STANDARD',
  active: true,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
}

function monter() {
  useSessionStore.getState().setSession('jeton', ME)
  return render(
    <MemoryRouter>
      <VitrinePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'myPresence').mockResolvedValue(PRESENCE)
  vi.spyOn(api, 'myOffers').mockResolvedValue([OFFRE])
})

describe('ma vitrine', () => {
  it('annonce que le prix saisi est le prix FINAL payé par le patient (D-010)', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await waitFor(() => expect(screen.getByText(/Mes offres de soin/i)).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /Nouvelle offre/i }))
    const champPrix = screen.getByLabelText(/Prix payé par le patient/i)
    const aide = document.getElementById(champPrix.getAttribute('aria-describedby') ?? '')
    expect(aide?.textContent).toMatch(/commission/i)
  })

  it('dit « Retirer », jamais « Supprimer » — le serveur désactive et ne détruit pas', async () => {
    monter()
    const ligne = await screen.findByText('Consultation générale')
    const li = ligne.closest('li') as HTMLElement

    expect(within(li).getByRole('button', { name: /Retirer/i })).toBeInTheDocument()
    expect(within(li).queryByRole('button', { name: /Supprimer/i })).not.toBeInTheDocument()
  })

  it('appelle bien la désactivation, et non une suppression', async () => {
    const u = userEvent.setup({ delay: null })
    const off = vi.spyOn(api, 'deactivateOffer').mockResolvedValue(undefined)
    monter()
    const li = (await screen.findByText('Consultation générale')).closest('li') as HTMLElement

    await u.click(within(li).getByRole('button', { name: /Retirer/i }))
    expect(off).toHaveBeenCalledWith('o1')
  })

  it('montre les TROIS états de présence en même temps, avec leur conséquence', async () => {
    monter()
    await waitFor(() => expect(screen.getByText(/Ma présence/i)).toBeInTheDocument())

    for (const libelle of [/En ligne/i, /Ne pas déranger/i, /Hors ligne/i]) {
      expect(screen.getByRole('button', { name: libelle })).toBeInTheDocument()
    }
    // La conséquence, pas seulement l'étiquette : « visible mais aucune sollicitation » est ce qui
    // distingue « ne pas déranger » de « hors ligne ».
    expect(screen.getByText(/aucune sollicitation/i)).toBeInTheDocument()
  })

  it('avertit qu’une offre absente rend le soignant insollicitable', async () => {
    vi.spyOn(api, 'myOffers').mockResolvedValue([])
    monter()
    await waitFor(() => expect(screen.getByText(/ne peuvent pas vous solliciter/i)).toBeInTheDocument())
  })
})
