/**
 * Palette de commandes (Ctrl/⌘ K) — la contrepartie fonctionnelle de la recherche exigée par CG-06 §02.
 *
 * Pourquoi une palette plutôt qu'un champ de recherche : à ce stade il n'existe aucun index de
 * patients ni d'ordonnances à interroger. Poser une loupe qui ne trouve rien serait une promesse
 * fausse — le pire défaut d'interface. La palette, elle, cherche dans ce qui EXISTE : les
 * destinations autorisées pour le rôle connecté. Elle rend donc un service réel dès aujourd'hui, et
 * accueillera les patients et documents quand les phases 2 à 4 les auront apportés.
 *
 * Elle ne montre jamais qu'une destination interdite existe : sa source est `useNavigation()`, déjà
 * filtrée par capacité. Une palette qui révélerait « Vérification des dossiers » à un pharmacien
 * serait une fuite d'information sur la structure interne du produit.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CornerDownLeft, Search } from 'lucide-react'
import { useNavigation } from '@/hooks/useNavigation'

/** Insensible à la casse ET aux accents : « parametres » doit trouver « Paramètres ».
 *  Les diacritiques sont désignés par leur plage Unicode échappée, jamais collés en littéral — un
 *  caractère combinant invisible dans le source est un piège pour la prochaine personne qui l'édite. */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
function fold(s: string): string {
  return s.normalize('NFD').replace(DIACRITICS, '').toLowerCase()
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = useNavigation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const all = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label ?? '' })))
    const q = fold(query.trim())
    if (!q) return all
    return all.filter((i) => fold(i.label).includes(q) || fold(i.group).includes(q))
  }, [groups, query])

  // Réinitialiser à chaque ouverture : rouvrir sur la recherche précédente est déroutant.
  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      inputRef.current?.focus()
    }
  }, [open])

  // La sélection ne doit jamais pointer hors de la liste après un filtrage.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, results.length - 1)))
  }, [results.length])

  // Garde l'élément sélectionné visible quand on descend au clavier.
  useEffect(() => {
    listRef.current?.querySelectorAll('[data-row]')[index]?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  const go = (href?: string) => {
    if (href) navigate(href)
    onClose()
  }

  return (
    <div
      className="ul-scrim"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche et navigation rapide"
        className="ul-palette"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex((i) => (i + 1) % Math.max(1, results.length))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex((i) => (i - 1 + results.length) % Math.max(1, results.length))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            go(results[index]?.href)
          }
        }}
      >
        <div className="ul-palette__field">
          <Search size={16} aria-hidden="true" style={{ color: 'var(--texte-tertiaire)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aller à…"
            aria-label="Rechercher une destination"
            aria-controls="ul-palette-list"
            className="ul-palette__input"
          />
          <kbd className="ul-kbd">Échap</kbd>
        </div>

        <div className="ul-palette__list" id="ul-palette-list" ref={listRef} role="listbox" aria-label="Résultats">
          {results.length === 0 ? (
            <p className="t-text-sm" style={{ color: 'var(--texte-tertiaire)', padding: 'var(--espace-4)', textAlign: 'center', margin: 0 }}>
              Aucune destination ne correspond à « {query} ».
            </p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.key}
                data-row
                type="button"
                role="option"
                aria-selected={i === index}
                onPointerEnter={() => setIndex(i)}
                onClick={() => go(item.href)}
                className={['ul-palette__row', i === index ? 'is-active' : ''].filter(Boolean).join(' ')}
              >
                <item.icon size={16} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--texte-tertiaire)' }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.group ? <span className="ul-palette__group">{item.group}</span> : null}
                {i === index ? <CornerDownLeft size={13} aria-hidden="true" style={{ color: 'var(--texte-tertiaire)' }} /> : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
