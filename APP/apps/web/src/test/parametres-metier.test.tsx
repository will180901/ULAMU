/**
 * E3 « Paramètres métier » — l'écran qui peut suspendre l'exercice de tous les soignants.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **La case morale est remplacée par les conséquences.** « Je comprends les conséquences » ne
 *     dit rien : elle demande d'assumer sans informer. À la place, le nombre réel de contrats
 *     signés et ce qui arrive à ceux qui les ont signés (S5, famille 4 point 11).
 *  2. **Aucun préavis de 30 jours.** Le serveur REFUSE une date d'effet future — « différé non géré
 *     au MVP », et le code dit pourquoi : « pour ne pas mentir sur le contrat ». Offrir un
 *     sélecteur de date produirait une erreur à chaque usage (famille 2, point 5).
 *  3. **Aucun intitulé de paramètre réécrit.** `COMMISSION_SOIGNANT_PCT` n'existe pas : les
 *     paramètres s'appellent PM-xx et portent leur description en base. Deux vérités pour un même
 *     libellé divergeraient au premier ajout.
 *  4. **Un paramètre qui ne casse rien le dit aussi.** Faire hésiter devant un geste sans
 *     conséquence est un défaut symétrique de celui qu'on corrige.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ParametresMetierPage } from '@/modules/admin/pages/ParametresMetierPage'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse, type ParameterChange, type PlatformParameter } from '@/lib/api'

const SUPER: MeResponse = {
  accountId: 'adm-1',
  accountType: 'ADMIN',
  username: 'super',
  phone: '+242069000002',
  firstName: 'Super',
  lastName: 'Admin',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  adminRole: 'SUPER_ADMIN',
  totpEnabled: true,
  totpEnabledAt: null,
  email: 'super@ulamu.cg',
  emailTwoFactorEnabled: false,
  avatarKey: null,
  backupCodesRemaining: 10,
  backupCodesTotal: 10,
  backupCodesGeneratedAt: null,
}

const PM01: PlatformParameter = {
  key: 'PM-01',
  value: '10',
  description: 'Taux de commission ULAMU sur chaque consultation honorée',
  effectiveAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
}

const PM30: PlatformParameter = {
  key: 'PM-30',
  value: '86400',
  description: 'Délai de dépôt du compte-rendu après la fin de la consultation',
  effectiveAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T08:00:00.000Z',
}

function monter(
  parametres: PlatformParameter[] = [PM01, PM30],
  impact: { key: string; isRateParameter: boolean; signedAgreements: number } = {
    key: 'PM-01',
    isRateParameter: true,
    signedAgreements: 12,
  },
  historique: ParameterChange[] = [],
) {
  vi.spyOn(api, 'parameters').mockResolvedValue(parametres)
  vi.spyOn(api, 'parameterImpact').mockImplementation(async (key: string) =>
    key === impact.key ? impact : { key, isRateParameter: false, signedAgreements: 0 },
  )
  vi.spyOn(api, 'parameterHistory').mockResolvedValue(historique)
  useSessionStore.setState({ token: 'jeton', me: SUPER, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ParametresMetierPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Ouvre le formulaire de modification de la ligne portant cette clé. */
async function modifier(utilisateur: ReturnType<typeof userEvent.setup>, cle: string) {
  const ligne = (await screen.findByText(cle)).closest('tr') as HTMLElement
  await utilisateur.click(within(ligne).getByRole('button', { name: 'Modifier' }))
}


