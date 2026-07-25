/** Sidebar rail — repliable, verre dépoli, item actif = fond ap-50 + barre gauche cobalt. */
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'
import { useSessionStore } from '@/state/session.store'
import { ROLE_META } from '@/config/navigation.config'
import { api } from '@/lib/api'

const EXPANDED = 260
const COLLAPSED = 68

export function Sidebar() {
  const [hovered, setHovered] = useState(false)
  const groups = useNavigation()
  const me = useSessionStore((s) => s.me)
  const logout = useSessionStore((s) => s.logout)
  const width = hovered ? EXPANDED : COLLAPSED
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="saris-grain"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width,
        background: 'var(--glass-sidebar-bg)',
        backdropFilter: 'blur(var(--glass-sidebar-blur))',
        borderRight: '1px solid var(--glass-bordure)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.15s ease',
        overflow: 'hidden',
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 'var(--layout-topbar-height)', paddingInline: 16, flexShrink: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--ap-400)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          U
        </div>
        {hovered ? <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--texte-primaire)', whiteSpace: 'nowrap' }}>ULAMU Pro</span> : null}
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', paddingInline: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groups.map((group, gi) => (
          <div key={gi}>
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
                {hovered ? item.label : null}
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
        {hovered ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--font-size-body-sm)', fontWeight: 600, color: 'var(--texte-primaire)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {me?.firstName ? `${me.firstName} ${me.lastName ?? ''}` : (me?.username ?? '—')}
            </div>
            <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)' }}>{roleMeta?.label}</div>
          </div>
        ) : null}
        {hovered ? (
          <button onClick={handleLogout} aria-label="Se déconnecter" style={{ background: 'none', border: 'none', color: 'var(--texte-tertiaire)', display: 'flex' }}>
            <LogOut size={16} />
          </button>
        ) : null}
      </div>
    </aside>
  )
}

export { COLLAPSED as SIDEBAR_RAIL_WIDTH }
