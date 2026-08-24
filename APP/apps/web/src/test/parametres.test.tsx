/**
 * B3 « Mes paramètres » — les cinq gestes qui ne se rattrapent pas.
 *
 * C'est l'écran le plus dangereux du lot. Il porte, sur une même page :
 *
 *   • le changement de mot de passe, qui déconnecte tous les autres appareils ;
 *   • le remplacement de l'adresse email, c'est-à-dire du CANAL DE RÉCUPÉRATION ;
 *   • la régénération des codes de secours, qui détruit les dix précédents ;
 *   • la ré-association de l'appareil 2FA, qui désarme le second facteur le temps du geste ;
 *   • la clôture définitive du compte.
 *
 * Aucun de ces cinq gestes n'a de bouton « annuler » une fois parti. Ce fichier verrouille les
 * garde-fous qui les précèdent — ceux dont l'absence ne se verrait qu'au moment où il est trop tard.
 *
 * Les données injectées suivent les formes relevées sur l'API DÉPLOYÉE le 24/08/2026 :
 *   GET /v1/accounts/me/sessions            → LISTE
 *   GET /v1/accounts/me/close/prerequisites → LISTE de { key, label, ok }
 *   GET /v1/notifications/me/preferences    → { preferences: [...] }
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse } from '@/lib/api'

const BASE_MOI: MeResponse = {
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
  totpEnabled: true,
  totpEnabledAt: '2026-03-12T09:00:00.000Z',
  email: 'ange.makaya@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 7,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: '2026-03-12T09:00:00.000Z',
}

const PREREQUIS_OK = [
  { key: 'consultations', label: 'Aucune consultation en cours', ok: true },
  { key: 'gains', label: 'Aucun gain en attente de retrait', ok: true },
  { key: 'reservations', label: 'Aucune réservation active en pharmacie', ok: true },
]

function monter(section: string, moi: Partial<MeResponse> = {}, prerequis = PREREQUIS_OK) {
  vi.spyOn(api, 'sessions').mockResolvedValue([
    { id: 's1', client: 'web', deviceLabel: 'Chrome · Windows', lastActiveAt: new Date().toISOString(), current: true },
    { id: 's2', client: 'mobile', deviceLabel: 'Tecno Camon', lastActiveAt: new Date(Date.now() - 3600e3).toISOString(), current: false },
  ])
  vi.spyOn(api, 'closePrerequisites').mockResolvedValue(prerequis)
  vi.spyOn(api, 'notificationPreferences').mockResolvedValue({
    preferences: [
      { category: 'care', enabled: true, adjustable: true },
      { category: 'money', enabled: true, adjustable: true },
      { category: 'reminder', enabled: false, adjustable: true },
      { category: 'system', enabled: true, adjustable: true },
      { category: 'critical', enabled: true, adjustable: false },
    ],
  })
  useSessionStore.setState({ token: 'jeton', me: { ...BASE_MOI, ...moi }, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/parametres?section=${section}`]}>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

// ── Mot de passe ────────────────────────────────────────────────────────────

describe('B3 — mot de passe', () => {
  it('les trois règles se vérifient en direct, et le bouton attend qu’elles soient toutes tenues', async () => {
    const utilisateur = userEvent.setup()
    const changer = vi.spyOn(api, 'changePassword').mockResolvedValue({ otherSessionsClosed: 1 })
    monter('securite')

    const actuel = screen.getByLabelText('Mot de passe actuel')
    const nouveau = screen.getByLabelText('Nouveau mot de passe')
    const bouton = screen.getByRole('button', { name: /Changer le mot de passe/ })
    expect(bouton).toBeDisabled()

    await utilisateur.type(actuel, 'ancienpass1')
    await utilisateur.type(nouveau, 'court')
    expect(bouton).toBeDisabled()

    await utilisateur.clear(nouveau)
    await utilisateur.type(nouveau, 'nouveaupass1')
    await waitFor(() => expect(bouton).toBeEnabled())
    expect(changer).not.toHaveBeenCalled()
  })

  it('resaisir le MÊME mot de passe est refusé avant même d’appeler le serveur', async () => {
    const utilisateur = userEvent.setup()
    const changer = vi.spyOn(api, 'changePassword').mockResolvedValue({ otherSessionsClosed: 0 })
    monter('securite')

    // Sans ce garde-fou, l'écran répondrait « c'est fait » et fermerait les autres appareils sans
    // rien avoir changé — le pire des deux mondes.
    await utilisateur.type(screen.getByLabelText('Mot de passe actuel'), 'motdepasse1')
    await utilisateur.type(screen.getByLabelText('Nouveau mot de passe'), 'motdepasse1')
    expect(screen.getByRole('button', { name: /Changer le mot de passe/ })).toBeDisabled()
    expect(changer).not.toHaveBeenCalled()
  })

  it('après le changement, l’écran DIT combien d’appareils sont tombés', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'changePassword').mockResolvedValue({ otherSessionsClosed: 3 })
    monter('securite')

    await utilisateur.type(screen.getByLabelText('Mot de passe actuel'), 'ancienpass1')
    await utilisateur.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveaupass1')
    await utilisateur.click(screen.getByRole('button', { name: /Changer le mot de passe/ }))

    // Un utilisateur qui ne le sait pas croira à une panne en retrouvant son téléphone déconnecté.
    expect(await screen.findByText(/3 autres appareils ont été déconnectés/)).toBeInTheDocument()
  })
})

// ── Adresse email ───────────────────────────────────────────────────────────

describe('B3 — adresse email', () => {
  it('un compte SANS adresse est alerté, et un seul code suffit', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi
      .spyOn(api, 'startEmailChange')
      .mockResolvedValue({ requiresOldEmailCode: false, oldEmailHint: null })
    monter('securite', { email: null })

    expect(screen.getByText(/Ce compte n'a pas d'adresse email/)).toBeInTheDocument()

    await utilisateur.type(screen.getByLabelText('Adresse à ajouter'), 'nouvelle@exemple.cg')
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer un code/ }))

    await waitFor(() => expect(demarrer).toHaveBeenCalledWith({ newEmail: 'nouvelle@exemple.cg' }))
    expect(await screen.findByText(/Un code a été envoyé à nouvelle@exemple.cg/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Code reçu à l'ancienne/)).not.toBeInTheDocument()
  })

  it('remplacer une adresse EXISTANTE exige les deux codes', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startEmailChange').mockResolvedValue({ requiresOldEmailCode: true, oldEmailHint: 'ang***@exemple.cg' })
    monter('securite')

    await utilisateur.type(screen.getByLabelText('Nouvelle adresse'), 'autre@exemple.cg')
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer un code/ }))

    // Sans preuve sur l'ANCIENNE adresse, une session volée suffirait à détourner le canal de
    // récupération, puis à réinitialiser le mot de passe en toute apparence de légalité.
    expect(await screen.findByLabelText(/Code reçu à l'ancienne/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Code reçu à la nouvelle adresse/)).toBeInTheDocument()
    expect(screen.getByText(/Les deux sont nécessaires/)).toBeInTheDocument()
  })
})

// ── Codes de secours et appareil 2FA ────────────────────────────────────────

describe('B3 — codes de secours', () => {
  it('un lot presque épuisé est signalé, pas seulement compté', async () => {
    monter('securite', { backupCodesRemaining: 2 })

    expect(screen.getByText(/2 codes restants sur 10/)).toBeInTheDocument()
    // À zéro, un téléphone perdu enferme dehors. Le dire avant, pas après.
    expect(screen.getByText(/Il vous en reste 2/)).toBeInTheDocument()
  })

  it('la régénération annonce que les dix codes actuels vont mourir', async () => {
    const utilisateur = userEvent.setup()
    monter('securite')

    await utilisateur.click(screen.getByRole('button', { name: /Régénérer les codes/ }))
    expect(screen.getByText(/cesseront de fonctionner immédiatement/)).toBeInTheDocument()
    // Mot de passe ET facteur : la simple présence d'une session ouverte ne suffit pas.
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
    expect(screen.getByLabelText(/code de secours/i)).toBeInTheDocument()
  })

  it('la ré-association prévient que le compte perd son second facteur', async () => {
    const utilisateur = userEvent.setup()
    monter('securite')

    await utilisateur.click(screen.getByRole('button', { name: /Reconfigurer l'appareil/ }))
    expect(screen.getByText(/n'aura plus de second facteur/)).toBeInTheDocument()
  })
})

// ── Sessions et clôture ─────────────────────────────────────────────────────

describe('B3 — appareils et clôture', () => {
  it('la session courante ne peut pas se déconnecter elle-même', async () => {
    monter('sessions')

    expect(await screen.findByText('Cet appareil')).toBeInTheDocument()
    // Un seul bouton « Déconnecter » : celui de l'AUTRE appareil.
    expect(screen.getAllByRole('button', { name: 'Déconnecter' })).toHaveLength(1)
    expect(screen.getByText(/La session courante ne se ferme pas d'ici/)).toBeInTheDocument()
  })

  it('un prérequis non rempli verrouille la clôture', async () => {
    monter('sessions', {}, [
      { key: 'consultations', label: 'Aucune consultation en cours', ok: true },
      { key: 'gains', label: '12 000 FCFA encore disponibles à retirer', ok: false },
      { key: 'reservations', label: 'Aucune réservation active en pharmacie', ok: true },
    ])

    // On attend le CRITÈRE, pas le bouton : celui-ci est déjà rendu, désactivé, pendant que la
    // vérification tourne. L'attendre lui ne prouverait rien sur ce que le serveur a répondu.
    expect(await screen.findByText(/12 000 FCFA encore disponibles/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Clôturer mon compte$/ })).toBeDisabled()
    expect(screen.getByText(/reste indisponible tant qu'une condition/)).toBeInTheDocument()
  })

  it('même prérequis remplis, il faut taper CLÔTURER pour aller au bout', async () => {
    const utilisateur = userEvent.setup()
    const cloturer = vi.spyOn(api, 'closeAccount').mockResolvedValue(undefined)
    vi.spyOn(api, 'requestCloseOtp').mockResolvedValue({ channel: 'email', hint: 'ang***@exemple.cg' })
    monter('sessions')

    await utilisateur.click(await screen.findByRole('button', { name: /^Clôturer mon compte$/ }))
    const boite = await screen.findByRole('dialog')

    await utilisateur.type(within(boite).getByLabelText('Mot de passe'), 'motdepasse1')
    await utilisateur.type(within(boite).getByLabelText('Code reçu'), '123456')
    const definitif = within(boite).getByRole('button', { name: /Clôturer définitivement/ })
    expect(definitif).toBeDisabled()

    // Un mot approchant ne passe pas : c'est tout l'intérêt de la saisie.
    await utilisateur.type(within(boite).getByLabelText(/Saisissez CLÔTURER/), 'CLOTURER')
    expect(definitif).toBeDisabled()
    expect(cloturer).not.toHaveBeenCalled()

    await utilisateur.clear(within(boite).getByLabelText(/Saisissez CLÔTURER/))
    await utilisateur.type(within(boite).getByLabelText(/Saisissez CLÔTURER/), 'CLÔTURER')
    await waitFor(() => expect(definitif).toBeEnabled())
  })
})

// ── Préférences ─────────────────────────────────────────────────────────────

describe('B3 — préférences', () => {
  it('les alertes vitales ne se coupent pas (RM-14-02)', async () => {
    monter('preferences')

    const vitales = await screen.findByRole('switch', { name: 'Alertes vitales' })
    expect(vitales).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Consultations' })).toBeEnabled()
  })

  it('l’écran dit où vit chaque réglage — l’appareil ou le compte', async () => {
    monter('preferences')

    // La maquette promettait que TOUT suivait le compte. C'est faux pour le thème, la page d'accueil
    // et les sons : rien ne les stocke côté serveur, et un poste d'officine est partagé.
    expect(screen.getByText(/restent sur cet appareil/)).toBeInTheDocument()
    expect(await screen.findByText(/suivent votre compte/)).toBeInTheDocument()
  })
})

describe('B3 — les mentions légales', () => {
  /**
   * Ce texte est accepté à l'inscription : il vaut PREUVE sous la loi n° 29-2019. Il affirmait un
   * hébergement au Congo-Brazzaville alors que `render.yaml` déclare `region: frankfurt` et que la
   * base Neon vit en `eu-central-1`. Une preuve qui affirme un fait faux ne protège personne.
   */
  it('dit où les données sont RÉELLEMENT hébergées', async () => {
    monter('legal')

    const texte = document.body.textContent ?? ''
    expect(texte).toContain('Francfort')
    expect(texte).not.toContain('hébergées au Congo-Brazzaville')
    // Le chiffrement, lui, était vrai et le reste : AES-256-GCM au repos, HTTPS en transit.
    expect(texte).toContain('chiffrées au repos comme en transit')
  })
})
