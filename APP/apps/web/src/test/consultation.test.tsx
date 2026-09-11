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
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConsultationPage } from '@/modules/consultation/pages/ConsultationPage'
import { BulleFormatageGlobale } from '@/components/ulamu/BulleFormatageGlobale'
import { barresQuiTiennent, formatDureeVocale, ramenerHauteurs } from '@/modules/consultation/onde-vocale'
import { useSessionStore } from '@/state/session.store'
import { api, lireMediaSession, type CareSession, type CareSessionStatus, type MeResponse, type SessionMessage } from '@/lib/api'

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

/** Le squelette d'une demande — seuls `sessionId` et `offerPriceXaf` comptent pour ces tests. */
const demandeVide = {
  id: 'h0',
  status: 'PAID' as const,
  patientAccountId: 'pat-1',
  professionalId: 'pro-1',
  offerId: 'o1',
  subProfileId: null,
  initiatedAt: '2026-08-24T08:00:00.000Z',
  confirmedAt: null,
  confirmExpiresAt: null,
  refusalReason: null,
  windowExpiresAt: null,
  windowRemainingSeconds: 0,
  sessionId: null as string | null,
  patientFirstName: 'Mireille',
  patientAge: 32,
  offerLabel: 'Consultation',
  offerDurationMin: 30,
  offerPriceXaf: 5000 as number | null,
}

/*
  ⚠️ Depuis le chantier 76, le `h1` de C5 porte le MOTIF de la consultation (« Palpitations
  nocturnes… »), plus le mot « Consultation ». Les attentes de montage visent donc le titre de
  premier niveau quel que soit son texte : ce qu'elles vérifient est que l'écran est MONTÉ, pas ce
  qu'il s'appelle. Le nom, lui, a ses propres tests plus bas.
*/
/**
 * Ouvre un onglet du rail et rend son panneau — chantier 83.
 *
 * ⚠️ **C'est le coût assumé des onglets, et il fallait le payer quelque part.** Les cartes du rail
 * vivent désormais derrière des onglets : une carte qu'on ne regarde pas n'est **pas montée**. Onze
 * tests sont tombés d'un coup en découvrant cela, et ils avaient raison de tomber — ils disaient
 * une vérité qui a cessé d'être vraie.
 *
 * On rend le PANNEAU pour que les assertions s'y limitent : plusieurs onglets portent le même mot
 * que la carte qu'ils ouvrent (« Honoraires », « Compte-rendu »), et une recherche par texte sur
 * toute la page en trouverait deux.
 */
async function ouvrir(nom: string): Promise<HTMLElement> {
  const utilisateur = userEvent.setup()
  await utilisateur.click(await screen.findByRole('tab', { name: new RegExp('^' + nom) }))
  return screen.getByRole('tabpanel')
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
  /*
    Les DEMANDES, lues depuis le chantier 76 : c'est là que vit le prix payé par le patient, que la
    séance elle-même ne porte pas. Sans cette doublure, l'appel partait pour de vrai — et huit tests
    de C7 tombaient sur l'épuisement de leur délai, en accusant le compte-rendu.

    C'est le piège exact noté à la passation : **un nouvel appel non bouchonné fait basculer des
    tests existants**, et le message d'échec désigne alors n'importe quoi sauf la cause.
  */
  if (!vi.isMockFunction(api.myHandshakes)) {
    vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items: [] })
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
      {/*
        ── La bulle de mise en forme, comme dans l'application (chantier 87) ────────────────────

        Elle n'appartient plus à cet écran : la coquille la monte UNE fois pour toute
        l'application, et elle s'attache d'elle-même à n'importe quelle zone de saisie. Le harnais
        la monte donc aussi, sinon il testerait un écran qui n'existe nulle part.

        Sa présence ici ne prouve pas le « partout » — c'est `bulle-formatage.test.tsx` qui s'en
        charge, sur un champ qui n'a rien à voir avec une consultation.
      */}
      <BulleFormatageGlobale />
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { level: 1 })
}

const fil = () => within(screen.getByRole('region', { name: 'Fil de la consultation' }))

/**
 * `lireMediaSession` fait un `fetch` avec jeton puis fabrique une URL `blob:` — deux choses que
 * jsdom ne sait pas faire. C'est un export AUTONOME du module, pas une méthode de `api` : on ne
 * peut pas l'espionner, il faut remplacer le module.
 *
 * ⚠️ Son comportement par défaut reste l'ÉCHEC, posé dans le `beforeEach`. Plusieurs tests
 * s'appuient dessus : ils s'ancrent sur « Média indisponible. » pour trouver une bulle de photo.
 * Le faire réussir par défaut les casserait tous — *une doublure qui change le comportement par
 * défaut change des tests qui ne parlent pas d'elle.*
 */
vi.mock('@/lib/api', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/api')>()
  return { ...reel, lireMediaSession: vi.fn() }
})

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(lireMediaSession).mockRejectedValue(new Error('média non simulé'))
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
    await ouvrir('Compte-rendu')

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
    await ouvrir('Compte-rendu')

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
    await ouvrir('Compte-rendu')
    await utilisateur.type(await screen.findByLabelText('Diagnostic'), 'Tachycardie')

    await waitFor(() => expect(localStorage.getItem('ulamu-compte-rendu-s1')).toContain('Tachycardie'))
  })

  it('déposé, il annonce que les gains sont crédités (RM-06-04)', async () => {
    await monter(seance({ status: 'ENDED', reportDepositedAt: '2026-08-24T09:00:00.000Z' }))
    await ouvrir('Compte-rendu')
    expect(await screen.findByText(/vos gains sont crédités/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Déposer le compte-rendu/ })).not.toBeInTheDocument()
  })

  /*
    ── Ce que le porteur a rencontré, et que l'écran promettait à tort (chantier 89) ────────────

    L'avertissement disait : « Déposez tout de même : **le serveur tranchera** ». Le serveur ne
    tranchait rien — il **refusait**, définitivement, et aucune administration ne pouvait forcer.
    Le porteur l'a découvert en essayant de déposer son compte-rendu.

    Depuis, le serveur accepte le dépôt tardif **sans créditer** : le dossier du patient est sauvé,
    la sanction reste entière. La phrase doit dire cela, et rien d'autre.

    ⚠️ **Le filet ne pouvait pas voir ce mensonge** : il recense les phrases qui énoncent une
    LIMITE (jamais, aucun, ne… pas, seul, sans, refuse, interdit). Celle-ci **autorisait**. *Un
    écran qui promet à tort qu'on PEUT envoie dans le mur aussi sûrement qu'un écran qui refuse à
    tort.*
  */
  it('hors délai, il ne promet plus un arbitrage qui n’existe pas', async () => {
    await monter(close(-336))
    await ouvrir('Compte-rendu')

    const avis = await screen.findByText(/Le délai de dépôt est dépassé/)
    expect(avis).toHaveTextContent(/gelés et le resteront/)
    expect(avis).toHaveTextContent(/il rejoindra le Carnet du patient/)
    // La phrase qui mentait ne doit plus exister nulle part.
    expect(screen.queryByText(/le serveur tranchera/)).not.toBeInTheDocument()
  })

  /* Et le bouton reste : le compte-rendu est attendu, et le serveur l'accepte désormais. */
  it('et le bouton de dépôt reste offert', async () => {
    await monter(close(-336))
    await ouvrir('Compte-rendu')

    expect(await screen.findByRole('button', { name: /Déposer le compte-rendu/ })).toBeInTheDocument()
  })

  /*
    ⚠️ Déposé APRÈS l'échéance, l'écran ne doit surtout pas annoncer des gains crédités : ils ne le
    sont pas, et ils ne le seront pas. *Une phrase vraie neuf fois sur dix est un piège la dixième.*
  */
  it('déposé hors délai, il dit que les gains restent gelés', async () => {
    await monter(
      seance({
        status: 'ENDED',
        remainingSeconds: 0,
        endedAt: '2026-08-24T08:32:00.000Z',
        reportDueAt: '2026-08-25T08:32:00.000Z',
        reportDepositedAt: '2026-08-28T09:00:00.000Z',
      }),
    )
    await ouvrir('Compte-rendu')

    expect(await screen.findByText(/vos gains restent gelés/i)).toBeInTheDocument()
    expect(screen.getByText(/le dossier du patient est complet/i)).toBeInTheDocument()
    expect(screen.queryByText(/vos gains sont crédités/i)).not.toBeInTheDocument()
  })

  /* Et déposé DANS le délai, rien ne change : les gains sont bien crédités. */
  it('déposé dans le délai, il annonce toujours les gains crédités', async () => {
    await monter(
      seance({
        status: 'ENDED',
        remainingSeconds: 0,
        endedAt: '2026-08-24T08:32:00.000Z',
        reportDueAt: '2026-08-25T08:32:00.000Z',
        reportDepositedAt: '2026-08-24T09:00:00.000Z',
      }),
    )
    await ouvrir('Compte-rendu')

    expect(await screen.findByText(/vos gains sont crédités/i)).toBeInTheDocument()
    expect(screen.queryByText(/restent gelés/i)).not.toBeInTheDocument()
  })
})

