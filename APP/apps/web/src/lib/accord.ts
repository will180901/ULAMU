/**
 * L'accord en nombre — chantier 36, 03/09/2026.
 *
 * ── Ce qui l'a rendu nécessaire ───────────────────────────────────────────────────────────────
 *
 * Le tableau de bord d'un soignant à une seule consultation affichait, en ligne :
 * « **1 consultations au total** ». Un balayage a montré que ce n'était pas un cas isolé — douze
 * chaînes de l'application écrivaient un nombre suivi d'un mot invariablement au pluriel :
 * « 1 ordonnances », « 1 médicaments », « 1 pages », « 0 retirables ».
 *
 * Le bon motif existait pourtant déjà dans le dépôt — `${n} code${n > 1 ? 's' : ''}` — mais recopié
 * à la main, donc appliqué de façon inégale. **Une règle qu'on recopie est une règle qu'on oublie.**
 *
 * ── La règle française, qui n'est pas la règle anglaise ───────────────────────────────────────
 *
 * En français, **zéro prend le singulier** : « 0 consultation », et non « 0 consultations ». C'est
 * l'usage de l'Académie, et c'est ce que fait déjà le reste du dépôt avec son `> 1`.
 *
 * Un anglophone écrirait `n === 1 ? '' : 's'` — correct en anglais (« 0 items »), faux ici. Le test
 * verrouille ce seuil : c'est le genre de détail qu'une bibliothèque d'internationalisation
 * « corrigerait » dans le mauvais sens.
 *
 * ── Le seuil est 2, et non « plus grand que 1 » ───────────────────────────────────────────────
 *
 * La première version de cette fonction testait `> 1`, comme le motif déjà présent dans le dépôt.
 * Sur des entiers, les deux donnent le même résultat — et c'est pourquoi personne ne l'aurait vu.
 *
 * Le test des décimales a tranché : **« 1,5 heure » reste au singulier**, le pluriel commençant à
 * deux. `> 1` accordait « 1,5 heures ». Le délai d'une session ou une durée d'offre peuvent tomber
 * sur une décimale ; le seuil est donc `>= 2`.
 *
 * ── Les négatifs comptent en valeur absolue ───────────────────────────────────────────────────
 *
 * Le tableau de bord affiche des tendances (« −1 par rapport au mois dernier »). « −1 consultation »
 * est au singulier, « −3 consultations » au pluriel : c'est la quantité qui accorde, pas le signe.
 */

/**
 * Le mot accordé au nombre — sans le nombre.
 *
 * ```
 * `${n} ${accord(n, 'consultation')} au total`   →  « 1 consultation au total »
 * `${n} ${accord(n, 'ordonnance')}`              →  « 3 ordonnances »
 * `${n} ${accord(n, 'cheval', 'chevaux')}`       →  pour les pluriels irréguliers
 * ```
 *
 * Le nombre reste à l'appelant : il est souvent formaté à part (`xaf()`, un arrondi, un signe), et
 * une fonction qui le reprendrait obligerait à défaire ce formatage pour le refaire.
 */
export function accord(n: number, singulier: string, pluriel?: string): string {
  return Math.abs(n) >= 2 ? (pluriel ?? `${singulier}s`) : singulier
}
