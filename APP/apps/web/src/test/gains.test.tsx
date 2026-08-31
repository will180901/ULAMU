/**
 * C6 « Mes gains » — l'argent.
 *
 * Deux choses doivent être vraies sur cet écran, faute de quoi il détruit la confiance :
 *
 *  1. **Un solde en attente doit s'EXPLIQUER.** RM-06-04 : « gains crédités uniquement après dépôt
 *     du compte-rendu (qualité avant trésorerie) ». Un médecin qui voit de l'argent bloqué sans
 *     savoir pourquoi accuse la plateforme ; celui qui sait va écrire son compte-rendu.
 *  2. **Les frais sont annoncés AVANT confirmation** (EF-13-07). C'est tout le sens du retrait en
 *     deux temps : on ne confirme jamais un montant dont on ignore ce qui en sera retenu.
 *
 * Et l'écran ne doit pas promettre un « compte de versement » enregistré : il n'en existe aucun en
 * base. Le retrait part sur le TÉLÉPHONE DU COMPTE ULAMU (`actorAccount.phone`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GainsPage } from '@/modules/gains/pages/GainsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Earnings, type MeResponse, type SessionListItem } from '@/lib/api'

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

/**
 * Un mouvement du journal. `grossXaf` et `commissionXaf` viennent de S2 : le serveur les joint
 * depuis le 28/08. `null` pour un retrait, qui ne correspond à aucune part de paiement.
 */
function mouvement(
  over: Partial<Earnings['entries'][number]> & { id: string; type: string; amountXaf: number; createdAt: string },
): Earnings['entries'][number] {
  return {
    reference: `ref-${over.id}`,
    grossXaf: null,
    commissionXaf: null,
    ...over,
  }
}

/** Un crédit de consultation avec son détail : brut, commission prélevée, net encaissé. */
const creditDetaille = (id: string, brut: number, commission: number, createdAt: string) =>
  mouvement({ id, type: 'CREDIT', amountXaf: brut - commission, grossXaf: brut, commissionXaf: commission, createdAt })

function gains(over: Partial<Earnings> = {}): Earnings {
  return {
    holderType: 'PROFESSIONAL',
    holderId: 'pro-1',
    availableXaf: 45000,
    pendingXaf: 0,
    entries: [],
    withdrawals: [],
    ...over,
  }
}

async function monter(g: Earnings, seances: SessionListItem[] = []) {
  vi.spyOn(api, 'earnings').mockResolvedValue(g)
  // La tuile « en attente » compte les comptes-rendus qui retiennent l'argent : sans cette
  // doublure, chaque test partirait pour de vrai sur le réseau.
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: seances })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GainsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Mes gains' })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C6 — les soldes', () => {
  it('un solde en attente EXPLIQUE pourquoi il est bloqué (RM-06-04)', async () => {
    await monter(gains({ pendingXaf: 12000 }))

    expect(await screen.findByText(/Consultations honorées, compte-rendu manquant/)).toBeInTheDocument()
    // Le lien de cause à effet, dit en clair : c'est ce qui transforme une frustration en action.
    expect(screen.getByText(/devient retirable dès le dépôt du compte-rendu/)).toBeInTheDocument()
  })

  it('sans attente, on n’affiche pas l’explication — un écran ne parle pas pour rien', async () => {
    await monter(gains({ pendingXaf: 0 }))
    await screen.findByText('Disponible au retrait')
    expect(screen.queryByText(/dès que vous déposez le compte-rendu/)).not.toBeInTheDocument()
  })

  it('le décompte du mois ne compte QUE les crédits du mois en cours', async () => {
    const maintenant = new Date()
    const ceMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 2).toISOString()
    const moisDernier = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 15).toISOString()

    await monter(
      gains({
        entries: [
          creditDetaille('a', 5556, 556, ceMois),
          creditDetaille('b', 3334, 334, ceMois),
          creditDetaille('c', 10_000, 1000, moisDernier),
          mouvement({ id: 'd', type: 'WITHDRAWAL', amountXaf: -4000, createdAt: ceMois }),
        ],
      }),
    )

    // 5 000 + 3 000 : ni le mois dernier, ni le retrait. C'est un calcul sur des dates réelles.
    const bloc = (await screen.findByText('Ce mois-ci')).closest('section') as HTMLElement
    expect(within(bloc).getByText(/8 000/)).toBeInTheDocument()
    expect(within(bloc).getByText(/2 consultations créditées/)).toBeInTheDocument()
  })
})

