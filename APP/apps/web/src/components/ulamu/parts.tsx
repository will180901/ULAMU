/**
 * Briques de mise en page communes aux écrans de la coquille — carte à bandeau, réglage, critère,
 * avis, pilule d'état.
 *
 * Écrites pour B3 « Mes paramètres », déplacées ici quand C1 « Ma vérification » a réclamé les mêmes.
 * Le motif est constant dans toutes les maquettes : une carte à bandeau (tuile d'icône, titre,
 * sous-titre), puis le contenu. On le factorise plutôt que de le recopier quinze fois — sinon la
 * quinzième version finit par dériver de la première.
 */
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Check } from 'lucide-react'

/** Carte à bandeau. `ton="danger"` réserve la tuile rouge à la clôture de compte. */
export function Carte({
  icone: Icone,
  titre,
  sousTitre,
  ton = 'accent',
  action,
  children,
}: {
  icone: LucideIcon
  titre: string
  sousTitre?: string
  ton?: 'accent' | 'danger'
  /**
   * Coin droit du bandeau — état d'enregistrement, bouton secondaire, groupe de segments.
   * Il ne se comprime jamais ; s'il ne tient pas, c'est le bandeau qui passe à la ligne.
   */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const tuile =
    ton === 'danger'
      ? 'bg-[var(--ton-rose-fond)] text-[var(--ton-rose-icone)]'
      : 'bg-[var(--ap-50)] text-[var(--ap-600)]'
  return (
    <section className="ul-grain-fine overflow-hidden rounded-[10px] border border-border bg-card">
      {/*
        `flex-wrap` + `basis-40` : à 375 px, un `action` large — les trois segments
        « Ouvertes / Closes / Annulées » d'E7 font 239 px — prenait toute la place et laissait
        **18 px** au titre, qui affichait donc « P… ». Le titre réclame maintenant 160 px avant que
        quoi que ce soit d'autre soit servi ; en dessous, l'action descend d'une ligne. Sur grand
        écran rien ne change : tout tient toujours sur une seule ligne.
      */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)] px-4 py-3">
        <span aria-hidden="true" className={'flex size-[26px] shrink-0 items-center justify-center rounded-md ' + tuile}>
          <Icone size={14} strokeWidth={1.5} />
        </span>
        {/*
          Le titre est un VRAI titre (`h2`), pas un `span` stylé. Un lecteur d'écran liste les titres
          d'une page pour s'y déplacer : avec des `span`, l'utilisateur devait parcourir la page
          entière au clavier pour trouver la carte qu'il cherchait. Le `h1` reste celui de l'écran,
          la hiérarchie est donc juste.
        */}
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="font-[family-name:var(--font-display)] text-sm font-bold leading-[1.2] tracking-[-0.012em] text-foreground">
            {titre}
          </h2>
          {sousTitre ? <p className="mt-0.5 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{sousTitre}</p> : null}
        </div>
        {action ? <span className="ml-auto shrink-0">{action}</span> : null}
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

/**
 * Message inline — icône obligatoire, jamais une teinte seule (CG-08 §06).
 *
 * `erreur` dit qu'une action a échoué ; `alerte` qu'une action MANQUE. La distinction n'est pas
 * cosmétique : « aucun tarif publié » n'est pas une panne, c'est une étape qui reste à faire, et la
 * teinte rouge de l'erreur y ferait chercher un problème qui n'existe pas.
 */
export function Avis({ ton, children }: { ton: 'erreur' | 'alerte' | 'succes' | 'info'; children: React.ReactNode }) {
  const styles = {
    erreur: 'border-[var(--erreur-bordure)] bg-[var(--erreur-fond)] text-[var(--erreur-texte)]',
    alerte: 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)] text-[var(--alerte-texte)]',
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

/**
 * Pilule d'état — le statut d'un dossier, d'une demande, d'une commande.
 *
 * Jamais la couleur seule (CG-11) : le libellé porte l'information, la teinte ne fait que la
 * renforcer. Un écran d'officine mal calibré en plein jour rend l'ambre et le rouge très proches.
 */
export type TonPilule = 'succes' | 'alerte' | 'erreur' | 'info' | 'neutre'

const TONS_PILULE: Record<TonPilule, string> = {
  succes: 'bg-[var(--succes-fond)] text-[var(--succes-texte)] border-[var(--succes-bordure)]',
  alerte: 'bg-[var(--alerte-fond)] text-[var(--alerte-texte)] border-[var(--alerte-bordure)]',
  erreur: 'bg-[var(--erreur-fond)] text-[var(--erreur-texte)] border-[var(--erreur-bordure)]',
  info: 'bg-[var(--info-fond)] text-[var(--info-texte)] border-[var(--info-bordure)]',
  neutre: 'bg-secondary text-muted-foreground border-border',
}

export function Pilule({ ton, children }: { ton: TonPilule; children: React.ReactNode }) {
  return (
    <span className={'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ' + TONS_PILULE[ton]}>
      {children}
    </span>
  )
}
