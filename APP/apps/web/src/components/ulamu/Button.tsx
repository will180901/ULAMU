/**
 * Bouton — CG-05 §01 : 5 variantes, 5 tailles, grain sérigraphié obligatoire, dégradé interdit.
 *
 * Le survol et la pression sont désormais gérés **en CSS**. La version précédente branchait quatre
 * gestionnaires de souris par bouton (`onMouseEnter`/`Leave`/`Down`/`Up`) et stockait deux booléens
 * d'état : un motif hérité du port CMS-SARIS. Il avait trois défauts réels — il ne réagissait ni au
 * clavier ni au tactile, il provoquait un rendu React à chaque passage de pointeur, et il empêchait
 * d'appliquer le grain en `::after` que la charte exige.
 *
 * `success` a disparu des variantes : CG-05 n'en définit que cinq, et un bouton vert « succès » est
 * une contradiction — le succès est un RÉSULTAT, pas une action qu'on déclenche.
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Taille d'icône proportionnée à chaque palier — une icône fixe déséquilibre les extrêmes. */
const ICON: Record<Size, number> = { xs: 12, sm: 13, md: 15, lg: 17, xl: 19 }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, iconLeft, iconRight, children, className, ...props },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      /* `aria-busy` plutôt qu'un simple visuel : un lecteur d'écran doit savoir que l'action est en
         cours, pas seulement qu'un bouton est devenu inactif. */
      aria-busy={loading || undefined}
      className={['ul-btn', `ul-btn--${variant}`, `ul-btn--${size}`, 'saris-focus-ring', className].filter(Boolean).join(' ')}
      {...props}
    >
      {/* Le chargement REMPLACE l'icône de gauche (CG-05 §01) au lieu de s'ajouter : sinon le bouton
          s'élargit en pleine action et le pointeur rate sa cible. */}
      {loading ? <Loader2 size={ICON[size]} className="ul-btn__spin" aria-hidden="true" /> : iconLeft}
      {children ? <span>{children}</span> : null}
      {!loading && iconRight}
    </button>
  )
})
