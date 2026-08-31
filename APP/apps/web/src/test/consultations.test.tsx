/**
 * C4 « Consultations » — le registre du soignant.
 *
 * Ce que cet écran doit faire, et qu'aucun autre ne fait : **rappeler les comptes-rendus qui
 * manquent**, et dire ce que chaque consultation a réellement rapporté. RM-06-04 gèle les gains
 * tant que le compte-rendu n'est pas déposé ; passé PM-30 le dépôt est refusé et l'administration
 * alertée. Un médecin qui ne voit pas cette dette la découvre en constatant que l'argent ne vient pas.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **Aucun délai écrit.** La maquette disait 48 h, la version précédente de cet écran disait
 *     « 24 heures » en dur. Les deux sont morts : l'échéance vient du serveur (`reportDueAt`), et
 *     l'écran décompte. Un chiffre juste écrit en dur est un chiffre faux en sursis.
 *  2. **Aucun prix calculé.** Les honoraires sont LUS au journal des gains, joints par `orderRef`
 *     (S9). Une consultation sans compte-rendu n'a aucun mouvement : ce n'est pas une donnée
 *     manquante, c'est de l'argent pas encore gagné, et l'écran doit le dire ainsi.
 *  3. **Aucune identité de patient.** Le registre n'en charge pas, et n'a pas à en réclamer une
 *     pour décorer un tableau.
 *  4. **Aucun mode de consultation.** « Téléconsultation / En cabinet » n'a pas de référent : la
 *     messagerie est le seul portail, et un médecin n'est rattachable à aucun cabinet.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConsultationsPage } from '@/modules/consultation/pages/ConsultationsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Earnings, type MeResponse, type Offer, type Prescription, type SessionListItem } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'pro-1',
  accountType: 'PROFESSIONAL',
  username: 'dr.nouveau',
  phone: '+242069000110',
  firstName: 'Ange',
  lastName: 'Makaya',
  district: 'Bacongo',
  category: 'GENERAL_PRACTITIONER',
  specialty: 'Médecin généraliste',
  biography: null,
  adminRole: null,
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const ilYA = (heures: number) => new Date(Date.now() - heures * 3600e3).toISOString()
/**
 * Une échéance à `heures` d'ici. Les tests visent des demi-heures (4,5 → « 4 h 29 min ») : à pile
 * 4 h, les quelques millisecondes de rendu font retomber l'affichage sur « 3 h 59 min ».
 */
const dans = (heures: number) => new Date(Date.now() + heures * 3600e3).toISOString()

function seance(over: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: 's1',
    status: 'ENDED',
    patientAccountId: 'pat-1',
    professionalId: 'pro-1',
    subProfileId: null,
    durationMin: 30,
    paidAt: ilYA(30),
    endsAt: ilYA(29),
    endedAt: ilYA(29),
    remainingSeconds: 0,
    reportDepositedAt: null,
    // Échéance servie par le serveur (`endedAt` + PM-30) : l'écran décompte au lieu d'écrire un
    // délai en dur. `null` par défaut — chaque test la pose s'il en a besoin.
    reportDueAt: null,
    // S9 : la clé qui relie la consultation à son mouvement au journal des gains.
    orderRef: 'ord-ref-1',
    ...over,
  }
}

function ordonnance(over: Partial<Prescription> = {}): Prescription {
  return {
    id: 'o1',
    sessionId: 's1',
    status: 'ACTIVE',
    qrToken: 'tok',
    subProfileId: null,
    expiresAt: '2026-09-24T00:00:00.000Z',
    createdAt: '2026-08-24T10:00:00.000Z',
    cancelReason: null,
    lines: [
      {
        id: 'l1',
        medicamentId: 'm1',
        medicationName: 'Amlodipine 5 mg',
        freeText: null,
        posology: '1 comprimé le matin',
        durationDays: 30,
        qtyPrescribed: 30,
        qtyDispensed: 0,
      },
    ],
    ...over,
  }
}

