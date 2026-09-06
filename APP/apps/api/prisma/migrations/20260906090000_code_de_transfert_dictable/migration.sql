-- Un code de transfert qui se dicte (dette n°26, CU-07-05).
--
-- Pour récupérer son Carnet à sa majorité, le majeur devait connaître `subProfileId` ET `intentId` :
-- 73 caractères d'UUID, que son tuteur devait lui faire parvenir par écrit. Or le cas le plus
-- fréquent est que les deux personnes soient dans la même pièce — et 73 caractères ne se dictent pas.
--
-- Cette colonne porte huit signes d'un alphabet sans paire douteuse (ni 0/O, ni 1/I/L, ni U), lus à
-- voix haute en quelques secondes. `claimByCode` retrouve le transfert par ce seul code.
--
-- UNIQUE : la résolution se fait PAR le code ; deux intentions vivantes le partageant seraient
-- ambiguës. NULL autorisé — les intentions déjà en base n'en ont pas, et le code est EFFACÉ à la
-- consommation, ce qui garde l'index creux et interdit le rejeu d'un code déjà servi.
--
-- ⚠️ Purement ADDITIVE : une colonne nullable et son index. Aucune ligne existante n'est touchée,
-- et l'ancien chemin (`POST /sub-profiles/:id/claim` avec `intentId`) continue de fonctionner.
ALTER TABLE "SubProfileClaimIntent" ADD COLUMN "shortCode" TEXT;

CREATE UNIQUE INDEX "SubProfileClaimIntent_shortCode_key" ON "SubProfileClaimIntent"("shortCode");
