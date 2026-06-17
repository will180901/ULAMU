import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Tabs — onglets soulignés. items: [{id,label,icon?,badge?}]. */
export function Tabs({ items = [], value, onChange, style = {} }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', ...style }}>
      {items.map((it) => {
        const active = it.id === value;
        return <Tab key={it.id} item={it} active={active} onChange={onChange} />;
      })}
    </div>
  );
}

function Tab({ item, active, onChange }) {
  const [hover, setHover] = React.useState(false);
  const color = active ? 'var(--text-accent)' : hover ? 'var(--text-primary)' : 'var(--text-tertiary)';
  return (
    <button type="button" role="tab" aria-selected={active} onClick={() => onChange && onChange(item.id)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0 4px 10px', marginBottom: -1, color,
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
        borderBottom: `2px solid ${active ? 'var(--accent-500)' : 'transparent'}`,
        transition: 'color var(--dur-fast) linear, border-color var(--dur-fast) linear',
      }}>
      {item.icon && <Icon name={item.icon} size={15} />}
      {item.label}
      {item.badge != null && (
        <span style={{
          minWidth: 17, height: 17, padding: '0 5px', borderRadius: 9,
          background: 'var(--bg-muted)', color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{item.badge}</span>
      )}
    </button>
  );
}
