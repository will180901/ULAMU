/**
 * E6 « Signalements » — la modération.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **Le signaleur reste invisible, et l'écran le DIT.** Le serveur retire son identité avant de
 *     servir (RM-04-04). Ce n'est pas une donnée manquante à combler : c'est ce qui permet de
 *     signaler un praticien dont on dépend. Laisser un vide ferait chercher la donnée ; le dire
 *     ferme la question.
 *  2. **La file est triée par gravité PUIS ancienneté.** La maquette promet que les signalements
 *     hors délai « passent avant tout autre dossier ». Faux : un spam en retard reste derrière un
 *     harcèlement du jour.
 *  3. **On ne suspend ni ne bannit ici.** Les quatre issues du serveur sont : classer, avertir,
 *     transmettre aux comptes, transmettre à la vérification. Deux d'entre elles ne tranchent pas —
 *     elles transmettent, et un modérateur qui croit avoir suspendu ne rouvrira rien ailleurs.
 *  4. **Aucun délai écrit.** Le seuil vit dans un paramètre que cette route ne sert pas, et auquel
 *     un modérateur n'a pas accès. Le serveur envoie un drapeau ; c'est lui qu'on affiche.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SignalementsPage } from '@/modules/admin/pages/SignalementsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type CompteMinimal, type ContexteSignalement, type MeResponse, type UserReport } from '@/lib/api'

const ADMIN: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'moderation',
  phone: '+242069000003',
  firstName: 'Sylvie',
  lastName: 'Ngouabi',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'ADMIN_VERIFICATION',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'moderation@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const signalement = (over: Partial<UserReport> = {}): UserReport => ({
  id: 'sig-1',
  targetType: 'PROFESSIONAL',
  targetId: 'ab12cd34-0000-0000-0000-000000000000',
  reasonCode: 'INAPPROPRIATE_BEHAVIOR',
  reasonText: 'Propos jugés méprisants pendant une téléconsultation.',
  status: 'OPEN',
  createdAt: '2026-08-10T14:20:00.000Z',
  isOverdue: false,
  ...over,
})

/** Une personne, en données minimales — ce que RM-16-02 autorise l'administration à voir. */
const COMPTE: CompteMinimal = {
  accountId: 'acc-9',
  phone: '+242060000000',
  type: 'PROFESSIONAL',
  status: 'ACTIVE',
  displayName: 'Awa Mbemba',
}

/**
 * Le contexte d'un signalement de MESSAGE.
 *
 * ⚠️ Remarquer ce qui n'y est PAS : le texte du message. Le serveur ne le sert jamais — il est
 * chiffré au repos (RM-06-06) et peut porter les données de santé d'un patient qui n'a rien
 * signalé. Cette doublure dit la vérité du serveur, pas une commodité de test.
 */
const contexteMessage = (): ContexteSignalement => ({
  id: 'sig-1',
  targetType: 'SESSION_MESSAGE',
  targetId: 'msg-9',
  reasonCode: 'INAPPROPRIATE_BEHAVIOR',
  reasonText: 'Propos jugés méprisants pendant une téléconsultation.',
  status: 'OPEN',
  createdAt: '2026-08-10T14:20:00.000Z',
  target: {
    kind: 'SESSION_MESSAGE',
    found: true,
    message: {
      messageId: 'msg-9',
      sessionId: 'sess-3',
      kind: 'VOICE',
      createdAt: '2026-08-10T14:05:00.000Z',
      edited: false,
      deleted: false,
    },
    author: COMPTE,
  },
})

