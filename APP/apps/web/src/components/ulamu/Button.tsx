/**
 * Bouton — pattern SARIS : map de variantes → style inline sur variables CSS, hover/press gérés par
 * onMouseEnter/onMouseLeave/onMouseDown/onMouseUp (pas de classes CSS :hover — charte UI-01-02).
 * Tailles/rayon/graisse/grain conformes à la spec §7.1 (hauteur fixe par taille, rayon 6px constant
 * quelle que soit la taille, poids 600 partout, léger retour tactile ~97% à la pression).
 */
import { forwardRef, useState, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<Size, { height: number; paddingInline: number; fontSize: string; gap: number; iconSize: number }> = {
  sm: { height: 30, paddingInline: 12, fontSize: 'var(--font-size-body-sm)', gap: 5, iconSize: 13 },
  md: { height: 36, paddingInline: 16, fontSize: 'var(--font-size-body)', gap: 6, iconSize: 15 },
  lg: { height: 44, paddingInline: 22, fontSize: 'var(--font-size-body-lg)', gap: 7, iconSize: 17 },
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string; hoverBg: string; hoverBorder?: string }> = {
  primary: { bg: 'var(--ap-400)', text: '#FFFFFF', hoverBg: 'var(--ap-500)' },
  secondary: { bg: 'var(--fond-surface-2)', text: 'var(--texte-primaire)', border: 'var(--bordure-normale)', hoverBg: 'var(--ap-50)' },
  ghost: { bg: 'transparent', text: 'var(--texte-primaire)', hoverBg: 'var(--fond-surface-2)' },
  outline: { bg: 'var(--fond-surface)', text: 'var(--ap-700)', border: 'var(--ap-200)', hoverBg: 'var(--ap-50)', hoverBorder: 'var(--ap-300)' },
  danger: { bg: 'var(--erreur-accent)', text: '#FFFFFF', hoverBg: 'var(--erreur-texte)' },
  success: { bg: 'var(--succes-accent)', text: '#FFFFFF', hoverBg: 'var(--succes-texte)' },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, iconLeft, iconRight, children, style, ...props },
  ref,
) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const s = SIZE_MAP[size]
  const v = VARIANT_STYLES[variant]
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false)
        setPressed(false)
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className={['saris-focus-ring', variant !== 'ghost' ? 'saris-grain-fine' : ''].filter(Boolean).join(' ')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        paddingInline: s.paddingInline,
        fontFamily: 'var(--font-sans)',
        fontSize: s.fontSize,
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        background: hover && !isDisabled ? v.hoverBg : v.bg,
        color: v.text,
        border: v.border ? `1px solid ${hover ? (v.hoverBorder ?? v.border) : v.border}` : 'none',
        opacity: isDisabled ? 0.55 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transform: pressed && !isDisabled ? 'scale(0.97)' : 'scale(1)',
        transition: 'background 0.12s ease, border-color 0.12s ease, transform 0.04s ease',
        ...style,
      }}
      {...props}
    >
      {loading ? <Loader2 size={s.iconSize} className="animate-spin" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})
