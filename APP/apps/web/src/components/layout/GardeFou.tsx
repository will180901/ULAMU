/**
 * `GardeFou` — le filet sous les écrans.
 *
 * ── Ce qu'on a constaté ───────────────────────────────────────────────────────────────────────
 *
 * Le 01/09/2026, pendant la relecture visuelle du chantier 18, **deux écrans sur seize** ont fait
 * disparaître l'application entière : page blanche, aucun message, aucun retour possible sans
 * recharger. La cause était banale dans les deux cas — une réponse serveur revenue en 200 mais dont
 * la forme n'était pas celle attendue, puis une lecture directe du genre `data.preferences.find(…)`.
 *
 * React se comporte ainsi **par conception** : depuis la version 16, une erreur de rendu qui n'est
 * rattrapée par aucune limite démonte l'arbre en entier. Ce n'est pas un défaut de nos écrans,
 * c'est l'absence de limite. Il n'y en avait aucune dans toute l'application web.
 *
 * ── Pourquoi une limite plutôt que des lectures défensives partout ────────────────────────────
 *
 * On pourrait blinder chaque accès — `data?.preferences?.find(…)`. Ce serait des centaines de points
 * à corriger, et il en resterait toujours un. Surtout, un `?.` transforme une panne en écran vide
 * silencieux : l'utilisateur voit une carte sans contenu et croit qu'il n'a rien à faire.
 *
 * Une limite fait l'inverse : elle **circonscrit** la panne à l'écran fautif, la **nomme**, et
 * laisse la coquille debout — barre latérale comprise, donc le moyen de partir ailleurs.
 *
 * ── Deux niveaux, et pourquoi ─────────────────────────────────────────────────────────────────
 *
 *  • Autour de l'écran de la route (dans `AppShell`) : la navigation survit. C'est celui qui sert.
 *  • Autour de l'application entière (dans `main.tsx`) : pour ce qui casse AVANT la coquille — les
 *    écrans d'authentification, la coquille elle-même. Il ne peut rien proposer d'autre que
 *    recharger, et c'est honnête de le dire.
 *
 * ── Ce qu'il ne fait pas ──────────────────────────────────────────────────────────────────────
 *
 * Il ne rattrape **pas** les erreurs d'un gestionnaire d'événement ni d'une promesse : React ne les
 * fait pas passer par là. Les appels réseau, eux, sont déjà tenus par TanStack Query, qui les
 * expose en `isError` — chaque écran les affiche déjà.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

interface Props {
  children: ReactNode
  /** `page` occupe l'écran entier ; `zone` s'insère dans la coquille. */
  portee?: 'page' | 'zone'
}

interface State {
  erreur: Error | null
}

export class GardeFou extends Component<Props, State> {
  state: State = { erreur: null }

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur }
  }

  componentDidCatch(erreur: Error, infos: ErrorInfo) {
    // La console reste la seule destination : aucun service de télémétrie n'est branché, et en
    // brancher un enverrait des données de santé chez un tiers. Le message est explicite pour que
    // la trace serve à quelque chose quand quelqu'un ouvre les outils de développement.
    console.error('[ULAMU] Écran interrompu :', erreur, infos.componentStack)
  }

  private reessayer = () => this.setState({ erreur: null })

  render() {
    const { erreur } = this.state
    if (!erreur) return this.props.children

    const page = this.props.portee === 'page'

    return (
      <div
        role="alert"
        className={
          page
            ? 'flex min-h-dvh items-center justify-center bg-[var(--fond-page)] p-5'
            : 'flex items-start justify-center p-4'
        }
      >
        <div className="w-full max-w-[520px] overflow-hidden rounded-[10px] border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--fond-surface-2)_55%,transparent)] px-4 py-3">
            <span
              aria-hidden="true"
              className="flex size-[26px] shrink-0 items-center justify-center rounded-md bg-[var(--ton-rose-fond)] text-[var(--ton-rose-icone)]"
            >
              <TriangleAlert size={14} strokeWidth={1.5} />
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold leading-[1.2] tracking-[-0.012em] text-foreground">
              Cet écran s'est interrompu
            </h2>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <p className="text-[13px] leading-[1.55] text-muted-foreground">
              {page
                ? "L'application n'a pas pu s'afficher. Rien de ce que vous aviez commencé n'a été envoyé au serveur."
                : "Le reste de l'application fonctionne : vous pouvez passer à un autre écran par le menu de gauche. Rien de ce que vous aviez commencé sur celui-ci n'a été envoyé au serveur."}
            </p>

            {/*
              Le message technique est montré, pas caché. Le porteur du projet est aussi celui qui
              corrige : « une erreur est survenue » lui coûterait une reproduction complète pour
              retrouver ce que cette ligne dit déjà.
            */}
            <p className="rounded-md border border-border bg-secondary px-3 py-2 font-mono text-[11px] leading-[1.5] break-words text-[var(--texte-tertiaire)]">
              {erreur.message || String(erreur)}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={page ? () => window.location.reload() : this.reessayer}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
                {page ? 'Recharger la page' : 'Réessayer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
