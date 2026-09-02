/**
 * E5 « Pilotage » — les indicateurs du pilote, l'intégrité du journal, la couverture du territoire.
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **La couverture est COMPTÉE, pas écrite** (S6). La maquette pose six arrondissements en dur.
 *  2. **Aucune comparaison à la population.** « Moins d'un soignant pour 8 000 habitants » suppose
 *     une donnée de recensement qui n'existe pas — et qu'ULAMU n'a aucune raison de détenir.
 *  3. **Aucune tendance « vs juillet ».** Ces agrégats sont calculés à la lecture ; aucune série
 *     historique n'existe. Même renoncement qu'en B2.
 *  4. **Le tableau des délais garde deux lignes vraies sur douze cases.** Médiane, hors-délai et
 *     taux de tenue ne sont mesurés par aucun indicateur : les afficher demanderait de les
 *     calculer, pas de les lire.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PilotagePage } from '@/modules/admin/pages/PilotagePage'
import { useSessionStore } from '@/state/session.store'
import { api, type AuditIntegrity, type MeResponse, type PilotKpi, type VerificationQueue } from '@/lib/api'

const ADMIN: MeResponse = {
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

const KPIS: PilotKpi[] = [
  { key: 'PROS_VERIFIES', label: 'Professionnels vérifiés et actifs', value: 12, target: 30, unit: 'count', status: 'KO' },
  { key: 'TAUX_REMBOURSEMENT_AUTO', label: 'Taux de remboursement automatique', value: 98, target: 95, unit: '%', status: 'OK' },
]

const COUVERTURE = [
  { district: 'Bacongo', professionals: 8 },
  { district: 'Makélékélé', professionals: 1 },
]

const FILE: VerificationQueue = {
  targetHours: 72,
  overdueAfterHours: 144,
  items: [
    {
      caseId: 'c-1',
      subjectKind: 'PROFESSIONAL',
      subject: 'professional:p1',
      subjectName: 'Ange Makaya',
      status: 'SUBMITTED',
      waitingSince: new Date(Date.now() - 200 * 3600e3).toISOString(),
      documentCount: 4,
      overdueTarget: true,
      overdue: true,
    },
    {
      caseId: 'c-2',
      subjectKind: 'PROFESSIONAL',
      subject: 'professional:p2',
      subjectName: 'Solange Mbemba',
      status: 'SUBMITTED',
      waitingSince: new Date(Date.now() - 3 * 3600e3).toISOString(),
      documentCount: 4,
      overdueTarget: false,
      overdue: false,
    },
  ],
}

function monter(
  kpis: PilotKpi[] = KPIS,
  couverture = COUVERTURE,
  integrite: AuditIntegrity = { ok: true, checked: 48_912 },
  file: VerificationQueue = FILE,
) {
  vi.spyOn(api, 'pilotKpis').mockResolvedValue(kpis)
  vi.spyOn(api, 'coverage').mockResolvedValue(couverture)
  vi.spyOn(api, 'auditIntegrity').mockResolvedValue(integrite)
  vi.spyOn(api, 'verificationQueue').mockResolvedValue(file)
  useSessionStore.setState({ token: 'jeton', me: ADMIN, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PilotagePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('E5 — la couverture par arrondissement (S6)', () => {
  it('compte les arrondissements servis, il ne les écrit pas', async () => {
    monter()

    const bloc = (await screen.findByText('Couverture par arrondissement')).closest('section') as HTMLElement
    expect(within(bloc).getByText('Bacongo')).toBeInTheDocument()
    expect(within(bloc).getByText(/8 soignants/)).toBeInTheDocument()
    /* 02/09/2026 (chantier 26) : les officines ne sont plus comptées. Additionner un chiffre vivant
       (les soignants) et un chiffre figé (des pharmacies que plus personne n'alimente) donnait un
       territoire mieux couvert qu'il ne l'est — dans le mauvais sens, sur l'écran où l'on décide où
       la plateforme manque. */
    expect(bloc.textContent ?? '').not.toMatch(/officine/i)
    // Les effectifs de la maquette, écrits en dur.
    expect(document.body.textContent).not.toContain('78 soignants')
  })

  it('ne compare RIEN à la population : aucune donnée de recensement n’existe', async () => {
    monter()

    await screen.findByText('Couverture par arrondissement')
    expect(document.body.textContent).not.toContain('8 000 habitants')
    expect(await screen.findByText(/ULAMU ne détient\s+aucune donnée de recensement/)).toBeInTheDocument()
  })

  it('dit ce que « soignant » veut dire ici — vérifié ET sous contrat', async () => {
    monter()

    expect(await screen.findByText(/dossier vérifié dont le contrat est signé/)).toBeInTheDocument()
  })

  it('classe du mieux au moins couvert, sans nommer de « sous-couvert »', async () => {
    monter()

    const bloc = (await screen.findByText('Couverture par arrondissement')).closest('section') as HTMLElement
    const lignes = within(bloc).getAllByRole('listitem')
    expect(lignes[0].textContent).toContain('Bacongo')
    expect(lignes[1].textContent).toContain('Makélékélé')
  })

  it('un territoire encore vide le dit, plutôt qu’un cadre muet', async () => {
    monter(KPIS, [])

    expect(await screen.findByText(/Aucun soignant exerçant n'est encore rattaché/)).toBeInTheDocument()
  })
})

