import React from 'react';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };
const FONT = { xs: 10, sm: 12, md: 14, lg: 16, xl: 22 };

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

/** Avatar — initiales ou image. Point de présence optionnel. */
export function Avatar({ name = '', src, size = 'md', status, style = {}, ...rest }) {
  const box = SIZES[size] || SIZES.md;
  const statusColor = status === 'online' ? 'var(--success-dot)'
    : status === 'busy' ? 'var(--error-dot)'
    : status === 'away' ? 'var(--warning-dot)' : null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...style }} {...rest}>
      <span style={{
        width: box, height: box, borderRadius: '50%',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: FONT[size] || 14,
        color: '#fff', background: 'var(--accent-500)', overflow: 'hidden',
        border: '2px solid var(--bg-base)', boxShadow: 'var(--shadow-sm)',
      }}>
        {src
          ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials(name)}
      </span>
      {statusColor && (
        <span style={{
          position: 'absolute', bottom: 0, right: 0,
          width: Math.max(8, box * 0.26), height: Math.max(8, box * 0.26),
          borderRadius: '50%', background: statusColor,
          border: '2px solid var(--bg-base)',
        }} />
      )}
    </span>
  );
}
