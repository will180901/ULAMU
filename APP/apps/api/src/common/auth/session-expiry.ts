/**
 * L'expiration d'une session de connexion — chantier 53, 06/09/2026.
 *
 * ── Pourquoi cette règle sort de la garde ─────────────────────────────────────────────────────
 *
 * Elle vivait dans `AuthGuard`, en ligne, et n'était donc appliquée qu'au moment où quelqu'un
 * **utilisait** un jeton : la garde constatait l'inactivité, révoquait, et refusait. C'est correct
 * pour la sécurité — un jeton volé cesse de servir — mais cela laisse en base des sessions
 * « non révoquées » qui ne peuvent plus rien.
 *
 * ⚠️ **Et l'écran « Mes appareils » les affichait comme actives.** Mesuré en production le
 * 06/09/2026 : **28 sessions listées, 26 déjà mortes** — dont dix-huit sur un seul compte, toutes
 * inutilisables. Un écran de sécurité qui montre dix-huit appareils dont aucun n'a accès ne
 * protège plus personne : la seule session réellement suspecte y serait invisible, et l'utilisateur
 * qui « fait le ménage » clique dans un tas de cadavres — le bouton de révocation n'ayant, lui,
 * aucune confirmation.
 *
 * La règle est donc écrite ici, une fois, et lue des deux côtés : la garde qui refuse, et la liste
 * qui montre.
 */

/**
 * Inactivité maximale d'une session web, en secondes (ENF-07).
 *
 * Ce n'est pas un PM-xx et ce n'est pas un oubli : le web est un navigateur, souvent partagé ou
 * laissé ouvert, et ENF-07 fixe cette durée comme une exigence non fonctionnelle du produit — pas
 * comme un réglage d'exploitation. Le mobile, lui, a PM-20 : c'est un appareil personnel, et sa
 * durée se règle.
 */
export const WEB_IDLE_SECONDS = 30 * 60;

/**
 * Combien de temps d'inactivité ce client tolère.
 *
 * `pm20Seconds` est injecté par l'appelant, jamais lu ici : la règle reste pure, et le paramètre
 * reste ce qu'il est — une valeur de base que le super-administrateur peut changer.
 */
export function idleLimitSeconds(client: string, pm20Seconds: number): number {
  return client === "web" ? WEB_IDLE_SECONDS : pm20Seconds;
}

/**
 * Cette session est-elle morte d'inactivité ?
 *
 * La comparaison est STRICTE (`>`), exactement comme la garde le faisait : à la seconde pile, la
 * session vit encore. Changer cela révoquerait, sur un compte peu actif, une session que la garde
 * aurait laissée passer — et les deux doivent dire la même chose.
 */
export function sessionIsExpired(client: string, lastActiveAtMs: number, nowMs: number, pm20Seconds: number): boolean {
  return (nowMs - lastActiveAtMs) / 1000 > idleLimitSeconds(client, pm20Seconds);
}
