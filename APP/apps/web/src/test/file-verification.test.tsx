/**
 * E1 « File de vérification » — l'écran où l'administration décide si un soignant peut exercer.
 *
 * C'est la décision la plus lourde de la plateforme : sans badge ET contrat signé, un professionnel
 * n'existe pour aucun patient (RM-03-01). Trois garde-fous sont verrouillés ici.
 *
 *  1. **On ne décide pas sans avoir pris le dossier en charge.** Deux administrateurs qui examinent
 *     le même dossier rendraient deux décisions contradictoires sur le même soignant. Le formulaire
 *     de décision n'existe qu'en `IN_REVIEW`.
 *  2. **Un refus DOIT pouvoir nommer la pièce en cause.** « Copie non certifiée conforme » sur un
 *     dossier de quatre pièces laisse le soignant deviner laquelle reprendre.
 *  3. **Aucune décision hors ligne.** Elle doit être horodatée et attribuée à un administrateur
 *     nommé (RM-03-02) : l'écran d'échec le dit, au lieu de proposer un brouillon local trompeur.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FileVerificationPage } from '@/modules/admin/pages/FileVerificationPage'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse, type VerificationQueue } from '@/lib/api'

const ADMIN: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'admin',
  phone: '+242060000001',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'SUPER_ADMIN',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'admin@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const FILE: VerificationQueue = {
  targetHours: 72,
  overdueAfterHours: 144,
  items: [
    {
      caseId: 'c-1',
      subjectKind: 'PROFESSIONAL',
      subject: 'professional:p1',
      subjectName: 'Ange Makaya',
      status: 'SUBMITTED',
      waitingSince: new Date(Date.now() - 3 * 3600e3).toISOString(),
      documentCount: 4,
      overdueTarget: false,
      overdue: false,
    },
    {
      caseId: 'c-2',
      subjectKind: 'PROFESSIONAL',
      subject: 'professional:p2',
      subjectName: 'Solange Mbemba',
      status: 'SUBMITTED',
      waitingSince: new Date(Date.now() - 200 * 3600e3).toISOString(),
      documentCount: 4,
      overdueTarget: true,
      overdue: true,
    },
  ],
}

function dossier(over: Partial<Awaited<ReturnType<typeof api.adminCase>>> = {}) {
  return {
    caseId: 'c-1',
    subjectKind: 'PROFESSIONAL' as const,
    subjectName: 'Ange Makaya',
    status: 'IN_REVIEW' as const,
    submittedAt: new Date(Date.now() - 3 * 3600e3).toISOString(),
    requiredDocuments: ['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'] as const,
    missingDocuments: [] as never[],
    documents: [
      { id: 'd1', kind: 'ID' as const, expiresAt: null, createdAt: '2026-08-20T10:00:00.000Z' },
      { id: 'd2', kind: 'DIPLOMA' as const, expiresAt: null, createdAt: '2026-08-20T10:05:00.000Z' },
    ],
    decisions: [],
    agreementSignedAt: null,
    ...over,
  } as Awaited<ReturnType<typeof api.adminCase>>
}

async function monter(sansDossier = false) {
  // La route ne filtre que sur UN statut : l'écran l'appelle trois fois — la charge active par
  // défaut, puis les vérifiés et les refusés pour l'onglet « Tranchés ». La doublure distingue.
  vi.spyOn(api, 'verificationQueue').mockImplementation(async (status?: string) =>
    status ? { ...FILE, items: [] } : FILE,
  )
  useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[sansDossier ? '/admin/verification' : '/admin/verification?dossier=c-1']}>
        <FileVerificationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  /*
    Le titre de page s'affiche déjà pendant le chargement : l'attendre laisserait les assertions
    tomber sur l'écran d'attente. On attend donc ce qui n'existe QUE chargé — et cela dépend du
    point d'entrée : avec un dossier dans l'URL, le panneau d'examen s'ouvre et Radix masque le
    reste de la page aux requêtes de rôle (`aria-hidden`), tableau compris.
  */
  if (sansDossier) await screen.findByRole('columnheader', { name: 'Demandeur' })
  else await screen.findByRole('dialog')
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('E1 — la file', () => {
  it('distingue les deux seuils de retard (EF-03-03)', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)

    const tableau = within(screen.getByRole('table'))
    // Deux seuils distincts : le délai cible dépassé, puis l'escalade. Les confondre ferait perdre
    // la hiérarchie d'urgence sur laquelle l'administration travaille.
    expect(await tableau.findByText('Hors délai')).toBeInTheDocument()
    expect(tableau.getByText('À prendre')).toBeInTheDocument()
  })

  it('annonce 72 heures — pas « heures ouvrées », que personne ne calcule', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)
    // Un dossier de la file a plus de 200 h : le bandeau annonce le dépassement, avec la cible
    // servie par le serveur (PM-11) et jamais le mot « ouvrées », que personne ne calcule.
    expect(screen.getByText(/dépassé le délai de 72 heures/)).toBeInTheDocument()
    expect(screen.getByText(/Au-delà de 72 h/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('ouvrées')
  })

  it('sans dossier choisi, la file entière est lisible — aucun panneau ne la masque', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)

    // Le panneau d'examen ne s'ouvre qu'à la demande : tant qu'aucun dossier n'est choisi, c'est
    // la file qui occupe l'écran, et chaque ligne porte son propre bouton.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Examiner/ }).length).toBeGreaterThan(0)
  })

  it('compte les quatre tuiles sur les vrais statuts', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)

    // Deux déposés, dont un hors délai ; aucun pris en charge.
    const enAttente = (await screen.findByText('En attente')).closest('div') as HTMLElement
    expect(within(enAttente).getByText('2')).toBeInTheDocument()
    const horsDelai = screen.getByText('Hors délai', { selector: 'p' }).closest('div') as HTMLElement
    expect(within(horsDelai).getByText('1')).toBeInTheDocument()
  })

  it("n'invente pas le total de pièces exigées — il dit ce qu'il sait", async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)

    // La maquette écrit « 4 / 4 ». Le total dépend du type de sujet et n'est pas servi par la
    // file : le recopier ici serait dupliquer une règle que le serveur seul applique.
    const tableau = within(screen.getByRole('table'))
    expect(tableau.getAllByText('4 pièces').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain('4 / 4')
  })

  it("n'invente aucune référence de dossier : les identifiants sont des UUID", async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter(true)

    expect(document.body.textContent).not.toMatch(/DOS-\d{4}-\d+/)
  })

  it('une panne dit pourquoi rien ne se décide hors ligne (RM-03-02)', async () => {
    vi.spyOn(api, 'verificationQueue').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/verification']}>
          <FileVerificationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/La file n'a pas pu être chargée/)).toBeInTheDocument()
    expect(screen.getByText(/horodatée et attribuée à un administrateur nommé/)).toBeInTheDocument()
  })
})