describe('C5 — ce que le professionnel ne peut pas faire', () => {
  it('aucun bouton pour terminer la séance : seul le patient annule (EF-06-10)', async () => {
    await monter(seance())
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('button', { name: /Terminer/ })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Terminer la consultation')
  })

  it('aucun composeur hors d’une séance active (RM-06-03)', async () => {
    await monter(seance({ status: 'ENDED', endedAt: '2026-08-24T08:32:00.000Z', remainingSeconds: 0 }))
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByLabelText('Votre message')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument()
    // Mais le fil reste lisible : une consultation close s'archive, elle ne disparaît pas.
    expect(fil().getByText(/l'échange est clos/i)).toBeInTheDocument()
  })

  it('la prolongation disparaît une fois le plafond de 30 minutes atteint (PM-29)', async () => {
    await monter(seance({ extensionTotalSec: 1800 }))
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: /Prolonger/ })).not.toBeInTheDocument()
  })

  it('la prolongation est offerte tant que le plafond n’est pas atteint (EF-06-07)', async () => {
    const utilisateur = userEvent.setup()
    const prolonger = vi.spyOn(api, 'extendSession').mockResolvedValue(seance({ extensionTotalSec: 600 }))
    await monter(seance({ extensionTotalSec: 600 }))
    await ouvrir('Prolonger')

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
    expect(await fil().findByText(/Message supprimé/)).toBeInTheDocument()
  })

  /*
    ⚠️ **L'espacement du fil vient du téléphone** (chantier 96) : 10 px entre deux messages, 2 px
    quand ils sont groupés (`SessionScreen.tsx` : `marginTop: grouped ? 2 : 10`). Le web était à 12
    et 6 — un fil plus aéré, donc moins de messages à l'écran, et surtout un regroupement qui ne se
    LISAIT plus comme un bloc.

    *Deux messages d'affilée du même auteur doivent presque se toucher : c'est l'écart qui dit « la
    même voix continue ». À 6 px, ils redevenaient deux prises de parole.*
  */
  it('⚠️ deux messages du même auteur se touchent presque, comme sur le téléphone', async () => {
    const t0 = '2026-08-24T08:00:00.000Z'
    await monter(seance(), [
      message({ id: 'm1', senderId: 'pro-1', body: 'Premier', createdAt: t0 }),
      // Moins de cinq minutes plus tard, même auteur : les deux se regroupent.
      message({ id: 'm2', senderId: 'pro-1', body: 'Second', createdAt: '2026-08-24T08:01:00.000Z' }),
    ])

    await fil().findByText('Premier')
    const second = fil().getByText('Second').closest('li') as HTMLElement
    const liste = second.closest('ul') as HTMLElement

    // 10 px d'écart de base…
    expect(liste.className).toMatch(/gap-2\.5/)
    // …dont 8 sont repris quand le message continue le précédent : il reste 2 px.
    expect(second.className).toMatch(/ -mt-2$/)
  })

  /*
    ⚠️ **Et cette trace garde la forme d'une BULLE** (chantier 96, alignement sur le téléphone).

    Le web en faisait une pilule à bordure POINTILLÉE — une grammaire qu'on ne voit nulle part
    ailleurs dans le fil. À la place du message, une forme étrangère. Le téléphone, lui, garde le
    gabarit : même rayon, même coin rabattu, fond éteint, phrase en italique.

    *Ce qui a disparu, c'est le contenu, pas le tour de parole. L'espace qu'il occupait dans la
    conversation, lui, a bien existé.*
  */
  it('⚠️ et cette trace garde la forme d’une bulle, pas d’un pointillé', async () => {
    await monter(seance(), [message({ deletedAt: '2026-08-24T08:05:00.000Z', body: null })])

    const trace = await fil().findByText(/Message supprimé/)

    expect(trace.className).not.toMatch(/border-dashed/)
    expect(trace.className).toMatch(/rounded-xl/)
    // Le coin rabattu du côté de l'expéditeur — celui des vraies bulles.
    expect(trace.className).toMatch(/rounded-(br|bl)-\[3px\]/)
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

    /*
      ⚠️ Les symptômes apparaissent DEUX fois depuis le chantier 76 — en titre de l'écran et dans
      le rail — et c'est voulu : le titre sert à reconnaître la séance, le rail à la lire en entier.
      L'assertion vise donc le rail, seul endroit où le TEXTE COMPLET doit figurer.
    */
    const rail = (await screen.findByText('Contexte patient')).closest('section') as HTMLElement
    expect(within(rail).getByText('Palpitations nocturnes depuis trois nuits.')).toBeInTheDocument()
    expect(within(rail).getByText('3 jours')).toBeInTheDocument()
  })

  /*
    ══════════════════════════════════════════════════════════════════════════════════════════════
    CHANTIER 76 — la consultation prend un nom
    ══════════════════════════════════════════════════════════════════════════════════════════════

    Le titre était le mot « Consultation ». Trois séances ouvertes dans la journée donnaient trois
    onglets identiques : impossible de les distinguer. Le motif était pourtant servi depuis
    toujours — rangé tout en bas du rail de droite, là où on ne le cherche pas.
  */
  it('le titre porte le motif, pas le mot « Consultation »', async () => {
    await monter(seance())

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Palpitations nocturnes depuis trois nuits.',
    )
  })

  /*
    ⚠️ Sans pré-consultation, on ne devine pas. Une séance en préparation n'a pas encore de motif :
    fabriquer un nom à partir de rien serait pire que le mot générique, parce qu'on lui ferait
    confiance.
  */
  it('sans pré-consultation, le titre reste générique plutôt qu’inventé', async () => {
    await monter(seance({ status: 'PREPARING', preConsultation: null }))

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Consultation')
  })

  /*
    La référence de la séance : c'est elle qu'on dicte au support et qu'on cherche dans le registre.
    La maquette la met au fil d'Ariane ; le nôtre est calculé par la coquille et ne sait pas porter
    une valeur d'écran — elle vit donc sous le titre.
  */
  /*
    ── Ce que la séance rapporte — chantier 76 ────────────────────────────────────────────────

    L'écran où un médecin passe trente minutes ne disait nulle part ce qu'elles lui rapportent.

    ⚠️ Le montant n'est pas sur la séance : il vit sur la DEMANDE qui l'a précédée
    (`offerPriceXaf`), reliée par `sessionId`. La jointure se fait côté écran, sur une route que le
    client appelle déjà ailleurs.
  */
  it('affiche ce que le patient a payé pour CETTE séance', async () => {
    vi.spyOn(api, 'myHandshakes').mockResolvedValue({
      items: [
        { ...demandeVide, id: 'h-autre', sessionId: 'autre-seance', offerPriceXaf: 99_000 },
        { ...demandeVide, id: 'h1', sessionId: 's1', offerPriceXaf: 5000 },
      ],
    })
    await monter(seance({ id: 's1' }))

    const bloc = await ouvrir('Honoraires')
    expect(within(bloc).getByText(/5\s?000 F/)).toBeInTheDocument()
    // Le prix de l'AUTRE séance ne doit pas fuiter ici.
    expect(within(bloc).queryByText(/99\s?000/)).not.toBeInTheDocument()
  })

  /*
    ⚠️ Une jointure qui n'aboutit pas n'est ni un zéro ni « gratuit ». Sans demande correspondante —
    lecture en échec, ou séance sans demande liée — le bloc ne s'affiche pas du tout.
  */
  it('sans demande correspondante, aucun montant n’est inventé', async () => {
    vi.spyOn(api, 'myHandshakes').mockResolvedValue({ items: [] })
    await monter(seance({ id: 's1' }))
    await screen.findByText('Contexte patient')

    // Ni la carte, ni l'ONGLET : sans montant lisible, aucun chemin ne mène à un montant inventé.
    expect(screen.queryByRole('tab', { name: /Honoraires/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Honoraires')).not.toBeInTheDocument()
  })

  /*
    ⚠️ Et on n'écrit JAMAIS le net ici. La commission vient du contrat signé du soignant (RM-13-07)
    et diffère d'un médecin à l'autre : l'écran ne peut que lire ce qui a été prélevé, et cette
    lecture n'existe qu'au dépôt du compte-rendu. Afficher un net calculé serait un chiffre faux.
  */
  it('ne calcule pas le net : il renvoie à Mes gains', async () => {
    vi.spyOn(api, 'myHandshakes').mockResolvedValue({
      items: [{ ...demandeVide, id: 'h1', sessionId: 's1', offerPriceXaf: 5000 }],
    })
    await monter(seance({ id: 's1' }))

    const bloc = await ouvrir('Honoraires')
    expect(within(bloc).getByText(/se lit dans Mes gains/)).toBeInTheDocument()
    expect(within(bloc).queryByText(/4\s?500/)).not.toBeInTheDocument()
  })

  /*
    ── La ligne qui ouvre le fil — chantier 76 ────────────────────────────────────────────────

    C'est le seul endroit où la garantie de chiffrement se dit DANS le fil, là où les messages
    passent. Le sous-titre du panneau la dit aussi, mais on ne le relit pas en défilant.

    ⚠️ Écrite après l'injection : la faute qui remplaçait cette phrase par « Fil » n'a réveillé
    personne, et les 77 tests passaient.
  */
  it('le fil s’ouvre en rappelant le chiffrement de bout en bout', async () => {
    await monter(seance(), [message({ id: 'm1', body: 'Bonjour' })])

    expect(await screen.findByText(/Consultation ouverte · échange chiffré de bout en bout/)).toBeInTheDocument()
  })

  /*
    Et pas sur un fil vide : la phrase d'état juste en dessous dit déjà tout, et deux phrases pour
    un fil vide, c'est du bruit.
  */
  it('mais pas sur un fil vide', async () => {
    await monter(seance(), [])
    await screen.findByText('Contexte patient')

    expect(screen.queryByText(/Consultation ouverte · échange chiffré/)).not.toBeInTheDocument()
  })

  it('la référence de la séance est lisible sous le titre', async () => {
    await monter(seance({ id: '573dcccb-91e7-4435-bb65-84219c5336e5' }))

    expect(await screen.findByText(/573DCCCB/)).toBeInTheDocument()
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
/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  CHANTIER 75 — les médias : ce que le serveur acceptait et que l'écran n'offrait pas
  ══════════════════════════════════════════════════════════════════════════════════════════════

  `SendMessageDto` accepte quatre types de message — `TEXT`, `PHOTO`, **`VOICE`**, `DOCUMENT` — et
  un **album de dix photos** (`fileKeys`). Le web n'envoyait que du texte et UNE photo à la fois :
  dixième occurrence du motif « la capacité existe, l'écran ne l'offre pas ».

  Et la limite de taille se découvrait par l'échec : le serveur accepte ~84 Mo à l'entrée et refuse
  au-delà de 8 Mo au stockage. Un fichier trop lourd traversait le réseau EN ENTIER avant d'être
  rejeté.
*/
describe('C5 — les emoji (chantier 78)', () => {
  /*
    Les emoji des MESSAGES deviennent des images servies par le site. Sans cela, le même caractère
    est dessiné par chaque appareil — et un patient qui envoie 😟 peut être lu comme un carré vide
    par son soignant.
  */
  it('un emoji reçu est rendu en image, pas en caractère système', async () => {
    await monter(seance(), [message({ id: 'm1', body: 'Merci docteur 🙏' })])

    const img = await screen.findByRole('img', { name: '🙏' })
    expect(img.style.backgroundImage).toContain('emoji/apple-64.png')
  })

  it('un message qui n’est que des emoji se rend en grand', async () => {
    await monter(seance(), [message({ id: 'm1', body: '👍' })])

    const img = await screen.findByRole('img', { name: '👍' })
    // 34 px : la taille du rendu « réaction », contre 18 px dans une phrase.
    expect(img.style.width).toBe('34px')
  })

  it('mêlé à du texte, il garde la taille d’un mot', async () => {
    await monter(seance(), [message({ id: 'm1', body: 'Bien reçu 👍' })])

    expect((await screen.findByRole('img', { name: '👍' })).style.width).toBe('18px')
  })

  /*
    ⚠️ Le sélecteur INSÈRE dans le brouillon, il n'envoie pas : on compose une phrase, on n'expédie
    pas un emoji isolé par accident.
  */
  it('le sélecteur insère dans le brouillon au lieu d’envoyer', async () => {
    const envoi = vi.spyOn(api, 'sendMessage')
    await monter(seance())

    fireEvent.click(await screen.findByRole('button', { name: 'Choisir un emoji' }))
    const bouton = await screen.findByRole('button', { name: '👍' })
    fireEvent.click(bouton)

    expect(screen.getByLabelText('Votre message')).toHaveValue('👍')
    expect(envoi).not.toHaveBeenCalled()
  })
})

describe('C5 — les photos (chantier 75)', () => {
  /** Une vraie image, assez petite pour qu'aucune règle ne la refuse. */
  const photo = (nom: string, octets = 1024) => {
    const f = new File([new Uint8Array(octets)], nom, { type: 'image/jpeg' })
    Object.defineProperty(f, 'size', { value: octets })
    return f
  }

  /*
    ⚠️ Choisir n'est plus envoyer. Dans une consultation, une photo est un acte médical : on veut
    voir ce qu'on transmet avant de le transmettre, et pouvoir renoncer.
  */
  it('choisir des photos ouvre un aperçu au lieu de les envoyer', async () => {
    const envoi = vi.spyOn(api, 'sendMessage')
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('a.jpg'), photo('b.jpg')] } })

    expect(await screen.findByText(/2 photos à envoyer/)).toBeInTheDocument()
    // Rien n'est parti : c'est un aperçu, pas un envoi.
    expect(envoi).not.toHaveBeenCalled()
  })

  /*
    ⚠️ Le poids est dit AVANT, avec la limite. C'est le défaut que ce chantier corrige : un fichier
    de 12 Mo traversait tout le réseau pour se faire refuser à l'arrivée.
  */
  it('un fichier trop lourd est refusé avec son poids ET la limite, avant tout envoi', async () => {
    const envoi = vi.spyOn(api, 'sendMessage')
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('enorme.jpg', 12 * 1024 * 1024)] } })

    // Le poids apparaît DEUX fois, et c'est voulu : sous la vignette (ce qu'on a choisi) et dans le
    // refus (pourquoi ça ne part pas). On vise le refus, qui est le seul à porter la limite.
    const refus = await screen.findByText(/12,0 Mo — maximum 8,0 Mo par fichier/)
    expect(refus).toBeInTheDocument()
    expect(envoi).not.toHaveBeenCalled()
  })

  /*
    L'album : le serveur accepte dix clés dans UNE bulle (`fileKeys`), et le fil savait déjà les
    afficher (`mediaKeys`). Dix bulles pour une éruption photographiée sous dix angles rendraient
    le fil illisible.
  */
  it('plusieurs photos partent dans UNE seule bulle', async () => {
    vi.spyOn(api, 'uploadSessionMedia')
      .mockResolvedValueOnce({ fileKey: 'k1' })
      .mockResolvedValueOnce({ fileKey: 'k2' })
    const envoi = vi.spyOn(api, 'sendMessage').mockResolvedValue({} as never)
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('a.jpg'), photo('b.jpg')] } })
    fireEvent.click(await screen.findByRole('button', { name: /Envoyer les 2 photos/ }))

    await waitFor(() => expect(envoi).toHaveBeenCalledTimes(1))
    expect(envoi.mock.calls[0]![1]).toMatchObject({ kind: 'PHOTO', fileKeys: ['k1', 'k2'] })
  })

  /*
    Une seule photo garde `fileKey` : c'est la forme que le serveur a toujours reçue, et rien ne
    gagne à envoyer un tableau d'un élément.
  */
  it('une seule photo garde la forme d’origine', async () => {
    vi.spyOn(api, 'uploadSessionMedia').mockResolvedValue({ fileKey: 'k1' })
    const envoi = vi.spyOn(api, 'sendMessage').mockResolvedValue({} as never)
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('a.jpg')] } })
    fireEvent.click(await screen.findByRole('button', { name: /Envoyer la photo/ }))

    await waitFor(() => expect(envoi).toHaveBeenCalled())
    const dto = envoi.mock.calls[0]![1] as Record<string, unknown>
    expect(dto.fileKey).toBe('k1')
    expect(dto.fileKeys).toBeUndefined()
  })

  /*
    ⚠️ Le test que l'injection a réclamé.

    Un fichier refusé doit rester AU SOL. En posant la faute — « Envoyer » expédiant tout ce qui est
    sélectionné au lieu des seuls fichiers valides — les 70 tests passaient : le trop-lourd serait
    reparti sur le réseau pour se faire refuser à l'arrivée, c'est-à-dire exactement le défaut que
    ce chantier corrige.

    *Afficher un refus ne sert à rien si le bouton ne le respecte pas.*
  */
  it('les fichiers refusés ne partent pas, les autres oui', async () => {
    vi.spyOn(api, 'uploadSessionMedia').mockResolvedValue({ fileKey: 'k1' })
    const envoi = vi.spyOn(api, 'sendMessage').mockResolvedValue({} as never)
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('ok.jpg'), photo('enorme.jpg', 12 * 1024 * 1024)] } })

    // Le bouton ne propose QUE ce qui peut partir : une photo, pas deux.
    fireEvent.click(await screen.findByRole('button', { name: /Envoyer la photo/ }))

    await waitFor(() => expect(envoi).toHaveBeenCalled())
    const dto = envoi.mock.calls[0]![1] as Record<string, unknown>
    expect(dto.fileKey).toBe('k1')
    expect(dto.fileKeys).toBeUndefined()
  })

  it('on peut renoncer : l’aperçu se ferme sans rien envoyer', async () => {
    const envoi = vi.spyOn(api, 'sendMessage')
    await monter(seance())

    const champ = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(champ, { target: { files: [photo('a.jpg')] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByText(/photo à envoyer/)).not.toBeInTheDocument())
    expect(envoi).not.toHaveBeenCalled()
  })
})

