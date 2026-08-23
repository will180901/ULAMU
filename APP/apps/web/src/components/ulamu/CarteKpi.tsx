/**
 * Carte de chiffre-clé — d'après `docs/maquettes/B2 - Tableau de bord.dc.html`.
 *
 * Tuile d'icône, intitulé en monospace majuscule, valeur en grand, et une ligne d'aide qui dit ce
 * que le chiffre RECOUVRE. Sans cette ligne, « 6 » ne veut rien dire : six quoi, sur quelle période ?
 *
 * ⚠️ **Pas de tendance.** La maquette affiche « +12 % vs juillet » sous chaque valeur. Aucune
 * comparaison historique n'est calculée nulle part côté serveur — ni tendance, ni série temporelle.
 * Une flèche verte inventée serait pire qu'une absence : elle se lirait comme une information.
 * La tendance reviendra quand l'API saura la produire (§9 du plan).
 */
import type { LucideIcon } from 'lucide-react'

export type TonKpi = 'accent' | 'ambre' | 'emeraude' | 'rose' | 'neutre'

const TONS: Record<TonKpi, string> = {
  accent: 'bg-[var(--ap-50)] text-[var(--ap-600)]',
  ambre: 'bg-[var(--ton-ambre-fond)] text-[var(--ton-ambre-icone)]',
  emeraude: 'bg-[var(--ton-emeraude-fond)] text-[var(--ton-emeraude-icone)]',
  rose: 'bg-[var(--ton-rose-fond)] text-[var(--ton-rose-icone)]',
  neutre: 'bg-secondary text-muted-foreground',
}

export function CarteKpi({
  icone: Icone,
  label,
  valeur,
  aide,
  ton = 'neutre',
}: {
  icone: LucideIcon
  label: string
  valeur: string
  aide?: string
  ton?: TonKpi
}) {
  return (
    <div className="ul-grain rounded-[10px] border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={'flex size-9 shrink-0 items-center justify-center rounded-md ' + TONS[ton]}>
          <Icone size={17} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--texte-tertiaire)]">
            {label}
          </span>
          <span className="mt-1 block font-[family-name:var(--font-display)] text-[22px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            {valeur}
          </span>
          {aide ? <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{aide}</span> : null}
        </span>
      </div>
    </div>
  )
}

/** Panneau à bandeau — le motif de section de B2 : icône, titre, sous-titre, puis le contenu. */
export function Panneau({
  icone: Icone,
  titre,
  sousTitre,
  action,
  children,
}: {
  icone: LucideIcon
  titre: string
  sousTitre?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="ul-grain-fine overflow-hidden rounded-[10px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)] px-4 py-3">
        <span aria-hidden="true" className="flex size-[26px] shrink-0 items-center justify-center rounded-md bg-[var(--ap-50)] text-[var(--ap-600)]">
          <Icone size={14} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-display)] text-sm font-bold leading-[1.2] tracking-[-0.012em] text-foreground">
            {titre}
          </span>
          {sousTitre ? <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">{sousTitre}</span> : null}
        </span>
        {action ? <span className="shrink-0">{action}</span> : null}
      </div>
      {children}
    </section>
  )
}
