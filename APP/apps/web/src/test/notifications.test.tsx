/**
 * Le centre de notifications — chantier 37, 03/09/2026.
 *
 * ── Ce que ce fichier défend ──────────────────────────────────────────────────────────────────
 *
 * **1. Ouvrir le tiroir ne marque RIEN comme lu.** C'est l'usage le plus répandu ailleurs, et c'est
 * le pire : il efface le seul repère de l'utilisateur au premier coup d'œil. Un médecin qui ouvre
 * la cloche entre deux consultations doit retrouver ses non-lues ensuite. Ce test est le premier du
 * fichier parce que c'est la décision la plus facile à défaire par inadvertance.
 *
 * **2. « Tout marquer comme lu » part en UNE requête.** La route serveur a été écrite pour cet
 * écran (`POST /v1/notifications/me/read-all`). Sans elle, le web enverrait une requête par ligne —
 * vingt occasions d'échec partiel, et un badge qui descend par à-coups.
 *
 * **3. Le lien d'une notification respecte les capacités.** Plusieurs modèles s'adressent à
 * l'administration ; aucun ne doit produire, chez un soignant, un lien vers un écran qui le
 * renverrait chez lui.
 *
 * **4. Le compteur vient du serveur, jamais de la longueur de la liste.** La liste est paginée et
 * filtrée par la rétention : la compter donnerait un nombre plus petit que la vérité.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { useSessionStore } from '@/state/session.store'
import { api, type MeResponse, type NotificationRecue } from '@/lib/api'

const MOI: MeResponse = {
  accountId: 'x1',
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

/** Une notification, avec ce que le serveur sert réellement — titre et corps déjà rendus. */
function notif(p: Partial<NotificationRecue> = {}): NotificationRecue {
  return {
    id: 'n1',
    template: 'm06.handshake.initiated',
    category: 'care',
    priority: 'normal',
    title: 'Nouvelle demande de consultation',
    body: 'Grâce (34 ans) vous sollicite.',
    readAt: null,
    createdAt: new Date().toISOString(),
    ...p,
  }
}

