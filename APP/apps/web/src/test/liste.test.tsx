/**
 * `Liste` — la liste déroulante d'ULAMU, en remplacement des listes natives (01/09/2026).
 *
 * ── Ce qui est verrouillé ici ─────────────────────────────────────────────────────────────────
 *
 *  1. **Rien de la liste native n'est perdu.** Une liste maison qui casserait le clavier ou les
 *     lecteurs d'écran serait un recul, pas une amélioration : c'est la première chose à prouver.
 *  2. **Une option peut porter son explication.** C'est la raison d'être du remplacement — les
 *     aides vivaient sous le champ, et ne décrivaient que l'option DÉJÀ choisie : il fallait
 *     choisir pour savoir ce qu'on choisissait.
 *  3. **Aucune couleur en dur.** Le menu s'habille de `--popover` et de `--texte-tertiaire`, qui
 *     sont redéfinis en thème sombre. Un `#fff` écrit ici rendrait le menu blanc sur fond noir —
 *     exactement le défaut des listes natives qu'on remplace.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Liste } from '@/components/ulamu/Liste'

const OPTIONS = [
  { cle: 'a', label: 'Vérification', aide: 'Instruire les dossiers, décider des badges' },
  { cle: 'b', label: 'Finance', aide: 'Remboursements manuels et rapprochement' },
  { cle: 'c', label: 'Sans aide' },
] as const

/** Une liste pilotée, comme dans les écrans : la valeur remonte, l'affichage suit. */
function Essai({ onChange }: { onChange?: (v: string) => void } = {}) {
  const [valeur, setValeur] = useState<string>('a')
  return (
    <Liste
      label="Sous-rôle"
      valeur={valeur}
      onChange={(v) => {
        setValeur(v)
        onChange?.(v)
      }}
      options={OPTIONS.map((o) => ({ ...o }))}
    />
  )
}

beforeEach(() => {
  document.body.style.pointerEvents = ''
  document.body.removeAttribute('data-scroll-locked')
})

describe('Liste — ce qu’une liste native savait faire', () => {
  it('porte un nom accessible et annonce son rôle', async () => {
    render(<Essai />)

    // `combobox` : le rôle qu'un lecteur d'écran attend d'une liste déroulante.
    const champ = screen.getByRole('combobox', { name: 'Sous-rôle' })
    expect(champ).toBeInTheDocument()
    expect(champ).toHaveTextContent('Vérification')
  })

  it('s’ouvre au clavier et se choisit au clavier', async () => {
    const utilisateur = userEvent.setup()
    const change = vi.fn()
    render(<Essai onChange={change} />)

    screen.getByRole('combobox', { name: 'Sous-rôle' }).focus()
    await utilisateur.keyboard('{Enter}')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()

    await utilisateur.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(change).toHaveBeenCalledWith('b'))
  })

  it('se referme sur Échap sans rien changer', async () => {
    const utilisateur = userEvent.setup()
    const change = vi.fn()
    render(<Essai onChange={change} />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Sous-rôle' }))
    await screen.findByRole('listbox')
    await utilisateur.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(change).not.toHaveBeenCalled()
  })

  it('remonte la valeur choisie à la souris', async () => {
    const utilisateur = userEvent.setup()
    const change = vi.fn()
    render(<Essai onChange={change} />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Sous-rôle' }))
    await utilisateur.click(await screen.findByRole('option', { name: /Finance/ }))

    await waitFor(() => expect(change).toHaveBeenCalledWith('b'))
    expect(screen.getByRole('combobox', { name: 'Sous-rôle' })).toHaveTextContent('Finance')
  })

  it('marque l’option courante comme sélectionnée', async () => {
    const utilisateur = userEvent.setup()
    render(<Essai />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Sous-rôle' }))

    const courante = await screen.findByRole('option', { name: /Vérification/ })
    expect(courante).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Liste — ce qu’une liste native ne savait PAS faire', () => {
  it('affiche l’explication DANS l’option, avant qu’on choisisse', async () => {
    const utilisateur = userEvent.setup()
    render(<Essai />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Sous-rôle' }))

    // C'est toute la raison du remplacement : l'aide se lit avant le choix, pas après.
    expect(await screen.findByText('Instruire les dossiers, décider des badges')).toBeInTheDocument()
    expect(screen.getByText('Remboursements manuels et rapprochement')).toBeInTheDocument()
  })

  it('accepte une option sans aide, sans laisser de ligne vide', async () => {
    const utilisateur = userEvent.setup()
    render(<Essai />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Sous-rôle' }))

    const sansAide = await screen.findByRole('option', { name: 'Sans aide' })
    expect(sansAide).toHaveTextContent(/^Sans aide$/)
  })

  it('n’écrit AUCUNE couleur en dur : tout passe par les jetons du thème', () => {
    render(<Essai />)

    const champ = screen.getByRole('combobox', { name: 'Sous-rôle' })
    // Un `#fff` ou un `rgb()` ici rendrait le menu blanc en thème sombre — le défaut même des
    // listes natives qu'on remplace.
    expect(champ.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i)
    expect(champ.className).toMatch(/bg-card|border-input/)
  })

  it('se règle en petite taille sans changer de comportement', async () => {
    const utilisateur = userEvent.setup()
    render(
      <Liste label="Filtre" valeur="a" onChange={() => {}} options={[{ cle: 'a', label: 'Tout' }]} taille="sm" />,
    )

    const champ = screen.getByRole('combobox', { name: 'Filtre' })
    expect(champ).toHaveAttribute('data-size', 'sm')

    await utilisateur.click(champ)
    expect(await screen.findByRole('option', { name: 'Tout' })).toBeInTheDocument()
  })

  it('refuse le choix quand elle est désactivée', async () => {
    const utilisateur = userEvent.setup()
    const change = vi.fn()
    render(<Liste label="Filtre" valeur="a" onChange={change} options={[{ cle: 'a', label: 'Tout' }]} disabled />)

    await utilisateur.click(screen.getByRole('combobox', { name: 'Filtre' }))

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(change).not.toHaveBeenCalled()
  })
})
