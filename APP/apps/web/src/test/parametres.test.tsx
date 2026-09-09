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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsPage } from '@/modules/settings/pages/SettingsPage'
import { useSessionStore } from '@/state/session.store'
import { api, ApiError, type MeResponse } from '@/lib/api'
import { usePreferencesStore } from '@/state/preferences.store'
import { useThemeStore, watchSystemTheme } from '@/state/theme.store'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

type LignePref = { category: string; label: string; help: string; enabled: boolean; adjustable: boolean }

function monter(
  section: string,
  moi: Partial<MeResponse> = {},
  prerequis = PREREQUIS_OK,
  /** Les préférences servies. Passées ici et non doublées après coup : la requête part au montage. */
  preferences?: LignePref[],
  /* Le filet de refonte a besoin d'éprouver l'état de PANNE : la liste des appareils illisible
     interdit toute déconnexion à distance, et l'écran doit le dire. */
  options: { sessionsEnPanne?: boolean } = {},
) {
  if (options.sessionsEnPanne) vi.spyOn(api, 'sessions').mockRejectedValue(new Error('réseau'))
  else vi.spyOn(api, 'sessions').mockResolvedValue([
    { id: 's1', client: 'web', deviceLabel: 'Chrome · Windows', lastActiveAt: new Date().toISOString(), current: true },
    { id: 's2', client: 'mobile', deviceLabel: 'Tecno Camon', lastActiveAt: new Date(Date.now() - 3600e3).toISOString(), current: false },
  ])
  vi.spyOn(api, 'closePrerequisites').mockResolvedValue(prerequis)
  vi.spyOn(api, 'myConsents').mockResolvedValue([
    { documentType: 'CGU', documentVersion: '1.0', acceptedAt: '2026-03-12T10:00:00.000Z' },
    { documentType: 'PRIVACY', documentVersion: '1.0', acceptedAt: '2026-03-12T10:00:00.000Z' },
  ])
  /*
    Les textes viennent du SERVEUR depuis le chantier 62 (07/09/2026), et non plus d'un tableau écrit
    dans le composant : c'est ce qui rend vraie la version enregistrée en preuve. On sert donc ici
    ce que sert `GET /v1/legal/documents` — la doublure dit ce que dit le serveur.
  */
  vi.spyOn(api, 'legalDocuments').mockResolvedValue({
    documents: [
      {
        type: 'CGU',
        version: '1.0',
        title: "Conditions générales d'utilisation",
        paragraphs: ['ULAMU met en relation des patients et des professionnels de santé vérifiés au Congo-Brazzaville.'],
      },
      {
        type: 'PRIVACY',
        version: '1.0',
        title: 'Politique de confidentialité',
        paragraphs: [
          'Les données de santé sont traitées conformément à la loi n° 29-2019 sur la protection des données à caractère personnel. Elles sont chiffrées au repos comme en transit, et hébergées sur des serveurs situés en Allemagne (Francfort, Union européenne).',
        ],
      },
    ],
  })
  /*
    Ce que le serveur sert RÉELLEMENT depuis la dette n°18 (03/09/2026) : quatre catégories, chacune
    avec son intitulé et son aide. « Rappels » n'y est plus — aucun modèle ne l'a jamais portée, et
    c'est désormais COMPTÉ côté serveur plutôt que retiré à la main dans chaque écran.
  */
  vi.spyOn(api, 'notificationPreferences').mockResolvedValue({
    preferences: (preferences ?? [
      { category: 'care', label: 'Consultations et soins', help: 'Demandes reçues, séances qui démarrent', enabled: true, adjustable: true },
      { category: 'money', label: 'Paiements et gains', help: 'Encaissements, retraits, remboursements', enabled: true, adjustable: true },
      { category: 'system', label: 'Service et compte', help: 'Maintenances, changements de conditions', enabled: true, adjustable: true },
      { category: 'critical', label: 'Alertes vitales', help: 'Toujours actives', enabled: true, adjustable: false },
    ]) as never,
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
    expect(screen.getByRole('switch', { name: 'Consultations et soins' })).toBeEnabled()
  })

  /*
    Dette n°18, soldée le 03/09/2026. Cet écran portait sa propre liste d'intitulés, le mobile la
    sienne, et **les deux avaient déjà divergé** — « Consultations » ici, « Consultations & soins »
    là-bas. L'écran n'écrit donc plus aucun de ces mots : il affiche ce que le serveur envoie.

    Le test le prouve en servant des intitulés que l'application n'a jamais connus : s'ils
    s'affichent, c'est qu'ils ne sont écrits nulle part dans le web.
  */
  it('affiche les intitulés SERVIS, sans en écrire aucun', async () => {
    monter('preferences', {}, PREREQUIS_OK, [
      { category: 'care', label: 'Libellé venu du serveur', help: 'Aide venue du serveur', enabled: true, adjustable: true },
    ])

    expect(await screen.findByRole('switch', { name: 'Libellé venu du serveur' })).toBeInTheDocument()
    expect(screen.getByText('Aide venue du serveur')).toBeInTheDocument()
  })

  /*
    Le pendant : ce que le serveur ne sert pas ne s'affiche pas. « Rappels » figurait en dur dans
    le mobile alors qu'aucune notification ne porte cette catégorie — un interrupteur qui ne coupe
    rien, et à qui l'on fait confiance.
  */
  it('n’affiche aucune catégorie que le serveur n’a pas servie', async () => {
    monter('preferences')

    await screen.findByRole('switch', { name: 'Alertes vitales' })
    expect(screen.queryByRole('switch', { name: /Rappels/ })).not.toBeInTheDocument()
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
    /*
      Le texte vient du SERVEUR depuis le chantier 62 : on attend qu'il arrive. Attendre « Allemagne »
      ne suffirait pas — le mot figure aussi dans la ligne statique « Hébergement des données », et
      l'attente se résoudrait sans que le document soit là.
    */
    await screen.findByText(/chiffrées au repos comme en transit/)

    const texte = document.body.textContent ?? ''
    expect(texte).toContain('Francfort')
    expect(texte).not.toContain('hébergées au Congo-Brazzaville')
    // Le chiffrement, lui, était vrai et le reste : AES-256-GCM au repos, HTTPS en transit.
    expect(texte).toContain('chiffrées au repos comme en transit')
  })
})

