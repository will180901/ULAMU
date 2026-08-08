/**
 * Session d'authentification — Zustand + persist (sessionStorage, pas localStorage : le jeton ne
 * survit pas à la fermeture de l'onglet, même choix que CMS-SARIS pour son app web).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { configureApi, type MeResponse } from '@/lib/api'

/**
 * Pourquoi la session s'est terminée. Sert uniquement à EXPLIQUER l'écran de connexion : se
 * retrouver déconnecté sans un mot donne l'impression d'un bogue, et pousse à croire l'application
 * peu fiable alors qu'elle vient précisément de protéger le compte.
 */
export type MotifDeconnexion = 'volontaire' | 'expiration' | 'refus-serveur'

interface SessionState {
  token: string | null
  me: MeResponse | null
  isAuthenticated: boolean
  hasHydrated: boolean
  /** Non persisté : l'explication ne concerne que la transition en cours. */
  motif: MotifDeconnexion | null
  setSession: (token: string, me: MeResponse) => void
  setMe: (me: MeResponse) => void
  logout: (motif?: MotifDeconnexion) => void
  setHasHydrated: (v: boolean) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      me: null,
      isAuthenticated: false,
      hasHydrated: false,
      motif: null,
      setSession: (token, me) => set({ token, me, isAuthenticated: true, motif: null }),
      setMe: (me) => set({ me }),
      logout: (motif = 'volontaire') => set({ token: null, me: null, isAuthenticated: false, motif }),
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
  // Un 401 sur une requête authentifiée signifie presque toujours que la garde serveur a jugé la
  // session inactive depuis plus de 30 min (auth.guard.ts, ENF-07). On le dit au lieu de déconnecter
  // en silence.
  onUnauthorized: () => useSessionStore.getState().logout('refus-serveur'),
})
