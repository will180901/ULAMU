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
  appelle = false,
}: {
  icone: LucideIcon
  label: string
  valeur: string
  aide?: string
  ton?: TonKpi
  /**
   * Cette carte demande un GESTE, maintenant — chantier 70.
   *
   * Les quatre tuiles d'un tableau de bord se ressemblaient trait pour trait, alors qu'une seule
   * porte une échéance : les demandes en attente EXPIRENT, et une expiration fait baisser un taux
   * que les patients lisent. Rien ne la distinguait des trois qui ne demandent rien.
   *
   * ⚠️ L'accent se dépense **au cas par cas, jamais en permanence** : la carte reprend l'apparence
   * ordinaire dès qu'il n'y a plus rien à faire. Une carte accentuée en continu redevient un fond
   * d'écran au bout de trois jours — *si tout est mis en avant, plus rien ne l'est*.
   *
   * L'accent n'est pas seul à porter l'information : la valeur et sa ligne d'aide disent déjà
   * combien et sous quel délai (CG-11 — jamais la couleur seule).
   */
  appelle?: boolean
}) {
  // Rembourrage vertical par jeton, horizontal fixe : c'est l'arbitrage déjà posé pour la densité —
  // resserrer l'horizontal collerait le texte aux bordures. « Compact » fait donc respirer un peu
  // moins, sans jamais rétrécir la marge latérale.
  return (
    <div
      className={
        'ul-grain rounded-[10px] border px-4 py-[var(--espace-5)] ' +
        (appelle ? 'border-[var(--alerte-bordure)] bg-[var(--alerte-fond)]' : 'border-border bg-card')
      }
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={'flex size-9 shrink-0 items-center justify-center rounded-md ' + TONS[ton]}>
          <Icone size={17} strokeWidth={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block ul-surtitre">
            {label}
          </span>
          {/* Le blanc AVANT le chiffre est ce qui le fait exister : c'est l'écart, pas la taille
              seule, qui dit « ceci est le sujet de la carte ». */}
          <span className="mt-2 block ul-chiffre">
            {valeur}
          </span>
          {/* Sur une carte qui appelle, la ligne d'aide porte le DÉLAI — elle cesse d'être un
              commentaire et devient l'information la plus utile de la tuile. Elle quitte donc
              l'encre tertiaire pour celle de l'alerte, qui se lit sur ce fond.

              ⚠️ En style inline, et non par un utilitaire Tailwind : `.ul-aide` fixe déjà `color`
              et `font-weight`, et elle vit HORS d'un `@layer` — elle l'emporterait donc sur
              `text-[…]` et `font-medium`, qui n'auraient simplement aucun effet. C'est le piège
              relevé au chantier 69 ; consommer le jeton en inline est le motif documenté du
              système. */}
          {aide ? (
            <span
              className="mt-0.5 block ul-aide"
              style={appelle ? { color: 'var(--alerte-texte)', fontWeight: 500 } : undefined}
            >
              {aide}
            </span>
          ) : null}
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
          <span className="block ul-titre-panneau">
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