describe('C6 — le retrait en deux temps (EF-13-07)', () => {
  it('les frais sont annoncés AVANT toute confirmation', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startWithdrawal').mockResolvedValue({
      withdrawalId: 'w1',
      amountXaf: 20000,
      ulamuFeeXaf: 0,
      netToReceiveXaf: 20000,
      operator: 'MTN_MOMO',
      otpExpiresInSeconds: 300,
      // S3 : PM-36, servi par le serveur — aucune durée n'est écrite dans l'écran.
      payoutDelaySeconds: 86_400,
    })
    const confirmer = vi.spyOn(api, 'confirmWithdrawal').mockResolvedValue(undefined as never)
    await monter(gains())

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))

    await waitFor(() => expect(demarrer).toHaveBeenCalled())
    // Rien n'est encore parti : c'est un devis, pas un ordre.
    expect(confirmer).not.toHaveBeenCalled()
    expect(await screen.findByText('Vous recevrez')).toBeInTheDocument()
    expect(screen.getByText('Frais ULAMU')).toBeInTheDocument()
  })

  it('la confirmation exige mot de passe ET code — la session ouverte ne suffit pas', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue({
      withdrawalId: 'w1',
      amountXaf: 20000,
      ulamuFeeXaf: 0,
      netToReceiveXaf: 20000,
      operator: 'MTN_MOMO',
      otpExpiresInSeconds: 300,
      // S3 : PM-36, servi par le serveur — aucune durée n'est écrite dans l'écran.
      payoutDelaySeconds: 86_400,
    })
    const confirmer = vi.spyOn(api, 'confirmWithdrawal').mockResolvedValue(undefined as never)
    await monter(gains())

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))
    await screen.findByText('Vous recevrez')

    const bouton = screen.getByRole('button', { name: 'Confirmer le retrait' })
    expect(bouton).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Mot de passe'), 'motdepasse1')
    expect(screen.getByRole('button', { name: 'Confirmer le retrait' })).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Code reçu'), '123456')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmer le retrait' })).toBeEnabled())
    expect(confirmer).not.toHaveBeenCalled()
  })

  it('un montant supérieur au solde est refusé avant l’appel', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startWithdrawal')
    await monter(gains({ availableXaf: 10000 }))

    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '50000')
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
    expect(screen.getByText(/supérieur à votre solde disponible/)).toBeInTheDocument()
    expect(demarrer).not.toHaveBeenCalled()
  })

  it('solde à zéro : pas de formulaire, mais l’explication de ce qui débloque l’argent', async () => {
    await monter(gains({ availableXaf: 0 }))
    expect(await screen.findByText(/Rien à retirer pour l'instant/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Montant à retirer')).not.toBeInTheDocument()
  })
})

describe('C6 — le compte de versement, qui n’existe pas', () => {
  it('l’écran dit que l’argent part sur le numéro du COMPTE, sans promettre un compte séparé', async () => {
    await monter(gains())

    expect(await screen.findByText(/pas de compte de versement séparé/)).toBeInTheDocument()
    // La maquette affichait un badge « Vérifié » sur un compte enregistré qui n'existe nulle part.
    const texte = document.body.textContent ?? ''
    expect(texte).not.toContain('Changer de compte')
    expect(texte).not.toContain('Configurer mon compte de versement')
  })

  it('renvoie là où le numéro se change VRAIMENT', async () => {
    await monter(gains())
    const lien = await screen.findByRole('link', { name: /Modifier mon numéro/ })
    expect(lien).toHaveAttribute('href', '/parametres?section=securite')
  })

  it('le numéro est masqué : reconnaissable, pas lisible par-dessus l’épaule', async () => {
    await monter(gains())
    await screen.findByText(/Où part l.argent/)
    const texte = document.body.textContent ?? ''
    expect(texte).toContain('•• ••')
    expect(texte).not.toContain('+242069000110')
  })
})