describe('C5 — la note vocale (chantier 75)', () => {
  /*
    ⚠️ jsdom n'a pas de `MediaRecorder`. C'est donc exactement l'état « aucun format commun » — et
    le micro DOIT être désactivé en disant pourquoi, jamais ouvrir un enregistreur qui produira un
    fichier que le serveur refusera.
  */
  it('sans format audio commun, le micro est désactivé et dit pourquoi', async () => {
    await monter(seance())

    const micro = await screen.findByRole('button', { name: /Enregistrer une note vocale/i })
    expect(micro).toBeDisabled()
    expect(micro.getAttribute('title')).toMatch(/aucun format audio accepté/i)
  })
})

describe('C5 — les bulles, comme sur le téléphone (chantier 92)', () => {
  /** La bulle d'un message, visée par sa STRUCTURE et non par une classe d'apparence. */
  const bulleDe = (texte: string) =>
    (screen.getByText(texte).closest('.relative')?.querySelector(':scope > div')) as HTMLElement

  /*
    ── Ce que le porteur voyait sans pouvoir le nommer ──────────────────────────────────────────

    Sur le téléphone, MA bulle est d'un accent saturé avec du texte blanc. Sur le web, elle était
    d'un bleu très clair avec du texte normal. C'est la différence principale, et elle entraîne
    tout le reste : citation, lecteur vocal, poignée, heure et accusés doivent passer en encre
    claire. *Changer un fond, c'est changer tout ce qu'il porte.*
  */
  it('ma bulle porte l’accent saturé et du texte blanc', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', body: 'à moi' })])
    await fil().findByText('à moi')

    const bulle = bulleDe('à moi')
    expect(bulle.className).toMatch(/bg-\[var\(--ap-400\)\]/)
    expect(bulle.className).toMatch(/text-white/)
  })

  it('et celle de l’autre garde le fond de carte', async () => {
    await monter(seance(), [message({ senderId: 'pat-1', body: 'à lui' })])
    await fil().findByText('à lui')

    const bulle = bulleDe('à lui')
    expect(bulle.className).toMatch(/bg-card/)
    expect(bulle.className).not.toMatch(/bg-\[var\(--ap-400\)\]/)
  })

  /*
    Le coin RABATTU du côté de l'expéditeur — c'est lui qui donne la pointe, et c'est ce qui
    manquait le plus à l'œil. En bas à droite pour moi, en bas à gauche pour l'autre.
  */
  it('le coin rabattu tombe du côté de l’expéditeur', async () => {
    await monter(seance(), [
      message({ id: 'a', senderId: 'pro-1', body: 'à moi' }),
      message({ id: 'b', senderId: 'pat-1', body: 'à lui' }),
    ])
    await fil().findByText('à moi')

    expect(bulleDe('à moi').className).toMatch(/rounded-br-\[3px\]/)
    expect(bulleDe('à lui').className).toMatch(/rounded-bl-\[3px\]/)
  })

  /*
    ⚠️ **Un message qui n'est QUE des emoji n'a plus de bulle** — la demande du porteur, et la
    convention de WhatsApp. Un « 👍 » posé sur un rectangle coloré ressemble à un autocollant
    encadré ; posé sur le fil, il ressemble à ce qu'il est : un geste.
  */
  it('un message tout en emoji n’a ni fond ni bord', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', body: '👍' })])
    await fil().findByRole('img', { name: '👍' })

    const bulle = (document.querySelector('li[id^="msg-"] .relative > div')) as HTMLElement
    expect(bulle.className).not.toMatch(/bg-\[var\(--ap-400\)\]|bg-card|border/)
  })

  /* Mais avec du texte autour, la bulle revient : ce n'est plus un geste, c'est une phrase. */
  it('mais un emoji dans une phrase garde sa bulle', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', body: 'merci 👍 beaucoup' })])
    await fil().findByText(/merci/)

    const bulle = (document.querySelector('li[id^="msg-"] .relative > div')) as HTMLElement
    expect(bulle.className).toMatch(/bg-\[var\(--ap-400\)\]/)
  })

  /*
    L'heure passe DANS la bulle, comme sur le téléphone. *Une bulle avec sa marque temporelle à
    l'intérieur se lit comme un bloc ; la même avec l'heure en dessous se lit comme un texte suivi
    d'un commentaire.*
  */
  it('l’heure est DANS la bulle, plus en dessous', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', body: 'à moi' })])
    await fil().findByText('à moi')

    const bulle = bulleDe('à moi')
    expect(bulle.textContent).toMatch(/\d{1,2}:\d{2}/)
  })

  /*
    ⚠️ Et l'accusé « lu » ne peut plus être `--ap-600` sur MA bulle : ce serait du bleu sur du
    bleu. *Une couleur ne se choisit pas dans l'absolu, elle se choisit contre le fond qui la
    porte.*
  */
  it('l’accusé « lu » se détache de l’accent au lieu de s’y fondre', async () => {
    await monter(seance(), [message({ senderId: 'pro-1', body: 'à moi', status: 'read' })])
    await fil().findByText('à moi')

    const coche = fil().getByLabelText('Lu')
    expect(coche.getAttribute('class')).not.toMatch(/text-\[var\(--ap-600\)\]/)
  })
})

