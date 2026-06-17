-- Réactions emoji sur les messages de session (1 par participant/message, bascule via soft-delete).
CREATE TABLE "SessionMessageReaction" (
    "messageId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "SessionMessageReaction_pkey" PRIMARY KEY ("messageId", "accountId")
);
CREATE INDEX "SessionMessageReaction_messageId_idx" ON "SessionMessageReaction"("messageId");
ALTER TABLE "SessionMessageReaction"
  ADD CONSTRAINT "SessionMessageReaction_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "SessionMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
