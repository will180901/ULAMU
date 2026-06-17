import React from 'react';
import { Icon } from '../core/Icon.jsx';

const TONES = {
  info:    { bg: 'var(--info-bg)',    text: 'var(--info-text)',    border: 'var(--info-border)',    icon: 'info',            dot: 'var(--info-dot)' },
  success: { bg: 'var(--success-bg)', text: 'var(--success-text)', border: 'var(--success-border)', icon: 'check-circle',    dot: 'var(--success-dot)' },
  warning: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', border: 'var(--warning-border)', icon: 'alert-triangle',  dot: 'var(--warning-dot)' },
  error:   { bg: 'var(--error-bg)',   text: 'var(--error-text)',   border: 'var(--error-border)',   icon: 'alert-circle',    dot: 'var(--error-dot)' },
};

/** Banner — message contextuel en bloc (info, succès, alerte, erreur). */
export function Banner({ tone = 'info', title, children, onClose, action, style = {} }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: t.bg, border: `1px solid ${t.border}`, borderRadius: 'var(--radius-md)',
      padding: '14px 16px', ...style,
    }}>
      <span style={{ color: t.dot, display: 'inline-flex', marginTop: 1, flexShrink: 0 }}>
        <Icon name={t.icon} size={18} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: t.text, marginBottom: children ? 3 : 0 }}>{title}</div>}
        {children && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: t.text, lineHeight: 1.55, opacity: 0.92 }}>{children}</div>}
        {action && <div style={{ marginTop: 10 }}>{action}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fermer" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: t.text, opacity: 0.7,
          display: 'inline-flex', padding: 2, flexShrink: 0,
        }}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
