/**
 * Barre latérale — CG-06 §01.
 *
 * Trois états, comme la charte les définit :
 *  • **étendue** 240px — icône + libellé + badge ;
 *  • **réduite** 56px — icônes seules, le libellé revient en infobulle au survol ;
 *  • **cachée** — hors écran sur mobile, revient en surimpression au-dessus d'un voile.
 *
 * La version précédente n'en avait qu'un seul (« largeur fixe toujours dépliée, comme CMS-SARIS ») et
 * mesurait 260px alors que le token `--layout-sidebar-width` valait déjà 240 : la valeur était codée
 * en dur dans le composant, donc le token ne servait à rien.
 *
 * Réduire ne masque PAS les libellés dans le DOM — ils restent lus par les lecteurs d'écran. On ne
 * ferme pas l'accessibilité en même temps qu'on ferme le panneau.
 */
import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { useUiStore } from '@/state/ui.store'
import { Logo } from '@/components/ulamu/Logo'
import { UserMenu } from './UserMenu'

export function Sidebar() {
  const groups = useNavigation()
  const collapsed = useUiStore((s) => s.collapsed)
  const mobileOpen = useUiStore((s) => s.mobileOpen)
  const toggleCollapsed = useUiStore((s) => s.toggleCollapsed)
  const setMobileOpen = useUiStore((s) => s.setMobileOpen)
  const { pathname } = useLocation()

  // Naviguer referme la barre sur mobile : la laisser ouverte masquerait la page qu'on vient
  // justement de demander.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  return (
    <aside
      className={[
        'ul-sidebar',
        'saris-grain',
        collapsed ? 'ul-sidebar--collapsed' : '',
        mobileOpen ? 'ul-sidebar--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Navigation principale"
    >
      <div className="ul-sidebar__head">
        {!collapsed ? <Logo size={24} /> : null}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ul-icon-btn saris-focus-ring ul-tip"
          data-tip={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          style={{ marginLeft: collapsed ? 'auto' : undefined, marginRight: collapsed ? 'auto' : undefined }}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="ul-sidebar__nav">
        {groups.map((group, gi) => (
          <div className="ul-sidebar__group" key={group.label ?? gi}>
            {group.label ? (
              /* Monospace majuscule — bonne pratique obligatoire CG-06 §07. Réduit, on n'en garde
                 qu'un filet discret : un intitulé tronqué à 56px serait illisible et laid. */
              <div className="ul-nav-group-label" aria-hidden={collapsed}>
                {collapsed ? '·' : <span>{group.label}</span>}
              </div>
            ) : null}
            {group.items.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                className={({ isActive }) =>
                  ['ul-nav-item', 'saris-focus-ring', 'ul-tip', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
                }
                data-tip={item.label}
              >
                <item.icon size={17} className="ul-nav-item__icon" aria-hidden="true" />
                <span className="ul-nav-item__label">{item.label}</span>
                {item.badge ? (
                  <span className={['ul-nav-badge', item.badgeTone === 'urgent' ? 'ul-nav-badge--urgent' : ''].filter(Boolean).join(' ')}>
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="ul-sidebar__foot">
        <UserMenu />
      </div>
    </aside>
  )
}
