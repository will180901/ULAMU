/**
 * Sélecteur — même hauteur/rayon/bordure/halo de focus que Field (§7.4), menu déroulant en verre
 * dépoli + grain (cohérent avec Card). Construit sur le primitif Radix déjà présent dans le projet
 * (accessibilité clavier/ARIA gérée par la lib, pas réinventée).
 */
import { useState } from 'react'
import { Select as RadixSelect } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg'
const HEIGHT: Record<Size, number> = { sm: 30, md: 36, lg: 42 }
const FONT_SIZE: Record<Size, string> = { sm: 'var(--font-size-body-sm)', md: 'var(--font-size-body)', lg: 'var(--font-size-body-lg)' }

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  hint?: string
  size?: Size
  required?: boolean
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
}

export function Select({ label, error, hint, size = 'md', required, placeholder, value, onChange, options, disabled }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label ? (
        <label style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--texte-secondaire)' }}>
          {label}
          {required ? <span style={{ color: 'var(--erreur-accent)' }}> *</span> : null}
        </label>
      ) : null}
      <RadixSelect.Root value={value} onValueChange={onChange} open={open} onOpenChange={setOpen} disabled={disabled}>
        <RadixSelect.Trigger
          className="saris-focus-ring"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            height: HEIGHT[size],
            width: '100%',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--erreur-accent)' : focused || open ? 'var(--ap-400)' : 'var(--bordure-input)'}`,
            background: 'var(--fond-surface)',
            color: value ? 'var(--texte-primaire)' : 'var(--texte-tertiaire)',
            fontFamily: 'var(--font-sans)',
            fontSize: FONT_SIZE[size],
            paddingInline: 12,
            boxShadow: (focused || open) && !error ? '0 0 0 3px rgba(var(--ap-400-rgb), 0.15)' : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown
              size={16}
              style={{ color: 'var(--texte-tertiaire)', transition: 'transform 0.15s ease', transform: open ? 'rotate(180deg)' : 'none' }}
            />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="saris-grain" position="popper" sideOffset={6} style={{ zIndex: 1000 }}>
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--bordure-legere)',
                background: 'var(--fond-surface)',
                boxShadow: 'var(--ombre-2)',
                overflow: 'hidden',
                width: 'var(--radix-select-trigger-width)',
              }}
            >
              <RadixSelect.Viewport style={{ padding: 4 }}>
                {options.map((opt) => (
                  <RadixSelect.Item
                    key={opt.value}
                    value={opt.value}
                    className="ulamu-select-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-body)',
                      color: 'var(--texte-primaire)',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator>
                      <Check size={14} style={{ color: 'var(--ap-500)' }} />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </div>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error ? (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--erreur-texte)' }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)' }}>{hint}</span>
      ) : null}
    </div>
  )
}
