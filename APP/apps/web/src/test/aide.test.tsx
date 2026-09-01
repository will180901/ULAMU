/**
 * B3 · Aide — écrire à l'administration (01/09/2026, dette 8quater).
 *
 * ── Ce que cet écran remplace ──────────────────────────────────────────────────────────────────
 *
 * `support@ulamu.cg` : une adresse dont le domaine n'appartient pas au projet — ni achetée, ni
 * relevée. Elle figurait dans les mentions légales, **acceptées à l'inscription et valant donc
 * preuve**, et derrière « Écrire à l'administration » en C1.
 *
 * ── Ce qui est verrouillé ici ──────────────────────────────────────────────────────────────────
 *
 *  1. **La réponse revient dans l'écran.** C'est la seule chose qui distingue ce formulaire d'un
 *     trou noir — et un trou noir serait pire que l'adresse morte qu'il remplace : avec une adresse,
 *     on sait au moins qu'on n'a pas eu de réponse.
 *  2. **Plus aucune adresse `@ulamu.cg` nulle part.** Un test qui vérifie l'écran mais laisse
 *     l'adresse ailleurs n'aurait rien corrigé.
 *  3. **On ne promet pas une messagerie.** Une demande, une réponse, close.
 *  4. **Le sujet arrive pré-choisi depuis C1** : faire chercher à quelqu'un sa propre situation
 *     dans une liste, alors que l'écran d'où il vient la connaît, est un travail qu'on lui inflige.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SectionAide } from '@/modules/settings/sections/SectionAide'
import { api, type SupportRequest } from '@/lib/api'

const demande = (o: Partial<SupportRequest> = {}): SupportRequest => ({
  id: 'req-1',
  subject: 'PHONE_CHANGE',
  body: 'J’ai perdu mon téléphone et je ne reçois plus le code.',
  status: 'OPEN',
  createdAt: '2026-09-01T08:00:00.000Z',
  answer: null,
  answeredAt: null,
  ...o,
})

function monter(miennes: SupportRequest[] = [], chemin = '/parametres?section=aide') {
  if (!vi.isMockFunction(api.mySupportRequests)) vi.spyOn(api, 'mySupportRequests').mockResolvedValue(miennes)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[chemin]}>
        <SectionAide />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('B3 · Aide — écrire', () => {
  it('envoie la demande avec son sujet et son texte', async () => {
    const utilisateur = userEvent.setup()
    const creer = vi.spyOn(api, 'createSupportRequest').mockResolvedValue({ requestId: 'req-9' })
    monter()

    await utilisateur.type(
      await screen.findByLabelText('Votre demande'),
      'Mon dossier est bloqué depuis trois semaines.',
    )
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer ma demande' }))

    await waitFor(() =>
      expect(creer).toHaveBeenCalledWith({
        subject: 'OTHER',
        body: 'Mon dossier est bloqué depuis trois semaines.',
      }),
    )
  })

  it('n’envoie rien tant que la demande tient en trois mots', async () => {
    const utilisateur = userEvent.setup()
    monter()

    await utilisateur.type(await screen.findByLabelText('Votre demande'), 'bonjour')

    // 10 caractères, la borne du serveur : la faire respecter ici évite un aller-retour pour
    // l'apprendre.
    expect(screen.getByRole('button', { name: 'Envoyer ma demande' })).toBeDisabled()
  })

  it('reprend le sujet que C1 lui passe, au lieu de le faire rechercher', async () => {
    monter([], '/parametres?section=aide&sujet=RECORD_TRANSFER')

    expect(await screen.findByRole('combobox', { name: /De quoi s’agit-il/ })).toHaveTextContent('Mon carnet de santé')
  })

  it('met en garde contre ce qu’il ne faut jamais écrire ici', async () => {
    monter()

    // Un formulaire de support est exactement l'endroit où quelqu'un tape son mot de passe en
    // croyant bien faire.
    expect(await screen.findByText(/ne vous les demandera jamais/)).toBeInTheDocument()
  })
})

describe('B3 · Aide — la réponse revient ICI', () => {
  it('affiche la réponse de l’administration sous la demande', async () => {
    monter([
      demande({
        status: 'ANSWERED',
        answer: 'Présentez-vous au guichet avec votre pièce d’identité.',
        answeredAt: '2026-09-02T09:00:00.000Z',
      }),
    ])

    // C'est toute la raison d'être du formulaire : sans ce chemin de retour, il vaudrait moins que
    // l'adresse morte qu'il remplace.
    expect(await screen.findByText(/Présentez-vous au guichet/)).toBeInTheDocument()
    expect(screen.getByText(/Réponse de l’administration/)).toBeInTheDocument()
  })

  it('dit qu’aucune réponse n’est encore arrivée, au lieu d’un blanc', async () => {
    monter([demande()])

    expect(await screen.findByText(/Aucune réponse pour l’instant/)).toBeInTheDocument()
  })

  it('avoue quand la lecture échoue, et rassure sur ce qui est conservé', async () => {
    vi.spyOn(api, 'mySupportRequests').mockRejectedValue(new Error('boum'))
    monter()

    expect(await screen.findByText(/seul cet affichage manque/)).toBeInTheDocument()
  })

  it('liste vide : on le dit', async () => {
    monter([])

    expect(await screen.findByText(/Vous n’avez encore rien écrit/)).toBeInTheDocument()
  })
})

describe('B3 · Aide — ce que l’écran ne promet pas', () => {
  it('annonce que la réponse arrive ici, et non par courriel', async () => {
    monter()

    expect(await screen.findByText(/ULAMU n’envoie pas de courriel de support/)).toBeInTheDocument()
  })
})

/*
  Le test qui compte le plus : corriger l'écran sans retirer l'adresse d'à côté n'aurait rien
  corrigé du tout. On lit les sources, comme `charte.test.tsx` lit la feuille de style.
*/
describe('Plus aucune adresse @ulamu.cg dans l’application', () => {
  const FICHIERS = [
    'config/contact.config.ts',
    'modules/settings/sections/SectionLegal.tsx',
    'modules/verification/pages/VerificationPage.tsx',
  ]

  it('ni dans la configuration de contact, ni dans les deux écrans qui l’affichaient', () => {
    for (const rel of FICHIERS) {
      const source = readFileSync(resolve(__dirname, '..', rel), 'utf8')
      // Le domaine n'appartient pas au projet : toute adresse qui s'en réclame est une promesse
      // que personne ne peut tenir. Les commentaires qui RACONTENT la correction sont tolérés —
      // on cherche l'adresse affichée, pas le mot.
      const sansCommentaires = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      expect(sansCommentaires, `${rel} affiche encore une adresse @ulamu.cg`).not.toMatch(/@ulamu\.cg/)
      expect(sansCommentaires, `${rel} ouvre encore un mailto:`).not.toMatch(/mailto:/)
    }
  })
})

describe('Les mentions légales mènent au formulaire', () => {
  it('le lien de support pointe sur l’onglet Aide', async () => {
    const { SectionLegal } = await import('@/modules/settings/sections/SectionLegal')
    vi.spyOn(api, 'myConsents').mockResolvedValue([])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SectionLegal />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const lien = await screen.findByRole('link', { name: /Écrire à l’administration/ })
    expect(lien).toHaveAttribute('href', expect.stringContaining('section=aide'))
  })
})

describe('Une demande, une réponse — pas un fil de discussion', () => {
  it('ne propose jamais de répondre à la réponse', async () => {
    monter([demande({ status: 'ANSWERED', answer: 'C’est réglé.', answeredAt: '2026-09-02T09:00:00.000Z' })])

    const bloc = (await screen.findByText('C’est réglé.')).closest('li') as HTMLElement
    // ULAMU n'a pas de messagerie interne : afficher un champ de réponse laisserait croire à un
    // aller-retour que rien ne fait vivre.
    expect(within(bloc).queryByRole('textbox')).not.toBeInTheDocument()
  })
})
