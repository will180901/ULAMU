import React from 'react';

/**
 * Card — surface élevée Ulamu. Bord subtil, rayon lg, ombre sm,
 * grain optionnel, lift au survol si interactive.
 */
export function Card({
  padding = 'var(--sp-5)',
  interactive = false,
  grain = false,
  elevation = 'sm',
  children,
  style = {},
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const shadow = hover && interactive ? 'var(--shadow-md)' : `var(--shadow-${elevation})`;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding,
        boxShadow: shadow,
        transform: hover && interactive ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform var(--dur-base) linear, box-shadow var(--dur-base) linear',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {grain && <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'calc(var(--grain-opacity) * 0.6)', borderRadius: 'inherit' }} />}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
