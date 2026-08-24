/**
 * Consentement à l'inscription — EF-01-08 et loi n° 29-2019.
 *
 * Ce test protège d'une régression qui n'était pas hypothétique : jusqu'au 05/08/2026, le serveur
 * créait les enregistrements de `Consentement` **inconditionnellement** à chaque inscription, sans
 * qu'aucun champ n'indique que l'utilisateur avait accepté — et l'app web ne le lui demandait même
 * jamais. Le modèle de données qualifie pourtant cette entité de « preuve légale, immuable ».
 *
 * Trois propriétés sont verrouillées ici, et il suffit qu'une seule tombe pour que la preuve
 * redevienne fictive :
 *   1. la case existe et n'est **jamais pré-cochée** — un consentement par défaut n'en est pas un ;
 *   2. tant qu'elle n'est pas cochée, le compte **ne peut pas être créé** ;
 *   3. le libellé nomme les documents ET leurs versions, pour qu'on sache à QUOI on consent.
 *
 * La case vit sur la DERNIÈRE étape depuis le 20/08/2026 : on consent au moment où le compte se
 * crée, pas deux écrans avant.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { useSessionStore } from '@/state/session.store'
import { api } from '@/lib/api'

function monter() {
  useSessionStore.getState().logout() // sinon la page redirige vers le tableau de bord
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Le remplissage utilise `fireEvent.change` et non `userEvent.type` : c'est de la MISE EN PLACE, pas
 * ce qu'on vérifie. `userEvent.type` rejoue chaque touche, ce qui multiplie le travail par le nombre
 * de caractères — sept champs, répétés avant chacun des trois tests, sous exécution parallèle des
 * fichiers : le délai de 5 s finissait par être dépassé environ une fois sur trois.
 *
 * Un test qui échoue par intermittence est pire qu'un test absent : on finit par ignorer ses
 * alertes. On supprime donc la cause plutôt que de relever la limite — `userEvent` reste utilisé
 * pour les gestes réellement sous test (cocher la case, cliquer le bouton).
 */
function remplir(libelle: RegExp, valeur: string) {
  fireEvent.change(screen.getByLabelText(libelle), { target: { value: valeur } })
}

const continuer = async (u: ReturnType<typeof userEvent.setup>) =>
  u.click(screen.getByRole('button', { name: /^Continuer$/i }))

/**
 * Parcours jusqu'à l'étape finale — cinq étapes.
 *
 * ⚠️ L'étape « type de compte » a disparu le 24/08/2026 avec le compte « Structure / Pharmacie » :
 * la branche officine sort du périmètre, et laisser créer un compte dont aucun écran n'existe serait
 * la pire des promesses. Comme il ne restait qu'un choix, l'étape entière est tombée — on ne fait
 * pas choisir entre une option et rien. Le parcours commence donc directement au contact.
 */
async function allerAEtapeFinale(u: ReturnType<typeof userEvent.setup>) {
  remplir(/Téléphone/i, '+242060000001')
  remplir(/^Email/i, 'titulaire@exemple.com')
  await continuer(u)

  remplir(/Nom d'utilisateur/i, 'titulaire.test')
  remplir(/Prénom/i, 'Bruno')
  // Ancrage à gauche seulement : le texte d'aide sous un champ fait partie du libellé
  // accessible, donc « Email » se lit « EmailVotre code de vérification… ». L'ancrage de fin
  // ne correspondrait à rien. Pour « Nom », l'ancrage des deux côtés reste nécessaire :
  // sans lui on attraperait aussi « Nom d'utilisateur ».
  remplir(/^Nom$/, 'Ossona')
  await continuer(u)

  // Étape « profil » : propre au parcours professionnel — une officine n'avait ni catégorie ni
  // spécialité, et c'est ce parcours-là qui a disparu.
  await continuer(u)

  remplir(/^Mot de passe/i, 'motdepasse1')
  remplir(/Confirmez le mot de passe/i, 'motdepasse1')
  await continuer(u)

  // L'étape « code » réclame un envoi d'OTP : c'est le seul appel réseau du parcours.
  await screen.findByRole('checkbox')
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'requestOtp').mockResolvedValue({ expiresInSeconds: 300 })
})

describe('consentement à l’inscription (EF-01-08)', () => {
  it('présente une case NON pré-cochée', async () => {
    monter()
    const u = userEvent.setup({ delay: null })
    await allerAEtapeFinale(u)

    const case_ = screen.getByRole('checkbox')
    expect(case_).toBeInTheDocument()
    expect(case_).not.toBeChecked()
  })

  it('interdit de créer le compte tant que la case n’est pas cochée', async () => {
    monter()
    const u = userEvent.setup({ delay: null })
    await allerAEtapeFinale(u)

    const creer = screen.getByRole('button', { name: /Créer mon compte/i })
    expect(creer).toBeDisabled()

    await u.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /Créer mon compte/i })).toBeEnabled()
  })

  it('nomme les deux documents ET leurs versions', async () => {
    monter()
    const u = userEvent.setup({ delay: null })
    await allerAEtapeFinale(u)

    const libelle = screen.getByRole('checkbox').closest('label')
    expect(libelle).toHaveTextContent(/conditions générales/i)
    expect(libelle).toHaveTextContent(/politique de confidentialité/i)
    // Les versions doivent correspondre à celles que le serveur enregistre (CGU 1.0 / PRIVACY 1.0).
    expect(libelle?.textContent?.match(/v1\.0/g) ?? []).toHaveLength(2)
  })
})
