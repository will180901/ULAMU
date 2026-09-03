/**
 * Le décompte du code TOTP — chantier 34, 02/09/2026.
 *
 * Demandé par le porteur : *« mettre sur les interfaces un compte en direct pour permettre aux
 * utilisateurs de voir le délai de chaque code »*.
 *
 * ── Ce que ces tests verrouillent, et pourquoi ────────────────────────────────────────────────
 *
 * Trois FAITS, dont deux qu'une relecture ne verrait pas :
 *
 * 1. **La phrase dit « nouveau code », jamais « expire ».** `verifyTotp` tolère ±1 pas : le serveur
 *    accepte le code précédent, l'actuel et le suivant. Annoncer une expiration ferait attendre
 *    quelqu'un qui a déjà un code valide sous les yeux — une phrase juste sur la règle et fausse
 *    sur le fait, la faute du chantier 13.
 *
 * 2. **Le chiffre vient du SERVEUR.** Calculé depuis `Date.now()`, il serait déphasé de tout l'écart
 *    d'une horloge mal réglée, et contredirait le téléphone que l'utilisateur a en main.
 *
 * 3. **Rien ne s'affiche quand le serveur n'a pas répondu.** Ni « — », ni zéro, ni un anneau figé.
 *    Un décompte faux est pire que pas de décompte : il sert à décider s'il faut attendre.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DecompteTotp } from '@/components/ulamu/DecompteTotp'
import { api } from '@/lib/api'

function monter() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DecompteTotp />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Le décompte du code TOTP', () => {
  it('annonce un NOUVEAU code, jamais une expiration', async () => {
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 22 })

    monter()

    expect(await screen.findByText(/Nouveau code dans 22 s/)).toBeInTheDocument()
    /*
      Le mot interdit, et lui seul. On n'interdit pas « code » ni « seconde » : c'est le FAIT
      « ça expire » qu'on refuse, pas le vocabulaire — leçon du chantier 16.
    */
    expect(document.body.textContent).not.toMatch(/expire/i)
  })

  it('affiche le chiffre du serveur, et pas celui de l’horloge locale', async () => {
    /*
      7 est choisi exprès : il ne peut pas sortir d'un calcul local au moment du test. Si le
      composant recalculait depuis `Date.now()`, la valeur affichée dépendrait de l'heure réelle
      d'exécution et ce test échouerait la plupart du temps — c'est ce qu'on veut.
    */
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 7 })

    monter()

    expect(await screen.findByText(/Nouveau code dans 7 s/)).toBeInTheDocument()
  })

  it('décroît seconde par seconde', async () => {
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 20 })

    monter()
    await screen.findByText(/Nouveau code dans 20 s/)

    await vi.advanceTimersByTimeAsync(3000)

    await waitFor(() => expect(screen.getByText(/Nouveau code dans 17 s/)).toBeInTheDocument())
  })

  /*
    LE cas qui distingue ce décompte de tous les autres du projet : il BOUCLE. Les autres comptent
    vers une échéance et s'arrêtent à zéro ; celui-ci repart de la période entière, parce qu'un
    nouveau pas commence. Sans le modulo, il afficherait des valeurs négatives.
  */
  it('repart de la période entière au lieu de tomber à zéro', async () => {
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 2 })

    monter()
    await screen.findByText(/Nouveau code dans 2 s/)

    // Deux secondes plus tard le pas bascule : on doit lire 30, jamais 0 ni un nombre négatif.
    await vi.advanceTimersByTimeAsync(2000)

    await waitFor(() => expect(screen.getByText(/Nouveau code dans 30 s/)).toBeInTheDocument())
    expect(document.body.textContent).not.toMatch(/-\d+ s/)
  })

  /*
    Sous cinq secondes, l'écran ne se contente pas d'afficher le chiffre : il dit quoi FAIRE.
    Commencer à taper six chiffres avec trois secondes devant soi, c'est taper un code qui change au
    milieu — et lire « code invalide » sans comprendre pourquoi.
  */
  it('conseille d’attendre quand il ne reste presque plus rien', async () => {
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 3 })

    monter()

    expect(await screen.findByText(/attendez-le/)).toBeInTheDocument()
  })

  it('ne conseille rien quand il reste largement le temps', async () => {
    vi.spyOn(api, 'rythmeTotp').mockResolvedValue({ periodeSecondes: 30, secondesAvantNouveauCode: 25 })

    monter()
    await screen.findByText(/Nouveau code dans 25 s/)

    expect(document.body.textContent).not.toMatch(/attendez-le/)
  })

  /*
    Le silence, et c'est le point du principe : « on lit un chiffre du serveur, ou on ne l'affiche
    pas ». Un décompte inventé ferait attendre pour rien, ou taper trop tard.
  */
  it('ne montre RIEN quand le serveur n’a pas répondu', async () => {
    vi.spyOn(api, 'rythmeTotp').mockRejectedValue(new Error('réseau'))

    const { container } = monter()

    await waitFor(() => expect(container.querySelector('svg')).toBeNull())
    expect(document.body.textContent).not.toMatch(/Nouveau code/)
  })
})
