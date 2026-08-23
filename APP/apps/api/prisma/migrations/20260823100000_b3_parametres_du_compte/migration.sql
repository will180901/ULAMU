-- B3 « Mes paramètres » — ce que l'écran exige et que le schéma ne portait pas encore.
-- Tout est additif et nullable ou pourvu d'un défaut : aucune ligne existante n'est invalidée,
-- et un retour arrière du code n'a pas besoin d'un retour arrière de la base.

-- Photo de profil des soignants et des membres de structure. Elle n'existait que pour les patients,
-- alors que c'est sur la vitrine publique d'un soignant qu'un patient la regarde.
ALTER TABLE "ProfessionalProfile" ADD COLUMN "avatarKey" TEXT;
ALTER TABLE "FacilityMemberProfile" ADD COLUMN "avatarKey" TEXT;

-- Date de génération du lot de codes de secours : « 7 restants sur 10 · générés le … ». Les lignes
-- déjà en base prennent la date de la migration — c'est faux de quelques semaines, mais c'est la
-- seule valeur disponible, et un lot régénéré écrase le lot entier.
ALTER TABLE "TotpBackupCode" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Changement d'adresse email. Deux usages distincts pour que la preuve sur l'ancienne adresse ne
-- puisse pas être rejouée à la place de celle sur la nouvelle.
-- Note PostgreSQL : ajouter une valeur d'enum est permis dans une transaction depuis la 12, tant que
-- la valeur n'est pas UTILISÉE dans la même transaction. Aucune ligne n'y fait référence ici.
ALTER TYPE "OtpPurpose" ADD VALUE 'EMAIL_CHANGE_OLD';
ALTER TYPE "OtpPurpose" ADD VALUE 'EMAIL_CHANGE_NEW';
