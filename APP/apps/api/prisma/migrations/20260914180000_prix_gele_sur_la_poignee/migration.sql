-- Le prix se fige au moment de la demande (chantier 118, 14/09/2026).
--
-- ⚠️ LE DÉFAUT, trouvé en relisant le parcours de paiement avec le porteur :
--
-- Le montant débité était relu dans l'offre **au moment de payer**, pas au moment de la demande.
-- Entre les deux, il se passe plusieurs minutes — le temps que le soignant confirme, le temps que le
-- patient sorte son téléphone. Si le soignant modifiait son tarif dans cet intervalle, **le patient
-- payait un prix qu'il n'avait jamais vu.**
--
-- > **Un prix montré est un engagement ; le relire plus tard, c'est se réserver le droit d'en
-- > changer.**
--
-- Ce n'est pas une hypothèse d'école : la vitrine du soignant est faite pour qu'il ajuste ses
-- tarifs, et rien ne l'avertit qu'une demande est en cours. Le défaut se déclenche donc au moment
-- où quelqu'un fait exactement ce que l'application l'invite à faire.
--
-- ── Ce que la colonne garde ───────────────────────────────────────────────────────────────────
--
-- `priceXaf` : le prix tel qu'il était **à l'instant de la demande**. C'est celui qui sera débité,
-- celui qui apparaît sur le reçu, et celui qui est remboursé.
--
-- Les libellé et durée sont figés aussi : un reçu qui dit « Consultation 30 min » alors que l'offre
-- s'appelle désormais « Suivi 15 min » ne prouve plus rien. *Une trace qui suit sa source n'est plus
-- une trace.*
--
-- ── Pourquoi NULLABLE, et pourquoi ce n'est pas de la paresse ─────────────────────────────────
--
-- Les poignées créées AVANT ce chantier n'ont pas de prix figé, et aucun ne peut être inventé : on
-- les rattrape depuis leur offre ci-dessous, mais une offre supprimée entre-temps ne laisse rien à
-- rattraper. Le code retombe alors sur l'offre vivante — exactement le comportement d'avant.
-- *Une colonne NOT NULL qu'on remplit d'un zéro inventé ment mieux qu'une colonne vide.*

ALTER TABLE "Handshake" ADD COLUMN "priceXaf" INTEGER;
ALTER TABLE "Handshake" ADD COLUMN "offerLabel" TEXT;
ALTER TABLE "Handshake" ADD COLUMN "offerDurationMin" INTEGER;

UPDATE "Handshake" h
SET "priceXaf" = o."priceXaf",
    "offerLabel" = o."label",
    "offerDurationMin" = o."durationMin"
FROM "CareOffer" o
WHERE o."id" = h."offerId";
