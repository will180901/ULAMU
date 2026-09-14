/**
 * Les rappels qu'on peut refermer — chantier 110, 14/09/2026.
 *
 * ── Ce que le porteur a demandé, et pourquoi il a raison ──────────────────────────────────────
 *
 * *« Les petites notifications, on ne peut pas les fermer. Il nous faut un système intelligent :
 * une petite croix en haut à droite pour fermer, mais la notification revient pour rappel dans une
 * période si le problème notifié n'est pas encore résolu. »*
 *
 * Un bandeau qu'on ne peut pas fermer finit par ne plus être lu : l'œil apprend sa place et
 * l'évite. *Une alerte permanente n'alerte plus — elle décore.* Mais une alerte qu'on ferme pour de
 * bon ne protège plus personne : le compte-rendu qu'on remet à plus tard gèle des gains réels au
 * bout de vingt-quatre heures.
 *
 * D'où la règle, en une phrase :
 *
 * > **Une notification qui rappelle une TÂCHE revient ; une notification qui constate un FAIT se
 * > ferme pour de bon.**
 *
 * « Compte-rendu à déposer » est une tâche : elle revient. « Cette consultation a été remboursée »
 * est un fait : une fois lu, il est lu.
 *
 * ── ⚠️ Et le retour se resserre à mesure que l'échéance approche ───────────────────────────────
 *
 * Un rappel qui revient toutes les heures est une nuisance à H-20 et une négligence à H-1. Le délai
 * est donc la MOITIÉ du temps restant : fermé à douze heures de l'échéance il revient dans six,
 * fermé à deux heures il revient dans une. *Le rappel se fait d'autant plus présent que le moment
 * de le regretter approche.*
 *
 * ── Où cela vit, et ce que ça vaut ────────────────────────────────────────────────────────────
 *
 * Dans le `localStorage` du poste : c'est une préférence d'affichage, pas une donnée de santé. Elle
 * ne suit donc pas le compte d'un poste à l'autre — et c'est acceptable : *fermer un rappel sur son
 * ordinateur de cabinet ne devrait pas le taire sur son téléphone.*
 *
 * ⚠️ Toute lecture et toute écriture sont gardées : en navigation privée, quota plein ou stockage
 * bloqué, `localStorage` lève. Le repli est le bon sens — **un rappel qu'on n'a pas pu mémoriser
 * revient.** *Entre oublier une alerte et la répéter, on répète.*
 */
import { useCallback, useState } from 'react'

const PREFIXE = 'ulamu.rappel.'

/** Écrit pour un rappel qu'on ne reverra plus : un fait constaté ne se re-constate pas. */
const JAMAIS = 'jamais'

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(PREFIXE + cle)
  } catch {
    return null
  }
}

/** Ce rappel doit-il rester caché à cet instant ? */
export function rappelMasque(cle: string, maintenant: number = Date.now()): boolean {
  const v = lire(cle)
  if (v === null) return false
  if (v === JAMAIS) return true
  const retour = Number(v)
  /* Une valeur illisible (stockage trafiqué, ancienne version) ne doit pas taire l'alerte. */
  return Number.isFinite(retour) && maintenant < retour
}

/**
 * Ferme un rappel. Sans `revientDansS`, il ne revient jamais.
 *
 * On mémorise l'INSTANT DU RETOUR, pas la durée : la durée dépend du temps restant au moment du
 * clic, et ce temps-là continue de fondre. *Une échéance se retient par sa date, jamais par ce
 * qu'il en restait quand on l'a regardée.*
 */
export function masquerRappel(cle: string, revientDansS?: number, maintenant: number = Date.now()): void {
  const valeur = revientDansS === undefined ? JAMAIS : String(maintenant + Math.max(0, revientDansS) * 1000)
  try {
    localStorage.setItem(PREFIXE + cle, valeur)
  } catch {
    /* Navigation privée, quota, stockage bloqué : le rappel réapparaîtra. C'est le bon repli. */
  }
}

/** Remet un rappel à zéro — utile quand la tâche est faite et qu'on veut repartir propre. */
export function oublierRappel(cle: string): void {
  try {
    localStorage.removeItem(PREFIXE + cle)
  } catch {
    /* Rien à faire : au pire le rappel reste caché jusqu'à son heure de retour. */
  }
}

/**
 * Le délai avant qu'un rappel de tâche revienne : la moitié du temps restant.
 *
 * Bornes : jamais moins d'une minute (sinon il reparaît dans la seconde et la croix ne sert à
 * rien), jamais plus de deux heures (au-delà, on l'aurait oublié pour de bon).
 */
export function delaiDeRetour(resteS: number): number {
  if (!Number.isFinite(resteS) || resteS <= 0) return 60
  return Math.min(7200, Math.max(60, Math.floor(resteS / 2)))
}

/**
 * L'état d'un rappel dans un écran.
 *
 * ⚠️ **`masque` est RECALCULÉ à chaque rendu**, jamais figé dans un état. C'est ce qui fait revenir
 * le rappel tout seul quand son heure arrive : l'écran de consultation se redessine chaque seconde
 * pour son décompteur, et la question « est-il encore l'heure de se taire ? » se repose à chaque
 * fois. *Un rappel dont la date de retour dort dans un état ne se réveille qu'au prochain
 * rechargement — c'est-à-dire jamais, sur un écran qu'on garde ouvert une journée.*
 */
export function useRappel(cle: string): { masque: boolean; fermer: (revientDansS?: number) => void } {
  const [, redessiner] = useState(0)
  const fermer = useCallback(
    (revientDansS?: number) => {
      masquerRappel(cle, revientDansS)
      redessiner((n) => n + 1)
    },
    [cle],
  )
  return { masque: rappelMasque(cle), fermer }
}
