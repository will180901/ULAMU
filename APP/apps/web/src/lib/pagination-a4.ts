/**
 * Répartir des blocs sur des pages A4 — chantier 141, 16/09/2026.
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
 */
export function repartirEnPages(hauteurs: number[], utile: number): number[][] {
  const pages: number[][] = []
  let courante: number[] = []
  let reste = utile

  hauteurs.forEach((h, i) => {
    // On ne referme jamais une page VIDE : sinon un bloc trop grand créerait une page blanche.
    if (courante.length > 0 && h > reste) {
      pages.push(courante)
      courante = []
      reste = utile
    }
    courante.push(i)
    reste -= h
  })

  if (courante.length > 0) pages.push(courante)
  return pages.length > 0 ? pages : [[]]
}
