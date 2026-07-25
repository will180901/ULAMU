/** Pastille de statut (pilule) — 7 tons (4 sémantiques + neutre + accent + doré), 2 tailles, §7.6. */
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent' | 'gold'
type Size = 'sm' | 'md'

const TONE_MAP: Record<StatusTone, { bg: string; text: string; dot: string }> = {
  success: { bg: 'var(--succes-fond)', text: 'var(--succes-texte)', dot: 'var(--succes-accent)' },
  warning: { bg: 'var(--alerte-fond)', text: 'var(--alerte-texte)', dot: 'var(--alerte-accent)' },
  error: { bg: 'var(--erreur-fond)', text: 'var(--erreur-texte)', dot: 'var(--erreur-accent)' },
  info: { bg: 'var(--info-fond)', text: 'var(--info-texte)', dot: 'var(--info-accent)' },
  neutral: { bg: 'var(--fond-surface-2)', text: 'var(--texte-secondaire)', dot: 'var(--texte-tertiaire)' },
  accent: { bg: 'var(--ap-50)', text: 'var(--ap-700)', dot: 'var(--ap-400)' },
  gold: { bg: 'var(--as-50)', text: 'var(--as-700)', dot: 'var(--as-400)' },
}

export function StatusPill({
  tone = 'neutral',
  size = 'sm',
  icon,
  children,
}: {
  tone?: StatusTone
  size?: Size
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const t = TONE_MAP[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 9999,
        padding: size === 'sm' ? '3px 10px' : '4px 12px',
        fontSize: size === 'sm' ? '10px' : 'var(--font-size-caption)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: t.bg,
        color: t.text,
      }}
    >
      {icon ?? <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.dot, flexShrink: 0 }} />}
      {children}
    </span>
  )
}
