/**
 * File de vérification — M03, CU-03-04.
 *
 * C'est le goulot d'étranglement du produit : tant qu'un dossier n'est pas tranché, le professionnel
 * reste invisible de l'annuaire et la pharmacie ne publie rien. Trois règles sont verrouillées :
 *
 *  1. **Le tri suit l'URGENCE, pas la date.** Une file triée par arrivée masquerait précisément les
 *     dossiers qu'on a laissés filer.
 *  2. **On s'attribue le dossier avant de décider** — sans quoi deux vérificateurs travaillent sur le
 *     même pendant que la file s'allonge.
 *  3. **Toute décision exige un motif, l'acceptation comprise.** C'est le texte que lira le
 *     professionnel, et la seule trace en cas de contestation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FileVerificationPage } from '@/modules/admin/pages/FileVerificationPage'
import { api, type VerificationQueue } from '@/lib/api'

const ilYaHeures = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

const FILE: VerificationQueue = {
  targetHours: 48,
  overdueAfterHours: 72,
  items: [
    // Déposé récemment, mais listé en PREMIER par l'API — le tri doit le faire redescendre.
    { caseId: 'c-recent', subjectKind: 'PROFESSIONAL', subject: 'a1', subjectName: 'Dr Récent', status: 'SUBMITTED', waitingSince: ilYaHeures(2), documentCount: 4, overdueTarget: false, overdue: false },
    { caseId: 'c-critique', subjectKind: 'PROFESSIONAL', subject: 'a2', subjectName: 'Dr Oublié', status: 'SUBMITTED', waitingSince: ilYaHeures(90), documentCount: 4, overdueTarget: true, overdue: true },
    { caseId: 'c-tardif', subjectKind: 'FACILITY', subject: 'f1', subjectName: 'Pharmacie Tardive', status: 'SUBMITTED', waitingSince: ilYaHeures(60), documentCount: 3, overdueTarget: true, overdue: false },
  ],
}

function monter() {
  return render(
    <MemoryRouter>
      <FileVerificationPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'verificationQueue').mockResolvedValue(FILE)
})

describe('file de vérification', () => {
  it('remonte les dossiers en retard, pas les plus récents', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('Dr Oublié')).toBeInTheDocument())

    // On lit l'ordre des LIGNES, pas le texte exact : chaque libellé porte aussi son sous-titre
    // (nombre de pièces, heures d'attente), qui n'a rien à voir avec la règle testée.
    const lignes = Array.from(document.querySelectorAll('li')).map((li) => li.textContent ?? '')
    expect(lignes[0]).toMatch(/Dr Oublié/)
    expect(lignes[1]).toMatch(/Pharmacie Tardive/)
    expect(lignes[2]).toMatch(/Dr Récent/)
  })

  it('écrit le retard au lieu de le suggérer par une couleur (CG-11)', async () => {
    monter()
    await waitFor(() => expect(screen.getByText('En retard critique')).toBeInTheDocument())
    expect(screen.getByText('Au-delà de l’objectif')).toBeInTheDocument()
    expect(screen.getByText(/2 dossiers au-delà de l’objectif/i)).toBeInTheDocument()
  })

  it('s’attribue le dossier AVANT d’ouvrir le formulaire de décision', async () => {
    const u = userEvent.setup({ delay: null })
    const claim = vi.spyOn(api, 'claimCase').mockResolvedValue(undefined)
    monter()
    await waitFor(() => expect(screen.getByText('Dr Oublié')).toBeInTheDocument())

    const ligne = screen.getByText('Dr Oublié').closest('li') as HTMLElement
    await u.click(within(ligne).getByRole('button', { name: /Examiner/i }))

    expect(claim).toHaveBeenCalledWith('c-critique')
    await waitFor(() => expect(within(ligne).getByLabelText(/Motif de la décision/i)).toBeInTheDocument())
  })

  it('exige un motif même pour VÉRIFIER', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'claimCase').mockResolvedValue(undefined)
    const decide = vi.spyOn(api, 'decideCase').mockResolvedValue(undefined)
    monter()
    await waitFor(() => expect(screen.getByText('Dr Oublié')).toBeInTheDocument())

    const ligne = screen.getByText('Dr Oublié').closest('li') as HTMLElement
    await u.click(within(ligne).getByRole('button', { name: /Examiner/i }))
    await waitFor(() => expect(within(ligne).getByLabelText(/Motif de la décision/i)).toBeInTheDocument())

    // « Vérifier » est la décision par défaut, et pourtant le bouton reste inerte sans motif.
    const enregistrer = within(ligne).getByRole('button', { name: /Enregistrer la décision/i })
    expect(enregistrer).toBeDisabled()

    await u.type(within(ligne).getByLabelText(/Motif de la décision/i), 'Pièces conformes.')
    expect(enregistrer).toBeEnabled()

    await u.click(enregistrer)
    expect(decide).toHaveBeenCalledWith('c-critique', { decision: 'VERIFIED', reasons: 'Pièces conformes.' })
  })
})
