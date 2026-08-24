/**
 * C3 « Demandes » — l'écran où un médecin accepte ou refuse en cinq minutes.
 *
 * Ce fichier verrouille surtout ce que l'écran NE DOIT PAS montrer. La maquette proposait quatre
 * choses que le cahier des charges interdit à ce moment du parcours, et rien dans le code ne les
 * empêcherait de revenir un jour « pour enrichir l'écran » :
 *
 *   • un message du patient      → RM-06-03 : « aucun message hors d'une session active » ;
 *   • des pièces jointes         → EF-06-04 : la pré-consultation est remplie APRÈS PAIEMENT ;
 *   • un créneau proposé         → zéro occurrence de « créneau » dans tout M06 ;
 *   • un motif de refus long     → EF-06-02 : « motif COURT (occupé, hors domaine) ».
 *
 * Et il verrouille ce que la spec ACCORDE et qui manquait : la fiche anonymisée — prénom et âge,
 * « pas plus avant paiement » (EF-06-01). Sans elle, on décidait sur un identifiant technique.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DemandesPage } from '@/modules/demandes/pages/DemandesPage'
import { useSessionStore } from '@/state/session.store'
import { api, type Handshake, type MeResponse } from '@/lib/api'

const MOI: MeResponse = {
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
  totpEnabledAt: null,
  email: 'dr.nouveau@exemple.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

function demande(over: Partial<Handshake> = {}): Handshake {
  return {
    id: 'h1',
    status: 'INITIATED',
    patientAccountId: 'compte-technique-a3f9',
    professionalId: 'p1',
    offerId: 'o1',
    subProfileId: null,
    initiatedAt: '2026-08-24T08:00:00.000Z',
    confirmedAt: null,
    confirmExpiresAt: null,
    refusalReason: null,
    windowExpiresAt: null,
    windowRemainingSeconds: 240,
    sessionId: null,
    patientFirstName: 'Mireille',
    patientAge: 32,
    offerLabel: 'Consultation',
    offerDurationMin: 30,
    offerPriceXaf: 5000,
    ...over,
  }
}

async function monter(items: Handshake[]) {
  vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items })
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DemandesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Demandes' })
}

/**
 * Le prénom apparaît DEUX fois — dans la file et dans le détail. C'est voulu : on doit reconnaître
 * la demande qu'on a choisie. Les assertions ciblent donc la région concernée, jamais l'écran entier.
 */
