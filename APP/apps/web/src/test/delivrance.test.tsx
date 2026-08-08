/**
 * Délivrance d'ordonnance — M09, CU-09-02 / EF-09-07.
 *
 * C'est le dernier maillon du parcours médicament : sans lui, une ordonnance scellée par un soignant
 * ne pouvait être servie nulle part. Trois règles sont verrouillées :
 *
 *  1. **La validité est tranchée par le SERVEUR** (`dispensable`, RM-09-02), jamais recalculée ici.
 *     Une ordonnance périmée ne doit pas passer parce que le poste de l'officine retarde.
 *  2. **On ne sert jamais plus que le restant.** Une ordonnance se délivre en plusieurs fois : servir
 *     deux fois la même boîte, c'est délivrer un médicament qui n'a pas été prescrit.
 *  3. **Le déjà-servi est visible**, sinon rien ne distingue une ordonnance neuve d'une ordonnance
 *     déjà honorée à moitié.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DelivrancePage } from '@/modules/facility/pages/DelivrancePage'
import { api, type Facility, type ScannedPrescription } from '@/lib/api'

const PHARMACIE = { id: 'f1', type: 'PHARMACY', name: 'Pharmacie du Fleuve', district: 'Bacongo', quarter: 'Diata', hours: null, status: 'ACTIVE', members: [] } satisfies Facility

const VALIDE: ScannedPrescription = {
  prescriptionId: 'ord1',
  status: 'ACTIVE',
  dispensable: true,
  expiresAt: '2026-09-01T00:00:00.000Z',
  lines: [
    { id: 'l1', medicamentId: 'm1', freeText: null, posology: '1 cp matin et soir', durationDays: 5, qtyPrescribed: 10, qtyDispensed: 4, remaining: 6 },
  ],
}

function monter() {
  return render(
    <MemoryRouter>
      <DelivrancePage />
    </MemoryRouter>,
  )
}

async function scanner(u: ReturnType<typeof userEvent.setup>, resultat: ScannedPrescription) {
  vi.spyOn(api, 'scanPrescription').mockResolvedValue(resultat)
  await u.type(screen.getByLabelText(/Code de l’ordonnance/i), 'QR-123')
  await u.click(screen.getByRole('button', { name: /Vérifier/i }))
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'myFacility').mockResolvedValue(PHARMACIE)
})

describe('délivrance en pharmacie', () => {
  it('montre ce qui a DÉJÀ été servi et ce qu’il reste (EF-09-07)', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await scanner(u, VALIDE)

    await waitFor(() => expect(screen.getByText(/4 déjà servi · 6 restant/i)).toBeInTheDocument())
  })

  it('pré-remplit au restant, mais refuse d’aller au-delà', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await scanner(u, VALIDE)

    const champ = await screen.findByLabelText(/Quantité à délivrer/i)
    expect(champ).toHaveValue('6') // le cas courant est de tout servir

    await u.clear(champ)
    await u.type(champ, '9')
    expect(screen.getByText(/Il ne reste que 6 à servir/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Délivrer/i })).toBeDisabled()
  })

  it('refuse de servir une ordonnance que le SERVEUR juge non délivrable (RM-09-02)', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await scanner(u, { ...VALIDE, dispensable: false, status: 'EXPIRED' })

    await waitFor(() => expect(screen.getByText('Non délivrable')).toBeInTheDocument())
    // Aucun champ de saisie, aucun bouton : on ne propose pas une action que le serveur refusera.
    expect(screen.queryByLabelText(/Quantité à délivrer/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Délivrer/i })).not.toBeInTheDocument()
    expect(screen.getByText(/revenir vers son soignant/i)).toBeInTheDocument()
  })

  it('envoie uniquement les lignes réellement servies', async () => {
    const u = userEvent.setup({ delay: null })
    const servir = vi.spyOn(api, 'dispense').mockResolvedValue({ status: 'PARTIALLY_DISPENSED' })
    monter()
    await scanner(u, VALIDE)

    const champ = await screen.findByLabelText(/Quantité à délivrer/i)
    await u.clear(champ)
    await u.type(champ, '2')
    await u.click(screen.getByRole('button', { name: /Délivrer/i }))

    expect(servir).toHaveBeenCalledWith('QR-123', {
      facilityId: 'f1',
      lines: [{ prescriptionLineId: 'l1', quantity: 2 }],
    })
  })
})
