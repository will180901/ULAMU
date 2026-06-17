-- D-049 : nom d'utilisateur, identifiant de connexion alternatif (le téléphone reste la racine).
-- Colonne NULLABLE sans défaut → migration non bloquante ; l'index UNIQUE tolère plusieurs NULL (Postgres).
ALTER TABLE "Account" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");