const detail = () => within(screen.getByRole('region', { name: 'Détail de la demande' }))
const file = () => within(screen.getByRole('region', { name: 'File des demandes' }))

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('C3 — la fiche anonymisée (EF-06-01)', () => {
  it('montre le prénom et l’âge, et JAMAIS l’identifiant du compte', async () => {
    await monter([demande()])

    expect(await detail().findByText('Mireille')).toBeInTheDocument()
    expect(detail().getByText('32 ans')).toBeInTheDocument()
    // « pas plus avant paiement » : l'identifiant technique n'a rien à faire à l'écran.
    expect(document.body.textContent).not.toContain('compte-technique-a3f9')
  })

  it('dit POURQUOI on n’en voit pas plus, au lieu de laisser croire à un manque', async () => {
    await monter([demande()])
    // Un médecin qui cherche « où sont les symptômes ? » perd des secondes qu'il n'a pas.
    expect(await detail().findByText(/tant que la consultation n'est pas payée/)).toBeInTheDocument()
  })

  it('reste lisible quand le serveur ne renvoie pas la fiche', async () => {
    await monter([demande({ patientFirstName: null, patientAge: null })])
    expect(await detail().findByText('Âge non communiqué')).toBeInTheDocument()
  })
})

describe('C3 — ce que la spec interdit à ce stade', () => {
  it('aucun message, aucune pièce jointe, aucun créneau', async () => {
    await monter([demande()])
    await detail().findByText('Mireille')
    const texte = document.body.textContent ?? ''

    // RM-06-03 — aucun message n'existe hors d'une session active.
    expect(texte).not.toContain('Message du patient')
    // EF-06-04 — la pré-consultation arrive APRÈS le paiement.
    expect(texte).not.toContain('Pièces jointes')
    expect(texte).not.toContain('Éléments transmis')
    // M06 ne connaît ni créneau, ni rendez-vous, ni agenda.
    expect(texte).not.toContain('Créneau')
  })
})

describe('C3 — la décision', () => {
  it('confirmer envoie « je suis prêt à recevoir » et rien d’autre', async () => {
    const utilisateur = userEvent.setup()
    const confirmer = vi.spyOn(api, 'confirmHandshake').mockResolvedValue(demande({ status: 'CONFIRMED' }))
    await monter([demande()])

    await utilisateur.click(await screen.findByRole('button', { name: /Je suis prêt à recevoir/ }))
    await waitFor(() => expect(confirmer).toHaveBeenCalledWith('h1'))
  })

  it('le refus accepte un motif COURT — pas de minimum imposé (EF-06-02)', async () => {
    const utilisateur = userEvent.setup()
    const refuser = vi.spyOn(api, 'refuseHandshake').mockResolvedValue(demande({ status: 'REFUSED' }))
    await monter([demande()])

    await utilisateur.click(await screen.findByRole('button', { name: /^Refuser$/ }))
    const champ = screen.getByLabelText(/Motif transmis au patient/)

    // « Occupé » fait sept caractères. La maquette en exigeait trente : la spec dit « motif court ».
    await utilisateur.type(champ, 'Occupé')
    await utilisateur.click(screen.getByRole('button', { name: /Envoyer le refus/ }))
    await waitFor(() => expect(refuser).toHaveBeenCalledWith('h1', 'Occupé'))
  })

  it('un refus VIDE reste impossible : le patient a droit à une explication', async () => {
    const utilisateur = userEvent.setup()
    const refuser = vi.spyOn(api, 'refuseHandshake').mockResolvedValue(demande({ status: 'REFUSED' }))
    await monter([demande()])

    await utilisateur.click(await screen.findByRole('button', { name: /^Refuser$/ }))
    expect(screen.getByRole('button', { name: /Envoyer le refus/ })).toBeDisabled()
    expect(refuser).not.toHaveBeenCalled()
  })

  it('les motifs rapides remplissent le champ en un clic', async () => {
    const utilisateur = userEvent.setup()
    await monter([demande()])

    await utilisateur.click(await screen.findByRole('button', { name: /^Refuser$/ }))
    await utilisateur.click(screen.getByRole('button', { name: 'Hors de mon domaine de compétence' }))
    expect(screen.getByLabelText(/Motif transmis au patient/)).toHaveValue('Hors de mon domaine de compétence')
  })

  it('une demande déjà close n’offre plus aucune décision', async () => {
    await monter([demande({ status: 'REFUSED', refusalReason: 'Occupé', windowRemainingSeconds: 0 })])
    await detail().findByText('Mireille')

    expect(screen.queryByRole('button', { name: /Je suis prêt à recevoir/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Refuser$/ })).not.toBeInTheDocument()
    // En revanche le motif transmis reste lisible : on doit pouvoir se relire.
    expect(detail().getByText(/Motif que vous avez transmis/)).toBeInTheDocument()
  })
})

describe('C3 — la file', () => {
  it('classe les plus urgentes en premier, pas les plus anciennes', async () => {
    await monter([
      demande({ id: 'lente', windowRemainingSeconds: 280, patientFirstName: 'Alphonse' }),
      demande({ id: 'urgente', windowRemainingSeconds: 25, patientFirstName: 'Bertille' }),
    ])

    await detail().findByText('Bertille')
    const noms = file()
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
    // Sur une fenêtre de cinq minutes, le temps restant prime sur l'ordre d'arrivée.
    expect(noms[0]).toContain('Bertille')
    expect(noms[1]).toContain('Alphonse')
  })

  it('sépare ce qui attend une décision de ce qui attend le patient', async () => {
    await monter([
      demande({ id: 'a', status: 'INITIATED' }),
      demande({ id: 'b', status: 'CONFIRMED', windowRemainingSeconds: 120 }),
    ])

    // « À décider » est à la fois le titre du groupe et l'état de la ligne : on cible les TITRES.
    expect(await file().findByRole('heading', { name: 'À décider' })).toBeInTheDocument()
    expect(file().getByRole('heading', { name: 'En cours' })).toBeInTheDocument()
    expect(screen.getByText(/1 demande attend votre réponse/)).toBeInTheDocument()
  })

  it('file vide : l’écran explique comment être sollicité, au lieu de rester muet (CG-08 §06)', async () => {
    await monter([])

    expect(await screen.findByText(/Aucune demande pour l’instant/)).toBeInTheDocument()
    // La vraie cause d'une file vide est souvent l'absence de l'annuaire, pas l'absence de patients.
    expect(screen.getByText(/dossier vérifié, contrat signé, et au moins une offre active/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Où en est mon dossier/ })).toBeInTheDocument()
  })

  it('un échec de chargement rassure sur les compteurs et propose de réessayer', async () => {
    vi.spyOn(api, 'myHandshakes').mockRejectedValue(new Error('réseau'))
    useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DemandesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/n'ont pas pu être chargées/)).toBeInTheDocument()
    expect(screen.getByText(/continuent de tourner côté serveur/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('C3 — le compte à rebours', () => {
  it('affiche le temps renvoyé par le SERVEUR, pas un calcul local', async () => {
    // RM-06-02 : « le temps du serveur fait foi ». 240 s → 04:00, quelle que soit l'heure du poste.
    await monter([demande({ windowRemainingSeconds: 240 })])
    expect(await detail().findByText('04:00')).toBeInTheDocument()
  })

  it('à zéro, la décision disparaît et l’écran dit ce qui se passe', async () => {
    await monter([demande({ windowRemainingSeconds: 0 })])
    await detail().findByText('Mireille')

    expect(screen.queryByRole('button', { name: /Je suis prêt à recevoir/ })).not.toBeInTheDocument()
    expect(detail().getByText(/Le délai est écoulé/)).toBeInTheDocument()
  })
})

describe('C3 — le Carnet familial', () => {
  it('affiche le prénom de la personne à charge, pas celui du parent', async () => {
    // CU-07-04 : la demande peut être faite POUR un enfant. C'est lui que le médecin va soigner.
    await monter([demande({ subProfileId: 'sp1', patientFirstName: 'Yannick', patientAge: 6 })])

    expect(await detail().findByText('Yannick')).toBeInTheDocument()
    expect(detail().getByText('6 ans')).toBeInTheDocument()
  })
})
