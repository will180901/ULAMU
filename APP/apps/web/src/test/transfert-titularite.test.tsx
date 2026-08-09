/**
 * Transfert de titularité — M02, EF-02-06 / CU-02-05.
 *
 * Sans cet écran, un titulaire qui quittait son officine emportait l'espace avec lui : la structure
 * lui restait attachée et personne ne pouvait reprendre la main sans intervention en base.
 *
 * Trois propriétés sont verrouillées :
 *  • **Réservé au titulaire** (EF-02-05) — un simple membre ne doit même pas voir la section.
 *  • **Les DEUX codes sont exigés.** « Les deux confirment » n'est pas une formule : c'est ce qui
 *    empêche une officine de changer de main à l'insu de l'une des parties.
 *  • **On ne se transfère pas à soi-même** — le titulaire ne figure pas parmi les candidats.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PharmaciePage } from '@/modules/facility/pages/PharmaciePage'
import { api, type Facility, type MeResponse } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const TITULAIRE: MeResponse = {
  accountId: 'acc-titulaire',
  accountType: 'FACILITY_MEMBER',
  adminRole: null,
  username: 'pharma.demo',
  phone: '+242060000000',
  firstName: 'Bruno',
  lastName: 'Ossona',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const OFFICINE: Facility = {
  id: 'f1',
  name: 'Pharmacie du Centre',
  district: 'Bacongo',
  quarter: 'Diata',
  hours: '8h – 20h',
  status: 'ACTIVE',
  members: [
    { id: 'm-titulaire', accountId: 'acc-titulaire', firstName: 'Bruno', lastName: 'Ossona', role: 'HOLDER', rights: ['stock', 'dispense', 'stats'], active: true },
    { id: 'm-adjoint', accountId: 'acc-adjoint', firstName: 'Alice', lastName: 'Nkodia', role: 'MEMBER', rights: ['stock'], active: true },
  ],
} as Facility

function monter(me: MeResponse = TITULAIRE) {
  useSessionStore.getState().setSession('jeton', me)
  return render(
    <MemoryRouter>
      <PharmaciePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'myFacility').mockResolvedValue(OFFICINE)
})

describe('transfert de titularité (EF-02-06)', () => {
  it('n’apparaît PAS pour un simple membre (EF-02-05)', async () => {
    monter({ ...TITULAIRE, accountId: 'acc-adjoint', firstName: 'Alice', lastName: 'Nkodia' })
    await waitFor(() => expect(screen.getByText('Pharmacie du Centre')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /Transférer la titularité/i })).not.toBeInTheDocument()
  })

  it('propose les autres membres, jamais soi-même', async () => {
    monter()
    await screen.findByRole('heading', { name: /Transférer la titularité/i })

    expect(screen.getByRole('button', { name: /Alice Nkodia/i })).toBeInTheDocument()
    // Se transférer à soi-même n'aurait aucun sens : le titulaire est exclu des candidats.
    expect(screen.queryByRole('button', { name: /Bruno Ossona/i })).not.toBeInTheDocument()
  })

  it('annonce que les DEUX parties reçoivent un code', async () => {
    monter()
    const titre = await screen.findByRole('heading', { name: /Transférer la titularité/i })
    const section = titre.closest('section') as HTMLElement
    expect(section.textContent).toMatch(/deux parties doivent confirmer/i)
    expect(section.textContent).toMatch(/à l’insu de l’un des deux/i)
  })

  it('exige les deux codes avant d’autoriser le transfert', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'startTransfer').mockResolvedValue({ intentId: 'i1', expiresInSeconds: 300 })
    const confirmer = vi.spyOn(api, 'confirmTransfer').mockResolvedValue(OFFICINE)
    monter()
    await screen.findByRole('heading', { name: /Transférer la titularité/i })

    await u.click(screen.getByRole('button', { name: /Alice Nkodia/i }))
    await u.click(screen.getByRole('button', { name: /Envoyer les deux codes/i }))

    const bouton = await screen.findByRole('button', { name: /Transférer définitivement/i })
    expect(bouton).toBeDisabled()

    await u.type(screen.getByLabelText(/Votre code/i), '111111')
    expect(bouton).toBeDisabled() // un seul code ne suffit pas

    await u.type(screen.getByLabelText(/Code de la personne visée/i), '222222')
    expect(bouton).toBeEnabled()

    await u.click(bouton)
    expect(confirmer).toHaveBeenCalledWith('f1', { intentId: 'i1', ownerOtpCode: '111111', targetOtpCode: '222222' })
  })

  it('prévient qu’un changement de cible impose de recommencer', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'startTransfer').mockResolvedValue({ intentId: 'i1', expiresInSeconds: 300 })
    monter()
    await screen.findByRole('heading', { name: /Transférer la titularité/i })

    await u.click(screen.getByRole('button', { name: /Alice Nkodia/i }))
    await u.click(screen.getByRole('button', { name: /Envoyer les deux codes/i }))

    // L'intention est liée à UNE cible côté serveur : le dire évite de croire qu'un code générique
    // fonctionnerait pour n'importe qui.
    expect(await screen.findByText(/impose de\s+recommencer/i)).toBeInTheDocument()
  })
})