describe('C6 — les mouvements et les retraits', () => {
  it('nomme les trois types en français, jamais en code', async () => {
    await monter(
      gains({
        entries: [
          mouvement({ id: 'a', type: 'CREDIT', amountXaf: 5000, createdAt: '2026-08-20T10:00:00.000Z' }),
          mouvement({ id: 'b', type: 'WITHDRAWAL', amountXaf: -4000, createdAt: '2026-08-21T10:00:00.000Z' }),
          mouvement({ id: 'c', type: 'REVERSAL', amountXaf: -5000, createdAt: '2026-08-22T10:00:00.000Z' }),
        ],
      }),
    )

    const bloc = within(await screen.findByRole('list', { name: 'Mouvements' }))
    expect(bloc.getByText('Consultation')).toBeInTheDocument()
    expect(bloc.getByText('Retrait')).toBeInTheDocument()
    expect(bloc.getByText('Remboursement')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('REVERSAL')
  })

  it('un retrait échoué affiche TOUJOURS son motif', async () => {
    await monter(
      gains({
        withdrawals: [
          {
            id: 'w1',
            amountXaf: 20000,
            operator: 'MTN_MOMO',
            status: 'FAILED',
            failReason: 'Numéro Mobile Money inactif',
            requestedAt: '2026-08-22T10:00:00.000Z',
            executedAt: null,
          },
        ],
      }),
    )

    // Un échec sans motif laisse le médecin sans recours : il ne sait ni quoi corriger, ni qui appeler.
    expect(await screen.findByText('Numéro Mobile Money inactif')).toBeInTheDocument()
    expect(screen.getByText('Échoué')).toBeInTheDocument()
  })

  it('journal vide : on dit quoi attendre, au lieu d’un cadre muet (CG-08 §06)', async () => {
    await monter(gains())
    expect(await screen.findByText(/première consultation créditée apparaîtra ici/)).toBeInTheDocument()
  })

  it('un échec de chargement rassure : le journal reste intact côté serveur', async () => {
    vi.spyOn(api, 'earnings').mockRejectedValue(new Error('réseau'))
    /*
      `mySessions` DOIT être doublé ici aussi, même si ce test ne s'y intéresse pas.
      Sans cela l'appel partait pour de vrai vers l'API : il revenait en 401 (le jeton est
      fictif), `onUnauthorized` déconnectait la session — et comme la réponse arrivait deux
      secondes plus tard, c'est le test SUIVANT qui se retrouvait déconnecté en plein milieu,
      avec un écran bloqué sur son chargement. Symptôme insoluble à la lecture : le test
      accusait un bouton parfaitement correct.
    */
    vi.spyOn(api, 'mySessions').mockResolvedValue({ items: [] })
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GainsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/n'ont pas pu être chargés/)).toBeInTheDocument()
    expect(screen.getByText(/reste intact/)).toBeInTheDocument()
  })
})

/**
 * S2 — le brut et la commission, à côté du net.
 *
 * Ce qui est verrouillé n'est pas un affichage, c'est une INTERDICTION : aucun taux ne doit être
 * écrit dans cet écran. Le taux appliqué à un paiement est celui du contrat signé de ce
 * bénéficiaire-là (RM-13-07), pas un paramètre global — deux médecins peuvent avoir deux taux le
 * même jour. Un pourcentage écrit dans la page serait faux pour l'un des deux, et les maquettes en
 * portaient quatre.
 */
describe('C6 — le détail d’un mouvement (S2)', () => {
  it('montre le brut et la commission réellement prélevée', async () => {
    await monter(gains({ entries: [creditDetaille('a', 12_500, 1250, '2026-08-20T10:00:00.000Z')] }))

    const bloc = within(await screen.findByRole('list', { name: 'Mouvements' }))
    expect(bloc.getByText(/\+ ?11 250 F/)).toBeInTheDocument()
    expect(bloc.getByText(/brut 12 500/)).toBeInTheDocument()
    expect(bloc.getByText(/commission 1 250/)).toBeInTheDocument()
  })

  it('DÉDUIT le pourcentage des montants — il ne l’écrit jamais dans la page', async () => {
    // Deux mouvements, deux taux différents : c'est légitime (RM-13-07), et impossible à rendre
    // avec un pourcentage écrit en dur.
    await monter(
      gains({
        entries: [
          creditDetaille('a', 10_000, 1000, '2026-08-20T10:00:00.000Z'),
          creditDetaille('b', 10_000, 1500, '2026-08-21T10:00:00.000Z'),
        ],
      }),
    )

    const bloc = within(await screen.findByRole('list', { name: 'Mouvements' }))
    expect(bloc.getByText(/commission 1 000 \(10 %\)/)).toBeInTheDocument()
    expect(bloc.getByText(/commission 1 500 \(15 %\)/)).toBeInTheDocument()
    // Le taux de la maquette, écrit quatre fois : il ne doit revenir sous aucune forme.
    expect(document.body.textContent).not.toContain('12 %')
  })

  it('un retrait n’a pas de détail : il n’affiche ni brut ni commission', async () => {
    await monter(gains({ entries: [mouvement({ id: 'w', type: 'WITHDRAWAL', amountXaf: -40_000, createdAt: '2026-08-20T10:00:00.000Z' })] }))

    const bloc = within(await screen.findByRole('list', { name: 'Mouvements' }))
    bloc.getByText('Retrait')
    // `null` et non `0` côté serveur : l'absence de détail n'est pas une commission nulle.
    expect(bloc.queryByText(/commission/)).not.toBeInTheDocument()
  })

  it('le décompte du mois additionne les montants servis, il n’applique aucun taux', async () => {
    const ceMois = new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString()
    await monter(
      gains({
        entries: [creditDetaille('a', 12_500, 1250, ceMois), creditDetaille('b', 20_000, 3000, ceMois)],
      }),
    )

    const bloc = (await screen.findByText('Décompte du mois')).closest('section') as HTMLElement
    expect(within(bloc).getByText(/32 500 F/)).toBeInTheDocument() // brut
    expect(within(bloc).getByText(/− 4 250 F/)).toBeInTheDocument() // commission réellement prélevée
    expect(within(bloc).getByText(/28 250 F/)).toBeInTheDocument() // net
  })

  it('avoue quand un détail manque, au lieu de sous-estimer le brut en silence', async () => {
    const ceMois = new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString()
    await monter(
      gains({
        entries: [creditDetaille('a', 12_500, 1250, ceMois), mouvement({ id: 'b', type: 'CREDIT', amountXaf: 9000, createdAt: ceMois })],
      }),
    )

    expect(await screen.findByText(/le brut et la commission affichés sont donc incomplets/)).toBeInTheDocument()
  })
})

/**
 * S3 — le délai d'exécution, annoncé avant l'engagement (EF-13-07). PM-36 vaut 86 400 s aujourd'hui ;
 * il se change dans E3, et le récapitulatif doit suivre sans qu'on retouche cet écran.
 */
describe('C6 — le délai de versement (S3)', () => {
  const devis = (payoutDelaySeconds: number) => ({
    withdrawalId: 'w1',
    amountXaf: 20_000,
    ulamuFeeXaf: 0,
    netToReceiveXaf: 20_000,
    operator: 'MTN_MOMO',
    otpExpiresInSeconds: 300,
    payoutDelaySeconds,
  })

  it('annonce le délai servi par le serveur, avant la confirmation', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue(devis(86_400))
    await monter(gains({ availableXaf: 45_000 }))

    // `findBy` : le formulaire de retrait n'existe qu'une fois les gains chargés. En `getBy`, ce test
    // échoue par intermittence dans la suite complète — sur un bouton parfaitement correct.
    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(await screen.findByRole('button', { name: 'Continuer' }))

    expect(await screen.findByText('Versé sous')).toBeInTheDocument()
    expect(screen.getByText('24 h')).toBeInTheDocument()
  })

  it('suit PM-36 si le super-administrateur le change dans E3', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startWithdrawal').mockResolvedValue(devis(3 * 86_400))
    await monter(gains({ availableXaf: 45_000 }))

    // `findBy` : le formulaire de retrait n'existe qu'une fois les gains chargés. En `getBy`, ce test
    // échoue par intermittence dans la suite complète — sur un bouton parfaitement correct.
    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '20000')
    await utilisateur.click(await screen.findByRole('button', { name: 'Continuer' }))

    // Même écran, même code, autre délai : aucune durée n'est écrite dans le fichier.
    expect(await screen.findByText('3 jours')).toBeInTheDocument()
  })
})

