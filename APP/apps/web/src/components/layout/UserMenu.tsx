/**
 * Bloc utilisateur du pied de barre latérale — CG-06 §01 (avatar + nom + rôle) et §06 (menu).
 *
 * Ordre des entrées dicté par la charte, pas par le hasard : les actions de confort d'abord, la
 * déconnexion **en dernier**, en couleur danger, précédée d'un filet (CG-06 §07, « actions
 * destructives : toujours en bas du menu, couleur danger, séparateur avant »). Se déconnecter d'un
 * poste partagé en officine par erreur, en pleine délivrance, coûte cher.
 *
 * La bascule de thème garde le menu ouvert : on veut pouvoir essayer clair puis sombre et voir la
 * différence sans rouvrir le menu à chaque fois.
 */
import { useNavigate } from 'react-router-dom'
import { LogOut, Moon, Settings, Sun, Monitor, ChevronsUpDown } from 'lucide-react'
import { Avatar } from '@/components/ulamu/Avatar'
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/ulamu/Menu'
import { ROLE_META } from '@/config/navigation.config'
import { api } from '@/lib/api'
import { useSessionStore } from '@/state/session.store'
import { useThemeStore, resolveTheme, type ThemeChoice } from '@/state/theme.store'
import { useUiStore } from '@/state/ui.store'

const THEME_LABEL: Record<ThemeChoice, string> = { light: 'Clair', dark: 'Sombre', system: 'Système' }

export function UserMenu() {
  const navigate = useNavigate()
  const me = useSessionStore((s) => s.me)
  const logout = useSessionStore((s) => s.logout)
  const collapsed = useUiStore((s) => s.collapsed)
  const choice = useThemeStore((s) => s.choice)
  const setTheme = useThemeStore((s) => s.setTheme)

  const roleMeta = me ? ROLE_META[me.accountType] : undefined
  const displayName = me?.firstName ? `${me.firstName} ${me.lastName ?? ''}`.trim() : (me?.username ?? '—')

  const handleLogout = async () => {
    // Best-effort : si le réseau est coupé ou la session déjà expirée côté serveur, on déconnecte
    // localement quand même. Laisser l'utilisateur « connecté » parce qu'un appel a échoué serait
    // le pire des deux mondes — surtout sur un poste partagé.
    try {
      await api.logout()
    } catch {
      /* ignoré volontairement */
    }
    logout()
    navigate('/login', { replace: true })
  }

  /** Fait tourner Clair → Sombre → Système, pour que le mode « suivre le système » reste atteignable. */
  const cycleTheme = () => {
    const order: ThemeChoice[] = ['light', 'dark', 'system']
    setTheme(order[(order.indexOf(choice) + 1) % order.length])
  }

  const ThemeIcon = choice === 'system' ? Monitor : resolveTheme(choice) === 'dark' ? Moon : Sun

  return (
    <Menu
      label={`Compte de ${displayName}`}
      placement="top-start"
      trigger={(p) => (
        <button
          {...p}
          ref={p.ref}
          type="button"
          className="ul-user-btn saris-focus-ring ul-tip"
          data-tip={displayName}
        >
          <Avatar
            firstName={me?.firstName}
            lastName={me?.lastName}
            username={me?.username}
            accountType={me?.accountType}
            size={collapsed ? 28 : 32}
          />
          <span className="ul-user-btn__text">
            <span className="ul-user-btn__name">{displayName}</span>
            <span className="ul-user-btn__role">{roleMeta?.label ?? '—'}</span>
          </span>
          {!collapsed ? <ChevronsUpDown size={14} style={{ color: 'var(--texte-tertiaire)', flexShrink: 0 }} /> : null}
        </button>
      )}
    >
      <MenuLabel>{me?.username ?? 'Compte'}</MenuLabel>

      <MenuItem icon={<Settings size={16} />} onClick={() => navigate('/parametres')}>
        Mes paramètres
      </MenuItem>

      <MenuItem icon={<ThemeIcon size={16} />} onClick={cycleTheme} tail={THEME_LABEL[choice]} keepOpen>
        Thème
      </MenuItem>

      <MenuSeparator />

      <MenuItem icon={<LogOut size={16} />} onClick={handleLogout} danger>
        Se déconnecter
      </MenuItem>
    </Menu>
  )
}
