-- Les fichiers rejoignent la base.
--
-- Ils étaient écrits dans `uploads/` sur le disque de l'instance Render. Le plan gratuit n'offre
-- aucun disque persistant : chaque déploiement les effaçait. Constaté le 24/08/2026 sur des pièces
-- justificatives réelles — la ligne était toujours en base, le fichier avait disparu.
--
-- Le contenu arrive déjà chiffré (AES-256-GCM) : la base n'en voit jamais le clair.
CREATE TABLE "StoredFile" (
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("key")
);
