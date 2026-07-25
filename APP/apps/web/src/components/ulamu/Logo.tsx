/**
 * Logo ULAMU — port exact du glyphe SVG de l'app mobile (apps/mobile/src/components/ui.tsx,
 * LogoMark/Logo) : carré cobalt arrondi + figure stylisée sur un socle, suivi du mot-symbole
 * "ulamu". Même marque partout (mobile, web) — pas une nouvelle interprétation.
 */
export function LogoMark({ size = 28, light }: { size?: number; light?: boolean }) {
  const markBg = light ? '#FFFFFF' : '#2756A6'
  const glyph = light ? '#2756A6' : '#FFFFFF'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill={markBg} />
      <g transform="translate(4 4) scale(1.5)">
        <path
          d="M8 2C5.8 2 4 3.8 4 6c0 1.4.7 2.6 1.8 3.3L5 12h6l-.8-2.7C11.3 8.6 12 7.4 12 6c0-2.2-1.8-4-4-4z"
          fill={glyph}
          fillOpacity={0.92}
        />
        <rect x="5.5" y="12.5" width="5" height="1.5" rx="0.75" fill={glyph} fillOpacity={0.72} />
      </g>
    </svg>
  )
}

export function Logo({ light, size = 28 }: { light?: boolean; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
      <LogoMark size={size} light={light} />
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: Math.round(size * 0.64),
          letterSpacing: '-0.02em',
          color: light ? '#fff' : 'var(--texte-primaire)',
        }}
      >
        ulamu
      </span>
    </span>
  )
}
