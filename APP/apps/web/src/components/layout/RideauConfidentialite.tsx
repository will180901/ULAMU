/**
 * Rideau de confidentialité — barre du haut, d'après la maquette B1.
 *
 * ── D'où vient cet écran, et pourquoi il a failli ne pas exister ──────────────────────────────
 *
 * **40ᵉ écart de l'alignement, trouvé le 27/08 en OUVRANT la maquette** — les 39 autres venaient
 * d'une lecture textuelle, et celui-ci ne pouvait pas en sortir : c'est un `title` d'infobulle sur
 * un bouton, pas une phrase visible.
 *
 * Il n'a **aucune trace au cahier des charges** : zéro occurrence dans les 40 fichiers. Une session
 * précédente l'avait donc écarté, avec un raisonnement défendable — « lui inventer un comportement
 * serait promettre une protection qui n'existe pas ». Le porteur a tranché autrement le 27/08, en
 * appliquant sa règle d'arbitrage : masquer son écran n'est pas un **fait** (aucun PM, aucune règle
 * serveur), c'est une **forme** — et sur la forme, la maquette décide.
 *
 * ── Ce qu'il fait, et ce qu'il ne fait pas ────────────────────────────────────────────────────
 *
 * Il masque ce qui est à l'écran quand le médecin s'en écarte — un collègue, un patient suivant, un
 * proche qui passe derrière lui. **Rien n'est envoyé, rien n'est stocké, rien n'est journalisé** :
 * c'est un voile posé sur des pixels, dans un seul onglet.
 *
 * Ce n'est donc PAS une mesure de sécurité, et l'écran ne le présente jamais comme telle. La session
 * reste ouverte, le jeton reste valide. La vraie barrière contre un poste abandonné reste la
 * déconnexion pour inactivité, montée dans `AppShell`.
 *
 * ── Trois décisions de détail ─────────────────────────────────────────────────────────────────
 *
 * 1. **Il ne survit pas au rechargement.** Retrouver son écran voilé après avoir rouvert
 *    l'application ressemblerait à une panne, et le geste pour le lever coûte un clic.
 * 2. **Il ne se déclenche pas tout seul.** Le faire aurait demandé de choisir un délai que le
 *    cahier ne donne pas — donc d'inventer un chiffre, ce que le plan interdit (écarté le 27/08).
 * 3. **Il est absent sur mobile**, comme dans la maquette : un téléphone se retourne, et la place
 *    dans une barre de 48 px y est comptée.
 */
import { Eye, EyeOff } from 'lucide-react'

export function BoutonRideau({ actif, surBasculer }: { actif: boolean; surBasculer: () => void }) {
  return (
    <button
      type="button"
      onClick={surBasculer}
      aria-pressed={actif}
      title={actif ? 'Révéler l’écran' : 'Rideau de confidentialité'}
      aria-label={actif ? 'Révéler l’écran' : 'Masquer l’écran (rideau de confidentialité)'}
      className={
        'flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none ' +
        (actif
          ? 'bg-[var(--ton-ambre-fond)] text-[var(--ton-ambre-icone)]'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground')
      }
    >
      {actif ? <EyeOff size={16} strokeWidth={1.5} aria-hidden="true" /> : <Eye size={16} strokeWidth={1.5} aria-hidden="true" />}
    </button>
  )
}

/**
 * Le voile lui-même. Il couvre la zone de contenu, pas la barre du haut : le bouton qui l'a posé
 * doit rester visible et cliquable, sinon on enferme l'utilisateur derrière son propre rideau.
 *
 * `inert` sur le contenu masqué est posé par l'appelant : un voile qui ne fait que flouter
 * laisserait les champs dessous TABULABLES — on taperait dans un formulaire qu'on ne voit pas.
 */
export function VoileRideau({ surLever }: { surLever: () => void }) {
  return (
    <div
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-3 bg-[var(--fond-page)]/80 backdrop-blur-[14px]"
      onClick={surLever}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          surLever()
        }
      }}
      /* Nom DISTINCT de celui du bouton de la barre du haut : les deux lèvent le rideau, et deux
         commandes qui s'appellent pareil sont ambiguës au lecteur d'écran comme au clavier. */
      aria-label="Lever le rideau"
    >
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-[var(--fond-surface)] text-[var(--texte-tertiaire)] shadow-[0_1px_2px_rgba(15,23,42,.06)]">
        <EyeOff size={19} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="text-center text-[13px] leading-snug text-[var(--texte-secondaire)]">
        Écran masqué
        <span className="mt-0.5 block text-[11px] text-[var(--texte-tertiaire)]">
          Cliquez pour révéler · votre session reste ouverte
        </span>
      </span>
    </div>
  )
}
