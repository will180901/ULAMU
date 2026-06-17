import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Checkbox — case à cocher Ulamu (check spring). */
export function Checkbox({ checked = false, indeterminate = false, disabled = false, label, onChange, id, style = {}, ...rest }) {
  const on = checked || indeterminate;
  return (
    <label htmlFor={id} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, userSelect: 'none', ...style,
    }}>
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span style={{
        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${on ? 'var(--accent-500)' : 'var(--border-strong)'}`,
        background: on ? 'var(--accent-500)' : 'var(--bg-base)',
        transition: 'background var(--dur-base) linear, border-color var(--dur-base) linear',
      }}>
        <span style={{
          display: 'inline-flex', color: '#fff',
          transform: on ? 'scale(1)' : 'scale(0)', opacity: on ? 1 : 0,
          transition: 'transform var(--dur-base) var(--ease-spring), opacity var(--dur-base) var(--ease-spring)',
        }}>
          <Icon name={indeterminate ? 'minus' : 'check'} size={12} strokeWidth={2.4} />
        </span>
      </span>
      {label != null && <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