describe('C5 — la note vocale (chantier 90)', () => {
  /**
   * Le média est servi par `lireMediaSession`. Sans cette doublure, la bulle affiche « Média
   * indisponible » et le lecteur n'existe jamais — on testerait l'écran d'échec.
   */
  const servirUnSon = () =>
    vi.mocked(lireMediaSession).mockResolvedValue({ url: 'blob:note', type: 'audio/mp4' })

  const vocal = (over: Partial<SessionMessage> = {}) =>
    message({ senderId: 'pat-1', kind: 'VOICE', fileKey: 'k-audio', mediaKeys: [], body: '76', ...over })

  /*
    ── ⚠️ Le défaut vu sur une VRAIE consultation, pas dans le code ─────────────────────────────

    Le mobile envoie la durée en secondes dans `body` (`emit('VOICE', { body: '76' })`). Le web
    l'affichait comme une légende : sous chaque note vocale venue d'un téléphone, on lisait un
    « 76 » qui ne voulait rien dire.

    *Un champ qui change de signification selon un autre champ est un piège que les types ne
    rattrapent pas — `body: string | null` ne dit rien de ce basculement.*
  */
  it('n’affiche plus la durée comme une légende — le « 76 » a disparu', async () => {
    servirUnSon()
    await monter(seance(), [vocal()])

    expect(await fil().findByLabelText('Écouter la note vocale')).toBeInTheDocument()
    expect(fil().queryByText('76')).not.toBeInTheDocument()
  })

  it('et la durée s’affiche en clair, avant même que le son soit chargé', async () => {
    servirUnSon()
    await monter(seance(), [vocal()])

    // 76 secondes annoncées par l'expéditeur → « 1:16 », sans attendre les métadonnées.
    expect(await fil().findByText('1:16')).toBeInTheDocument()
  })

  /*
    Mais `body` reste du TEXTE partout ailleurs : une légende écrite à la main doit s'afficher.
    Sans cette distinction, on effacerait un vrai message sous prétexte qu'il accompagne un son.
  */
  it('une légende écrite reste affichée', async () => {
    servirUnSon()
    await monter(seance(), [vocal({ body: 'écoutez à partir de la fin' })])

    expect(await fil().findByText('écoutez à partir de la fin')).toBeInTheDocument()
  })

  /*
    ── L'onde, et ce qu'elle promet ─────────────────────────────────────────────────────────────

    Sous jsdom il n'y a pas de `AudioContext` : le décodage échoue, et le lecteur doit afficher des
    barres ÉGALES. **C'est exactement ce qu'on veut vérifier** — *un dessin au hasard prétend dire
    quelque chose du son ; des barres égales n'affirment rien.* Le mobile, lui, dessine une onde
    pseudo-aléatoire faute de pouvoir décoder ; le web ne l'imite pas.
  */
  it('sans décodage possible, l’onde est NEUTRE — elle n’invente pas un son', async () => {
    servirUnSon()
    await monter(seance(), [vocal()])
    await fil().findByLabelText('Écouter la note vocale')

    const barres = [...document.querySelectorAll('[aria-hidden="true"] > span[style*="height"]')]
    expect(barres.length).toBeGreaterThanOrEqual(36)
    const hauteurs = new Set(barres.slice(0, 36).map((b) => (b as HTMLElement).style.height))
    expect(hauteurs.size).toBe(1)
  })

  /*
    ── ⚠️ L'onde qui n'avait plus de place (chantier 95) ───────────────────────────

    Vu **en ligne, sur l'écran du porteur** : les deux lecteurs vocaux s'affichaient **sans onde du
    tout**. Mesuré dans la page — l'onde recevait **70 px**, là où trente-six barres de 3 px espacées
    de 2 px en réclament **178**. Les trente-cinq écarts consommaient les 70 px à eux seuls, et les
    barres, élastiques, tombaient à **0 px de large**.

    *Une densité relevée sur un téléphone n'est pas une densité : c'est un nombre de barres ET une
    largeur d'écran. Reprendre le nombre sans la largeur, c'est reprendre la moitié de la mesure.*

    Les trois tests ci-dessous tiennent la géométrie du mobile — 3 px de barre, 2 px d'écart — écrite
    ici à la main à dessein : si le composant change ses constantes, c'est à ces chiffres-là qu'il
    doit répondre.
  */
  it('⚠️ à TOUTE largeur, les barres gardent leurs 3 px — elles ne tombent jamais à zéro', () => {
    // 70 px : la largeur réellement mesurée sur l'écran du porteur, celle qui ne montrait rien.
    for (const largeur of [20, 38, 70, 109, 151, 178, 400]) {
      const combien = barresQuiTiennent(largeur)

      expect(combien * 3 + (combien - 1) * 2).toBeLessThanOrEqual(largeur)
      expect(combien).toBeGreaterThanOrEqual(1)
    }
  })

  /*
    Et la largeur de 70 px doit vraiment donner une onde, pas deux traits : c'est le cas concret vu
    en ligne, celui par lequel tout est parti.
  */
  it('et dans la bulle du porteur, il en reste de quoi lire le son', () => {
    expect(barresQuiTiennent(70)).toBeGreaterThanOrEqual(12)
  })

  it('mais dès qu’il y a la place, on retrouve les 36 du téléphone', () => {
    expect(barresQuiTiennent(36 * 3 + 35 * 2)).toBe(36)
    expect(barresQuiTiennent(400)).toBe(36)
  })

  /*
    Largeur encore inconnue : premier rendu, ou navigateur sans `ResizeObserver`. On garde les 36 du
    mobile plutôt qu'un plancher — *une onde complète qui rétrécit se remarque à peine ; un
    pointillé qui s'épaissit se voit.*
  */
  it('et tant que la largeur est inconnue, l’onde reste complète', () => {
    expect(barresQuiTiennent(0)).toBe(36)
  })

  /*
    ── ⚠️ La durée LUE, et non attendue (chantier 96) ──────────────────────────────────────────

    Vu en ligne sur la consultation du porteur : la MÊME note vocale affichait `1:16` en arrivant et
    `1:03` en y revenant. Le lecteur écoutait `onLoadedMetadata` par une propriété React ; quand le
    son est déjà en cache, le navigateur a la métadonnée AVANT que l'écouteur soit branché.
    L'évènement passe, personne ne l'entend, et la durée reste celle **annoncée par l'expéditeur** —
    ici 63 s, alors que le fichier en dure 76,7.

    *Un évènement qu'on n'a pas entendu n'a pas eu lieu. On lit l'état au montage, puis on écoute.*

    Le test reproduit exactement ce cas : la durée est DÉJÀ disponible, et aucun évènement ne sera
    jamais émis.
  */
  it('⚠️ affiche la durée du FICHIER même si l’évènement est passé avant elle', async () => {
    const vraie = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, 'duration')
    Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get: () => 76.693333,
    })

    try {
      servirUnSon()
      // `body: '63'` — la durée que l'expéditeur a annoncée, et qui est fausse.
      await monter(seance(), [vocal({ body: '63' })])
      await fil().findByLabelText('Écouter la note vocale')
      await act(async () => {})

      // 76,7 s arrondi : 1:17. Sans la lecture au montage, on lirait « 1:03 ».
      expect(await fil().findByText('1:17')).toBeInTheDocument()
      expect(fil().queryByText('1:03')).not.toBeInTheDocument()
    } finally {
      if (vraie) Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', vraie)
    }
  })

  /*
    ⚠️ **Et la durée s'ARRONDIT, elle ne se tronque pas.** Le mobile arrondissait, le web tronquait :
    pour ce même fichier de 76,7 s, le patient lisait `1:17` sur son téléphone et le soignant `1:16`
    sur son écran. Une seconde, sur la même note. Les deux lisent maintenant la même règle partagée.
  */
  it('et les deux applications arrondissent la même durée pareil', () => {
    expect(formatDureeVocale(76.693333)).toBe('1:17')
    expect(formatDureeVocale(8.419542)).toBe('0:08')
    expect(formatDureeVocale(59.6)).toBe('1:00')
  })

  /*
    ── ⚠️ L'ouverture de la consultation : un squelette, pas un rond (chantier 96) ─────────────

    L'écran affichait **une phrase et un rond qui tourne**, seuls sur une page vide, puis la page
    entière se posait d'un coup. Le FIL avait pourtant son squelette depuis le chantier 21 : c'est
    l'écran qui le contient qui n'en avait pas. *Le soin s'était arrêté à une porte.*

    `Squelette.tsx` dit la règle en tête : **un rond dit qu'on attend, un squelette dit ce qui
    arrive.** Devant une forme reconnaissable on prépare son geste ; et rien ne saute à l'arrivée,
    parce que la place est déjà réservée.

    ⚠️ Ce test vérifie les deux moitiés de cette règle, et la seconde est celle qu'on oublie : la
    phrase doit RESTER, pour qui n'a que le son. *Remplacer un texte par des rectangles gris, c'est
    un progrès pour l'œil et un recul pour tout le reste.*
  */
  it('⚠️ pendant l’ouverture, montre la FORME de la page — et garde la phrase pour l’oreille', async () => {
    // La séance ne répondra jamais : c'est exactement l'état « en cours d'ouverture ».
    vi.spyOn(api, 'session').mockReturnValue(new Promise(() => {}) as ReturnType<typeof api.session>)
    vi.spyOn(api, 'sessionMessages').mockResolvedValue({ items: [], nextCursor: null })
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

    // Pour l'oreille : la phrase est là, et la zone se déclare occupée.
    /*
      Plusieurs zones d'attente s'emboîtent — le fil et le rail ont chacun la leur. La première dans
      l'ordre du document est l'enveloppe de la page, celle qui porte la phrase d'ouverture.
    */
    const zone = (await screen.findAllByRole('status'))[0]
    expect(zone).toHaveAttribute('aria-busy', 'true')
    expect(within(zone).getByText('Ouverture de la consultation…')).toBeInTheDocument()

    /*
      Pour l'œil : la forme de la page, pas un rond. On compte les briques ondulantes — un rond qui
      tourne n'en produirait aucune — et on vérifie que le fil de bulles est bien annoncé, puisque
      c'est ce qui occupe la plus grande part de l'écran qui arrive.
    */
    expect(zone.querySelectorAll('.ul-shimmer').length).toBeGreaterThanOrEqual(10)
    expect(within(zone).getByText('Chargement du fil…')).toBeInTheDocument()
  })

  /*
    ⚠️ **Et l'onde se REMESURE.** La place change sans que le message change : le rail de droite
    s'ouvre, la fenêtre est redimensionnée, on passe du portrait au paysage. Mesurée une seule fois
    au premier rendu, l'onde garderait un nombre de barres qui ne correspond plus à la place — trop
    peu dans une bulle devenue large, ou de nouveau écrasées dans une bulle devenue étroite.

    *Une mesure prise une fois n'est pas une mesure : c'est un souvenir.*
  */
  it('⚠️ l’onde se remesure quand la place change', async () => {
    const rappels: (() => void)[] = []
    const vraiObservateur = window.ResizeObserver
    window.ResizeObserver = class {
      constructor(rappel: () => void) {
        rappels.push(rappel)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver

    // L'onde est d'abord étroite : 70 px, la bulle du porteur.
    let largeur = 70
    const vraiRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      const r = vraiRect.call(this) as DOMRect
      if ((this as HTMLElement).className?.includes?.('gap-[2px]')) {
        return { ...r, width: largeur } as DOMRect
      }
      return r
    }

    try {
      servirUnSon()
      await monter(seance(), [vocal()])
      await fil().findByLabelText('Écouter la note vocale')

      const compter = () =>
        document.querySelectorAll('[aria-hidden="true"] > span[style*="height"]').length
      /*
        ⚠️ La première mesure arrive par un EFFET, donc dans un second rendu. `findBy…` rend la main
        dès que le bouton existe — c'est-à-dire AVANT. Sans ce vidage, on compterait les barres du
        rendu d'avant la mesure, et le test dirait exactement le contraire de ce qu'il vérifie.
      */
      await act(async () => {})
      const etroite = compter()
      expect(etroite).toBeLessThan(36)

      // Le rail se ferme, la bulle s'élargit : l'onde doit se redensifier.
      largeur = 400
      await act(async () => {
        rappels.forEach((r) => r())
      })

      expect(compter()).toBeGreaterThan(etroite)
    } finally {
      Element.prototype.getBoundingClientRect = vraiRect
      window.ResizeObserver = vraiObservateur
    }
  })

  /*
    ⚠️ **Moins de barres ne veut pas dire une autre onde.** En prenant une valeur sur quatre au lieu
    de moyenner chaque tranche, un éclat bref entre deux silences — un « oui », une inspiration —
    disparaîtrait selon la largeur de la fenêtre. Le dessin changerait de forme avec la place
    disponible, et ne dirait plus la même chose du même son.
  */
  it('⚠️ en rétrécissant, un éclat bref ne disparaît pas de l’onde', () => {
    const silence = Array.from({ length: 36 }, () => 0)
    silence[5] = 1

    const ramenee = ramenerHauteurs(silence, 8)

    // La tranche 4–8 contient l'éclat : en échantillonnant, on aurait lu la valeur 4, donc zéro.
    expect(ramenee[1]).toBeGreaterThan(0)
    expect(ramenee).toHaveLength(8)
  })

  /*
    ── La forme du téléphone, reprise (chantier 91) ───────────────────────────────────────────

    Le porteur a comparé les deux écrans : *« la note vocale ne se présente pas de la même manière,
    celui du téléphone me plaît bien »*. Deux choses le distinguaient, et ces tests les tiennent.

    **La tête de lecture** : le point que le pouce suit. Elle dit où l'on en est mieux qu'un
    changement de teinte — on la voit du coin de l'œil pendant qu'on écoute.
  */
  it('montre une tête de lecture, comme sur le téléphone', async () => {
    servirUnSon()
    await monter(seance(), [vocal()])
    await fil().findByLabelText('Écouter la note vocale')

    const tete = document.querySelector('span.rounded-full.absolute, span.absolute.rounded-full')
    expect(tete).not.toBeNull()
    expect((tete as HTMLElement).style.left).toMatch(/calc\(/)
  })

  /*
    **Et le lecteur vit DANS la bulle**, sans contenant à lui. Le web l'enfermait dans une pilule
    bordée — une boîte dans une boîte, que le téléphone n'a jamais eue.
  */
  it('n’est plus enfermé dans une pilule à l’intérieur de la bulle', async () => {
    servirUnSon()
    await monter(seance(), [vocal()])

    const bouton = await fil().findByLabelText('Écouter la note vocale')
    const contenant = bouton.parentElement as HTMLElement
    expect(contenant.className).not.toMatch(/border|bg-secondary|rounded-full/)
  })

  /*
    ── Les couleurs de l'onde, RELEVÉES et non déduites (chantier 94) ───────────────────────────

    Sur une bulle REÇUE, le mobile peint l'onde à venir avec une teinte de bordure **neutre** — un
    gris. J'y avais mis un bleu à 26 %, déduit de la palette : c'était visible à l'œil sur la
    capture du porteur, et aucun test ne le tenait.

    *Deviner une couleur « cohérente » n'est pas la relever.*
  */
  it('sur une bulle reçue, l’onde à venir est GRISE, pas bleue', async () => {
    servirUnSon()
    await monter(seance(), [vocal({ senderId: 'pat-1' })])
    await fil().findByLabelText('Écouter la note vocale')

    const barres = [...document.querySelectorAll('[aria-hidden="true"] > span[style*="height"]')] as HTMLElement[]
    const aVenir = barres.map((b) => b.style.background).filter(Boolean)
    expect(aVenir.length).toBeGreaterThan(0)
    expect(aVenir.some((c) => /ap-600|ap-500/.test(c))).toBe(false)
    expect(aVenir.some((c) => /bordure-normale/.test(c))).toBe(true)
  })

  /* La vitesse tourne 1× → 1,5× → 2× → 1×, comme sur le téléphone. */
  it('la vitesse de lecture se change, et revient à 1×', async () => {
    servirUnSon()
    const utilisateur = userEvent.setup()
    await monter(seance(), [vocal()])

    const bouton = await fil().findByRole('button', { name: /Vitesse de lecture/ })
    expect(bouton).toHaveTextContent('1×')

    await utilisateur.click(bouton)
    expect(bouton).toHaveTextContent('1,5×')
    await utilisateur.click(bouton)
    expect(bouton).toHaveTextContent('2×')
    await utilisateur.click(bouton)
    expect(bouton).toHaveTextContent('1×')
  })
})