/**
 * Famille 1, points 2 et 3 : le versement mensuel et le minimum de 5 000 XAF n'existent pas. Ce
 * sont deux promesses que la maquette faisait et que le serveur n'aurait jamais tenues.
 */
describe('C6 — ce que la maquette promettait et qui n’existe pas', () => {
  it('ne parle d’aucun versement mensuel : le retrait est à la demande', async () => {
    await monter(gains())

    await screen.findByText(/Retirables à tout moment/)
    expect(document.body.textContent).not.toMatch(/versement mensuel|prochain versement|le 5 de chaque mois/i)
  })

  it('n’impose aucun montant minimum — 450 XAF doit passer', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startWithdrawal').mockResolvedValue({
      withdrawalId: 'w1',
      amountXaf: 450,
      ulamuFeeXaf: 0,
      netToReceiveXaf: 450,
      operator: 'MTN_MOMO',
      otpExpiresInSeconds: 300,
      payoutDelaySeconds: 86_400,
    })
    await monter(gains({ availableXaf: 45_000 }))

    // 450 XAF, c'est le net d'une consultation au prix plancher (PM-06). Un minimum à 5 000 aurait
    // imposé douze consultations avant le premier retrait.
    await utilisateur.type(await screen.findByLabelText('Montant à retirer'), '450')
    await utilisateur.click(await screen.findByRole('button', { name: 'Continuer' }))

    await waitFor(() => expect(demarrer).toHaveBeenCalledWith(expect.objectContaining({ amountXaf: 450 })))
    expect(document.body.textContent).not.toContain('5 000 XAF minimum')
  })

  it('n’annonce aucun frais opérateur : aucun agrégateur n’est choisi (ADR-09)', async () => {
    await monter(gains())

    await screen.findByText('À tout moment, sans minimum')
    expect(document.body.textContent).not.toContain('500 XAF de frais')
  })
})

