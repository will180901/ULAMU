/**
 * Carte — verre dépoli par défaut (§7.3), pattern compound Card.Header/.Body/.Footer.
 * En-tête/pied ont leur PROPRE fond teinté + bordure + padding (12px vertical/16px horizontal),
 * distincts du corps (16px) — pas juste un espacement, une vraie zone visuellement séparée.
 * Hypothèse : Root garde son padding par défaut ('md' = --espace-4/16px) quand on compose
 * Header/Body/Footer, Header/Footer "s'échappent" par marge négative pour toucher les bords —
 * si un jour un Root en padding sm/lg utilise Header/Footer, réajuster ces marges en conséquence.
 */
import type { HTMLAttributes } from 'react'

type Elevation = 'flat' | 'raised' | 'floating'
type Padding = 'none' | 'sm' | 'md' | 'lg'

const SHADOW: Record<Elevation, string> = { flat: 'var(--ombre-0)', raised: 'var(--ombre-1)', floating: 'var(--ombre-2)' }
const PADDING: Record<Padding, string> = { none: '0', sm: 'var(--espace-3)', md: 'var(--espace-4)', lg: 'var(--espace-5)' }

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
  padding?: Padding
  muted?: boolean
  noGrain?: boolean
}

function CardRoot({ elevation = 'raised', padding = 'md', muted, noGrain, style, className, children, ...props }: CardProps) {
  return (
    <div
      className={[!noGrain ? 'saris-grain' : '', className].filter(Boolean).join(' ')}
      style={{
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--bordure-legere)',
        background: muted ? 'var(--fond-surface-2)' : 'var(--verre-fond)',
        backdropFilter: muted ? undefined : 'blur(var(--verre-blur))',
        boxShadow: SHADOW[elevation],
        padding: PADDING[padding],
        overflow: 'hidden',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ title, subtitle, icon, action }: { title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--espace-3)',
        margin: 'calc(var(--espace-4) * -1) calc(var(--espace-4) * -1) var(--espace-4)',
        padding: 'var(--espace-3) var(--espace-4)',
        background: 'var(--fond-surface-2)',
        borderBottom: '1px solid var(--bordure-legere)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)' }}>
        {icon}
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--font-size-h3)', fontWeight: 700, color: 'var(--texte-primaire)' }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--texte-tertiaire)', marginTop: 2 }}>{subtitle}</div> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 'var(--espace-2)',
        margin: 'var(--espace-4) calc(var(--espace-4) * -1) calc(var(--espace-4) * -1)',
        padding: 'var(--espace-3) var(--espace-4)',
        background: 'var(--fond-surface-2)',
        borderTop: '1px solid var(--bordure-legere)',
      }}
    >
      {children}
    </div>
  )
}

export const Card = Object.assign(CardRoot, { Header: CardHeader, Body: CardBody, Footer: CardFooter })
