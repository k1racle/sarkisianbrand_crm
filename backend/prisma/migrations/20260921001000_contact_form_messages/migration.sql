CREATE TABLE "ContactFormSetting" (
    "key" TEXT NOT NULL DEFAULT 'main',
    "recipientEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactFormSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "notificationStatus" TEXT NOT NULL DEFAULT 'DISABLED',
    "mailOutboxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");
CREATE INDEX "ContactMessage_readAt_createdAt_idx" ON "ContactMessage"("readAt", "createdAt");
