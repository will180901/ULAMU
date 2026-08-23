/**
 * B1 — Coquille applicative. D'après `docs/maquettes/B1 - Coquille applicative.dc.html`.
 *
 * Barre latérale à gauche, barre du haut, et la zone de contenu où `Outlet` monte l'écran de la
 * route courante.
 *
 * **La place réservée à la barre vaut TOUJOURS 68 px sur grand écran**, même déployée. C'est le
 * point non évident de cette mise en page : la barre recouvre le contenu au survol au lieu de le
 * pousser. Sans cela, chaque passage de souris ferait sauter la colonne qu'on est en train de lire.
 *
 * Sous 768 px la barre devient un tiroir : hors flux, ouverte par le bouton de la topbar, refermée
 * par le voile ou par la croix.
 *
 * La déconnexion pour inactivité est montée ICI — c'est la coquille qui enveloppe toute session
 * ouverte. Elle vivait sur l'écran d'attente depuis la table rase ; sa place est ici.
 */
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { NAV_GROUPS } from '@/config/navigation.config'
import { useIdleLogout } from '@/state/useIdleLogout'
import { useIsMobile } from '@/hooks/use-mobile'

/** Titre de la page courante, déduit de l'URL — évite de le répéter dans chaque écran. */
function useTitrePage(): string {
  const { pathname } = useLocation()
  const item = NAV_GROUPS.flatMap((g) => g.items)
    // Le plus long chemin correspondant gagne : `/admin/verification` doit l'emporter sur
    // `/verification`, qui en est un préfixe.
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return item?.label ?? 'ULAMU'
}

export function AppShell() {
  const [survol, setSurvol] = useState(false)
  const [navMobile, setNavMobile] = useState(false)
  const estMobile = useIsMobile()
  const titre = useTitrePage()
  const { pathname } = useLocation()

  useIdleLogout(true)

  // Changer de page referme le tiroir : sur mobile il recouvre l'écran, le laisser ouvert cacherait
  // la page qu'on vient justement de demander.
  useEffect(() => {
    setNavMobile(false)
  }, [pathname])

  const ouverte = estMobile ? true : survol

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--fond-page)] saris-grain">
      {/* Sur mobile, la barre sort du flux : translatée hors écran tant qu'on ne l'appelle pas. */}
      <div
        className={
          estMobile
            ? 'absolute inset-y-0 left-0 z-50 transition-transform duration-[var(--dur-base)] ' +
              (navMobile ? 'translate-x-0' : '-translate-x-full')
            : 'contents'
        }
      >
        <Sidebar
          ouverte={ouverte}
          surSurvol={() => !estMobile && setSurvol(true)}
          surSortie={() => !estMobile && setSurvol(false)}
          estMobile={estMobile}
          surFermer={() => setNavMobile(false)}
        />
      </div>

      {estMobile && navMobile ? (
        <div aria-hidden="true" onClick={() => setNavMobile(false)} className="absolute inset-0 z-40 bg-[rgba(15,23,42,.45)]" />
      ) : null}

      <main
        style={{ left: estMobile ? 0 : 'var(--sidebar-rail)' }}
        className="absolute inset-y-0 right-0 flex flex-col overflow-hidden"
      >
        <TopHeader titre={titre} estMobile={estMobile} surOuvrirNav={() => setNavMobile(true)} />
        {/* `--contenu-max` centre la colonne de lecture sur les très larges écrans : une ligne de
            texte qui traverse 2000 px ne se lit pas. */}
        <div className="flex-1 overflow-y-auto">
          <div style={{ maxWidth: 'var(--contenu-max)' }} className="mx-auto p-4">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
