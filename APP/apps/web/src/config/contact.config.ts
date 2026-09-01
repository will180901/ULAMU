/**
 * Comment joindre l'administration d'ULAMU — une seule source, trois écrans.
 *
 * ── Ce qui était écrit avant, et pourquoi c'était grave ────────────────────────────────────────
 *
 * L'application affichait `support@ulamu.cg`. Le domaine `ulamu.cg` **n'appartient pas au projet** :
 * l'application vit sur `onrender.com`, l'API sur `ulamu-api.onrender.com`. Cette adresse n'était
 * ni achetée, ni relevée — personne, jamais, n'aurait lu ce qu'on y envoyait.
 *
 * Ce n'était pas un détail de façade. Les mentions légales sont **acceptées à l'inscription** :
 * elles valent preuve sous la loi n° 29-2019, et une preuve qui donne une adresse morte expose
 * autant qu'une preuve qui affirme un fait faux. Même famille d'erreur que le « hébergées au
 * Congo-Brazzaville » corrigé le 24/08.
 *
 * ── Ce qui a été décidé (01/09/2026) ───────────────────────────────────────────────────────────
 *
 * Ni acheter un domaine, ni afficher une adresse personnelle : **un formulaire dans l'application**.
 * La demande part vers l'administration, et surtout **la réponse revient au même endroit** — c'est
 * ce qui distingue un formulaire d'un trou noir. Rien à acheter, rien à relever, et le lien de
 * contact des mentions légales devient vrai.
 *
 * Trois écrans y mènent : les mentions légales de B3, « Écrire à l'administration » en C1, et
 * l'onglet Aide lui-même.
 */

/** L'onglet de B3 qui porte le formulaire et l'historique des réponses. */
export const ROUTE_AIDE = '/parametres?section=aide'

/**
 * Le même, avec un sujet pré-choisi. Depuis C1, on sait déjà de quoi il s'agit : le proposer
 * évite à quelqu'un de rechercher sa propre situation dans une liste.
 */
export function routeAide(sujet?: string): string {
  return sujet ? `${ROUTE_AIDE}&sujet=${sujet}` : ROUTE_AIDE
}

/** Le pays que le service dessert — distinct de celui où les données sont hébergées (Allemagne). */
export const PAYS_DE_SERVICE = 'Congo-Brazzaville'
