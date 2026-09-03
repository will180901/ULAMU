/**
 * L'échelle d'un axe de graphique — chantier 35, 03/09/2026.
 *
 * Sortie de `CourbeMois.tsx` pour deux raisons : le lint refuse qu'un fichier exporte à la fois des
 * composants et des fonctions (le rechargement à chaud cesse alors de marcher), et surtout **c'est
 * la seule règle calculable d'un graphique**. Le tracé se relit ; une échelle se démontre.
 */
/**
 * L'échelle de l'axe vertical : un PAS entier, et le sommet qu'il atteint.
 *
 * ── Le défaut que la première version avait, et qu'il fallait voir ────────────────────────────
 *
 * Elle choisissait d'abord le sommet, puis le divisait en quatre. Sur six mois à dix consultations,
 * cela graduait **2,5 · 5 · 7,5 · 10** : des demi-consultations, qui n'existent pas. Aucun test ne
 * l'aurait signalé — il fallait regarder l'écran.
 *
 * On choisit donc le **pas d'abord**, sur l'échelle 1 · 2 · 5 × 10ⁿ — celle que tout graphique
 * lisible emploie — en prenant le plus petit qui tienne en cinq intervalles au maximum. Le sommet
 * en découle.
 *
 * ⚠️ **L'ordre de recherche est ce qui fait la différence**, et une première version l'avait faux :
 * elle essayait 25 avant 10, et graduait donc un maximum de 28 en « 0 · 25 · 50 » là où « 0 · 10 ·
 * 20 · 30 » serrait bien mieux les données. Les facteurs 1, 2, 5 multipliés par des puissances de
 * dix croissantes donnent une suite naturellement ordonnée — 1, 2, 5, 10, 20, 50, 100 — et c'est
 * cet ordre qui garantit le pas le plus fin.
 *
 * Quelques cas, pour fixer les idées :
 *
 *   max 1  → pas 1  → 0 · 1
 *   max 3  → pas 1  → 0 · 1 · 2 · 3
 *   max 10 → pas 2  → 0 · 2 · 4 · 6 · 8 · 10
 *   max 28 → pas 10 → 0 · 10 · 20 · 30
 *   max 92 → pas 20 → 0 · 20 · 40 · 60 · 80 · 100
 *
 * *(La maquette gradue ce dernier cas en 25 plutôt qu'en 20. Ses données étaient fabriquées ; les
 * nôtres ne le sont pas, et une échelle qui s'adapte vaut mieux qu'une échelle recopiée.)*
 *
 * ⚠️ Le sommet n'est jamais nul : une division par zéro ferait disparaître la courbe. Un maximum de
 * zéro n'atteint de toute façon jamais ce code — le panneau affiche alors son état vide.
 */
export function echelleMois(maxObserve: number): { sommet: number; pas: number } {
  const max = Number.isFinite(maxObserve) ? Math.max(1, Math.ceil(maxObserve)) : 1
  for (let k = 0; k < 12; k++) {
    for (const facteur of [1, 2, 5]) {
      const pas = facteur * 10 ** k
      if (Math.ceil(max / pas) <= 5) return { sommet: Math.ceil(max / pas) * pas, pas }
    }
  }
  return { sommet: max, pas: max }
}
