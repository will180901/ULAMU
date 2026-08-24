/**
 * Décompteur ancré sur la réponse du SERVEUR.
 *
 * RM-06-02 : « Le temps du serveur fait foi ; les horloges clients sont indicatives. » Sur un poste
 * partagé de CSI dont l'horloge peut être fausse de dix minutes, calculer une échéance localement
 * afficherait n'importe quoi. On ne fait donc qu'égrener les secondes ENTRE deux réponses, en
 * repartant de la valeur reçue à chaque relecture.
 *
 * ── Le piège de l'ancre ────────────────────────────────────────────────────────────────────────
 *
 * `recuA` est posé quand le serveur répond, c'est-à-dire APRÈS le premier rendu du composant. Sans
 * précaution, l'écart `maintenant - recuA` est alors NÉGATIF, et le décompteur affiche une seconde
 * de PLUS que ce que le serveur a dit — 15:01 pour 900 secondes. Cosmétique sur cinq minutes, mais
 * c'est exactement ce que la règle interdit : la valeur affichée doit descendre depuis celle du
 * serveur, jamais la dépasser. D'où le plancher à zéro sur l'écart lui-même.
 */
import { useEffect, useState } from 'react'

export function useDecompteurServeur(secondesServeur: number, recuA: number): number {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const ecoule = Math.max(0, Math.floor((maintenant - recuA) / 1000))
  return Math.max(0, secondesServeur - ecoule)
}

/** « 04:00 » — le format d'un compte à rebours, avec les zéros de tête. */
export function mmss(secondes: number): string {
  return `${String(Math.floor(secondes / 60)).padStart(2, '0')}:${String(secondes % 60).padStart(2, '0')}`
}
