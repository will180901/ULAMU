/**
 * Paramètres métier — M16, EF-16-04 / CU-16-02.
 *
 * `PM-01` à `PM-40` pilotent tout le comportement du produit. Deux règles sont verrouillées ici :
 *
 *  • **Le motif est obligatoire** (RM-16-03). Dans six mois, c'est la seule trace de la raison d'un
 *    seuil. Un bouton actif sans motif garantirait des historiques vides.
 *  • **Les taux contractuels sont signalés AVANT le clic** (D-022) : les modifier ré-édite les
 *    contrats déjà signés sous forme d'avenants. Découvrir cela après coup, quand des dizaines
 *    d'avenants sont partis, n'est pas rattrapable.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ParametresMetierPage } from '@/modules/admin/pages/ParametresMetierPage'
import { api, type PlatformParameter } from '@/lib/api'

const ORDINAIRE: PlatformParameter = {
  key: 'PM-18',
  value: '5,900,900',
  description: 'Blocage de connexion : échecs, fenêtre, durée',
  effectiveAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
}

const TAUX: PlatformParameter = {
  key: 'PM-01',
  value: '10',
  description: 'Taux de commission ULAMU (%)',
  effectiveAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
}

function monter() {
  return render(
    <MemoryRouter>
      <ParametresMetierPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'parameters').mockResolvedValue([TAUX, ORDINAIRE])
})

describe('paramètres métier (EF-16-04)', () => {
  it('affiche la clé, la description ET la valeur actuelle', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('PM-18')).toBeInTheDocument())
    expect(screen.getByText(/Blocage de connexion/)).toBeInTheDocument()
    // Sans la valeur courante, impossible de savoir ce qu'on est en train de changer.
    const ligne = screen.getByText('PM-18').closest('li') as HTMLElement
    expect(ligne.textContent).toMatch(/5,900,900/)
  })

  it('refuse d’enregistrer sans motif (RM-16-03)', async () => {
    const u = userEvent.setup({ delay: null })
    const maj = vi.spyOn(api, 'updateParameter').mockResolvedValue({})
    monter()
    const ligne = (await screen.findByText('PM-18')).closest('li') as HTMLElement

    await u.click(within(ligne).getByRole('button', { name: /Modifier/i }))
    await u.clear(within(ligne).getByLabelText(/Nouvelle valeur/i))
    await u.type(within(ligne).getByLabelText(/Nouvelle valeur/i), '3,900,900')

    // Valeur changée, motif vide : rien ne doit partir.
    expect(within(ligne).getByRole('button', { name: /Enregistrer/i })).toBeDisabled()

    await u.type(within(ligne).getByLabelText(/Motif du changement/i), 'Trop de blocages signalés')
    const enregistrer = within(ligne).getByRole('button', { name: /Enregistrer/i })
    expect(enregistrer).toBeEnabled()

    await u.click(enregistrer)
    expect(maj).toHaveBeenCalledWith(
      'PM-18',
      expect.objectContaining({ value: '3,900,900', reason: 'Trop de blocages signalés' }),
    )
  })

  it('avertit qu’un taux contractuel déclenche des avenants (D-022)', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    const ligne = (await screen.findByText('PM-01')).closest('li') as HTMLElement

    // Signalé dès la liste, sans avoir à ouvrir.
    expect(within(ligne).getByText(/Taux contractuel/i)).toBeInTheDocument()

    await u.click(within(ligne).getByRole('button', { name: /Modifier/i }))
    // Et l'avertissement complet AVANT le moindre clic sur Enregistrer.
    expect(ligne.textContent).toMatch(/contrats déjà signés/i)
    expect(ligne.textContent).toMatch(/avenants/i)
  })

  it('ne signale PAS un paramètre ordinaire comme contractuel', async () => {
    monter()
    const ligne = (await screen.findByText('PM-18')).closest('li') as HTMLElement
    expect(within(ligne).queryByText(/Taux contractuel/i)).not.toBeInTheDocument()
  })
})
