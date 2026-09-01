/**
 * L'API refuse de démarrer en production sans clé de chiffrement valide.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * `secretbox.ts` accepte `SECRETBOX_KEY` **seulement si** elle fait exactement 32 octets une fois
 * décodée en base64. Sinon — collage tronqué, espace en trop, caractère manquant — elle est ignorée
 * **en silence** et le code retombe sur `sha256("ulamu-dev-secretbox")`, une valeur écrite en clair
 * dans les sources.
 *
 * Deux dégâts simultanés, aucun message :
 *   1. tout ce qui a été scellé avec la vraie clé devient illisible — pièces justificatives,
 *      messages de consultation, secrets TOTP ;
 *   2. tout ce qui est déposé **ensuite** est scellé avec une clé que n'importe qui peut lire dans
 *      le dépôt. Le chiffrement ne protège plus rien, alors que la variable *semble* renseignée.
 *
 * Un collage raté ne se voit pas. C'était le §8.1 de `procedure_sauvegarde_SECRETBOX_KEY.md`,
 * écrit le 25/08/2026 et laissé en suspens : le garde-fou transforme une dégradation invisible en
 * indisponibilité totale, et cette bascule appartenait au porteur. **Décision prise le 01/09/2026 :
 * on l'applique.**
 *
 * ── Pourquoi refuser de démarrer est le choix SÛR, et non le choix risqué ──────────────────────
 *
 * L'objection naturelle — « une panne partielle vaut mieux qu'une panne totale » — ne tient pas
 * ici, pour deux raisons :
 *
 *  • **L'hébergeur garde l'instance précédente en vie** quand un nouveau démarrage échoue. Un
 *    déploiement à la clé fautive ne remplace donc rien : le service en ligne continue de tourner
 *    avec sa clé correcte, et l'erreur se lit dans le journal de déploiement, à la seconde où elle
 *    se produit, par la personne qui vient précisément de déployer.
 *  • **Sans la clé, ULAMU n'est de toute façon pas utilisable.** La connexion administrateur exige
 *    le TOTP, dont le secret est scellé ; les pièces d'un dossier ne s'ouvrent plus ; les messages
 *    d'une consultation s'affichent « illisible ». Ce qui resterait debout n'est pas un service
 *    dégradé, c'est une coquille — mais une coquille qui, elle, continue d'ÉCRIRE avec une clé
 *    publique. La panne silencieuse ne préserve donc rien : elle abîme.
 *
 * ── Ce que le garde-fou ne fait pas ────────────────────────────────────────────────────────────
 *
 * Il ne s'applique **qu'en production**. En développement et en test, l'absence de clé reste
 * normale : `secretbox.ts` dérive alors sa clé de démonstration, et c'est très bien — personne ne
 * scelle de vraie donnée de santé sur un poste local.
 *
 * Il ne vérifie pas non plus que la clé est la BONNE : aucune vérification ne peut le faire sans
 * lire une donnée déjà scellée. Il vérifie qu'elle est **valide** — présente et de la bonne taille.
 * Une clé valide mais différente de celle qui a scellé les données produirait, elle, les erreurs de
 * déchiffrement nommées que le §8.2 a déjà rendues visibles.
 */

/** La clé est-elle exploitable par `secretbox.ts` ? Même critère, exactement : 32 octets. */
export function cleValide(brute: string | undefined): boolean {
  if (!brute) return false;
  return Buffer.from(brute, "base64").length === 32;
}

/**
 * Appelé au tout début de `bootstrap()`. Jette pour arrêter le démarrage.
 *
 * @param env variables d'environnement — injectables pour les tests.
 */
export function garderLaCleDeChiffrement(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;
  if (cleValide(env.SECRETBOX_KEY)) return;

  const cause = env.SECRETBOX_KEY
    ? `elle est présente mais ne décode pas en 32 octets (${Buffer.from(env.SECRETBOX_KEY, "base64").length} octets lus)`
    : "elle est absente";

  throw new Error(
    [
      "",
      "═══════════════════════════════════════════════════════════════════════════",
      "  DÉMARRAGE REFUSÉ — SECRETBOX_KEY invalide.",
      "═══════════════════════════════════════════════════════════════════════════",
      "",
      `  Cause : ${cause}.`,
      "",
      "  Sans elle, le serveur retomberait sur une clé écrite en clair dans les",
      "  sources. Il continuerait de fonctionner en apparence, tout en scellant",
      "  pièces justificatives, messages et secrets 2FA avec une clé publique —",
      "  et sans pouvoir relire ce qui a été scellé avec la vraie.",
      "",
      "  Rien n'est perdu : les données déjà en base restent chiffrées avec la",
      "  bonne clé. C'est cette instance qui refuse de partir, pas la précédente.",
      "",
      "  Pour corriger :",
      "    1. console de l'hébergeur → variables d'environnement du service ;",
      "    2. SECRETBOX_KEY doit valoir 32 octets en base64 (44 caractères,",
      "       terminés par « = ») — vérifiez qu'aucun espace ne s'est glissé ;",
      "    3. la copie de référence est décrite dans",
      "       docs/procedure_sauvegarde_SECRETBOX_KEY.md.",
      "",
      "  En dernier recours, pour générer une NOUVELLE clé — ce qui rend",
      "  définitivement illisible tout ce qui a déjà été scellé :",
      "       openssl rand -base64 32",
      "",
      "═══════════════════════════════════════════════════════════════════════════",
    ].join("\n"),
  );
}
