/**
 * A4 « Configuration 2FA » — l'écran où un compte gagne son second facteur.
 *
 * Ce qui rend cet écran particulier : il produit **dix codes de secours qui ne seront plus jamais
 * réaffichés**. Le serveur ne les stocke qu'en empreinte — il ne PEUT pas les redonner. Si
 * l'utilisateur quitte l'écran sans les noter, il n'a plus qu'un seul chemin de retour : son
 * téléphone. Le jour où il le perd, le compte est fermé pour de bon.
 *
 * Trois propriétés sont donc verrouillées ici, et il suffit qu'une tombe pour que ce risque
 * redevienne réel :
 *
 *  1. la phrase « plus jamais affichés » est présente, et les dix codes sont tous rendus ;
 *  2. on ne peut PAS revenir en arrière une fois les codes affichés — le serveur a déjà enregistré
 *     l'activation, et rejouer une configuration qui n'existe plus n'aboutirait qu'à une erreur ;
 *  3. le bouton d'activation reste inerte tant que les six chiffres ne sont pas saisis, pour ne pas
 *     consommer une tentative sur un code incomplet.
 *
 * Le quatrième test couvre la panne : cet écran est le premier appel après la connexion, donc celui
 * qui réveille le serveur endormi du plan gratuit. Un échec doit proposer une sortie (CG-08 §06).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TotpSetupPage } from '@/modules/auth/pages/TotpSetupPage'
import { useSessionStore } from '@/state/session.store'
import { api } from '@/lib/api'

const SECRET = 'JBSWY3DPEHPK3PXP'
const CODES = Array.from({ length: 10 }, (_, i) => `code${i}abcd`)

function monter() {
  useSessionStore.setState({ token: 'jeton', me: null, isAuthenticated: true, hasHydrated: true })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TotpSetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('A4 — préparation du second facteur', () => {
  it('le secret est lisible à la main quand le QR ne peut pas être scanné', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'setupTotp').mockResolvedValue({ secret: SECRET, provisioningUri: 'otpauth://totp/x' })
    monter()

    // Sur un poste de bureau sans téléphone à portée, ou avec un appareil photo hors service, la
    // saisie manuelle est la seule voie. Elle ne doit pas être un cul-de-sac.
    await utilisateur.click(await screen.findByRole('button', { name: /Saisir le code à la main/ }))
    expect(screen.getByText(SECRET)).toBeInTheDocument()
  })

  it("une panne de préparation propose de réessayer plutôt que d'abandonner l'utilisateur", async () => {
    vi.spyOn(api, 'setupTotp').mockRejectedValue(new Error('serveur endormi'))
    monter()

    expect(await screen.findByText('Configuration indisponible')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument()
  })
})

describe('A4 — vérification du code', () => {
  it("cinq chiffres ne suffisent pas : le bouton d'activation reste inerte", async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'setupTotp').mockResolvedValue({ secret: SECRET, provisioningUri: 'otpauth://totp/x' })
    const confirmer = vi.spyOn(api, 'confirmTotp').mockResolvedValue({ backupCodes: CODES })
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: /C'est scanné/ }))
    expect(await screen.findByRole('button', { name: /Activer la double authentification/ })).toBeDisabled()

    // Un code incomplet consommerait une tentative pour rien — et il n'y en a que trois.
    await utilisateur.keyboard('12345')
    expect(screen.getByRole('button', { name: /Activer la double authentification/ })).toBeDisabled()
    expect(confirmer).not.toHaveBeenCalled()
  })

  it("le sixième chiffre lance la vérification sans qu'on ait à cliquer", async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'setupTotp').mockResolvedValue({ secret: SECRET, provisioningUri: 'otpauth://totp/x' })
    const confirmer = vi.spyOn(api, 'confirmTotp').mockResolvedValue({ backupCodes: CODES })
    monter()

    await utilisateur.click(await screen.findByRole('button', { name: /C'est scanné/ }))
    await screen.findByRole('button', { name: /Activer la double authentification/ })
    await utilisateur.keyboard('123456')

    // `onComplete` sur le champ à six cases : le bouton reste là pour qui préfère cliquer, mais le
    // geste normal est de finir de taper. Un clic de plus après six chiffres n'apporte rien.
    await waitFor(() => expect(confirmer).toHaveBeenCalledWith('123456'))
    expect(await screen.findByText(/plus jamais affichés/)).toBeInTheDocument()
  })
})

describe('A4 — les codes de secours', () => {
  async function allerJusquAuxCodes() {
    const utilisateur = userEvent.setup()
    vi.spyOn(api, 'setupTotp').mockResolvedValue({ secret: SECRET, provisioningUri: 'otpauth://totp/x' })
    vi.spyOn(api, 'confirmTotp').mockResolvedValue({ backupCodes: CODES })
    monter()
    await utilisateur.click(await screen.findByRole('button', { name: /C'est scanné/ }))
    await screen.findByRole('button', { name: /Activer la double authentification/ })
    // Le sixième chiffre suffit : le champ déclenche lui-même la vérification (`onComplete`).
    await utilisateur.keyboard('123456')
    return utilisateur
  }

  it('les dix codes sont affichés, avec l’avertissement qu’on ne les reverra jamais', async () => {
    await allerJusquAuxCodes()

    expect(await screen.findByText(/plus jamais affichés/)).toBeInTheDocument()
    // Les dix, pas neuf : le serveur n'en garde que l'empreinte, il ne peut pas redonner celui qui
    // manquerait à l'écran.
    for (const c of CODES) expect(screen.getByText(c)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copier les 10 codes de secours/ })).toBeInTheDocument()
  })

  it('on ne peut plus revenir en arrière : l’activation est déjà enregistrée', async () => {
    const utilisateur = await allerJusquAuxCodes()
    await screen.findByText(/plus jamais affichés/)

    // La frise reste visible mais ses étapes ne répondent plus. Repartir sur « Scanner » rejouerait
    // une configuration que le serveur a déjà close — au mieux une erreur, au pire des codes perdus.
    const scanner = screen.getByRole('button', { name: /Scanner/ })
    await utilisateur.click(scanner)
    expect(screen.getByText(/plus jamais affichés/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /C'est scanné/ })).not.toBeInTheDocument()
  })
})
