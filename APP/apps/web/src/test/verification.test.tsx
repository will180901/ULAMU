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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Les cinq décisions que l'écran sait dire, lues DANS l'écran.
 *
 * ⚠️ Les recopier ici ferait une troisième liste — après celle du serveur et celle de la page — et
 * *trois listes pour une même règle finissent par faire trois règles.*
 */
const LIBELLES_DECISION = [
  ...readFileSync(resolve(__dirname, '../modules/verification/pages/VerificationPage.tsx'), 'utf8')
    .split('const DECISIONS: Record<string, string> = {')[1]
    .split('}')[0]
    .matchAll(/^\s*([A-Z_]+):/gm),
].map((m) => m[1])

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
  // S4 : la dernière version réellement signée. `null` = aucun avenant en cours.
  lastSigned: null,
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
    /*
      ⚠️ **Ancre changée EN CONSCIENCE au chantier 135.** Elle exigeait l'empreinte TRONQUÉE
      (« a3f9…c210 ») — alors que la feuille imprimée affirme, elle, qu'« une empreinte tronquée ne
      prouve rien ». Elle a raison : c'est en comparant l'empreinte du papier à celle de l'écran
      qu'on vérifie qu'ils portent le même texte, et huit caractères ne permettent pas cette
      comparaison. *Deux versions d'une même preuve, c'est une preuve de moins.*

      Ce que le cas défend n'a pas bougé — *l'écran montre de quoi rattacher ce contrat au texte
      accepté* — et l'ancre est maintenant PLUS forte : elle exige les 32 caractères.
    */
    expect(screen.getByText('a3f9beefcafebabedeadbeef0000c210')).toBeInTheDocument()
    expect(screen.getByText(/change au moindre caractère modifié/)).toBeInTheDocument()
    /*
      ⚠️ **Ancre changée EN CONSCIENCE au chantier 132.** Elle exigeait un bouton « Télécharger »,
      qui produisait un fichier `.txt` : un contrat signé électroniquement livré en texte brut, sans
      en-tête, sans date de signature et sans l'empreinte qui prouve qu'il s'agit du texte accepté.

      Ce que ce cas défend n'a pas changé — *le contrat signé doit pouvoir sortir d'ULAMU* — mais il
      en sort désormais en document imprimable, et l'intitulé du bouton dit ce qu'il fait. *Un
      intitulé qui promet moins que ce qu'on obtient fait manquer ce qu'on cherchait.*
    */
    expect(screen.getByRole('button', { name: /Imprimer ou enregistrer en PDF/ })).toBeInTheDocument()
    expect(screen.queryByLabelText(/recopiez votre nom complet/i)).not.toBeInTheDocument()
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
    expect(screen.queryByLabelText(/recopiez votre nom complet/i)).not.toBeInTheDocument()
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

    const champ = screen.getByLabelText(/recopiez votre nom complet/i)
    // « Continuer » ne prévenait de rien : ce bouton envoie un code à usage unique.
    const continuer = screen.getByRole('button', { name: 'Recevoir mon code de signature' })
    expect(continuer).toBeDisabled()

    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(champ, { target: { value: 'Jean Dupont' } })
    await waitFor(() => expect(screen.getByText(/ne correspond pas à celui de votre compte/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Recevoir mon code de signature' })).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'ange makaya' } }) // la casse ne doit pas bloquer
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Recevoir mon code de signature' })).toBeEnabled(),
    )
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

/**
 * L'avenant (EF-03-07, RM-03-05, S4).
 *
 * Un super-administrateur change PM-01 dans E3 → le serveur ré-édite tous les contrats signés → la
 * nouvelle version est NON signée → `canPractice` tombe à `false`. **Un soignant perd son droit
 * d'exercer du jour au lendemain, sans avoir rien fait.**
 *
 * Ce qui est verrouillé ici : qu'on ne lui demande jamais de signer à l'aveugle, et qu'on lui dise
 * la conséquence — pas seulement la cause.
 */
describe('C1 — l’avenant au contrat', () => {
  /** Un contrat ré-édité : version courante non signée, une version signée derrière. */
  const reedite = (ancienTaux: number, nouveauTaux: number) => ({
    status: 'VERIFIED' as const,
    canPractice: false,
    agreement: {
      version: 3,
      commissionPct: nouveauTaux,
      bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
      body: 'CONTRAT SOIGNANT ULAMU',
      integrity: true,
      signedAt: null,
      effectiveAt: null,
    },
    lastSigned: { version: 2, commissionPct: ancienTaux, signedAt: '2026-07-01T10:00:00.000Z' },
  })

  it('dit la CONSÉQUENCE, pas seulement que le contrat a changé', async () => {
    await monter(reedite(10, 12))

    // « Votre contrat a été modifié » ne dit rien à qui ne connaît pas la règle. Ce qui compte,
    // c'est qu'il ne reçoit plus aucune demande tant qu'il n'a pas re-signé.
    expect(await screen.findByText(/vous n'apparaissez plus dans l'annuaire/)).toBeInTheDocument()
  })

  it('montre l’ancien taux À CÔTÉ du nouveau — jamais une signature à l’aveugle', async () => {
    await monter(reedite(10, 12))

    expect(await screen.findByText('Ce que vous aviez signé')).toBeInTheDocument()
    expect(screen.getByText('10 %')).toBeInTheDocument()
    expect(screen.getByText("Ce qu'on vous propose")).toBeInTheDocument()
    expect(screen.getByText('12 %')).toBeInTheDocument()
  })

  /*
    ⚠️ **Ancre changée EN CONSCIENCE au chantier 135.** Ce cas s'appelle « le bouton dit ce qu'on
    regagne en signant » et vérifiait… l'existence du bouton « Lire le nouveau contrat » — qui
    n'était pas le bouton dont il parle. Le contrat non signé étant désormais déployé, ce bouton
    n'existe plus ; le cas va maintenant jusqu'au bouton qu'il annonçait.

    *Un cas qui s'arrête avant ce qu'il prétend vérifier passe même quand la chose a disparu.*
  */
  it('le bouton dit ce qu’on regagne en signant', async () => {
    vi.spyOn(api, 'verificationSignStart').mockResolvedValue({ expiresInSeconds: 300 })
    await monter(reedite(10, 12))

    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(await screen.findByLabelText(/recopiez votre nom complet/i), {
      target: { value: 'Ange Makaya' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code de signature' }))

    expect(
      await screen.findByRole('button', { name: 'Re-signer et reprendre mon activité' }),
    ).toBeInTheDocument()
  })

  it('une baisse de taux est un avenant comme un autre — l’écran ne suppose pas le sens', async () => {
    await monter(reedite(15, 10))

    expect(await screen.findByText('15 %')).toBeInTheDocument()
    expect(screen.getByText('10 %')).toBeInTheDocument()
  })

  it('aucune comparaison sur une PREMIÈRE signature : il n’y a rien à comparer', async () => {
    await monter({
      status: 'VERIFIED',
      canPractice: false,
      agreement: {
        version: 1,
        commissionPct: 10,
        bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
        body: 'CONTRAT SOIGNANT ULAMU',
        integrity: true,
        signedAt: null,
        effectiveAt: null,
      },
      lastSigned: null,
    })

    // Le contrat non signé est déployé : plus de bouton « Lire le contrat » à attendre. On attend
    // ce qui est propre à une signature en cours — le champ du nom.
    await screen.findByLabelText(/recopiez votre nom complet/i)
    expect(screen.queryByText('Ce que vous aviez signé')).not.toBeInTheDocument()
    expect(screen.queryByText(/vous n'apparaissez plus dans l'annuaire/)).not.toBeInTheDocument()
  })

  it('rien non plus quand la version courante est déjà signée', async () => {
    await monter({
      status: 'VERIFIED',
      canPractice: true,
      agreement: {
        version: 3,
        commissionPct: 12,
        bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
        body: 'CONTRAT SOIGNANT ULAMU',
        integrity: true,
        signedAt: '2026-08-22T16:42:00.000Z',
        effectiveAt: '2026-08-22T16:42:00.000Z',
      },
      lastSigned: { version: 2, commissionPct: 10, signedAt: '2026-07-01T10:00:00.000Z' },
    })

    expect(await screen.findByText(/Contrat signé le/)).toBeInTheDocument()
    expect(screen.queryByText('Ce que vous aviez signé')).not.toBeInTheDocument()
  })
})

/**
 * Famille 1 (points 1 et 2) et famille 2 (point 3) : trois phrases de la maquette que le serveur
 * n'aurait jamais tenues.
 */
describe('C1 — ce que la maquette promettait et qui n’existe pas', () => {
  const signe = {
    status: 'VERIFIED' as const,
    canPractice: true,
    agreement: {
      version: 2,
      commissionPct: 10,
      bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
      body: 'CONTRAT SOIGNANT ULAMU',
      integrity: true,
      signedAt: '2026-08-22T16:42:00.000Z',
      effectiveAt: '2026-08-22T16:42:00.000Z',
    },
  }

  /*
    ⚠️ **Ces deux cas montaient un dossier VÉRIFIÉ et exigeaient la file d'attente** — ils gardaient
    donc le défaut corrigé au chantier 127 : l'écran annonçait « les dossiers sont examinés du plus
    ancien au plus récent » et « vous serez prévenu dès qu'une décision est prise » à quelqu'un dont
    la décision ÉTAIT PRISE.

    Ce qu'ils défendaient reste entier — la maquette promettait « une réponse sous 24 heures
    ouvrées » que rien ne tenait, et on dit à la place ce qui est vrai. Seul l'ÉTAT change : ces
    phrases n'ont de sens que pendant l'attente, et c'est sur un dossier en attente qu'on les
    éprouve désormais.

    *Un test posé sur le mauvais état ne prouve pas la règle : il fige l'endroit où elle est fausse.*
  */
  const enExamen = { ...signe, status: 'IN_REVIEW' as const, canPractice: false }

  it('n’annonce aucun délai de réponse de l’administration', async () => {
    await monter(enExamen)

    // La phrase promettait une réponse « sous 24 heures ouvrées » alors qu'aucune messagerie
    // support n'existe : aucun bouton ne permettait même de poser la question.
    expect(await screen.findByText(/Ce qui se passe maintenant/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('24 heures')
    expect(document.body.textContent).not.toContain('ouvrées')
  })

  it('dit ce qui est vrai à la place : rien n’est attendu du soignant', async () => {
    await monter(enExamen)

    expect(await screen.findByText(/du plus ancien au plus récent/)).toBeInTheDocument()
    expect(screen.getByText(/il n'y a rien à relancer/)).toBeInTheDocument()
  })

  /*
    ⚠️ **Le cas qui manquait, et qui a laissé passer la contradiction** — chantier 127, mesuré en
    ligne sur le compte d'Armel Konaté : dossier VÉRIFIÉ, badge actif, et l'écran disait quand même
    « en cours d'examen », « À déposer » et « vous serez prévenu ».

    > *Un écran qui ne sait pas dire où en est votre dossier est pire qu'un écran laid.*
  */
  it('sur un dossier VÉRIFIÉ, ne parle plus d’examen ni d’attente', async () => {
    await monter(signe)

    expect(await screen.findByText(/Vous pouvez exercer/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('du plus ancien au plus récent')
    expect(document.body.textContent).not.toContain('en cours d’examen')
    expect(document.body.textContent).not.toContain('À déposer')
  })

  /*
    ⚠️ Masquer une explication périmée ne doit pas emporter le bouton qui l'accompagnait : c'est le
    SEUL chemin vers l'administration depuis cet écran, et le plus utile quand un dossier vient
    d'être refusé.
  */
  it('garde « Écrire à l’administration » quand la décision est prise', async () => {
    await monter(signe)

    expect(await screen.findByText(/Écrire à l'administration/)).toBeInTheDocument()
  })

  it('ne parle d’aucun versement mensuel : le retrait se demande', async () => {
    await monter(signe)

    expect(await screen.findByText(/retirables à tout moment/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/le 5 de chaque mois|versement mensuel/i)
  })

  it('affiche le taux du CONTRAT, pas un taux écrit dans la page', async () => {
    // Deux soignants peuvent avoir deux taux (RM-13-07) : l'écran lit celui de son contrat.
    await monter({ ...signe, agreement: { ...signe.agreement, commissionPct: 15 } })

    expect(await screen.findByText(/Commission de 15 %/)).toBeInTheDocument()
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — la phrase que cet écran ne doit pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════
*/
describe('C2 — filet de refonte : ce que le soignant attend, et pourquoi', () => {
  /*
    Un dossier vérifié ne suffit pas : il faut encore un contrat, que l'administration établit
    ENSUITE. Sans cette phrase, le soignant vérifié croit son parcours fini et attend un contrat
    qu'il ne sait pas devoir attendre.
  */
  it('dit qu’un contrat n’existe qu’après la vérification des pièces', async () => {
    await monter({ status: 'VERIFIED', canPractice: false, agreement: null })

    expect(await screen.findByText(/L'administration l'établit après avoir vérifié vos pièces/)).toBeInTheDocument()
  })
})

/*
  ── ⚠️ On pouvait signer sans avoir lu — chantier 135, 16/09/2026 ─────────────────────

  Le texte s'affichait dans un `<pre>` gris de 11 px, haut de 288 px, replié derrière un bouton
  « Lire le contrat » — et le bouton de signature s'activait **que cette boîte ait été ouverte ou
  non**. On pouvait signer onze articles sans en avoir vu un seul.

  > **Un texte qu'on présente en petit, en gris et replié n'est pas présenté : il est rangé.**

  Pas de case « j'ai lu », pas de détection de défilement : *la preuve qu'on a lu, c'est qu'on a dû
  passer devant.* Le texte est déployé, la signature est en bas.
*/
describe('C1 — le contrat qu’on doit signer se lit sans un geste', () => {
  const SAUT = String.fromCharCode(10)

  const CORPS = [
    'CONTRAT DE PARTENARIAT ULAMU',
    '',
    'ENTRE : ULAMU, plateforme de télémédecine, ci-après « la Plateforme ».',
    '',
    'ARTICLE 1 — OBJET',
    'La Plateforme met à disposition un service de mise en relation.',
    '',
    'ARTICLE 2 — RESPONSABILITÉ DE L’ACTE MÉDICAL',
    'Le praticien demeure seul responsable de ses actes.',
    '',
    'ARTICLE 3 — HONORAIRES ET COMMISSION',
    'La commission est retenue sur chaque consultation réglée.',
    '',
    'ARTICLE 4 — LOI APPLICABLE',
    'Le présent contrat est régi par le droit de la République du Congo.',
    '',
    'Signataire : Ange Makaya — Version 1.',
  ].join(SAUT)

  const aSigner = (corps = CORPS) => ({
    status: 'VERIFIED' as const,
    canPractice: false,
    agreement: {
      version: 1,
      commissionPct: 10,
      bodyHash: 'a3f9beefcafebabedeadbeef0000c210',
      body: corps,
      integrity: true,
      signedAt: null,
      effectiveAt: null,
    },
    lastSigned: null,
  })

  it('affiche les articles sans qu’on ait à déplier quoi que ce soit', async () => {
    await monter(aSigner())

    /*
      ⚠️ On vise le TITRE, pas le lien : l'intitulé figure aussi dans le sommaire, et `getByText`
      en trouvait deux. *Une ancre qui tombe sur deux éléments ne dit pas lequel elle garde.*
    */
    expect(await screen.findByRole('heading', { name: 'ARTICLE 1 — OBJET' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'ARTICLE 2 — RESPONSABILITÉ DE L’ACTE MÉDICAL' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/seul responsable de ses actes/)).toBeInTheDocument()
    // Et le bouton qui servait à le déplier n'a plus lieu d'être.
    expect(screen.queryByRole('button', { name: 'Lire le contrat' })).not.toBeInTheDocument()
  })

  /*
    Onze articles sans table des matières se parcourent au jugé. *Ce qu'on relira — la commission, la
    résiliation, la responsabilité — doit se trouver sans être cherché.*
  */
  it('donne un sommaire, avec les intitulés tels qu’ils sont écrits', async () => {
    await monter(aSigner())

    const sommaire = within(await screen.findByRole('navigation', { name: 'Sommaire du contrat' }))
    expect(sommaire.getByRole('link', { name: 'ARTICLE 3 — HONORAIRES ET COMMISSION' })).toBeInTheDocument()
  })

  /*
    ⚠️ **Emporter le texte AVANT de s'engager.** Le bouton d'impression n'apparaissait qu'une fois le
    contrat signé : personne ne pouvait le montrer à un juriste avant. *Demander une signature sans
    laisser emporter le texte, c'est demander de signer sur place.*
  */
  it('se sort en document AVANT la signature', async () => {
    await monter(aSigner())

    expect(await screen.findByRole('button', { name: /Imprimer ce projet/ })).toBeInTheDocument()
    expect(screen.getByText(/montrer à un juriste/)).toBeInTheDocument()
  })

  /*
    ⚠️ **Un bouton gris sans raison se lit comme une panne.** Quatre conditions le grisaient, une
    seule était expliquée.
  */
  it('dit ce qui manque encore pour signer, au lieu de griser en silence', async () => {
    vi.spyOn(api, 'verificationSignStart').mockResolvedValue({ expiresInSeconds: 300 })
    await monter(aSigner())

    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(await screen.findByLabelText(/recopiez votre nom complet/i), {
      target: { value: 'Ange Makaya' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir mon code de signature' }))

    expect(await screen.findByText(/votre mot de passe et le code à 6 chiffres/)).toBeInTheDocument()
  })

  /*
    Le texte est scellé par une empreinte. Le mettre en page : oui. En changer un mot, un ordre ou une
    CASSE : jamais — *une empreinte ne voit que des octets qui ont changé.*
  */
  it('ne perd ni la clôture, ni le préambule', async () => {
    await monter(aSigner())

    expect(await screen.findByText(/ci-après « la Plateforme »/)).toBeInTheDocument()
    expect(screen.getByText(/Signataire : Ange Makaya/)).toBeInTheDocument()
  })

  it('range le contrat une fois qu’il est signé', async () => {
    await monter({
      ...aSigner(),
      canPractice: true,
      agreement: { ...aSigner().agreement, signedAt: '2026-08-22T16:42:00.000Z', effectiveAt: '2026-08-22T16:42:00.000Z' },
    })

    // Signé : le texte se range derrière un bouton. *Un contrat qu'on doit signer se déplie, un
    // contrat signé se range.*
    expect(await screen.findByRole('button', { name: 'Lire le contrat' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'ARTICLE 1 — OBJET' })).not.toBeInTheDocument()
  })
})

/*
  ── ⚠️ « Décision : VERIFIED » — chantier 135 ──────────────────────────────────

  L'historique recopiait le mot-clé de la base : un médecin de Brazzaville lisait « VERIFIED » dans
  la colonne de son propre dossier.

  > **Un mot que le produit n'a jamais traduit est un mot que le produit n'a jamais lu.**
*/
describe('C1 — l’historique parle français', () => {
  const avecDecision = (code: string) => ({
    status: 'VERIFIED' as const,
    canPractice: true,
    documentsEditable: false,
    decisions: [
      { id: 'x1', decision: code, reasons: 'Pièces conformes.', documentId: null, documentKind: null, decidedAt: '2026-08-22T16:42:00.000Z' },
    ],
  })

  it('traduit la décision au lieu de recopier le mot-clé du serveur', async () => {
    await monter(avecDecision('VERIFIED'))

    expect(await screen.findByText('Dossier vérifié')).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toContain('VERIFIED')
  })

  it('en fait autant des quatre autres', async () => {
    for (const [code, attendu] of [
      ['REJECTED', 'Dossier refusé'],
      ['NEEDS_INFO', 'Complément demandé'],
      ['REVOKED', 'Vérification révoquée'],
      ['REINSTATED', 'Vérification rétablie'],
    ] as const) {
      const { unmount } = await monter(avecDecision(code))
      expect(await screen.findByText(attendu)).toBeInTheDocument()
      unmount()
    }
  })

  /*
    ⚠️ **Le filet qui compte.** La table ci-dessus est une recopie des valeurs que le serveur
    déclare dans son schéma. *Une recopie ne suit pas sa source : le jour où une sixième décision
    apparaît côté serveur, l'écran se remet à afficher un mot-clé anglais sans que personne ne le
    voie.* On va donc lire les valeurs LÀ OÙ LE SERVEUR LES ÉCRIT.
  */
  it('couvre exactement les décisions que le serveur déclare', () => {
    const schema = readFileSync(resolve(__dirname, '../../../api/prisma/schema.prisma'), 'utf8')
    const ligne = schema.split(String.fromCharCode(10)).find((l) => /^\s*decision\s+String/.test(l)) ?? ''
    const duServeur = [...ligne.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1])

    // Si la lecture du schéma échoue, le cas doit TOMBER, pas passer sur une liste vide.
    expect(duServeur.length).toBeGreaterThanOrEqual(5)
    expect([...duServeur].sort()).toEqual([...LIBELLES_DECISION].sort())
  })
})

/*
  ⚠️ **« dossier 3F8A2C10 »** — un identifiant technique tronqué, affiché en sous-titre sans rien
  dire. Montré à quelqu'un qui n'a personne à qui le donner, ce n'est pas une information : c'est un
  reste de machine.
*/
describe('C1 — la référence du dossier sert à quelque chose', () => {
  it('dit à quoi elle sert, au lieu de la poser là', async () => {
    await monter({
      status: 'REJECTED',
      documentsEditable: true,
      decisions: [
        { id: 'x1', decision: 'REJECTED', reasons: 'Copie illisible.', documentId: null, documentKind: null, decidedAt: '2026-08-22T16:42:00.000Z' },
      ],
    })

    expect(await screen.findByText(/Référence à rappeler si vous écrivez à l'administration/)).toBeInTheDocument()
    expect(screen.getByText('AB12CD34')).toBeInTheDocument()
  })
})
