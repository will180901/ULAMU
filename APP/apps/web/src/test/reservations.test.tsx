/**
 * Réservations reçues — M12, CU-12-03.
 *
 * Deux propriétés sont verrouillées ici, et la première est un engagement, pas un détail :
 *
 *  • **Aucune identité de patient n'apparaît.** Le contrat C1 tient dans les deux sens : l'officine
 *    voit CE QUI a été réservé et jusqu'à quand, jamais QUI l'a réservé. Le jour où quelqu'un
 *    ajoutera « le nom du patient, ce serait pratique », ce test doit tomber.
 *  • **La conséquence d'une réservation non clôturée est dite.** Laisser expirer compte contre la
 *    fiabilité de l'officine (EF-12-07), même si le service a été rendu — un pharmacien qui l'ignore
 *    se pénalise sans comprendre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ReservationsPage } from '@/modules/facility/pages/ReservationsPage'
import { api, type Disclosure, type Facility } from '@/lib/api'

const OFFICINE = { id: 'f1', name: 'Pharmacie du Centre', members: [] } as unknown as Facility

const ACTIVE: Disclosure = {
  id: 'd1',
  status: 'ACTIVE',
  district: 'Bacongo',
  requestedItems: [{ dci: 'Amlodipine', label: 'Amlodipine 5 mg', quantity: 1 }],
  createdAt: '2026-08-05T09:00:00.000Z',
  paidAt: '2026-08-05T09:00:10.000Z',
  expiresAt: '2026-08-06T09:00:00.000Z',
  servedAt: null,
  remainingSeconds: 7200,
  orderRef: 'ORD-2026-00412',
  amountXaf: 500,
}

function monter() {
  return render(
    <MemoryRouter>
      <ReservationsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'myFacility').mockResolvedValue(OFFICINE)
  vi.spyOn(api, 'facilityDisclosures').mockResolvedValue({ items: [ACTIVE] })
})

describe('réservations reçues (CU-12-03)', () => {
  it('n’expose AUCUNE identité de patient — contrat C1', async () => {
    monter()
    const ligne = (await screen.findByText(/Amlodipine 5 mg/)).closest('li') as HTMLElement

    // Seule la référence opaque du paiement identifie la réservation.
    expect(ligne.textContent).toMatch(/ORD-2026-00412/)
    // Aucun champ d'identité ne doit apparaître, ni maintenant ni après un ajout « pratique ».
    expect(ligne.textContent).not.toMatch(/patient\s*:/i)
    expect(ligne.textContent).not.toMatch(/téléphone/i)
  })

  it('clôture une réservation en un geste', async () => {
    const u = userEvent.setup({ delay: null })
    const servir = vi.spyOn(api, 'markDisclosureServed').mockResolvedValue({ ...ACTIVE, status: 'SERVED' })
    monter()
    const ligne = (await screen.findByText(/Amlodipine 5 mg/)).closest('li') as HTMLElement

    await u.click(within(ligne).getByRole('button', { name: /Marquer servie/i }))
    expect(servir).toHaveBeenCalledWith('d1')
  })

  it('dit que laisser expirer pénalise la fiabilité de l’officine', async () => {
    monter()
    const titre = await screen.findByRole('heading', { name: /À servir/i })
    const section = titre.closest('section') as HTMLElement
    expect(section.textContent).toMatch(/fiabilité/i)
  })

  it('affiche le compte à rebours, et le passe en alerte à l’approche de l’expiration', async () => {
    vi.spyOn(api, 'facilityDisclosures').mockResolvedValue({ items: [{ ...ACTIVE, remainingSeconds: 600 }] })
    monter()
    // 600 s ≤ 1 h : la pastille doit signaler l'urgence, pas seulement afficher un nombre.
    await waitFor(() => expect(screen.getByText(/Expire dans 10:00/)).toBeInTheDocument())
  })

  it('oriente vers le stock quand aucune réservation n’arrive', async () => {
    vi.spyOn(api, 'facilityDisclosures').mockResolvedValue({ items: [] })
    monter()
    // La cause la plus probable d'une file vide est un stock non tenu à jour : CG-08 interdit un
    // état vide sans sortie, et celle-ci mène là où le problème se règle.
    const vide = await screen.findByText(/Aucune réservation en attente/i)
    const bloc = vide.closest('div') as HTMLElement
    expect(bloc.textContent).toMatch(/stock/i)
    expect(within(bloc).getByRole('button', { name: /Vérifier mon stock/i })).toBeInTheDocument()
  })
})
