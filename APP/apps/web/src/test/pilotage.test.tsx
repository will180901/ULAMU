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
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PilotagePage } from '@/modules/admin/pages/PilotagePage'
import { useSessionStore } from '@/state/session.store'
import { api, type AuditEntry, type AuditIntegrity, type MeResponse, type PilotKpi, type VerificationQueue } from '@/lib/api'

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
  integrite: AuditIntegrity = { ok: true, checked: 48_912, firstSeq: '1', startsAtOrigin: true },
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Exporter le journal d'audit — écart E, 05/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  `GET /v1/admin/audit/export.csv` existait sans aucun bouton : E5 savait vérifier l'intégrité du
  journal et le lire, mais pas le sortir. Un journal d'audit qu'on ne peut pas remettre à un tiers —
  un contrôle, un conseil, un avocat — ne remplit qu'à moitié son office.

  ⚠️ **Le vrai risque de cet écran n'est pas l'absence d'export, c'est un export TRONQUÉ qui se
  présente comme complet.** Le serveur s'arrête à un plafond ; il le faisait en silence, et rendait
  un fichier au même en-tête, au même format, sans aucune marque. Ces tests gardent surtout le cas
  où il faut interrompre l'administrateur.
*/
describe('E5 — exporter le journal d’audit (écart E)', () => {
  /** `document.createElement('a').click()` déclencherait un vrai téléchargement sous jsdom. */
  function neutraliserTelechargement() {
    const vraiCreate = document.createElement.bind(document)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:faux')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = vraiCreate(tag)
      if (tag === 'a') el.click = () => {}
      return el
    })
  }

  it('annonce le périmètre et la trace AVANT qu’on clique', async () => {
    monter()

    // Deux choses qu'un administrateur doit savoir avant d'exporter, pas après.
    expect(await screen.findByText(/que les domaines de votre matrice/)).toBeInTheDocument()
    expect(screen.getByText(/lui-même\s+inscrit au journal/)).toBeInTheDocument()
  })

  it('exporte et dit combien d’entrées sont sorties', async () => {
    neutraliserTelechargement()
    vi.spyOn(api, 'exportAuditCsv').mockResolvedValue({ csv: 'seq;createdAt', lignes: 1287, tronque: false })
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Exporter le journal/ }))

    expect(await screen.findByText(/1 287 entrées exportées/)).toBeInTheDocument()
  })

  /*
    LA garde de cet écart. Un fichier tronqué a le même en-tête et le même format qu'un fichier
    complet : rien, dans le CSV, ne dit qu'il manque des lignes. Si l'écran ne le dit pas, personne
    ne le saura — et un journal d'audit incomplet remis à un tiers est pire qu'un refus d'export.
  */
  it('avertit quand l’export est TRONQUÉ, au lieu de le laisser passer pour complet', async () => {
    neutraliserTelechargement()
    vi.spyOn(api, 'exportAuditCsv').mockResolvedValue({ csv: 'seq;createdAt', lignes: 5000, tronque: true })
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Exporter le journal/ }))

    expect(await screen.findByText(/le\s+journal en contient davantage/)).toBeInTheDocument()
    expect(screen.getByText(/n'est pas complet/)).toBeInTheDocument()
    // Et surtout : il ne dit pas « exportées, sur la totalité » en même temps.
    expect(screen.queryByText(/sur\s+la totalité/)).not.toBeInTheDocument()
  })

  it('montre l’échec plutôt qu’un fichier vide', async () => {
    vi.spyOn(api, 'exportAuditCsv').mockRejectedValue(new Error('réseau'))
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Exporter le journal/ }))

    expect(await screen.findByText(/Une erreur est survenue/)).toBeInTheDocument()
  })

  /*
    Le singulier. « 1 entrées exportées » sur un écran d'administration d'une plateforme de santé
    est le genre de détail qui fait douter du reste.
  */
  it('accorde le singulier sur une seule entrée', async () => {
    neutraliserTelechargement()
    vi.spyOn(api, 'exportAuditCsv').mockResolvedValue({ csv: 'seq;createdAt', lignes: 1, tronque: false })
    monter()
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Exporter le journal/ }))

    expect(await screen.findByText(/1 entrée exportée/)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  « Intacte » n'est pas « complète » — chantier 54, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  Le chaînage prouve que rien n'a été altéré **depuis la première entrée présente**. Il ne dit rien
  de ce qui manque AVANT elle — et il ne peut pas le dire : une table vidée puis réalimentée produit
  une chaîne parfaitement valide, qui recommence à l'origine.

  ⚠️ **Constaté en production le 06/09/2026** : le journal contient 99 entrées numérotées de 356 à
  454. Les 355 premières ont disparu avec l'effacement de la base du 23/08. La vérification
  répondait « chaîne intacte » — à juste titre — et l'écran s'arrêtait là.

  Sur une plateforme de santé dont le journal est une pièce légale, la différence entre « intact »
  et « complet » est tout le sujet. Ces tests gardent la phrase qui la dit.
*/
describe('E5 — le journal amputé de son début (chantier 54)', () => {
  it('prévient quand le journal ne commence pas à son origine', async () => {
    monter(KPIS, COUVERTURE, { ok: true, checked: 99, firstSeq: '356', startsAtOrigin: false })

    expect(await screen.findByText(/ne commence pas à son origine/)).toBeInTheDocument()
    expect(screen.getByText(/356/)).toBeInTheDocument()
    // LA phrase : elle dit exactement ce que le chaînage prouve, et ce qu'il ne prouve pas.
    expect(screen.getByText(/Ce qui reste est intact ; ce n'est pas la même\s+chose que complet/)).toBeInTheDocument()
  })

  /*
    L'avertissement ne remplace pas le constat d'intégrité : les deux sont vrais en même temps, et
    les confondre ferait croire à une altération là où il n'y en a pas.
  */
  it('dit AUSSI que la chaîne est intacte — les deux sont vrais', async () => {
    monter(KPIS, COUVERTURE, { ok: true, checked: 99, firstSeq: '356', startsAtOrigin: false })

    expect(await screen.findByText(/Chaîne intacte/)).toBeInTheDocument()
    expect(screen.queryByText(/Rupture détectée/)).not.toBeInTheDocument()
  })

  it('ne dit RIEN quand le journal part bien de sa première entrée', async () => {
    monter(KPIS, COUVERTURE, { ok: true, checked: 48_912, firstSeq: '1', startsAtOrigin: true })

    await screen.findByText(/Chaîne intacte/)
    expect(screen.queryByText(/ne commence pas à son origine/)).not.toBeInTheDocument()
  })

  /*
    Un serveur plus ancien ne renvoie pas encore ces champs. L'écran ne doit alors rien inventer —
    afficher un avertissement sur une donnée absente serait pire que de se taire.
  */
  it('se tait si le serveur ne dit rien de l’origine', async () => {
    monter(KPIS, COUVERTURE, { ok: true, checked: 99 })

    await screen.findByText(/Chaîne intacte/)
    expect(screen.queryByText(/ne commence pas à son origine/)).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  Entretien automatique — chantier 56, 06/09/2026.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/*
  ── Ce que ces tests défendent ────────────────────────────────────────────────────────────────

  Six relectures du serveur ont ajouté trois balayages automatiques : les retraits débités sans
  issue, les fichiers sans propriétaire, le renvoi des notifications critiques. Ils s'exécutent
  seuls et **prennent des décisions conséquentes** — recréditer de l'argent, effacer des données
  médicales.

  Et personne ne pouvait dire ce qu'ils avaient fait. Ils laissent une trace au journal d'audit,
  mais personne ne lit un journal d'audit spontanément — c'est la leçon du chantier 55, et elle vaut
  aussi pour ce qu'on écrit soi-même.

  ⚠️ **Le test qui compte est celui des TROIS états.** « Jamais intervenu » et « je n'ai pas pu
  lire » se ressemblent à l'écran et ne veulent pas du tout dire la même chose : le premier signifie
  que la plateforme n'a rien eu à réparer, le second qu'on n'en sait rien.
*/
describe('E5 — entretien automatique (chantier 56)', () => {
  /** Doublure du journal : une entrée par action, ou aucune, ou un échec. */
  function journal(reponses: Record<string, { items: AuditEntry[] } | 'echec'>) {
    vi.spyOn(api, 'auditLog').mockImplementation(async (q = {}) => {
      const r = reponses[q.action ?? ''] ?? { items: [] }
      if (r === 'echec') throw new Error('réseau')
      return { ...r, nextCursor: null }
    })
  }

  const entree = (iso: string): AuditEntry =>
    ({ id: 'a1', actorType: 'system', action: 'x', resource: null, createdAt: iso }) as unknown as AuditEntry

  it('annonce les trois balayages, et ce qu’ils font', async () => {
    journal({})
    monter()

    expect(await screen.findByText(/Entretien automatique/)).toBeInTheDocument()
    expect(screen.getByText(/Fichiers sans propriétaire effacés/)).toBeInTheDocument()
    expect(screen.getByText(/Retraits débités sans issue, repris/)).toBeInTheDocument()
    expect(screen.getByText(/Notifications critiques abandonnées/)).toBeInTheDocument()
  })

  it('dit quand le balayage est passé pour la dernière fois', async () => {
    journal({ 'storage.orphans.swept': { items: [entree(new Date(Date.now() - 2 * 3600e3).toISOString())] } })
    monter()

    expect(await screen.findByText(/il y a 2 h/)).toBeInTheDocument()
  })

  /*
    « Jamais » est une BONNE nouvelle : le balayage n'a rien eu à réparer. Il ne faut donc ni
    l'alarmer ni le cacher — seulement le dire.
  */
  it('dit « jamais » quand le serveur a répondu, et n’a rien à montrer', async () => {
    journal({})
    monter()

    await screen.findByText(/Entretien automatique/)
    expect(screen.getAllByText('jamais')).toHaveLength(3)
  })

  /*
    ── LE test de ce bloc ────────────────────────────────────────────────────────────────────

    Conclure « rien à signaler » d'une requête tombée laisserait croire à un administrateur que la
    nuit s'est bien passée. Une lecture qui échoue n'est ni un zéro ni un « non ».
  */
  it('ne dit JAMAIS « jamais » quand la lecture a échoué', async () => {
    journal({ 'storage.orphans.swept': 'echec' })
    monter()

    expect(await screen.findByText(/lecture impossible/)).toBeInTheDocument()
    // Les deux autres ont bien répondu : eux disent « jamais ».
    expect(screen.getAllByText('jamais')).toHaveLength(2)
  })
})
