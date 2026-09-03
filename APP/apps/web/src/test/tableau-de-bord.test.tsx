/**
 * B2 « Tableau de bord » — et surtout : la FORME des réponses du serveur.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * Le 24/08/2026, cet écran plantait en production sur une page blanche :
 *
 *     Uncaught TypeError: (t.data ?? []).filter is not a function
 *
 * `GET /v1/handshakes/mine` renvoie `{ items: [...] }`. Le client web le déclarait `Handshake[]`.
 * TypeScript n'a rien vu, et il ne POUVAIT rien voir : une déclaration de type est une **promesse
 * faite au compilateur**, pas une vérification. Le compilateur a cru la promesse, et l'écran a
 * appelé `.filter` sur un objet.
 *
 * Ce qui a rendu la faute invisible plus longtemps : la vérification de B2 s'était faite avec un
 * faux `fetch` qui renvoyait un tableau — c'est-à-dire qui confirmait la supposition au lieu de la
 * contredire. **Un leurre construit sur sa propre croyance ne teste que sa croyance.**
 *
 * Les formes utilisées ici ont donc été relevées SUR L'API DÉPLOYÉE, avec une vraie session :
 *
 *     GET /v1/handshakes/mine   → {"items":[]}
 *     GET /v1/me/dashboard      → {"sessionsThisMonth":0,"earnings":{…},"averageRating":null,…}
 *
 * `averageRating: null` en fait partie : un soignant sans note n'a pas de moyenne, et afficher
 * « note moyenne null / 5 » serait le genre de détail qui décrédibilise tout l'écran.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Handshake, type MeResponse, type ProfessionalDashboard } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'p1',
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
  totpEnabled: false,
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 0,
  backupCodesTotal: 0,
  backupCodesGeneratedAt: null,
}

const demande = (id: string, status: Handshake['status']): Handshake => ({
  id,
  status,
  patientAccountId: 'pat',
  professionalId: 'p1',
  offerId: 'o1',
  subProfileId: null,
  initiatedAt: '2026-08-24T08:00:00.000Z',
  confirmedAt: null,
  confirmExpiresAt: null,
  refusalReason: null,
  windowExpiresAt: null,
  windowRemainingSeconds: 0,
  sessionId: null,
  // Fiche anonymisée (EF-06-01) — prénom et âge, « pas plus avant paiement ». Depuis le 01/09 le
  // tableau de bord l'affiche, comme C3 : décider sans savoir s'il s'agit d'un enfant n'a pas de sens.
  patientFirstName: 'Mireille',
  patientAge: 32,
  offerLabel: 'Consultation',
  offerDurationMin: 30,
  offerPriceXaf: 5000,
})

async function monter(
  demandes: Handshake[],
  note: number | null = null,
  lastSixMonths: ProfessionalDashboard['lastSixMonths'] = [],
) {
  vi.spyOn(api, 'professionalDashboard').mockResolvedValue({
    sessionsThisMonth: 6,
    earnings: { availableXaf: 486500, pendingXaf: 32000 },
    averageRating: note,
    confirmationRatePct: 92,
    lastSixMonths,
  })
  // ⚠️ La forme RÉELLE : un objet `{ items }`, pas un tableau. C'est tout l'objet de ce fichier.
  vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items: demandes })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // On attend une valeur qui n'existe QUE chargé : le titre de page, lui, s'affiche déjà pendant le
  // chargement, et l'attendre laisserait les assertions tomber sur les rectangles de chargement.
  await screen.findByText('92 %')
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('B2 — soignant', () => {
  it("l'écran s'affiche quand les demandes arrivent sous forme d'objet `{ items }`", async () => {
    await monter([demande('h1', 'INITIATED'), demande('h2', 'INITIATED'), demande('h3', 'CONFIRMED')])

    // Une confirmée attend encore le PAIEMENT : elle mobilise une place et son compte à rebours
    // court toujours. Les trois sont donc « en attente ».
    // Avant le correctif, cette ligne ne s'exécutait jamais : l'écran plantait au rendu.
    expect(await screen.findByText('3 en attente de votre réponse ou du paiement')).toBeInTheDocument()
    expect(screen.getByText(/3 demandes attendent une réponse/)).toBeInTheDocument()
  })

  it('aucune demande : la liste propose une sortie plutôt qu’un vide muet (CG-08 §06)', async () => {
    await monter([])
    expect(screen.getByText(/Aucune demande en attente/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Compléter ma vitrine/ })).toBeInTheDocument()
  })

  it('sans note reçue, aucun « null / 5 »', async () => {
    await monter([], null)
    expect(screen.getByText(/Depuis l’ouverture/)).toBeInTheDocument()
    expect(screen.queryByText(/null/)).not.toBeInTheDocument()
  })

  it('avec une note, elle est affichée telle quelle', async () => {
    await monter([], 4.8)
    expect(screen.getByText(/Note 4.8 \/ 5/)).toBeInTheDocument()
  })

  /**
   * Le taux de confirmation est un cumul DEPUIS TOUJOURS (`ProfessionalStats`), pas une fenêtre
   * glissante. « Sur les 30 derniers jours », comme l'écrit la maquette, serait faux — et ce taux
   * est public : les patients le lisent avant de choisir.
   */
  it('ne prétend pas que le taux porte sur 30 jours — il porte sur tout', async () => {
    await monter([], 4.8)

    expect(document.body.textContent).not.toContain('30 derniers jours')
    expect(screen.getByText(/visible des patients/)).toBeInTheDocument()
  })

  /**
   * EF-06-01 : « prénom, âge — pas plus avant paiement ». Ce qui est verrouillé, ce n'est plus
   * l'absence de toute identité (la fiche anonymisée est servie depuis le 24/08) mais sa BORNE.
   */
  it('montre le prénom et l’âge, et rien de plus', async () => {
    await monter([demande('h1', 'INITIATED')])

    expect(screen.getByText('Mireille · 32 ans')).toBeInTheDocument()
    const principal = document.querySelector('main')?.textContent ?? ''
    // Ni identifiant de compte, ni motif de consultation — celui-ci n'existe qu'après paiement.
    expect(principal).not.toContain('pat')
    expect(principal).not.toContain('Palpitations')
  })
})