/** Le journal des gains : c'est lui qui porte les montants, jamais la vue des séances. */
function journal(entries: Earnings['entries'] = []): Earnings {
  return {
    holderType: 'PROFESSIONAL',
    holderId: 'pro-1',
    availableXaf: 0,
    pendingXaf: 0,
    entries,
    withdrawals: [],
  }
}

const credit = (reference: string, amountXaf: number, quand = ilYA(1)) => ({
  id: `e-${reference}-${amountXaf}`,
  type: 'CREDIT',
  amountXaf,
  reference,
  createdAt: quand,
})

async function monter(
  seances: SessionListItem[],
  options: { ordonnances?: Prescription[]; gains?: Earnings; offres?: Offer[] } = {},
) {
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: seances })
  vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: options.ordonnances ?? [] })
  vi.spyOn(api, 'earnings').mockResolvedValue(options.gains ?? journal())
  vi.spyOn(api, 'myOffers').mockResolvedValue(options.offres ?? [])
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ConsultationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Consultations' })
}

/** La ligne du tableau qui porte cette référence — les huit premiers caractères, en majuscules. */
const ligne = async (id: string) =>
  (await screen.findByText(id.slice(0, 8).toUpperCase())).closest('tr') as HTMLElement

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('C4 — le délai de dépôt', () => {
  it("n'écrit aucun délai : il décompte l'échéance servie par le serveur", async () => {
    await monter([seance({ reportDueAt: dans(4.5) })])

    expect(await screen.findByText(/4 h \d\d min pour déposer/)).toBeInTheDocument()
    // Ni le chiffre de la maquette, ni celui qui le « corrigeait ».
    expect(document.body.textContent).not.toContain('48 h')
    expect(document.body.textContent).not.toContain('24 heures')
  })

  it('suit PM-30 si le super-administrateur le change dans E3', async () => {
    await monter([seance({ reportDueAt: dans(40) })])

    // Même écran, même code, autre échéance : c'est le serveur qui décide.
    expect(await screen.findByText(/1 j 1[56] h pour déposer/)).toBeInTheDocument()
  })

  it('un délai dépassé dit que les gains sont gelés', async () => {
    await monter([seance({ reportDueAt: ilYA(2) })])

    expect(await screen.findByText(/Délai dépassé — gains gelés/)).toBeInTheDocument()
  })

  it('compte les comptes-rendus en attente, et prévient sans citer d’heures', async () => {
    await monter([
      seance({ id: 's1', reportDueAt: dans(4.5) }),
      seance({ id: 's2', reportDueAt: dans(9) }),
      // Déposé : celui-ci ne compte plus.
      seance({ id: 's3', reportDepositedAt: ilYA(1) }),
      // En cours : rien à déposer tant qu'elle n'est pas finie.
      seance({ id: 's4', status: 'ACTIVE', endedAt: null }),
    ])

    expect(await screen.findByText(/2 comptes-rendus en attente/)).toBeInTheDocument()
    // La tuile met en avant la plus urgente des deux échéances.
    expect(screen.getByText(/Le plus urgent : 4 h/)).toBeInTheDocument()
  })

  it('aucun rappel quand tout est déposé — un écran ne parle pas pour rien', async () => {
    await monter([seance({ reportDepositedAt: ilYA(1) })])

    await screen.findByText(/Déposé le/)
    expect(screen.queryByText(/en attente\./)).not.toBeInTheDocument()
    expect(screen.getByText('Rien en attente')).toBeInTheDocument()
  })
})

