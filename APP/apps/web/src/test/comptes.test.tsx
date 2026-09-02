/**
 * E7 « Comptes et procédures support » — l'écran des décisions les plus lourdes après la vérification.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **On cherche un compte, on ne parcourt pas les comptes.** La maquette montre un tableau de
 *     1 284 inscrits, paginé, avec des tuiles qui les comptent. Aucune route ne les liste :
 *     `GET /admin/accounts` exige un terme et refuse sans lui (RM-16-02, données minimales). Ce
 *     n'est pas un manque à combler — c'est la règle, et l'écran doit la dire.
 *  2. **Aucune durée de suspension.** `AccountSanction` n'a pas de champ pour en porter une. Le
 *     sélecteur « 7 / 15 / 30 jours » de la maquette promettait une libération automatique qui
 *     n'arrive jamais — et le suspendu l'aurait attendue.
 *  3. **« Bannir » ne bannit pas, il DEMANDE** (EF-16-07). Un second administrateur, distinct du
 *     demandeur, doit approuver. Le dire après le clic serait le dire trop tard.
 *  4. **Une procédure support n'exécute rien** (RM-16-01). M16 guide et journalise, il n'agit pas.
 *     Un administrateur qui croirait le contraire laisserait la personne sans rien.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComptesPage } from '@/modules/admin/pages/ComptesPage'
import { useSessionStore } from '@/state/session.store'
import { api, type AdminAccount, type MeResponse, type SupportProcedure } from '@/lib/api'

const ADMIN: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'admin',
  phone: '+242069000000',
  firstName: 'Super',
  lastName: 'Admin',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'SUPER_ADMIN',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'admin@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const compte = (over: Partial<AdminAccount> = {}): AdminAccount => ({
  accountId: 'acc-1',
  phone: '+242069000110',
  type: 'PROFESSIONAL',
  status: 'ACTIVE',
  displayName: 'Ange Makaya',
  ...over,
})

const procedure = (over: Partial<SupportProcedure> = {}): SupportProcedure => ({
  id: 'proc-1',
  type: 'PHONE_CHANGE',
  accountId: 'acc-1',
  steps: [{ label: 'Identité vérifiée par pièce justificative', at: '2026-09-01T09:00:00.000Z', by: 'adm-1' }],
  justification: 'Numéro perdu, identité vérifiée au guichet.',
  executedBy: 'adm-1',
  status: 'OPEN',
  createdAt: '2026-09-01T09:00:00.000Z',
  completedAt: null,
  ...over,
})

function monter(comptes: AdminAccount[] = [], procedures: SupportProcedure[] = []) {
  vi.spyOn(api, 'searchAccounts').mockResolvedValue(comptes)
  vi.spyOn(api, 'supportProcedures').mockResolvedValue(procedures)
  // Ajoutée le 01/09 : sans ce double, l'écran part vers une API que le harnais a coupée, et
  // l'échec accuse un bouton parfaitement correct.
  if (!vi.isMockFunction(api.adminSupportRequests)) vi.spyOn(api, 'adminSupportRequests').mockResolvedValue([])
  useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ComptesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Tape un terme et lance la recherche — l'écran n'appelle rien sans ça. */
