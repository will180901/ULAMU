import React from 'react';

const CHEVRON = "data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%2371717A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

/** Select — liste déroulante native stylée Ulamu. */
export function Select({ invalid = false, disabled = false, children, style = {}, onFocus, onBlur, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return (
    <select
      disabled={disabled}
      onFocus={(e) => { setFocus(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
      style={{
        height: 36, width: '100%', appearance: 'none', WebkitAppearance: 'none',
        borderRadius: 'var(--radius-md)', border: `1px solid ${border}`,
        background: `${disabled ? 'var(--bg-subtle)' : 'var(--bg-base)'} url("${CHEVRON}") no-repeat right 10px center`,
        backgroundSize: 16,
        padding: '0 32px 0 12px', fontFamily: 'var(--font-body)', fontSize: 14,
        color: 'var(--text-primary)', cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none',
        boxShadow: focus ? '0 0 0 3px rgba(39,86,166,0.18)' : 'none',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
        ...style,
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
