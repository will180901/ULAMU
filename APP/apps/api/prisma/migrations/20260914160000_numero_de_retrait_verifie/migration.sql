-- Le numéro de retrait se prouve, et il attend (chantier 117, 14/09/2026).
--
-- ⚠️ CE QUE CETTE MIGRATION PROTÈGE
--
-- Jusqu'ici, un retrait de gains partait vers `Account.phone` — le numéro de CONNEXION. Deux
-- conséquences, et la seconde est la grave :
--
--   1. changer son identifiant de connexion déplaçait silencieusement l'argent de ses retraits ;
--   2. **rien ne prouvait que ce numéro était bien un portefeuille tenu par le titulaire.** Sur un
--      paiement, une erreur de numéro se solde par une demande qui n'arrive pas — désagréable, sans
--      plus. Sur un RETRAIT, elle envoie de l'argent à un inconnu, et il ne revient pas.
--
-- > **Un numéro qui reçoit de l'argent doit être prouvé ; un numéro qui en envoie se prouve tout
-- > seul, puisque son titulaire doit confirmer sur son téléphone.**
--
-- ── Ce que la migration ajoute ────────────────────────────────────────────────────────────────
--
-- `MOMO_VERIFY` : l'usage d'OTP dédié à cette preuve. Dédié, et pas partagé avec SENSITIVE_ACTION —
-- le quota PM-19 se compte PAR USAGE, et un code de retrait qui mangerait celui d'une action
-- sensible (ou l'inverse) enfermerait quelqu'un dehors au pire moment. C'est la leçon écrite au
-- chantier 63 pour SUPPORT_ACCESS, et elle vaut ici mot pour mot.
--
-- `PM-41` : le délai de sécurité après un changement de numéro de retrait — **24 h**, validé par le
-- porteur. Il ne protège pas d'une erreur, il protège d'un VOL : un compte pris en main quelques
-- minutes suffirait, sans lui, à détourner un solde entier vers un numéro inconnu. *Ce délai ne
-- coûte qu'à celui qui change son numéro le jour où il retire — c'est-à-dire au cas le plus rare et
-- au plus suspect.*

ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'MOMO_VERIFY';

-- ⚠️ **`updatedAt` DOIT être fourni ici** — corrigé le 15/09/2026, après trois heures de panne.
--
-- Cette insertion, écrite sans `updatedAt`, a fait échouer la migration le 14/09 à 22:50 UTC. La
-- transaction a été annulée, la migration marquée `failed`, et **P3009 a dès lors bloqué toutes
-- les suivantes** : le chantier 118 n'est jamais passé, et l'API n'a plus démarré du tout.
--
-- 📌 La cause est une asymétrie facile à ne pas voir : `@updatedAt` est tenu par le **client**
-- Prisma, jamais par la base. La colonne est donc `NOT NULL` **sans valeur par défaut**, et tout le
-- code applicatif — le seed compris — la remplit sans y penser. *Une colonne qu'un outil remplit
-- toujours pour vous finit par passer pour une colonne qui se remplit toute seule.*
--
-- Le filet qui garde cette règle pour les migrations à venir :
-- `src/common/migrations-insert-colonnes.spec.ts`.
INSERT INTO "PlatformParameter" ("key", "value", "description", "updatedAt")
VALUES ('PM-41', '86400', 'Délai de sécurité après changement du numéro de retrait (s) — 24 h (décision porteur 14/09/2026)', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
