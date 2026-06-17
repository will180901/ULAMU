-- Photo de profil patient (clé de stockage, null = initiales).
ALTER TABLE "PatientProfile" ADD COLUMN "avatarKey" TEXT;

-- Jeton de notification push par appareil (FCM/APNs).
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_accountId_idx" ON "DeviceToken"("accountId");
