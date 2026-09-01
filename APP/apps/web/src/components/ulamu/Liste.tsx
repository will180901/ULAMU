/**
 * `Liste` — la liste déroulante d'ULAMU, en remplacement des listes natives.
 *
 * ── Pourquoi remplacer `<select>` ─────────────────────────────────────────────────────────────
 *
 * Une liste native est dessinée par le **système**, pas par l'application. Trois conséquences que
 * l'on constatait dans les dix listes des huit écrans concernés :
 *
 * 1. **Elle ignore le thème.** Le champ fermé suit bien nos couleurs, mais le menu ouvert est celui
 *    de Windows ou d'Android : fond blanc en thème sombre, surlignage bleu système, coins carrés.
 *    Sur les huit écrans concernés, l'application changeait d'identité au moment précis où
 *    l'utilisateur choisit.
 * 2. **Une option ne peut porter qu'une ligne de texte.** Or la moitié de nos listes ont besoin
 *    d'expliquer le choix — « Vérification : instruire les dossiers, décider des badges ». Cette
 *    explication vivait donc SOUS le champ, et ne concernait que l'option déjà sélectionnée : on
 *    devait choisir pour savoir ce qu'on choisissait.
 * 3. **Rien n'est stylable** : ni l'espacement, ni la coche de l'option courante, ni la largeur du
 *    menu, ni le survol.
 *
 * ── Ce que ce composant garantit ──────────────────────────────────────────────────────────────
 *
 * Il s'appuie sur Radix (`components/ui/select`), donc **rien n'est perdu de la liste native** :
 * navigation au clavier, recherche en tapant les premières lettres, fermeture à Échap, annonce du
 * rôle et de l'état aux lecteurs d'écran, et le focus qui revient au champ à la fermeture.
 *
 * Ce qu'il ajoute : nos couleurs dans les deux thèmes, la mesure exacte de nos champs de
 * saisie — 36 px de haut, rayon 6, halo de focus à 12 %, comme `Input` — et **une aide par
 * option**, affichée avant le choix plutôt qu'après.
 *
 * ── Ce qu'il ne fait pas ──────────────────────────────────────────────────────────────────────
 *
 * Il ne cherche pas dans une longue liste. Pour un référentiel de plusieurs dizaines d'entrées —
 * les médicaments de C7 — c'est un champ de recherche qu'il faut, et il existe déjà là-bas. Une
 * liste déroulante sert à choisir parmi ce qu'on peut lire d'un coup d'œil.
 */
import { Select as SelectPrimitive } from 'radix-ui'
import { CheckIcon } from 'lucide-react'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface OptionListe<T extends string> {
  cle: T
  label: string
  /** Une ligne d'explication sous l'intitulé — ce qu'une liste native ne sait pas afficher. */
  aide?: string
  desactivee?: boolean
}

export function Liste<T extends string>({
  valeur,
  onChange,
  options,
  label,
  id,
  placeholder = 'Choisir…',
  taille = 'default',
  className,
  disabled,
}: {
  valeur: T
  onChange: (v: T) => void
  options: ReadonlyArray<OptionListe<T>>
  /**
   * Nom accessible du champ. À fournir SAUF si un `<Label htmlFor>` pointe déjà sur `id` — sans
   * quoi le champ serait annoncé deux fois.
   */
  label?: string
  id?: string
  placeholder?: string
  taille?: 'sm' | 'default'
  className?: string
  disabled?: boolean
}) {
  return (
    <Select value={valeur} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          /* Accordé sur `Input` — 36 px, rayon 6, retrait 12, halo à 12 % — pour qu'une liste et un
             champ de saisie voisins ne se décalent pas d'un pixel. Le composant shadcn, lui, arrive
             en 32 px et `w-fit`. */
          'h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/12',
          'data-[size=sm]:h-7 data-[size=sm]:px-2.5',
          className,
        )}
        size={taille}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      {/*
        `position="popper"` : le menu se pose SOUS le champ et prend sa largeur, au lieu de se
        superposer à lui en recouvrant l'option courante. C'est ce que fait une liste native sur
        mobile, et c'est ce qu'on attend d'un champ de formulaire.
      */}
      <SelectContent position="popper" align="start" className="min-w-(--radix-select-trigger-width) p-1">
        {options.map((o) => (
          /*
            L'élément est écrit à la main plutôt que repris de shadcn, pour UNE raison : Radix recopie
            le contenu de `ItemText` dans le champ fermé. Une aide placée à l'intérieur s'affichait
            donc AUSSI dans le champ, sur deux lignes, dans une hauteur prévue pour une. L'aide est
            donc posée à côté de `ItemText` : elle vit dans le menu, jamais dans le champ.
          */
          <SelectPrimitive.Item
            key={o.cle}
            value={o.cle}
            disabled={o.desactivee}
            className={cn(
              'relative flex w-full cursor-default flex-col items-start gap-0.5 rounded-md py-1.5 pr-8 pl-2',
              'text-sm outline-hidden select-none',
              'focus:bg-accent focus:text-accent-foreground',
              'data-disabled:pointer-events-none data-disabled:opacity-50',
            )}
          >
            <span className="pointer-events-none absolute top-2 right-2 flex size-4 items-center justify-center">
              <SelectPrimitive.ItemIndicator>
                <CheckIcon className="size-4" />
              </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText>
              <span className="text-[13px] leading-[1.35]">{o.label}</span>
            </SelectPrimitive.ItemText>
            {o.aide ? (
              <span className="text-[11px] leading-[1.4] text-[var(--texte-tertiaire)]">{o.aide}</span>
            ) : null}
          </SelectPrimitive.Item>
        ))}
      </SelectContent>
    </Select>
  )
}
