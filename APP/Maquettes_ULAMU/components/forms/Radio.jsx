import React from 'react';

/** Radio — bouton radio Ulamu. */
export function Radio({ checked = false, disabled = false, label, name, value, onChange, id, style = {}, ...rest }) {
  return (
    <label htmlFor={id} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, userSelect: 'none', ...style,
    }}>
      <input id={id} type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${checked ? 'var(--accent-500)' : 'var(--border-strong)'}`,
        background: 'var(--bg-base)',
        transition: 'border-color var(--dur-base) linear',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-500)',
          transform: checked ? 'scale(1)' : 'scale(0)',
          transition: 'transform var(--dur-base) var(--ease-spring)',
        }} />
      </span>
      {label != null && <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
