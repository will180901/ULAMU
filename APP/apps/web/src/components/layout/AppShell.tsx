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
import { AideRaccourcis } from '@/components/layout/AideRaccourcis'
import { BulleFormatageGlobale } from '@/components/ulamu/BulleFormatageGlobale'
import { useRaccourcisGlobaux } from '@/hooks/useRaccourcisGlobaux'
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
  /*
    Les deux fenêtres ouvertes au clavier (chantier 47). Leur état vit ICI, et pas dans les
    composants qui les affichent : c'est la coquille qui écoute les touches, et un état posé plus
    bas obligerait à faire remonter l'événement — donc à poser un second écouteur.
  */
  const [rechercheOuverte, setRechercheOuverte] = useState(false)
  const [aideOuverte, setAideOuverte] = useState(false)

  const estMobile = useIsMobile()
  const titre = useTitrePage()
  const { pathname } = useLocation()

  useIdleLogout(true)

  // Un seul écouteur pour tous les raccourcis globaux — voir `useRaccourcisGlobaux` pour la garde
  // de saisie et pour la raison de `e.key` plutôt que `e.code` (claviers AZERTY).
  useRaccourcisGlobaux({
    surRecherche: () => setRechercheOuverte((v) => !v),
    surAide: () => setAideOuverte((v) => !v),
  })

  // Changer de page referme le tiroir : sur mobile il recouvre l'écran, le laisser ouvert cacherait
  // la page qu'on vient justement de demander.
  useEffect(() => {
    setNavMobile(false)
  }, [pathname])

  const ouverte = estMobile ? true : survol

  /*
    `h-dvh` et non `h-screen` (= 100vh) — corrigé le 01/09/2026.

    Sur un navigateur mobile, `100vh` vaut la hauteur de l'écran **barre d'adresse escamotée**, pas
    la hauteur réellement visible. Combiné à `overflow-hidden`, qui interdit à la coquille de
    défiler, le bas de l'application se retrouvait sous la barre du navigateur, **sans aucun moyen
    d'y accéder** : en consultation, c'est le composeur de messages qui disparaissait.

    Le volet de développement n'a pas de barre d'adresse : aucune émulation ne montre ce défaut. Il
    ne se voit que sur un vrai téléphone — ou en lisant l'unité employée.
  */
  /*
    La ZONE — posée ici, sur la coquille, et nulle part ailleurs.

    Deux interfaces vivent dans cette application : celle du soignant (peu d'écrans, on LIT) et
    celle de l'administration (des files, on BALAYE). Elles partagent les mêmes jetons et les mêmes
    composants ; seule l'échelle de la hiérarchie change. L'attribut règle les quatre voix
    (`--voix-*` dans `globals.css`) pour tout ce qui est monté en dessous.

    ⚠️ À ne pas confondre avec `data-densite`, posé sur `<html>` : celui-là appartient à
    l'UTILISATEUR (« Mes paramètres »), et ne touche que le serrage vertical. Deux leviers, deux
    propriétaires — la zone dit la hiérarchie, la densité dit le serrage, et aucun des deux ne peut
    annuler l'autre. Reprendre `data-densite` pour la zone aurait confisqué un réglage que
    l'utilisateur avait le droit de garder.

    Le préfixe d'URL fait foi, et pas la capacité du compte : c'est l'ÉCRAN qu'on regarde qui
    décide, pas qui le regarde. Un super-administrateur qui ouvre « Mes paramètres » est sur un
    écran de lecture, pas sur une file.
  */
  const zone = pathname.startsWith('/admin') ? 'administration' : 'soin'

  return (
    <div data-zone={zone} className="relative h-dvh overflow-hidden bg-[var(--fond-page)] saris-grain">
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
          rechercheOuverte={rechercheOuverte}
          surRechercheChange={setRechercheOuverte}
        />
        {/* `--contenu-max` centre la colonne de lecture sur les très larges écrans : une ligne de
            texte qui traverse 2000 px ne se lit pas. */}
        <div className="relative flex-1 overflow-hidden">
          {/* `inert` sous le voile : sans lui, les champs masqués resteraient TABULABLES — on
              taperait dans un formulaire qu'on ne voit pas. Le voile ne couvre PAS la barre du
              haut, sinon le bouton qui l'a posé deviendrait inatteignable. */}
          <div className="h-full overflow-y-auto">
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
        </div>

        <AideRaccourcis ouvert={aideOuverte} surChangement={setAideOuverte} />

        {/*
          ── La mise en forme, montée UNE FOIS pour toute l'application (chantier 87) ───────────

          Demande du porteur, après avoir essayé la sélection dans le compte-rendu : *« il faut ce
          type de sélection partout dans les interfaces où il y a des champs de saisie texte »*.

          Elle s'attache d'elle-même à toute zone de saisie multiligne — les vingt-trois de
          l'application — sans qu'aucun écran ait à la connaître. Un champ peut la refuser avec
          `data-sans-formatage` ; aucun ne le fait aujourd'hui, et c'est voulu.

        */}
        <BulleFormatageGlobale />
      </main>
    </div>
  )
}
