/**
 * Session d'authentification — Zustand + persist (sessionStorage, pas localStorage : le jeton ne
 * survit pas à la fermeture de l'onglet, même choix que CMS-SARIS pour son app web).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { configureApi, type MeResponse } from '@/lib/api'

interface SessionState {
  token: string | null
  me: MeResponse | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setSession: (token: string, me: MeResponse) => void
  setMe: (me: MeResponse) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      me: null,
      isAuthenticated: false,
      hasHydrated: false,
      setSession: (token, me) => set({ token, me, isAuthenticated: true }),
      setMe: (me) => set({ me }),
      logout: () => set({ token: null, me: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'ulamu-web-session',
      storage: {
        getItem: (name) => {
          const v = sessionStorage.getItem(name)
          return v ? JSON.parse(v) : null
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      partialize: (state) => ({ token: state.token, me: state.me, isAuthenticated: state.isAuthenticated }) as SessionState,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)

// Branche le client API sur ce store (jeton courant + déconnexion propre sur 401), une seule fois.
configureApi({
  getToken: () => useSessionStore.getState().token,
  onUnauthorized: () => useSessionStore.getState().logout(),
})
