-- Les demandes de support écrites par les utilisateurs.
--
-- L'application affichait `support@ulamu.cg`, une adresse dont le domaine n'appartient pas au
-- projet : ni achetée, ni relevée. Elle figurait dans les mentions légales — acceptées à
-- l'inscription, donc valant preuve — et derrière « Écrire à l'administration » en C1. Une voie de
-- contact qui ne mène nulle part est pire qu'aucune voie de contact : elle est crue.
--
-- La table qui suit remplace l'adresse par un formulaire. La réponse de l'administration vit ici
-- aussi, et se lit dans l'application : rien à acheter, rien à relever.
--
-- `subject` réutilise l'énumération `SupportProcedureType` déjà en place plutôt que d'en créer une
-- jumelle : une demande « j'ai perdu mon numéro » (PHONE_CHANGE) désigne ainsi directement la
-- procédure guidée qui la traite, et les deux moitiés du geste parlent la même langue.
--
-- Purement ADDITIVE : aucune table existante n'est touchée, aucune donnée n'est déplacée.
CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'ANSWERED');

CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "subject" "SupportProcedureType" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredBy" TEXT,
    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- La file d'administration : les plus anciennes ouvertes en tête.
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");

-- « Mes demandes », côté utilisateur : les plus récentes en tête.
CREATE INDEX "SupportRequest_requesterId_createdAt_idx" ON "SupportRequest"("requesterId", "createdAt");
