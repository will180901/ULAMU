/**
 * La règle d'un numéro congolais, côté saisie — chantier 116, 14/09/2026.
 *
 * ⚠️ Ce fichier est VENDORÉ. La source est `packages/shared/src/numero.ts` ; les copies sont
 * `apps/web/src/lib/numero.ts` et `apps/mobile/src/lib/numero.ts`. Toute correction se fait dans la
 * SOURCE, puis se recopie — jamais l'inverse.
 *
 * ── Pourquoi elle vit ici, et pas seulement au serveur ────────────────────────────────────────
 *
 * Le serveur la tient déjà (`m01.policies.normalizePhone`) et il la tiendra toujours : c'est lui
 * qui décide. Mais un refus qui arrive APRÈS un aller-retour réseau se lit comme une panne, et sur
 * une connexion congolaise il se lit trois secondes plus tard. *Une règle connue des deux côtés se
 * dit à la frappe ; une règle connue d'un seul côté se dit en retard.*
 *
 * ⚠️ **C'est un MIROIR, pas une seconde autorité.** Si le serveur change, cette copie doit changer —
 * et le test `NumeroCongolais.test.ts` compare les deux formulations pour que l'oubli se voie.
 *
 * ── La règle, telle que le porteur l'a dite ───────────────────────────────────────────────────
 *
 * *« Les champs uniquement chiffres, et le format à respecter : 9 chiffres obligatoires qui
 * commencent par 06… »*
 *
 * Neuf chiffres, commençant par **0**, suivi de 4, 5, 6, 7 ou 8 — les tranches attribuées au Congo.
 * `06` est MTN, `05` Airtel ; les autres existent et le serveur les accepte, donc on les accepte.
 * *Interdire plus strictement que le serveur, c'est refuser des gens qu'il aurait servis.*
 */

/** Le numéro national, sans indicatif : neuf chiffres. */
export const NUMERO_LONGUEUR = 9;

/** Ne garde que les chiffres — un champ de numéro n'a rien à faire des espaces ni des tirets. */
export function chiffresSeuls(saisie: string): string {
  return saisie.replace(/\D/g, '');
}

/**
 * Ce numéro national est-il valide ?
 *
 * Miroir exact de la partie nationale de `normalizePhone` côté serveur : `0[45678]` + 7 chiffres.
 */
export function numeroLocalValide(chiffres: string): boolean {
  return /^0[45678]\d{7}$/.test(chiffres);
}

/**
 * Ce qui manque à cette saisie, dit en une phrase — ou `null` si elle est bonne.
 *
 * ⚠️ **Trois messages différents, et c'est volontaire.** « Numéro invalide » n'apprend rien : la
 * personne ne sait pas s'il en manque un chiffre ou si le premier est faux. *Un message d'erreur
 * qui ne dit pas quoi corriger oblige à deviner, et on devine mal quand on est pressé.*
 */
export function refusDuNumero(chiffres: string): string | null {
  if (chiffres.length === 0) return null;
  if (!chiffres.startsWith('0')) return 'Un numéro congolais commence par 0 — par exemple 06 ou 05.';
  if (chiffres.length > 1 && !'45678'.includes(chiffres[1] as string)) {
    return 'Après le 0, on attend 4, 5, 6, 7 ou 8.';
  }
  if (chiffres.length < NUMERO_LONGUEUR) {
    return `Il manque ${NUMERO_LONGUEUR - chiffres.length} chiffre${NUMERO_LONGUEUR - chiffres.length > 1 ? 's' : ''} — un numéro en compte 9.`;
  }
  return numeroLocalValide(chiffres) ? null : 'Numéro non reconnu — 9 chiffres commençant par 0.';
}