describe('B3 — la preuve de consentement', () => {
  /**
   * `ConsentRecord` est rempli depuis toujours et aucun endpoint ne le relisait : l'écran affichait
   * les textes sans pouvoir dire à quelle version on avait consenti (corrigé le 24/08/2026). Une
   * preuve légale qu'on ne peut pas produire ne prouve rien.
   */
  it('affiche la version ET la date, lues en base', async () => {
    monter('legal')
    expect(await screen.findAllByText(/Version 1.0 · acceptée le 12 mars 2026/)).toHaveLength(2)
  })
})

/**
 * La densité, ajoutée le 01/09.
 *
 * Ce qui est verrouillé n'est pas le réglage, c'est sa CONDITION D'EXISTENCE : il ne figure ici que
 * parce qu'il fait réellement quelque chose. Le sélecteur de langue de la maquette a été retiré pour
 * la raison inverse — aucune traduction derrière. Un interrupteur qui ne change rien est pire qu'un
 * interrupteur absent, parce qu'on lui fait confiance.
 */
describe('B3 — la densité d’affichage', () => {
  beforeEach(() => {
    // Le magasin est global : sans remise à zéro, un test hérite du choix du précédent.
    usePreferencesStore.setState({ densite: 'confort' })
    document.documentElement.removeAttribute('data-densite')
  })

  it('pose réellement l’attribut que la feuille de style attend', async () => {
    const utilisateur = userEvent.setup()
    monter('preferences')

    await utilisateur.click(await screen.findByRole('button', { name: 'Compact' }))

    // C'est CET attribut que `globals.css` cible pour resserrer tableaux et listes.
    expect(document.documentElement.getAttribute('data-densite')).toBe('compact')
  })

  it('revient au confort, et le dit à la feuille de style aussi', async () => {
    const utilisateur = userEvent.setup()
    monter('preferences')

    await utilisateur.click(await screen.findByRole('button', { name: 'Compact' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Confort' }))

    expect(document.documentElement.getAttribute('data-densite')).toBe('confort')
  })

  it('annonce ce qu’il fait, sans promettre plus', async () => {
    monter('preferences')

    // « Rapproche les lignes des tableaux et des listes » — et rien d'autre : ni taille de texte,
    // ni marges de page, que la règle CSS ne touche pas.
    expect(await screen.findByText(/rapproche les lignes des tableaux et des listes/)).toBeInTheDocument()
  })

  it('vit sur l’appareil, comme le thème — et l’écran ne prétend pas l’inverse', async () => {
    monter('preferences')

    const bloc = (await screen.findByText('Densité')).closest('section') as HTMLElement
    expect(within(bloc).getByText(/restent sur cet appareil/)).toBeInTheDocument()
  })
})

/**
 * Le thème « Automatique », et ce qu'il promettait sans le tenir (01/09/2026).
 *
 * `system` est le DÉFAUT du magasin de thème : tant que l'utilisateur n'a pas tranché, ULAMU suit
 * son système. `watchSystemTheme` existait pour cela depuis la création du magasin, et sa
 * documentation annonçait « appelé une fois au démarrage » — mais **aucun fichier ne l'appelait**.
 * Le thème n'était donc lu qu'au chargement de la page : sur un poste réglé pour basculer en sombre
 * le soir, ULAMU restait clair jusqu'au prochain rechargement.
 *
 * Constaté pendant la relecture visuelle du chantier 18, en changeant la préférence système du
 * navigateur : `matchMedia` répondait « sombre », la classe `dark` n'arrivait jamais.
 */
describe('B3 — le thème « Automatique » suit vraiment le système', () => {
  /** Un faux `matchMedia` dont on peut déclencher le changement à la main. */
  function fausseMedia(sombreAuDepart: boolean) {
    const auditeurs: Array<() => void> = []
    let sombre = sombreAuDepart
    window.matchMedia = ((requete: string) => ({
      get matches() {
        return sombre
      },
      media: requete,
      onchange: null,
      addEventListener: (_: string, f: () => void) => auditeurs.push(f),
      removeEventListener: (_: string, f: () => void) => {
        const i = auditeurs.indexOf(f)
        if (i >= 0) auditeurs.splice(i, 1)
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    return {
      basculer(v: boolean) {
        sombre = v
        auditeurs.forEach((f) => f())
      },
      get nbAuditeurs() {
        return auditeurs.length
      },
    }
  }

  beforeEach(() => {
    useThemeStore.setState({ choice: 'system' })
    document.documentElement.classList.remove('dark')
  })

  it('bascule en sombre quand le système bascule, sans recharger la page', () => {
    const media = fausseMedia(false)
    const arreter = watchSystemTheme()

    media.basculer(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    media.basculer(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    arreter()
  })

  it('ne touche à rien quand l’utilisateur a tranché lui-même', () => {
    const media = fausseMedia(false)
    useThemeStore.setState({ choice: 'light' })
    const arreter = watchSystemTheme()

    media.basculer(true)
    // Un choix explicite l'emporte : suivre le système ici reviendrait à défaire son réglage.
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    arreter()
  })

  it('se désabonne quand on l’arrête — sinon chaque montage empilerait un auditeur', () => {
    const media = fausseMedia(false)
    const arreter = watchSystemTheme()
    expect(media.nbAuditeurs).toBe(1)

    arreter()
    expect(media.nbAuditeurs).toBe(0)
  })

  /*
    Les trois tests ci-dessus prouvent que la fonction MARCHE. Elle marchait déjà. Ce qui manquait,
    c'est que quelqu'un l'appelle : le défaut était une absence, invisible à tout test de composant.
    On lit donc la racine, comme `charte.test.tsx` lit la feuille de style.
  */
  it('la racine l’appelle vraiment — c’est l’appel qui manquait, pas la fonction', () => {
    const source = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')

    expect(source).toContain('watchSystemTheme')
    expect(source).toMatch(/useEffect\(\s*\(\)\s*=>\s*watchSystemTheme\(\)/)
  })
})

/**
 * Le bloc « À propos ». La maquette y écrit un identifiant `USR-2026-00312` qui n'existe pas, et
 * elle ne distingue nulle part le pays DESSERVI du pays d'HÉBERGEMENT — c'est ce raccourci qui a
 * produit la phrase fausse corrigée le 24/08.
 */
describe('B3 — à propos du compte', () => {
  it('distingue le pays desservi du pays où vivent les données', async () => {
    monter('legal')

    expect(await screen.findByText('Pays de service')).toBeInTheDocument()
    expect(screen.getByText('Hébergement des données')).toBeInTheDocument()
    expect(screen.getByText('Francfort, Allemagne')).toBeInTheDocument()
  })

  it('affiche un identifiant RÉEL, pas un format inventé', async () => {
    monter('legal')

    // La maquette écrit « USR-2026-00312 ». Les identifiants sont des UUID : on en montre le début,
    // qui suffit à retrouver un compte auprès de l'administration.
    expect(await screen.findByText('Identifiant du compte')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/USR-\d{4}-\d+/)
  })
})

// ── Ce que B3 dit de la double authentification (chantiers 24 puis 31, 02/09/2026) ─────────────

/*
  L'écran a dit trois choses successives, et l'histoire compte parce qu'elle explique la forme de
  ces tests.

  1. Il annonçait à TOUT LE MONDE « Obligatoire sur ULAMU — elle ne peut pas être désactivée ».
     Vrai pour un administrateur (`disableTotp` répondait 403), faux pour un soignant.
  2. Le chantier 24 a coupé la phrase en deux, une par type de compte.
  3. **Le chantier 31 supprime la distinction : décision du porteur (D-053), le TOTP est optionnel
     pour TOUS les types de compte, désactivé par défaut, activable et désactivable à volonté.**
     Les deux gardes serveur sont retirées.

  On verrouille donc le FAIT — plus aucune obligation annoncée à personne, et un chemin de
  désactivation réellement offert — et non une tournure. C'est la leçon du chantier 16, où un test
  qui interdisait des mots avait fini par interdire l'explication qui les employait.
*/
describe('B3 — la double authentification n’est imposée à personne (D-053)', () => {
  it('un administrateur ne lit plus aucune obligation', async () => {
    monter('securite', { accountType: 'ADMIN', adminRole: 'SUPER_ADMIN' })

    expect(await screen.findByText(/Fortement recommandée/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Obligatoire/i)
  })

  it('un soignant lit la même phrase — la distinction par rôle a disparu', async () => {
    monter('securite')

    expect(await screen.findByText(/Fortement recommandée/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Obligatoire sur ULAMU/)
  })

  /*
    Le fond de la décision : le chemin doit EXISTER, pas seulement la phrase. La route
    `POST /accounts/me/totp/disable` vivait au serveur depuis toujours sans qu'aucun écran ne
    l'appelle — une permission qu'on ne peut pas exercer n'en est pas une.
  */
  it('offre réellement de désactiver, à qui l’a activée', async () => {
    monter('securite', { totpEnabled: true })

    expect(await screen.findByRole('button', { name: /^Désactiver$/ })).toBeInTheDocument()
  })

  it('ne propose pas de désactiver ce qui n’est pas activé', async () => {
    monter('securite', { totpEnabled: false })

    await screen.findByText(/Fortement recommandée/i)
    expect(screen.queryByRole('button', { name: /Reconfigurer/ })).toBeNull()
  })
})

/*
  ── La 2FA par email, injoignable depuis le web jusqu'au chantier 31 ─────────────────────────

  Trois routes existaient au serveur, aucune n'était déclarée dans le client. Le réglage était donc
  absent de cet écran — et la connexion web ne savait pas davantage reconnaître ce facteur, ce qui
  enfermait dehors, en silence, tout compte l'ayant activé depuis le mobile.
*/
describe('B3 — la 2FA par email est enfin réglable', () => {
  it('propose de l’activer quand le compte a une adresse', async () => {
    monter('securite', { emailTwoFactorEnabled: false, email: 'dr@exemple.cg' })

    expect(await screen.findByText(/Code par email à la connexion/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Activer$/ })).toBeEnabled()
  })

  /*
    Un bouton inerte sans explication ressemble à une panne. Sans adresse au compte, le réglage ne
    peut rien faire : l'écran dit pourquoi et où l'ajouter.
  */
  it('explique pourquoi elle est hors d’atteinte sans adresse', async () => {
    monter('securite', { emailTwoFactorEnabled: false, email: null })

    expect(await screen.findByText(/demande une adresse email au compte/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Activer$/ })).toBeDisabled()
  })

  it('propose de la désactiver quand elle est active', async () => {
    monter('securite', { emailTwoFactorEnabled: true, email: 'dr@exemple.cg' })

    await screen.findByText(/Code par email à la connexion/i)
    expect(screen.getAllByRole('button', { name: /^Désactiver$/ }).length).toBeGreaterThan(0)
  })
})

describe('B3 — le numéro de téléphone (chantier 67)', () => {
  /*
    ⚠️ `startPhoneChange` et `confirmPhoneChange` étaient déclarés côté client et AUCUN écran ne les
    appelait : le web n'offrait aucun moyen de changer de numéro. On pouvait croire à un choix — le
    patient le fait depuis l'application mobile.

    Sauf que le RETRAIT D'ARGENT part sur le numéro DU COMPTE (`phone: actorAccount.phone`). Un
    soignant qui change de ligne sans pouvoir le mettre à jour verrait ses gains virés vers un numéro
    qu'il ne contrôle plus — ou vers la personne à qui l'opérateur l'a réattribué. Et le soignant n'a
    pas d'application mobile : le web est son seul écran.

    Ce n'était pas un choix, c'était un trou, et il touchait l'argent.
  */
  it('affiche le numéro du compte et dit que les retraits y partent', async () => {
    monter('securite')

    expect(await screen.findByText(BASE_MOI.phone)).toBeInTheDocument()
    // La conséquence, dite là où l'on change le numéro — le seul endroit où elle sert.
    expect(screen.getByText(/Vos gains sont virés sur ce numéro/)).toBeInTheDocument()
  })

  it('demande les deux codes, et dit pourquoi avant de les envoyer', async () => {
    const utilisateur = userEvent.setup()
    const demarrer = vi.spyOn(api, 'startPhoneChange').mockResolvedValue({ expiresInSeconds: 300 })
    monter('securite')

    // La règle est annoncée AVANT le premier code, pas découverte après.
    expect(await screen.findByText(/Les deux codes\s+sont exigés/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Nouveau numéro/i), { target: { value: '+242060000001' } })
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer les codes/i }))

    expect(demarrer).toHaveBeenCalledWith({ newPhone: '+242060000001' })
  })

  it('confirme avec le code de l’ancien ET celui du nouveau numéro', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startPhoneChange').mockResolvedValue({ expiresInSeconds: 300 })
    const confirmer = vi.spyOn(api, 'confirmPhoneChange').mockResolvedValue({ ...BASE_MOI, phone: '+242060000001' })
    vi.spyOn(api, 'me').mockResolvedValue({ ...BASE_MOI, phone: '+242060000001' })
    monter('securite')

    fireEvent.change(await screen.findByLabelText(/Nouveau numéro/i), { target: { value: '+242060000001' } })
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer les codes/i }))

    fireEvent.change(await screen.findByLabelText(/Code reçu sur l'ancien numéro/i), { target: { value: '111111' } })
    fireEvent.change(screen.getByLabelText(/Code reçu sur le nouveau/i), { target: { value: '222222' } })
    await utilisateur.click(screen.getByRole('button', { name: /Confirmer le changement/i }))

    expect(confirmer).toHaveBeenCalledWith({
      newPhone: '+242060000001',
      oldPhoneCode: '111111',
      newPhoneCode: '222222',
    })
  })

  it('n’envoie rien tant qu’il manque un des deux codes', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startPhoneChange').mockResolvedValue({ expiresInSeconds: 300 })
    const confirmer = vi.spyOn(api, 'confirmPhoneChange')
    monter('securite')

    fireEvent.change(await screen.findByLabelText(/Nouveau numéro/i), { target: { value: '+242060000001' } })
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer les codes/i }))
    fireEvent.change(await screen.findByLabelText(/Code reçu sur l'ancien numéro/i), { target: { value: '111111' } })

    expect(screen.getByRole('button', { name: /Confirmer le changement/i })).toBeDisabled()
    expect(confirmer).not.toHaveBeenCalled()
  })

  it('affiche le refus du serveur tel quel', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'startPhoneChange').mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'Ce numéro est déjà enregistré sur un autre compte'),
    )
    monter('securite')

    fireEvent.change(await screen.findByLabelText(/Nouveau numéro/i), { target: { value: '+242060000001' } })
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer les codes/i }))

    expect(await screen.findByText(/déjà enregistré sur un autre compte/)).toBeInTheDocument()
  })
})

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — les phrases que ces réglages ne doivent pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════

  ⚠️ Ces phrases disent ce qu'on perd en cliquant : des codes qu'on ne reverra plus, une clôture
  qu'on n'annule pas, une protection qu'on retire. Sur un écran de sécurité, une phrase manquante
  n'est pas une gêne — c'est quelqu'un qui découvre trop tard.
