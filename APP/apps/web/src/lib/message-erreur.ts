/**
 * Le message montré quand une requête échoue — chantier 38, 03/09/2026 (dette n°21).
 *
 * ── Ce que ce fichier remplace ────────────────────────────────────────────────────────────────
 *
 * Cette règle était écrite **seize fois**, à l'identique, dans seize fichiers :
 *
 * ```
 * const messageDe = (e: unknown) =>
 *   e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.'
 * ```
 *
 * C'est le motif que le chantier 36 a condamné sur les pluriels, appliqué cette fois à une phrase
 * que l'utilisateur lit dans les pires moments : **une règle recopiée est une règle qui dérive.**
 * Le jour où cette phrase doit changer — une autre langue, un lien vers l'aide, un numéro
 * d'incident — il fallait la retrouver seize fois, et en oublier une suffisait.
 *
 * *(La dette n°21 en annonçait huit. Le balayage en a trouvé seize : je n'avais compté que les
 * écrans d'administration où je l'avais vue. Un compte fait de mémoire n'est pas un compte.)*
 *
 * ── Pourquoi le message du serveur passe AVANT le nôtre ───────────────────────────────────────
 *
 * `ApiError.message` porte la phrase écrite par le serveur — « Ce numéro est déjà utilisé »,
 * « Le délai de dépôt est dépassé ». Elle dit ce qui s'est passé ; notre repli ne dit que « ça n'a
 * pas marché ». On préfère donc toujours la première, et on ne garde la seconde que pour ce qui
 * n'a jamais atteint le serveur : réseau coupé, réponse illisible, panne du navigateur.
 *
 * ── Le repli sur mesure, et pourquoi il existe ────────────────────────────────────────────────
 *
 * Une seule des seize copies disait autre chose : celle de l'onglet « Aide », qui écrit « Votre
 * demande n'a pas pu être envoyée ». C'est plus juste là-bas — l'utilisateur vient d'écrire un
 * texte et veut savoir s'il est parti. **Cette nuance devait survivre au regroupement** : une
 * uniformisation qui écrase une formulation mieux choisie n'est pas un progrès.
 */
import { ApiError } from '@/lib/api'

/** Le repli, quand la requête n'a jamais atteint le serveur. */
export const REPLI_ERREUR = 'Une erreur est survenue. Réessayez dans un moment.'

/**
 * La phrase à montrer pour un échec de requête.
 *
 * ```
 * messageErreur(e)                              →  la phrase du serveur, sinon le repli général
 * messageErreur(e, "Votre demande n'est pas partie.")  →  … sinon CE repli-là
 * ```
 */
export function messageErreur(e: unknown, repli: string = REPLI_ERREUR): string {
  return e instanceof ApiError ? e.message : repli
}