describe('B2 — les six derniers mois', () => {
  /**
   * Ce graphique a longtemps manqué : M16 ne calculait aucune série, et l'écran n'affichait que
   * quatre nombres bruts (correction du 24/08/2026). Deux propriétés le rendent honnête.
   */
  it('un mois sans activité garde sa place, à zéro', async () => {
    await monter([], null, [
      { month: '2026-03', sessions: 0, earnedXaf: 0 },
      { month: '2026-04', sessions: 4, earnedXaf: 20000 },
      { month: '2026-05', sessions: 0, earnedXaf: 0 },
      { month: '2026-06', sessions: 2, earnedXaf: 10000 },
      { month: '2026-07', sessions: 0, earnedXaf: 0 },
      { month: '2026-08', sessions: 6, earnedXaf: 30000 },
    ])

    /*
      Six points, pas trois : sauter les mois vides donnerait une courbe qui ment sur le rythme.

      ⚠️ 03/09/2026 (chantier 35) — ce test comptait des `listitem`, parce que le bloc dessinait des
      BARRES. Il dessine désormais une courbe, conformément à la maquette : le FAIT défendu ne change
      pas, seule la façon de l'observer. On compte donc les points du tracé.

      *Un test dont la cible change de forme doit être réécrit, pas supprimé : c'est la propriété
      qu'il garde qui compte, pas le balisage qu'il interrogeait.*
    */
    const bloc = screen.getByText('Six derniers mois').closest('section') as HTMLElement
    expect(bloc.querySelectorAll('circle')).toHaveLength(6)
    expect(within(bloc).getByText('12 consultations au total')).toBeInTheDocument()
  })

  /*
    ── « 1 consultationS au total » (chantier 36, 03/09/2026) ───────────────────────────────────

    Le porteur l'a lu EN LIGNE, sur son propre tableau de bord. Le sous-titre écrivait le pluriel
    quel que soit le nombre — et douze autres chaînes de l'application faisaient de même
    (« 1 ordonnances », « 1 pages », « 0 retirables »).

    Le cas nominal, lui, passait : le test ci-dessus porte sur douze consultations, où le pluriel
    est juste. **Un défaut d'accord ne se voit qu'au singulier**, et c'est le cas qu'aucun test
    n'éprouvait.
  */
  it('accorde son sous-titre au singulier — une seule consultation', async () => {
    await monter([], null, [
      { month: '2026-03', sessions: 0, earnedXaf: 0 },
      { month: '2026-04', sessions: 0, earnedXaf: 0 },
      { month: '2026-05', sessions: 0, earnedXaf: 0 },
      { month: '2026-06', sessions: 0, earnedXaf: 0 },
      { month: '2026-07', sessions: 0, earnedXaf: 0 },
      { month: '2026-08', sessions: 1, earnedXaf: 5000 },
    ])

    const bloc = screen.getByText('Six derniers mois').closest('section') as HTMLElement
    expect(within(bloc).getByText('1 consultation au total')).toBeInTheDocument()
  })

  it('sans aucune consultation, il dit son vide au lieu de dessiner une ligne plate', async () => {
    await monter([], null, [
      { month: '2026-03', sessions: 0, earnedXaf: 0 },
      { month: '2026-04', sessions: 0, earnedXaf: 0 },
    ])
    expect(screen.getByText(/Aucune consultation sur les six derniers mois/)).toBeInTheDocument()
  })

  it('les chiffres sont lisibles autrement que par la hauteur des barres (CG-11)', async () => {
    await monter([], null, [{ month: '2026-08', sessions: 6, earnedXaf: 30000 }])
    // Un tableau de secours : une barre sans chiffre ne se lit pas au lecteur d'écran.
    const tableau = screen.getByRole('table', { name: /Consultations et gains par mois/ })
    expect(within(tableau).getByText('30 000 XAF')).toBeInTheDocument()
  })
})

