/**
 * Champ de formulaire — CG-05 §02.
 *
 * Deux interdictions absolues de la charte (§07) gouvernent ce composant :
 *
 *  • **« Message d'erreur avec icône + texte — jamais couleur seule »**. La version précédente
 *    affichait l'erreur en texte rouge, sans icône. Ce n'est pas seulement une question de daltonisme :
 *    sur l'écran d'un poste d'officine mal calibré, en plein jour, un rouge et un gris pâles se
 *    ressemblent. L'icône, elle, se voit toujours.
 *
 *  • **« Placeholder comme substitut de label de champ »** est interdit. Le libellé est donc un vrai
 *    `<label>` lié par `htmlFor`, toujours au-dessus, jamais flottant.
 *
 * L'état `success` existe aussi : confirmer qu'un identifiant est disponible vaut mieux que laisser
 * l'utilisateur deviner — c'est ce que fait déjà l'inscription mobile.
 */
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  success?: string
  hint?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, success, hint, id, required, className, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? props.name ?? autoId
  const msgId = `${inputId}-msg`
  const state = error ? 'error' : success ? 'success' : null

  return (
    <div className={['ul-field', state ? `ul-field--${state}` : '', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={inputId} className="ul-field__label">
          {label}
          {required ? (
            <span className="ul-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <input
        ref={ref}
        id={inputId}
        required={required}
        className="ul-field__input"
        /* Le message est RATTACHÉ au champ : sans `aria-describedby`, un lecteur d'écran annonce le
           champ puis se tait, et l'erreur reste invisible pour qui ne voit pas l'écran. */
        aria-describedby={error || success || hint ? msgId : undefined}
        aria-invalid={error ? true : undefined}
        {...props}
      />

      {error || success || hint ? (
        <span
          id={msgId}
          className={['ul-field__msg', state ? `ul-field__msg--${state}` : ''].filter(Boolean).join(' ')}
          /* Une erreur qui apparaît doit être ANNONCÉE, pas seulement affichée. */
          role={error ? 'alert' : undefined}
        >
          {error ? <AlertCircle size={12} aria-hidden="true" /> : null}
          {!error && success ? <CheckCircle2 size={12} aria-hidden="true" /> : null}
          {error ?? success ?? hint}
        </span>
      ) : null}
    </div>
  )
})
