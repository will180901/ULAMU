/**
 * Briques communes aux quatre sections de B3 — d'après `docs/maquettes/B3 - Mes parametres.dc.html`.
 *
 * Le motif de la maquette est constant : une carte à bandeau (tuile d'icône, titre, sous-titre), puis
 * le contenu. On le factorise ici plutôt que de le recopier quinze fois, sinon la quinzième version
 * finit par dériver.
 */
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Check } from 'lucide-react'

/** Carte à bandeau. `ton="danger"` réserve la tuile rouge à la clôture de compte. */
export function Carte({
  icone: Icone,
  titre,
  sousTitre,
  ton = 'accent',
  children,
}: {
  icone: LucideIcon
  titre: string
  sousTitre?: string
  ton?: 'accent' | 'danger'
  children: React.ReactNode
}) {
  const tuile =
    ton === 'danger'
      ? 'bg-[var(--ton-rose-fond)] text-[var(--ton-rose-icone)]'
      : 'bg-[var(--ap-50)] text-[var(--ap-600)]'
  return (
    <section className="ul-grain-fine overflow-hidden rounded-[10px] border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)] px-4 py-3">
        <span aria-hidden="true" className={'flex size-[26px] shrink-0 items-center justify-center rounded-md ' + tuile}>
          <Icone size={14} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-[family-name:var(--font-display)] text-sm font-bold leading-[1.2] tracking-[-0.012em] text-foreground">
            {titre}
          </span>
          {sousTitre ? <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{sousTitre}</span> : null}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </section>
  )
}

/** Groupe de boutons exclusifs — thème, langue. Le sélectionné porte `aria-pressed`. */
export function Segments<T extends string>({
  valeur,
  options,
  onChange,
  label,
}: {
  valeur: T
  options: Array<{ cle: T; label: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <span role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg border border-border bg-secondary p-0.5">
      {options.map((o) => {
        const actif = o.cle === valeur
        return (
          <button
            key={o.cle}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(o.cle)}
            className={
              'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ' +
              'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 ' +
              (actif ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,.06)]' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {o.label}
          </button>
        )
      })}
    </span>
  )
}

/** Ligne « intitulé + aide » à gauche, contrôle à droite. Le motif des réglages de la maquette. */
export function Reglage({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0 flex-1 basis-52">
        <span className="block text-[13px] font-medium text-foreground">{titre}</span>
        {aide ? <span className="mt-0.5 block text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{aide}</span> : null}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  )
}

/**
 * Critère rempli ou non. Jamais la couleur seule (CG-11) : l'icône change aussi, sinon un écran mal
 * calibré d'officine en plein jour rend le vert et le rouge indiscernables.
 */
export function Critere({ ok, label }: { ok: boolean; label: string }) {
  const Icone = ok ? Check : AlertTriangle
  return (
    <span className={'flex items-center gap-2 text-[12px] ' + (ok ? 'text-[var(--succes-texte)]' : 'text-[var(--alerte-texte)]')}>
      <Icone size={13} strokeWidth={2} aria-hidden="true" className="shrink-0" />
      {label}
    </span>
  )
}

/** Message inline — icône obligatoire, jamais une teinte seule (CG-08 §06). */
export function Avis({ ton, children }: { ton: 'erreur' | 'succes' | 'info'; children: React.ReactNode }) {
  const styles = {
    erreur: 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)] text-[var(--alerte-texte)]',
    succes: 'border-[var(--succes-bordure)] bg-[var(--succes-fond)] text-[var(--succes-texte)]',
    info: 'border-border bg-secondary text-muted-foreground',
  }[ton]
  const Icone = ton === 'succes' ? Check : AlertTriangle
  return (
    <p role={ton === 'erreur' ? 'alert' : 'status'} className={'flex items-start gap-2 rounded-md border px-3 py-2 text-[12px] leading-[1.5] ' + styles}>
      <Icone size={13} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  )
}
