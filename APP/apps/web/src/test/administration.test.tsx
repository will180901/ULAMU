/**
 * Signalements et comptes — M04 (CU-04-04) et M16 (CU-16-02).
 *
 * Ces deux écrans coupent l'accès de gens à leur outil de travail ou à leur dossier médical. Trois
 * règles les encadrent, et chacune évite un geste irréfléchi :
 *
 *  1. **Aucune liste de comptes par défaut.** Afficher tout le monde ferait de la modération une
 *     activité de survol ; on cherche un compte précis, on ne parcourt pas l'annuaire.
 *  2. **Le motif est obligatoire partout** — rejet d'un signalement compris, réactivation comprise.
 *     C'est la seule trace qui expliquera la décision six mois plus tard.
 *  3. **Les issues portent des libellés parlants**, jamais les codes techniques : « ESCALATED_M16 »
 *     ne dit rien à quelqu'un qui doit décider du sort d'un compte.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignalementsPage } from '@/modules/admin/pages/SignalementsPage'
import { ComptesPage } from '@/modules/admin/pages/ComptesPage'
import { api, type AdminAccount, type UserReport } from '@/lib/api'

const SIGNALEMENTS: UserReport[] = [
  { id: 'r-recent', targetType: 'PROFESSIONAL', targetId: 'p2', reasonCode: 'CONTENU_INAPPROPRIE', reasonText: null, status: 'PENDING', createdAt: new Date(Date.now() - 3_600_000).toISOString(), isOverdue: false },
  { id: 'r-vieux', targetType: 'PROFESSIONAL', targetId: 'p1', reasonCode: 'ABSENCE_DE_REPONSE', reasonText: 'Le soignant n’a jamais répondu.', status: 'PENDING', createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString(), isOverdue: true },
]

const COMPTE: AdminAccount = { id: 'a1', username: 'dr.suspect', phone: '+242060000042', type: 'PROFESSIONAL', status: 'ACTIVE' }

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('signalements', () => {
  beforeEach(() => {
    vi.spyOn(api, 'reports').mockResolvedValue({ items: SIGNALEMENTS })
  })

  it('remonte les signalements hors délai (PM-23)', async () => {
    render(<MemoryRouter><SignalementsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Hors délai')).toBeInTheDocument())

    const lignes = Array.from(document.querySelectorAll('li')).map((li) => li.textContent ?? '')
    expect(lignes[0]).toMatch(/ABSENCE_DE_REPONSE/)
  })

  it('nomme les issues en clair, jamais par leur code technique', async () => {
    const u = userEvent.setup({ delay: null })
    render(<MemoryRouter><SignalementsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('ABSENCE_DE_REPONSE')).toBeInTheDocument())

    const ligne = screen.getByText('ABSENCE_DE_REPONSE').closest('li') as HTMLElement
    await u.click(within(ligne).getByRole('button', { name: /Traiter/i }))

    expect(within(ligne).getByRole('button', { name: /Transmettre au pilotage/i })).toBeInTheDocument()
    expect(within(ligne).queryByText(/ESCALATED_M16/)).not.toBeInTheDocument()
  })

  it('exige un motif même pour REJETER un signalement', async () => {
    const u = userEvent.setup({ delay: null })
    const decide = vi.spyOn(api, 'decideReport').mockResolvedValue(undefined)
    render(<MemoryRouter><SignalementsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('ABSENCE_DE_REPONSE')).toBeInTheDocument())

    const ligne = screen.getByText('ABSENCE_DE_REPONSE').closest('li') as HTMLElement
    await u.click(within(ligne).getByRole('button', { name: /Traiter/i }))

    // « Rejeter » est l'issue par défaut, et pourtant le bouton reste inerte sans motif.
    const enregistrer = within(ligne).getByRole('button', { name: /Enregistrer la décision/i })
    expect(enregistrer).toBeDisabled()

    await u.type(within(ligne).getByLabelText(/Motif de la décision/i), 'Signalement non fondé.')
    await u.click(enregistrer)
    expect(decide).toHaveBeenCalledWith('r-vieux', { decision: 'DISMISSED', reasons: 'Signalement non fondé.' })
  })
})

describe('comptes', () => {
  it('n’affiche AUCUNE liste tant qu’on n’a pas cherché', () => {
    render(<MemoryRouter><ComptesPage /></MemoryRouter>)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText(/Aucune liste n’est affichée par défaut/i)).toBeInTheDocument()
  })

  it('rappelle la conséquence d’une suspension AVANT de l’exécuter (RM-01-05)', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'searchAccounts').mockResolvedValue({ items: [COMPTE] })
    render(<MemoryRouter><ComptesPage /></MemoryRouter>)

    await u.type(screen.getByLabelText(/Nom d’utilisateur/i), 'suspect')
    await u.click(screen.getByRole('button', { name: /Rechercher/i }))
    await waitFor(() => expect(screen.getByText('dr.suspect')).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /^Suspendre$/i }))
    // Le fait qu'un compte suspendu ne puisse plus être clôturé par son titulaire n'est pas
    // intuitif : il est rappelé au moment du geste.
    expect(screen.getByText(/ne peut plus se connecter/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Suspendre le compte/i })).toBeDisabled()
  })

  it('exige un motif pour RÉACTIVER aussi', async () => {
    const u = userEvent.setup({ delay: null })
    vi.spyOn(api, 'searchAccounts').mockResolvedValue({ items: [{ ...COMPTE, status: 'SUSPENDED' }] })
    const reactiver = vi.spyOn(api, 'reactivateAccount').mockResolvedValue(undefined)
    render(<MemoryRouter><ComptesPage /></MemoryRouter>)

    await u.type(screen.getByLabelText(/Nom d’utilisateur/i), 'suspect')
    await u.click(screen.getByRole('button', { name: /Rechercher/i }))
    await waitFor(() => expect(screen.getByText('dr.suspect')).toBeInTheDocument())

    await u.click(screen.getByRole('button', { name: /^Réactiver$/i }))
    const bouton = screen.getByRole('button', { name: /Réactiver le compte/i })
    expect(bouton).toBeDisabled()

    await u.type(screen.getByLabelText('Motif'), 'Signalement classé sans suite.')
    await u.click(bouton)
    expect(reactiver).toHaveBeenCalledWith('a1', 'Signalement classé sans suite.')
  })
})
