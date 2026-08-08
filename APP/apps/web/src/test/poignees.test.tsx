/**
 * Poignées de main reçues — M06, CU-06-01. ⭐
 *
 * C'est la contrepartie de l'écran patient : ce qui est testé ici décide si une consultation peut
 * exister. Deux règles sont verrouillées, et chacune protège une personne différente :
 *
 *  • **Un refus sans motif est impossible.** Le serveur l'exige déjà, mais le bouton doit rester
 *    inerte tant que le champ est vide — sinon l'utilisateur découvre l'obligation par une erreur
 *    rouge après coup. Côté patient, un refus sec ne dit pas s'il faut attendre, reformuler, ou
 *    chercher quelqu'un d'autre.
 *  • **Le compte à rebours PM-07 est affiché.** La fenêtre se referme toute seule ; ne pas la
 *    montrer reviendrait à laisser un soignant perdre une demande sans jamais comprendre pourquoi.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PoigneesPage } from '@/modules/handshakes/pages/PoigneesPage'
import { api, type Handshake } from '@/lib/api'

const DEMANDE: Handshake = {
  id: 'h1',
  status: 'INITIATED',
  patientAccountId: 'pat1',
  professionalId: 'p1',
  offerId: 'o1',
  subProfileId: null,
  initiatedAt: '2026-08-05T10:00:00.000Z',
  confirmedAt: null,
  confirmExpiresAt: null,
  refusalReason: null,
  windowExpiresAt: '2026-08-05T10:05:00.000Z',
  windowRemainingSeconds: 240,
  sessionId: null,
}

function monter() {
  return render(
    <MemoryRouter>
      <PoigneesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'myHandshakes').mockResolvedValue([DEMANDE])
})

describe('demandes de consultation (CU-06-01)', () => {
  it('affiche le compte à rebours de la fenêtre PM-07', async () => {
    monter()
    // 240 s = 4:00 — la fenêtre se referme seule, la taire ferait perdre des demandes sans raison
    // compréhensible.
    await waitFor(() => expect(screen.getByText(/Expire dans 4:00/)).toBeInTheDocument())
  })

  it('interdit d’envoyer un refus sans motif', async () => {
    const u = userEvent.setup({ delay: null })
    const refus = vi.spyOn(api, 'refuseHandshake').mockResolvedValue(DEMANDE)
    monter()
    await waitFor(() => expect(screen.getByText(/Nouvelle demande/i)).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /Refuser/i }))
    expect(screen.getByRole('button', { name: /Envoyer le refus/i })).toBeDisabled()

    await u.type(screen.getByLabelText(/Motif du refus/i), 'Occupé jusqu’à 16 h')
    const envoyer = screen.getByRole('button', { name: /Envoyer le refus/i })
    expect(envoyer).toBeEnabled()

    await u.click(envoyer)
    expect(refus).toHaveBeenCalledWith('h1', 'Occupé jusqu’à 16 h')
  })

  it('confirme la disponibilité en un seul geste', async () => {
    const u = userEvent.setup({ delay: null })
    const confirme = vi.spyOn(api, 'confirmHandshake').mockResolvedValue({ ...DEMANDE, status: 'CONFIRMED' })
    monter()
    await waitFor(() => expect(screen.getByText(/Nouvelle demande/i)).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /Je suis prêt à recevoir/i }))
    expect(confirme).toHaveBeenCalledWith('h1')
  })

  it('explique qu’il faut être en ligne quand aucune demande n’arrive', async () => {
    vi.spyOn(api, 'myHandshakes').mockResolvedValue([])
    monter()
    // CG-08 interdit un état vide sans sortie : ici la sortie mène à la vitrine, là où se règle la
    // présence — la cause la plus probable d'une boîte vide.
    const vide = await screen.findByText(/Aucune demande en attente/i)
    const bloc = vide.closest('div') as HTMLElement
    expect(bloc.textContent).toMatch(/en ligne/i)
    expect(within(bloc).getByRole('button', { name: /Voir ma vitrine/i })).toBeInTheDocument()
  })
})
