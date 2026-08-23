/**
 * Préférences d'affichage — page d'accueil et sons d'interface.
 *
 * Elles vivent dans le navigateur, comme le thème et la barre latérale, et pour la même raison : le
 * serveur n'a aucune table pour les accueillir, et en inventer une pour un réglage de confort serait
 * disproportionné.
 *
 * ⚠️ **La maquette écrit « ces réglages suivent votre compte, quel que soit le poste utilisé ».**
 * C'est faux tant que rien n'est stocké côté serveur, et un poste d'officine est justement partagé.
 * L'écran dit donc la vérité : « ces réglages restent sur cet appareil ». L'écart est au §9 du plan.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** `auto` = le poste de travail de la fonction, décidé par `ESPACE_PAR_ROLE`. */
export type PageAccueil = 'auto' | string

interface PreferencesState {
  pageAccueil: PageAccueil
  sons: boolean
  setPageAccueil: (v: PageAccueil) => void
  setSons: (v: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      pageAccueil: 'auto',
      sons: true,
      setPageAccueil: (pageAccueil) => set({ pageAccueil }),
      setSons: (sons) => set({ sons }),
    }),
    { name: 'ulamu-web-preferences' },
  ),
)
