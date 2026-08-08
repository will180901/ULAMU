/**
 * Vide l'écran après 30 minutes d'inactivité — ENF-07 / CU-01-03.
 *
 * ⚠️ Ce n'est PAS une mesure de sécurité : la garde serveur (`auth.guard.ts`, `WEB_IDLE_SECONDS`)
 * refuse déjà toute requête dont la session dort depuis plus de 30 minutes, et c'est elle seule qui
 * protège les données. Un minuteur dans un navigateur se contourne en une ligne de console.
 *
 * Ce que ce hook protège, c'est **l'écran**. Sans lui, un poste d'officine laissé sans surveillance
 * continue d'AFFICHER un dossier patient indéfiniment : la session est morte côté serveur, mais le
 * dernier rendu reste à l'écran jusqu'au prochain clic. Le contenu médical est là, lisible par
 * n'importe qui passant derrière le comptoir. On vide donc l'interface au même instant que le
 * serveur ferme la session — les deux horloges disent la même chose.
 *
 * Un seul `setTimeout` réarmé sur activité, jamais d'intervalle qui tourne : réveiller le processeur
 * chaque seconde pour surveiller une inactivité serait une contradiction.
 */
import { useEffect } from 'react'
import { useSessionStore } from './session.store'

/** Miroir exact de `WEB_IDLE_SECONDS` (auth.guard.ts). Les deux valeurs DOIVENT rester égales. */
export const DELAI_INACTIVITE_MS = 30 * 60 * 1000

/** Gestes qui prouvent une présence humaine. Le défilement et le toucher comptent autant qu'un clic. */
const EVENEMENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function useIdleLogout(actif: boolean): void {
  useEffect(() => {
    if (!actif) return

    let minuteur: ReturnType<typeof setTimeout>

    const rearmer = () => {
      clearTimeout(minuteur)
      minuteur = setTimeout(() => {
        useSessionStore.getState().logout('expiration')
      }, DELAI_INACTIVITE_MS)
    }

    // `passive` : ces écouteurs ne préviennent jamais le comportement par défaut, l'annoncer évite
    // au navigateur de retarder le défilement en les attendant.
    EVENEMENTS.forEach((e) => window.addEventListener(e, rearmer, { passive: true }))
    // Revenir sur l'onglet est aussi un signe de présence — sans quoi une longue lecture sur un
    // autre onglet déconnecterait au retour, alors que la personne n'est jamais partie.
    document.addEventListener('visibilitychange', rearmer)
    rearmer()

    return () => {
      clearTimeout(minuteur)
      EVENEMENTS.forEach((e) => window.removeEventListener(e, rearmer))
      document.removeEventListener('visibilitychange', rearmer)
    }
  }, [actif])
}
