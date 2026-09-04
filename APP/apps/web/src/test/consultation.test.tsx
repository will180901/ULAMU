/**
 * C5 « Consultation » — la séance chronométrée.
 *
 * Trois choses coûteraient cher ici, et ce sont elles qui sont verrouillées :
 *
 *  1. **Écrire un délai de dépôt dans la page.** La maquette annonçait 48 h là où PM-30 en vaut 24 :
 *     un médecin qui croit disposer du double voit ses gains gelés à la 24ᵉ heure. Corriger le chiffre
 *     ne suffisait pas — « 24 heures » en dur mentirait au premier changement de PM-30 dans E3. Ce
 *     qui est verrouillé ici, c'est donc l'absence de TOUT délai écrit : l'écran décompte
 *     `reportDueAt`, servi par le serveur, et rien d'autre.
 *  2. **Laisser le professionnel clore la séance.** `cancel` est réservé au patient (EF-06-10). Le
 *     patient a payé N minutes : les lui couper serait lui reprendre ce qu'il a acheté.
 *  3. **Écrire dans une séance qui n'est plus active.** RM-06-03 : « aucun message hors d'une
 *     session active ». Le composeur ne doit pas exister ailleurs qu'en `ACTIVE`.
 *
 * Le décompteur, lui, vient du SERVEUR (RM-06-02) : les tests vérifient qu'on affiche la valeur
 * reçue, jamais un calcul fait sur l'horloge du poste.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConsultationPage } from '@/modules/consultation/pages/ConsultationPage'
import { useSessionStore } from '@/state/session.store'
import { api, type CareSession, type CareSessionStatus, type MeResponse, type SessionMessage } from '@/lib/api'

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

function seance(over: Partial<CareSession> = {}): CareSession {
  return {
    id: 's1',
    handshakeId: 'h1',
    status: 'ACTIVE' as CareSessionStatus,
    patientAccountId: 'pat-1',
    professionalId: 'pro-1',
    subProfileId: null,
    durationMin: 30,
    paidAt: '2026-08-24T08:00:00.000Z',
    startedAt: '2026-08-24T08:02:00.000Z',
    endsAt: '2026-08-24T08:32:00.000Z',
    endedAt: null,
    remainingSeconds: 900,
    autoStartAt: null,
    extensionTotalSec: 0,
    professionalDelaySec: 0,
    reportDepositedAt: null,
    // Échéance servie par le serveur depuis le 28/08 (`endedAt` + PM-30) : l'écran décompte
    // au lieu d'écrire « 24 heures » en dur. `null` par défaut — chaque test la pose s'il en a besoin.
    reportDueAt: null,
    preConsultation: {
      symptoms: 'Palpitations nocturnes depuis trois nuits.',
      sinceWhen: '3 jours',
      attachments: [],
      submittedAt: '2026-08-24T08:01:00.000Z',
    },
    rated: false,
    otherPartyTyping: false,
    ...over,
  }
}

function message(over: Partial<SessionMessage> = {}): SessionMessage {
  return {
    id: 'm1',
    sessionId: 's1',
    senderId: 'pat-1',
    kind: 'TEXT',
    body: 'Bonjour docteur',
    fileKey: null,
    mediaKeys: [],
    clientMsgId: 'c1',
    createdAt: '2026-08-24T08:03:00.000Z',
    editedAt: null,
    deletedAt: null,
    replyTo: null,
    status: null,
    reactions: [],
    ...over,
  }
}

async function monter(s: CareSession, items: SessionMessage[] = []) {
  vi.spyOn(api, 'session').mockResolvedValue(s)
  vi.spyOn(api, 'sessionMessages').mockResolvedValue({ items, nextCursor: null })
  // Le Carnet est lu dès que la séance est active (EF-06-06). Sans ces deux doublures, chaque test
  // partirait pour de vrai sur le réseau.
  //
  // `vi.spyOn` sur une méthode DÉJÀ doublée en écraserait la réponse : un test qui pose son propre
  // Carnet avant d'appeler `monter` se retrouverait avec un Carnet vide. D'où la garde.
  if (!vi.isMockFunction(api.sessionRecordSummary)) {
    vi.spyOn(api, 'sessionRecordSummary').mockResolvedValue({ bloodType: null, activeAllergies: [], chronicDiseases: [] })
  }
  if (!vi.isMockFunction(api.sessionRecord)) {
    vi.spyOn(api, 'sessionRecord').mockResolvedValue({ recordId: null, items: [], nextCursor: null })
  }
  // Le rail porte aussi le panneau d'ordonnance (C7) depuis le 28/08, qui lit les ordonnances déjà
  // prescrites. Sans cette doublure, chaque test de C5 partait pour de vrai sur le réseau et
  // s'arrêtait sur l'épuisement de son propre délai — avec un message qui accusait le menu du fil.
  if (!vi.isMockFunction(api.myPrescribed)) {
    vi.spyOn(api, 'myPrescribed').mockResolvedValue({ items: [] })
  }
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/consultations/s1']}>
        <Routes>
          <Route path="/consultations/:sessionId" element={<ConsultationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Consultation' })
}

const fil = () => within(screen.getByRole('region', { name: 'Fil de la consultation' }))

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  // Radix pose `pointer-events: none` et `data-scroll-locked` sur le <body> tant qu'un menu ou un
  // panneau est ouvert, et les LAISSE en place si le composant est démonté dans cet état. Le test
  // suivant ne peut alors plus cliquer nulle part — `userEvent` respecte `pointer-events`. Symptôme
  // trompeur : un test qui passe seul et échoue dans la suite complète, sur un élément bien présent.
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('C5 — le compte-rendu', () => {
  /** Une séance close, dont l'échéance de dépôt tombe dans `heures` heures. */
  const close = (heures: number) =>
    seance({
      status: 'ENDED' as CareSessionStatus,
      endedAt: '2026-08-24T08:32:00.000Z',
      remainingSeconds: 0,
      // +90 s : sans cette marge, le calcul retomberait sur « 2 h 59 min » au moindre délai de rendu.
      reportDueAt: new Date(Date.now() + heures * 3_600_000 + 90_000).toISOString(),
    })

  it("n'écrit aucun délai : il décompte l'échéance servie par le serveur", async () => {
    await monter(close(3))

    expect(await screen.findByText(/3 h \d\d min pour déposer/)).toBeInTheDocument()
    // Ni le chiffre de la maquette, ni celui qui le « corrigeait » : aucun des deux n'a sa place.
    expect(document.body.textContent).not.toContain('48 heures')
    expect(document.body.textContent).not.toContain('24 heures')
  })

  it("suit PM-30 si le super-administrateur le change dans E3", async () => {
    await monter(close(6))

    // Même écran, même code, autre échéance : c'est le serveur qui décide, pas ce fichier.
    expect(await screen.findByText(/6 h \d\d min pour déposer/)).toBeInTheDocument()
  })

  it("tant que la séance dure, aucun décompte : le délai ne court qu'à la clôture", async () => {
    await monter(seance({ reportDueAt: null }))

    await screen.findByRole('button', { name: /Déposer le compte-rendu/ })
    expect(document.body.textContent).not.toContain('pour déposer')
  })

  /**
   * Le point le plus coûteux du bloc. L'échéance est comparée à l'horloge du POSTE, qui peut être
   * fausse — sur un ordinateur partagé de CSI, de plusieurs heures. Si l'écran désactivait le bouton
   * sur ce calcul, une machine en avance ferait perdre des honoraires bien réels. C'est le serveur
   * qui refuse (409), et lui seul.
   */
  it("dépassé, il avertit mais ne bloque JAMAIS le dépôt : le serveur tranche", async () => {
    const utilisateur = userEvent.setup()
    await monter(close(-2))

    expect(await screen.findByText(/délai de dépôt est dépassé/)).toBeInTheDocument()
    await utilisateur.type(screen.getByLabelText('Diagnostic'), 'Tachycardie bénigne')
    await utilisateur.type(screen.getByLabelText('Recommandations'), 'Repos')
    await waitFor(() => expect(screen.getByRole('button', { name: /Déposer le compte-rendu/ })).toBeEnabled())
  })

  it('reste impossible à déposer tant qu’un des deux champs est vide (D-021)', async () => {
    const utilisateur = userEvent.setup()
    const deposer = vi.spyOn(api, 'depositReport').mockResolvedValue(seance())
    await monter(seance())

    const bouton = await screen.findByRole('button', { name: /Déposer le compte-rendu/ })
    expect(bouton).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Diagnostic'), 'Tachycardie bénigne')
    expect(screen.getByRole('button', { name: /Déposer le compte-rendu/ })).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Recommandations'), 'Repos, contrôle dans 15 jours')
    await waitFor(() => expect(screen.getByRole('button', { name: /Déposer le compte-rendu/ })).toBeEnabled())
    expect(deposer).not.toHaveBeenCalled()
  })

  it('conserve le brouillon : une fermeture d’onglet ne coûte pas vingt minutes de texte', async () => {
    const utilisateur = userEvent.setup()
    await monter(seance())
    await utilisateur.type(await screen.findByLabelText('Diagnostic'), 'Tachycardie')

    await waitFor(() => expect(localStorage.getItem('ulamu-compte-rendu-s1')).toContain('Tachycardie'))
  })

  it('déposé, il annonce que les gains sont crédités (RM-06-04)', async () => {
    await monter(seance({ status: 'ENDED', reportDepositedAt: '2026-08-24T09:00:00.000Z' }))
    expect(await screen.findByText(/vos gains sont crédités/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Déposer le compte-rendu/ })).not.toBeInTheDocument()
  })
})

