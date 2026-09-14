-- Le carnet de numéros Mobile Money (chantier 113, 14/09/2026).
--
-- ⚠️ LE DÉFAUT QUE CETTE TABLE RÉPARE, signalé par le porteur :
--
--   « pour le paiement il y a aussi autre chose : normalement on enregistre les numéros selon les
--     opérateurs disponibles dans le système, MTN et AIRTEL, pour éviter les erreurs dans les
--     transactions. »
--
-- Il a raison, et c'était pire que ce qu'il décrivait. L'ordre de débit partait vers
-- `Account.phone` — le numéro de CONNEXION — pendant que l'opérateur, lui, était choisi
-- explicitement à l'écran. Un compte enregistré sur un numéro Airtel qui cliquait « MTN MoMo »
-- envoyait la demande vers un portefeuille MTN sur un numéro qui n'en a pas : échec de transaction,
-- et rien pour l'expliquer à personne.
--
-- Et côté soignant, ce MÊME numéro de connexion reçoit les retraits de gains : changer son
-- identifiant de connexion déplaçait silencieusement l'argent.
--
-- ── Un numéro par opérateur, et par compte ─────────────────────────────────────────────────────
--
-- La clé primaire est (compte, opérateur) : on ne peut pas enregistrer deux numéros MTN pour le
-- même compte, et l'on n'a pas à choisir « lequel est le bon » au moment de payer. *Une ambiguïté
-- qu'on ne crée pas est une ambiguïté qu'on n'aura pas à trancher dans l'urgence d'un paiement.*
--
-- `verifiedAt` reste nul tant qu'aucun code n'a été confirmé sur le numéro. Le PAIEMENT s'en
-- contente — c'est le payeur qui confirme sur son propre téléphone, une erreur de numéro se solde
-- par une demande qui n'arrive pas. Le RETRAIT ne s'en contentera pas : là, une erreur envoie de
-- l'argent à un inconnu, et c'est le chantier suivant qui l'exigera.
--
-- Aucune donnée n'est migrée : les comptes existants continuent de payer sur leur numéro de
-- connexion tant qu'ils n'ont rien enregistré (repli documenté dans m13.payments.service.ts).
-- *Une fondation ne casse pas ce qui tient déjà dessus.*

CREATE TABLE "MomoNumber" (
    "accountId" TEXT NOT NULL,
    "operator" "PaymentOperator" NOT NULL,
    "msisdn" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomoNumber_pkey" PRIMARY KEY ("accountId","operator")
);

CREATE INDEX "MomoNumber_msisdn_idx" ON "MomoNumber"("msisdn");
