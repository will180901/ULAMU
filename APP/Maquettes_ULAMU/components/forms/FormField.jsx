import React from 'react';

/** FormField — label + champ + indice/erreur. Enveloppe n'importe quel contrôle. */
export function FormField({ label, hint, error, required = false, htmlFor, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', ...style }}>
      {label != null && (
        <label htmlFor={htmlFor} style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
          {required && <span style={{ color: 'var(--error-dot)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {error
        ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--error-text)' }}>{error}</span>
        : hint != null && <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  );
}
