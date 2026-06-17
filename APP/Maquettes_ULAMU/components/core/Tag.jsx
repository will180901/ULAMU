import React from 'react';
import { Icon } from './Icon.jsx';

/** Tag — étiquette de filtre/sélection, optionnellement supprimable. */
export function Tag({ icon, onRemove, children, style = {}, ...rest }) {
  const [hov, setHov] = React.useState(false);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
      padding: onRemove ? '3px 6px 3px 10px' : '3px 10px',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
      background: 'var(--bg-muted)', color: 'var(--text-primary)', whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      {icon && <Icon name={icon} size={12} />}
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Retirer"
          onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
          style={{
            width: 14, height: 14, borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: hov ? 'var(--error-bg)' : 'var(--bg-elevated)',
            color: hov ? 'var(--error-dot)' : 'var(--text-tertiary)',
            transition: 'background var(--dur-fast) linear, color var(--dur-fast) linear',
          }}>
          <Icon name="x" size={9} strokeWidth={2} />
        </button>
      )}
    </span>
  );
}
