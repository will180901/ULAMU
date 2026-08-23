/**
 * Barre latérale — d'après `docs/maquettes/B1 - Coquille applicative.dc.html`.
 *
 * **264 px déployée, 68 px au repos**, en verre dépoli. Elle se déploie au SURVOL et **recouvre** le
 * contenu au lieu de le pousser : `AppShell` réserve toujours 68 px, jamais 264. C'est ce qui permet
 * d'ouvrir la barre sans faire sauter la mise en page de l'écran qu'on est en train de lire.
 *
 * ⚠️ **Elle se déploie aussi au FOCUS CLAVIER** — `focus-within`, absent de la maquette. Sans cela,
 * tabuler dans une barre au repos donnerait une suite de boutons sans libellé visible : la
 * navigation deviendrait indéchiffrable pour qui n'utilise pas la souris.
 *
 * Le composant `sidebar` de shadcn n'est pas utilisé ici, et c'est délibéré : 700 lignes, 23
 * sous-composants, des largeurs de 16rem/3rem et surtout un modèle qui POUSSE le contenu. Le plier
 * au comportement de la maquette aurait coûté plus cher que de l'écrire. Les primitives qui
 * apportent vraiment quelque chose — `DropdownMenu` pour le menu utilisateur, `Tooltip` pour les
 * libellés au repos — sont bien celles de shadcn.
 */
import { NavLink, useLocation } from 'react-router-dom'
import { useNavigation } from '@/hooks/useNavigation'
import { ESPACE_PAR_ROLE } from '@/config/navigation.config'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSessionStore } from '@/state/session.store'
import { LogoMark } from '@/components/ulamu/Logo'
import { UserMenu } from '@/components/layout/UserMenu'
import { X } from 'lucide-react'

/**
 * Un chemin est actif s'il correspond exactement, ou s'il est le préfixe d'un sous-chemin. Le `/`
 * final n'est pas décoratif : sans lui, `/verification` marquerait aussi `/verification-des-comptes`
 * comme active.
 */
