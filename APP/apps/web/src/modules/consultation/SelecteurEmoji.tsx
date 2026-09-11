/**
 * Le sélecteur d'emoji — chantier 78, 11/09/2026.
 *
 * ── Ce qu'il est, et ce qu'il n'est pas ────────────────────────────────────────────────────────
 *
 * CMS-SARIS monte le sélecteur de `emoji-mart` : une bibliothèque de 1,6 Mo, son moteur de rendu,
 * son thème à réaccorder, et un composant qui se monte « à la main » dans une `ref` parce qu'il
 * n'est pas écrit pour React 19.
 *
 * Celui-ci fait le même travail en un fichier : les huit catégories, la recherche, la grille. Il
 * n'ajoute **aucune dépendance** et consomme la même table que le rendu des messages — donc les
 * mêmes images, exactement.
 *
 * ⚠️ **Il n'y a pas de teintes de peau.** Le générateur ne garde que la teinte neutre : six
 * variantes par emoji tripleraient la table pour un usage marginal dans un échange de soin. Si le
 * besoin apparaît un jour, c'est le générateur qu'on change, pas cet écran.
 */
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Emoji } from './Emoji'
import { EMOJI_CATEGORIES } from './emoji-donnees'

/**
 * Les emoji récemment choisis, gardés PAR APPAREIL.
 *
 * Un poste partagé d'officine et le portable d'un médecin n'ont pas les mêmes habitudes, et cette
 * préférence n'a aucune raison de voyager jusqu'au serveur : ce n'est pas une donnée de soin.
 */
const CLE_RECENTS = 'ulamu.emoji.recents'
const RECENTS_MAX = 16

function lireRecents(): string[] {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_RECENTS) || '[]')
    return Array.isArray(brut) ? brut.filter((x): x is string => typeof x === 'string').slice(0, RECENTS_MAX) : []
  } catch {
    // Navigation privée, stockage bloqué : on se passe des récents, on ne casse pas le sélecteur.
    return []
  }
}

function noterRecent(natif: string): string[] {
  const liste = [natif, ...lireRecents().filter((e) => e !== natif)].slice(0, RECENTS_MAX)
  try {
    localStorage.setItem(CLE_RECENTS, JSON.stringify(liste))
  } catch {
    /* sans conséquence */
  }
  return liste
}

export function SelecteurEmoji({ onChoisir }: { onChoisir: (natif: string) => void }) {
  const [recherche, setRecherche] = useState('')
  const [recents, setRecents] = useState<string[]>(() => lireRecents())

  /*
    La recherche porte sur le NOM DE CATÉGORIE, pas sur des mots-clés : le générateur ne les garde
    pas — c'est ce qui fait passer la table de 467 Ko à 48. Taper « nature » filtre la catégorie ;
    taper « chat » ne trouve rien.

    C'est un arbitrage assumé : sur un échange de soin, on choisit à l'œil dans une grille, on ne
    cherche pas « visage légèrement souriant ». Si la recherche par mot devient nécessaire, elle
    coûtera les mots-clés — et il faudra le décider en connaissant ce prix.
  */
  const groupes = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    const base = q ? EMOJI_CATEGORIES.filter((c) => c.nom.toLowerCase().includes(q)) : EMOJI_CATEGORIES
    if (recents.length === 0 || q) return base
    return [{ id: 'recents', nom: 'Récemment utilisés', emojis: recents }, ...base]
  }, [recherche, recents])

  const choisir = (natif: string) => {
    setRecents(noterRecent(natif))
    onChoisir(natif)
  }

  return (
    <div className="flex max-h-72 w-full flex-col gap-2">
      <div className="relative">
        <Search
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--texte-tertiaire)]"
        />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Filtrer par catégorie…"
          aria-label="Filtrer les emoji"
          className="pl-8"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {groupes.length === 0 ? (
          <p className="px-1 py-4 text-center ul-aide">Aucune catégorie ne correspond.</p>
        ) : (
          groupes.map((c) => (
            <section key={c.id} aria-label={c.nom}>
              {/* Le nom de catégorie reste visible pendant le défilement : sans lui, on ne sait
                  plus dans quelle famille on est au bout de trois écrans de grille. */}
              <p className="sticky top-0 bg-card py-1 ul-surtitre">{c.nom}</p>
              <div className="grid grid-cols-9 gap-0.5 pb-2">
                {c.emojis.map((natif) => (
                  <button
                    key={`${c.id}-${natif}`}
                    type="button"
                    onClick={() => choisir(natif)}
                    aria-label={natif}
                    className="flex size-8 items-center justify-center rounded-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <Emoji natif={natif} taille={22} />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
