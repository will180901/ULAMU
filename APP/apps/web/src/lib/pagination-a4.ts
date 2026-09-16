/**
 * Répartir des blocs sur des pages A4 — chantier 141, étendu au chantier 143 (16/09/2026).
 *
 * ── Pourquoi cette fonction vit ICI, et pas dans le gabarit ───────────────────────────────────
 *
 * C'est de l'arithmétique pure : une liste de hauteurs, une hauteur utile, des paquets. Elle n'a
 * besoin ni de React ni du DOM — et c'est précisément ce qui la rend éprouvable. *La MESURE demande
 * un vrai moteur de rendu ; la RÉPARTITION ne demande qu'une addition. On éprouve ce qui se calcule,
 * et on ancre ce qui se mesure.*
 *
 * Même raison que `lib/contrat.ts` : sortie du composant, elle se garde vraiment.
 */

/**
 * Répartit des blocs, de hauteurs connues, dans des pages d'une hauteur utile donnée.
 *
 * ⚠️ **Un bloc plus haut qu'une page prend sa page à lui seul**, et déborde. C'est délibéré : le
 * refuser le ferait disparaître — une clause de contrat, une ligne d'ordonnance.
 *
 * > **Un débordement se voit et se corrige ; une disparition, non.**
 *
 * 📌 **Rien ne se perd et rien ne se duplique** : la concaténation des pages rend exactement la
 * suite des indices d'entrée, dans l'ordre. C'est la propriété qui compte le plus — *une
 * répartition qui perd un bloc fait disparaître une clause d'un contrat signé, et personne ne s'en
 * apercevrait avant le jour du litige.*
 *
 * ── Les GROUPES, et l'en-tête qu'ils emportent — chantier 143 ─────────────────────────────────
 *
 * Un tableau de médicaments est une suite de lignes qui partagent un en-tête de colonnes. Le couper
 * entre deux pages n'a de sens que si **cet en-tête repart en haut de la page suivante** : *une
 * colonne de chiffres sans son titre n'est plus une colonne, c'est une liste de nombres.*
 *
 * `groupes[i]` dit à quel groupe appartient le bloc `i` (`null` = il est seul de son espèce), et
 * `hauteursEntetes[g]` dit ce que coûte l'en-tête du groupe `g`. Ce coût est **payé à chaque fois
 * que le groupe reprend en haut d'une page** — c'est-à-dire exactement quand l'en-tête est réimprimé.
 */
export function repartirEnPages(
  hauteurs: number[],
  utile: number,
  groupes?: Array<number | null>,
  hauteursEntetes?: Record<number, number>,
): number[][] {
  const pages: number[][] = []
  let courante: number[] = []
  let reste = utile
  /** Le groupe dont l'en-tête est déjà payé sur la page en cours. */
  let entetePayee: number | null = null

  const coutEntete = (g: number | null) =>
    g !== null && g !== entetePayee ? (hauteursEntetes?.[g] ?? 0) : 0

  hauteurs.forEach((h, i) => {
    const g = groupes?.[i] ?? null

    // On ne referme jamais une page VIDE : sinon un bloc trop grand créerait une page blanche.
    if (courante.length > 0 && h + coutEntete(g) > reste) {
      pages.push(courante)
      courante = []
      reste = utile
      entetePayee = null
    }

    reste -= h + coutEntete(g)
    if (g !== null) entetePayee = g
    courante.push(i)
  })

  if (courante.length > 0) pages.push(courante)
  return pages.length > 0 ? pages : [[]]
}
