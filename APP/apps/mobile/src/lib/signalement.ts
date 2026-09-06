/**
 * Les règles du signalement, hors de tout écran — chantier 59, 06/09/2026 (M04, EF-04-05).
 *
 * Elles vivent ici et non en ligne dans le JSX pour la même raison qu'`session-expiry.ts` côté
 * serveur : **une règle écrite dans une condition d'affichage n'est éprouvée par rien.** Le jour où
 * elle change, rien ne le dit ; le jour où on la recopie ailleurs, les deux copies divergent.
 */
import {MessageView, ReportReasonCode} from './contracts';

/**
 * Peut-on signaler ce message ?
 *
 * **Uniquement ceux de L'AUTRE.** Se signaler soi-même n'a aucun sens, et l'offrir ferait douter de
 * ce que le geste veut dire — « supprimer pour moi » répond déjà au besoin de ne plus voir son
 * propre message. Le web applique la même règle depuis le chantier 41.
 *
 * Un message SUPPRIMÉ n'est pas signalable non plus : il n'y a plus de contenu à examiner, et
 * l'équipe de modération recevrait une référence vide.
 */
export function peutSignalerMessage(msg: MessageView | null, monAccountId: string): boolean {
  if (!msg) {
    return false;
  }
  if (msg.senderId === monAccountId) {
    return false;
  }
  return !msg.deletedAt;
}

/**
 * L'ordre d'AFFICHAGE des motifs — du plus grave au plus anodin, comme la file de modération les
 * trie (CU-04-04).
 *
 * Ce n'est PAS l'ordre du serveur, et c'est volontaire : le serveur déclare une liste fermée, il ne
 * dit pas dans quel ordre on la lit. « Autre » ferme la liste parce qu'il est le seul qui n'apprend
 * rien à lui seul.
 */
export const MOTIFS_AFFICHES: readonly ReportReasonCode[] = [
  'HARASSMENT',
  'INAPPROPRIATE_BEHAVIOR',
  'SUSPECTED_FAKE_PROFILE',
  'MISLEADING_INFORMATION',
  'SPAM',
  'OTHER',
];
