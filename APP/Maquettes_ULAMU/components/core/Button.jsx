import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = {
  sm: { padding: '7px 14px', fontSize: 13, radius: 'var(--radius-md)', icon: 14, gap: 6 },
  md: { padding: '9px 18px', fontSize: 14, radius: 'var(--radius-md)', icon: 16, gap: 8 },
  lg: { padding: '12px 24px', fontSize: 15, radius: 'var(--radius-md)', icon: 16, gap: 8 },
};

function variantStyle(variant, hover) {
  switch (variant) {
    case 'secondary':
      return { background: hover ? 'var(--bg-subtle)' : 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' };
    case 'ghost':
      return { background: hover ? 'var(--bg-subtle)' : 'transparent', color: hover ? 'var(--text-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };
    case 'danger':
      return { background: hover ? '#A83535' : '#C44040', color: '#fff', border: '1px solid transparent' };
    case 'primary':
    default:
      return { background: hover ? 'var(--accent-600)' : 'var(--accent-500)', color: '#fff', border: '1px solid transparent' };
  }
}

/**
 * Button — bouton Ulamu. 4 variantes, 3 tailles, grain sérigraphié,
 * micro-feedback au press (scale 0.97 / 80ms).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  style = {},
  onClick,
  type = 'button',
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const vs = variantStyle(variant, hover && !disabled);

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: sz.gap,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: sz.fontSize,
        lineHeight: 1.2,
        padding: sz.padding,
        borderRadius: sz.radius,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: active && !disabled ? 'scale(0.97)' : 'scale(1)',
        transition: 'background var(--dur-base) linear, color var(--dur-base) linear, transform 80ms linear, box-shadow var(--dur-base) linear',
        whiteSpace: 'nowrap',
        ...vs,
        ...style,
      }}
      {...rest}
    >
      {/* Grain sérigraphié — signature des boutons Ulamu */}
      <span aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)',
        opacity: 'var(--grain-btn)', borderRadius: 'inherit',
      }} />
      {loading
        ? <span style={{ position: 'relative', display: 'inline-flex' }}><Spinner size={sz.icon} /></span>
        : iconLeft && <span style={{ position: 'relative', display: 'inline-flex' }}><Icon name={iconLeft} size={sz.icon} /></span>}
      {children != null && <span style={{ position: 'relative' }}>{children}</span>}
      {!loading && iconRight && <span style={{ position: 'relative', display: 'inline-flex' }}><Icon name={iconRight} size={sz.icon} /></span>}
    </button>
  );
}

function Spinner({ size = 16 }) {
  return (
    <span style={{
      width: size, height: size, display: 'inline-block', borderRadius: '50%',
      border: '2px solid currentColor', borderTopColor: 'transparent',
      animation: 'ulamu-spin 0.7s linear infinite',
    }}>
      <style>{'@keyframes ulamu-spin{to{transform:rotate(360deg)}}'}</style>
    </span>
  );
}
