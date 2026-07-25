/** Sidebar — largeur fixe toujours dépliée (comme CMS-SARIS), verre dépoli, item actif = fond ap-50 + barre gauche cobalt. */
import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { useSessionStore } from '@/state/session.store'
import { ROLE_META } from '@/config/navigation.config'
import { Logo } from '@/components/ulamu/Logo'
import { api } from '@/lib/api'

const WIDTH = 260

export function Sidebar() {
  const groups = useNavigation()
  const me = useSessionStore((s) => s.me)
  const logout = useSessionStore((s) => s.logout)
  const roleMeta = me ? ROLE_META[me.accountType] : undefined

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // best-effort — on déconnecte localement quoi qu'il arrive
    }
    logout()
  }

  return (
    <aside
      className="saris-grain"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: WIDTH,
        background: 'var(--glass-sidebar-bg)',
        backdropFilter: 'blur(var(--glass-sidebar-blur))',
        borderRight: '1px solid var(--glass-bordure)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 'var(--layout-topbar-height)', paddingInline: 16, flexShrink: 0 }}>
        <Logo size={26} />
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', paddingInline: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginTop: gi > 0 ? 'var(--espace-3)' : 0 }}>
            {group.label ? (
              <div className="saris-overline" style={{ paddingInline: 12, marginBottom: 6 }}>
                {group.label}
              </div>
            ) : null}
            {group.items.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  height: 40,
                  paddingInline: 12,
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'var(--ap-700)' : 'var(--texte-secondaire)',
                  background: isActive ? 'var(--ap-50)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--ap-400)' : '3px solid transparent',
                  fontSize: 'var(--font-size-body-sm)',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                })}
              >
                <item.icon size={18} style={{ flexShrink: 0 }} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--glass-bordure)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: roleMeta?.bg ?? 'var(--fond-surface-2)',
            color: roleMeta?.text ?? 'var(--texte-secondaire)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(me?.firstName?.[0] ?? me?.username?.[0] ?? '?').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--font-size-body-sm)', fontWeight: 600, color: 'var(--texte-primaire)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {me?.firstName ? `${me.firstName} ${me.lastName ?? ''}` : (me?.username ?? '—')}
          </div>
          <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)' }}>{roleMeta?.label}</div>
        </div>
        <button onClick={handleLogout} aria-label="Se déconnecter" style={{ background: 'none', border: 'none', color: 'var(--texte-tertiaire)', display: 'flex', cursor: 'pointer' }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

export { WIDTH as SIDEBAR_WIDTH }
