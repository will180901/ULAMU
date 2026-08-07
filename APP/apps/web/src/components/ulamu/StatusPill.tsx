/**
 * Pastille de statut — CG-05 §03.
 *
 * Deux corrections par rapport à la version issue du port SARIS :
 *  • la **bordure harmonique** manquait, alors que §07 la rend obligatoire (« badges : fond
 *    semi-transparent + bordure harmonique ») — sans elle, un badge flotte sans se détacher du fond
 *    en thème sombre ;
 *  • la taille `sm` était figée à `10px`, valeur inventée hors des 16 paliers de CG-02.
 *
 * Le point coloré n'est pas un ornement : il double l'information de couleur par une **forme**, ce
 * que CG-11 exige. Une pastille « Refusé » et une pastille « Payé » ne doivent pas se distinguer par
 * la seule teinte.
 */
import type { ReactNode } from 'react'

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent' | 'gold'

const TONE: Record<StatusTone, { bg: string; text: string; border: string }> = {
  success: { bg: 'var(--succes-fond)', text: 'var(--succes-texte)', border: 'var(--succes-bordure)' },
  warning: { bg: 'var(--alerte-fond)', text: 'var(--alerte-texte)', border: 'var(--alerte-bordure)' },
  error: { bg: 'var(--erreur-fond)', text: 'var(--erreur-texte)', border: 'var(--erreur-bordure)' },
  info: { bg: 'var(--info-fond)', text: 'var(--info-texte)', border: 'var(--info-bordure)' },
  neutral: { bg: 'var(--fond-surface-2)', text: 'var(--texte-secondaire)', border: 'var(--bordure-normale)' },
  accent: { bg: 'var(--ap-50)', text: 'var(--ap-700)', border: 'var(--ap-200)' },
  gold: { bg: 'var(--as-50)', text: 'var(--as-700)', border: 'var(--as-200)' },
}

export function StatusPill({
  tone = 'neutral',
  size = 'sm',
  icon,
  children,
}: {
  tone?: StatusTone
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
}) {
  const t = TONE[tone]
  return (
    <span
      className={`ul-pill ul-pill--${size}`}
      style={{ background: t.bg, color: t.text, borderColor: t.border }}
    >
      {/* Le point hérite de `currentColor` : il ne peut donc jamais se désynchroniser du texte. */}
      {icon ?? <span className="ul-pill__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
