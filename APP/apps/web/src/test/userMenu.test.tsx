/**
 * Menu utilisateur du pied de barre — la structure imposée par CG-06 §07 :
 * « Actions destructives : toujours **en bas** du menu, **couleur danger**, **séparateur avant** ».
 *
 * Ces trois points sont testés séparément parce qu'ils protègent d'un accident concret : se
 * déconnecter par erreur d'un poste partagé en officine, en pleine délivrance d'ordonnance. Un menu
 * où « Se déconnecter » remonterait au milieu, un jour, par commodité de code, ferait exactement ça.
 */
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UserMenu } from '@/components/layout/UserMenu'
import { useSessionStore } from '@/state/session.store'
import { useThemeStore } from '@/state/theme.store'
import type { MeResponse } from '@/lib/api'

const ME: MeResponse = {
  accountId: 'a1',
  accountType: 'FACILITY_MEMBER',
  adminRole: null,
  username: 'pharma.demo',
  phone: '+242060000000',
  firstName: 'Bruno',
  lastName: 'Ossona',
  district: null,
  category: null,
  specialty: null,
  biography: null,
  totpEnabled: true,
}

function monter() {
  useSessionStore.getState().setSession('jeton', ME)
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  )
}

describe('menu utilisateur', () => {
  it('affiche le nom et le rôle sur le bouton, avant toute ouverture', () => {
    monter()
    expect(screen.getByText('Bruno Ossona')).toBeInTheDocument()
    expect(screen.getByText('Structure')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('ouvre un menu contenant les trois entrées attendues', async () => {
    const user = userEvent.setup()
    monter()
    await user.click(screen.getByRole('button', { expanded: false }))

    const menu = screen.getByRole('menu')
    const entrees = within(menu).getAllByRole('menuitem').map((e) => e.textContent)
    expect(entrees[0]).toContain('Mes paramètres')
    expect(entrees[1]).toContain('Thème')
    expect(entrees[2]).toContain('Se déconnecter')
  })

  it('place la déconnexion EN DERNIER, en danger, précédée d’un séparateur (CG-06 §07)', async () => {
    const user = userEvent.setup()
    monter()
    await user.click(screen.getByRole('button', { expanded: false }))

    const menu = screen.getByRole('menu')
    const entrees = within(menu).getAllByRole('menuitem')
    const deconnexion = entrees[entrees.length - 1]

    expect(deconnexion).toHaveTextContent('Se déconnecter')
    expect(deconnexion.className).toContain('ul-menu__item--danger')

    // Le séparateur doit se trouver JUSTE avant, pas n'importe où dans le menu.
    const separateurs = within(menu).getAllByRole('separator')
    expect(separateurs.length).toBeGreaterThan(0)
    expect(deconnexion.previousElementSibling).toBe(separateurs[separateurs.length - 1])
  })

  it('bascule le thème sans refermer le menu — on doit pouvoir comparer clair et sombre', async () => {
    const user = userEvent.setup()
    monter()
    await user.click(screen.getByRole('button', { expanded: false }))

    const avant = useThemeStore.getState().choice
    await user.click(screen.getByRole('menuitem', { name: /thème/i }))

    expect(useThemeStore.getState().choice).not.toBe(avant)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('parcourt le thème clair → sombre → système, pour que « système » reste atteignable', async () => {
    const user = userEvent.setup()
    monter()
    await user.click(screen.getByRole('button', { expanded: false }))
    const item = screen.getByRole('menuitem', { name: /thème/i })

    const vus: string[] = []
    for (let i = 0; i < 3; i++) {
      await user.click(item)
      vus.push(useThemeStore.getState().choice)
    }
    expect(new Set(vus)).toEqual(new Set(['light', 'dark', 'system']))
  })

  it('se ferme sur Échap en rendant le focus au bouton', async () => {
    const user = userEvent.setup()
    monter()
    const bouton = screen.getByRole('button', { expanded: false })
    await user.click(bouton)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    // Sans restitution du focus, l'utilisateur au clavier se retrouve projeté en haut de page.
    expect(document.activeElement).toBe(bouton)
  })
})
