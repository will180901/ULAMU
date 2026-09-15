-- Le reçu porte le libellé de l'offre (chantier 126, 15/09/2026).
--
-- ⚠️ CE QUE CETTE MIGRATION RÉPARE
--
-- Le reçu du patient affichait « Consultation », un mot DÉDUIT de la référence d'ordre
-- (`handshake:…`). Or le soignant nomme son offre librement : quelqu'un qui a payé « Bilan santé
-- 60 min » recevait un reçu disant « Consultation ».
--
-- > **Un reçu est une trace : il doit dire ce qui a été acheté, pas la catégorie dans laquelle on
-- > le range.**
--
-- Le chantier 118 avait déjà figé `offerLabel` sur la poignée de main pour que le montant payé soit
-- celui qui avait été montré. Ce libellé n'atteignait simplement jamais le reçu.
--
-- ── Pourquoi une COLONNE, et pas une jointure à l'affichage ───────────────────────────────────
--
-- Relire le libellé dans la poignée à chaque affichage rebrancherait le reçu sur une source
-- vivante — exactement ce que le chantier 118 a défait. Et cela ferait dépendre M13, qui est
-- AVEUGLE au métier par construction (RM-13-01), du module des consultations.
--
-- La colonne est NULLABLE : les paiements d'avant n'ont rien à inventer, et l'écran sait retomber
-- sur son ancienne déduction. *Une colonne NOT NULL qu'on remplit d'une chaîne inventée ment mieux
-- qu'une colonne vide.*
--
-- ⚠️ `updatedAt` : la table `Payment` n'en a pas, et cette migration n'INSÈRE rien — le filet
-- `migrations-insert-colonnes.spec.ts` (né de la panne du 14/09) le vérifie à chaque exécution.

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "label" TEXT;

-- Rattrapage des paiements existants : le libellé figé sur la poignée est déjà la bonne valeur.
-- Les deux formes de référence sont couvertes — la stable et celle des nouvelles tentatives,
-- suffixée `:r<seconde>` (EF-06-03).
UPDATE "Payment" p
SET "label" = h."offerLabel"
FROM "Handshake" h
WHERE p."label" IS NULL
  AND h."offerLabel" IS NOT NULL
  AND (p."orderRef" = 'handshake:' || h."id" OR p."orderRef" LIKE 'handshake:' || h."id" || ':r%');
