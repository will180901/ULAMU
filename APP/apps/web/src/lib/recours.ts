/**
 * Le recours de quelqu'un qui ne peut plus se connecter — chantier 63, 07/09/2026.
 *
 * ── Pourquoi cette règle vit ici et pas dans la page de connexion ─────────────────────────────
 *
 * Elle décide si l'on propose la seule porte qui reste à quelqu'un qu'on vient d'exclure. Écrite en
 * ligne dans une condition d'affichage, elle ne serait éprouvée par rien — et l'application mobile
 * dit exactement la même chose, dans son propre `lib/recours.ts`.
 */
import { ApiError } from '@/lib/api'

/**
 * Faut-il proposer d'écrire à l'administration après cet échec de connexion ?
 *
 * **Le signal est le statut 403.** Le serveur répond `ForbiddenException` dans les deux cas qui
 * comptent : « Compte suspendu (RM-01-05) » et « Compte clôturé — contactez le support (PM-21) ».
 * Un mot de passe faux répond 401, un réseau coupé n'a pas de statut, une limite de débit répond
 * 429 : aucun d'eux n'amène ici.
 *
 * ⚠️ On ne lit PAS le message français. Une reformulation le ferait dériver en silence — et ce
 * serait le recours qui disparaîtrait, sans que rien ne le signale.
 *
 * Un faux positif coûte un lien de trop sur un écran d'erreur ; un faux négatif coûte à quelqu'un sa
 * seule voie de recours. Le doute penche donc du côté de l'afficher.
 */
export function proposerLeRecours(erreur: unknown): boolean {
  return erreur instanceof ApiError && erreur.status === 403
}
