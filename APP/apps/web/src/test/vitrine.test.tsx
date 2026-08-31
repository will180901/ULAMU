/**
 * C2 « Ma vitrine » — l'écran qui décide si un médecin existe pour les patients.
 *
 * ── Réécrit le 27/08/2026, en même temps que l'écran ───────────────────────────────────────────
 *
 * L'ancienne version de ce fichier verrouillait une propriété que le porteur a refusée :
 * « l'aperçu montre la LISTE… une régression qui remettrait la fiche isolée retirerait à l'écran sa
 * seule raison d'être ». C'était le parti pris de l'auteur, pas celui de la maquette — laquelle
 * montre **une fiche seule**, dans un rail de 320 px, mesuré en l'affichant.
 *
 * Un test qui protège une invention la rend permanente. Ceux-là protègent des FAITS.
 *
 * ── Ce qui est verrouillé ici ──────────────────────────────────────────────────────────────────
 *
 *  1. **L'écran dit ce qui rend INVISIBLE.** RM-05-01 écarte en base tout soignant qui n'est pas
 *     vérifié ET sous contrat signé. On peut soigner chaque mot et n'apparaître nulle part.
 *
 *  2. **Aucun chiffre métier n'est écrit dans la page.** Le taux vient du CONTRAT SIGNÉ (deux
 *     médecins peuvent en avoir deux différents, RM-13-07) ; les bornes d'une offre viennent de
 *     `GET /v1/offers/limits` (PM-09 / PM-06 / PM-25). Les tests 5 et 6 changent ces valeurs côté
 *     serveur et exigent que la page suive.
 *
 *  3. **Ce que la maquette invente ne revient pas** : langues de consultation, lieux et cabinets,
 *     et les « 318 vues de fiche » que rien ne compte.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VitrinePage } from '@/modules/vitrine/pages/VitrinePage'
import { useSessionStore } from '@/state/session.store'
import {
  api,
  type DirectoryProfile,
  type MeResponse,
  type Offer,
  type OfferLimits,
  type VerificationCase,
} from '@/lib/api'

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

const BORNES: OfferLimits = {
  durationMinMinutes: 10,
  durationMaxMinutes: 60,
  priceFloorXaf: 500,
  maxActiveOffers: 5,
  activeOffers: 1,
}

const PUBLIQUE: DirectoryProfile = {
  professionalId: 'p1',
  displayName: 'Dr Armel Konaté',
  category: 'SPECIALIST',
  specialty: 'Cardiologie',
  district: 'Moungali',
  badgeVerified: true,
  rating: { avg: 4.6, count: 18 },
  reactivity: { confirmRatePct: 92, avgConfirmDelayS: 240 },
  presence: 'ONLINE',
  availableNow: true,
  cheapestOffer: { id: 'o1', label: 'Consultation', durationMin: 30, priceXaf: 10000, kind: 'STANDARD' },
  relevanceScore: 0.9,
  biography: 'Écoute d’abord.',
  offers: [{ id: 'o1', label: 'Consultation', durationMin: 30, priceXaf: 10000, kind: 'STANDARD' }],
  ratingDistribution: { '5': 12, '4': 6 },
  latestComments: [{ score: 5, comment: 'Très à l’écoute.', createdAt: '2026-08-20T09:00:00.000Z' }],
}

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
  // S4 : la dernière version réellement signée. `null` = aucun avenant en cours.
  lastSigned: null,
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

async function monter(
  opts: {
    dossier?: Partial<VerificationCase>
    offres?: Offer[]
    bornes?: Partial<OfferLimits>
    publique?: DirectoryProfile | null
  } = {},
) {
  vi.spyOn(api, 'verificationMine').mockResolvedValue({ ...BASE_DOSSIER, ...opts.dossier })
  vi.spyOn(api, 'myOffers').mockResolvedValue(opts.offres ?? [OFFRE])
  vi.spyOn(api, 'offerLimits').mockResolvedValue({ ...BORNES, ...opts.bornes })
  vi.spyOn(api, 'directoryProfile').mockImplementation(async () => {
    const p = opts.publique === undefined ? PUBLIQUE : opts.publique
    if (!p) throw new Error('introuvable')
    return p
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

describe('C2 — « Êtes-vous visible ? »', () => {
  it('un dossier non vérifié : l’écran dit que la fiche n’apparaît nulle part', async () => {
    await monter({ dossier: { status: 'DRAFT', canPractice: false, agreement: null }, publique: null })

    expect(await screen.findByText(/n’apparaît pas dans l’annuaire/)).toBeInTheDocument()
    // Et une porte de sortie, pas seulement un constat (CG-08 §06).
    expect(screen.getByRole('link', { name: /Voir mon dossier/ })).toBeInTheDocument()
  })

  it('vérifié et sous contrat mais SANS offre active : toujours insollicitable', async () => {
    await monter({ dossier: DOSSIER_OK, offres: [{ ...OFFRE, active: false }] })

    expect(await screen.findByText(/sans offre active un patient n’a aucun moyen de vous solliciter/)).toBeInTheDocument()
  })

  it('les trois conditions réunies : plus aucun avertissement', async () => {
    await monter({ dossier: DOSSIER_OK })

    await waitFor(() => expect(screen.getByText(/Visible dans l’annuaire/)).toBeInTheDocument())
    expect(screen.queryByText(/n’apparaît pas dans l’annuaire/)).not.toBeInTheDocument()
  })
})

describe('C2 — aucun chiffre métier écrit dans la page', () => {
  it('le net vient de la commission DU CONTRAT, pas d’un taux en dur', async () => {
    // La maquette affichait 12 %. Le contrat de démonstration dit 10 %. C'est le contrat qui paie.
    await monter({ dossier: DOSSIER_OK })

    // 10 000 − 10 % = 9 000.
    expect(await screen.findByText('9 000')).toBeInTheDocument()
    expect(screen.getByText(/commission 10 %/)).toBeInTheDocument()
  })

  it('un AUTRE taux de contrat donne un AUTRE net — deux médecins peuvent différer (RM-13-07)', async () => {
    await monter({
      dossier: { ...DOSSIER_OK, agreement: { ...DOSSIER_OK.agreement!, commissionPct: 15 } },
    })

    // 10 000 − 15 % = 8 500. Si un 10 était écrit dans la page, ce test tomberait.
    expect(await screen.findByText('8 500')).toBeInTheDocument()
    expect(screen.getByText(/commission 15 %/)).toBeInTheDocument()
  })

  it('les bornes d’une offre sont ANNONCÉES, et viennent du serveur', async () => {
    await monter({ dossier: DOSSIER_OK })

    const aide = await screen.findByText(/Durée entre/)
    expect(aide).toHaveTextContent('10')
    expect(aide).toHaveTextContent('60')
    expect(aide).toHaveTextContent('500 XAF')
    expect(aide).toHaveTextContent('1 sur 5')
  })

  it('si E3 change PM-09/PM-06/PM-25, l’écran suit', async () => {
    await monter({
      dossier: DOSSIER_OK,
      bornes: { durationMinMinutes: 15, durationMaxMinutes: 45, priceFloorXaf: 2000, maxActiveOffers: 3 },
    })

    const aide = await screen.findByText(/Durée entre/)
    expect(aide).toHaveTextContent('15')
    expect(aide).toHaveTextContent('45')
    expect(aide).toHaveTextContent('2 000 XAF')
    expect(aide).toHaveTextContent('1 sur 3')
  })

  it('au plafond d’offres actives, l’ajout est remplacé par la raison', async () => {
    await monter({ dossier: DOSSIER_OK, bornes: { activeOffers: 5, maxActiveOffers: 5 } })

    expect(await screen.findByText(/soit le maximum/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajouter cette offre/ })).not.toBeInTheDocument()
  })
})

describe('C2 — ce que les patients voient', () => {
  it('vient de la VRAIE route publique, appelée sur son propre identifiant', async () => {
    await monter({ dossier: DOSSIER_OK })

    await waitFor(() => expect(api.directoryProfile).toHaveBeenCalledWith('p1'))
    expect(await screen.findByText('4.6')).toBeInTheDocument()
    expect(screen.getByText('18 avis')).toBeInTheDocument()
    expect(screen.getByText('92 %')).toBeInTheDocument()
    // Le délai est traduit en langage humain : 240 s → « 4 minutes ».
    expect(screen.getByText('4 minutes')).toBeInTheDocument()
  })

  it('dit qu’on ne peut NI répondre NI masquer un avis (famille 4, point 7)', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(await screen.findByText(/ni répondre à un\s+avis, ni le masquer/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Répondre/ })).not.toBeInTheDocument()
  })
})

describe('C2 — ce que la maquette invente ne revient pas', () => {
  it('aucune langue de consultation (D-005, PM-15 : français uniquement)', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(screen.queryByText(/Langues de consultation/)).not.toBeInTheDocument()
    expect(screen.queryByText('Lingala')).not.toBeInTheDocument()
  })

  it('aucun lieu, cabinet ni horaire — la fiche n’a qu’un arrondissement (EF-05-01)', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(screen.queryByText(/Lieux de consultation/)).not.toBeInTheDocument()
    expect(screen.queryByText(/cabinet/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Arrondissement')).toBeInTheDocument()
  })

  it('aucune « vue de fiche » — rien ne les compte côté serveur', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(screen.queryByText(/Vues de la fiche/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Taux de conversion/)).not.toBeInTheDocument()
  })

  it('aucun bouton « Publier » — le serveur publie à l’enregistrement', async () => {
    await monter({ dossier: DOSSIER_OK })

    expect(screen.queryByRole('button', { name: /^Publier$/ })).not.toBeInTheDocument()
  })
})

describe('C2 — l’identité', () => {
  it('la spécialité ne s’édite pas, et la raison est écrite (arbitrage du 27/08)', async () => {
    await monter({ dossier: DOSSIER_OK })

    const champ = screen.getByDisplayValue('Cardiologie') as HTMLInputElement
    expect(champ).toBeDisabled()
    expect(screen.getByText(/Une modification passe par l’administration/)).toBeInTheDocument()
  })

  it('la présentation est bornée à 400 caractères et garde l’avertissement de l’Ordre', async () => {
    await monter({ dossier: DOSSIER_OK })

    const bio = screen.getByLabelText('Présentation') as HTMLTextAreaElement
    await userEvent.clear(bio)
    await userEvent.paste('x'.repeat(500))

    expect(bio.value).toHaveLength(400)
    expect(screen.getByText(/promesses de résultat/)).toBeInTheDocument()
  })
})