describe('C5 — le minuteur (chantier 75)', () => {
  /*
    Il s'écrivait en 20 px nus entre une pastille et le titre : la chose qui DÉCIDE de cet écran
    était la moins mise en scène de la page. Et l'étiquette n'est pas décorative — elle dit que le
    compte vient du SERVEUR, l'horloge du poste n'étant qu'indicative (RM-06-02).
  */
  it('porte son étiquette : le compte vient du serveur, pas du navigateur', async () => {
    await monter(seance({ remainingSeconds: 900 }))

    expect(await screen.findByText('Horloge serveur')).toBeInTheDocument()
    expect(screen.getByLabelText('Temps restant')).toHaveClass('ul-chiffre-ligne')
  })

  it('une séance close n’affiche aucun minuteur', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }))
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByText('Horloge serveur')).not.toBeInTheDocument()
  })
})

describe('C5 — les gestes sur un message', () => {
  /** Un message à MOI, tout juste écrit : la fenêtre de quinze minutes est ouverte. */
  const aMoiRecent = () => message({ senderId: 'pro-1', createdAt: new Date().toISOString() })

  it('supprimer envoie `forEveryone` — sans lui le serveur refuse en 400', async () => {
    const utilisateur = userEvent.setup()
    const supprimer = vi.spyOn(api, 'deleteSessionMessage').mockResolvedValue({ ok: true })
    await monter(seance(), [aMoiRecent()])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByText('Supprimer pour tout le monde'))

    await waitFor(() => expect(supprimer).toHaveBeenCalledWith('s1', 'm1', true))
  })

  it('retirer de mon fil ne supprime pas chez l’autre', async () => {
    const utilisateur = userEvent.setup()
    const supprimer = vi.spyOn(api, 'deleteSessionMessage').mockResolvedValue({ ok: true })
    await monter(seance(), [aMoiRecent()])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByText('Retirer de mon fil'))

    await waitFor(() => expect(supprimer).toHaveBeenCalledWith('s1', 'm1', false))
  })

  it('répondre cite le message, et l’envoi porte `replyToId`', async () => {
    const utilisateur = userEvent.setup()
    const envoyer = vi.spyOn(api, 'sendMessage').mockResolvedValue(message())
    await monter(seance(), [message({ body: 'Depuis trois nuits.' })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByRole('menuitem', { name: 'Répondre' }))
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

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByRole('menuitem', { name: 'Modifier' }))
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
    const utilisateur = userEvent.setup()
    const vieux = new Date(Date.now() - 20 * 60_000).toISOString()
    await monter(seance(), [message({ senderId: 'pro-1', createdAt: vieux })])

    await fil().findByText('Bonjour docteur')
    // Depuis le chantier 80 le geste vit DANS le menu : il faut l'ouvrir pour constater l'absence.
    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))

    expect(await screen.findByRole('menuitem', { name: 'Répondre' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Modifier' })).not.toBeInTheDocument()
    // Et « supprimer pour tout le monde » tombe avec la même fenêtre — une seule règle, deux gestes.
    expect(screen.queryByRole('menuitem', { name: /Supprimer pour tout le monde/ })).not.toBeInTheDocument()
  })

  it('réagir bascule l’emoji — la même palette que le mobile', async () => {
    const utilisateur = userEvent.setup()
    const reagir = vi.spyOn(api, 'reactToSessionMessage').mockResolvedValue(message())
    await monter(seance(), [message()])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByLabelText('Réagir avec 👍'))

    await waitFor(() => expect(reagir).toHaveBeenCalledWith('s1', 'm1', '👍'))
  })

  /*
    ── Trouvé en vérifiant le chantier 78 EN LIGNE, pas en écrivant le code ────────────────────

    Les emoji des MESSAGES étaient devenus des images ; ceux des RÉACTIONS étaient restés du texte
    dessiné par la police du système. Le même 👍 avait donc deux apparences sur le même écran, à
    trois pixels de distance — exactement ce que le chantier prétendait supprimer.

    « Le rendu identique partout » n'est pas une garantie si elle s'arrête à la moitié d'un écran.
    Ces deux tests tiennent les deux endroits où un emoji apparaît hors du corps d'un message.
  */
  it('la palette de réaction dessine ses emoji depuis la FEUILLE, pas avec la police du poste', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'reactToSessionMessage').mockResolvedValue(message())
    await monter(seance(), [message()])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    const bouton = await screen.findByLabelText('Réagir avec 👍')
    const dessin = bouton.querySelector<HTMLElement>('[role="img"]')

    expect(dessin?.style.backgroundImage).toContain('emoji/apple-64.png')
    // Et le caractère ne doit PAS rester en texte à côté : il serait dessiné une seconde fois.
    expect(bouton.textContent).not.toContain('👍')
  })

  it('une réaction déjà posée se dessine depuis la même feuille, et garde son compte', async () => {
    await monter(seance(), [message({ reactions: [{ emoji: '👍', count: 3, mine: false }] })])

    const bouton = await fil().findByLabelText('Réagir avec 👍')
    expect(bouton.querySelector<HTMLElement>('[role="img"]')?.style.backgroundImage).toContain('emoji/apple-64.png')
    // Le compte reste du TEXTE : c'est un chiffre, pas un emoji.
    expect(bouton).toHaveTextContent('3')
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

    const utilisateur = userEvent.setup()
    await fil().findByText('Bonjour docteur')

    /*
      Depuis le chantier 81 l'archive a le MÊME menu, réduit. La garantie ne porte donc plus sur
      l'absence du menu — elle porte sur son CONTENU, et c'est plus exigeant : il faut nommer un
      par un les gestes qui ne doivent pas y être.
    */
    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))

    expect(screen.queryByRole('menuitem', { name: 'Répondre' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Modifier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Retirer de mon fil/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Supprimer pour tout le monde/ })).not.toBeInTheDocument()
    // Et pas de réaction non plus : la bande n'est montée que sur une séance ouverte.
    expect(screen.queryByLabelText('Réagir avec 👍')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Choisir un autre emoji')).not.toBeInTheDocument()
  })

  /*
    ── Ce test a été RÉÉCRIT le 11/09, et la raison mérite d'être gardée ────────────────────────

    Il disait d'abord : « sur une séance close, le clic droit n'ouvre aucun menu ». Il passait —
    mais il passait **même en retirant le garde-fou qu'il prétendait tenir**. Une faute injectée
    l'a montré.

    La raison : sur une archive, `GestesBulle` ne monte PAS de menu du tout. Il n'y avait donc rien
    à rouvrir, et l'assertion était vraie pour une raison qui n'était pas celle qu'on croyait.

    Ce que le garde-fou fait vraiment, c'est **ne pas appeler `preventDefault`** : le clic droit
    rend alors le menu du NAVIGATEUR — copier, inspecter, rechercher. Confisquer ce menu pour
    n'offrir qu'une seule ligne serait un mauvais échange, et sur une archive on n'offre même pas
    cette ligne-là.

    *Un test qui passe n'est pas un test qui tient. C'est la faute injectée qui fait la différence.*
  */
  it('sur une séance close, le clic droit ouvre le menu RÉDUIT — le geste ne change pas', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message()])

    const bulle = await fil().findByText('Bonjour docteur')
    const clicDroit = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    fireEvent(bulle, clicDroit)

    expect(clicDroit.defaultPrevented).toBe(true)
    expect(await screen.findByRole('menuitem', { name: /Signaler ce message/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Répondre' })).not.toBeInTheDocument()
  })

  /*
    ⚠️ La seule fois où on rend la main au navigateur : quand il n'y a RIEN à montrer.

    Confisquer le menu du navigateur — copier, inspecter, rechercher — pour ouvrir le vide serait
    le pire des deux mondes. La règle suit donc le MENU, jamais l'état de la séance.
  */
  it('mais il rend le menu du navigateur quand il n’y a rien à offrir', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [
      message({ senderId: 'pro-1', kind: 'PHOTO', body: '', mediaKeys: ['k1'] }),
    ])

    // L'événement remonte jusqu'au conteneur de la bulle, qui porte `onContextMenu`.
    const dansLaBulle = await screen.findByText('Média indisponible.')
    const clicDroit = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    fireEvent(dansLaBulle, clicDroit)

    expect(clicDroit.defaultPrevented).toBe(false)
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
  })

  /* Et le miroir : séance ouverte, on prend la main — sinon les deux menus se superposeraient. */
  it('séance ouverte au contraire, il prend la main sur celui du navigateur', async () => {
    await monter(seance(), [message()])

    const bulle = await fil().findByText('Bonjour docteur')
    const clicDroit = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    fireEvent(bulle, clicDroit)

    expect(clicDroit.defaultPrevented).toBe(true)
    expect(await screen.findByRole('menuitem', { name: 'Répondre' })).toBeInTheDocument()
  })

  /*
    ── Vu sur une capture du porteur, le 11/09 (chantier 81) ────────────────────────────────────

    Le fil annonçait « **Consultation ouverte** · échange chiffré de bout en bout » pendant que la
    pastille juste au-dessus affichait « **Terminée** ». Deux états contraires à trois centimètres
    l'un de l'autre, et rien pour départager.

    La phrase de la maquette avait été recopiée **sans sa condition**. Aucun test ne la lisait :
    elle était vraie le jour où on l'a écrite, sur la seule séance qu'on regardait.
  */
  it('le fil ne dit pas « ouverte » sur une consultation terminée — il se contredisait', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message()])

    expect(await fil().findByText(/Consultation terminée · échange chiffré et archivé/)).toBeInTheDocument()
    expect(fil().queryByText(/Consultation ouverte/)).not.toBeInTheDocument()
  })

  it('et il le dit bien sur une consultation en cours', async () => {
    await monter(seance(), [message()])

    expect(await fil().findByText(/Consultation ouverte · échange chiffré de bout en bout/)).toBeInTheDocument()
  })

  it('mais il reste signalable — c’est après coup qu’on repense à un propos déplacé', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message({ senderId: 'pat-1' })])

    const utilisateur = userEvent.setup()
    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))

    expect(await screen.findByRole('menuitem', { name: /Signaler ce message/ })).toBeInTheDocument()
  })

  /*
    ── Ce que poser un menu sur l'archive a RÉVÉLÉ (chantier 81) ────────────────────────────────

    Sur ses propres messages, une séance close n'offrait **rien du tout** : on ne se signale pas
    soi-même, et c'était la seule ligne que le bouton nu savait porter.

    Le menu en porte une seconde, qui manquait sans qu'on la voie : **copier**. Copier ne modifie
    pas l'archive, et c'est précisément après coup, en rédigeant le compte-rendu, qu'on veut
    reprendre mot pour mot ce qui a été dit — y compris ce qu'on a écrit soi-même.

    *Un bouton ne peut porter qu'un geste ; c'est le contenant qui limitait le produit.*
  */
  it('sur ses propres messages, l’archive offre la copie — et rien qui la modifie', async () => {
    const utilisateur = userEvent.setup()
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [message({ senderId: 'pro-1' })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))

    expect(await screen.findByRole('menuitem', { name: 'Copier le texte' })).toBeInTheDocument()
    // On ne se signale pas soi-même, et on ne retouche pas une pièce.
    expect(screen.queryByRole('menuitem', { name: /Signaler/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Retirer de mon fil/ })).not.toBeInTheDocument()
  })

  /*
    Et quand il ne reste VRAIMENT rien — ma propre photo sur une archive : rien à copier, personne
    à signaler — la poignée ne s'affiche pas. Une poignée qui ouvre le vide est pire que pas de
    poignée : elle promet un geste et n'en tient aucun.
  */
  it('mais aucune poignée quand il ne reste rien à offrir — pas de menu vide', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [
      message({ senderId: 'pro-1', kind: 'PHOTO', body: '', mediaKeys: ['k1'] }),
    ])

    await screen.findByText('Média indisponible.')
    expect(screen.queryByLabelText('Actions sur ce message')).not.toBeInTheDocument()
  })

  /*
    ══ Chantier 80 — ce que le menu unique APPORTE ════════════════════════════════════════════

    Le porteur n'a pas trouvé les gestes sur un message. Il avait raison de ne pas les trouver :
    quatre icônes invisibles tant qu'on ne survolait pas exactement le bon endroit, et **aucun
    autre chemin**. Le mobile d'ULAMU offrait déjà une feuille d'actions à l'appui long, CMS-SARIS
    le clic droit : le web était la seule des trois surfaces à ne rien offrir.

    Ces tests tiennent les trois chemins ajoutés. Ils ne remplacent pas ceux d'au-dessus — ils
    couvrent ce qui n'existait pas.
  */
  it('le CLIC DROIT sur une bulle ouvre le menu — le geste qu’on tente d’instinct', async () => {
    await monter(seance(), [message()])

    const bulle = await fil().findByText('Bonjour docteur')
    fireEvent.contextMenu(bulle)

    expect(await screen.findByRole('menuitem', { name: 'Répondre' })).toBeInTheDocument()
  })

  it('« Copier le texte » met le corps du message dans le presse-papier', async () => {
    const utilisateur = userEvent.setup()
    const ecrire = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: ecrire }, configurable: true })
    await monter(seance(), [message({ body: 'Depuis trois nuits, et ça empire le matin.' })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByRole('menuitem', { name: 'Copier le texte' }))

    await waitFor(() => expect(ecrire).toHaveBeenCalledWith('Depuis trois nuits, et ça empire le matin.'))
    expect(await screen.findByText('Texte copié')).toBeInTheDocument()
  })

  /*
    ⚠️ Une copie peut échouer sans bruit — `navigator.clipboard` n'existe pas hors contexte
    sécurisé, et un navigateur peut refuser l'autorisation. **L'écran doit le dire.**

    Croire qu'on a copié le passage d'un patient, puis coller autre chose dans un compte-rendu,
    est pire que ne pas avoir le geste du tout.
  */
  it('et si le navigateur la refuse, l’écran le DIT au lieu de laisser croire', async () => {
    const utilisateur = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    await monter(seance(), [message({ body: 'Depuis trois nuits.' })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByRole('menuitem', { name: 'Copier le texte' }))

    expect(await screen.findByText('Copie refusée par le navigateur')).toBeInTheDocument()
  })

  it('ne propose pas de copier une PHOTO — il n’y a pas de texte à prendre', async () => {
    const utilisateur = userEvent.setup()
    await monter(seance(), [message({ kind: 'PHOTO', body: '', mediaKeys: ['k1'] })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))

    expect(await screen.findByRole('menuitem', { name: 'Répondre' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Copier le texte' })).not.toBeInTheDocument()
  })

  /*
    Le « + » — le chemin qui manquait vraiment.

    Le serveur accepte n'importe quel emoji en réaction (`ReactToMessageDto`, 8 caractères : de
    quoi porter un emoji composé), et le mobile offre déjà ce choix par son sélecteur complet. Le
    web s'arrêtait à six emoji figés : **une capacité existait des deux côtés, et l'écran du
    soignant était le seul à ne pas y mener.**
  */
  /*
    ⚠️ Délai porté à 30 s pour ces deux tests — et la raison est vraie, pas une rustine.

    Ils montent le sélecteur COMPLET : 1 867 boutons, chacun avec son style calculé. Seuls, ils
    passent largement ; c'est sous les 44 fichiers en parallèle qu'ils dépassent les 15 s communs.

    jsdom est beaucoup plus lent qu'un vrai navigateur pour poser des styles — le coût mesuré ici
    n'est PAS le coût réel chez l'utilisateur. Mais il pointe une chose vraie : ce sélecteur monte
    d'un coup ce qu'il pourrait monter par catégorie. **Dette n°28** — à regarder sur un Android
    d'entrée de gamme, qui est l'appareil du produit.
  */
  it('le « + » ouvre le sélecteur complet, et la réaction choisie part au serveur', async () => {
    const utilisateur = userEvent.setup()
    const reagir = vi.spyOn(api, 'reactToSessionMessage').mockResolvedValue(message())
    await monter(seance(), [message()])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByLabelText('Choisir un autre emoji'))

    // Le dialogue dit ce qu'il va faire — une grille d'emoji sans intitulé ne le dit pas.
    expect(await screen.findByRole('dialog', { name: 'Réagir à ce message' })).toBeInTheDocument()

    // Un emoji ABSENT de la bande rapide : c'est tout l'intérêt du sélecteur.
    const cases = await screen.findAllByLabelText('😀')
    await utilisateur.click(cases.find((e) => e.tagName === 'BUTTON')!)

    await waitFor(() => expect(reagir).toHaveBeenCalledWith('s1', 'm1', '😀'))
  }, 30_000)

  /*
    ── La phrase du dialogue n'est pas une politesse ────────────────────────────────────────────

    « Votre réaction remplace la précédente — une seule par message » est garantie par la **clé
    primaire** du serveur : `@@id([messageId, accountId])` sur `SessionMessageReaction`. Un
    participant ne peut structurellement pas en poser deux.

    Ce que l'ÉCRAN doit tenir, c'est de passer par la même bascule que la bande rapide. S'il
    appelait une route d'« ajout », la phrase deviendrait un mensonge — et l'écran promettrait au
    soignant quelque chose que son propre geste dément.
  */
  it('« remplace la précédente » est tenu : le sélecteur passe par la MÊME bascule, une seule fois', async () => {
    const utilisateur = userEvent.setup()
    const reagir = vi.spyOn(api, 'reactToSessionMessage').mockResolvedValue(message())
    await monter(seance(), [message({ reactions: [{ emoji: '👍', count: 1, mine: true }] })])

    await utilisateur.click(await fil().findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByLabelText('Choisir un autre emoji'))

    expect(await screen.findByText(/Votre réaction remplace la précédente/)).toBeInTheDocument()

    const cases = await screen.findAllByLabelText('😀')
    await utilisateur.click(cases.find((e) => e.tagName === 'BUTTON')!)

    await waitFor(() => expect(reagir).toHaveBeenCalledWith('s1', 'm1', '😀'))
    expect(reagir).toHaveBeenCalledTimes(1)
  }, 30_000)
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
describe('C5 — la mise en forme du texte (chantier 86)', () => {
  /**
   * Sélectionne du texte dans le champ et prévient le document.
   *
   * ⚠️ `userEvent` ne sait pas poser une sélection dans un `<textarea>` : il tape et il clique,
   * il ne surligne pas. On pose donc la sélection à la main et on émet `selectionchange`, qui est
   * exactement l'événement que la bulle écoute. *Simuler le geste au plus près de ce que le
   * navigateur émet vaut mieux que simuler ce qu'on aurait aimé qu'il émette.*
   */
  const selectionner = async (champ: HTMLTextAreaElement, debut: number, fin: number) => {
    champ.focus()
    champ.setSelectionRange(debut, fin)
    document.dispatchEvent(new Event('selectionchange'))
    return await screen.findByRole('toolbar', { name: 'Mise en forme du texte' })
  }

  const champ = () => screen.getByLabelText('Votre message') as HTMLTextAreaElement

  it('aucune bulle tant que rien n’est sélectionné', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')

    expect(screen.queryByRole('toolbar', { name: 'Mise en forme du texte' })).not.toBeInTheDocument()
  })

  it('la bulle apparaît dès qu’on sélectionne, et porte les sept outils', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')

    const barre = await selectionner(champ(), 3, 8)

    for (const nom of ['Gras', 'Italique', 'Barré', 'Souligné', 'Agrandir', 'Liste à puces', 'Liste numérotée']) {
      expect(within(barre).getByRole('button', { name: nom })).toBeInTheDocument()
    }
  })

  it('elle disparaît quand la sélection se réduit à rien', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    await selectionner(champ(), 3, 8)

    champ().setSelectionRange(5, 5)
    document.dispatchEvent(new Event('selectionchange'))

    await waitFor(() =>
      expect(screen.queryByRole('toolbar', { name: 'Mise en forme du texte' })).not.toBeInTheDocument(),
    )
  })

  it('« Gras » entoure la sélection, et la GARDE sur le texte', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    const barre = await selectionner(champ(), 3, 8)

    await utilisateur.click(within(barre).getByRole('button', { name: 'Gras' }))

    expect(champ().value).toBe('du *repos*')
    /*
      La sélection doit rester SUR LE MOT. Sans ce rattrapage, le navigateur remet le curseur à la
      fin et il faudrait re-sélectionner entre chaque bouton — on ne pourrait pas mettre un mot en
      gras PUIS en italique.
    */
    expect(champ().value.slice(champ().selectionStart, champ().selectionEnd)).toBe('repos')
  })

  it('et deux styles s’enchaînent sans re-sélectionner', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')
    const barre = await selectionner(champ(), 3, 8)

    await utilisateur.click(within(barre).getByRole('button', { name: 'Gras' }))
    await utilisateur.click(await screen.findByRole('button', { name: 'Italique' }))

    expect(champ().value).toBe('du *_repos_*')
  })

  it('« Liste à puces » transforme les lignes sélectionnées', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos{Shift>}{Enter}{/Shift}de l’eau')
    const barre = await selectionner(champ(), 0, champ().value.length)

    await utilisateur.click(within(barre).getByRole('button', { name: 'Liste à puces' }))

    expect(champ().value).toBe('• du repos\n• de l’eau')
  })

  /*
    ── Ctrl+Entrée : la suite logique de la liste, demandée par le porteur ──────────────────────

    Il passe AVANT le test d'envoi : Ctrl+Entrée n'a pas la touche Maj et serait parti comme un
    envoi. *Un raccourci ajouté après coup doit être lu avant celui qu'il affine.*
  */
  it('Ctrl+Entrée continue la liste au lieu d’envoyer', async () => {
    const envoyer = vi.spyOn(api, 'sendMessage')
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), '• du repos')

    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    expect(champ().value).toBe('• du repos\n• ')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('et sur un élément VIDE, il sort de la liste — la demande exacte du porteur', async () => {
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), '• du repos')
    await utilisateur.keyboard('{Control>}{Enter}{/Control}')
    expect(champ().value).toBe('• du repos\n• ')

    await utilisateur.keyboard('{Control>}{Enter}{/Control}')

    expect(champ().value).toBe('• du repos\n')
  })

  /* Entrée seule continue d'envoyer : le raccourci ajouté ne vole pas le geste principal. */
  it('Entrée seule envoie toujours', async () => {
    const envoyer = vi.spyOn(api, 'sendMessage').mockResolvedValue(message())
    await monter(seance())
    const utilisateur = userEvent.setup()
    await utilisateur.type(champ(), 'du repos')

    await utilisateur.keyboard('{Enter}')

    await waitFor(() => expect(envoyer).toHaveBeenCalled())
  })
})

