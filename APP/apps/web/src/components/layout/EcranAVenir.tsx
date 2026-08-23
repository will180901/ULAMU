/**
 * Écran non encore reconstruit — occupe la route pour que la coquille soit navigable.
 *
 * Il dit **quel** écran manque, pas seulement qu'il manque : sans le titre, toutes les routes se
 * ressembleraient et on ne saurait pas si la navigation fonctionne. Chacun disparaît à mesure que
 * son écran est bâti, dans l'ordre du plan.
 */
import { Hammer } from 'lucide-react'
import { ICONE_DEFAUT, ICONE_PAR_CLE, NAV_GROUPS } from '@/config/navigation.config'

export function EcranAVenir({ titre }: { titre: string }) {
  const cle = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === titre)?.key
  const Icone = cle ? (ICONE_PAR_CLE[cle] ?? ICONE_DEFAUT) : ICONE_DEFAUT

  return (
    <div className="ulamu-step-fade">
      {/* En-tête de page : tuile d'icône, titre, sous-titre — le motif que reprendront tous les
          écrans de la coquille (maquette B1). */}
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-[var(--ap-50)] text-[var(--ap-600)]"
        >
          <Icone size={18} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.2] text-foreground">{titre}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--texte-tertiaire)]">Écran en cours de reconstruction.</p>
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--bordure-normale)] bg-secondary px-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-card text-[var(--texte-tertiaire)]">
          <Hammer size={24} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <p className="m-0 font-[family-name:var(--font-display)] text-lg font-semibold leading-[1.3] text-foreground">
          {titre} arrive bientôt
        </p>
        <p className="m-0 max-w-[46ch] text-[13px] leading-[1.55] text-muted-foreground">
          Cet écran est refait sur la nouvelle base de composants. La navigation, elle, fonctionne
          déjà : les autres entrées de la barre latérale sont accessibles.
        </p>
      </div>
    </div>
  )
}
