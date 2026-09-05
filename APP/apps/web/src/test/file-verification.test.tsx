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
    /*
      Contrat ALIGNÉ par défaut (écart C) : le cas ordinaire est qu'il n'y ait rien à rééditer.
      Un défaut qui n'apparaît que sur un écart doit être demandé explicitement par le test qui
      le vise — sinon toute la suite le porterait sans que personne ne l'ait décidé.
    */
    agreementVersion: 1,
    agreementCommissionPct: 15,
    currentCommissionPct: 15,
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

  /*
    ── Pourquoi CE test a un budget à lui (02/09/2026) ───────────────────────────────────────────

    Il a échoué en « Test timed out in 5000ms » sur quatre exécutions complètes sur cinq, et passé
    à chaque fois qu'on le lançait seul. Mesuré isolément, **sans aucune concurrence : 2841 ms** —
    57 % du budget par défaut. Sous la charge d'une suite entière, il le dépasse.

    Ce n'est donc ni de la malchance ni un défaut de l'écran : c'est le test le plus lourd du dépôt.
    Il enchaîne DEUX listes Radix (« Décision » puis « Pièce concernée »), chacune montant un portail
    et attendant son animation, plus une frappe caractère par caractère et une mutation.

    Le budget est relevé **pour lui seul**, à 15 s. Relever le budget GLOBAL masquerait la lenteur
    des autres : un test qui ralentit doit se voir. *(La même logique avait fixé `findBy*` à 2,5 s
    au chantier 5 — assez pour un portail Radix, pas assez pour cacher un vrai blocage.)*
  */
  it('un refus peut NOMMER la pièce en cause', async () => {
    const utilisateur = userEvent.setup()
    const decider = vi.spyOn(api, 'decideCase').mockResolvedValue({ caseId: 'c-1', status: 'REJECTED' })
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier())
    await monter()

    await utilisateur.click(await screen.findByLabelText('Décision'))
    await utilisateur.click(await screen.findByRole('option', { name: /Refuser/ }))
    // Le sélecteur de pièce n'apparaît QUE pour un refus ou un complément : sur une vérification,
    // il n'y a rien à corriger.
    await utilisateur.click(await screen.findByLabelText('Pièce concernée'))
    await utilisateur.click(await screen.findByRole('option', { name: 'Diplôme' }))
    await utilisateur.type(screen.getByLabelText('Motif transmis au demandeur'), 'Copie non certifiée conforme.')
    await utilisateur.click(screen.getByRole('button', { name: /Enregistrer la décision/ }))

    await waitFor(() =>
      expect(decider).toHaveBeenCalledWith('c-1', {
        decision: 'REJECTED',
        reasons: 'Copie non certifiée conforme.',
        documentId: 'd2',
      }),
    )
  }, 15_000)

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

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Révoquer le Badge Vérifié — chantier 42, 04/09/2026 (écart B).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  `POST /admin/verification/:id/revoke` existait depuis le premier jour et **aucun écran ne
  l'appelait**. Un soignant vérifié par erreur, ou qui perd son autorisation d'exercer, restait
  vérifié pour toujours — Badge compris, donc visible et crédible dans l'annuaire public.

  ⚠️ **Le geste est SANS RETOUR**, et deux faits du serveur le prouvent :
    • `LEGAL_TRANSITIONS.REVOKED` vaut `[]` — un dossier révoqué n'a aucune sortie ;
    • `VerificationCase.professionalId` est `@unique` — un professionnel n'a qu'un dossier, à vie.

  Un administrateur qui croirait « il refera son dossier » fermerait définitivement l'accès d'un
  soignant à la plateforme. C'est pourquoi trois garde-fous sont éprouvés ici : la carte n'apparaît
  que sur un dossier VÉRIFIÉ, le motif est obligatoire, et la confirmation doit être TAPÉE.
