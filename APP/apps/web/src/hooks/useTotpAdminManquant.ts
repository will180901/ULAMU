import { useSessionStore } from '@/state/session.store'

/**
 * Ce compte va-t-il se faire refuser toute lecture d'administration ?
 *
 * ── Pourquoi on ne lit PAS le message du serveur ──────────────────────────────────────────────
 *
 * La garde répond `403` avec « TOTP obligatoire pour les actions admin (RM-01-06) », et `ApiError`
 * porte ce texte jusqu'ici : reconnaître le refus par une expression régulière sur le message
 * serait donc possible, et c'est la première idée qui vient.
 *
 * C'est aussi la mauvaise. Un message d'erreur est de la PROSE : il se reformule un jour sans que
 * personne n'y voie un contrat, et le jour où « TOTP » devient « double authentification » dans la
 * réponse du serveur, l'écran cesse silencieusement de proposer la sortie — le défaut exact qu'on
 * répare ici reviendrait, sans qu'aucun test ne tombe.
 *
 * Or la condition est connue AVANT tout appel : `me.totpEnabled`. On la lit là.
 *
 * ── Et si l'échec venait d'ailleurs ? ─────────────────────────────────────────────────────────
 *
 * Un compte d'administration sans TOTP peut aussi échouer sur une panne réseau. Proposer quand même
 * l'activation reste juste : la lecture ne réussira de toute façon pas tant que le TOTP est éteint.
 * L'inverse — garder « Réessayer » — propose un geste dont on SAIT qu'il ne peut pas aboutir.
 */
export function useTotpAdminManquant(): boolean {
  const me = useSessionStore((s) => s.me)
  return !!me && me.accountType === 'ADMIN' && !me.totpEnabled
}