function monter(items: UserReport[] = [signalement()], contexte: ContexteSignalement = contexteMessage()) {
  vi.spyOn(api, 'reports').mockResolvedValue({ items })
  vi.spyOn(api, 'reportContext').mockResolvedValue(contexte)
  useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SignalementsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Ouvre le détail du premier signalement de la file.
 *
 * `onglet` : la file s'ouvre sur « Ouverts ». Un signalement déjà tranché n'y figure pas — il faut
 * changer de vue avant de pouvoir le désigner.
 */
async function ouvrir(utilisateur: ReturnType<typeof userEvent.setup>, onglet?: RegExp) {
  if (onglet) await utilisateur.click(await screen.findByRole('button', { name: onglet }))
  const file = within(await screen.findByRole('region', { name: 'File des signalements' }))
  // Plusieurs lignes peuvent porter le même texte : on ouvre la PREMIÈRE, celle que le tri met en tête.
  await utilisateur.click(file.getAllByRole('button')[0])
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('E6 — l’identité du signaleur', () => {
  it('dit qu’elle n’est pas transmise, et pourquoi', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText(/L'identité du signaleur ne vous est pas transmise/)).toBeInTheDocument()
    expect(screen.getByText(/permet de signaler quelqu'un dont on dépend/)).toBeInTheDocument()
  })

  it('le rappelle avant même d’ouvrir un dossier', async () => {
    monter()

    // C'est une propriété de l'écran entier, pas d'un signalement : dite une fois, en tête.
    expect(await screen.findByText(/Vous ne verrez jamais qui a signalé/)).toBeInTheDocument()
  })

  it('n’affiche AUCUN bloc « plaignant » qu’il faudrait remplir', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    await screen.findByText('Les parties')
    expect(document.body.textContent).not.toMatch(/plaignant/i)
  })
})

describe('E6 — l’ordre de la file', () => {
  it('corrige la promesse : un signalement en retard ne passe pas devant un plus grave', async () => {
    monter([signalement({ isOverdue: true })])

    expect(await screen.findByText(/ne passe pas devant un plus grave/)).toBeInTheDocument()
    // La phrase de la maquette, qui promettait l'inverse.
    expect(document.body.textContent).not.toMatch(/avant tout autre dossier/i)
  })

  it('annonce le tri réel dans l’en-tête', async () => {
    monter()

    expect(await screen.findByText(/les plus graves\s+d'abord/)).toBeInTheDocument()
  })

  it('n’écrit aucun délai en heures — le serveur n’envoie qu’un drapeau', async () => {
    monter([signalement({ isOverdue: true })])

    await screen.findByText(/dépassé le délai de traitement/)
    expect(document.body.textContent).not.toMatch(/48 h|48 heures|délai réglementaire de \d/i)
  })

  it('marque « hors délai » là où le serveur le dit', async () => {
    monter([signalement({ isOverdue: true })])

    const file = within(await screen.findByRole('region', { name: 'File des signalements' }))
    expect(file.getByText('Hors délai')).toBeInTheDocument()
  })
})

describe('E6 — rendre une décision', () => {
  it('propose les QUATRE issues du serveur, et dit ce que chacune fait', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText('Classer sans suite')).toBeInTheDocument()
    expect(screen.getByText('Avertir')).toBeInTheDocument()
    expect(screen.getByText("Transmettre à l'administration des comptes")).toBeInTheDocument()
    expect(screen.getByText('Transmettre à la vérification')).toBeInTheDocument()
  })

  it('n’offre NI suspension NI bannissement : ce n’est pas décidé ici', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    await screen.findByText('Rendre une décision')
    // « Suspendre 15 jours » et « Bannir définitivement » de la maquette : ce sont des sanctions
    // de l'écran Comptes, avec leur propre motif — et aucune durée n'existe au modèle.
    expect(screen.queryByText(/Suspendre 15 jours/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bannir définitivement/)).not.toBeInTheDocument()
  })

  it('dit qu’une transmission ne tranche pas', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Vous ne suspendez ni ne bannissez ici : vous transmettez/)).toBeInTheDocument()
  })

  it('exige une issue ET un motif', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    const valider = await screen.findByRole('button', { name: /Rendre cette décision/ })
    expect(valider).toBeDisabled()
    expect(screen.getByText("Choisissez d'abord une issue.")).toBeInTheDocument()

    await utilisateur.click(screen.getByRole('radio', { name: /Avertir/ }))
    expect(screen.getByRole('button', { name: /Rendre cette décision/ })).toBeDisabled()
  })

  it('envoie la décision et son motif', async () => {
    const utilisateur = userEvent.setup()
    const decider = vi.spyOn(api, 'decideReport').mockResolvedValue(undefined)
    monter()
    await ouvrir(utilisateur)

    await utilisateur.click(await screen.findByRole('radio', { name: /Avertir/ }))
    await utilisateur.type(screen.getByLabelText('Motif'), 'Propos déplacés confirmés par le fil')
    await utilisateur.click(screen.getByRole('button', { name: /Rendre cette décision/ }))

    await waitFor(() =>
      expect(decider).toHaveBeenCalledWith('sig-1', {
        decision: 'WARNING',
        reasons: 'Propos déplacés confirmés par le fil',
      }),
    )
  })

  it('prévient que la décision est définitive AVANT de la rendre', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText(/ce signalement ne pourra plus être rejugé/)).toBeInTheDocument()
  })

  it('un signalement déjà tranché n’offre plus aucune issue', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ status: 'ACTION_TAKEN' })])
    await ouvrir(utilisateur, /Tranchés/)

    expect(await screen.findByText(/Le serveur refuse de le rejuger/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rendre cette décision/ })).not.toBeInTheDocument()
  })
})

describe('E6 — ce que l’écran n’invente pas', () => {
  it('aucune chronologie de relances : rien de tel n’existe', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    await screen.findByText('Les parties')
    expect(document.body.textContent).not.toMatch(/relance automatique|demande d'explication/i)
  })

  it('aucun antécédent compté : la file ne le sert pas', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ id: 'sig-1' }), signalement({ id: 'sig-2' })])
    await ouvrir(utilisateur)

    await screen.findByText('Les parties')
    // « 3ᵉ signalement · 1 confirmé » serait un chiffre partiel présenté comme un antécédent.
    expect(document.body.textContent).not.toMatch(/\d+(er|e|ᵉ) signalement|\d+ confirmé/i)
  })

  it('aucune référence inventée : les identifiants sont des UUID', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    await screen.findByText('Les parties')
    expect(document.body.textContent).not.toMatch(/SIG-\d{4}-\d+|USR-\d{4}-\d+/)
  })

  it('aucun bouton d’export', async () => {
    monter()

    await screen.findByRole('region', { name: 'File des signalements' })
    expect(screen.queryByRole('button', { name: /Exporter|PDF|CSV/i })).not.toBeInTheDocument()
  })
})

