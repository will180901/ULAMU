/**
 * « La preuve que tu as fournie est fausse » — et surtout : **ce n'est pas une session morte.**
 *
 * ── Le défaut trouvé le 06/09/2026 (chantier 58) ───────────────────────────────────────────────
 *
 * Les deux clients traitent un `401` sur une requête AUTHENTIFIÉE comme un seul événement : *ton
 * jeton est mort, on te déconnecte*. C'est écrit noir sur blanc dans les deux :
 *
 *   web    `if (res.status === 401 && auth) onUnauthorized?.()`  → `logout('refus-serveur')`
 *   mobile `if (res.status === 401 && auth) this.onUnauthorized?.()` → efface la session
 *
 * Or l'API répondait aussi `401` quand la session était parfaitement valide et que seule la
 * **preuve envoyée dans le corps** était fausse : mot de passe actuel, code TOTP, code de secours,
 * code à usage unique d'une action sensible.
 *
 * ⚠️ **Conséquence : une faute de frappe mettait l'utilisateur dehors.** Sur douze routes, dont
 * les pires moments possibles pour être déconnecté :
 *
 *   - « Changer mon mot de passe » — on le fait précisément quand on craint que quelqu'un d'autre
 *     connaisse le sien ; se retrouver déconnecté est l'inverse exact du but recherché ;
 *   - l'exécution d'un **retrait d'argent**, où la personne se retrouve dehors, sans savoir si le
 *     virement est parti ;
 *   - la signature du contrat d'un soignant.
 *
 * ── Pourquoi la correction est ici, au serveur, et pas dans les clients ────────────────────────
 *
 * Le fil est déjà passé : la réponse ne transporte aucun code machine (il n'y a pas de filtre
 * d'exception, donc le corps est celui de Nest — `statusCode`, `message`, `error`). Un client ne
 * peut donc PAS distinguer les deux sortes de 401 sans lire le message français, ce qui dériverait
 * à la première reformulation.
 *
 * Et surtout : **l'application mobile est installée sur des téléphones.** Une correction côté
 * client n'atteindrait ses utilisateurs qu'après une mise à jour qu'ils feront peut-être un jour ;
 * une correction côté serveur les protège tous à la seconde du déploiement, y compris ceux qui
 * gardent la version d'aujourd'hui.
 *
 * ── Pourquoi 403 ──────────────────────────────────────────────────────────────────────────────
 *
 * `401` = « je ne sais pas qui tu es » ; `403` = « je sais qui tu es, et ce que tu demandes là ne
 * passe pas ». Ici on sait exactement qui parle — la garde l'a établi avant d'entrer. Aucun des
 * deux clients ne branche sur `403` : il devient un message d'erreur affiché, ce que ces écrans
 * savent déjà faire. Le message, lui, ne change pas d'un mot.
 *
 * **La règle en une phrase, désormais vraie de bout en bout : sur une route qui exige une session,
 * `401` veut dire « ta session est morte » — jamais autre chose.** Une route qui OUVRE une session
 * (connexion, inscription, mot de passe oublié) continue de répondre `401` : là, l'identifiant
 * refusé est bien un échec d'authentification, et aucun client n'y est connecté pour être déconnecté.
 */
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

export class ProofRefusedException extends ForbiddenException {}

/**
 * Retraduit un refus de preuve venu d'un code partagé.
 *
 * `consumeOtpOrThrow` sert LES DEUX mondes : l'inscription et « mot de passe oublié » (sans
 * session, où 401 est juste) comme le changement de téléphone ou un retrait (avec session, où il
 * est faux). Le sens ne dépend donc pas du code à usage unique, mais de l'endroit d'où on l'appelle
 * — et c'est l'appelant, lui, qui le sait.
 *
 * On ne masque rien : même message, même cause, seul le statut cesse de mentir.
 */
export async function preuveEnSession<T>(travail: () => Promise<T>): Promise<T> {
  try {
    return await travail();
  } catch (e) {
    if (e instanceof UnauthorizedException) {
      throw new ProofRefusedException(e.message);
    }
    throw e;
  }
}
