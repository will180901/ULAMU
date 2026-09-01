/**
 * E4 « Administrateurs » — qui administre ULAMU, et avec quel pouvoir.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **UN sous-rôle par compte, pas une combinaison.** La maquette montre une matrice de quatre
 *     cases cochables et annonce « un sous-rôle s'attribue et se révoque séparément ». Le modèle
 *     n'en porte qu'un : attribuer Finance à un vérificateur ne l'ajoute pas, cela le REMPLACE.
 *     Une matrice aurait menti au geste près.
 *  2. **« Modération » n'existe pas.** Les quatre rôles sont super-admin, vérification, finance et
 *     couverture territoriale.
 *  3. **On ne révoque pas son propre rôle** — le serveur refuse, pour qu'il reste toujours
 *     quelqu'un pour administrer. L'écran ne propose donc pas le bouton, et dit pourquoi.
 *  4. **La création passe en second** (famille 3, groupe D), et dit ce qu'elle implique : choisir le
 *     mot de passe de quelqu'un d'autre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdministrateursPage } from '@/modules/admin/pages/AdministrateursPage'
import { useSessionStore } from '@/state/session.store'
import { api, type AuditEntry, type MeResponse, type PlatformAdmin } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'super',
  phone: '+242069000002',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'SUPER_ADMIN',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'super@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const admin = (over: Partial<PlatformAdmin> = {}): PlatformAdmin => ({
  accountId: 'adm-2',
  username: 'p.okemba',
  firstName: 'Patrick',
  lastName: 'Okemba',
  phone: '+242053310988',
  role: 'ADMIN_VERIFICATION',
  assignedBy: 'adm-1',
  assignedAt: '2026-02-14T11:05:00.000Z',
  ...over,
})

const MOI_ADMIN = admin({
  accountId: 'adm-1',
  username: 'super',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  phone: '+242069000002',
  role: 'SUPER_ADMIN',
})

const entree = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  seq: '42',
  actorId: 'adm-1',
  actorType: 'admin',
  action: 'm02.admin.role_assigned',
  resource: 'account:adm-2',
  context: { reason: 'Prise de fonction · formation achevée' },
  hash: 'abc',
  createdAt: '2026-02-14T11:05:00.000Z',
  ...over,
})

function monter(liste: PlatformAdmin[] = [MOI_ADMIN, admin()], journal: AuditEntry[] = []) {
  vi.spyOn(api, 'admins').mockResolvedValue(liste)
  vi.spyOn(api, 'auditLog').mockImplementation(async (q = {}) => ({
    items: journal.filter((e) => !q.action || e.action === q.action),
    nextCursor: null,
  }))
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AdministrateursPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** La ligne du tableau qui porte ce nom. */
const ligne = async (nom: string) => (await screen.findByText(nom)).closest('tr') as HTMLElement

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('E4 — un compte, un sous-rôle', () => {
  it('dit que le nouveau rôle REMPLACE l’ancien, il ne s’y ajoute pas', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(within(await ligne('Patrick Okemba')).getByRole('button', { name: /Changer le rôle/ }))

    expect(await screen.findByText(/Celui que vous choisissez remplace l'actuel/)).toBeInTheDocument()
    // La phrase du bandeau est coupée par un `<strong>` : on vise le titre de la carte, qui la résume.
    expect(screen.getByText('Un compte, un sous-rôle')).toBeInTheDocument()
  })

  it('n’affiche AUCUNE matrice de cases : une seule pastille par ligne', async () => {
    monter()

    const tableau = within(await screen.findByRole('table'))
    // Quatre colonnes cochables auraient laissé croire qu'on cumule les pouvoirs.
    expect(tableau.queryAllByRole('checkbox')).toHaveLength(0)
    expect(within(await ligne('Patrick Okemba')).getByText('Vérification')).toBeInTheDocument()
  })

  it('nomme les quatre rôles RÉELS — « modération » n’en fait pas partie', async () => {
    monter()

    expect(await screen.findByText('Couverture territoriale')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/mod[ée]ration/i)
  })

  it('un compte sans rôle le dit, au lieu d’une case vide', async () => {
    monter([MOI_ADMIN, admin({ accountId: 'adm-3', firstName: 'Chancelle', lastName: 'Koumba', role: null })])

    expect(within(await ligne('Chancelle Koumba')).getByText(/n'accède à rien/)).toBeInTheDocument()
  })

  it('attribue le rôle choisi, avec son motif', async () => {
    const utilisateur = userEvent.setup()
    const attribuer = vi.spyOn(api, 'assignAdminRole').mockResolvedValue({ accountId: 'adm-2', role: 'ADMIN_FINANCE' })
    monter()

    await utilisateur.click(within(await ligne('Patrick Okemba')).getByRole('button', { name: /Changer le rôle/ }))
    // Depuis le 01/09 les listes ne sont plus natives : on ouvre le champ, puis on désigne l'option.
    await utilisateur.click(await screen.findByLabelText('Sous-rôle'))
    await utilisateur.click(await screen.findByRole('option', { name: /Finance/ }))
    await utilisateur.type(screen.getByLabelText('Motif'), 'Renfort sur les remboursements')
    await utilisateur.click(screen.getByRole('button', { name: /Attribuer ce sous-rôle/ }))

    await waitFor(() =>
      expect(attribuer).toHaveBeenCalledWith('adm-2', 'ADMIN_FINANCE', 'Renfort sur les remboursements'),
    )
  })

  it('refuse d’attribuer le rôle qu’il a déjà, et le dit', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(within(await ligne('Patrick Okemba')).getByRole('button', { name: /Changer le rôle/ }))

    expect(await screen.findByText("C'est déjà son sous-rôle.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Attribuer ce sous-rôle/ })).toBeDisabled()
  })
})

describe('E4 — la continuité d’administration', () => {
  it('n’offre pas de révoquer son PROPRE rôle, et dit pourquoi', async () => {
    monter()

    const maLigne = await ligne('Sylvie Ngouabi')
    expect(within(maLigne).getByText('Votre compte est protégé')).toBeInTheDocument()
    expect(within(maLigne).queryByRole('button', { name: 'Révoquer' })).not.toBeInTheDocument()
  })

  it('révoque celui d’un autre', async () => {
    const utilisateur = userEvent.setup()
    const revoquer = vi.spyOn(api, 'revokeAdminRole').mockResolvedValue(undefined)
    // Deux titulaires Vérification : retirer Patrick ne vide pas le sous-rôle. Avec un seul, le
    // bouton n'existe plus — c'est l'objet du bloc suivant.
    monter([MOI_ADMIN, admin(), admin({ accountId: 'adm-3', firstName: 'Gisèle', lastName: 'Ndinga' })])

    await utilisateur.click(within(await ligne('Patrick Okemba')).getByRole('button', { name: 'Révoquer' }))

    await waitFor(() => expect(revoquer).toHaveBeenCalledWith('adm-2'))
  })

  it('explique la règle avant le tableau, pas après une erreur', async () => {
    monter()

    expect(await screen.findByText(/Vous ne pouvez pas\s+révoquer votre propre rôle/)).toBeInTheDocument()
  })
})

/**
 * Le dernier titulaire d'un sous-rôle (dette 8ter, soldée le 01/09/2026).
 *
 * La maquette annonçait « une case grisée signale le dernier porteur d'un sous-rôle ». La phrase
 * avait dû être retirée de l'écran : **rien ne l'empêchait côté serveur**, et un écran ne ferme pas
 * une porte. Le serveur refuse désormais — sur la révocation ET sur le changement de rôle, qui vide
 * le sous-rôle tout aussi sûrement. L'écran peut donc le dire AVANT le clic.
 */
describe('E4 — le dernier titulaire d’un sous-rôle', () => {
  it('ne propose pas de révoquer le seul administrateur Vérification, et dit pourquoi', async () => {
    monter()

    const sienne = await ligne('Patrick Okemba')
    // Un bouton grisé sans raison se lit comme une panne : on met la raison à sa place.
    expect(within(sienne).queryByRole('button', { name: 'Révoquer' })).not.toBeInTheDocument()
    expect(within(sienne).getByText(/Dernier Vérification/)).toBeInTheDocument()
    expect(within(sienne).getByText(/nommez un remplaçant d'abord/)).toBeInTheDocument()
  })

  it('rend le bouton dès qu’un second titulaire couvre le sous-rôle', async () => {
    monter([MOI_ADMIN, admin(), admin({ accountId: 'adm-3', firstName: 'Gisèle', lastName: 'Ndinga' })])

    expect(within(await ligne('Patrick Okemba')).getByRole('button', { name: 'Révoquer' })).toBeInTheDocument()
    expect(within(await ligne('Gisèle Ndinga')).getByRole('button', { name: 'Révoquer' })).toBeInTheDocument()
  })

  it('ne confond pas « sans rôle » avec « dernier de son rôle »', async () => {
    monter([MOI_ADMIN, admin(), admin({ accountId: 'adm-4', firstName: 'Chancelle', lastName: 'Koumba', role: null, assignedBy: null, assignedAt: null })])

    // Un compte sans sous-rôle n'en garde aucun : rien à protéger, et la ligne le dit déjà autrement.
    const sansRole = await ligne('Chancelle Koumba')
    expect(within(sansRole).queryByText(/Dernier /)).not.toBeInTheDocument()
    expect(within(sansRole).getByText(/n'accède à rien/)).toBeInTheDocument()
  })
})

describe('E4 — la création, en second', () => {
  it('propose d’abord d’habiliter un compte existant', async () => {
    monter()

    expect(await screen.findByText(/Habiliter d'abord, créer ensuite/)).toBeInTheDocument()
    // Le formulaire n'est pas ouvert : c'est le geste rare.
    expect(screen.queryByLabelText('Mot de passe provisoire')).not.toBeInTheDocument()
  })

  it('avoue qu’on va choisir le mot de passe de quelqu’un d’autre', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: /Créer un compte d'administration/ }))

    expect(await screen.findByText(/mot de passe de quelqu'un d'autre/)).toBeInTheDocument()
    expect(screen.getByText(/par un canal qui n'est pas cet écran/)).toBeInTheDocument()
  })

  it('demande les VRAIS champs du serveur, pas seulement nom et téléphone', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: /Créer un compte d'administration/ }))

    // La maquette ne demandait que nom + téléphone : le serveur exige aussi identifiant et mot de passe.
    expect(await screen.findByLabelText("Nom d'utilisateur")).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe provisoire')).toBeInTheDocument()
  })

  it('n’envoie rien tant que tout n’est pas rempli', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: /Créer un compte d'administration/ }))
    await utilisateur.type(await screen.findByLabelText('Prénom'), 'Aristide')

    expect(screen.getByRole('button', { name: 'Créer le compte' })).toBeDisabled()
  })
})

describe('E4 — le journal des habilitations', () => {
  it('affiche les motifs, lus du journal d’audit', async () => {
    monter(undefined, [entree()])

    expect(await screen.findByText(/Prise de fonction · formation achevée/)).toBeInTheDocument()
    expect(screen.getByText('Sous-rôle attribué')).toBeInTheDocument()
  })

  it('dit que le consulter laisse une trace (RM-04-02)', async () => {
    monter()

    expect(await screen.findByText(/Ouvrir cet écran y laisse\s+elle-même une trace/)).toBeInTheDocument()
  })

  it('supporte une entrée sans motif sans casser la liste', async () => {
    monter(undefined, [entree({ seq: '43', action: 'm02.admin.role_revoked', context: {} })])

    expect(await screen.findByText('Sous-rôle révoqué')).toBeInTheDocument()
  })

  it('journal vide : on le dit, plutôt qu’un cadre muet', async () => {
    monter(undefined, [])

    expect(await screen.findByText(/Aucune habilitation enregistrée/)).toBeInTheDocument()
  })
})
