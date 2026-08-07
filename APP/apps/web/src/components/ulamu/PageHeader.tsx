/**
 * En-tête de page — tuile teintée + titre + sous-titre + action.
 *
 * Le titre utilise le palier `display-lg` de CG-02 (24px / 700), et non plus un `--font-size-h1`
 * inventé à 22px. Les tons proviennent des variables `--ton-*` de CG-01 : le composant ne connaît
 * aucune couleur, il ne fait que choisir une famille.
 */
import type { ReactNode } from 'react'

export type HeaderTone = 'rose' | 'violet' | 'bleu' | 'emeraude' | 'cyan' | 'ambre'

export function PageHeader({
  icon,
  tone = 'bleu',
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode
  tone?: HeaderTone
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="ul-pagehead">
      <div className="ul-pagehead__left">
        {icon ? (
          <div
            className="ul-pagehead__tile"
            style={{
              background: `var(--ton-${tone}-fond)`,
              borderColor: `var(--ton-${tone}-bordure)`,
              color: `var(--ton-${tone}-icone)`,
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1 className="ul-pagehead__title t-display-lg">{title}</h1>
          {subtitle ? <p className="ul-pagehead__sub">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}
