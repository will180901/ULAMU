import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** Input — champ texte Ulamu (hauteur 36, focus ring accent). */
export function Input({
  leftIcon, rightIcon, invalid = false, disabled = false,
  style = {}, wrapperStyle = {}, onFocus, onBlur, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const border = invalid ? 'var(--error-dot)' : focus ? 'var(--accent-500)' : 'var(--border-default)';
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', ...wrapperStyle }}>
      {leftIcon && (
        <span style={{ position: 'absolute', left: 12, display: 'inline-flex', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
          <Icon name={leftIcon} size={16} />
        </span>
      )}
      <input
        disabled={disabled}
        onFocus={(e) => { setFocus(true); onFocus && onFocus(e); }}
        onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
        style={{
          height: 36, width: '100%',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${border}`,
          background: disabled ? 'var(--bg-subtle)' : 'var(--bg-base)',
          padding: `0 ${rightIcon ? 36 : 12}px 0 ${leftIcon ? 34 : 12}px`,
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)',
          outline: 'none',
          boxShadow: focus ? `0 0 0 3px ${invalid ? 'rgba(196,64,64,0.18)' : 'rgba(39,86,166,0.18)'}` : 'none',
          opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color var(--dur-base) linear, box-shadow var(--dur-base) linear',
          ...style,
        }}
        {...rest}
      />
      {rightIcon && (
        <span style={{ position: 'absolute', right: 12, display: 'inline-flex', color: 'var(--text-tertiary)' }}>
          <Icon name={rightIcon} size={16} />
        </span>
      )}
    </div>
  );
}
