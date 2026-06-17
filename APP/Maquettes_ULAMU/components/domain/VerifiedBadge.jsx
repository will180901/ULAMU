import React from 'react';
import { Icon } from '../core/Icon.jsx';

const SIZES = { sm: { box: 14, icon: 9, font: 11 }, md: { box: 18, icon: 12, font: 12 } };

/**
 * VerifiedBadge — badge « vérifié » des professionnels (M03). Actif de confiance :
 * il protège la réputation des soignants contre les usurpateurs.
 */
export function VerifiedBadge({ size = 'md', label, style = {} }) {
  const sz = SIZES[size] || SIZES.md;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...style }}>
      <span style={{
        width: sz.box, height: sz.box, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-500)', color: '#fff',
      }}>
        <Icon name="check" size={sz.icon} strokeWidth={2.4} />
      </span>
      {label != null && (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: sz.font, fontWeight: 600, color: 'var(--text-accent)' }}>{label}</span>
      )}
    </span>
  );
}