*/
describe('B3 — filet de refonte : ce qu’un réglage de sécurité coûte', () => {
  /*
    Les codes de secours ne sont montrés QU'UNE FOIS. Perdre cette phrase, c'est quelqu'un qui ferme
    la fenêtre en pensant les retrouver — et qui se retrouve enfermé dehors le jour où il perd son
    téléphone.
  */
  it('dit que les codes de secours ne seront plus jamais affichés', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'regenerateBackupCodes').mockResolvedValue({ backupCodes: ['aaaa-1111', 'bbbb-2222'] })
    monter('securite', { totpEnabled: true })

    await utilisateur.click(await screen.findByRole('button', { name: /Régénérer les codes/i }))
    /*
      Les champs sont désignés par leur identifiant : « Mot de passe » apparaît aussi dans le bloc
      voisin de changement de mot de passe, et un `getByLabelText` nu trouverait les deux.
    */
    fireEvent.change(document.getElementById('preuve-mdp') as HTMLElement, { target: { value: 'motdepasse1' } })
    fireEvent.change(document.getElementById('preuve-code') as HTMLElement, { target: { value: '123456' } })
    await utilisateur.click(screen.getByRole('button', { name: /^Régénérer$/i }))

    expect(await screen.findByText(/ils ne seront plus jamais affichés/)).toBeInTheDocument()
  })

  /*
    Désactiver la double authentification DÉTRUIT les codes de secours. Ce n'est pas un détail : on
    croit rendre la connexion plus simple, on supprime aussi le seul secours qui restait.
  */
  it('dit que désactiver la 2FA détruit les codes de secours', async () => {
    const utilisateur = userEvent.setup()
    monter('securite', { totpEnabled: true })
    // L'avertissement vit dans le formulaire de désactivation : c'est là qu'on décide.
    await utilisateur.click(await screen.findByRole('button', { name: /^Désactiver$/i }))

    expect(await screen.findByText(/vos codes de secours seront détruits/)).toBeInTheDocument()
  })

  /*
    Une clôture de compte ne s'annule pas. C'est la seule action de la plateforme dont on ne revient
    jamais, et cette phrase est le dernier endroit où l'on peut encore s'arrêter.
  */
  it('dit qu’une clôture de compte ne peut pas être annulée', async () => {
    const utilisateur = userEvent.setup()
    monter('sessions')

    await utilisateur.click(await screen.findByRole('button', { name: /Clôturer mon compte/i }))
    expect(await screen.findByText(/Cette action ne peut pas être annulée/)).toBeInTheDocument()
  })

  /*
    Quand la liste des appareils n'a pas pu être lue, on ne PEUT PAS déconnecter à distance. Le dire
    évite de croire une session révoquée alors que rien n'a bougé — sur un poste partagé, c'est la
    différence entre être protégé et croire l'être.
  */
  it('dit qu’une liste d’appareils non chargée interdit toute déconnexion à distance', async () => {
    monter('sessions', {}, PREREQUIS_OK, undefined, { sessionsEnPanne: true })

    expect(await screen.findByText(/Aucune déconnexion à distance n'est possible/)).toBeInTheDocument()
  })
})
