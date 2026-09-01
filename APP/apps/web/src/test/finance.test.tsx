/**
 * E2 « Supervision financière » — trancher les remboursements, rapprocher l'argent.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **Le seuil de double validation n'est pas écrit dans l'écran.** La règle de la maquette est
 *     juste — deux administrateurs distincts, pas d'auto-validation (RM-13-06) — seul le nombre
 *     était faux (100 000 au lieu de PM-35). Il est lu de `GET /admin/parameters` : si E3 le change,
 *     la phrase suit. Et la DÉCISION, elle, est prise par le serveur au dépôt de la demande.
 *  2. **On ne valide pas sa propre demande.** Le serveur refuse ; l'écran ne propose donc pas le
 *     bouton, et dit pourquoi — un bouton grisé sans raison se lit comme une panne.
 *  3. **Aucun total mensuel.** La file sert les 200 dernières demandes, sans découpage par mois :
 *     additionner ce qu'elle renvoie donnerait un chiffre plafonné sans le dire. Un montant
 *     financier faux est pire qu'un montant absent.
 *  4. **Le rapprochement s'affiche APRÈS le clic.** Aucune table ne conserve le rapport : un écran
 *     vide ne veut pas dire « aucun écart », et l'écran doit le dire.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinancePage } from '@/modules/admin/pages/FinancePage'
import { useSessionStore } from '@/state/session.store'
import {
  api,
  type MeResponse,
  type PlatformParameter,
  type ReconciliationReport,
  type RefundRequest,
} from '@/lib/api'

const ADMIN: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'finance',
  phone: '+242069000001',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'ADMIN_FINANCE',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'finance@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const PM35: PlatformParameter = {
  key: 'PM-35',
  value: '50000',
  description: 'Seuil de double validation des remboursements manuels',
  effectiveAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const demande = (over: Partial<RefundRequest> = {}): RefundRequest => ({
  requestId: 'r-1',
  paymentId: 'pay-1',
  reason: 'Consultation non honorée · le soignant ne s’est pas présenté',
  status: 'PENDING_SECOND_APPROVAL',
  requestedBy: 'adm-2',
  approvedBy: null,
  createdAt: '2026-08-06T09:00:00.000Z',
  decidedAt: null,
  amountXaf: 145_000,
  payerId: 'pat-1',
  ...over,
})

const rapport = (over: Partial<ReconciliationReport> = {}): ReconciliationReport => ({
  checkedAtIso: '2026-09-01T09:00:00.000Z',
  aggregatorLines: 12,
  dbLines: 12,
  missingInDb: [],
  missingAtAggregator: [],
  amountMismatch: [],
  hasGaps: false,
  ...over,
})

function monter(enAttente: RefundRequest[] = [], toutes: RefundRequest[] = [], parametres: PlatformParameter[] = [PM35]) {
  vi.spyOn(api, 'adminRefunds').mockImplementation(async (status?: string) =>
    status === 'PENDING_SECOND_APPROVAL' ? enAttente : toutes,
  )
  vi.spyOn(api, 'parameters').mockResolvedValue(parametres)
  useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FinancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('E2 — le seuil de double validation', () => {
  it('lit PM-35 du serveur, il ne l’écrit pas', async () => {
    await monter()

    expect(await screen.findByText(/plus de 50 000 XAF exige l'accord de deux administrateurs/)).toBeInTheDocument()
    // Le chiffre de la maquette, faux d'un facteur deux.
    expect(document.body.textContent).not.toContain('100 000')
  })

  it('suit PM-35 si le super-administrateur le change dans E3', async () => {
    await monter([], [], [{ ...PM35, value: '75000' }])

    expect(await screen.findByText(/plus de 75 000 XAF/)).toBeInTheDocument()
  })

  it('reste compréhensible si le paramètre n’est pas lisible', async () => {
    await monter([], [], [])

    // Sans le seuil, la RÈGLE tient toujours : c'est elle qui compte, pas le nombre.
    expect(await screen.findByText(/Au-delà d'un certain montant/)).toBeInTheDocument()
    expect(screen.getByText(/Personne ne peut valider une demande qu'il a lui-même initiée/)).toBeInTheDocument()
  })

  it('dit que c’est le serveur qui applique la règle', async () => {
    await monter()

    expect(await screen.findByText(/cet écran ne fait que la dire/)).toBeInTheDocument()
  })
})

describe('E2 — trancher un remboursement', () => {
  it('contresigner appelle l’approbation, avec ce que ça déclenche écrit à côté', async () => {
    const utilisateur = userEvent.setup()
    const approuver = vi.spyOn(api, 'approveRefund').mockResolvedValue(undefined)
    await monter([demande()])

    expect(await screen.findByText(/Votre accord déclenche le versement au patient/)).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: /Contresigner/ }))

    await waitFor(() => expect(approuver).toHaveBeenCalledWith('r-1'))
  })

  it('refuser est possible sans motif ici — le serveur consigne la décision', async () => {
    const utilisateur = userEvent.setup()
    const rejeter = vi.spyOn(api, 'rejectRefund').mockResolvedValue(undefined)
    await monter([demande()])

    await utilisateur.click(await screen.findByRole('button', { name: 'Refuser' }))

    await waitFor(() => expect(rejeter).toHaveBeenCalledWith('r-1'))
  })

  /**
   * RM-13-06. Le serveur refuserait de toute façon ; l'écran ne propose pas le bouton ET dit
   * pourquoi — un bouton grisé sans explication se lit comme une panne.
   */
  it('n’offre AUCUN bouton sur sa propre demande, et dit pourquoi', async () => {
    await monter([demande({ requestedBy: 'adm-1' })])

    expect(await screen.findByText(/Vous avez initié cette demande/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Contresigner/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refuser' })).not.toBeInTheDocument()
  })

  it('distingue sa propre demande de celle d’un autre', async () => {
    await monter([demande({ requestId: 'r-1', requestedBy: 'adm-1' }), demande({ requestId: 'r-2', requestedBy: 'adm-2' })])

    expect(await screen.findByText(/initiée par vous/)).toBeInTheDocument()
    expect(screen.getByText(/initiée par un autre administrateur/)).toBeInTheDocument()
  })

  it('file vide : on dit ce qui y arrivera, pas un cadre muet', async () => {
    await monter([])

    expect(await screen.findByText(/Aucune demande n'attend de second accord/)).toBeInTheDocument()
  })

  it('rappelle que les remboursements automatiques ne passent pas par cette file (D-008)', async () => {
    await monter([], [])

    expect(await screen.findByText(/exécutés par le serveur, sans décision humaine/)).toBeInTheDocument()
  })
})

describe('E2 — ce que l’écran refuse de totaliser', () => {
  it('n’affiche aucun total mensuel : la file plafonne à 200 demandes', async () => {
    await monter([demande()], [demande({ requestId: 'r-9', status: 'EXECUTED', decidedAt: '2026-08-20T10:00:00.000Z' })])

    expect(await screen.findByText(/elle ne totalise pas les/)).toBeInTheDocument()
    // « REMBOURSÉ EN AOÛT · 1,82 M » de la maquette : un montant financier faux est pire qu'absent.
    expect(document.body.textContent).not.toMatch(/1,82 M|REMBOURSÉ EN/i)
  })

  it('additionne en revanche ce qu’il a sous les yeux : les demandes ouvertes', async () => {
    await monter([demande({ requestId: 'r-1', amountXaf: 145_000 }), demande({ requestId: 'r-2', amountXaf: 25_000 })])

    expect(await screen.findByText(/170 000 XAF en jeu/)).toBeInTheDocument()
  })
})

/**
 * Ce que l'écran dit quand le serveur ne répond pas (01/09/2026).
 *
 * Constaté pendant la relecture visuelle du chantier 18, en servant des 500 : la file échouait, et
 * l'écran affichait « 0 demande à trancher » et « À trancher 0 ». Un administrateur y lisait une
 * file vide alors qu'elle était seulement illisible — la pire des deux erreurs, puisqu'elle
 * n'invite à rien faire. C'est exactement ce que le projet s'interdit : on lit un chiffre du
 * serveur, ou on ne l'affiche pas.
 */
describe('E2 — un serveur muet ne vaut pas « zéro »', () => {
  function monterEnPanne() {
    vi.spyOn(api, 'adminRefunds').mockRejectedValue(new Error('Erreur interne du serveur'))
    vi.spyOn(api, 'parameters').mockRejectedValue(new Error('Erreur interne du serveur'))
    useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <FinancePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('n’annonce aucun compte tant que la file n’a pas été lue', async () => {
    monterEnPanne()

    await screen.findByText(/n'a pas pu être lue|n’a pas pu être lue/)
    expect(document.body.textContent).not.toMatch(/0 demande à trancher/)
    expect(document.body.textContent).not.toMatch(/À trancher 0/)
  })

  it('dit ce qui a échoué, et que rien n’a bougé', async () => {
    monterEnPanne()

    // Les deux seules questions qu'on se pose : qu'est-ce que je risque, que puis-je faire ?
    expect(await screen.findByText(/aucun montant n'a\s+bougé|aucun montant n’a\s+bougé/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('E2 — le rapprochement', () => {
  it('corrige les trois faussetés de la phrase « non instruit sous 7 jours »', async () => {
    const utilisateur = userEvent.setup()
    await monter()

    await utilisateur.click(await screen.findByRole('button', { name: 'Rapprochement' }))

    const bloc = await screen.findByText(/Le rapprochement tourne chaque jour/)
    expect(bloc).toBeInTheDocument()
    expect(screen.getByText(/aux\s+administrateurs Finance/)).toBeInTheDocument()
    // Ni le délai de sept jours, ni la notion d'écart « instruit », ni « le porteur ».
    expect(document.body.textContent).not.toContain('7 jours')
    expect(document.body.textContent).not.toContain('non instruit')
  })

  it('avoue qu’un écran vide ne veut pas dire « aucun écart »', async () => {
    const utilisateur = userEvent.setup()
    await monter()

    await utilisateur.click(await screen.findByRole('button', { name: 'Rapprochement' }))

    expect(await screen.findByText(/Un écran vide ne veut donc pas dire/)).toBeInTheDocument()
  })

  it('affiche le rapport après le lancement', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'runReconciliation').mockResolvedValue(rapport())
    await monter()

    await utilisateur.click(await screen.findByRole('button', { name: 'Rapprochement' }))
    await utilisateur.click(await screen.findByRole('button', { name: /Lancer un rapprochement/ }))

    expect(await screen.findByText(/Aucun écart/)).toBeInTheDocument()
  })

  it('montre les écarts, et dit qu’ils sont DÉJÀ au journal', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'runReconciliation').mockResolvedValue(
      rapport({
        hasGaps: true,
        amountMismatch: [{ aggregatorRef: 'AGG-77', kind: 'PAYMENT', dbAmountXaf: 12_500, aggregatorAmountXaf: 12_000 }],
      }),
    )
    await monter()

    await utilisateur.click(await screen.findByRole('button', { name: 'Rapprochement' }))
    await utilisateur.click(await screen.findByRole('button', { name: /Lancer un rapprochement/ }))

    expect(await screen.findByText(/déjà au journal d'audit/)).toBeInTheDocument()
    const detail = screen.getByText('AGG-77').closest('li') as HTMLElement
    expect(within(detail).getByText(/base 12 500 XAF · relevé 12 000 XAF/)).toBeInTheDocument()
  })
})
