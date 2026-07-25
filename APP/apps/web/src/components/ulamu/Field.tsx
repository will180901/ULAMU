/**
 * Champ de formulaire — libellé + saisie + erreur/aide, conforme spec §7.4 : 3 hauteurs partagées par
 * TOUS les types de champ (30/36/42), halo doux au focus (bordure accent + ombre 3px à ~15% d'opacité),
 * bordure entièrement remplacée par la couleur d'erreur si en erreur (jamais halo + erreur en même temps).
 */
import { forwardRef, useState, type InputHTMLAttributes } from 'react'

type Size = 'sm' | 'md' | 'lg'
const HEIGHT: Record<Size, number> = { sm: 30, md: 36, lg: 42 }
const FONT_SIZE: Record<Size, string> = { sm: 'var(--font-size-body-sm)', md: 'var(--font-size-body)', lg: 'var(--font-size-body-lg)' }

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  size?: Size
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, size = 'md', style, id, required, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const inputId = id ?? props.name

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label ? (
        <label htmlFor={inputId} style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--texte-secondaire)' }}>
          {label}
          {required ? <span style={{ color: 'var(--erreur-accent)' }}> *</span> : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        required={required}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        style={{
          height: HEIGHT[size],
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--erreur-accent)' : focused ? 'var(--ap-400)' : 'var(--bordure-input)'}`,
          background: 'var(--fond-surface)',
          color: 'var(--texte-primaire)',
          fontFamily: 'var(--font-sans)',
          fontSize: FONT_SIZE[size],
          paddingInline: 12,
          boxShadow: focused && !error ? '0 0 0 3px rgba(var(--ap-400-rgb), 0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          ...style,
        }}
        {...props}
      />
      {error ? (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)' }}>{hint}</span>
      ) : null}
    </div>
  )
})