describe('E5 — les indicateurs', () => {
  it('affiche les critères servis avec leur cible, sans tendance inventée', async () => {
    monter()

    expect(await screen.findByText('Professionnels vérifiés et actifs')).toBeInTheDocument()
    expect(screen.getByText('sur 30')).toBeInTheDocument()
    // Aucune série historique n'existe pour ces agrégats.
    expect(document.body.textContent).not.toMatch(/vs juillet|vs le mois/i)
  })

  it('n’affiche aucun indicateur que le serveur ne mesure pas', async () => {
    monter()

    await screen.findByText('Professionnels vérifiés et actifs')
    // Ceux de la maquette : comptes actifs, volume encaissé, taux de réclamation.
    expect(document.body.textContent).not.toMatch(/volume encaissé|taux de réclamation/i)
  })

  it('borne la barre à 100 % : un indicateur au-delà de sa cible ne déborde pas', async () => {
    monter([{ key: 'X', label: 'Dépassé', value: 300, target: 100, unit: 'count', status: 'OK' }])

    expect(await screen.findByText('Cible atteinte')).toBeInTheDocument()
  })

  it('n’annonce aucun instantané figé : le calcul est celui de la lecture', async () => {
    monter()

    expect(await screen.findByText(/calculé à l'instant/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/arrêté au \d/i)
  })
})

describe('E5 — l’intégrité du journal', () => {
  it('dit la chaîne intacte, et ce que cela signifie', async () => {
    monter()

    expect(await screen.findByText(/Chaîne intacte/)).toBeInTheDocument()
    expect(screen.getByText(/en retirer une casserait la\s+chaîne/)).toBeInTheDocument()
  })

  it('une rupture est annoncée comme une altération, pas comme une anomalie', async () => {
    monter(KPIS, COUVERTURE, { ok: false, checked: 100, brokenAtSeq: 4711 })

    expect(await screen.findByText(/Rupture détectée/)).toBeInTheDocument()
    expect(screen.getByText(/Le journal a\s+été altéré/)).toBeInTheDocument()
  })

  it('ne compte pas ce que le serveur ne compte pas', async () => {
    monter()

    await screen.findByText(/Chaîne intacte/)
    // « Actions sans motif » et « suppressions tentées » ne sont mesurés nulle part.
    expect(document.body.textContent).not.toMatch(/actions sans motif|suppressions tentées/i)
  })
})

describe('E5 — le respect des délais', () => {
  it('compte les dossiers en retard MAINTENANT, la seule mesure qui existe', async () => {
    monter()

    const bloc = (await screen.findByText('Respect des délais')).closest('section') as HTMLElement
    expect(within(bloc).getByText(/Dossiers de vérification en retard/)).toBeInTheDocument()
    expect(within(bloc).getByText('1')).toBeInTheDocument()
  })

  it('n’affiche ni médiane, ni taux de tenue, ni hors-délai historique', async () => {
    monter()

    const bloc = (await screen.findByText('Respect des délais')).closest('section') as HTMLElement

    /*
      La maquette montre un TABLEAU de trois processus × quatre colonnes — limite, médian, hors
      délai, tenue — soit douze cases dont deux seulement seraient vraies. Ce qui est verrouillé,
      c'est l'absence de ce tableau : les mots « médian » et « taux de tenue », eux, figurent bien
      dans l'écran — dans la phrase qui explique pourquoi ils n'y sont PAS mesurés.
    */
    expect(within(bloc).queryByRole('table')).not.toBeInTheDocument()
    expect(within(bloc).queryByText(/^\d+ h$/)).not.toBeInTheDocument()
    expect(within(bloc).getByText(/ne sont mesurés par aucun indicateur/)).toBeInTheDocument()
  })

  it('n’invente aucun délai de remboursement de 15 jours', async () => {
    monter()

    await screen.findByText('Respect des délais')
    // Le remboursement automatique est immédiat ; « 15 j » désignait le manuel, sans échéance au cahier.
    expect(document.body.textContent).not.toMatch(/15 j\b|15 jours/)
    expect(screen.getByText(/le remboursement automatique,\s+lui, est immédiat/i)).toBeInTheDocument()
  })

  it('rappelle qu’aucune donnée individuelle ne sort de cet écran', async () => {
    monter()

    expect(await screen.findByText(/que des compteurs et des taux/)).toBeInTheDocument()
  })
})