/**
 * Ce que la maquette voulait, et que le serveur permet enfin en partie.
 *
 * Deux des quatre tendances sont devenues calculables depuis que `lastSixMonths` existe. Les deux
 * autres ne le sont toujours pas, et ce qui est verrouillé ici c'est qu'elles n'apparaissent pas :
 * un tableau de bord qui invente une tendance est pire qu'un tableau de bord sans tendance, parce
 * qu'on y prend des décisions.
 */
describe('B2 — les tendances, seulement quand elles existent', () => {
  const serie = (...sessions: number[]) =>
    sessions.map((n, i) => ({ month: `2026-0${i + 3}`, sessions: n, earnedXaf: n * 10_000 }))

  it('compare le mois en cours au précédent, pour les consultations', async () => {
    await monter([], null, serie(4, 4, 4, 4, 2, 6))

    // 6 ce mois-ci contre 2 le mois dernier.
    expect(await screen.findByText('+4 par rapport au mois dernier')).toBeInTheDocument()
  })

  it('sait dire une BAISSE — la tendance n’est pas décorative', async () => {
    await monter([], null, serie(4, 4, 4, 4, 9, 6))

    expect(await screen.findByText('−3 par rapport au mois dernier')).toBeInTheDocument()
  })

  it('ne compare rien sur un premier mois : il n’y a pas de « avant »', async () => {
    await monter([], null, serie(5))

    expect(await screen.findByText('Depuis le 1er du mois')).toBeInTheDocument()
  })

  it('n’invente aucune tendance quotidienne : aucune série ne l’autorise', async () => {
    await monter([demande('h1', 'INITIATED')], null, serie(4, 6))

    expect(document.body.textContent).not.toMatch(/depuis hier|vs hier/i)
  })

  it('n’annonce aucune date de versement : le mensuel n’existe pas', async () => {
    await monter([], null, serie(4, 6))

    expect(await screen.findByText(/retirables/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/vers[ée]s? le \d|le 5 de chaque mois/i)
  })
})

/**
 * La tuile qui fait agir. Ce n'est pas le nombre de demandes qui compte — c'est combien vont
 * tomber. Une poignée de main expirée fait baisser un taux que les patients voient.
 */
describe('B2 — les demandes qui pressent', () => {
  const dansUneHeure = (id: string, status: 'INITIATED' | 'CONFIRMED' = 'INITIATED') => ({
    ...demande(id, status),
    windowRemainingSeconds: 3600,
  })
  const dansSixHeures = (id: string) => ({ ...demande(id, 'INITIATED'), windowRemainingSeconds: 6 * 3600 })

  it('met en avant celles qui expirent dans moins de deux heures', async () => {
    await monter([dansUneHeure('h1'), dansUneHeure('h2'), dansSixHeures('h3')])

    expect(await screen.findByText('2 expirent dans moins de 2 h')).toBeInTheDocument()
  })

  it('accorde le verbe au singulier quand il n’y en a qu’une', async () => {
    await monter([dansUneHeure('h1'), dansSixHeures('h2')])

    expect(await screen.findByText('1 expire dans moins de 2 h')).toBeInTheDocument()
  })

  it('ne dit rien d’urgent quand rien ne l’est', async () => {
    await monter([dansSixHeures('h1')])

    expect(await screen.findByText('Poignées de main à confirmer')).toBeInTheDocument()
  })

  it('affiche le temps restant servi par le serveur, jamais un délai écrit', async () => {
    await monter([dansUneHeure('h1')])

    expect(await screen.findByText('1 h 00')).toBeInTheDocument()
    // La maquette écrit « compte à rebours de 12 h ». Aucun délai n'a sa place ici.
    expect(document.body.textContent).not.toContain('12 h')
  })
})

/**
 * Famille 3, groupe B et groupe E : « téléconsultations / en cabinet » n'a aucun référent, et
 * « trois expirations consécutives suspendent » n'existe pas non plus — cette règle ne vise que les
 * pharmacies. La vraie conséquence est un taux public qui baisse.
 */
describe('B2 — ce que deviennent les demandes', () => {
  it('compte les issues réelles, pas un mode de consultation qui n’existe pas', async () => {
    await monter([
      demande('h1', 'PAID'),
      demande('h2', 'PAID'),
      demande('h3', 'REFUSED'),
      demande('h4', 'EXPIRED'),
      demande('h5', 'EXPIRED'),
      demande('h6', 'EXPIRED'),
    ])

    const bloc = (await screen.findByText('Ce que deviennent vos demandes')).closest('section') as HTMLElement
    expect(within(bloc).getByText('Menées jusqu’à la consultation')).toBeInTheDocument()
    expect(within(bloc).getByText('Refusées avec motif')).toBeInTheDocument()
    expect(within(bloc).getByText('Expirées sans réponse')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Téléconsultation')
    expect(document.body.textContent).not.toContain('En cabinet')
  })

  it('dit la vraie conséquence d’une expiration : le taux public baisse', async () => {
    await monter([demande('h1', 'EXPIRED')])

    expect(await screen.findByText(/compte comme une non-réponse dans le taux affiché aux patients/)).toBeInTheDocument()
    // Aucune suspension : cette sanction ne vise que les pharmacies (EF-12-07).
    expect(document.body.textContent).not.toMatch(/suspend/i)
  })

  it('avoue que le compte porte sur les cent dernières, sans le laisser croire complet', async () => {
    await monter([demande('h1', 'PAID')])

    expect(await screen.findByText('Sur les cent dernières')).toBeInTheDocument()
  })
})
