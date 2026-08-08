/**
 * Ma pharmacie — M02, EF-02-05 / RM-02-04.
 *
 * La règle testée en premier est celle qui protège l'officine : **gérer les membres est réservé au
 * titulaire**. Un membre qui pourrait retirer ses collègues, ou s'attribuer le droit de délivrance,
 * viderait de son sens toute la chaîne de responsabilité de la dispensation.
 *
 * Le dernier test protège le titulaire lui-même : `null` (aucune structure) n'est PAS une erreur,
 * c'est le cas normal avant création. Confondre les deux afficherait un écran de panne à quelqu'un
 * qui doit simplement remplir un formulaire.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PharmaciePage } from '@/modules/facility/pages/PharmaciePage'
import { api, type Facility, type MeResponse } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'

const ME: MeResponse = {
  accountId: 'a-membre',
  accountType: 'FACILITY_MEMBER',
  adminRole: null,
  username: 'pharma.demo',
  phone: '+242060000020',
  firstName: 'Bruno',
  lastName: 'Ossona',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
}

const PHARMACIE: Facility = {
  id: 'f1',
  type: 'PHARMACY',
  name: 'Pharmacie du Fleuve',
  district: 'Bacongo',
  quarter: 'Diata',
  hours: 'Lun–Sam 8h–20h',
  status: 'ACTIVE',
  members: [
    { id: 'm-titulaire', accountId: 'a-titulaire', firstName: 'Alice', lastName: 'Mabiala', role: 'HOLDER', rights: ['stock', 'dispense', 'stats'], active: true },
    { id: 'm-moi', accountId: 'a-membre', firstName: 'Bruno', lastName: 'Ossona', role: 'MEMBER', rights: ['stock'], active: true },
  ],
}

function monter(compte: MeResponse = ME) {
  useSessionStore.getState().setSession('jeton', compte)
  return render(
    <MemoryRouter>
      <PharmaciePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ma pharmacie', () => {
  it('interdit à un simple MEMBRE d’inviter ou de retirer quiconque (EF-02-05)', async () => {
    vi.spyOn(api, 'myFacility').mockResolvedValue(PHARMACIE)
    monter()
    await waitFor(() => expect(screen.getByText('Pharmacie du Fleuve')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: /Inviter/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retirer/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Seul le titulaire/i)).toBeInTheDocument()
  })

  it('laisse les droits en LECTURE SEULE pour un membre — bouton désactivé, pas inerte', async () => {
    vi.spyOn(api, 'myFacility').mockResolvedValue(PHARMACIE)
    monter()
    await waitFor(() => expect(screen.getByText('Pharmacie du Fleuve')).toBeInTheDocument())

    // `disabled` est ANNONCÉ par les lecteurs d'écran ; un élément simplement inerte ne dit rien.
    const ligneTitulaire = screen.getByText('Alice Mabiala').closest('li') as HTMLElement
    expect(within(ligneTitulaire).getByRole('button', { name: 'Délivrance' })).toBeDisabled()
  })

  it('permet au TITULAIRE d’inviter', async () => {
    vi.spyOn(api, 'myFacility').mockResolvedValue(PHARMACIE)
    monter({ ...ME, accountId: 'a-titulaire' })
    await waitFor(() => expect(screen.getByText('Pharmacie du Fleuve')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Inviter/i })).toBeInTheDocument()
  })

  it('avertit qu’une structure non vérifiée est invisible des patients (RM-02-04)', async () => {
    vi.spyOn(api, 'myFacility').mockResolvedValue({ ...PHARMACIE, status: 'PENDING' })
    monter()
    await waitFor(() => expect(screen.getByText(/invisible des patients/i)).toBeInTheDocument())
  })

  it('traite l’absence de structure comme un cas NORMAL, pas comme une panne', async () => {
    vi.spyOn(api, 'myFacility').mockResolvedValue(null)
    monter()
    // Formulaire de création, et surtout pas un écran d'erreur.
    await waitFor(() => expect(screen.getByRole('button', { name: /Créer ma pharmacie/i })).toBeInTheDocument())
    expect(screen.queryByText(/Impossible d’afficher/i)).not.toBeInTheDocument()
    // CU-02-01 : la vérification est annoncée AVANT de cliquer, pas découverte après.
    expect(screen.getByText(/devra être vérifiée/i)).toBeInTheDocument()
  })
})