describe('E6 — de qui parle ce signalement (chantier 60)', () => {
  it('nomme l’auteur du message signalé, au lieu d’un identifiant tronqué', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ targetType: 'SESSION_MESSAGE', targetId: 'msg-9' })], contexteMessage())
    await ouvrir(utilisateur)

    expect(await screen.findByText('Awa Mbemba')).toBeInTheDocument()
    expect(screen.getByText(/Auteur du message/)).toBeInTheDocument()
    // L'identifiant tronqué, seul, ne suffisait pas à instruire quoi que ce soit.
    expect(document.body.textContent).not.toContain('MSG-9')
  })

  it('dit quand et de quelle nature, sans jamais le contenu', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ targetType: 'SESSION_MESSAGE', targetId: 'msg-9' })], contexteMessage())
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Message note vocale, envoyé le/)).toBeInTheDocument()
  })

  /*
    LE test de ce chantier. Le contenu d'une consultation est chiffré (RM-06-06) et peut porter les
    données de santé d'un patient qui n'a rien signalé. L'écran doit le DIRE, sinon le modérateur
    attend un extrait qui ne viendra jamais et croit à une panne.
  */
  it('annonce que le texte du message n’est pas affiché, et pourquoi', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ targetType: 'SESSION_MESSAGE', targetId: 'msg-9' })], contexteMessage())
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Le texte du message n'est pas affiché/)).toBeInTheDocument()
    expect(screen.getByText(/chiffré et n'est lisible que par leurs participants/)).toBeInTheDocument()
  })

  it('signale un compte suspendu — cela change ce qu’il reste à décider', async () => {
    const utilisateur = userEvent.setup()
    monter(
      [signalement({ targetType: 'PROFILE', targetId: 'acc-9' })],
      {
        ...contexteMessage(),
        target: { kind: 'PROFILE', found: true, account: { ...COMPTE, status: 'SUSPENDED' } },
      },
    )
    await ouvrir(utilisateur)

    expect(await screen.findByText('compte suspendu')).toBeInTheDocument()
  })

  /*
    Une lecture qui échoue n'est ni un zéro ni un « non » : une cible disparue se DIT, sinon le
    modérateur croit à un écran vide et laisse le dossier ouvert indéfiniment.
  */
  it('dit franchement quand la cible n’existe plus', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement({ targetType: 'SESSION_MESSAGE', targetId: 'msg-9' })], {
      ...contexteMessage(),
      target: { kind: 'SESSION_MESSAGE', found: false },
    })
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Cette cible n'existe plus/)).toBeInTheDocument()
  })

  it('retombe sur l’identifiant brut si l’identification échoue, en le disant', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'reports').mockResolvedValue({ items: [signalement()] })
    vi.spyOn(api, 'reportContext').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SignalementsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await ouvrir(utilisateur)

    expect(await screen.findByText(/L'identification n'a pas pu être chargée/)).toBeInTheDocument()
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — les phrases que cet écran ne doit pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════

  ⚠️ Un écran de modération dit à l'administrateur ce que chaque issue PRODUIT. Deux des quatre ne
  tranchent pas, elles transmettent ; une troisième n'entraîne aucune restriction. Perdre ces
  phrases ferait croire des dossiers réglés qui ne le sont pas.
*/
describe('E6 — filet de refonte : ce que chaque issue produit vraiment', () => {
  /*
    L'avertissement se lit comme une sanction, et n'en est pas une : la personne continue d'exercer.
    Un modérateur qui l'ignore croit avoir protégé quelqu'un.
  */
  it('dit qu’un avertissement n’entraîne AUCUNE restriction d’accès', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Aucune restriction d'accès : la personne continue d'exercer/)).toBeInTheDocument()
  })

  /*
    Classer sans suite n'est pas un silence : le signaleur en est informé — sans que son identité
    soit jamais révélée. C'est ce qui distingue un rejet motivé d'un dossier oublié.
  */
  it('dit que le signaleur est informé, même d’un classement sans suite', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Le signaleur est informé de l'issue, sans que son identité soit révélée/)).toBeInTheDocument()
  })

  /*
    La cible d'un signalement peut avoir disparu — compte fermé, message effacé. Le dire permet
    d'instruire sur la seule foi du récit, au lieu de laisser croire à une panne d'affichage.
  */
  it('dit qu’une cible disparue n’empêche pas d’instruire', async () => {
    const utilisateur = userEvent.setup()
    monter([signalement()], { ...contexteMessage(), target: { kind: 'SESSION_MESSAGE', found: false } })
    await ouvrir(utilisateur)

    expect(await screen.findByText(/Le signalement reste instruisible sur la seule foi du récit/)).toBeInTheDocument()
  })
})
