import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** NavItem — entrée de navigation latérale Ulamu (icône + label + pastille). */
export function NavItem({ icon, label, active = false, badge, collapsed = false, onClick, style = {}, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const bg = active ? 'rgba(39,86,166,0.14)' : hover ? 'var(--bg-subtle)' : 'transparent';
  const color = active ? 'var(--text-accent)' : hover ? 'var(--text-primary)' : 'var(--text-tertiary)';
  return (
    <button type="button" onClick={onClick} title={collapsed ? label : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        height: 36, width: '100%', border: 'none', cursor: 'pointer',
        padding: collapsed ? 0 : '0 12px', justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-md)', background: bg, color,
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, textAlign: 'left',
        transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear',
        ...style,
      }} {...rest}>
      {icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}><Icon name={icon} size={16} strokeWidth={active ? 1.6 : 1.5} /></span>}
      {!collapsed && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      {!collapsed && badge != null && (
        <span style={{
          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
          background: active ? 'var(--accent-500)' : 'var(--bg-muted)',
          color: active ? '#fff' : 'var(--text-secondary)',
          border: active ? 'none' : '1px solid var(--border-default)',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge}</span>
      )}
    </button>
  );
}