describe('C5 — ce que le professionnel ne peut pas faire', () => {
  it('aucun bouton pour terminer la séance : seul le patient annule (EF-06-10)', async () => {
    await monter(seance())
    await screen.findByRole('heading', { name: 'Consultation' })

    expect(screen.queryByRole('button', { name: /Terminer/ })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Terminer la consultation')
  })

  it('aucun composeur hors d’une séance active (RM-06-03)', async () => {
    await monter(seance({ status: 'ENDED', endedAt: '2026-08-24T08:32:00.000Z', remainingSeconds: 0 }))
    await screen.findByRole('heading', { name: 'Consultation' })

    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument()
    // Mais le fil reste lisible : une consultation close s'archive, elle ne disparaît pas.
    expect(fil().getByText(/l'échange est clos/i)).toBeInTheDocument()
  })

  it('la prolongation disparaît une fois le plafond de 30 minutes atteint (PM-29)', async () => {
    await monter(seance({ extensionTotalSec: 1800 }))
    await screen.findByRole('heading', { name: 'Consultation' })
    expect(screen.queryByRole('button', { name: /Prolonger/ })).not.toBeInTheDocument()
  })

  it('la prolongation est offerte tant que le plafond n’est pas atteint (EF-06-07)', async () => {
    const utilisateur = userEvent.setup()
    const prolonger = vi.spyOn(api, 'extendSession').mockResolvedValue(seance({ extensionTotalSec: 600 }))
    await monter(seance({ extensionTotalSec: 600 }))

    await utilisateur.click(await screen.findByRole('button', { name: /Prolonger de 10 minutes/ }))
    await waitFor(() => expect(prolonger).toHaveBeenCalledWith('s1', 10))
    // Gratuite pour le patient : c'est le sens de « à la seule initiative du professionnel ».
    expect(screen.getByText(/Gratuit pour le patient/)).toBeInTheDocument()
  })
})

describe('C5 — le fil', () => {
  it('distingue mes messages de ceux du patient', async () => {
    await monter(seance(), [
      message({ id: 'a', senderId: 'pat-1', body: 'Bonjour docteur' }),
      message({ id: 'b', senderId: 'pro-1', body: 'Bonjour, je vous écoute', status: 'read' }),
    ])

    expect(await fil().findByText('Bonjour docteur')).toBeInTheDocument()
    expect(fil().getByText('Bonjour, je vous écoute')).toBeInTheDocument()
    // L'accusé n'existe que sur MES messages (contrat M06).
    expect(fil().getByText(/lu/)).toBeInTheDocument()
  })

  it('un message supprimé laisse une trace, il ne disparaît pas', async () => {
    await monter(seance(), [message({ deletedAt: '2026-08-24T08:05:00.000Z', body: null })])
    expect(await fil().findByText('Message supprimé')).toBeInTheDocument()
  })

  it('un message modifié le dit', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', editedAt: '2026-08-24T08:06:00.000Z' })])
    expect(await fil().findByText(/modifié/)).toBeInTheDocument()
  })

  it('envoyer utilise une clé d’idempotence — un rejeu ne crée pas de doublon (ADR-12)', async () => {
    const utilisateur = userEvent.setup()
    const envoyer = vi.spyOn(api, 'sendMessage').mockResolvedValue(message({ senderId: 'pro-1' }))
    vi.spyOn(api, 'typing').mockResolvedValue(undefined)
    await monter(seance())

    await utilisateur.type(await screen.findByLabelText('Votre message'), 'Depuis quand ?')
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(envoyer).toHaveBeenCalled())
    const dto = envoyer.mock.calls[0]?.[1]
    expect(dto?.kind).toBe('TEXT')
    expect(dto?.body).toBe('Depuis quand ?')
    expect(dto?.clientMsgId).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('signale quand le patient écrit', async () => {
    await monter(seance({ otherPartyTyping: true }))
    expect(await fil().findByText(/Le patient écrit/)).toBeInTheDocument()
  })
})

describe('C5 — les états de la séance', () => {
  it('en préparation, le décompteur n’a pas démarré et l’écran le dit', async () => {
    await monter(seance({ status: 'PREPARING', startedAt: null, remainingSeconds: 1800 }))

    expect(await screen.findByText('En attente du patient')).toBeInTheDocument()
    expect(screen.getByText(/décompteur n'a pas encore démarré/)).toBeInTheDocument()
    // Pas de composeur : la séance n'est pas active.
    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument()
  })

  it('remboursée, l’écran annonce qu’aucun gain ne sera crédité (D-008)', async () => {
    await monter(seance({ status: 'REFUNDED' }))
    expect(await screen.findByText(/Aucun gain ne sera crédité/)).toBeInTheDocument()
    // Et le compte-rendu disparaît : il n'y a plus rien à créditer.
    expect(screen.queryByRole('button', { name: /Déposer le compte-rendu/ })).not.toBeInTheDocument()
  })

  it('affiche le temps renvoyé par le serveur (RM-06-02)', async () => {
    await monter(seance({ remainingSeconds: 900 }))
    expect(await screen.findByLabelText('Temps restant')).toHaveTextContent('15:00')
  })

  it('une panne de fil rassure : le minuteur tourne toujours côté serveur', async () => {
    vi.spyOn(api, 'session').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/consultations/s1']}>
          <Routes>
            <Route path="/consultations/:sessionId" element={<ConsultationPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Connexion au fil interrompue')).toBeInTheDocument()
    expect(screen.getByText(/continue de tourner côté serveur/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reprendre la consultation/ })).toBeInTheDocument()
  })
})

describe('C5 — le contexte patient', () => {
  it('affiche la pré-consultation, qui arrive APRÈS le paiement (EF-06-04)', async () => {
    await monter(seance())
    expect(await screen.findByText('Palpitations nocturnes depuis trois nuits.')).toBeInTheDocument()
    expect(screen.getByText('3 jours')).toBeInTheDocument()
  })

  it('dit son absence au lieu d’afficher un cadre vide', async () => {
    await monter(seance({ status: 'PREPARING', preConsultation: null }))
    expect(await screen.findByText(/n'a pas encore transmis sa pré-consultation/)).toBeInTheDocument()
  })
})

/**
 * Le fil, mis au niveau du mobile. Le serveur servait déjà tout cela (`MessageView` porte les
 * réponses citées, les réactions, l'édition et la double suppression) ; le web n'en montrait rien.
 */
describe('C5 — les gestes sur un message', () => {
  /** Un message à MOI, tout juste écrit : la fenêtre de quinze minutes est ouverte. */
  const aMoiRecent = () => message({ senderId: 'pro-1', createdAt: new Date().toISOString() })

  it('supprimer envoie `forEveryone` — sans lui le serveur refuse en 400', async () => {
    const utilisateur = userEvent.setup()
    const supprimer = vi.spyOn(api, 'deleteSessionMessage').mockResolvedValue({ ok: true })
    await monter(seance(), [aMoiRecent()])

    await utilisateur.click(await fil().findByLabelText('Autres actions sur ce message'))
    await utilisateur.click(await screen.findByText('Supprimer pour tout le monde'))

    await waitFor(() => expect(supprimer).toHaveBeenCalledWith('s1', 'm1', true))
  })

  it('retirer de mon fil ne supprime pas chez l’autre', async () => {
    const utilisateur = userEvent.setup()
    const supprimer = vi.spyOn(api, 'deleteSessionMessage').mockResolvedValue({ ok: true })
    await monter(seance(), [aMoiRecent()])

    await utilisateur.click(await fil().findByLabelText('Autres actions sur ce message'))
    await utilisateur.click(await screen.findByText('Retirer de mon fil'))

    await waitFor(() => expect(supprimer).toHaveBeenCalledWith('s1', 'm1', false))
  })

  it('répondre cite le message, et l’envoi porte `replyToId`', async () => {
    const utilisateur = userEvent.setup()
    const envoyer = vi.spyOn(api, 'sendMessage').mockResolvedValue(message())
    await monter(seance(), [message({ body: 'Depuis trois nuits.' })])

    await utilisateur.click(await fil().findByLabelText('Répondre à ce message'))
    await utilisateur.type(screen.getByLabelText('Votre message'), 'Depuis quand exactement ?')
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer' }))

    await waitFor(() => expect(envoyer).toHaveBeenCalled())
    expect(envoyer.mock.calls[0][1]).toMatchObject({ replyToId: 'm1', kind: 'TEXT' })
  })

  it('modifier remplit le champ et appelle l’édition, pas un nouvel envoi', async () => {
    const utilisateur = userEvent.setup()
    const modifier = vi.spyOn(api, 'editSessionMessage').mockResolvedValue(message())
    const envoyer = vi.spyOn(api, 'sendMessage').mockResolvedValue(message())
    await monter(seance(), [message({ senderId: 'pro-1', body: 'Bonour', createdAt: new Date().toISOString() })])

    await utilisateur.click(await fil().findByLabelText('Modifier ce message'))
    // Le texte existant est déjà là : on corrige, on ne réécrit pas.
    const champ = screen.getByLabelText('Modifier votre message')
    expect(champ).toHaveValue('Bonour')

    await utilisateur.clear(champ)
    await utilisateur.type(champ, 'Bonjour')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la modification' }))

    await waitFor(() => expect(modifier).toHaveBeenCalledWith('s1', 'm1', 'Bonjour'))
    expect(envoyer).not.toHaveBeenCalled()
  })

  /**
   * La fenêtre de quinze minutes est celle du SERVEUR (`EDIT_DELETE_WINDOW_MS`). L'écran ne
   * l'applique pas — il évite seulement de proposer un geste qui reviendrait en 409.
   */
  it('passé un quart d’heure, « modifier » n’est plus proposé', async () => {
    const vieux = new Date(Date.now() - 20 * 60_000).toISOString()
    await monter(seance(), [message({ senderId: 'pro-1', createdAt: vieux })])

    await fil().findByText('Bonjour docteur')
    expect(fil().queryByLabelText('Modifier ce message')).not.toBeInTheDocument()
  })

  it('réagir bascule l’emoji — la même palette que le mobile', async () => {
    const utilisateur = userEvent.setup()
    const reagir = vi.spyOn(api, 'reactToSessionMessage').mockResolvedValue(message())
    await monter(seance(), [message()])

    await utilisateur.click(await fil().findByLabelText('Réagir à ce message'))
    await utilisateur.click(await screen.findByLabelText('Réagir avec 👍'))

    await waitFor(() => expect(reagir).toHaveBeenCalledWith('s1', 'm1', '👍'))
  })

  /*
    ── Amendé le 04/09/2026 (chantier 41 ter), et la règle n'a pas bougé ──────────────────────

    « Une séance close est une archive » reste vrai : on n'y répond pas, on n'y réagit pas, on n'y
    modifie ni ne retire rien. Toutes ces assertions sont conservées.

    **Une seule exception s'y ajoute : SIGNALER.** Elle vient d'une vérification en ligne — sur une
    consultation terminée, il n'existait aucun moyen de signaler un message, alors que c'est
    précisément après coup qu'on repense à un propos déplacé, et que le message est la preuve.

    Signaler ne modifie pas l'archive : c'est une alerte à son sujet. La règle tient donc entière.

    *La première correction rouvrait TOUS les gestes après la clôture, au motif que le serveur les
    accepte. Ce test l'a refusée, et il avait raison : ce que le serveur autorise n'est pas ce que
    le produit veut. Un test qui tombe n'a pas forcément tort.*
  */
  it('une séance close n’offre plus aucun geste qui MODIFIE le fil : il est archivé', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message()])

    await fil().findByText('Bonjour docteur')
    expect(fil().queryByLabelText('Répondre à ce message')).not.toBeInTheDocument()
    expect(fil().queryByLabelText('Autres actions sur ce message')).not.toBeInTheDocument()
    expect(fil().queryByLabelText('Réagir à ce message')).not.toBeInTheDocument()
    expect(fil().queryByLabelText('Modifier ce message')).not.toBeInTheDocument()
  })

  it('mais il reste signalable — c’est après coup qu’on repense à un propos déplacé', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message({ senderId: 'pat-1' })])

    expect(await fil().findByLabelText('Signaler ce message')).toBeInTheDocument()
  })

  /* Sur SES PROPRES messages, une séance close n'offre plus rien du tout : on ne se signale pas. */
  it('n’offre rien du tout sur ses propres messages, séance close', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message({ senderId: 'pro-1' })])

    await fil().findByText('Bonjour docteur')
    expect(fil().queryByLabelText('Signaler ce message')).not.toBeInTheDocument()
  })
})

