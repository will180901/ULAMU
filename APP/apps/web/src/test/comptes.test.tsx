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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ComptesPage } from '@/modules/admin/pages/ComptesPage'
import { useSessionStore } from '@/state/session.store'
import { api, type AdminAccount, type MeResponse, type Sanction, type SupportProcedure } from '@/lib/api'

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

function monter(
  comptes: AdminAccount[] = [],
  procedures: SupportProcedure[] = [],
  /* La file des bannissements est lue au montage depuis le chantier 67 : sans doublure, l'écran
     partirait vers une API que le harnais a coupée, et l'échec accuserait un bouton correct. */
  options: { sanctions?: Sanction[]; sanctionsEnPanne?: boolean } = {},
) {
  vi.spyOn(api, 'searchAccounts').mockResolvedValue(comptes)
  vi.spyOn(api, 'supportProcedures').mockResolvedValue(procedures)
  if (options.sanctionsEnPanne) vi.spyOn(api, 'adminSanctions').mockRejectedValue(new Error('réseau'))
  else vi.spyOn(api, 'adminSanctions').mockResolvedValue(options.sanctions ?? [])
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

describe('E-comptes — les seconds temps qui n’existaient pas (chantier 67)', () => {
  /*
    ⚠️ Deux gestes en DEUX temps dont le second n'avait aucun bouton :

      • « Bannir » dépose une DEMANDE qu'un autre administrateur doit approuver — et aucun écran ne
        permettait de voir ces demandes, ni de les trancher. Elles restaient dans un état que rien
        ne pouvait résoudre, et le compte visé restait actif ;
      • une procédure support s'ouvrait, et ne se fermait jamais.

    Un premier temps sans second temps ne laisse pas les choses en l'état : il fabrique un état que
    rien ne résout. Trouvés en balayant les capacités du client web qu'aucun écran n'appelle.
  */
  const DEMANDE: Sanction = {
    sanctionId: 'sanc-1',
    accountId: 'acc-9',
    accountName: 'Jean Loemba',
    accountStatus: 'ACTIVE',
    reason: 'Propos menaçants répétés après avertissement.',
    status: 'PENDING_SECOND_APPROVAL',
    requestedBy: 'autre-admin',
    requestedByName: 'Sylvie Ngouabi',
    approvedBy: null,
    createdAt: '2026-09-05T10:00:00.000Z',
    decidedAt: null,
  }

  it('montre les demandes de bannissement en attente, avec les DEUX noms', async () => {
    await monter([], [], { sanctions: [DEMANDE] })

    expect(await screen.findByText('Jean Loemba')).toBeInTheDocument()
    // Sans le demandeur, on approuverait une exclusion définitive sans savoir qui l'a réclamée.
    expect(screen.getByText(/Demandé par Sylvie Ngouabi/)).toBeInTheDocument()
    expect(screen.getByText(/Propos menaçants/)).toBeInTheDocument()
  })

  it('approuve une demande déposée par quelqu’un d’autre', async () => {
    const utilisateur = userEvent.setup()
    const approuver = vi.spyOn(api, 'approveBan').mockResolvedValue(undefined)
    await monter([], [], { sanctions: [DEMANDE] })

    await utilisateur.click(await screen.findByRole('button', { name: /Approuver le bannissement/i }))

    expect(approuver).toHaveBeenCalledWith('sanc-1')
  })

  /*
    La règle du serveur, dite AVANT le clic : l'approbateur doit être un administrateur DIFFÉRENT du
    demandeur. Le serveur refuse et trace la tentative comme un événement de sécurité ; laisser le
    bouton actif ferait découvrir la règle par un refus, sur un geste qu'on croyait acquis.
  */
  it('interdit d’approuver SA PROPRE demande, et dit pourquoi', async () => {
    await monter([], [], { sanctions: [{ ...DEMANDE, requestedBy: ADMIN.accountId, requestedByName: 'Moi' }] })

    expect(await screen.findByText(/C'est vous qui avez demandé ce bannissement/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Approuver le bannissement/i })).toBeDisabled()
  })

  /*
    Le rejet, lui, reste ouvert au demandeur : se raviser sur sa propre demande n'est pas un
    contournement du double contrôle, c'est son contraire.
  */
  it('laisse le demandeur REJETER sa propre demande', async () => {
    const utilisateur = userEvent.setup()
    const rejeter = vi.spyOn(api, 'rejectBan').mockResolvedValue(undefined)
    await monter([], [], { sanctions: [{ ...DEMANDE, requestedBy: ADMIN.accountId, requestedByName: 'Moi' }] })

    await utilisateur.click(await screen.findByRole('button', { name: /^Rejeter$/i }))

    expect(rejeter).toHaveBeenCalledWith('sanc-1')
  })

  it('dit clairement quand aucune demande n’attend', async () => {
    await monter([], [], { sanctions: [] })
    expect(await screen.findByText(/Aucune demande de bannissement en attente/)).toBeInTheDocument()
  })

  /*
    Un cadre vide se prend pour « rien à faire ». Sur une exclusion définitive en attente, c'est le
    pire malentendu possible.
  */
  it('distingue « rien en attente » de « je n’ai pas pu lire »', async () => {
    await monter([], [], { sanctionsEnPanne: true })

    expect(await screen.findByText(/La file n'a pas pu être lue/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Aucune demande de bannissement en attente/)
  })

  it('clôt une procédure support en enregistrant ce qui a été fait', async () => {
    const utilisateur = userEvent.setup()
    const clore = vi.spyOn(api, 'completeSupportProcedure').mockResolvedValue({ id: 'proc-1', status: 'COMPLETED' })
    await monter([], [procedure()])

    await utilisateur.click(await screen.findByRole('button', { name: /^Clore$/i }))
    fireEvent.change(screen.getByLabelText(/Ce que vous avez fait/i), {
      target: { value: 'Numéro remplacé après vérification.' },
    })
    await utilisateur.click(screen.getByRole('button', { name: /Clore la procédure/i }))

    expect(clore).toHaveBeenCalledWith('proc-1', [{ label: 'Numéro remplacé après vérification.' }])
  })

  it('annule une procédure en enregistrant le motif', async () => {
    const utilisateur = userEvent.setup()
    const annuler = vi.spyOn(api, 'cancelSupportProcedure').mockResolvedValue({ id: 'proc-1', status: 'CANCELLED' })
    await monter([], [procedure()])

    await utilisateur.click(await screen.findByRole('button', { name: /Annuler la procédure/i }))
    fireEvent.change(screen.getByLabelText(/Pourquoi vous l'annulez/i), {
      target: { value: 'Le demandeur a retrouvé son accès.' },
    })
    await utilisateur.click(screen.getByRole('button', { name: /Confirmer l’annulation/i }))

    expect(annuler).toHaveBeenCalledWith('proc-1', 'Le demandeur a retrouvé son accès.')
  })

  /*
    Le serveur horodate et signe chaque étape : clore sans dire ce qu'on a fait produirait une trace
    vide — c'est-à-dire pas une trace.
  */
  it('refuse de clore sans écrire ce qui a été fait', async () => {
    const utilisateur = userEvent.setup()
    await monter([], [procedure()])

    await utilisateur.click(await screen.findByRole('button', { name: /^Clore$/i }))

    expect(screen.getByRole('button', { name: /Clore la procédure/i })).toBeDisabled()
    expect(screen.getByText(/horodaté, signé de votre nom/)).toBeInTheDocument()
  })

  it('n’offre ces gestes que sur une procédure OUVERTE', async () => {
    await monter([], [procedure({ status: 'COMPLETED' })])
    await screen.findByText(/Procédures support/)

    expect(screen.queryByRole('button', { name: /^Clore$/i })).not.toBeInTheDocument()
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — les phrases que cet écran ne doit pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════

  ⚠️ Une refonte réécrit les écrans ; c'est précisément là que disparaissent les phrases qui disent
  ce que la plateforme NE fait pas. Sur un écran qui SUSPEND, BANNIT et RÉACTIVE des comptes, ces
  phrases ne sont pas de l'habillage : elles décident de ce qu'un administrateur croit être en train
  de faire.
*/
describe('E7 — filet de refonte : ce qu’une sanction fait, et ne fait pas', () => {
  /*
    La différence la plus lourde de l’écran, et la seule qui ne se rattrape pas. Un administrateur
    qui confond les deux exclut quelqu’un pour toujours en croyant le mettre à pied.
  */
  it('dit qu’un bannissement est définitif, et qu’une suspension se lève', async () => {
    await monter()
    expect(await screen.findByText(/le compte ne revient pas. Une suspension, elle, se lève/)).toBeInTheDocument()
  })

  /*
    « Bannir » n’est pas un bouton qui bannit : c’est une DEMANDE (EF-16-07). Perdre cette phrase
    ferait croire l’acte accompli, et l’administrateur n’irait jamais chercher le second accord —
    celui-là même dont la file, ajoutée au chantier 67, permet enfin de s’occuper.
  */
  it('dit que « Bannir » DEMANDE le bannissement, il ne l’applique pas', async () => {
    const utilisateur = userEvent.setup()
    await monter([compte()])
    await chercher(utilisateur)
    await utilisateur.click(await screen.findByRole('button', { name: /Bannir/i }))

    expect(await screen.findByText(/Ceci n'applique pas le bannissement/)).toBeInTheDocument()
    expect(screen.getByText(/Un second\s+administrateur, différent de vous, devra l'approuver/)).toBeInTheDocument()
  })

  /*
    RM-16-01 : M16 guide et journalise, il n’AGIT pas. Une procédure support enregistre ce qu’un
    administrateur a fait par ailleurs — elle ne change ni un numéro, ni un dossier. Perdre cette
    phrase transformerait un registre en illusion de pouvoir.
  */
  it('dit qu’une procédure trace l’intervention, elle ne l’exécute pas', async () => {
    await monter()
    expect(await screen.findByText(/Elle trace votre intervention, elle ne l'exécute pas/)).toBeInTheDocument()
  })

  /*
    ⚠️ « Une réponse ne se réécrit pas » est DÉJÀ retenue par le test « répond, et prévient AVANT que
    la réponse soit définitive ». On ne la double pas ici : deux tests pour une même phrase donnent
    l'illusion de deux protections, et le jour où l'un tombe on croit l'autre superflu.
  */
})
