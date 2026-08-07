/**
 * Menu contextuel — CG-06 §06.
 *
 * Tokens imposés par la charte : fond élevé, bordure 1px, rayon 10px, ombre portée (« jamais plat »),
 * items de 36px, z-index 20+, groupes séparés par un filet, actions destructives en bas en couleur
 * danger. Tout cela vit dans `.ul-menu*` (globals.css) — ce fichier ne fait que le comportement.
 *
 * Accessibilité (CG-11) : le déclencheur porte `aria-haspopup`/`aria-expanded`, le panneau `role=menu`
 * et ses entrées `role=menuitem`. Le clavier fait ce qu'on attend d'un menu — flèches pour circuler,
 * Début/Fin pour les extrémités, Échap pour fermer EN RENDANT LE FOCUS au déclencheur (sans quoi on
 * se retrouve projeté en haut de page, perdu). Un clic à l'extérieur ferme aussi.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface MenuProps {
  /** Rendu du déclencheur ; reçoit les attributs à étaler sur le bouton. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>
    onClick: () => void
    'aria-haspopup': 'menu'
    'aria-expanded': boolean
    'aria-controls': string
  }) => ReactNode
  children: ReactNode
  /** Libellé lu par les lecteurs d'écran pour le panneau lui-même. */
  label: string
  /** Position du panneau par rapport au déclencheur. */
  placement?: 'top-start' | 'bottom-end'
  className?: string
}

export function Menu({ trigger, children, label, placement = 'top-start', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  // Fermeture sur clic extérieur et sur Échap. Un seul effet : les deux écoutes ont exactement la
  // même durée de vie, les séparer inviterait à en oublier une au nettoyage.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // À l'ouverture, le focus part sur la première entrée : ouvrir un menu au clavier et devoir encore
  // appuyer sur Tab pour l'atteindre n'a aucun sens.
  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')
    first?.focus()
  }, [open])

  const onPanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLElement)
    const focusAt = (i: number) => {
      e.preventDefault()
      items[(i + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') focusAt(current + 1)
    else if (e.key === 'ArrowUp') focusAt(current - 1)
    else if (e.key === 'Home') focusAt(0)
    else if (e.key === 'End') focusAt(items.length - 1)
    else if (e.key === 'Tab') close(false) // Tab sort du menu : on le referme au lieu de le laisser ouvert derrière
  }

  const position =
    placement === 'top-start'
      ? { bottom: 'calc(100% + var(--espace-1))', left: 0, right: 0 }
      : { top: 'calc(100% + var(--espace-1))', right: 0 }

  return (
    <div style={{ position: 'relative' }} className={className}>
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((v) => !v),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': id,
      })}
      {open ? (
        <div
          id={id}
          ref={panelRef}
          role="menu"
          aria-label={label}
          className="ul-menu"
          style={position}
          onKeyDown={onPanelKeyDown}
          /* Une action choisie ferme le menu — sauf si elle s'y oppose explicitement (bascule de
             thème, que l'on veut pouvoir essayer plusieurs fois d'affilée). */
          onClick={(e) => {
            const el = (e.target as HTMLElement).closest('[role="menuitem"]')
            if (el && el.getAttribute('data-keep-open') !== 'true') close(true)
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

/** Entrée de menu. `danger` la place visuellement dans le registre destructif (CG-06 §07). */
export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  tail,
  keepOpen,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  danger?: boolean
  /** Zone de droite : raccourci clavier, valeur courante… */
  tail?: ReactNode
  keepOpen?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-keep-open={keepOpen ? 'true' : undefined}
      onClick={onClick}
      className={['ul-menu__item', 'saris-focus-ring', danger ? 'ul-menu__item--danger' : ''].filter(Boolean).join(' ')}
    >
      {icon}
      <span>{children}</span>
      {tail ? <span className="ul-menu__item-tail">{tail}</span> : null}
    </button>
  )
}

/** Filet de séparation — obligatoire avant une action destructive (CG-06 §07). */
export function MenuSeparator() {
  return <div className="ul-menu__sep" role="separator" />
}

/** Intitulé de groupe, en monospace majuscule comme les groupes de la barre latérale. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="ul-menu__label">{children}</div>
}
