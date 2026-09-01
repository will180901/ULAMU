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
import { api, type MeResponse, type UserReport } from '@/lib/api'

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

function monter(items: UserReport[] = [signalement()]) {
  vi.spyOn(api, 'reports').mockResolvedValue({ items })
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