describe('E1 — la prise en charge', () => {
  it('un dossier DÉPOSÉ ne se décide pas : il faut le prendre en charge d’abord', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: 'SUBMITTED' }))
    await monter()

    expect(await screen.findByRole('button', { name: 'Prendre en charge' })).toBeInTheDocument()
    // Deux administrateurs sur le même dossier rendraient deux décisions contradictoires.
    expect(screen.queryByLabelText('Motif transmis au demandeur')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enregistrer la décision/ })).not.toBeInTheDocument()
  })

  it('une fois EN EXAMEN, la décision devient possible', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: 'IN_REVIEW' }))
    await monter()

    expect(await screen.findByLabelText('Motif transmis au demandeur')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prendre en charge' })).not.toBeInTheDocument()
  })
})

describe('E1 — la décision', () => {
  it('reste impossible sans motif — un refus muet renvoie au support', async () => {
    const decider = vi.spyOn(api, 'decideCase').mockResolvedValue({ caseId: 'c-1', status: 'VERIFIED' })
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()

    const bouton = await screen.findByRole('button', { name: /Enregistrer la décision/ })
    expect(bouton).toBeDisabled()
    expect(decider).not.toHaveBeenCalled()
  })

  it('un refus peut NOMMER la pièce en cause', async () => {
    const utilisateur = userEvent.setup()
    const decider = vi.spyOn(api, 'decideCase').mockResolvedValue({ caseId: 'c-1', status: 'REJECTED' })
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()

    await utilisateur.selectOptions(await screen.findByLabelText('Décision'), 'REJECTED')
    // Le sélecteur de pièce n'apparaît QUE pour un refus ou un complément : sur une vérification,
    // il n'y a rien à corriger.
    await utilisateur.selectOptions(screen.getByLabelText('Pièce concernée'), 'd2')
    await utilisateur.type(screen.getByLabelText('Motif transmis au demandeur'), 'Copie non certifiée conforme.')
    await utilisateur.click(screen.getByRole('button', { name: /Enregistrer la décision/ }))

    await waitFor(() =>
      expect(decider).toHaveBeenCalledWith('c-1', {
        decision: 'REJECTED',
        reasons: 'Copie non certifiée conforme.',
        documentId: 'd2',
      }),
    )
  })

  it('une vérification ne demande pas de pièce concernée', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()
    await screen.findByLabelText('Décision')
    expect(screen.queryByLabelText('Pièce concernée')).not.toBeInTheDocument()
  })

  it('signale ce qui n’a pas été contrôlé, sans bloquer', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()

    // Deux pièces, aucune cochée : l'écran le dit et engage la responsabilité, il n'interdit pas.
    expect(await screen.findByText(/0 pièce contrôlée sur 2/)).toBeInTheDocument()
    await utilisateur.click(screen.getByLabelText(/Pièce d’identité/))
    await waitFor(() => expect(screen.getByText(/1 pièce contrôlée sur 2/)).toBeInTheDocument())
  })
})

describe('E1 — le dossier examiné', () => {
  it('liste les pièces avec un bouton pour les OUVRIR — c’est ce qui manquait', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()

    // Avant le 24/08, la file ne donnait que `documentCount` : on décidait sans pouvoir regarder.
    expect(await screen.findByText(/Pièce d’identité/)).toBeInTheDocument()
    expect(screen.getByText('Diplôme')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Voir' })).toHaveLength(2)
  })

  it('signale les pièces obligatoires manquantes — premier motif de refus légitime', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ missingDocuments: ['LICENSE', 'PHOTO'] as never }))
    await monter()
    expect(await screen.findByText(/2 pièces obligatoires manquantes/)).toBeInTheDocument()
  })

  it('affiche le journal des décisions passées, avec la pièce visée', async () => {
    vi.spyOn(api, 'adminCase').mockResolvedValue(
      dossier({
        decisions: [
          {
            id: 'x1',
            decision: 'REJECTED',
            reasons: 'Diplôme illisible.',
            documentId: 'd2',
            documentKind: 'DIPLOMA',
            decidedAt: '2026-08-21T09:00:00.000Z',
          },
        ] as never,
      }),
    )
    await monter()

    const journal = (await screen.findByText('Journal du dossier')).closest('section') as HTMLElement
    expect(within(journal).getByText('Diplôme illisible.')).toBeInTheDocument()
    expect(within(journal).getByText('Diplôme')).toBeInTheDocument()
  })
})
