/**
 * C5 « Consultation » — la séance chronométrée.
 *
 * Trois choses coûteraient cher ici, et ce sont elles qui sont verrouillées :
 *
 *  1. **Annoncer 48 h pour le compte-rendu.** PM-30 vaut 86 400 s, et EF-06-08 dit « jusqu'à PM-30
 *     (24 h) ». Un médecin qui croit disposer du double voit ses gains gelés à la 24ᵉ heure, sans
 *     comprendre pourquoi. C'était l'erreur de la maquette.
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
})

describe('C5 — le compte-rendu', () => {
  it('annonce 24 heures, jamais 48 (PM-30 = 86 400 s)', async () => {
    await monter(seance())
    // L'erreur la plus coûteuse de la maquette : le médecin croit avoir le double du délai réel.
    expect(await screen.findByText(/24 heures/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('48 heures')
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
