CREATE TYPE "PlatformChatAttachmentKind" AS ENUM ('FILE', 'IMAGE', 'AUDIO', 'ENTITY');

CREATE TABLE "PlatformChatAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "kind" "PlatformChatAttachmentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageKey" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformChatAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformChatAttachment_messageId_idx" ON "PlatformChatAttachment"("messageId");
CREATE INDEX "PlatformChatAttachment_entityType_entityId_idx" ON "PlatformChatAttachment"("entityType", "entityId");
ALTER TABLE "PlatformChatAttachment" ADD CONSTRAINT "PlatformChatAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CrmChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