async function chercher(utilisateur: ReturnType<typeof userEvent.setup>, terme = 'Makaya') {
  await utilisateur.type(screen.getByLabelText('Nom ou téléphone'), terme)
  await utilisateur.click(screen.getByRole('button', { name: 'Chercher' }))
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('E7 — on cherche un compte, on ne les parcourt pas', () => {
  it('n’appelle pas le serveur tant qu’aucun terme n’est saisi', async () => {
    const chercheur = vi.spyOn(api, 'searchAccounts').mockResolvedValue([])
    monter()

    await screen.findByLabelText('Nom ou téléphone')
    // Le serveur REFUSE une recherche vide : l'appeler pour rien produirait une erreur affichée.
    expect(chercheur).not.toHaveBeenCalled()
  })

  it('dit que c’est une règle, pas une limite de l’écran', async () => {
    monter()

    expect(await screen.findByText(/Les comptes ne se parcourent pas/)).toBeInTheDocument()
    // Aucune tuile de comptage : elles supposeraient un décompte sur toute la table.
    expect(document.body.textContent).not.toMatch(/1 284|COMPTES ACTIFS/i)
  })

  it('affiche le téléphone comme repère, pas une référence inventée', async () => {
    const utilisateur = userEvent.setup()
    monter([compte()])
    await chercher(utilisateur)

    expect(await screen.findByText('Ange Makaya')).toBeInTheDocument()
    expect(screen.getByText('+242069000110')).toBeInTheDocument()
    // « USR-2026-00312 » n'existe pas : les identifiants sont des UUID.
    expect(document.body.textContent).not.toMatch(/USR-\d{4}-\d+/)
  })

  it('une recherche sans résultat explique où porte la recherche', async () => {
    const utilisateur = userEvent.setup()
    monter([])
    await chercher(utilisateur, 'inconnu')

    expect(await screen.findByText('Aucun compte trouvé')).toBeInTheDocument()
    expect(screen.getByText(/ne se trouve que par son numéro/)).toBeInTheDocument()
  })
})

describe('E7 — suspendre, réactiver, bannir', () => {
  it('n’offre AUCUNE durée de suspension — rien ne se rouvre tout seul', async () => {
    const utilisateur = userEvent.setup()
    monter([compte()])
    await chercher(utilisateur)

    await utilisateur.click(await screen.findByRole('button', { name: /Suspendre/ }))

    expect(await screen.findByText(/jusqu'à réactivation/)).toBeInTheDocument()
    // Le sélecteur de la maquette promettait une libération automatique inexistante.
    expect(document.body.textContent).not.toMatch(/7 jours|15 jours|30 jours/)
  })

  it('exige un motif, et dit qu’il sera LU par le titulaire', async () => {
    const utilisateur = userEvent.setup()
    const suspendre = vi.spyOn(api, 'suspendAccount').mockResolvedValue(undefined as never)
    monter([compte()])
    await chercher(utilisateur)
    await utilisateur.click(await screen.findByRole('button', { name: /Suspendre/ }))

    const valider = screen.getByRole('button', { name: 'Suspendre ce compte' })
    expect(valider).toBeDisabled()
    // La même vérité est dite deux fois — ici, au moment de décider, et en bas d'écran où elle
    // récapitule. On vise CELLE DU FORMULAIRE : c'est là qu'elle change un comportement.
    const formulaire = screen.getByLabelText('Motif').closest('div')?.parentElement as HTMLElement
    expect(within(formulaire).getByText(/notifié au titulaire/)).toBeInTheDocument()

    await utilisateur.type(screen.getByLabelText('Motif'), 'Exercice hors compétence déclarée')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Suspendre ce compte' })).toBeEnabled())
    await utilisateur.click(screen.getByRole('button', { name: 'Suspendre ce compte' }))

    await waitFor(() => expect(suspendre).toHaveBeenCalledWith('acc-1', 'Exercice hors compétence déclarée'))
  })

  it('dit AVANT le clic que bannir ne fait que demander (EF-16-07)', async () => {
    const utilisateur = userEvent.setup()
    monter([compte()])
    await chercher(utilisateur)

    await utilisateur.click(await screen.findByRole('button', { name: /Bannir/ }))

    expect(await screen.findByText(/cela le/)).toBeInTheDocument()
    expect(screen.getByText(/Un second administrateur, différent de vous, devra l'approuver/)).toBeInTheDocument()
  })

  it('propose « réactiver » sur un compte suspendu, jamais « suspendre »', async () => {
    const utilisateur = userEvent.setup()
    monter([compte({ status: 'SUSPENDED' })])
    await chercher(utilisateur)

    const ligne = (await screen.findByText('Ange Makaya')).closest('tr') as HTMLElement
    expect(within(ligne).getByRole('button', { name: /Réactiver/ })).toBeInTheDocument()
    expect(within(ligne).queryByRole('button', { name: /Suspendre/ })).not.toBeInTheDocument()
  })

  it('un compte banni n’offre plus rien : c’est définitif', async () => {
    const utilisateur = userEvent.setup()
    monter([compte({ status: 'BANNED' })])
    await chercher(utilisateur)

    const ligne = (await screen.findByText('Ange Makaya')).closest('tr') as HTMLElement
    expect(within(ligne).getByText('Définitif')).toBeInTheDocument()
    expect(within(ligne).queryByRole('button')).not.toBeInTheDocument()
  })

  it('dit ce qu’une sanction laisse intact — les comptes-rendus signés', async () => {
    monter()

    expect(await screen.findByText(/les comptes-rendus signés sont/)).toBeInTheDocument()
    expect(screen.getByText(/Une suspension est réversible, un bannissement ne l'est pas/)).toBeInTheDocument()
  })
})

/**
 * RM-16-01 : M16 **guide et journalise, il n'agit pas**. C'est le seul malentendu que ce bloc peut
 * produire, et il est coûteux : un administrateur qui croirait avoir changé un numéro en ouvrant une
 * procédure laisserait la personne sans accès.
 */
/**
 * La file des demandes de support (01/09/2026, dette 8quater).
 *
 * Elle est la moitié qui manquait : `SupportProcedure` trace ce qu'un ADMINISTRATEUR a fait,
 * `SupportRequest` porte ce qu'un utilisateur DEMANDE. Sans la seconde, l'application affichait une
 * adresse de courriel — `support@ulamu.cg` — dont le domaine n'appartient pas au projet.
 */
describe('E7 — les demandes de support', () => {
  const demande = (o: Record<string, unknown> = {}) => ({
    id: 'req-1',
    subject: 'PHONE_CHANGE' as const,
    body: 'J’ai perdu mon téléphone et je ne reçois plus le code.',
    status: 'OPEN' as const,
    createdAt: '2026-09-01T08:00:00.000Z',
    answer: null,
    answeredAt: null,
    requesterId: 'p1',
    requesterName: 'Mireille Bantsimba',
    requesterPhone: '+242055512470',
    ...o,
  })

  it('montre QUI demande : sans le nom ni le numéro, on ne peut pas traiter', async () => {
    vi.spyOn(api, 'adminSupportRequests').mockResolvedValue([demande()] as never)
    monter()

    expect(await screen.findByText(/Mireille Bantsimba/)).toBeInTheDocument()
    // Le numéro surtout : c'est souvent LUI le sujet de la demande.
    expect(screen.getByText(/\+242055512470/)).toBeInTheDocument()
  })

  it('répond, et prévient AVANT que la réponse soit définitive', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'adminSupportRequests').mockResolvedValue([demande()] as never)
    const repondre = vi.spyOn(api, 'answerSupportRequest').mockResolvedValue({ id: 'req-1', status: 'ANSWERED' })
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: 'Répondre' }))

    // Une réponse ne se réécrit pas : le dire après l'envoi ne servirait plus à rien.
    expect(screen.getByText(/ne peut plus être modifiée/)).toBeInTheDocument()

    await utilisateur.type(screen.getByLabelText('Votre réponse'), 'Présentez-vous au guichet avec votre CNI.')
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer la réponse' }))

    await waitFor(() =>
      expect(repondre).toHaveBeenCalledWith('req-1', 'Présentez-vous au guichet avec votre CNI.'),
    )
  })

  it('n’offre plus de répondre à une demande déjà répondue', async () => {
    vi.spyOn(api, 'adminSupportRequests').mockResolvedValue([
      demande({ status: 'ANSWERED', answer: 'C’est réglé.', answeredAt: '2026-09-02T09:00:00.000Z' }),
    ] as never)
    monter()

    expect(await screen.findByText('C’est réglé.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Répondre' })).not.toBeInTheDocument()
  })

  it('file vide : on dit ce qui y arrivera, pas un cadre muet', async () => {
    vi.spyOn(api, 'adminSupportRequests').mockResolvedValue([])
    monter()

    expect(await screen.findByText(/Aucune demande en attente/)).toBeInTheDocument()
  })

  it('lecture en panne : on ne fait pas croire à une file vide', async () => {
    vi.spyOn(api, 'adminSupportRequests').mockRejectedValue(new Error('boum'))
    monter()

    // Même règle que partout ailleurs depuis le chantier 18 : une lecture qui échoue n'est pas zéro.
    expect(await screen.findByText(/Aucune n'est perdue/)).toBeInTheDocument()
  })
})

describe('E7 — les procédures support', () => {
  it('dit en permanence qu’elle n’exécute rien', async () => {
    monter()

    expect(await screen.findByText(/enregistre votre intervention, elle ne change rien par elle-même/)).toBeInTheDocument()
  })

  it('nomme les situations en langage clair, jamais en code', async () => {
    monter()

    expect(await screen.findByText('Changement de numéro sans accès')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('PHONE_CHANGE')
    expect(document.body.textContent).not.toContain('OWNER_UNREACHABLE')
  })

  it('exige une justification avant d’ouvrir', async () => {
    const utilisateur = userEvent.setup()
    const ouvrir = vi.spyOn(api, 'openSupportProcedure').mockResolvedValue({ id: 'p1' })
    monter()

    const bouton = await screen.findByRole('button', { name: /Ouvrir la procédure/ })
    expect(bouton).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Justification'), 'Numéro perdu, identité vérifiée au guichet')
    await waitFor(() => expect(screen.getByRole('button', { name: /Ouvrir la procédure/ })).toBeEnabled())
    await utilisateur.click(screen.getByRole('button', { name: /Ouvrir la procédure/ }))

    await waitFor(() => expect(ouvrir).toHaveBeenCalled())
    expect(ouvrir.mock.calls[0][0]).toMatchObject({ type: 'PHONE_CHANGE' })
  })

  it('n’envoie que les étapes réellement cochées', async () => {
    const utilisateur = userEvent.setup()
    const ouvrir = vi.spyOn(api, 'openSupportProcedure').mockResolvedValue({ id: 'p1' })
    monter()

    await utilisateur.click(await screen.findByLabelText('Ancien numéro confirmé injoignable'))
    await utilisateur.type(screen.getByLabelText('Justification'), 'Numéro perdu')
    await utilisateur.click(screen.getByRole('button', { name: /Ouvrir la procédure/ }))

    await waitFor(() => expect(ouvrir).toHaveBeenCalled())
    expect(ouvrir.mock.calls[0][0].steps).toEqual([{ label: 'Ancien numéro confirmé injoignable' }])
  })

  it('change d’étapes quand on change de situation', async () => {
    const utilisateur = userEvent.setup()
    monter()

    // Les listes ne sont plus natives : on ouvre le champ, puis on désigne l'option.
    await utilisateur.click(await screen.findByLabelText('Type de situation'))
    await utilisateur.click(await screen.findByRole('option', { name: /Transfert de carnet de santé/ }))

    expect(await screen.findByLabelText('Identité du nouveau responsable vérifiée')).toBeInTheDocument()
    expect(screen.queryByLabelText('Ancien numéro confirmé injoignable')).not.toBeInTheDocument()
  })

  /*
    02/09/2026 (chantier 26) — « Titulaire de structure injoignable » n'est plus PROPOSÉ : aucun
    compte n'administre plus de structure (D-051) et la chaîne du médicament est hors périmètre.

    Elle reste connue de l'écran, et c'est délibéré : des procédures ouvertes avant cette date
    portent ce sujet en base, et la file d'E7 doit les nommer plutôt que d'afficher un code brut.
    Ce test verrouille les deux moitiés — plus offerte, toujours lisible.
  */
  it('n’offre plus « Titulaire de structure injoignable » — la situation n’a plus d’objet', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.click(await screen.findByLabelText('Type de situation'))

    expect(screen.queryByRole('option', { name: /Titulaire de structure injoignable/ })).toBeNull()
  })

  it('affiche les procédures ouvertes avec leurs étapes horodatées', async () => {
    monter([], [procedure()])

    expect(await screen.findByText('Numéro perdu, identité vérifiée au guichet.')).toBeInTheDocument()
    const bloc = screen.getByRole('region', { name: 'Procédures support' })
    expect(within(bloc).getByText('Identité vérifiée par pièce justificative')).toBeInTheDocument()
  })
})
