/**
 * C1 « Ma vérification » — ce que l'écran a le droit de dire, selon l'état du dossier.
 *
 * Cet écran décide si un soignant peut exercer. Trois façons de s'y tromper coûteraient cher, et ce
 * sont elles qui sont verrouillées ici :
 *
 *  1. **Laisser déposer un dossier incomplet.** Le serveur refuserait, mais l'utilisateur aurait
 *     cliqué en croyant avoir fini — et sur une connexion lente il attendrait pour rien. Le bouton
 *     suit `canSubmit`, calculé par le serveur, jamais recompté ici.
 *  2. **Laisser toucher aux pièces d'un dossier en examen.** L'examinateur juge sur un dossier
 *     stable ; retirer une pièce pendant l'examen invaliderait sa décision.
 *  3. **Présenter comme conforme un contrat dont l'empreinte ne correspond plus.** Le serveur
 *     refuse alors de servir le texte ; l'écran ne doit ni l'inventer, ni proposer de le signer.
 *
 * Les données viennent d'un faux `api` : on teste l'écran, pas le réseau.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VerificationPage } from '@/modules/verification/pages/VerificationPage'
import { useSessionStore } from '@/state/session.store'
import { api, lirePieceJustificative, type MeResponse, type VerificationCase } from '@/lib/api'

/**
 * Seule `lirePieceJustificative` est remplacée : elle fait un `fetch` avec jeton puis fabrique une
 * URL `blob:`, deux choses que jsdom ne sait pas faire. `api` reste l'objet réel, donc les espions
 * posés plus bas continuent de fonctionner.
 */
vi.mock('@/lib/api', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/api')>()
  return { ...reel, lirePieceJustificative: vi.fn() }
})

const MOI: MeResponse = {
  accountId: 'p1',
  accountType: 'PROFESSIONAL',
  username: 'ange.makaya',
  phone: '+242061234567',
  firstName: 'Ange',
  lastName: 'Makaya',
  district: 'Bacongo',
  category: 'SPECIALIST',
  specialty: 'Cardiologie',
  biography: null,
  adminRole: null,
  totpEnabled: false,
  totpEnabledAt: null,
  email: 'ange.makaya@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 0,
  backupCodesTotal: 0,
  backupCodesGeneratedAt: null,
}

const TOUTES = (['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'] as const).map((kind, i) => ({
  id: `d${i}`,
  kind,
  expiresAt: null,
  createdAt: '2026-08-20T10:00:00.000Z',
}))

const BASE: VerificationCase = {
  caseId: 'ab12cd34-0000-0000-0000-000000000000',
  subjectKind: 'PROFESSIONAL',
  status: 'DRAFT',
  canPractice: false,
  requiredDocuments: ['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'],
  missingDocuments: [],
  canSubmit: false,
  documentsEditable: true,
  announcedDelayHours: 72,
  documents: TOUTES,
  decisions: [],
  agreement: null,
}

async function monter(dossier: Partial<VerificationCase>) {
  vi.spyOn(api, 'verificationMine').mockResolvedValue({ ...BASE, ...dossier })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const rendu = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VerificationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Ma vérification' })
  return rendu
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C1 — le dépôt du dossier', () => {
  it('dossier incomplet : le dépôt est impossible, et l’écran nomme les pièces qui manquent', async () => {
    await monter({
      status: 'DRAFT',
      documents: TOUTES.slice(0, 2),
      missingDocuments: ['LICENSE', 'PHOTO'],
      canSubmit: false,
    })

    expect(screen.getByRole('button', { name: /Déposer mon dossier/ })).toBeDisabled()
    // Nommées, pas seulement comptées : « il manque 2 pièces » n'aide personne à agir. On cible le
    // message récapitulatif — les intitulés figurent aussi dans les lignes de pièces au-dessus.
    const rappel = screen.getByText(/Il manque 2 pièces obligatoires/)
    expect(rappel.textContent).toContain('Attestation d’inscription à l’Ordre')
    expect(rappel.textContent).toContain('Photo d’identité')
    // Et chaque pièce absente s'annonce comme telle dans sa propre ligne.
    expect(screen.getAllByText('À déposer')).toHaveLength(2)
  })

  it('dossier complet : le dépôt devient possible', async () => {
    await monter({ status: 'DRAFT', missingDocuments: [], canSubmit: true })
    expect(screen.getByRole('button', { name: /Déposer mon dossier/ })).toBeEnabled()
  })

  it('le bouton suit le serveur, même si le compte des pièces dit le contraire', async () => {
    // Toutes les pièces sont là, mais le serveur refuse le dépôt (dossier déjà déposé, par exemple).
    // L'écran ne doit PAS recompter dans son coin : il y a une seule autorité, et c'est le serveur.
    await monter({ status: 'DRAFT', documents: TOUTES, missingDocuments: [], canSubmit: false })
    expect(screen.getByRole('button', { name: /Déposer mon dossier/ })).toBeDisabled()
  })
})

