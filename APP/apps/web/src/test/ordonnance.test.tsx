/**
 * Rédaction d'ordonnance — M09, EF-09-02 / EF-09-03.
 *
 * Le garde-fou allergies est la règle la plus lourde de conséquences de tout le produit : une
 * prescription qui heurte une allergie active peut tuer. Le serveur refuse (409) tant que chaque
 * conflit n'est pas motivé — ces tests garantissent que l'interface **transforme ce refus en
 * décision clinique consciente**, et non en bandeau rouge qu'on ferme d'un clic.
 *
 * Le dernier test protège une subtilité facile à perdre de vue : une ligne en TEXTE LIBRE échappe au
 * garde-fou (« SANS garde-fou automatique », EF-09-02). Le formulaire doit le dire à l'endroit exact
 * où l'on s'apprête à contourner le référentiel.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlocOrdonnance } from '@/modules/sessions/components/BlocOrdonnance'
import { api, ApiError } from '@/lib/api'

const CONFLIT = {
  code: 'ALLERGY_GUARD' as const,
  message: 'Alerte allergie',
  conflicts: [{ medicamentId: 'm1', medicamentLabel: 'Amoxicilline 500 mg', allergies: ['Pénicilline'] }],
}

function monter() {
  return render(<BlocOrdonnance sessionId="s1" onDeposee={() => {}} />)
}

async function ouvrirEtRemplirUneLigneLibre(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByRole('button', { name: /Rédiger/i }))
  await u.type(screen.getByLabelText(/saisie libre/i), 'Amoxicilline 500 mg')
  await u.type(screen.getByLabelText(/Posologie/i), '1 cp matin et soir')
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'searchMedicaments').mockResolvedValue({ items: [] })
})

describe('rédaction d’ordonnance', () => {
  it('avertit qu’une ligne hors référentiel n’est PAS comparée aux allergies (EF-09-02)', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await u.click(screen.getByRole('button', { name: /Rédiger/i }))

    const libre = screen.getByLabelText(/saisie libre/i)
    const aide = document.getElementById(libre.getAttribute('aria-describedby') ?? '')
    expect(aide?.textContent).toMatch(/n’est PAS comparée aux allergies/i)
  })

  it('transforme le refus du serveur en confirmation motivée, pas en simple erreur', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'createPrescription').mockRejectedValue(new ApiError(409, 'CONFLICT', 'Alerte allergie', CONFLIT))
    monter()
    await ouvrirEtRemplirUneLigneLibre(u)

    await u.click(screen.getByRole('button', { name: /Délivrer l’ordonnance/i }))

    // Le médicament ET l'allergie en cause sont nommés : « alerte allergie » seul ne permet aucune
    // décision clinique.
    await waitFor(() => expect(screen.getByText(/Amoxicilline 500 mg — allergie : Pénicilline/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Confirmer et délivrer/i })).toBeDisabled()
  })

  it('exige un motif ÉCRIT pour chaque conflit avant de maintenir la prescription (EF-09-03)', async () => {
    const u = userEvent.setup({ delay: null })
    const creer = vi
      .spyOn(api, 'createPrescription')
      .mockRejectedValueOnce(new ApiError(409, 'CONFLICT', 'Alerte allergie', CONFLIT))
      .mockResolvedValueOnce({ id: 'ord1' })
    monter()
    await ouvrirEtRemplirUneLigneLibre(u)
    await u.click(screen.getByRole('button', { name: /Délivrer l’ordonnance/i }))
    await waitFor(() => expect(screen.getByLabelText(/Motif de maintien/i)).toBeInTheDocument())

    await u.type(screen.getByLabelText(/Motif de maintien/i), 'Allergie ancienne non confirmée')
    const confirmer = screen.getByRole('button', { name: /Confirmer et délivrer/i })
    expect(confirmer).toBeEnabled()

    await u.click(confirmer)
    // Le motif part au serveur, où il est tracé (AllergyOverride + audit C5).
    await waitFor(() =>
      expect(creer).toHaveBeenLastCalledWith('s1', {
        lines: [{ freeText: 'Amoxicilline 500 mg', posology: '1 cp matin et soir' }],
        overrides: [{ medicamentId: 'm1', reason: 'Allergie ancienne non confirmée' }],
      }),
    )
  })

  it('refuse de délivrer une ordonnance vide', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await u.click(screen.getByRole('button', { name: /Rédiger/i }))
    expect(screen.getByRole('button', { name: /Délivrer l’ordonnance/i })).toBeDisabled()
  })
})
