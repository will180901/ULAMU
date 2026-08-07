/**
 * État de la coquille — réduction de la barre latérale et ouverture mobile.
 *
 * Deux états séparés, et non un seul « ouvert/fermé » : sur grand écran on choisit entre 240px et
 * 56px (CG-06 §01), sur mobile la barre est hors écran et se superpose. Les confondre donnerait une
 * barre réduite qui s'ouvre en overlay, ou une barre mobile qui laisse une marge de 56px à gauche.
 *
 * `collapsed` est persisté (préférence de travail, comme le thème) ; `mobileOpen` ne l'est pas — on
 * ne rouvre pas un panneau de navigation au rechargement d'une page.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: 'ulamu-web-ui',
      partialize: (s) => ({ collapsed: s.collapsed }) as UiState,
    },
  ),
)
