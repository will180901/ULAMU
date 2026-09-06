/**
 * Le code de transfert d'un Carnet à la majorité — chantier 48, puis dette n°26 le 06/09/2026.
 *
 * ── Ce que ce module portait hier, et pourquoi il a changé ─────────────────────────────────────
 *
 * Il réunissait `subProfileId` et `intentId` — **73 caractères d'UUID** — en une chaîne unique que le
 * tuteur partageait par SMS ou WhatsApp. Cela marchait, et cela ne marchait que là : le cas le plus
 * fréquent est que le tuteur et le majeur soient **dans la même pièce**, et 73 caractères ne se
 * dictent pas.
 *
 * Le serveur émet désormais un **code de huit signes** (dette n°26) qui désigne le transfert à lui
 * seul : `POST /v1/health-record/sub-profiles/claim-by-code` retrouve le reste. Ce module ne fait
 * plus que le mettre en forme, le relire, et l'accompagner d'un message quand il faut l'envoyer.
 *
 * ⚠️ **Ce code n'est pas un secret.** Sans l'OTP à six chiffres, reçu par le tuteur sur SON téléphone
 * et jamais transmis avec ce code, la revendication est refusée. Le code désigne ; l'OTP autorise.
 */

/**
 * L'alphabet accepté, identique à `CLAIM_CODE_ALPHABET` du serveur : ni `0` ni `O`, ni `1` ni `I`
 * ni `L`, ni `U`. **Les deux membres de chaque paire douteuse sont exclus**, pas seulement l'un —
 * garder `O` en écartant `0` laisserait celui qui écoute hésiter quand même, et sa faute serait
 * alors silencieuse.
 *
 * ⚠️ **Oui, c'est une règle recopiée**, la faute que ce projet traque partout ailleurs. Elle est
 * assumée ici, et voici pourquoi : ce contrôle sert à dire « répétez » AVANT d'appeler, quand la
 * personne s'est trompée en écrivant sous la dictée. Ne pas le recopier voudrait dire ne rien
 * vérifier et laisser le serveur répondre « aucun transfert avec ce code » — ce qui ferait chercher
 * le défaut dans le transfert plutôt que dans la dictée.
 *
 * La divergence possible est bornée dans le bon sens : un alphabet élargi côté serveur ferait
 * refuser ici un code pourtant valide — une gêne, jamais un trou.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Huit signes : assez pour ne pas se deviner, assez court pour se dicter d'un souffle. */
export const LONGUEUR_CODE = 8;

/**
 * Met un code sous sa forme canonique, ou rend `null` s'il n'en est pas un.
 *
 * Tolérant sur la FORME — tiret d'affichage, espaces, minuscules, tout cela s'écrit sous la dictée —
 * et strict sur le FOND : un signe hors alphabet ne peut venir que d'une erreur d'écoute.
 */
export function lireCode(brut: string): string | null {
  const compact = brut.replace(/[\s-]/g, '').toUpperCase();
  if (compact.length !== LONGUEUR_CODE) {
    return null;
  }
  for (const c of compact) {
    if (!ALPHABET.includes(c)) {
      return null;
    }
  }
  return compact;
}

/** « ABCD-EFGH » : on dicte par groupes de quatre, jamais huit signes d'affilée. */
export function formaterCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Le message que le tuteur partage, quand il n'a pas la personne en face de lui.
 *
 * Il porte le code ET dit quoi en faire, parce qu'il arrivera seul dans une conversation, des heures
 * plus tard peut-être. Il ne contient **pas** l'OTP : le code voyage par un canal, la confirmation
 * par un autre — une conversation se relit longtemps après, sur un téléphone prêté ou revendu.
 */
export function messageDePartage(prenom: string, code: string): string {
  return [
    `${prenom}, voici le code pour récupérer ton Carnet de santé ULAMU :`,
    '',
    formaterCode(code),
    '',
    'Dans l’application ULAMU : Carnet familial → « Récupérer mon Carnet ».',
    'Je te donnerai le code à 6 chiffres séparément — il vient de m’être envoyé.',
  ].join('\n');
}