beforeEach(() => {
  vi.restoreAllMocks()
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('E3 — ce qu’un changement de taux coûte (S5)', () => {
  it('annonce le NOMBRE de contrats signés, pas une case morale', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-01')

    expect(await screen.findByText(/12 contrats signés/)).toBeInTheDocument()
    expect(screen.getByText(/ne pourra plus exercer/)).toBeInTheDocument()
    // La case de la maquette demandait d'assumer sans informer.
    expect(document.body.textContent).not.toContain('Je comprends les conséquences')
  })

  it('la confirmation porte sur un FAIT chiffré, pas sur une intention', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-01')

    expect(await screen.findByLabelText(/Je confirme suspendre l'exercice de 12 soignants/)).toBeInTheDocument()
  })

  it('refuse d’enregistrer tant que la confirmation n’est pas donnée', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-01')

    await utilisateur.clear(await screen.findByLabelText('Nouvelle valeur'))
    await utilisateur.type(screen.getByLabelText('Nouvelle valeur'), '12')
    await utilisateur.type(screen.getByLabelText('Motif'), 'Décision du comité de direction')

    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled()

    await utilisateur.click(screen.getByLabelText(/Je confirme suspendre/))
    await waitFor(() => expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeEnabled())
  })

  it('n’effraie pas quand le taux n’engage aucun contrat signé', async () => {
    const utilisateur = userEvent.setup()
    monter([PM01, PM30], { key: 'PM-01', isRateParameter: true, signedAgreements: 0 })
    await modifier(utilisateur, 'PM-01')

    expect(await screen.findByText(/ne suspend l'exercice de personne/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Je confirme suspendre/)).not.toBeInTheDocument()
  })

  /**
   * Défaut symétrique de celui qu'on corrige : faire hésiter devant un geste sans conséquence.
   * Seul PM-01 est porté par le contrat — changer un délai ne ré-édite rien.
   */
  it('dit clairement qu’un paramètre hors contrat ne casse rien', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-30')

    expect(await screen.findByText(/n'apparaît pas dans les contrats/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Je confirme suspendre/)).not.toBeInTheDocument()
  })
})

describe('E3 — le changement lui-même', () => {
  it('exige un motif, et dit où il part', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-30')

    await utilisateur.clear(await screen.findByLabelText('Nouvelle valeur'))
    await utilisateur.type(screen.getByLabelText('Nouvelle valeur'), '172800')
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled()

    // La même vérité est dite deux fois : en tête d'écran, et sous le champ. On vise CELLE DU
    // FORMULAIRE — c'est là qu'elle arrive au moment où l'on écrit le motif.
    const formulaire = screen.getByLabelText('Motif').closest('div')?.parentElement as HTMLElement
    expect(within(formulaire).getByText(/journal d'audit avec votre nom/)).toBeInTheDocument()
  })

  it('envoie une date d’effet IMMÉDIATE — le serveur refuse le différé', async () => {
    const utilisateur = userEvent.setup()
    const changer = vi
      .spyOn(api, 'updateParameter')
      .mockResolvedValue({ key: 'PM-30', newValue: '172800', effectiveAt: new Date().toISOString(), reissuedCount: 0 })
    monter()
    await modifier(utilisateur, 'PM-30')

    await utilisateur.clear(await screen.findByLabelText('Nouvelle valeur'))
    await utilisateur.type(screen.getByLabelText('Nouvelle valeur'), '172800')
    await utilisateur.type(screen.getByLabelText('Motif'), 'Allongement décidé en comité')
    await utilisateur.click(screen.getByRole('button', { name: /Enregistrer/ }))

    await waitFor(() => expect(changer).toHaveBeenCalled())
    const envoye = changer.mock.calls[0][1]
    expect(envoye.reason).toBe('Allongement décidé en comité')
    // Immédiate : pas plus d'une minute dans le futur, sinon le serveur refuse.
    expect(new Date(envoye.effectiveAt).getTime()).toBeLessThanOrEqual(Date.now() + 60_000)
  })

  it('n’offre AUCUN préavis de 30 jours ni sélecteur de date', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-30')

    expect(await screen.findByText(/prend effet/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/préavis|30 jours/i)
    expect(screen.queryByLabelText(/date d'effet/i)).not.toBeInTheDocument()
  })

  it('refuse une valeur inchangée, et le dit', async () => {
    const utilisateur = userEvent.setup()
    monter()
    await modifier(utilisateur, 'PM-30')

    await utilisateur.type(await screen.findByLabelText('Motif'), 'Un motif sans changement')

    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeDisabled()
    expect(screen.getByText('La valeur est inchangée.')).toBeInTheDocument()
  })
})

describe('E3 — ce que l’écran n’invente pas', () => {
  it('affiche la description venue de la BASE, jamais un intitulé réécrit', async () => {
    monter()

    expect(await screen.findByText(PM01.description)).toBeInTheDocument()
    // Les noms de la maquette n'existent pas : les paramètres s'appellent PM-xx.
    expect(document.body.textContent).not.toContain('COMMISSION_SOIGNANT_PCT')
    expect(document.body.textContent).not.toContain('SEUIL_VERSEMENT_MIN_XAF')
  })

  it('compte les paramètres servis, il n’annonce pas « 40 en 6 familles »', async () => {
    monter()

    expect(await screen.findByText(/2 paramètres/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/6 familles/)
  })

  it('l’historique dit l’ancienne et la nouvelle valeur, avec le motif', async () => {
    const utilisateur = userEvent.setup()
    monter([PM01, PM30], undefined, [
      {
        id: 'h1',
        key: 'PM-01',
        oldValue: '12',
        newValue: '10',
        reason: 'Alignement sur la décision du conseil',
        effectiveAt: '2026-06-01T08:00:00.000Z',
        createdAt: '2026-06-01T08:00:00.000Z',
        changedBy: 'adm-1',
      },
    ])

    const ligne = (await screen.findByText('PM-01')).closest('tr') as HTMLElement
    await utilisateur.click(within(ligne).getByRole('button', { name: /Historique/ }))

    expect(await screen.findByText('Alignement sur la décision du conseil')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('un paramètre jamais modifié le dit, au lieu d’un vide', async () => {
    const utilisateur = userEvent.setup()
    monter()

    const ligne = (await screen.findByText('PM-30')).closest('tr') as HTMLElement
    await utilisateur.click(within(ligne).getByRole('button', { name: /Historique/ }))

    expect(await screen.findByText(/Jamais modifié depuis l'installation/)).toBeInTheDocument()
  })
})
