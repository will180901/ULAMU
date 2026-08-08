/**
 * Consentement à l'inscription — EF-01-08 et loi n° 29-2019.
 *
 * Ce test protège d'une régression qui n'était pas hypothétique : jusqu'au 2026-08-05, le serveur
 * créait les enregistrements de `Consentement` **inconditionnellement** à chaque inscription, sans
 * qu'aucun champ n'indique que l'utilisateur avait accepté — et l'app web ne le lui demandait même
 * jamais. Le modèle de données qualifie pourtant cette entité de « preuve légale, immuable ».
 *
 * Trois propriétés sont donc verrouillées ici, et il suffit qu'une seule tombe pour que la preuve
 * redevienne fictive :
 *   1. la case existe et n'est **jamais pré-cochée** — un consentement par défaut n'en est pas un ;
 *   2. tant qu'elle n'est pas cochée, on **ne peut pas avancer** ;
 *   3. le libellé nomme les documents ET leurs versions, pour qu'on sache à QUOI on consent.
 */
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { useSessionStore } from '@/state/session.store'

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
 * `delay: null` sur `userEvent.setup()` : par défaut, la bibliothèque simule une frappe HUMAINE avec
 * une pause entre chaque touche. Cinq champs à remplir, multipliés par l'exécution parallèle des
 * fichiers de test, faisaient frôler puis dépasser le délai d'expiration — un test qui échoue une
 * fois sur cinq est pire qu'un test absent : on finit par ignorer ses alertes. Ici la vitesse de
 * frappe ne fait pas partie de ce qu'on vérifie.
 */

/** Amène jusqu'à l'étape « Sécurité » par le chemin le plus court (membre de structure, 3 étapes). */
async function allerAEtapeSecurite(u: ReturnType<typeof userEvent.setup>) {
  await u.click(screen.getByText('Structure / Pharmacie'))
  await u.type(screen.getByLabelText(/Téléphone/i), '+242060000001')
  await u.type(screen.getByLabelText(/^Email/i), 'titulaire@exemple.com')
  await u.type(screen.getByLabelText(/Nom d'utilisateur/i), 'titulaire.test')
  await u.type(screen.getByLabelText(/Prénom/i), 'Bruno')
  // Expression ANCRÉE, et qui tolère l'astérisque : `Field` suffixe les libellés obligatoires d'un
  // « * », donc le texte réel est « Nom * ». Sans l'ancrage, on attraperait « Nom d'utilisateur ».
  await u.type(screen.getByLabelText(/^Nom\s*\*?\s*$/), 'Ossona')
  await u.click(screen.getByRole('button', { name: /Continuer/i }))
}

describe('consentement à l’inscription (EF-01-08)', () => {
  it('présente une case NON pré-cochée', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await allerAEtapeSecurite(u)

    const case_ = screen.getByRole('checkbox')
    expect(case_).toBeInTheDocument()
    expect(case_).not.toBeChecked()
  })

  it('interdit d’avancer tant que la case n’est pas cochée', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await allerAEtapeSecurite(u)

    await u.type(screen.getByLabelText(/^Mot de passe/i), 'motdepasse1')
    await u.type(screen.getByLabelText(/Confirmez le mot de passe/i), 'motdepasse1')

    // Mots de passe valides et identiques : seul le consentement manque encore.
    expect(screen.getByRole('button', { name: /Continuer/i })).toBeDisabled()

    await u.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: /Continuer/i })).toBeEnabled()
  })

  it('nomme les deux documents ET leurs versions', async () => {
    const u = userEvent.setup({ delay: null })
    monter()
    await allerAEtapeSecurite(u)

    const libelle = screen.getByRole('checkbox').closest('label')
    expect(libelle).toHaveTextContent(/conditions générales/i)
    expect(libelle).toHaveTextContent(/politique de confidentialité/i)
    // Les versions doivent correspondre à celles que le serveur enregistre (CGU 1.0 / PRIVACY 1.0).
    expect(libelle?.textContent?.match(/v1\.0/g) ?? []).toHaveLength(2)
  })
})