function monter(
  opts: {
    items?: NotificationRecue[]
    nonLues?: number
    nextCursor?: string | null
    /** Le compteur échoue. À doubler AVANT le montage : sa requête part au premier rendu. */
    compteurEnEchec?: boolean
  } = {},
) {
  const items = opts.items ?? [notif()]
  const compteur = vi.spyOn(api, 'notificationsUnreadCount')
  if (opts.compteurEnEchec) {
    compteur.mockRejectedValue(new Error('réseau'))
  } else {
    compteur.mockResolvedValue({ unread: opts.nonLues ?? items.filter((n) => !n.readAt).length })
  }
  vi.spyOn(api, 'notifications').mockResolvedValue({ items, nextCursor: opts.nextCursor ?? null })
  // La coquille lit aussi la présence et les sessions : le réseau est coupé en test, on les double.
  vi.spyOn(api, 'myPresence').mockResolvedValue({
    state: 'ONLINE',
    since: '2026-09-03T08:00:00.000Z',
    lastHeartbeatAt: '2026-09-03T08:00:00.000Z',
    availableForInitiation: true,
    maxConcurrentSessions: 3,
  })
  // Le battement renvoie `Presence` (sans le plafond), la lecture renvoie `OwnPresence` (avec).
  vi.spyOn(api, 'presenceHeartbeat').mockResolvedValue({
    state: 'ONLINE',
    since: '2026-09-03T08:00:00.000Z',
    lastHeartbeatAt: '2026-09-03T08:00:00.000Z',
    availableForInitiation: true,
  })
  vi.spyOn(api, 'mySessions').mockResolvedValue({ items: [] })

  window.innerWidth = 1280
  useSessionStore.setState({ token: 'jeton', me: MOI, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/demandes" element={<p>écran des demandes</p>} />
              <Route path="/parametres" element={<p>écran des paramètres</p>} />
              <Route path="*" element={<p>contenu de l’écran</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

/** La cloche — repérée par son rôle et son intitulé, jamais par une classe. */
const cloche = () => screen.getByRole('button', { name: /Notifications/ })

/**
 * ⚠️ Les noms de boutons d'une ligne sont ANCRÉS (`/^…/`) dans tout ce fichier, et ce n'est pas une
 * coquetterie.
 *
 * Une ligne porte **trois** boutons qui contiennent tous le titre : son corps
 * (« Non lue. <titre>. <message>. Ouvrir. »), « Marquer « <titre> » comme lue » et
 * « Supprimer « <titre> » ». Un motif non ancré en trouve trois et échoue — c'est exactement ce
 * qu'a fait la première version de ce fichier.
 *
 * L'échec était une bonne nouvelle : il prouve que les trois boutons sont **distinguables à la
 * voix**, ce qui est précisément ce qu'on demande à un écran.
 */

beforeEach(() => {
  vi.restoreAllMocks()
  window.innerWidth = 1280
})

describe('Le centre de notifications', () => {
  it('affiche le nombre de non-lues SERVI par le serveur', async () => {
    monter({ nonLues: 4 })

    await waitFor(() => expect(cloche()).toHaveAccessibleName('Notifications : 4 non lues'))
    expect(cloche()).toHaveTextContent('4')
  })

  /* Le compteur vient du serveur, pas de la liste : la liste est paginée ET coupée par la rétention. */
  it('ne déduit jamais le compteur de la longueur de la liste', async () => {
    monter({ items: [notif({ id: 'a' }), notif({ id: 'b' })], nonLues: 37 })

    await waitFor(() => expect(cloche()).toHaveTextContent('37'))
  })

  it('écrit « 99+ » au-delà du plafond, plutôt qu’un nombre illisible', async () => {
    monter({ nonLues: 1247 })

    await waitFor(() => expect(cloche()).toHaveTextContent('99+'))
    // Le nombre exact reste dit à voix haute, pour qui écoute l'écran.
    expect(cloche()).toHaveAccessibleName('Notifications : 1247 non lues')
  })

  it('accorde le compteur au singulier — « 1 non lue », jamais « 1 non lues »', async () => {
    monter({ nonLues: 1 })

    await waitFor(() => expect(cloche()).toHaveAccessibleName('Notifications : 1 non lue'))
  })

  /*
    Trouvé EN LIGNE, dans le code de ce chantier, après la première mise en production.

    La cloche écrivait `badge.data?.unread ?? 0`. Quand la lecture du compteur échoue — l'API
    gratuite de Render s'endort au bout de quinze minutes — elle annonçait donc « aucune non lue ».
    C'est le mensonge que le principe du projet nomme : **une lecture qui échoue n'est ni un zéro ni
    un « non ».** Un médecin y aurait lu « rien de nouveau » à l'instant où un patient l'attendait.
  */
  it('une lecture du compteur en échec ne dit JAMAIS « aucune non lue »', async () => {
    monter({ compteurEnEchec: true })

    await waitFor(() => expect(cloche()).toHaveAccessibleName(/n’a pas pu être lu/))
    expect(cloche()).not.toHaveAccessibleName(/aucune non lue/)
    // Et aucun chiffre : une pastille « 0 » serait le même mensonge, en plus discret.
    expect(cloche()).not.toHaveTextContent(/\d/)
  })

  /*
    Le pendant : quand le serveur dit VRAIMENT zéro, on l'affirme. Sans ce test, on pourrait
    « corriger » le précédent en ne disant plus jamais rien.
  */
  it('mais quand le serveur dit zéro, elle le dit', async () => {
    monter({ items: [], nonLues: 0 })

    await waitFor(() => expect(cloche()).toHaveAccessibleName('Notifications : aucune non lue'))
  })

  /*
    Le bouton « tout marquer » regarde le compteur ET la liste. Si le compteur a échoué mais que la
    liste montre des non-lues, le geste doit rester offert : la panne d'un compteur ne doit pas
    priver d'une action dont on a la preuve sous les yeux.
  */
  it('offre encore « tout marquer » quand le compteur a échoué mais que la liste montre des non-lues', async () => {
    monter({ compteurEnEchec: true })

    await userEvent.click(cloche())

    expect(await screen.findByRole('button', { name: /Tout marquer comme lu/ })).toBeInTheDocument()
  })

  /*
    LE test du fichier. Ouvrir le tiroir est un coup d'œil, pas une lecture : rien ne doit être
    marqué. C'est la décision la plus facile à défaire par inadvertance, en « rendant service ».
  */
  it('ouvrir le tiroir ne marque RIEN comme lu', async () => {
    const marquer = vi.spyOn(api, 'markNotificationRead')
    const toutMarquer = vi.spyOn(api, 'markAllNotificationsRead')
    monter()

    await userEvent.click(cloche())
    expect(await screen.findByText('Nouvelle demande de consultation')).toBeInTheDocument()

    expect(marquer).not.toHaveBeenCalled()
    expect(toutMarquer).not.toHaveBeenCalled()
  })

  it('rien n’est chargé tant que le tiroir est fermé', async () => {
    monter()

    await waitFor(() => expect(cloche()).toHaveTextContent('1'))
    expect(api.notifications).not.toHaveBeenCalled()

    await userEvent.click(cloche())
    await waitFor(() => expect(api.notifications).toHaveBeenCalled())
  })

  /* Cliquer une notification, c'est la lire : elle est marquée ET elle emmène à son écran. */
  it('cliquer une notification la marque lue et ouvre son écran', async () => {
    const marquer = vi.spyOn(api, 'markNotificationRead').mockResolvedValue({ id: 'n1', read: true })
    monter()

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /^Non lue\. Nouvelle demande de consultation/ }))

    expect(marquer).toHaveBeenCalledWith('n1')
    expect(await screen.findByText('écran des demandes')).toBeInTheDocument()
  })

  /*
    Une notification déjà lue ne se remarque pas : la route est idempotente côté serveur, mais une
    requête inutile reste une requête inutile — et sur l'offre gratuite de Render, elle se paie.
  */
  it('ne remarque pas une notification déjà lue', async () => {
    const marquer = vi.spyOn(api, 'markNotificationRead')
    monter({ items: [notif({ readAt: '2026-09-03T09:00:00.000Z' })], nonLues: 0 })

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /^Nouvelle demande de consultation/ }))

    expect(marquer).not.toHaveBeenCalled()
  })

  /*
    Une notification qui s'adresse au patient (son dossier, ses ordonnances) n'a pas d'écran ici.
    Elle reste lisible et devient lue — elle n'emmène simplement nulle part, plutôt que vers un
    lien inventé.
  */
  it('une notification sans écran dans le web se lit sans emmener nulle part', async () => {
    const marquer = vi.spyOn(api, 'markNotificationRead').mockResolvedValue({ id: 'n1', read: true })
    monter({
      items: [notif({ template: 'm09.prescription.sealed', title: 'Ordonnance scellée', body: 'Votre ordonnance est disponible.' })],
    })

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /^Non lue\. Ordonnance scellée/ }))

    expect(marquer).toHaveBeenCalledWith('n1')
    expect(screen.queryByText('écran des demandes')).not.toBeInTheDocument()
  })

  /* Une seule requête, et non une par ligne : c'est la raison d'être de la route `read-all`. */
  it('« tout marquer comme lu » part en une seule requête', async () => {
    const toutMarquer = vi.spyOn(api, 'markAllNotificationsRead').mockResolvedValue({ read: 3 })
    const marquer = vi.spyOn(api, 'markNotificationRead')
    monter({ items: [notif({ id: 'a' }), notif({ id: 'b' }), notif({ id: 'c' })], nonLues: 3 })

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /Tout marquer comme lu/ }))

    expect(toutMarquer).toHaveBeenCalledTimes(1)
    expect(marquer).not.toHaveBeenCalled()
  })

  it('n’offre pas « tout marquer comme lu » quand il n’y a rien à marquer', async () => {
    monter({ items: [notif({ readAt: '2026-09-03T09:00:00.000Z' })], nonLues: 0 })

    await userEvent.click(cloche())
    await screen.findByText('Nouvelle demande de consultation')
    expect(screen.queryByRole('button', { name: /Tout marquer comme lu/ })).not.toBeInTheDocument()
  })

  it('supprime une notification', async () => {
    const supprimer = vi.spyOn(api, 'deleteNotification').mockResolvedValue({ id: 'n1', deleted: true })
    monter()

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /Supprimer/ }))

    expect(supprimer).toHaveBeenCalledWith('n1')
  })

  /*
    Un vide EXPLIQUÉ. « Aucune notification » seul laisse croire à une panne ; la phrase qui suit dit
    ce que l'écran fera quand il aura quelque chose à dire.
  */
  it('explique le vide au lieu de le constater', async () => {
    monter({ items: [], nonLues: 0 })

    await userEvent.click(cloche())
    expect(await screen.findByText('Aucune notification')).toBeInTheDocument()
    expect(screen.getByText(/demandes de consultation/i)).toBeInTheDocument()
  })

  /*
    Une lecture qui échoue n'est ni un zéro ni un « vous n'avez rien » : c'est un principe du projet.
    Afficher « Aucune notification » sur une panne réseau ferait manquer une demande.
  */
  it('une lecture en échec dit qu’elle a échoué, jamais « aucune notification »', async () => {
    monter()
    vi.mocked(api.notifications).mockRejectedValue(new Error('réseau'))

    await userEvent.click(cloche())

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Aucune notification')).not.toBeInTheDocument()
  })

  it('charge la page suivante avec le curseur servi par le serveur', async () => {
    monter({ nextCursor: 'curseur-1' })

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /Afficher les plus anciennes/ }))

    await waitFor(() =>
      expect(api.notifications).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'curseur-1' })),
    )
  })

  it('n’offre pas « plus anciennes » quand le serveur dit que c’est la dernière page', async () => {
    monter({ nextCursor: null })

    await userEvent.click(cloche())
    await screen.findByText('Nouvelle demande de consultation')
    expect(screen.queryByRole('button', { name: /Afficher les plus anciennes/ })).not.toBeInTheDocument()
  })

  it('mène aux préférences, où l’on coupe une catégorie', async () => {
    monter()

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /Choisir les notifications/ }))

    expect(await screen.findByText('écran des paramètres')).toBeInTheDocument()
  })
})

describe('Le centre de notifications — cloisonnement des rôles', () => {
  /*
    Un administrateur ne doit jamais recevoir un lien vers un écran de soignant. Le cas est
    théorique — le serveur ne lui enverrait pas ce modèle — mais c'est exactement le genre de
    garde-fou qu'on ne remarque qu'une fois franchi.
  */
  it('un administrateur n’obtient aucun lien vers un écran de soignant', async () => {
    const marquer = vi.spyOn(api, 'markNotificationRead').mockResolvedValue({ id: 'n1', read: true })
    monter()
    useSessionStore.setState({ me: { ...MOI, accountType: 'ADMIN', adminRole: 'SUPER_ADMIN' } })

    await userEvent.click(cloche())
    await userEvent.click(await screen.findByRole('button', { name: /^Non lue\. Nouvelle demande de consultation/ }))

    expect(marquer).toHaveBeenCalledWith('n1')
    expect(screen.queryByText('écran des demandes')).not.toBeInTheDocument()
  })
})
