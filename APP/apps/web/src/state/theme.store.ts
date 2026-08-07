/**
 * Thème clair / sombre.
 *
 * `globals.css` porte depuis toujours un bloc `.dark` complet — couleurs recalculées (pas simplement
 * éclaircies), ombres désactivées, verre dépoli réaccordé — mais **rien ne posait jamais la classe**.
 * Tout ce travail était donc inerte. Ce store est le chaînon manquant.
 *
 * Trois choix assumés :
 *  • `system` est le défaut : on suit la préférence du système d'exploitation tant que l'utilisateur
 *    n'a pas tranché lui-même. Choisir à sa place dès la première visite est présomptueux.
 *  • Persistance en **localStorage**, contrairement au jeton de session qui vit en sessionStorage :
 *    une préférence d'affichage doit survivre à la fermeture de l'onglet, un jeton d'accès non.
 *  • La classe est posée sur `<html>` et non sur `<body>` : les portails (menus, dialogues) sont
 *    montés hors du body dans certains cas, et hériteraient sinon du mauvais thème.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const MEDIA = '(prefers-color-scheme: dark)'

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(MEDIA).matches ? 'dark' : 'light'
}

export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemTheme() : choice
}

/** Pose la classe sur <html> et tient `color-scheme` à jour (barres de défilement, champs natifs). */
function applyTheme(choice: ThemeChoice): void {
  if (typeof document === 'undefined') return
  const resolved = resolveTheme(choice)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

interface ThemeState {
  choice: ThemeChoice
  setTheme: (c: ThemeChoice) => void
  /** Bascule directe clair ↔ sombre, en partant du thème RÉELLEMENT affiché. */
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      choice: 'system',
      setTheme: (choice) => {
        applyTheme(choice)
        set({ choice })
      },
      toggle: () => {
        // On part du thème résolu, pas du choix : depuis `system`, la bascule doit faire l'inverse de
        // ce que l'utilisateur a SOUS LES YEUX, pas l'inverse d'une abstraction.
        const next: ThemeChoice = resolveTheme(get().choice) === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ choice: next })
      },
    }),
    {
      name: 'ulamu-web-theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.choice ?? 'system')
      },
    },
  ),
)

/**
 * Suit les changements de préférence système tant que l'utilisateur est en mode `system`.
 * Appelé une fois au démarrage ; renvoie la fonction de désabonnement.
 */
export function watchSystemTheme(): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(MEDIA)
  const onChange = () => {
    if (useThemeStore.getState().choice === 'system') applyTheme('system')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

// Application immédiate au chargement du module : évite le flash de thème clair avant l'hydratation
// du store persisté.
applyTheme(
  (() => {
    try {
      const raw = localStorage.getItem('ulamu-web-theme')
      return raw ? ((JSON.parse(raw)?.state?.choice as ThemeChoice) ?? 'system') : 'system'
    } catch {
      return 'system'
    }
  })(),
)