/**
 * D-008, invariant n°9. L'avertissement ne valait rien au passé — « cette consultation a été
 * remboursée » ne rattrape pas des honoraires perdus. Au présent, un message le fait disparaître.
 */
describe('C5 — l’avertissement de remboursement', () => {
  it('prévient tant que le professionnel n’a rien écrit', async () => {
    await monter(seance(), [message({ senderId: 'pat-1' })])

    expect(await screen.findByText(/vous ne percevrez rien/)).toBeInTheDocument()
  })

  it('disparaît dès le premier message du professionnel', async () => {
    await monter(seance(), [message({ senderId: 'pat-1' }), message({ id: 'm2', senderId: 'pro-1', body: 'Bonjour.' })])

    await fil().findByText('Bonjour.')
    expect(document.body.textContent).not.toContain('vous ne percevrez rien')
  })
})

/**
 * Le Carnet en session (EF-06-06, RM-06-05). Trois mentions sont imposées par l'alignement, et
 * aucune n'est décorative : la lecture seule, la traçabilité de l'accès, et sa fermeture à la
 * clôture — le compte-rendu rédigé à la 23ᵉ heure n'aura plus le Carnet sous les yeux.
 */
describe('C5 — le Carnet du patient', () => {
  it('montre le groupe sanguin, les allergies actives et les chroniques', async () => {
    vi.spyOn(api, 'sessionRecordSummary').mockResolvedValue({
      bloodType: 'O+',
      activeAllergies: ['Pénicilline'],
      chronicDiseases: ['Hypertension'],
    })
    await monter(seance())

    expect(await screen.findByText('O+')).toBeInTheDocument()
    // L'allergie est la seule information de cet écran qui peut tuer : elle est en tête.
    expect(screen.getByText('Pénicilline')).toBeInTheDocument()
    expect(screen.getByText('Hypertension')).toBeInTheDocument()
  })

  it('annonce la lecture seule et la traçabilité AVANT qu’on lise', async () => {
    await monter(seance())

    expect(await screen.findByText(/Lecture seule · votre consultation est enregistrée/)).toBeInTheDocument()
  })

  it('la séance close, l’accès est refermé — et l’écran ne demande plus rien au serveur', async () => {
    const lire = vi.spyOn(api, 'sessionRecordSummary')
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }))

    expect(await screen.findByText(/L'accès s'est refermé avec la consultation/)).toBeInTheDocument()
    expect(lire).not.toHaveBeenCalled()
  })

  it('n’efface pas une entrée remplacée : elle reste visible, corrigée (EF-07-04)', async () => {
    vi.spyOn(api, 'sessionRecord').mockResolvedValue({
      recordId: 'r1',
      items: [
        {
          id: 'e1',
          type: 'ALLERGY',
          provenance: 'DECLARED_BY_PATIENT',
          authorId: null,
          sourceRef: null,
          payload: { label: 'Arachide' },
          supersedesId: null,
          createdAt: '2026-06-01T10:00:00.000Z',
          superseded: true,
        },
      ],
      nextCursor: null,
    })
    await monter(seance())

    const entree = await screen.findByText('Arachide')
    expect(entree.className).toContain('line-through')
    // RM-07-03 : une déclaration du patient n'est JAMAIS présentée comme un diagnostic.
    expect(screen.getByText(/déclaré par le patient/)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Signaler — chantier 41, 04/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  `POST /v1/reports` existait depuis le premier jour et **aucun client ne l'appelait**. Tout M04
  était construit — la file de modération, le tri par gravité, la décision motivée — et l'écran
  d'administration « Signalements » serait resté vide à jamais, faute d'une porte d'entrée.

  Quatre choses doivent tenir, et chacune peut se défaire par inadvertance :

  **1. Le bon type de cible.** Un message se signale en `SESSION_MESSAGE` avec l'identifiant DU
  message ; un patient en `PROFILE` avec l'identifiant de son COMPTE. Les confondre enverrait à
  l'administration un signalement qu'elle ne peut pas instruire — et le serveur refuserait en 404
  sur une cible introuvable.

  **2. On ne se signale pas soi-même.** L'entrée n'existe que sur les messages de l'autre.

  **3. Le motif est obligatoire.** C'est lui qui décide de l'ordre de traitement (CU-04-04) : un
  signalement sans code serait un signalement sans priorité.

  **4. La protection du signaleur est DITE avant le formulaire.** `redactReportForAdmin` (RM-04-04)
  la garantit côté serveur ; sans la lire, un médecin qui reverra ce patient n'ose pas signaler.
  C'est une phrase d'interface, mais elle décide de l'usage de toute la fonctionnalité.
*/

/** Ouvre le menu « autres actions » d'un message, puis sa boîte de signalement. */
async function ouvrirSignalementMessage(utilisateur: ReturnType<typeof userEvent.setup>) {
  await utilisateur.click(await screen.findByRole('button', { name: /Autres actions sur ce message/ }))
  await utilisateur.click(await screen.findByRole('menuitem', { name: /Signaler ce message/ }))
}

describe('C5 — signaler (chantier 41)', () => {
  it('signale un MESSAGE avec son identifiant et le bon type de cible', async () => {
    const creer = vi.spyOn(api, 'createReport').mockResolvedValue({ reportId: 'r1' })
    await monter(seance(), [message({ id: 'm-fautif', senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)
    await utilisateur.click(await screen.findByRole('radio', { name: /Harcèlement/ }))
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    await waitFor(() =>
      expect(creer).toHaveBeenCalledWith({
        targetType: 'SESSION_MESSAGE',
        targetId: 'm-fautif',
        reasonCode: 'HARASSMENT',
      }),
    )
  })

  it('signale le PATIENT avec l’identifiant de son compte, pas celui de la séance', async () => {
    const creer = vi.spyOn(api, 'createReport').mockResolvedValue({ reportId: 'r2' })
    await monter(seance({ id: 's1', patientAccountId: 'pat-1' }))
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Signaler ce patient/ }))
    await utilisateur.click(await screen.findByRole('radio', { name: /Profil suspect/ }))
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    await waitFor(() =>
      expect(creer).toHaveBeenCalledWith({
        targetType: 'PROFILE',
        targetId: 'pat-1',
        reasonCode: 'SUSPECTED_FAKE_PROFILE',
      }),
    )
  })

  /* Le texte libre est facultatif : il ne part que s'il a été écrit, et jamais vide. */
  it('joint les précisions quand il y en a, et rien quand il n’y en a pas', async () => {
    const creer = vi.spyOn(api, 'createReport').mockResolvedValue({ reportId: 'r3' })
    await monter(seance(), [message({ id: 'm-fautif', senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)
    await utilisateur.click(await screen.findByRole('radio', { name: /Spam/ }))
    await utilisateur.type(screen.getByLabelText(/Précisions/), 'Trois messages publicitaires.')
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    await waitFor(() =>
      expect(creer).toHaveBeenCalledWith(expect.objectContaining({ reasonText: 'Trois messages publicitaires.' })),
    )
  })

  /*
    Le motif décide de l'ordre de traitement dans la file de modération : sans lui, le signalement
    part sans priorité. Le bouton reste donc fermé tant qu'aucun motif n'est choisi.
  */
  it('refuse d’envoyer tant qu’aucun motif n’est choisi', async () => {
    const creer = vi.spyOn(api, 'createReport')
    await monter(seance(), [message({ senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)

    expect(screen.getByRole('button', { name: /Envoyer le signalement/ })).toBeDisabled()
    expect(creer).not.toHaveBeenCalled()
  })

  /*
    On ne se signale pas soi-même. L'offrir ferait douter de ce que le geste veut dire — et
    produirait des signalements que l'administration ne pourrait qu'écarter.
  */
  it('n’offre pas de signaler ses PROPRES messages', async () => {
    await monter(seance(), [message({ id: 'a-moi', senderId: 'pro-1' })])
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Autres actions sur ce message/ }))

    expect(await screen.findByRole('menuitem', { name: /Retirer de mon fil/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Signaler/ })).not.toBeInTheDocument()
  })

  /*
    LA phrase qui décide de l'usage. Elle est garantie par le serveur (`redactReportForAdmin`,
    RM-04-04) et elle doit être lue AVANT de remplir : un médecin qui reverra ce patient la semaine
    prochaine n'ose pas signaler s'il croit être nommé.
  */
  it('dit AVANT le formulaire que l’identité du signaleur est protégée', async () => {
    await monter(seance(), [message({ senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)

    expect(await screen.findByText(/Votre nom ne sera jamais montré/)).toBeInTheDocument()
  })

  /*
    Et la promesse de retour, qui distingue un formulaire d'un trou noir — la règle que le projet
    s'est donnée en remplaçant l'adresse de support morte. Elle est tenable depuis le chantier 37 :
    le serveur notifie l'auteur à la décision (`m04.report.resolved`), et la cloche l'affiche enfin.
  */
  it('annonce que la réponse reviendra dans les notifications', async () => {
    vi.spyOn(api, 'createReport').mockResolvedValue({ reportId: 'r4' })
    await monter(seance(), [message({ senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)
    await utilisateur.click(await screen.findByRole('radio', { name: /Comportement inapproprié/ }))
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    expect(await screen.findByText(/dans vos notifications/)).toBeInTheDocument()
  })

  /* Un échec ne se perd pas en silence : le brouillon reste, et le motif de refus s'affiche. */
  it('montre l’échec sans effacer ce qui a été saisi', async () => {
    vi.spyOn(api, 'createReport').mockRejectedValue(new Error('réseau'))
    await monter(seance(), [message({ senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)
    await utilisateur.click(await screen.findByRole('radio', { name: /Autre/ }))
    await utilisateur.type(screen.getByLabelText(/Précisions/), 'Un texte que je ne veux pas retaper.')
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText(/Précisions/)).toHaveValue('Un texte que je ne veux pas retaper.')
  })

  /*
    Les structures sont sorties du produit (D-051). Le serveur accepte encore `FACILITY` — la valeur
    décrit des lignes qui peuvent exister en base — mais l'offrir serait offrir une porte qui ne
    mène nulle part.
  */
  it('n’offre aucun motif ni aucune cible hors du produit', async () => {
    await monter(seance(), [message({ senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await ouvrirSignalementMessage(utilisateur)

    expect(screen.queryByText(/structure|pharmacie|officine/i)).not.toBeInTheDocument()
    // Les six motifs du serveur, ni plus ni moins.
    expect(screen.getAllByRole('radio')).toHaveLength(6)
  })
})

/*
  ── La barre d'actions survit à la fin de la séance (chantier 41 ter, 04/09/2026) ─────────────

  Trouvé EN LIGNE en vérifiant le chantier 41 : sur une consultation TERMINÉE, la barre d'actions
  d'un message ne s'affichait pas du tout — donc **aucun moyen de signaler un message**. Or c'est
  précisément après coup qu'on repense à un propos déplacé, et le message est la preuve.

  J'avais placé une action sans limite de temps dans un conteneur limité au temps de la séance.

  **Le serveur ne l'a jamais demandé.** Vérifié dans `m06.session.service.ts` : seul `sendMessage`
  exige `status === ACTIVE`. `editMessage`, `reactToMessage` et `deleteMessage` ne contrôlent que la
  participation. La barre montre donc ce que le serveur accepte encore, et « Répondre » — qui
  prépare un envoi — est le seul geste à disparaître à la clôture.
*/
describe('C5 — signaler après la fin de la séance (chantier 41 ter)', () => {
  /*
    LE cas qui a motivé ce chantier bis. Trouvé en vérifiant le chantier 41 EN LIGNE : la barre
    d'actions était entièrement conditionnée à l'état actif, donc invisible sur une consultation
    terminée — et le signalement d'un message avec elle.

    J'avais placé une action sans limite de temps dans un conteneur limité au temps de la séance.
  */
  it('signale encore un message sur une consultation terminée', async () => {
    const creer = vi.spyOn(api, 'createReport').mockResolvedValue({ reportId: 'r5' })
    await monter(seance({ status: 'ENDED', remainingSeconds: 0 }), [message({ id: 'm-tardif', senderId: 'pat-1' })])
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByLabelText('Signaler ce message'))
    await utilisateur.click(await screen.findByRole('radio', { name: /Harcèlement/ }))
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le signalement/ }))

    await waitFor(() =>
      expect(creer).toHaveBeenCalledWith({
        targetType: 'SESSION_MESSAGE',
        targetId: 'm-tardif',
        reasonCode: 'HARASSMENT',
      }),
    )
  })
})
