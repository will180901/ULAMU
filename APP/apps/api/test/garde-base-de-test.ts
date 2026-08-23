/**
 * Garde-fou : les tests d'intégration ne touchent JAMAIS la base de production.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * Le 23/08/2026, un `npm test` a effacé la base du site en ligne : tous les comptes, dont
 * l'administrateur, les sessions, les secrets 2FA, les consentements et le journal d'audit.
 *
 * Rien n'était cassé pour autant. Chaque pièce faisait exactement son travail :
 *   • les suites d'intégration commencent par un `deleteMany()` sur vingt-quatre tables — il leur
 *     faut une base vide, sinon les données d'hier faussent les résultats d'aujourd'hui ;
 *   • le projet n'a qu'UNE base Neon, partagée par le développement local et le service déployé,
 *     décision assumée (« jamais de serveur local, jamais de Docker ») ;
 *   • `DATABASE_URL` du `.env` pointe donc sur la base réelle.
 *
 * Trois choix raisonnables qui, mis bout à bout, donnent une commande de routine qui détruit la
 * production. Le seul rempart était que la personne qui tape `npm test` y pense. Ce n'est pas un
 * rempart : c'est un pari, et il a été perdu au premier essai.
 *
 * ── Ce que fait ce garde-fou ───────────────────────────────────────────────────────────────────
 *
 * Les tests refusent de démarrer tant qu'une base DÉDIÉE n'est pas nommée dans `TEST_DATABASE_URL`.
 * Quand elle l'est, elle remplace `DATABASE_URL` pour toute la durée de la campagne : les tests ne
 * peuvent même plus atteindre la base de production, quand bien même quelqu'un le voudrait.
 *
 * Deux refus, pas un seul :
 *   1. `TEST_DATABASE_URL` absente → on s'arrête et on explique comment en obtenir une ;
 *   2. `TEST_DATABASE_URL` IDENTIQUE à `DATABASE_URL` → on s'arrête aussi. Recopier la même valeur
 *      pour « faire taire l'avertissement » est le geste le plus naturel du monde, et c'est celui
 *      qui ramènerait exactement l'accident. Un garde-fou qu'on contourne sans le savoir n'en est
 *      pas un.
 *
 * ── Comment obtenir une base de test ───────────────────────────────────────────────────────────
 *
 * Une BRANCHE Neon suffit, et elle est gratuite : console Neon → le projet → Branches → Create
 * branch. Neon en donne une chaîne de connexion, à coller dans `.env` :
 *
 *     TEST_DATABASE_URL="postgresql://…-branche-test…neon.tech/neondb?sslmode=require"
 *
 * Puis, une seule fois, pour y créer les tables :
 *
 *     npx cross-env DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *
 * Tant que cette branche n'existe pas, `npm run test:unit` reste disponible : les tests unitaires
 * ne touchent aucune base et continuent de tourner normalement.
 */

/** Ce que Jest appelle une fois, avant toute suite. Jeter ici arrête toute la campagne. */
export default function garderLaBaseDeProduction(): void {
  // Le `.env` n'est pas encore chargé à ce stade : Jest démarre avant Nest.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv/config");

  const test = process.env.TEST_DATABASE_URL?.trim();
  const prod = process.env.DATABASE_URL?.trim();

  if (!test) {
    throw new Error(
      [
        "",
        "═══════════════════════════════════════════════════════════════════════════",
        "  TESTS D'INTÉGRATION ARRÊTÉS — aucune base de test n'est configurée.",
        "═══════════════════════════════════════════════════════════════════════════",
        "",
        "  Ces tests VIDENT la base avant de commencer. Sans une base qui leur est",
        "  réservée, ils effaceraient les comptes, les consultations et le journal",
        "  d'audit du site en ligne.",
        "",
        "  Pour les lancer :",
        "    1. créez une branche dans la console Neon (gratuit, deux clics) ;",
        "    2. collez sa chaîne de connexion dans apps/api/.env :",
        "         TEST_DATABASE_URL=\"postgresql://…\"",
        "    3. créez-y les tables une fois :",
        "         npx prisma migrate deploy   (avec DATABASE_URL pointée sur elle)",
        "",
        "  Les tests unitaires, eux, ne touchent aucune base :",
        "    npm run test:unit",
        "",
        "═══════════════════════════════════════════════════════════════════════════",
      ].join("\n"),
    );
  }

  if (prod && test === prod) {
    throw new Error(
      [
        "",
        "═══════════════════════════════════════════════════════════════════════════",
        "  TESTS D'INTÉGRATION ARRÊTÉS — TEST_DATABASE_URL désigne la MÊME base",
        "  que DATABASE_URL.",
        "═══════════════════════════════════════════════════════════════════════════",
        "",
        "  Recopier la valeur de production ici ne contourne pas le problème : c'est",
        "  exactement le geste qui a effacé la base le 23/08/2026.",
        "",
        "  Il faut une base DISTINCTE — une branche Neon séparée.",
        "",
        "═══════════════════════════════════════════════════════════════════════════",
      ].join("\n"),
    );
  }

  // À partir d'ici, tout ce que les tests ouvriront — PrismaService compris — ira sur la base de
  // test. La valeur de production est écrasée dans le processus Jest, et nulle part ailleurs.
  process.env.DATABASE_URL = test;
}