/**
 * D-008, invariant n°9 — famille 4, point 9. Ce n'est pas la même chose qu'un compte-rendu
 * manquant : là, la somme attend ; ici, elle disparaît. Dit près du montant en attente, parce que
 * c'est cet argent-là qui est en jeu.
 */
describe('C6 — l’argent qui peut disparaître', () => {
  it('prévient, près du solde en attente, qu’une consultation sans réponse est remboursée', async () => {
    await monter(gains({ pendingXaf: 12_000 }))

    expect(await screen.findByText(/intégralement remboursée au patient/)).toBeInTheDocument()
  })

  it('ne dit rien quand il n’y a rien en attente', async () => {
    await monter(gains({ pendingXaf: 0 }))

    await screen.findByText('À tout moment, sans minimum')
    expect(screen.queryByText(/intégralement remboursée au patient/)).not.toBeInTheDocument()
  })

  it('compte les comptes-rendus qui retiennent l’argent', async () => {
    const seance = (id: string): SessionListItem => ({
      id,
      status: 'ENDED',
      patientAccountId: 'pat-1',
      professionalId: 'pro-1',
      subProfileId: null,
      durationMin: 30,
      paidAt: '2026-08-20T08:00:00.000Z',
      endsAt: '2026-08-20T08:30:00.000Z',
      endedAt: '2026-08-20T08:30:00.000Z',
      remainingSeconds: 0,
      reportDepositedAt: null,
      reportDueAt: null,
      orderRef: `ord-${id}`,
    })

    await monter(gains({ pendingXaf: 24_000 }), [seance('s1'), seance('s2')])

    expect(await screen.findByText(/2 comptes-rendus à déposer/)).toBeInTheDocument()
  })
})