*/
describe('E1 — révoquer le Badge Vérifié (chantier 42)', () => {
  /**
   * Ouvre le panneau sur un dossier au statut voulu, **et attend qu'il soit chargé**.
   *
   * ⚠️ `monter()` n'attend que l'ouverture du panneau (`findByRole('dialog')`), et celui-ci s'ouvre
   * dès que l'URL porte un dossier — donc AVANT que `adminCase` ait répondu. Une requête
   * synchrone juste après ne trouvait qu'un squelette : aucun champ, aucune étiquette.
   *
   * C'est ce qui a fait tomber cinq de ces tests à leur première écriture. Le code était juste ;
   * c'est le harnais qui regardait trop tôt.
   */
  async function panneau(statut: 'VERIFIED' | 'IN_REVIEW' | 'REJECTED' | 'REVOKED') {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: statut }))
    await monter()
    // Le nom du sujet n'apparaît QUE le dossier chargé, quel que soit son statut.
    await screen.findAllByText('Ange Makaya')
  }

  it('n’offre la révocation QUE sur un dossier vérifié', async () => {
    await panneau('VERIFIED')

    expect(await screen.findByRole('button', { name: /Révoquer définitivement/ })).toBeInTheDocument()
  })

  /*
    Le serveur refuse toute autre transition (`canTransition`). Offrir le bouton ailleurs
    promettrait un geste qui reviendrait en 409 — la faute que le projet nomme « proposer ce qu'on
    ne tient pas ».
  */
  it.each(['IN_REVIEW', 'REJECTED', 'REVOKED'] as const)(
    'ne l’offre pas sur un dossier %s',
    async (statut) => {
      await panneau(statut)

      expect(screen.queryByRole('button', { name: /Révoquer définitivement/ })).not.toBeInTheDocument()
    },
  )

  /*
    ── Ce test a CHANGÉ le 04/09/2026, et c'est lui qui a signalé le changement ───────────────

    Il exigeait « Ce geste est définitif » et « ne pourra ni re-déposer, ni être vérifié de
    nouveau ». C'était exact le jour où il a été écrit : `LEGAL_TRANSITIONS.REVOKED` valait `[]`.

    La dette n°25 a ouvert une sortie (REVOKED → IN_REVIEW, super-administrateur seul). **Ce test
    est alors tombé, seul de toute la suite** — la carte promettait une gravité que le serveur
    n'appliquait plus. Il défend maintenant la phrase juste, et il en défend PLUS qu'avant : que
    la carte annonce l'effet immédiat, ET la sortie, ET que cette sortie ne rend pas le badge.

    *Une carte qui promet plus de gravité que le serveur n'en applique ment autant qu'une qui en
    promet moins.*
  */
  it('annonce l’effet immédiat, et la seule sortie possible, AVANT le formulaire', async () => {
    await panneau('VERIFIED')

    expect(await screen.findByText(/Ce geste prend effet immédiatement/)).toBeInTheDocument()
    expect(screen.getByText(/Il ne pourra pas re-déposer de dossier/)).toBeInTheDocument()
    // La nuance qui évite la fausse promesse dans les deux sens.
    expect(screen.getByText(/seul un super-administrateur peut lever une révocation/)).toBeInTheDocument()
    expect(screen.getByText(/cela ne lui rend pas son badge/)).toBeInTheDocument()
  })

  it('dit ce qui arrive au soignant, et qu’il lira le motif', async () => {
    await panneau('VERIFIED')

    expect(await screen.findByText(/annuaire public en moins d'une minute/)).toBeInTheDocument()
    expect(screen.getByText(/lira votre motif dans son espace/)).toBeInTheDocument()
  })

  /* Sans motif, le soignant n'aurait aucune explication — et le serveur refuse un motif vide. */
  it('exige un motif', async () => {
    const revoquer = vi.spyOn(api, 'revokeCase')
    await panneau('VERIFIED')
    const utilisateur = userEvent.setup()

    await utilisateur.type(screen.getByLabelText(/Saisissez RÉVOQUER/), 'RÉVOQUER')

    expect(screen.getByRole('button', { name: /Révoquer définitivement/ })).toBeDisabled()
    expect(revoquer).not.toHaveBeenCalled()
  })

  /*
    La confirmation tapée reprend celle de la clôture de compte — le seul autre geste sans retour de
    la plateforme. Un clic isolé ne doit pas suffire à fermer la carrière d'un soignant.
  */
  it('exige la confirmation tapée, même avec un motif', async () => {
    const revoquer = vi.spyOn(api, 'revokeCase')
    await panneau('VERIFIED')
    const utilisateur = userEvent.setup()

    await utilisateur.type(screen.getByLabelText(/Motif transmis au soignant/), 'Pièces falsifiées.')

    expect(screen.getByRole('button', { name: /Révoquer définitivement/ })).toBeDisabled()
    expect(revoquer).not.toHaveBeenCalled()
  })

  it('révoque avec le motif quand les deux conditions sont remplies', async () => {
    const revoquer = vi.spyOn(api, 'revokeCase').mockResolvedValue({ caseId: 'c-1', status: 'REVOKED' })
    await panneau('VERIFIED')
    const utilisateur = userEvent.setup()

    await utilisateur.type(screen.getByLabelText(/Motif transmis au soignant/), 'Autorisation d’exercer retirée.')
    await utilisateur.type(screen.getByLabelText(/Saisissez RÉVOQUER/), 'RÉVOQUER')
    await utilisateur.click(screen.getByRole('button', { name: /Révoquer définitivement/ }))

    await waitFor(() => expect(revoquer).toHaveBeenCalledWith('c-1', 'Autorisation d’exercer retirée.'))
  })

  /* L'échec ne se perd pas : le motif reste, et la raison du refus s'affiche. */
  it('montre l’échec sans effacer le motif saisi', async () => {
    vi.spyOn(api, 'revokeCase').mockRejectedValue(new Error('réseau'))
    await panneau('VERIFIED')
    const utilisateur = userEvent.setup()

    await utilisateur.type(screen.getByLabelText(/Motif transmis au soignant/), 'Un motif long à retaper.')
    await utilisateur.type(screen.getByLabelText(/Saisissez RÉVOQUER/), 'RÉVOQUER')
    await utilisateur.click(screen.getByRole('button', { name: /Révoquer définitivement/ }))

    // On vise le MESSAGE d'échec, pas le rôle : la carte porte déjà un avertissement permanent.
    expect(await screen.findByText(/Une erreur est survenue/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Motif transmis au soignant/)).toHaveValue('Un motif long à retaper.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Lever une révocation — dette n°25, 04/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  Le chantier 42 a livré la révocation, et découvert en la livrant qu'elle n'avait aucune sortie :
  `professionalId` est `@unique`, donc un dossier révoqué fermait l'accès du soignant **à vie** —
  y compris quand la révocation venait d'une erreur d'administration.

  La sortie ouverte est délibérément ÉTROITE, et les trois garde-fous sont éprouvés ici :
    • le super-administrateur seul la voit (l'examinateur qui révoque ne se dédit pas lui-même) ;
    • elle ne rend PAS le badge — elle remet le dossier en examen, et la carte doit le dire ;
    • le motif reste obligatoire : le soignant le lira, le journal le gardera.
*/
describe('E1 — lever une révocation (dette n°25)', () => {
  async function panneauRevoque(role: MeResponse['adminRole'] = 'SUPER_ADMIN') {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: 'REVOKED' }))
    await monter()
    // `monter()` pose la session ; on ne surcharge le sous-rôle qu'ensuite, sinon il est écrasé.
    if (role !== 'SUPER_ADMIN') useSessionStore.setState({ me: { ...ADMIN, adminRole: role } })
  }

  it('offre la levée au super-administrateur sur un dossier révoqué', async () => {
    await panneauRevoque()

    expect(await screen.findByRole('button', { name: /Lever la révocation/ })).toBeInTheDocument()
  })

  /*
    Défaire la décision d'un examinateur n'appartient pas aux examinateurs. Le serveur répond 403 ;
    l'écran ne montre donc pas un bouton qui refuserait — proposer ce qu'on ne tient pas est
    exactement la faute que le projet s'interdit.
  */
  it('ne l’offre PAS à un administrateur de vérification', async () => {
    await panneauRevoque('ADMIN_VERIFICATION')

    await screen.findAllByText('Ange Makaya')
    expect(screen.queryByRole('button', { name: /Lever la révocation/ })).not.toBeInTheDocument()
  })

  it.each(['VERIFIED', 'IN_REVIEW', 'REJECTED'] as const)(
    'ne l’offre pas sur un dossier %s',
    async (statut) => {
      vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: statut }))
      await monter()

      await screen.findAllByText('Ange Makaya')
      expect(screen.queryByRole('button', { name: /Lever la révocation/ })).not.toBeInTheDocument()
    },
  )

  /*
    LA phrase de cette carte. Un administrateur qui croirait rendre le badge d'un clic ferait au
    soignant une seconde promesse manquée — après celle de la révocation.
  */
  it('dit que la levée ne rend PAS le badge', async () => {
    await panneauRevoque()

    expect(await screen.findByText(/ne rend pas le badge/)).toBeInTheDocument()
    expect(screen.getByText(/remet\s+le dossier en examen/)).toBeInTheDocument()
  })

  it('exige un motif', async () => {
    const lever = vi.spyOn(api, 'reinstateCase')
    await panneauRevoque()

    expect(await screen.findByRole('button', { name: /Lever la révocation/ })).toBeDisabled()
    expect(lever).not.toHaveBeenCalled()
  })

  it('lève avec le motif saisi', async () => {
    const lever = vi
      .spyOn(api, 'reinstateCase')
      .mockResolvedValue({ caseId: 'c-1', status: 'IN_REVIEW' })
    await panneauRevoque()
    const utilisateur = userEvent.setup()

    await utilisateur.type(
      await screen.findByLabelText(/Motif transmis au soignant/),
      'Révocation prononcée sur un homonyme.',
    )
    await utilisateur.click(screen.getByRole('button', { name: /Lever la révocation/ }))

    await waitFor(() =>
      expect(lever).toHaveBeenCalledWith('c-1', 'Révocation prononcée sur un homonyme.'),
    )
  })

  /*
    Pas de confirmation tapée ici, contrairement à la révocation — et c'est VOULU. La confirmation
    protège des gestes sans retour ; celui-ci en est un. Exiger la même cérémonie pour défaire que
    pour faire découragerait la correction d'une erreur, soit l'inverse du but de cette carte.
  */
  it('ne demande PAS de confirmation tapée — défaire n’est pas faire', async () => {
    await panneauRevoque()

    await screen.findByRole('button', { name: /Lever la révocation/ })
    expect(screen.queryByLabelText(/Saisissez RÉVOQUER/)).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Rééditer le contrat d'adhésion — écart C, 05/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  `POST :caseId/agreement/reissue` n'avait aucun bouton, alors que le chantier 8 avait construit
  TOUT le parcours de re-signature côté soignant.

  ⚠️ Le plan des écrans disait « rien ne peut le déclencher » — **c'était faux** : changer PM-01
  depuis E3 réédite déjà en masse. Ce bouton comble trois trous de ce lot : il ignore les dossiers
  sans version signée, il s'arrête à 500, et il oublie ses échecs.

  ⚠️ **Le geste coûte cher.** Rééditer crée une version NON SIGNÉE, et « peut exercer » exige la
  version courante signée (RM-03-01) : un soignant en exercice cesse de pouvoir l'être à l'instant
  du clic. Les deux cas ne se disent donc pas pareil, et c'est ce que ces tests gardent.
*/
describe('E1 — rééditer le contrat d’adhésion (écart C)', () => {
  async function contrat(over: Parameters<typeof dossier>[0] = {}) {
    vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: 'VERIFIED', ...over }))
    await monter()
  }

  /* Les deux taux viennent du SERVEUR. Un écran qui recopierait PM-01 afficherait un écart
     imaginaire le jour où le taux change — et personne ne saurait lequel des deux croire. */
  it('affiche le taux du contrat ET le taux courant, lus du serveur', async () => {
    await contrat({ agreementVersion: 2, agreementCommissionPct: 12, currentCommissionPct: 18 })

    expect(await screen.findByText(/Version 2 · 12 %/)).toBeInTheDocument()
    expect(screen.getByText('18 %')).toBeInTheDocument()
  })

  /* « Un interrupteur qui ne change rien est pire qu'un interrupteur absent. » */
  it('n’offre AUCUN bouton quand le contrat est déjà au taux courant', async () => {
    await contrat({ agreementCommissionPct: 15, currentCommissionPct: 15 })

    expect(await screen.findByText(/déjà au taux courant/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rééditer au taux/ })).not.toBeInTheDocument()
  })

  /*
    LA phrase de cette carte. Rééditer le contrat d'un soignant QUI A SIGNÉ le suspend : M05 et M06
    relisent `canPractice` à chaque requête, sans cache. Un administrateur qui l'ignore croit ne
    faire qu'une mise à jour administrative.
  */
  it('prévient qu’un soignant DÉJÀ SIGNATAIRE ne pourra plus exercer', async () => {
    await contrat({
      agreementCommissionPct: 12,
      currentCommissionPct: 18,
      agreementSignedAt: '2026-08-01T10:00:00.000Z',
    })

    expect(await screen.findByText(/Il ne pourra plus exercer/)).toBeInTheDocument()
    expect(screen.getByText(/ni publier d'offre, ni recevoir de nouvelle demande/)).toBeInTheDocument()
  })

  /*
    L'autre moitié, et elle compte autant : un soignant qui n'a PAS signé ne perd rien — il ne peut
    déjà pas exercer. Lui servir l'avertissement de suspension serait une fausse alarme, et une
    fausse alarme répétée est ce qui apprend à ne plus lire les vraies.
  */
  it('ne crie pas à la suspension quand le soignant n’a pas encore signé', async () => {
    await contrat({ agreementCommissionPct: 12, currentCommissionPct: 18, agreementSignedAt: null })

    expect(await screen.findByText(/n'a pas encore signé/)).toBeInTheDocument()
    expect(screen.getByText(/il signera un contrat périmé/)).toBeInTheDocument()
    expect(screen.queryByText(/Il ne pourra plus exercer/)).not.toBeInTheDocument()
  })

  it('réédite au taux courant quand on clique', async () => {
    const reediter = vi
      .spyOn(api, 'reissueAgreement')
      .mockResolvedValue({ caseId: 'c-1', reissued: true })
    await contrat({ agreementCommissionPct: 12, currentCommissionPct: 18 })
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Rééditer au taux de 18 %/ }))

    await waitFor(() => expect(reediter).toHaveBeenCalledWith('c-1'))
  })

  it.each(['IN_REVIEW', 'REJECTED', 'REVOKED'] as const)(
    'ne montre pas la carte du contrat sur un dossier %s',
    async (statut) => {
      vi.spyOn(api, 'adminCase').mockResolvedValue(dossier({ status: statut }))
      await monter()

      await screen.findAllByText('Ange Makaya')
      expect(screen.queryByText(/Taux courant \(PM-01\)/)).not.toBeInTheDocument()
    },
  )

  it('montre l’échec plutôt que de laisser croire que c’est passé', async () => {
    vi.spyOn(api, 'reissueAgreement').mockRejectedValue(new Error('réseau'))
    await contrat({ agreementCommissionPct: 12, currentCommissionPct: 18 })
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Rééditer au taux/ }))

    expect(await screen.findByText(/Une erreur est survenue/)).toBeInTheDocument()
  })
})
