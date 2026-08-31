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

/**
 * Densité d'affichage (B3).
 *
 * « Compact rapproche les lignes des tableaux et des listes », dit la maquette — et c'est
 * exactement ce que fait `html[data-densite="compact"]` dans `globals.css`, ni plus ni moins.
 *
 * Le réglage n'a été ajouté qu'à cette condition : un interrupteur qui ne change rien est pire
 * qu'un interrupteur absent. C'est la raison pour laquelle le sélecteur de langue, lui, a été
 * retiré — aucune traduction n'existe derrière.
 */
export type Densite = 'confort' | 'compact'

interface PreferencesState {
  pageAccueil: PageAccueil
  sons: boolean
  densite: Densite
  setPageAccueil: (v: PageAccueil) => void
  setSons: (v: boolean) => void
  setDensite: (v: Densite) => void
}

/** Posée sur `<html>`, comme le thème : tout écran en hérite sans avoir à la connaître. */
function appliquerDensite(d: Densite): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-densite', d)
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      pageAccueil: 'auto',
      sons: true,
      densite: 'confort',
      setPageAccueil: (pageAccueil) => set({ pageAccueil }),
      setSons: (sons) => set({ sons }),
      setDensite: (densite) => {
        appliquerDensite(densite)
        set({ densite })
      },
    }),
    {
      name: 'ulamu-web-preferences',
      // Au retour sur l'application, la densité doit être posée AVANT le premier rendu utile —
      // sinon les listes s'affichent larges puis se resserrent sous les yeux.
      onRehydrateStorage: () => (state) => appliquerDensite(state?.densite ?? 'confort'),
    },
  ),
)
