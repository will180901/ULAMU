/**
 * Barre du haut — 48 px, verre dépoli, d'après la maquette B1 (mesurée le 27/08 en l'affichant).
 *
 * De gauche à droite : le fil d'Ariane (ou le bouton de navigation sur mobile), puis à droite la
 * **pastille de présence**, la **cloche de notifications** et le **rideau de confidentialité**.
 *
 * ⚠️ **Un élément de la maquette reste absent, volontairement** : la **recherche globale**.
 * L'alignement la conserve mais en change la PORTÉE — elle cherchera dans les consultations et
 * ordonnances du médecin lui-même, jamais dans les patients (EF-06-01 impose une fiche
 * anonymisée). Elle ira donc avec C4, quand il y aura des dossiers à chercher ; la construire ici
 * reviendrait à chercher dans le vide.
 *
 * Le **tiroir de notifications** figurait ici sur la même liste depuis le chantier 1, avec sa
 * raison : « réel côté serveur, mais c'est une fonctionnalité à part entière, pas un morceau de
 * coquille ». Elle était juste, et elle a tenu trente-six chantiers. **Il est construit depuis le
 * 03/09/2026** (chantier 37) — voir `CentreNotifications.tsx`.
 *
 * Le « rideau de confidentialité », lui, était écarté depuis le 20/08 faute de trace au cahier.
 * **Le porteur l'a retenu le 27/08** (40ᵉ écart) : c'est une forme, pas un fait. Voir
 * `RideauConfidentialite.tsx` pour le raisonnement complet.
 */
import { Menu } from 'lucide-react'
import { useSessionStore } from '@/state/session.store'
import { ESPACE_PAR_ROLE } from '@/config/navigation.config'
import { IndicateurPresence } from '@/components/layout/IndicateurPresence'
import { CentreNotifications } from '@/components/layout/CentreNotifications'
import { RechercheGlobale } from '@/components/layout/RechercheGlobale'
import { BoutonRideau } from '@/components/layout/RideauConfidentialite'

export function TopHeader({
  titre,
  estMobile,
  surOuvrirNav,
  rideau,
  surBasculerRideau,
}: {
  titre: string
  estMobile: boolean
  surOuvrirNav: () => void
  rideau: boolean
  surBasculerRideau: () => void
}) {
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

      {/*
        La recherche globale (chantier 46). Elle reste sur mobile, et c'est délibéré : c'est
        justement sur un téléphone, où le tiroir recouvre l'écran entier, qu'atteindre un écran
        éloigné coûte le plus de gestes.
      */}
      <RechercheGlobale />

      {/* La présence ne concerne que les professionnels : le composant se retire tout seul pour les
          autres rôles (un administrateur n'a aucune disponibilité à déclarer). */}
      <IndicateurPresence />

      {/* La cloche reste sur mobile, contrairement au rideau : c'est justement sur un téléphone,
          entre deux consultations, qu'on veut savoir qu'un patient attend. */}
      <CentreNotifications />

      {/* Absent sur mobile, comme dans la maquette : un téléphone se retourne, et la place dans une
          barre de 48 px y est comptée. */}
      {estMobile ? null : <BoutonRideau actif={rideau} surBasculer={surBasculerRideau} />}
    </header>
  )
}