function estActif(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar({
  ouverte,
  surSurvol,
  surSortie,
  estMobile,
  surFermer,
}: {
  ouverte: boolean
  surSurvol: () => void
  surSortie: () => void
  estMobile: boolean
  surFermer: () => void
}) {
  const { pathname } = useLocation()
  const groupes = useNavigation()
  const me = useSessionStore((s) => s.me)
  const espace = (me && ESPACE_PAR_ROLE[me.accountType]) ?? 'ULAMU'

  return (
    <aside
      onMouseEnter={surSurvol}
      onMouseLeave={surSortie}
      onFocus={surSurvol}
      onBlur={(e) => {
        // Ne referme que si le focus QUITTE réellement la barre : passer d'un item au suivant
        // déclenche un `blur` alors qu'on est toujours dedans.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) surSortie()
      }}
      style={{ width: ouverte ? 'var(--sidebar-width)' : 'var(--sidebar-rail)' }}
      className="absolute inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-[var(--glass-bordure)] bg-[var(--glass-sidebar-bg)] backdrop-blur-[var(--glass-sidebar-blur)] transition-[width] duration-[var(--dur-base)] select-none"
    >
      {/* ── En-tête : marque et espace courant ─────────────────────────────────────────────── */}
      <div
        className={
          'flex shrink-0 items-center gap-2 border-b border-border ' +
          (ouverte ? 'justify-start px-4 py-3' : 'justify-center py-3')
        }
      >
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.06)]">
          <LogoMark size={22} />
        </span>
        {ouverte ? (
          <span className="min-w-0 flex-1 whitespace-nowrap">
            <span className="block font-[family-name:var(--font-display)] text-sm font-bold leading-[1.1] tracking-[-0.01em] text-foreground">
              ulamu
            </span>
            <span className="mt-0.5 block font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.07em] text-[var(--texte-tertiaire)]">
              {espace}
            </span>
          </span>
        ) : null}
        {estMobile ? (
          <button
            type="button"
            onClick={surFermer}
            aria-label="Fermer le menu"
            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────────────────────── */}
      <nav aria-label="Navigation principale" className={'flex-1 overflow-y-auto overflow-x-hidden ' + (ouverte ? 'p-2' : 'py-2')}>
        {groupes.map((groupe) => (
          <div key={groupe.label ?? 'sans-titre'}>
            {/* Au repos, l'intitulé de groupe ne tiendrait pas dans 68 px : un filet le remplace,
                pour que la séparation reste lisible sans texte tronqué. */}
            {groupe.label && ouverte ? (
              <p className="mb-1 mt-2 whitespace-nowrap px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--texte-tertiaire)]">
                {groupe.label}
              </p>
            ) : null}
            {groupe.label && !ouverte ? <div aria-hidden="true" className="mx-4 mb-2 mt-1.5 h-px bg-border" /> : null}

            {groupe.items.map((item) => {
              const Icone = item.icon
              const actif = estActif(pathname, item.href)

              /* ⚠️ `className` et les enfants sont des CHAÎNES et des NŒUDS, jamais des fonctions —
                 et c'est la correction d'un défaut bien réel (20/08/2026).

                 `NavLink` accepte la forme `className={({isActive}) => …}`. Mais au repos chaque lien
                 est enveloppé dans `<TooltipTrigger asChild>`, et le `Slot` de Radix FUSIONNE les
                 `className` en les concaténant. Recevant une fonction, il la transformait en texte :
                 l'attribut `class` contenait le code source de la fonction. Le navigateur le
                 découpait alors en mots et appliquait au hasard les tokens valides des DEUX branches
                 — `w-10` passait, `"mx-[14px]` échouait à cause du guillemet collé. Les boutons se
                 retrouvaient collés au bord gauche au lieu d'être centrés dans les 68 px.

                 L'état actif est donc calculé ici, à partir de l'URL. */
              const lien = (
                <NavLink
                  key={item.key}
                  to={item.href}
                  aria-current={actif ? 'page' : undefined}
                  className={
                    /* Anneau de focus : CG-05 §01 le veut « jamais supprimé », et il manquait.
                       Au repos, les 14px de marge latérale laissent la place de l'afficher sans
                       qu'il soit rogné par l'`overflow-hidden` de la barre ; déployé, ce sont les
                       8px de `p-2` de la nav. */
                    'relative flex items-center rounded-md text-left transition-colors ' +
                    'focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none ' +
                    (ouverte ? 'w-full justify-start gap-2 px-3 py-2' : 'mx-[14px] my-0.5 h-[38px] w-10 justify-center') +
                    (actif
                      ? ' bg-[var(--ap-50)] font-semibold text-[var(--ap-700)]'
                      : ' font-medium text-muted-foreground hover:bg-secondary hover:text-foreground')
                  }
                >
                  {/* Le filet d'actif ne s'affiche que déployé : au repos il serait rogné par
                      l'`overflow:hidden` de la barre, le fond coloré suffit à désigner la page. */}
                  {actif && ouverte ? (
                    <span aria-hidden="true" className="absolute -left-2 bottom-[7px] top-[7px] w-[3px] rounded-sm bg-[var(--ap-500)]" />
                  ) : null}
                  <Icone size={17} strokeWidth={actif ? 2 : 1.5} className="relative flex shrink-0" aria-hidden="true" />
                  {ouverte ? (
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-[1.2]">
                      {item.label}
                    </span>
                  ) : null}
                </NavLink>
              )

              // Au repos, l'icône seule ne dit pas où elle mène : l'infobulle rend le libellé.
              return ouverte ? (
                lien
              ) : (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{lien}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Pied : bouton utilisateur et son menu ──────────────────────────────────────────── */}
      <div className={'relative shrink-0 border-t border-border ' + (ouverte ? 'p-2' : 'py-2')}>
        <UserMenu ouverte={ouverte} />
      </div>
    </aside>
  )
}
