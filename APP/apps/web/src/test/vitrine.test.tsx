/**
 * C2 « Ma vitrine » — l'écran qui décide si un médecin existe pour les patients.
 *
 * Trois propriétés sont verrouillées ici, et chacune répare un défaut de la maquette.
 *
 *  1. **L'écran dit ce qui rend INVISIBLE.** `RM-05-01` écarte en base tout soignant qui n'est pas
 *     vérifié ET sous contrat signé. On peut soigner chaque mot de sa présentation et n'apparaître
 *     dans aucune recherche. La maquette n'en disait rien — elle parlait de « Prêt à publier », un
 *     état qu'elle avait inventé. Si ce bandeau disparaît, un médecin peut attendre des semaines
 *     sans comprendre.
 *
 *  2. **L'aperçu montre la LISTE.** Un patient ne voit jamais une fiche seule : il compare. Une
 *     régression qui remettrait la fiche isolée retirerait à l'écran sa seule raison d'être.
 *
 *  3. **Le net est calculé avec la commission DU CONTRAT**, pas avec un taux écrit en dur. La
 *     maquette affichait 12 % ; le contrat de démonstration dit 10 %. C'est le contrat qui paie.
 *
 * Les formes injectées viennent de l'API déployée, relevées le 24/08/2026 :
 *   GET /v1/directory → { items: [...], page, pageSize, total, suggestion }
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VitrinePage } from '@/modules/vitrine/pages/VitrinePage'
import { useSessionStore } from '@/state/session.store'
import { api, type DirectoryItem, type MeResponse, type Offer, type VerificationCase } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'p1',
  accountType: 'PROFESSIONAL',
  username: 'dr.armel',
  phone: '+242069000101',
  firstName: 'Armel',
  lastName: 'Konaté',
  district: 'Moungali',
  category: 'SPECIALIST',
  specialty: 'Cardiologie',
  biography: 'Écoute d’abord.',
  adminRole: null,
  totpEnabled: false,
  totpEnabledAt: null,
  email: 'dr.armel@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 0,
  backupCodesTotal: 0,
  backupCodesGeneratedAt: null,
}

const OFFRE: Offer = {
  id: 'o1',
  professionalId: 'p1',
  label: 'Consultation',
  durationMin: 30,
  priceXaf: 10000,
  kind: 'STANDARD',
  active: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

const confrere = (id: string, nom: string, prix: number): DirectoryItem => ({
  professionalId: id,
  displayName: nom,
  category: 'SPECIALIST',
  specialty: 'Cardiologie',
  district: 'Moungali',
  badgeVerified: true,
  rating: { avg: 4.5, count: 20 },
  reactivity: { confirmRatePct: 90, avgConfirmDelayS: 300 },
  presence: 'ONLINE',
  availableNow: true,
  cheapestOffer: { id: 'x', label: 'Consultation', durationMin: 30, priceXaf: prix, kind: 'STANDARD' },
  relevanceScore: 0.5,
})

const DOSSIER_OK: Partial<VerificationCase> = {
  status: 'VERIFIED',
  canPractice: true,
  agreement: {
    version: 1,
    commissionPct: 10,
    bodyHash: 'abc',
    body: 'CONTRAT',
    integrity: true,
    signedAt: '2026-08-01T00:00:00.000Z',
    effectiveAt: '2026-08-01T00:00:00.000Z',
  },
}

const BASE_DOSSIER: VerificationCase = {
  caseId: 'c1',
  subjectKind: 'PROFESSIONAL',
  status: 'DRAFT',
  canPractice: false,
  requiredDocuments: ['ID', 'DIPLOMA', 'LICENSE', 'PHOTO'],
  missingDocuments: [],
  canSubmit: false,
  documentsEditable: true,
  announcedDelayHours: 72,
  documents: [],
  decisions: [],
  agreement: null,
}

async function monter(opts: { dossier?: Partial<VerificationCase>; offres?: Offer[]; confreres?: DirectoryItem[] } = {}) {
  vi.spyOn(api, 'verificationMine').mockResolvedValue({ ...BASE_DOSSIER, ...opts.dossier })
  vi.spyOn(api, 'myOffers').mockResolvedValue(opts.offres ?? [OFFRE])
  vi.spyOn(api, 'myPresence').mockResolvedValue({
    state: 'ONLINE',
    since: '2026-08-24T08:00:00.000Z',
    lastHeartbeatAt: '2026-08-24T08:00:00.000Z',
    availableForInitiation: true,
    // PM-27 — servi depuis le 27/08 par `GET /v1/presence/me` : l'écran n'écrit plus « 3 » en dur.
    maxConcurrentSessions: 3,
  })
  vi.spyOn(api, 'searchDirectory').mockResolvedValue({
    items: opts.confreres ?? [],
    page: 1,
    pageSize: 20,
    total: (opts.confreres ?? []).length,
    suggestion: null,
  })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VitrinePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Ma vitrine' })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C2 — « Êtes-vous trouvable ? »', () => {
  it('un dossier non vérifié : l’écran dit que PERSONNE ne verra la vitrine', async () => {
    await monter({ dossier: { status: 'DRAFT', canPractice: false, agreement: null } })

    expect(await screen.findByText(/n’apparaissez dans aucune recherche/)).toBeInTheDocument()
    expect(screen.getByText('Dossier pas encore vérifié')).toBeInTheDocument()
    expect(screen.getByText('Contrat de partenariat non signé')).toBeInTheDocument()
    // Et une porte de sortie, pas seulement un constat (CG-08 §06).
    expect(screen.getByRole('link', { name: /Ouvrir mon dossier/ })).toBeInTheDocument()
  })

  it('les trois conditions réunies : la vitrine est annoncée visible', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(await screen.findByText(/Vous apparaissez dans les recherches/)).toBeInTheDocument()
    expect(screen.getByText('Dossier vérifié')).toBeInTheDocument()
    expect(screen.getByText('Contrat signé')).toBeInTheDocument()
    expect(screen.getByText('1 tarif(s) publié(s)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ouvrir mon dossier/ })).not.toBeInTheDocument()
  })

  it('vérifié et signé mais SANS tarif : toujours invisible', async () => {
    await monter({ dossier: DOSSIER_OK, offres: [] })

    // C'est la condition qu'on oublie : un patient ne peut pas solliciter sans savoir ce qu'il paie.
    expect(await screen.findByText(/n’apparaissez dans aucune recherche/)).toBeInTheDocument()
    expect(screen.getByText('Aucun tarif publié')).toBeInTheDocument()
  })
})

describe('C2 — l’aperçu patient', () => {
  it('montre la fiche AU MILIEU des confrères, pas seule', async () => {
    await monter({
      dossier: DOSSIER_OK,
      confreres: [confrere('c1', 'Solange Mbemba', 12000), confrere('c2', 'Firmin Okemba', 8000)],
    })

    // Trois cartes : la sienne et deux confrères. C'est ce qui rend la comparaison possible.
    const cartes = await screen.findAllByRole('article')
    expect(cartes).toHaveLength(3)
    expect(within(cartes[0] as HTMLElement).getByText('Armel Konaté')).toBeInTheDocument()
    expect(screen.getByText('Solange Mbemba')).toBeInTheDocument()
    expect(screen.getByText('Firmin Okemba')).toBeInTheDocument()
  })

  it('la fiche du médecin est désignée comme la sienne', async () => {
    await monter({ dossier: DOSSIER_OK, confreres: [confrere('c1', 'Solange Mbemba', 12000)] })
    expect(await screen.findByRole('article', { name: /Votre fiche : Armel Konaté/ })).toBeInTheDocument()
  })

  it('« Ma fiche » isole la carte ; « Dans la liste » la remet parmi les autres', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const utilisateur = userEvent.setup()
    await monter({ dossier: DOSSIER_OK, confreres: [confrere('c1', 'Solange Mbemba', 12000)] })
    await screen.findAllByRole('article')

    await utilisateur.click(screen.getByRole('button', { name: 'Ma fiche' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.queryByText('Solange Mbemba')).not.toBeInTheDocument()

    await utilisateur.click(screen.getByRole('button', { name: 'Dans la liste' }))
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
  })

  it('seul dans son arrondissement, on le lui dit au lieu d’afficher une liste vide', async () => {
    await monter({ dossier: DOSSIER_OK, confreres: [] })
    expect(await screen.findByText(/vous y êtes seul/)).toBeInTheDocument()
  })
})

describe('C2 — les tarifs', () => {
  it('le net est calculé avec la commission DU CONTRAT, pas un taux en dur', async () => {
    // 10 000 F au patient, 10 % de commission contractuelle → 9 000 F nets.
    await monter({ dossier: DOSSIER_OK })

    expect(await screen.findByText('9 000')).toBeInTheDocument()
    expect(screen.getByText('net pour vous')).toBeInTheDocument()
    // Le sous-titre annonce le taux réel du contrat — la maquette écrivait 12 % en dur.
    expect(screen.getByText(/commission ULAMU de 10 %/)).toBeInTheDocument()
  })

  it('le repère de marché vient des confrères réels', async () => {
    await monter({
      dossier: DOSSIER_OK,
      confreres: [confrere('c1', 'A', 8000), confrere('c2', 'B', 12000), confrere('c3', 'C', 15000)],
    })

    // Ni chiffre inventé, ni moyenne de plateforme : les prix réellement affichés à côté.
    const repere = await screen.findByText(/Les 3 autres spécialistes/)
    // `Intl` en français sépare les milliers par une espace fine INSÉCABLE (U+202F), pas par une
    // espace ordinaire. `getByText` la normalise, `textContent` non — on normalise donc ici, sans
    // quoi le test échouerait sur une différence invisible à l'œil.
    const texte = (repere.textContent ?? '').replace(/\s/g, ' ')
    expect(texte).toContain('8 000')
    expect(texte).toContain('15 000')
    expect(texte).toContain('12 000')
  })

  it('sans tarif, l’écran explique la conséquence plutôt que d’afficher un vide', async () => {
    await monter({ dossier: DOSSIER_OK, offres: [] })
    expect(await screen.findByText(/troisième condition pour apparaître/)).toBeInTheDocument()
  })
})

describe('C2 — la présentation', () => {
  it('borne à 400 caractères et garde l’avertissement de l’Ordre', async () => {
    await monter({ dossier: DOSSIER_OK })

    const bio = screen.getByLabelText('Présentation')
    expect(bio).toHaveAttribute('maxlength', '400')
    // La meilleure chose de la maquette : une promesse de résultat expose le praticien.
    expect(screen.getByText(/charte de l’Ordre l’interdit/)).toBeInTheDocument()
  })
})
