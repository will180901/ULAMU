import React from 'react';

/** Textarea — zone de texte multi-lignes Ulamu. */
export function Textarea({ invalid = false, disabled = false, rows = 4, style = {}, onFocus, onBlur, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return (
    <textarea
      rows={rows}
      disabled={disabled}
      onFocus={(e) => { setFocus(true); onFocus && onFocus(e); }}
      onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
      style={{
        width: '100%', minHeight: 80, resize: 'vertical',
        borderRadius: 'var(--radius-md)', border: `1px solid ${border}`,
        background: disabled ? 'var(--bg-subtle)' : 'var(--bg-base)',
        padding: '10px 12px', fontFamily: 'var(--font-body)', fontSize: 14,
        color: 'var(--text-primary)', lineHeight: 1.55, outline: 'none',
        boxShadow: focus ? `0 0 0 3px ${invalid ? 'rgba(196,64,64,0.18)' : 'rgba(39,86,166,0.18)'}` : 'none',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
        ...style,
      }}
      {...rest}
    />
  );
}