describe('C5 — le rendu d’un message mis en forme (chantier 86)', () => {
  it('le gras se rend en gras, et le marqueur disparaît', async () => {
    await monter(seance(), [message({ body: 'Prenez *deux* comprimés' })])

    const gras = await fil().findByText('deux')
    expect(gras).toHaveStyle({ fontWeight: '600' })
    expect(fil().queryByText(/\*deux\*/)).not.toBeInTheDocument()
  })

  it('le barré et le souligné aussi', async () => {
    await monter(seance(), [message({ body: '~annulé~ puis __noté__' })])

    expect(await fil().findByText('annulé')).toHaveStyle({ textDecorationLine: 'line-through' })
    expect(fil().getByText('noté')).toHaveStyle({ textDecorationLine: 'underline' })
  })

  /*
    ⚠️ **La frontière entre afficher et interpréter.** Le corps d'un message porte des données de
    santé : un patient qui écrit `<b>` doit LIRE `<b>`. Ce test est plus important qu'il n'en a
    l'air — c'est lui qui interdira, un jour, d'ajouter « juste un petit rendu HTML ».
  */
  it('une balise reste une balise — rien n’est interprété', async () => {
    await monter(seance(), [message({ body: 'attention <b>gras ?</b>' })])

    const rendu = await fil().findByText(/<b>gras \?<\/b>/)
    expect(rendu).toBeInTheDocument()
    // Le texte est AFFICHÉ, jamais lu : aucune balise `<b>` réelle n'a été créée dans la bulle.
    expect(rendu.closest('p')?.querySelector('b')).toBeFalsy()
  })

  /* Et la protection du vocabulaire du soin tient jusqu'à l'écran, pas seulement dans la grammaire. */
  it('un tiret bas au milieu d’un mot ne fait pas d’italique', async () => {
    await monter(seance(), [message({ body: 'dossier nom_de_famille' })])

    expect(await fil().findByText(/nom_de_famille/)).toBeInTheDocument()
  })
})

