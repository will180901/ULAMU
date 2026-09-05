/**
 * Le code de transfert d'un Carnet à la majorité — chantier 48, 06/09/2026 (écart D).
 *
 * ── Le problème que ce module résout ───────────────────────────────────────────────────────────
 *
 * `POST /v1/health-record/sub-profiles/:id/claim` exige TROIS valeurs du majeur qui revendique :
 *
 *   1. `subProfileId`  — dans l'URL, un UUID ;
 *   2. `intentId`      — dans le corps, un UUID, rendu au TUTEUR par `claim/start` ;
 *   3. `otpCode`       — six chiffres, envoyés au TUTEUR.
 *
 * **Le majeur n'en possède aucune.** Il ne peut pas lister le sous-profil (il n'en est pas le
 * tuteur, et le serveur répond « introuvable » exprès, contre l'énumération). Les trois valeurs
 * doivent donc lui être transmises — et deux sont des UUID.
 *
 * ⚠️ **Le tuteur et le majeur sont deux personnes sur deux téléphones.** Un copier-coller ne
 * traverse pas deux appareils : le seul chemin réel est un partage (SMS, WhatsApp) ou une lecture à
 * voix haute. Ce module réduit donc les deux UUID à **une seule chaîne** que l'écran fait partager.
 *
 * ── Pourquoi une simple jointure, et pas un encodage ──────────────────────────────────────────
 *
 * On a préféré `<subProfileId>.<intentId>` en clair à un base64. Le base64 aurait raccourci de peu
 * (73 → 98 caractères, il RALLONGE en fait) et rendu tout diagnostic impossible : devant un
 * transfert qui échoue, on veut pouvoir lire les identifiants dans le message partagé.
 *
 * ⚠️ **Ce code n'est pas un secret.** Il ne donne rien à lui seul : sans l'OTP à six chiffres, reçu
 * par le tuteur sur SON téléphone et jamais dans ce code, la revendication est refusée. C'est
 * l'OTP qui autorise ; ce code ne fait que désigner.
 *
 * 📌 **Dette ouverte** : le serveur pourrait émettre un code court, lisible à voix haute — ce qui
 * marcherait quand les deux personnes sont dans la même pièce, cas le plus fréquent. Voir §9.
 */

/** Les deux identifiants qu'un transfert désigne. */
export interface CodeTransfert {
  subProfileId: string;
  intentId: string;
}

/** Le séparateur : absent d'un UUID, donc jamais ambigu. */
const SEPARATEUR = '.';

/** Un UUID tel que le serveur les produit — la validation refuse un code tronqué au partage. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fabrique le code que le tuteur transmet. */
export function composerCode(parts: CodeTransfert): string {
  return `${parts.subProfileId}${SEPARATEUR}${parts.intentId}`;
}

/**
 * Relit un code reçu, ou renvoie `null` s'il ne tient pas debout.
 *
 * Tolérant sur la FORME, strict sur le FOND : une messagerie ajoute volontiers des espaces, un
 * retour à la ligne ou une majuscule automatique, et rien de tout cela ne change les identifiants.
 * En revanche un UUID incomplet — le cas d'un message coupé — est refusé net, parce qu'un appel
 * parti avec un identifiant tronqué reviendrait « introuvable » et ferait chercher au mauvais
 * endroit.
 */
export function lireCode(brut: string): CodeTransfert | null {
  const nettoye = brut.replace(/\s+/g, '').toLowerCase();
  const morceaux = nettoye.split(SEPARATEUR);
  if (morceaux.length !== 2) {
    return null;
  }
  const [subProfileId, intentId] = morceaux;
  if (!UUID.test(subProfileId) || !UUID.test(intentId)) {
    return null;
  }
  return {subProfileId, intentId};
}

/**
 * Le message que le tuteur partage.
 *
 * Il porte le code ET dit ce qu'il faut en faire, parce qu'il arrivera seul dans une conversation,
 * des heures plus tard peut-être. Il ne contient PAS l'OTP : le code voyage par un canal, le code
 * de confirmation par un autre — si la conversation est lue par un tiers, elle ne suffit pas.
 */
export function messageDePartage(prenom: string, code: string): string {
  return [
    `${prenom}, voici le code pour récupérer ton Carnet de santé ULAMU :`,
    '',
    code,
    '',
    'Dans l’application ULAMU : Carnet familial → « Récupérer mon Carnet ».',
    'Je te donnerai le code à 6 chiffres séparément — il vient de m’être envoyé.',
  ].join('\n');
}
