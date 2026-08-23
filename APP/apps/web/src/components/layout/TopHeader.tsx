/**
 * Barre du haut — 48 px, verre dépoli, d'après la maquette B1.
 *
 * Elle porte le fil d'Ariane et, sur mobile, le bouton qui ouvre la navigation.
 *
 * ⚠️ **Réduite au périmètre décidé le 20/08/2026** : la maquette y place aussi une recherche
 * globale, un « rideau de confidentialité » et un tiroir de notifications. Les trois sont écartés de
 * cette étape, et pour des raisons différentes — voir §9 du plan :
 *   • la recherche ouvre la palette de commandes, qui viendra à son tour ;
 *   • les notifications existent côté serveur (module M14) mais ne sont pas encore exposées au web ;
 *   • le « rideau de confidentialité » n'a AUCUNE trace côté serveur ni au cahier des charges.
 *     Lui inventer un comportement serait promettre une protection qui n'existe pas.
 */
import { Menu } from 'lucide-react'
import { useSessionStore } from '@/state/session.store'
import { ESPACE_PAR_ROLE } from '@/config/navigation.config'

export function TopHeader({ titre, estMobile, surOuvrirNav }: { titre: string; estMobile: boolean; surOuvrirNav: () => void }) {
  const me = useSessionStore((s) => s.me)
  const espace = (me && ESPACE_PAR_ROLE[me.accountType]) ?? 'ULAMU'

  return (
    <header
      style={{ height: 'var(--topbar-height)' }}
      className="flex shrink-0 items-center justify-end gap-1.5 border-b border-border bg-[var(--glass-header-bg)] px-4 backdrop-blur-[10px]"
    >
      {estMobile ? (
        <button
          type="button"
          onClick={surOuvrirNav}
          aria-label="Ouvrir la navigation"
          className="mr-auto flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ) : (
        <nav aria-label="Fil d'Ariane" className="mr-auto flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--texte-tertiaire)]">
          <span className="whitespace-nowrap text-muted-foreground">{espace}</span>
          <span aria-hidden="true" className="text-[var(--bordure-normale)]">
            /
          </span>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium text-foreground">{titre}</span>
        </nav>
      )}
    </header>
  )
}
