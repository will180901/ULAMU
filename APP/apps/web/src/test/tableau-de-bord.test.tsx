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
  // L'assiette du taux (dette n°23) : sur combien de demandes il porte, refus motivés déduits.
  confirmationBase = 25,
  /*
    Combien d'offres actives — ajouté au chantier 70.

    ⚠️ Par défaut UNE, et non zéro : c'est le cas ordinaire d'un soignant en activité. Mettre zéro
    par défaut ferait passer tous les tests existants par la branche « aucune offre active » sans
    qu'aucun ne le dise, et ils continueraient de passer en ne prouvant plus la même chose — le
    piège du 24/08, où un leurre confirmait sa propre croyance.
  */
  offresActives: number | 'echec' = 1,
) {
  vi.spyOn(api, 'professionalDashboard').mockResolvedValue({
    sessionsThisMonth: 6,
    earnings: { availableXaf: 486500, pendingXaf: 32000 },
    averageRating: note,
    confirmationRatePct: 92,
    confirmationBase,
    lastSixMonths,
  })
  // ⚠️ La forme RÉELLE : un objet `{ items }`, pas un tableau. C'est tout l'objet de ce fichier.
  vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items: demandes })
  /*
    Bornes d'offres — bouchonnées ici DÈS l'ajout de l'appel (chantier 70). Sans ce leurre, la
    requête partirait pour de bon dans tous les tests de ce fichier : elle échouerait, l'écran
    prendrait sa branche « borne inconnue », et les assertions continueraient de passer en ne
    prouvant plus rien de ce qu'elles croient prouver.
  */
  if (offresActives === 'echec') {
    vi.spyOn(api, 'offerLimits').mockRejectedValue(new Error('serveur muet'))
  } else {
    vi.spyOn(api, 'offerLimits').mockResolvedValue({
      durationMinMinutes: 10,
      durationMaxMinutes: 60,
      priceFloorXaf: 500,
      maxActiveOffers: 5,
      activeOffers: offresActives,
    })
  }
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

  /*
    ── Chantier 70 — le chiffre d'une ligne est la donnée, pas la légende ───────────────────────

    Ces comptes s'écrivaient à 15 px, exactement la taille de l'intitulé qu'ils sont censés
    renseigner. « Expirées sans réponse » est pourtant le chiffre le plus coûteux de l'écran : il
    fait baisser un taux que les patients lisent avant de choisir.

    ⚠️ La vérification porte sur le NOM de la voix et non sur une taille calculée : jsdom
    n'applique aucune feuille de style, `getComputedStyle` y renverrait la même valeur pour tout.
    C'est la contrepartie assumée — le test retient qu'une voix a été choisie, la mesure du rendu
    se fait à l'écran, en ligne.
  */
  it('les comptes d’une liste portent une voix de chiffre, pas celle de leur légende', async () => {
    await monter([demande('h1', 'PAID'), demande('h2', 'EXPIRED')])

    const bloc = screen.getByText('Ce que deviennent vos demandes').closest('section') as HTMLElement
    expect(bloc.querySelectorAll('.ul-chiffre-ligne')).toHaveLength(3)
  })

  /*
    ── Chantier 70 — la promesse qui ne pouvait pas être tenue ──────────────────────────────────

    Trouvé sur le compte du porteur, en production, le 09/09 : ses deux offres étaient désactivées.
    « Ma vitrine » disait *« aucun patient ne peut vous solliciter »* ; le tableau de bord, au même
    instant, promettait que les demandes « arrivent ici dès qu'un patient vous sollicite ».

    Aucune n'allait arriver. Les deux écrans lisaient la même vérité, un seul la disait.
  */
  it('sans offre active, l’écran dit la vraie raison au lieu de faire patienter', async () => {
    await monter([], null, [], 25, 0)

    expect(screen.getByText(/il vous faut au moins une offre active/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Activer une offre/ })).toBeInTheDocument()
    // Et surtout : la promesse d'origine ne doit PLUS être là, elle serait fausse.
    expect(screen.queryByText(/dès qu'un patient vous sollicite/)).not.toBeInTheDocument()
  })

  /*
    ⚠️ « Une lecture qui échoue n'est ni un zéro ni un “non” » — la leçon de la cloche, qui
    annonçait « aucune non lue » quand la lecture ratait. Ici, une borne illisible ne doit surtout
    pas se lire comme « aucune offre active » : ce serait affirmer un fait qu'on ignore, et envoyer
    le soignant réparer quelque chose qui n'est peut-être pas cassé.
  */
  it('bornes illisibles : l’écran n’invente pas « aucune offre active »', async () => {
    await monter([], null, [], 25, 'echec')

    expect(screen.getByText(/Aucune demande en attente/)).toBeInTheDocument()
    expect(screen.queryByText(/il vous faut au moins une offre active/)).not.toBeInTheDocument()
  })

  /*
    ── Ce test a changé le 04/09/2026 (dette n°23) ────────────────────────────────────────────

    Il vérifiait que, sans note, la tuile affiche « Depuis l'ouverture » plutôt qu'un « null / 5 ».
    La garde utile — pas de `null` à l'écran — est conservée telle quelle. Ce qui remplace la
    mention temporelle, c'est **l'assiette du taux** : un pourcentage sans son assiette ne se
    vérifie pas, et c'est ce que la dette n°23 reprochait à cette tuile.
  */
  it('sans note reçue, aucun « null / 5 » — et l’assiette reste dite', async () => {
    await monter([], null)

    expect(screen.queryByText(/null/)).not.toBeInTheDocument()
    expect(screen.getByText(/sur 25 demandes/)).toBeInTheDocument()
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

  /*
    ── L'assiette du taux, et ce qu'elle promet au médecin (dette n°23) ──────────────────────

    Le taux valait « confirmées / sollicitations » : un refus motivé y pesait autant qu'une demande
    laissée expirer sans un mot. Il ne les compte plus pareil — mais **un médecin qui l'ignore ne
    peut rien en faire**. La tuile doit donc le DIRE, sans quoi le changement reste invisible et le
    médecin continue d'hésiter à refuser une demande hors de sa spécialité.
  */
  it('dit sur combien de demandes le taux porte, et que les refus n’y sont pas', async () => {
    await monter([], 4.8, [], 7)

    expect(screen.getByText(/sur 7 demandes/)).toBeInTheDocument()
    expect(screen.getByText(/refus non comptés/)).toBeInTheDocument()
  })

  it('accorde le singulier — « sur 1 demande », jamais « 1 demandes »', async () => {
    await monter([], null, [], 1)

    expect(screen.getByText(/sur 1 demande ·/)).toBeInTheDocument()
  })

  /*
    Assiette vide : afficher « sur 0 demandes · refus non comptés » ferait passer un 0 % pour un
    jugement, alors qu'il n'y a rien à juger. Une lecture qui n'a pas de matière n'est pas un zéro.
  */
  it('sans aucune demande à répondre, ne fabrique pas une assiette de zéro', async () => {
    await monter([], null, [], 0)

    expect(screen.getByText(/Aucune demande à répondre à ce jour/)).toBeInTheDocument()
    expect(screen.queryByText(/refus non comptés/)).not.toBeInTheDocument()
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

  /*
    ── Chantier 70 — la forme suit la matière ───────────────────────────────────────────────────

    Mesuré en ligne le 09/09 : ce panneau faisait 291 px de haut, le plus grand bloc de la page,
    pour UNE consultation — un pic isolé au milieu du vide. Un grand graphique presque vide ne se
    lit pas « peu d'activité », il se lit « l'affichage est cassé ».

    Le seuil est deux mois actifs, et il se démontre : une courbe dit une ÉVOLUTION, et une
    évolution demande deux points. En dessous il n'y a pas de pente — seulement des quantités.
  */
  it('un seul mois actif : un bandeau de chiffres, pas une courbe pour un point', async () => {
    await monter([], null, [
      { month: '2026-03', sessions: 0, earnedXaf: 0 },
      { month: '2026-04', sessions: 0, earnedXaf: 0 },
      { month: '2026-05', sessions: 0, earnedXaf: 0 },
      { month: '2026-06', sessions: 0, earnedXaf: 0 },
      { month: '2026-07', sessions: 0, earnedXaf: 0 },
      { month: '2026-08', sessions: 1, earnedXaf: 5000 },
    ])

    const bloc = screen.getByText('Six derniers mois').closest('section') as HTMLElement
    // On observe la FORME, comme le test des six points ci-dessus : aucun tracé, six valeurs.
    expect(bloc.querySelectorAll('circle')).toHaveLength(0)
    expect(bloc.querySelectorAll('.ul-chiffre-ligne')).toHaveLength(6)
    // Et les six mois gardent leur place, y compris ceux à zéro : un mois vide est une information.
    expect(within(bloc).getByText('août')).toBeInTheDocument()
  })

  it('dès deux mois actifs, la courbe reprend sa place — il y a une pente à lire', async () => {
    await monter([], null, [
      { month: '2026-07', sessions: 2, earnedXaf: 10000 },
      { month: '2026-08', sessions: 5, earnedXaf: 25000 },
    ])

    const bloc = screen.getByText('Six derniers mois').closest('section') as HTMLElement
    expect(bloc.querySelectorAll('circle')).toHaveLength(2)
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

  /*
    ── 04/09/2026 — le test qui manquait, et l'écran mentait dans le trou ────────────────────────

    Le test ci-dessus éprouvait la MOITIÉ de la phrase : l'expiration. L'autre moitié disait
    « **un refus motivé, non** », et personne ne la vérifiait. Elle était fausse depuis toujours.

    Ce que fait réellement le serveur : `initiationsTotal` est incrémenté **à la sollicitation**,
    avant toute réponse ; seule une confirmation incrémente `confirmedTotal`. Un refus n'émet
    aucun événement de statistiques — vérifié dans `m06.handshake.service.ts`, et `m05.module.ts`
    ne s'abonne qu'à quatre événements, dont aucun ne concerne le refus.

    **Un refus motivé coûte donc exactement autant qu'une demande ignorée.**

    *Règle : un test qui vérifie une phrase à moitié laisse l'autre moitié mentir. Quand un texte
    affirme deux choses, il faut deux assertions.*
  */
  it('ne prétend PAS qu’un refus motivé serait sans conséquence', async () => {
    await monter([demande('h1', 'REFUSED')])

    // La phrase corrigée : les deux issues coûtent la même chose.
    expect(await screen.findByText(/un refus motivé aussi/i)).toBeInTheDocument()
    // Et l'ancienne promesse ne doit jamais revenir, sous aucune de ses formes.
    expect(document.body.textContent).not.toMatch(/refus motivé,\s*non/i)
  })

  /* La ligne « Refusées » porte désormais la même mention que « Expirées » — même conséquence. */
  it('marque le refus comme faisant baisser le taux, au même titre que l’expiration', async () => {
    await monter([demande('h1', 'REFUSED'), demande('h2', 'EXPIRED')])

    const bloc = (await screen.findByText('Ce que deviennent vos demandes')).closest('section') as HTMLElement
    expect(within(bloc).getAllByText('Fait baisser votre taux de confirmation')).toHaveLength(2)
  })

  it('avoue que le compte porte sur les cent dernières, sans le laisser croire complet', async () => {
    await monter([demande('h1', 'PAID')])

    expect(await screen.findByText('Sur les cent dernières')).toBeInTheDocument()
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — la phrase que cet écran ne doit pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════
*/
describe('C1 — filet de refonte : ce que le taux de confirmation compte vraiment', () => {
  /*
    ⚠️ Le taux ne monte QUE sur une confirmation. Un refus motivé sort du dénominateur ; une
    expiration, elle, compte contre le soignant. Sans cette phrase, un médecin croit protéger son
    taux en ne répondant pas — c'est exactement l'inverse.

    Le compteur a été recalculé sur la vraie base au chantier 49 : la règle affichée ici est celle
    que le serveur applique, pas une approximation d'écran.
  */
  it('dit que seule une confirmation fait monter le taux', async () => {
    // La phrase accompagne la FILE des demandes : sans demande, il n'y a pas de taux à expliquer.
    await monter([demande('h1', 'INITIATED')])

    expect(await screen.findByText(/Seule une confirmation le fait monter/)).toBeInTheDocument()
  })
})