describe('C4 — les honoraires, lus et non calculés', () => {
  it("affiche le montant réellement crédité, joint par `orderRef`", async () => {
    await monter([seance({ orderRef: 'cmd-42', reportDepositedAt: ilYA(1) })], {
      gains: journal([credit('cmd-42', 11_250)]),
    })

    expect(within(await ligne('s1')).getByText(/11 250 XAF/)).toBeInTheDocument()
  })

  /**
   * RM-06-04 : la capture a lieu au dépôt du compte-rendu. Tant qu'il manque, il n'y a AUCUN
   * mouvement au journal — et c'est une information, pas un trou.
   */
  it("sans compte-rendu, il ne montre pas zéro : il dit que l'argent n'est pas encore gagné", async () => {
    await monter([seance({ orderRef: 'cmd-42', reportDueAt: dans(4) })], { gains: journal([]) })

    expect(within(await ligne('s1')).getByText('Au dépôt du compte-rendu')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('0 XAF')
  })

  it('un remboursement annule le crédit sur la même référence (D-008)', async () => {
    await monter([seance({ id: 's1', status: 'REFUNDED', orderRef: 'cmd-42' })], {
      gains: journal([credit('cmd-42', 11_250), { ...credit('cmd-42', -11_250), id: 'r1', type: 'REVERSAL' }]),
    })

    expect(within(await ligne('s1')).getByText('Remboursé au patient')).toBeInTheDocument()
  })

  it('la tuile du mois additionne le journal, elle ne multiplie pas des prix', async () => {
    await monter(
      [
        seance({ id: 's1', orderRef: 'cmd-1', paidAt: new Date().toISOString(), reportDepositedAt: ilYA(1) }),
        seance({ id: 's2', orderRef: 'cmd-2', paidAt: new Date().toISOString(), reportDepositedAt: ilYA(1) }),
      ],
      { gains: journal([credit('cmd-1', 11_250), credit('cmd-2', 13_500)]) },
    )

    expect(await screen.findByText('24 750')).toBeInTheDocument()
    expect(screen.getByText(/net après commission/)).toBeInTheDocument()
  })

  it('un retrait n’est pas une consultation : il ne compte pas dans les honoraires', async () => {
    await monter([seance({ orderRef: 'withdrawal:w1', paidAt: new Date().toISOString() })], {
      gains: journal([{ ...credit('withdrawal:w1', -50_000), id: 'w', type: 'WITHDRAWAL' }]),
    })

    // Le mois reste à zéro : aucune consultation n'a été créditée.
    expect(await screen.findByText('0')).toBeInTheDocument()
  })
})

describe('C4 — les ordonnances de la consultation', () => {
  it('range chaque ordonnance sous SA consultation', async () => {
    await monter([seance({ id: 's1' }), seance({ id: 's2', reportDepositedAt: ilYA(1) })], {
      ordonnances: [ordonnance({ id: 'o1', sessionId: 's2' })],
    })

    // C'est `sessionId` — ajouté le 24/08 — qui rend ce rattachement possible.
    expect(within(await ligne('s2')).getByText('Active')).toBeInTheDocument()
    expect(within(await ligne('s1')).getByText('—')).toBeInTheDocument()
  })

  /**
   * Famille 3, groupe C : « Suivi en officine » est retiré (branche pharmacie hors périmètre), et
   * remplacé par l'état de l'ordonnance — ce que le médecin peut réellement savoir.
   */
  it("montre l'état de l'ordonnance, jamais un numéro inventé", async () => {
    await monter([seance()], { ordonnances: [ordonnance({ status: 'EXPIRED' })] })

    expect(within(await ligne('s1')).getByText('Expirée')).toBeInTheDocument()
    // « ORD-2026-00412 » n'existe pas : les identifiants sont des UUID opaques.
    expect(document.body.textContent).not.toMatch(/ORD-\d{4}-\d+/)
    expect(document.body.textContent).not.toContain('Suivi en officine')
  })
})

describe('C4 — filtrer et chercher', () => {
  it('les trois onglets sont comptés, comme la maquette les compte', async () => {
    await monter([
      seance({ id: 's1' }),
      seance({ id: 's2', reportDepositedAt: ilYA(1) }),
      seance({ id: 's3', status: 'REFUNDED' }),
    ])

    expect(await screen.findByRole('button', { name: 'Toutes 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'À signer 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Signées 1' })).toBeInTheDocument()
  })

  it('l’onglet « à signer » ne garde que les comptes-rendus manquants', async () => {
    const utilisateur = userEvent.setup()
    await monter([
      seance({ id: 's1' }),
      seance({ id: 's2', reportDepositedAt: ilYA(1) }),
      seance({ id: 's3', status: 'REFUNDED' }),
    ])

    await utilisateur.click(await screen.findByRole('button', { name: 'À signer 1' }))
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2)) // en-tête + une ligne
  })

  it('un filtre sans résultat propose de l’effacer (CG-08 §06)', async () => {
    const utilisateur = userEvent.setup()
    await monter([seance({ reportDepositedAt: ilYA(1) })])

    await utilisateur.click(await screen.findByRole('button', { name: 'À signer 0' }))
    expect(await screen.findByText('Aucun résultat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Effacer les filtres/ })).toBeInTheDocument()
  })

  it('registre vide : on dit quoi attendre et où aller', async () => {
    await monter([])

    expect(await screen.findByText('Aucune consultation enregistrée')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voir mes demandes/ })).toBeInTheDocument()
  })
})

describe('C4 — ce que le registre ne dit pas', () => {
  it('aucune identité de patient n’apparaît', async () => {
    await monter([seance()], { ordonnances: [ordonnance()] })

    await ligne('s1')
    expect(document.body.textContent).not.toContain('pat-1')
  })

  it("aucun mode de consultation : « en cabinet » n'a pas de référent", async () => {
    await monter([seance()])

    await ligne('s1')
    expect(document.body.textContent).not.toContain('Téléconsultation')
    expect(document.body.textContent).not.toContain('En cabinet')
    // Remplacé par la durée, qui existe bel et bien.
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })

  it('aucun bouton d’export : EF-04-04 n’en prévoit que pour le journal d’audit', async () => {
    await monter([seance()])

    await ligne('s1')
    expect(screen.queryByRole('button', { name: /Exporter|PDF/i })).not.toBeInTheDocument()
  })
})

/**
 * EF-06-12 : la proposition de suivi part TOUTE SEULE au dépôt du compte-rendu, si une offre de
 * suivi est active. Aucun bouton — il ferait doublon avec l'envoi du serveur (famille 4, point 8).
 */
describe('C4 — la proposition de suivi', () => {
  it('dit qu’elle part, quand une offre de suivi est active', async () => {
    await monter([seance()], {
      offres: [
        {
          id: 'of1',
          professionalId: 'pro-1',
          label: 'Suivi',
          durationMin: 15,
          priceXaf: 5000,
          kind: 'FOLLOW_UP',
          active: true,
          createdAt: ilYA(100),
          updatedAt: ilYA(100),
        },
      ],
    })

    expect(await screen.findByText(/une proposition de suivi part automatiquement/)).toBeInTheDocument()
    // Aucun bouton : il ferait doublon avec l'envoi du serveur.
    expect(screen.queryByRole('button', { name: /suivi/i })).not.toBeInTheDocument()
  })

  it('dit qu’elle ne part pas, et pourquoi, quand aucune offre n’est active', async () => {
    await monter([seance()], { offres: [] })

    expect(await screen.findByText(/aucune proposition de suivi n'est envoyée/)).toBeInTheDocument()
  })
})

describe('C4 — la panne', () => {
  it('rassure sur les comptes-rendus déjà déposés et les brouillons', async () => {
    vi.spyOn(api, 'mySessions').mockRejectedValue(new Error('réseau'))
    vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'earnings').mockResolvedValue(journal())
    vi.spyOn(api, 'myOffers').mockResolvedValue([])
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ConsultationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/Le registre n'a pas pu être chargé/)).toBeInTheDocument()
    expect(screen.getByText(/restent intacts côté serveur/)).toBeInTheDocument()
  })
})
