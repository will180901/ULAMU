/**
 * La géométrie de l'onde d'une note vocale — SOURCE DE VÉRITÉ.
 *
 * ⚠️ Ce fichier est VENDORÉ. La source est `packages/shared/src/onde-vocale.ts` ; les copies sont
 * `apps/web/src/modules/consultation/onde-vocale.ts` et `apps/mobile/src/lib/onde-vocale.ts`.
 * Toute correction se fait dans la SOURCE, puis se recopie — jamais l'inverse.
 *
 * ── Pourquoi cette règle est partagée ─────────────────────────────────────────────────────────
 *
 * Le porteur veut le même lecteur des deux côtés d'une conversation. Si le web et le mobile ne
 * calculaient pas la même onde, la MÊME note vocale n'aurait pas le même dessin chez le patient et
 * chez le soignant — et la première remarque serait « ce n'est pas la même application ». C'est la
 * leçon du chantier 84 : *deux endroits qui calculent la même chose finissent toujours par ne plus
 * dire la même chose.*
 *
 * ── ⚠️ Le défaut que ce fichier corrige (chantier 96) ─────────────────────────────────────────
 *
 * Les deux applications dessinaient **36 barres, quoi qu'il arrive**. Or chaque barre coûte
 * `LARGEUR_BARRE + ECART_BARRE` = 5 px : trente-six barres réclament **178 px**.
 *
 *   • sur le WEB, dans une colonne de fil étroite, l'onde recevait **70 px** — de quoi loger les
 *     trente-cinq écarts et rien d'autre. Les barres tombaient à **0 px** : plus d'onde du tout.
 *   • sur le MOBILE, la rangée fait 244 px de large, dont **128 px** pour l'onde. Les barres y
 *     mesuraient **1,6 px** au lieu des 3 px annoncés en tête du lecteur — un trait fin, pas une
 *     onde.
 *
 * *Une densité relevée sur un écran n'est pas une densité : c'est un nombre de barres ET une
 * largeur. Reprendre le nombre sans la largeur, c'est reprendre la moitié de la mesure.*
 *
 * La règle tient donc en une phrase : **chaque barre gardée a ses 3 px**, sur les deux écrans.
 */

/** Le PLAFOND de barres — la densité de la maquette, atteinte dès qu'il y a la place. */
export const BARRES_MAX = 36

/** La géométrie d'une barre, en pixels. Les deux applications la dessinent à l'identique. */
export const LARGEUR_BARRE = 3
export const ECART_BARRE = 2

/**
 * Combien de barres tiennent dans `largeur`, sans jamais dépasser le plafond.
 *
 * **Largeur inconnue** (premier rendu, mise en page pas encore mesurée) : on rend l'onde complète.
 * *Une onde complète qui rétrécit ensuite se remarque à peine ; un trait qui s'épaissit se voit.*
 *
 * ⚠️ **Il n'y a volontairement PAS de plancher.** Le premier jet en posait un à huit barres — *« en
 * dessous ce n'est plus une onde, c'est un pointillé »*. C'est une jolie phrase et une règle
 * intenable : huit barres réclament 38 px, et sous 38 px elles seraient redevenues invisibles,
 * c'est-à-dire exactement le défaut qu'on corrige. *Un plancher qui ne tient pas sous le plancher
 * n'est pas un plancher — mieux vaut quatre barres qu'on voit que huit qu'on ne voit pas.*
 */
export function barresQuiTiennent(largeur: number): number {
  if (!(largeur > 0)) return BARRES_MAX
  const tiennent = Math.floor((largeur + ECART_BARRE) / (LARGEUR_BARRE + ECART_BARRE))
  return Math.max(1, Math.min(BARRES_MAX, tiennent))
}

/**
 * Les hauteurs ramenées à `combien` valeurs, en MOYENNANT chaque tranche.
 *
 * ⚠️ Moyenner, et non échantillonner. En prenant une valeur sur quatre, un éclat bref entre deux
 * silences — un « oui », une inspiration — sortirait ou rentrerait dans le dessin selon la largeur
 * disponible. *L'onde changerait de forme avec la place, et ne dirait plus la même chose du même
 * son.*
 */
export function ramenerHauteurs(hauteurs: number[], combien: number): number[] {
  if (combien >= hauteurs.length) return hauteurs
  const sortie: number[] = []
  for (let i = 0; i < combien; i += 1) {
    const debut = Math.floor((i * hauteurs.length) / combien)
    const fin = Math.max(debut + 1, Math.floor(((i + 1) * hauteurs.length) / combien))
    let somme = 0
    for (let k = debut; k < fin; k += 1) somme += hauteurs[k]
    sortie.push(somme / (fin - debut))
  }
  return sortie
}

/**
 * La durée d'une note, dite « m:ss ».
 *
 * ⚠️ **On ARRONDIT, on ne tronque pas** — et ce détail a fait diverger les deux applications :
 * pour un même fichier de 76,7 s, le mobile affichait `1:17` (arrondi) et le web `1:16` (tronqué).
 * Une seconde d'écart sur la même note, entre le patient et le soignant.
 */
export function formatDureeVocale(secondes: number): string {
  const s = Math.max(0, Math.round(secondes))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
