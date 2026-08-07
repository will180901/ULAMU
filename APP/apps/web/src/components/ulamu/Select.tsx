/**
 * Sélecteur — construit sur le primitif Radix déjà présent (accessibilité clavier et ARIA gérées par
 * la bibliothèque, pas réinventées).
 *
 * Il partage désormais l'habillage du champ de saisie (`.ul-field*`) au lieu de le recopier : les
 * deux avaient dérivé, et surtout `Select` reproduisait le défaut corrigé sur `Field` — une erreur
 * affichée **en texte coloré sans icône**, ce que CG-05 §07 interdit absolument.
 *
 * Le libellé est aussi relié au déclencheur par `aria-labelledby` : il n'était rattaché à rien, donc
 * un lecteur d'écran annonçait « bouton, Médecin généraliste » sans jamais dire *catégorie de quoi*.
 */
import { useId } from 'react'
import { Select as RadixSelect } from 'radix-ui'
import { AlertCircle, Check, ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
}

export function Select({ label, error, hint, required, placeholder, value, onChange, options, disabled }: SelectProps) {
  const id = useId()
  const labelId = `${id}-label`
  const msgId = `${id}-msg`

  return (
    <div className={['ul-field', error ? 'ul-field--error' : ''].filter(Boolean).join(' ')}>
      {label ? (
        <span className="ul-field__label" id={labelId}>
          {label}
          {required ? (
            <span className="ul-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </span>
      ) : null}

      <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
        <RadixSelect.Trigger
          className="ul-select__trigger saris-focus-ring"
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          aria-invalid={error ? true : undefined}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={16} className="ul-select__chevron" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          {/* Même famille visuelle que les menus contextuels (CG-06 §06) : bordure, rayon, ombre —
              un objet flottant ne doit pas avoir son apparence propre selon qui l'ouvre. */}
          <RadixSelect.Content className="saris-grain" position="popper" sideOffset={6} style={{ zIndex: 60 }}>
            <div className="ul-select__panel">
              <RadixSelect.Viewport style={{ padding: 4 }}>
                {options.map((opt) => (
                  <RadixSelect.Item key={opt.value} value={opt.value} className="ul-select__item ulamu-select-item">
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

      {error || hint ? (
        <span
          id={msgId}
          className={['ul-field__msg', error ? 'ul-field__msg--error' : ''].filter(Boolean).join(' ')}
          role={error ? 'alert' : undefined}
        >
          {error ? <AlertCircle size={12} aria-hidden="true" /> : null}
          {error ?? hint}
        </span>
      ) : null}
    </div>
  )
}
