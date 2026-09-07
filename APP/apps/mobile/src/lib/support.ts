/**
 * Les règles de « Écrire à l'administration » — chantier 61, 07/09/2026 (M16, CU-16-04).
 *
 * Hors de l'écran, comme `signalement.ts` : ce qui décide quelque chose ne vit pas dans une
 * condition d'affichage, sinon rien ne l'éprouve et la première copie la fait dériver.
 */
import {SupportSubject, SUPPORT_BODY_MAX, SUPPORT_BODY_MIN} from './contracts';

/**
 * Les sujets réellement OFFERTS — trois des quatre que le serveur connaît.
 *
 * ⚠️ `OWNER_UNREACHABLE` (« titulaire de structure injoignable ») n'est pas proposé, et ce n'est
 * pas un oubli : ULAMU compte trois acteurs depuis D-051 — patient, soignant, administration.
 * **Personne n'administre plus de structure, donc personne ne peut avoir ce problème.**
 *
 * Le laisser serait pire qu'inutile : celui qui le choisit dépose une demande qu'aucun
 * administrateur ne saura traiter — la procédure guidée correspondante a été retirée d'E7 le même
 * jour. *Une case qui mène à une file morte est une promesse de réponse qu'on ne tiendra pas.*
 *
 * Le sujet reste connu du serveur et l'administration sait encore l'AFFICHER : des demandes
 * déposées avant le 02/09 le portent. On cesse de l'offrir, on ne l'efface pas. Le web a tranché
 * de même (chantier 29).
 */
export const SUJETS_OFFERTS: ReadonlyArray<{cle: SupportSubject; label: string; aide: string}> = [
  {cle: 'PHONE_CHANGE', label: 'J’ai perdu mon numéro', aide: 'Le code de connexion arrive sur une ligne que je n’ai plus'},
  {cle: 'RECORD_TRANSFER', label: 'Mon carnet de santé', aide: 'Transfert, correction ou accès à mon dossier'},
  {cle: 'OTHER', label: 'Autre demande', aide: 'Tout ce qui n’entre dans aucune des deux'},
];

/**
 * Le texte est-il envoyable ?
 *
 * Miroir exact des bornes du serveur (`@MinLength(10) @MaxLength(2000)`), éprouvé ici pour qu'on
 * n'apprenne pas la règle par un refus après avoir écrit. Le serveur reste le juge.
 */
export function demandeEnvoyable(texte: string): boolean {
  const t = texte.trim();
  return t.length >= SUPPORT_BODY_MIN && t.length <= SUPPORT_BODY_MAX;
}

/** Le libellé d'un sujet, y compris pour un sujet qu'on n'offre plus mais qu'une vieille demande porte. */
export function libelleSujet(sujet: SupportSubject): string {
  const offert = SUJETS_OFFERTS.find(s => s.cle === sujet);
  if (offert) {
    return offert.label;
  }
  return sujet === 'OWNER_UNREACHABLE' ? 'Ma structure · titulaire injoignable' : sujet;
}
