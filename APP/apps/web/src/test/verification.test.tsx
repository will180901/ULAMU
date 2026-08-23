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
import { api, type MeResponse, type VerificationCase } from '@/lib/api'

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

    expect(screen.queryByRole('button', { name: /^Remplacer$/ })).not.toBeInTheDocument()
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
      decisions: [{ id: 'x1', decision: 'REJECTED', reasons: motif, decidedAt: '2026-08-21T09:00:00.000Z' }],
    })

    expect(screen.getByText(motif)).toBeInTheDocument()
    expect(screen.getByText(/Motif transmis par l'administration/)).toBeInTheDocument()
    // Et les pièces redeviennent modifiables : c'est tout l'intérêt d'un refus motivé.
    expect(screen.getAllByRole('button', { name: /^Remplacer$/ }).length).toBeGreaterThan(0)
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
