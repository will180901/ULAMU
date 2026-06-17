import React from 'react';
import { Icon } from './Icon.jsx';

const TONES = {
  neutral: { bg: 'var(--bg-muted)',     fg: 'var(--text-secondary)', bd: 'var(--border-default)', dot: 'var(--text-tertiary)' },
  accent:  { bg: 'rgba(39,86,166,0.12)', fg: 'var(--text-accent)',    bd: 'rgba(39,86,166,0.28)',  dot: 'var(--accent-500)' },
  success: { bg: 'var(--success-bg)',   fg: 'var(--success-text)',   bd: 'var(--success-border)', dot: 'var(--success-dot)' },
  warning: { bg: 'var(--warning-bg)',   fg: 'var(--warning-text)',   bd: 'var(--warning-border)', dot: 'var(--warning-dot)' },
  error:   { bg: 'var(--error-bg)',     fg: 'var(--error-text)',     bd: 'var(--error-border)',   dot: 'var(--error-dot)' },
  info:    { bg: 'var(--info-bg)',      fg: 'var(--info-text)',      bd: 'var(--info-border)',    dot: 'var(--info-dot)' },
};

/** Badge — étiquette de statut. Point sémantique ou icône optionnels. */
export function Badge({ tone = 'neutral', dot = false, icon, children, size = 'md', style = {}, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  const small = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 4 : 5,
      fontFamily: 'var(--font-body)', fontWeight: 500,
      fontSize: small ? 11 : 12, lineHeight: 1.4,
      padding: small ? '2px 7px' : '3px 9px',
      borderRadius: 'var(--radius-sm)',
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, flexShrink: 0 }} />}
      {icon && <Icon name={icon} size={small ? 11 : 12} />}
      {children}
    </span>
  );
}