describe('C1 — dossier en examen', () => {
  it('les pièces sont figées : ni dépôt, ni remplacement, ni retrait', async () => {
    await monter({ status: 'IN_REVIEW', documentsEditable: false, canSubmit: false })

    expect(screen.queryByRole('button', { name: /Ajouter une page/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Déposer$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Retirer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Déposer mon dossier/ })).not.toBeInTheDocument()
    // La LECTURE reste ouverte : on doit pouvoir revoir ce qu'on a envoyé.
    expect(screen.getAllByRole('button', { name: 'Voir' }).length).toBe(4)
  })
})

describe('C1 — la décision de l’administration', () => {
  it('un refus affiche son motif en toutes lettres', async () => {
    const motif = "Copie du diplôme non certifiée conforme — un tampon de l'établissement est requis."
    await monter({
      status: 'REJECTED',
      decisions: [
        { id: 'x1', decision: 'REJECTED', reasons: motif, documentId: 'd1', documentKind: 'DIPLOMA', decidedAt: '2026-08-21T09:00:00.000Z' },
      ],
    })

    expect(screen.getByText(motif)).toBeInTheDocument()
    expect(screen.getByText(/Motif transmis par l'administration/)).toBeInTheDocument()
    // La pièce VISÉE est nommée (correction du 24/08) : « copie non conforme » sur quatre pièces
    // laissait deviner laquelle reprendre. Un refus nommé est une consigne.
    // Cadré sur le bloc du MOTIF : « Diplôme » figure aussi dans la liste des pièces plus haut.
    const motifBloc = screen.getByText('Pièce concernée').closest('section') as HTMLElement
    expect(within(motifBloc).getByText('Diplôme')).toBeInTheDocument()
    // Et les pièces redeviennent modifiables : c'est tout l'intérêt d'un refus motivé.
    expect(screen.getAllByRole('button', { name: /Ajouter une page/ }).length).toBeGreaterThan(0)
  })

  it('sans décision, aucun bloc de motif — on n’affiche pas un cadre vide', async () => {
    await monter({ status: 'DRAFT', decisions: [] })
    expect(screen.queryByText(/Motif transmis par l'administration/)).not.toBeInTheDocument()
  })
})

describe('C1 — le contrat de partenariat', () => {
  it('contrat signé : date, empreinte et téléchargement ; plus de formulaire de signature', async () => {
    await monter({
      status: 'VERIFIED',
      canPractice: true,
      documentsEditable: false,
      agreement: {
        version: 2,
        commissionPct: 12,
        bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
        body: 'CONTRAT SOIGNANT ULAMU',
        integrity: true,
        signedAt: '2026-08-22T16:42:00.000Z',
        effectiveAt: '2026-08-22T16:42:00.000Z',
      },
    })

    expect(screen.getByText(/Contrat signé le/)).toBeInTheDocument()
    expect(screen.getByText(/empreinte a3f9…c210/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Télécharger' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/saisissez votre nom complet/i)).not.toBeInTheDocument()
  })

  it('empreinte rompue : le texte n’est pas affiché et la signature est impossible', async () => {
    await monter({
      status: 'VERIFIED',
      agreement: {
        version: 2,
        commissionPct: 12,
        bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
        // Le serveur renvoie `body: null` quand le texte régénéré ne correspond plus au sceau.
        body: null,
        integrity: false,
        signedAt: null,
        effectiveAt: null,
      },
    })

    expect(screen.getByText(/ne correspond plus à son empreinte scellée/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lire le contrat' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/saisissez votre nom complet/i)).not.toBeInTheDocument()
  })

  it('la signature exige un nom qui correspond à celui du compte', async () => {
    await monter({
      status: 'VERIFIED',
      agreement: {
        version: 2,
        commissionPct: 12,
        bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
        body: 'CONTRAT SOIGNANT ULAMU',
        integrity: true,
        signedAt: null,
        effectiveAt: null,
      },
    })

    const champ = screen.getByLabelText(/saisissez votre nom complet/i)
    const continuer = screen.getByRole('button', { name: 'Continuer' })
    expect(continuer).toBeDisabled()

    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(champ, { target: { value: 'Jean Dupont' } })
    await waitFor(() => expect(screen.getByText(/ne correspond pas à celui de votre compte/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'ange makaya' } }) // la casse ne doit pas bloquer
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled())
  })
})

describe('C1 — l’état de chargement et l’échec', () => {
  it('un échec de chargement rassure sur les pièces déjà déposées et propose de réessayer', async () => {
    vi.spyOn(api, 'verificationMine').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <VerificationPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const carte = await screen.findByText(/Votre dossier n'a pas pu être chargé/)
    expect(carte).toBeInTheDocument()
    // Le message le plus important de cet écran : rien n'est perdu.
    expect(screen.getByText(/conservés côté serveur/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('C1 — le délai de traitement', () => {
  it('72 heures s’affichent en jours, pas en heures', async () => {
    await monter({ announcedDelayHours: 72 })
    const bloc = screen.getByText('Délai de traitement').closest('section') as HTMLElement
    expect(within(bloc).getByText('3')).toBeInTheDocument()
    expect(within(bloc).getByText('jours')).toBeInTheDocument()
  })

  it('un délai court reste en heures', async () => {
    await monter({ announcedDelayHours: 24 })
    const bloc = screen.getByText('Délai de traitement').closest('section') as HTMLElement
    expect(within(bloc).getByText('24')).toBeInTheDocument()
    expect(within(bloc).getByText('heures')).toBeInTheDocument()
  })
})

describe('C1 — plusieurs fichiers pour une même pièce', () => {
  /**
   * La maquette dit « recto et verso sur un même fichier ». À l'usage c'est intenable : une carte
   * nationale se photographie en deux fois, et personne n'assemble deux images dans un PDF depuis un
   * téléphone avant de pouvoir s'inscrire. Le serveur n'a jamais interdit plusieurs pièces du même
   * type — c'était l'écran qui n'en montrait qu'une.
   */
  it('les pages s’empilent, chacune avec sa date et son bouton', async () => {
    await monter({
      status: 'DRAFT',
      documents: [
        { id: 'r', kind: 'ID', expiresAt: null, createdAt: '2026-08-20T10:00:00.000Z' },
        { id: 'v', kind: 'ID', expiresAt: null, createdAt: '2026-08-21T11:00:00.000Z' },
      ],
      missingDocuments: ['DIPLOMA', 'LICENSE', 'PHOTO'],
    })

    expect(screen.getByText('2 pages')).toBeInTheDocument()
    expect(screen.getByText(/Page 1 · déposée le 20 août 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Page 2 · déposée le 21 août 2026/)).toBeInTheDocument()
    // Un bouton « Voir » par page — on doit pouvoir vérifier le verso sans ouvrir le recto.
    expect(screen.getAllByRole('button', { name: 'Voir' })).toHaveLength(2)
    // Et chaque page se retire séparément : c'est le verso qui est flou, pas le recto.
    expect(screen.getByRole('button', { name: /Retirer Pièce d’identité page 2/ })).toBeInTheDocument()
  })

  it('une pièce déposée une seule fois ne parle pas de pages', async () => {
    await monter({
      status: 'DRAFT',
      documents: [{ id: 'r', kind: 'ID', expiresAt: null, createdAt: '2026-08-20T10:00:00.000Z' }],
      missingDocuments: ['DIPLOMA', 'LICENSE', 'PHOTO'],
    })
    expect(screen.getByText('Déposée')).toBeInTheDocument()
    expect(screen.queryByText(/Page 1/)).not.toBeInTheDocument()
  })
})

describe('C1 — l’aperçu d’une pièce', () => {
  beforeEach(() => {
    // jsdom ne connaît pas les URL d'objet : on les remplace pour que la fermeture n'explose pas.
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:faux')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('s’ouvre dans un tiroir venu de la DROITE, sans quitter la page', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const utilisateur = userEvent.setup()
    vi.mocked(lirePieceJustificative).mockResolvedValue({ url: 'blob:faux', type: 'image/png' })

    await monter({
      status: 'DRAFT',
      documents: [{ id: 'r', kind: 'ID', expiresAt: null, createdAt: '2026-08-20T10:00:00.000Z' }],
      missingDocuments: ['DIPLOMA', 'LICENSE', 'PHOTO'],
    })

    await utilisateur.click(screen.getByRole('button', { name: 'Voir' }))

    const tiroir = await screen.findByRole('dialog')
    // Le côté n'est pas un détail : la liste des pièces doit rester visible pendant qu'on regarde un
    // fichier, pour enchaîner recto puis verso sans perdre sa place.
    expect(tiroir).toHaveAttribute('data-side', 'right')
    expect(within(tiroir).getByRole('img', { name: 'Pièce d’identité' })).toBeInTheDocument()

    // La page n'a pas bougé : l'écran est toujours là, DERRIÈRE le tiroir. On l'interroge par le DOM
    // et non par son rôle : Radix marque l'arrière-plan `aria-hidden` tant qu'un panneau modal est
    // ouvert, et c'est la bonne façon de faire — un lecteur d'écran ne doit pas lire deux plans à la
    // fois. Visuellement, la liste des pièces reste bien à gauche du tiroir.
    expect(document.querySelector('h1')?.textContent).toBe('Ma vérification')
    expect(document.querySelectorAll('h1')).toHaveLength(1)
  })

  it('la fermeture libère le fichier déchiffré gardé en mémoire', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const utilisateur = userEvent.setup()
    vi.mocked(lirePieceJustificative).mockResolvedValue({ url: 'blob:faux', type: 'image/png' })

    await monter({
      status: 'DRAFT',
      documents: [{ id: 'r', kind: 'ID', expiresAt: null, createdAt: '2026-08-20T10:00:00.000Z' }],
      missingDocuments: ['DIPLOMA', 'LICENSE', 'PHOTO'],
    })

    await utilisateur.click(screen.getByRole('button', { name: 'Voir' }))
    await screen.findByRole('dialog')
    await utilisateur.click(screen.getByRole('button', { name: 'Fermer' }))

    // Sans cette libération, la pièce d'identité reste en mémoire de l'onglet jusqu'à sa fermeture —
    // sur un poste partagé, c'est exactement ce qu'on ne veut pas laisser derrière soi.
    await waitFor(() => expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:faux'))
  })
})

describe('C1 — une décision qui ne vise aucune pièce', () => {
  it('n’affiche pas de pièce concernée quand la décision porte sur le dossier entier', async () => {
    await monter({
      status: 'REJECTED',
      decisions: [
        {
          id: 'x1',
          decision: 'REJECTED',
          reasons: 'Dossier incomplet dans son ensemble.',
          documentId: null,
          documentKind: null,
          decidedAt: '2026-08-21T09:00:00.000Z',
        },
      ],
    })
    expect(await screen.findByText(/Dossier incomplet/)).toBeInTheDocument()
    expect(screen.queryByText('Pièce concernée')).not.toBeInTheDocument()
  })
})
