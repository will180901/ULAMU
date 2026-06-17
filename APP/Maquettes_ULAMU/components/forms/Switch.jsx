import React from 'react';

/** Switch — interrupteur Ulamu (thumb spring). */
export function Switch({ checked = false, disabled = false, label, onChange, id, style = {}, ...rest }) {
  return (
    <label htmlFor={id} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, userSelect: 'none', ...style,
    }}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 40, height: 22, borderRadius: 11, position: 'relative', flexShrink: 0,
        background: checked ? 'var(--accent-500)' : 'var(--bg-muted)',
        border: `1px solid ${checked ? 'var(--accent-500)' : 'var(--border-default)'}`,
        transition: 'background var(--dur-base) linear, border-color var(--dur-base) linear',
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
          left: checked ? 20 : 2, boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
          transition: 'left var(--dur-base) var(--ease-spring)',
        }} />
      </span>
      {label != null && <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
