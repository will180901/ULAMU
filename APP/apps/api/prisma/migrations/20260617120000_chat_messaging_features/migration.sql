-- Accusés 3 états : curseurs de lecture par participant.
ALTER TABLE "CareSession" ADD COLUMN "patientLastReadAt" TIMESTAMP(3);
ALTER TABLE "CareSession" ADD COLUMN "professionalLastReadAt" TIMESTAMP(3);

-- Messagerie enrichie : album, édition, suppression « pour tous », réponse/citation.
ALTER TABLE "SessionMessage" ADD COLUMN "mediaKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SessionMessage" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "SessionMessage" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "SessionMessage" ADD COLUMN "replyToId" TEXT;

ALTER TABLE "SessionMessage"
  ADD CONSTRAINT "SessionMessage_replyToId_fkey"
  FOREIGN KEY ("replyToId") REFERENCES "SessionMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- « Supprimer pour moi » : masquage par participant.
CREATE TABLE "SessionMessageHidden" (
    "messageId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    CONSTRAINT "SessionMessageHidden_pkey" PRIMARY KEY ("messageId", "accountId")
);
CREATE INDEX "SessionMessageHidden_accountId_idx" ON "SessionMessageHidden"("accountId");
ALTER TABLE "SessionMessageHidden"
  ADD CONSTRAINT "SessionMessageHidden_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "SessionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
