/**
 * L'état d'écran qui SURVIT à la navigation — chantier 94, 11/09/2026.
 *
 * Demande du porteur : *« on doit aussi avoir en mémoire l'état des pages pendant qu'on navigue
 * entre les pages, comme avec le projet CMS »*. Le motif y est éprouvé (`usePersistedState` +
 * `viewState.store`) ; on le reprend, avec sa mise en garde.
 *
 * ── Comment s'en servir ───────────────────────────────────────────────────────────────────────
 *
 *   // avant : const [page, setPage] = useState(1)
 *   const [page, setPage] = useEtatPersistant('consultations', 'page', 1)
 *
 * Même signature que `useState`, même valeur de retour. La valeur est rangée par ÉCRAN et par CLÉ
 * dans le stockage de session — elle survit à un changement de page et à un rechargement d'onglet,
 * et disparaît quand l'onglet se ferme.
 *
 * ── ⚠️ Ce qu'on n'y met JAMAIS ────────────────────────────────────────────────────────────────
 *
 * **Ni brouillon, ni fenêtre modale, ni décision en cours.** Un compte-rendu à moitié écrit, une
 * boîte d'annulation ouverte, un formulaire d'ordonnance en cours de saisie : tout cela DOIT
 * repartir à zéro.
 *
 * *Rouvrir un écran et y trouver une décision en suspens qu'on ne se souvient pas d'avoir
 * commencée est pire que de tout retaper — sur un écran de soin, c'est une confirmation qu'on
 * donne sans l'avoir voulue.*
 *
 * Ce qui a sa place ici : une page de tableau, un onglet, un filtre, une recherche, une sélection.
 * Ce qu'on **retrouve** avec plaisir, jamais ce qu'on **déclenche** par surprise.
 */
import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { create } from 'zustand'

/** `sessionStorage` et non `localStorage` : le contexte de navigation meurt avec l'onglet. */
const CLE = 'ulamu.etat-des-pages'

type Pages = Record<string, Record<string, unknown>>

function lire(): Pages {
  try {
    const brut = sessionStorage.getItem(CLE)
    return brut ? (JSON.parse(brut) as Pages) : {}
  } catch {
    // Navigation privée, stockage bloqué : on se passe de la mémoire, on ne casse pas l'écran.
    return {}
  }
}

function ecrire(pages: Pages): void {
  try {
    sessionStorage.setItem(CLE, JSON.stringify(pages))
  } catch {
    /* sans conséquence */
  }
}

interface EtatDesPages {
  pages: Pages
  poser: (ecran: string, cle: string, valeur: unknown) => void
  oublier: (ecran: string) => void
}

export const useEtatDesPages = create<EtatDesPages>()((set) => ({
  pages: lire(),
  poser: (ecran, cle, valeur) =>
    set((e) => {
      const pages = { ...e.pages, [ecran]: { ...(e.pages[ecran] ?? {}), [cle]: valeur } }
      ecrire(pages)
      return { pages }
    }),
  /** Oublier un écran entier — pour le jour où un écran veut repartir propre. */
  oublier: (ecran) =>
    set((e) => {
      const pages = { ...e.pages }
      delete pages[ecran]
      ecrire(pages)
      return { pages }
    }),
}))

export function useEtatPersistant<T>(ecran: string, cle: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const range = useEtatDesPages((e) => e.pages[ecran]?.[cle]) as T | undefined
  const poser = useEtatDesPages((e) => e.poser)

  const valeur = range !== undefined ? range : initial

  const definir = useCallback<Dispatch<SetStateAction<T>>>(
    (v) => {
      /*
        On relit la valeur LA PLUS À JOUR dans le magasin plutôt que de fermer sur `valeur` : deux
        mises à jour enchaînées — `setPage(p => p + 1)` deux fois — perdraient la première sinon.
      */
      const courante = useEtatDesPages.getState().pages[ecran]?.[cle]
      const avant = (courante === undefined ? initial : courante) as T
      poser(ecran, cle, typeof v === 'function' ? (v as (p: T) => T)(avant) : v)
    },
    [ecran, cle, initial, poser],
  )

  return [valeur, definir]
}
