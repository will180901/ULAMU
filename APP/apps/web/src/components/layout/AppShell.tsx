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
import { GardeFou } from '@/components/layout/GardeFou'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { VoileRideau } from '@/components/layout/RideauConfidentialite'
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
  // Rideau de confidentialité : état d'écran, jamais persisté (voir `RideauConfidentialite.tsx`).
  const [rideau, setRideau] = useState(false)
  const estMobile = useIsMobile()
  const titre = useTitrePage()
  const { pathname } = useLocation()

  useIdleLogout(true)

  // Changer de page referme le tiroir : sur mobile il recouvre l'écran, le laisser ouvert cacherait
  // la page qu'on vient justement de demander.
  useEffect(() => {
    setNavMobile(false)
  }, [pathname])

  // Changer de page lève le rideau : on vient de demander cet écran, le garder voilé ressemblerait
  // à une panne. Et le geste qui a mené ici prouve qu'on est bien devant la machine.
  useEffect(() => {
    setRideau(false)
  }, [pathname])

  const ouverte = estMobile ? true : survol

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--fond-page)] saris-grain">
      {/* Sur mobile, la barre sort du flux : translatée hors écran tant qu'on ne l'appelle pas.
          `inert` quand elle est fermée — sans lui, ses liens restent TABULABLES bien qu'invisibles :
          le focus disparaîtrait de l'écran pendant neuf tabulations, sans que rien ne l'explique.

          ⚠️ `w-[var(--sidebar-width)]` n'est pas décoratif, c'est ce qui fait FONCTIONNER la
          fermeture. `-translate-x-full` déplace de −100 % de la largeur de l'élément — or cette
          enveloppe n'en avait aucune : son unique enfant, la barre, est lui-même en `absolute` et
          donc hors flux. La largeur valait 0, la translation valait 0 px, et le tiroir restait
          collé à l'écran, recouvrant les deux tiers de la page, `inert` et donc muet : ni ses
          liens ni sa croix ne répondaient. Constaté le 01/09/2026 pendant la relecture visuelle,
          sur les neuf écrans à 375 px. */}
      <div
        inert={estMobile && !navMobile}
        className={
          estMobile
            ? 'absolute inset-y-0 left-0 z-50 w-[var(--sidebar-width)] transition-transform duration-[var(--dur-base)] ' +
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
        <TopHeader
          titre={titre}
          estMobile={estMobile}
          surOuvrirNav={() => setNavMobile(true)}
          rideau={rideau}
          surBasculerRideau={() => setRideau((v) => !v)}
        />
        {/* `--contenu-max` centre la colonne de lecture sur les très larges écrans : une ligne de
            texte qui traverse 2000 px ne se lit pas. */}
        <div className="relative flex-1 overflow-hidden">
          {/* `inert` sous le voile : sans lui, les champs masqués resteraient TABULABLES — on
              taperait dans un formulaire qu'on ne voit pas. Le voile ne couvre PAS la barre du
              haut, sinon le bouton qui l'a posé deviendrait inatteignable. */}
          <div inert={rideau} className="h-full overflow-y-auto">
            <div style={{ maxWidth: 'var(--contenu-max)' }} className="mx-auto p-4">
              {/*
                `key={pathname}` remonte la limite à chaque changement d'écran : sans elle, une fois
                l'erreur affichée, elle resterait affichée sur TOUS les écrans suivants — la
                navigation ne changerait plus rien, ce qui ressemblerait à une application gelée.
              */}
              <GardeFou key={pathname} portee="zone">
                <Outlet />
              </GardeFou>
            </div>
          </div>
          {rideau ? <VoileRideau surLever={() => setRideau(false)} /> : null}
        </div>
      </main>
    </div>
  )
}