describe('C5 — le rail d’informations (chantier 83)', () => {
  /** Une séance close, dont l'échéance de dépôt tombe dans `heures` heures. */
  const close = (heures: number) =>
    seance({
      status: 'ENDED' as CareSessionStatus,
      endedAt: '2026-08-24T08:32:00.000Z',
      remainingSeconds: 0,
      reportDueAt: new Date(Date.now() + heures * 3_600_000 + 90_000).toISOString(),
    })

  /** Le squelette d'une ordonnance — seul `sessionId` compte pour ces tests. */
  const ordonnanceVide = {
    id: 'p0',
    sessionId: 's1',
    status: 'ACTIVE' as const,
    qrToken: null,
    subProfileId: null,
    expiresAt: '2026-09-24T08:00:00.000Z',
    createdAt: '2026-08-24T08:20:00.000Z',
    cancelReason: null,
    lines: [],
  }

  beforeEach(() => {
    // Le rail se souvient de l'onglet PAR CONSULTATION : sans ce nettoyage, un test hériterait du
    // choix du précédent et ne prouverait plus rien.
    try {
      localStorage.clear()
    } catch {
      /* sans conséquence */
    }
  })

  /*
    ── La demande du porteur, tenue à l'endroit où elle est bonne ────────────────────────────────

    Il voulait deux flèches ◀ ▶ pour passer d'une carte à l'autre. Les flèches sont gardées **au
    clavier**, et remplacées à l'écran par des onglets nommés : *une flèche est un excellent
    raccourci, c'est un mauvais menu.*
  */
  it('les flèches ← et → passent d’un onglet à l’autre', async () => {
    const utilisateur = userEvent.setup()
    await monter(seance())

    const contexte = await screen.findByRole('tab', { name: /^Contexte/ })
    expect(contexte).toHaveAttribute('aria-selected', 'true')

    contexte.focus()
    await utilisateur.keyboard('{ArrowRight}')
    expect(await screen.findByRole('tab', { name: /^Carnet/ })).toHaveAttribute('aria-selected', 'true')

    // Et la liste BOUCLE : depuis le premier, « gauche » va au dernier. Sinon une extrémité est un
    // cul-de-sac, et on ne sait pas si on est bloqué ou arrivé.
    await utilisateur.keyboard('{ArrowLeft}{ArrowLeft}')
    const onglets = screen.getAllByRole('tab')
    expect(onglets[onglets.length - 1]).toHaveAttribute('aria-selected', 'true')
  })

  /*
    ⚠️ **La marque est la raison d'être de ce chantier.** Le compte-rendu a 24 h (PM-30) et les
    gains sont gelés passé ce délai (CU-06-03) : c'est la seule carte dont l'ignorance coûte de
    l'argent. Elle porte donc son état SUR l'onglet, lisible sans rien ouvrir.
  */
  it('l’onglet du compte-rendu annonce le temps restant sans qu’on l’ouvre', async () => {
    await monter(close(3))

    expect(await screen.findByRole('tab', { name: /Compte-rendu.*3 h/ })).toBeInTheDocument()
  })

  it('et il annonce « déposé » quand il l’est — on ne laisse pas croire qu’il reste du travail', async () => {
    await monter(seance({ status: 'ENDED', remainingSeconds: 0, reportDepositedAt: '2026-08-24T09:00:00.000Z' }))

    expect(await screen.findByRole('tab', { name: /Compte-rendu.*déposé/ })).toBeInTheDocument()
  })

  /*
    ── Le garde-fou : l'échéance ne descend JAMAIS dans un onglet ────────────────────────────────

    Tout système de navigation cache — c'est son métier. On n'accepte pas qu'il cache CELA. La
    bande reste visible quel que soit l'onglet ouvert, et **elle conduit à la carte** : une alerte
    qui ne mène nulle part ne fait qu'inquiéter.
  */
  it('l’échéance du compte-rendu reste visible quel que soit l’onglet ouvert', async () => {
    await monter(close(3))

    await ouvrir('Contexte')
    expect(screen.getByRole('button', { name: /Compte-rendu à déposer/ })).toBeInTheDocument()

    await ouvrir('Carnet')
    expect(screen.getByRole('button', { name: /Compte-rendu à déposer/ })).toBeInTheDocument()
  })

  it('et cette bande CONDUIT à la carte — une alerte qui ne mène nulle part ne fait qu’inquiéter', async () => {
    const utilisateur = userEvent.setup()
    await monter(close(3))

    await ouvrir('Contexte')
    await utilisateur.click(screen.getByRole('button', { name: /Compte-rendu à déposer/ }))

    expect(await screen.findByRole('tab', { name: /^Compte-rendu/ })).toHaveAttribute('aria-selected', 'true')
  })

  /*
    ── Trouvé EN LIGNE sur une consultation réelle du porteur (chantier 84) ─────────────────────

    L'onglet disait « expiré » pendant que la bande annonçait « moins d'une minute restantes », et
    que la carte juste en dessous disait « le délai est dépassé depuis le 29/08, vos gains sont
    gelés ». **Trois affichages du même fait, dont deux qui se contredisaient.**

    La cause tenait dans un `Math.max(0, …)` : un plancher à zéro transforme « dépassé de deux
    semaines » en « zéro seconde », c'est-à-dire en « moins d'une minute ». **Un plancher n'est pas
    une protection quand il fabrique une valeur fausse au lieu de dire qu'il n'y en a pas.**

    Ce n'est pas cosmétique : ce délai décide du paiement (CU-06-03). Annoncer « il reste moins
    d'une minute » à un soignant dont les gains sont gelés depuis deux semaines, c'est lui faire
    croire qu'il peut encore les sauver.
  */
  it('le délai passé, la bande le DIT — elle n’annonce pas « moins d’une minute »', async () => {
    await monter(close(-336))

    const bande = await screen.findByRole('button', { name: /Compte-rendu hors délai/ })
    expect(bande).toHaveTextContent(/vos gains sont gelés/)
    expect(bande).not.toHaveTextContent(/moins d’une minute/)
    expect(bande).not.toHaveTextContent(/il reste [0-9]/)
    // Et il reste un chemin : le serveur accepte encore un dépôt tardif, le compte-rendu reste dû.
    expect(bande).toHaveTextContent('Déposer')
  })

  /*
    ⚠️ La garantie qui compte vraiment : la BANDE et l'ONGLET lisent la même échéance, donc ils ne
    peuvent plus se contredire. C'est la seule protection durable — deux endroits qui calculent la
    même chose finissent toujours par ne plus dire la même chose.
  */
  it('la bande et l’onglet disent la MÊME chose — ils lisaient deux horloges', async () => {
    await monter(close(-336))

    expect(await screen.findByRole('tab', { name: /Compte-rendu.*expiré/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hors délai/ })).toBeInTheDocument()
    // Aucun des deux ne doit laisser entendre qu'il reste du temps.
    expect(screen.queryByRole('button', { name: /à déposer — il reste/ })).not.toBeInTheDocument()
  })

  it('et tant que le délai court, elle annonce le temps qui reste', async () => {
    await monter(close(6))

    const bande = await screen.findByRole('button', { name: /Compte-rendu à déposer/ })
    expect(bande).toHaveTextContent(/il reste 6 h/)
    expect(bande).toHaveTextContent('Rédiger')
  })

  /* Déposé, il n'y a plus d'échéance : la bande disparaît au lieu de réclamer un travail fait. */
  it('la bande disparaît une fois le compte-rendu déposé', async () => {
    await monter(seance({ status: 'ENDED', remainingSeconds: 0, reportDepositedAt: '2026-08-24T09:00:00.000Z' }))

    await screen.findByRole('tablist')
    expect(screen.queryByRole('button', { name: /Compte-rendu à déposer/ })).not.toBeInTheDocument()
  })

  /*
    L'onglet ouvert PAR DÉFAUT est ce qui presse — *une capacité doit avoir un chemin, et le
    meilleur chemin c'est parfois être déjà là.* Pendant la séance on vient voir de quoi souffre le
    patient ; une fois close et le compte-rendu non déposé, il n'y a plus qu'une chose à faire.
  */
  it('une séance close sans compte-rendu s’ouvre SUR le compte-rendu', async () => {
    await monter(close(3))

    expect(await screen.findByRole('tab', { name: /^Compte-rendu/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('mais une séance en cours s’ouvre sur le contexte du patient', async () => {
    await monter(seance())

    expect(await screen.findByRole('tab', { name: /^Contexte/ })).toHaveAttribute('aria-selected', 'true')
  })

  /*
    ⚠️ Le défaut ne bouscule JAMAIS un choix. Un soignant qui a ouvert l'ordonnance et recharge la
    page doit retrouver l'ordonnance : on n'a pas à savoir mieux que lui ce qu'il regardait.
  */
  it('le souvenir l’emporte sur le défaut — on ne bouscule pas un choix', async () => {
    localStorage.setItem('ulamu.consultation.onglet.s1', 'carnet')
    await monter(close(3))

    expect(await screen.findByRole('tab', { name: /^Carnet/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /^Compte-rendu/ })).toHaveAttribute('aria-selected', 'false')
  })

  /*
    ── L'onglet qui DISPARAÎT pendant qu'on le regarde ──────────────────────────────────────────

    « Prolonger » s'en va au plafond des 30 minutes (PM-29), et le soignant y est justement quand il
    l'atteint : il vient de cliquer. Sans garde-fou, le rail reste sur un onglet qui n'existe plus
    — c'est-à-dire sur du vide, sans rien pour le dire.

    ⚠️ **Ce test remplace une première version qui ne prouvait rien.** Elle posait un souvenir
    périmé et vérifiait le repli — mais le repli du PREMIER rendu passe déjà par un autre chemin, et
    la faute injectée (l'effet retiré) ne la réveillait pas. Il fallait faire disparaître l'onglet
    APRÈS le montage, alors qu'il est sélectionné. *Un test qui ne tombe sous aucune faute ne garde
    rien : il rassure.*
  */
  it('un onglet qui disparaît pendant qu’on le regarde ne laisse pas le rail sur du vide', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'extendSession').mockResolvedValue(undefined as never)
    await monter(seance({ extensionTotalSec: 1200 }))

    await ouvrir('Prolonger')
    expect(screen.getByRole('tab', { name: /^Prolonger/ })).toHaveAttribute('aria-selected', 'true')

    // Le plafond est atteint : la relecture de la séance fait tomber l'onglet sous les yeux.
    vi.spyOn(api, 'session').mockResolvedValue(seance({ extensionTotalSec: 1800 }))
    await utilisateur.click(screen.getByRole('button', { name: /Prolonger de 10 minutes/ }))

    await waitFor(() => expect(screen.queryByRole('tab', { name: /^Prolonger/ })).not.toBeInTheDocument())
    // Le rail est retombé sur un onglet réel, et son panneau porte du contenu.
    const contexte = screen.getByRole('tab', { name: /^Contexte/ })
    expect(contexte).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contexte patient')

    /*
      ⚠️ **Et le CLAVIER doit suivre.** C'est ici que se joue le vrai garde-fou : l'affichage
      retombe seul sur le premier onglet, mais la sélection MÉMORISÉE, elle, désigne encore
      l'onglet disparu. Les flèches cherchent leur position dans la liste, ne s'y trouvent pas, et
      **se figent** — le rail paraît normal et ne répond plus.

      Une faute injectée qui retirait ce repli ne réveillait aucun test tant qu'on ne regardait que
      l'affichage. *Un défaut qui ne se voit pas est celui qui survit le plus longtemps.*
    */
    contexte.focus()
    await utilisateur.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /^Carnet/ })).toHaveAttribute('aria-selected', 'true')
  })

  /* Et au PREMIER rendu, un souvenir qui ne désigne rien retombe aussi sur le premier onglet. */
  it('un souvenir qui ne correspond à rien retombe sur le premier onglet', async () => {
    localStorage.setItem('ulamu.consultation.onglet.s1', 'un-onglet-qui-nexiste-plus')
    await monter(seance())

    expect(await screen.findByRole('tab', { name: /^Contexte/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Contexte patient')
  })

  /* L'onglet de l'ordonnance compte les lignes déjà prescrites — sans ouvrir la carte. */
  it('l’onglet de l’ordonnance annonce combien il y en a', async () => {
    vi.spyOn(api, 'myPrescribed').mockResolvedValue({
      items: [
        { ...ordonnanceVide, id: 'p1', sessionId: 's1' },
        { ...ordonnanceVide, id: 'p2', sessionId: 's1' },
        { ...ordonnanceVide, id: 'p3', sessionId: 'une-autre-seance' },
      ],
    })
    await monter(seance({ id: 's1' }))

    // Trois prescrites, mais DEUX sur cette séance : celle de l'autre séance ne doit pas compter.
    expect(await screen.findByRole('tab', { name: /Ordonnance.*2/ })).toBeInTheDocument()
  })
})

describe('C5 — le Carnet du patient', () => {
  it('montre le groupe sanguin, les allergies actives et les chroniques', async () => {
    vi.spyOn(api, 'sessionRecordSummary').mockResolvedValue({
      bloodType: 'O+',
      activeAllergies: ['Pénicilline'],
      chronicDiseases: ['Hypertension'],
    })
    await monter(seance())
    await ouvrir('Carnet')

    expect(await screen.findByText('O+')).toBeInTheDocument()
    // L'allergie est la seule information de cet écran qui peut tuer : elle est en tête.
    expect(screen.getByText('Pénicilline')).toBeInTheDocument()
    expect(screen.getByText('Hypertension')).toBeInTheDocument()
  })

  it('annonce la lecture seule et la traçabilité AVANT qu’on lise', async () => {
    await monter(seance())
    await ouvrir('Carnet')

    expect(await screen.findByText(/Lecture seule · votre consultation est enregistrée/)).toBeInTheDocument()
  })

  it('la séance close, l’accès est refermé — et l’écran ne demande plus rien au serveur', async () => {
    const lire = vi.spyOn(api, 'sessionRecordSummary')
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }))
    await ouvrir('Carnet')

    expect(await screen.findByText(/L'accès s'est refermé avec la consultation/)).toBeInTheDocument()
    expect(lire).not.toHaveBeenCalled()
  })

  /*
    ⚠️ **Le Carnet rend la même grammaire que les messages (chantier 87).**

    C'est ici que ressort le COMPTE-RENDU. Depuis que la bulle s'attache à toute zone de saisie, un
    soignant peut y écrire « *important* » — et sans ce rendu, le patient comme le soignant
    reliraient des astérisques dans un dossier de santé.

    *Quand on ouvre une écriture, on ouvre une lecture. L'une sans l'autre fabrique un texte que
    personne n'a voulu.* Aucun test ne tenait cela avant l'injection : retirer le rendu du Carnet
    ne réveillait personne.
  */
  it('rend la mise en forme — ce que le compte-rendu y dépose', async () => {
    vi.spyOn(api, 'sessionRecord').mockResolvedValue({
      recordId: 'r1',
      items: [
        {
          id: 'e1',
          // Le type EXACT du compte-rendu : c'est bien lui qu'on suit jusqu'au Carnet.
          type: 'CONSULTATION_REPORT',
          provenance: 'PROFESSIONAL',
          authorId: 'pro-1',
          sourceRef: null,
          payload: { label: 'Repos *strict* pendant ~trois~ deux jours' },
          supersedesId: null,
          createdAt: '2026-06-01T10:00:00.000Z',
          superseded: false,
        },
      ],
      nextCursor: null,
    })
    await monter(seance())
    await ouvrir('Carnet')

    expect(await screen.findByText('strict')).toHaveStyle({ fontWeight: '600' })
    expect(screen.getByText('trois')).toHaveStyle({ textDecorationLine: 'line-through' })
    // Et les marqueurs ne se lisent plus — ils sont devenus du style.
    expect(screen.queryByText(/\*strict\*/)).not.toBeInTheDocument()
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
    await ouvrir('Carnet')

    /*
      Le texte du Carnet passe désormais par le rendu de la mise en forme (chantier 87), donc il
      vit dans un `<span>` à l'intérieur du paragraphe. C'est le PARAGRAPHE qui porte le barré —
      celui de l'entrée remplacée, pas celui d'un marqueur `~…~` écrit par un soignant.

      *Un test qui vise l'élément trouvé par son texte vise en fait le plus profond qui le porte ;
      il faut nommer l'élément dont on parle, sinon il change avec le rendu.*
    */
    const entree = (await screen.findByText('Arachide')).closest('p') as HTMLElement
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
  await utilisateur.click(await screen.findByRole('button', { name: /Actions sur ce message/ }))
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
  /*
    ── La poignée est DANS la bulle, et n'a pas de fond (chantier 82, demande du porteur) ───────

    *« Le bouton doit être petit, incrusté dans la bulle, placé à droite horizontalement et en haut
    verticalement, sans background. »*

    ⚠️ **Ce que ce test peut prouver, et ce qu'il ne peut pas.** jsdom ne calcule aucune mise en
    page : il ne mesurera jamais que la poignée tombe bien dans le coin. Il retient donc ce qui est
    vérifiable — l'absence de cadre, et l'absence de la règle `lg:left-full` qui la posait À CÔTÉ
    de la bulle. Cette règle-là est le vrai enjeu : c'est elle qui faisait déborder le fil de 73 px
    sur un téléphone (chantier 21), et la poser dans la bulle est ce qui la rend inutile.

    Le placement au pixel, lui, se vérifie à l'œil sur la plateforme — et c'est ainsi que le
    porteur a signalé le problème.
  */
  it('la poignée n’a ni cadre ni fond, et ne se pose plus à côté de la bulle', async () => {
    await monter(seance(), [message()])

    const poignee = await fil().findByLabelText('Actions sur ce message')
    const cadre = poignee.parentElement as HTMLElement

    // Sans fond : ni sur le cadre, ni au survol du bouton. Le survol change l'ENCRE.
    expect(cadre.className).not.toMatch(/bg-|border|shadow-/)
    expect(poignee.className).not.toMatch(/bg-|hover:bg-/)
    expect(poignee.className).toMatch(/hover:text-foreground/)

    // Et elle est posée DANS la bulle : plus aucune règle qui la sort sur les côtés.
    expect(cadre.className).not.toMatch(/left-full|right-full/)
    expect(cadre.className).toMatch(/absolute/)
  })

  /*
    La réserve de place ne vaut que pour les écrans SANS survol, où la poignée est permanente. Et
    elle ne se pose que s'il y a un menu : réserver la place d'une poignée absente décalerait le
    texte pour rien.
  */
  it('la bulle ne réserve la place de la poignée que s’il y a un menu', async () => {
    await monter(seance({ status: 'ENDED' as CareSessionStatus, remainingSeconds: 0 }), [
      message({ senderId: 'pro-1', kind: 'PHOTO', body: '', mediaKeys: ['k1'] }),
    ])

    const dansLaBulle = await screen.findByText('Média indisponible.')
    /*
      ⚠️ On vise la bulle par sa STRUCTURE — le premier enfant du conteneur positionné — et non par
      une classe d'apparence. La première version cherchait `.rounded-lg` ; le chantier 92 a mis le
      rayon à 12 px (`rounded-xl`) pour rejoindre le mobile, et le test est tombé sans qu'aucune
      garantie n'ait bougé.

      *Un test qui s'accroche à une classe de style se casse à chaque retouche visuelle, et on finit
      par le croire fragile alors qu'il visait mal.*
    */
    const bulle = dansLaBulle.closest('.relative')?.querySelector(':scope > div') as HTMLElement
    // Ma propre photo sur une archive : rien à copier, personne à signaler, donc pas de poignée.
    expect(bulle.className).not.toMatch(/ul-bulle/)
  })

  it('n’offre pas de signaler ses PROPRES messages', async () => {
    await monter(seance(), [message({ id: 'a-moi', senderId: 'pro-1' })])
    const utilisateur = userEvent.setup()

    await utilisateur.click(await screen.findByRole('button', { name: /Actions sur ce message/ }))

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

    await utilisateur.click(await screen.findByLabelText('Actions sur ce message'))
    await utilisateur.click(await screen.findByRole('menuitem', { name: /Signaler ce message/ }))
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

/*
  ══════════════════════════════════════════════════════════════════════════════════════════════
  FILET DE REFONTE — les phrases que cet écran ne doit pas perdre (chantier 68, 09/09/2026)
  ══════════════════════════════════════════════════════════════════════════════════════════════

  ⚠️ C'est l'écran où le soignant travaille, et où son argent se joue. Ses phrases disent ce qui
  arrive s'il ne répond pas, et à partir de quand le décompte tourne. Les perdre coûterait de
  l'argent à quelqu'un, silencieusement.
*/
describe('C4 — filet de refonte : ce que le silence coûte', () => {
  /*
    D-008 : une consultation sans un seul message est INTÉGRALEMENT remboursée au patient, et le
    soignant ne perçoit rien. C'est l'avertissement le plus cher de la plateforme — il vaut plusieurs
    milliers de francs par séance, et il n'apparaît qu'ici, au moment où l'on peut encore agir.
  */
  it('prévient qu’une séance sans un seul message n’est pas payée (D-008)', async () => {
    await monter(seance({ status: 'ACTIVE' }))

    expect(await screen.findByText(/vous ne percevrez rien/)).toBeInTheDocument()
  })

  /*
    Le décompte ne démarre pas au paiement mais à la transmission de la pré-consultation — ou
    automatiquement dix minutes après. Sans cette phrase, le soignant croit perdre du temps payé
    alors que rien ne tourne encore.
  */
  it('dit quand le décompte démarre vraiment', async () => {
    await monter(seance({ status: 'PREPARING' }))

    expect(await screen.findByText(/automatiquement dix minutes après le paiement/)).toBeInTheDocument()
  })
})
