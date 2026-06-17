import React from 'react';
import { Icon } from './Icon.jsx';

const SIZES = { sm: { box: 28, icon: 14 }, md: { box: 32, icon: 16 }, lg: { box: 36, icon: 18 } };

function variantStyle(variant, hover) {
  switch (variant) {
    case 'primary':
      return { background: hover ? 'var(--accent-600)' : 'var(--accent-500)', color: '#fff', border: '1px solid transparent', grain: true };
    case 'solid':
      return { background: hover ? 'var(--bg-subtle)' : 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' };
    case 'ghost':
    default:
      return { background: hover ? 'var(--bg-subtle)' : 'transparent', color: hover ? 'var(--text-primary)' : 'var(--text-secondary)', border: '1px solid transparent' };
  }
}

/** IconButton — bouton carré contenant une seule icône Ulamu. */
export function IconButton({ icon, variant = 'ghost', size = 'md', disabled = false, label, style = {}, onClick, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sz = SIZES[size] || SIZES.md;
  const vs = variantStyle(variant, hover && !disabled);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        width: sz.box, height: sz.box,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: active && !disabled ? 'scale(0.94)' : 'scale(1)',
        transition: 'background var(--dur-base) linear, color var(--dur-base) linear, transform 80ms linear',
        ...vs, ...style,
      }}
      {...rest}
    >
      {vs.grain && <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'var(--grain-svg)', backgroundSize: 'var(--grain-size)', opacity: 'var(--grain-btn)', borderRadius: 'inherit' }} />}
      <span style={{ position: 'relative', display: 'inline-flex' }}><Icon name={icon} size={sz.icon} /></span>
    </button>
  );
}
