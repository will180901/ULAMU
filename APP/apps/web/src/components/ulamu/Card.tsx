/**
 * Carte — verre dépoli, composition `Card.Header` / `Card.Body` / `Card.Footer`.
 *
 * L'en-tête et le pied portent leur propre fond et « s'échappent » du padding du corps par marge
 * négative. La version précédente codait cette marge en dur sur `--espace-4`, avec un avertissement
 * en commentaire : « si un jour un Root en padding sm/lg utilise Header/Footer, réajuster ces marges
 * en conséquence ». Un piège à retardement. La marge est désormais liée à la variable `--card-pad`
 * posée par la carte elle-même : changer le padding réaligne l'en-tête tout seul, il n'y a plus rien
 * à se rappeler.
 */
import type { HTMLAttributes, ReactNode } from 'react'

type Elevation = 'flat' | 'raised' | 'floating'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
  padding?: Padding
  muted?: boolean
  noGrain?: boolean
}

function CardRoot({ elevation = 'raised', padding = 'md', muted, noGrain, className, children, ...props }: CardProps) {
  return (
    <div
      className={[
        'ul-card',
        elevation !== 'raised' ? `ul-card--${elevation}` : '',
        padding !== 'md' ? `ul-card--pad-${padding}` : '',
        muted ? 'ul-card--muted' : '',
        !noGrain ? 'saris-grain' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="ul-card__head">
      <div className="ul-card__head-left">
        {icon}
        <div style={{ minWidth: 0 }}>
          {/* `display-sm` : le plus petit palier de titre de CG-02. L'ancien `--font-size-h3` valait
              16px, une taille de titre qui n'existe pas dans le référentiel. */}
          <div className="t-display-sm">{title}</div>
          {subtitle ? <div className="ul-card__sub">{subtitle}</div> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function CardBody({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

function CardFooter({ children }: { children: ReactNode }) {
  return <div className="ul-card__foot">{children}</div>
}

export const Card = Object.assign(CardRoot, { Header: CardHeader, Body: CardBody, Footer: CardFooter })
