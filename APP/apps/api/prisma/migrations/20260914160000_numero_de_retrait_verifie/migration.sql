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

INSERT INTO "PlatformParameter" ("key", "value", "description")
VALUES ('PM-41', '86400', 'Délai de sécurité après changement du numéro de retrait (s) — 24 h (décision porteur 14/09/2026)')
ON CONFLICT ("key") DO NOTHING;
