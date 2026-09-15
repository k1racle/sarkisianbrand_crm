CREATE TYPE "BotEventStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSING', 'REQUIRES_AUTH', 'COMPLETED', 'IGNORED', 'FAILED');

CREATE TABLE "BotIdentity" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "audience" "BotAudience" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "externalChatId" TEXT,
    "displayName" TEXT,
    "userId" TEXT,
    "customerId" TEXT,
    "organizationId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotWebhookEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "audience" "BotAudience" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "externalUserId" TEXT,
    "externalChatId" TEXT,
    "eventType" TEXT,
    "commandText" TEXT,
    "commandId" TEXT,
    "status" "BotEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "responseText" TEXT,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotIdentity_provider_audience_externalUserId_key" ON "BotIdentity"("provider", "audience", "externalUserId");
CREATE INDEX "BotIdentity_userId_idx" ON "BotIdentity"("userId");
CREATE INDEX "BotIdentity_customerId_idx" ON "BotIdentity"("customerId");
CREATE INDEX "BotIdentity_organizationId_idx" ON "BotIdentity"("organizationId");
CREATE INDEX "BotIdentity_provider_audience_isVerified_idx" ON "BotIdentity"("provider", "audience", "isVerified");
CREATE UNIQUE INDEX "BotWebhookEvent_integrationId_externalEventId_key" ON "BotWebhookEvent"("integrationId", "externalEventId");
CREATE INDEX "BotWebhookEvent_status_receivedAt_idx" ON "BotWebhookEvent"("status", "receivedAt");
CREATE INDEX "BotWebhookEvent_provider_audience_receivedAt_idx" ON "BotWebhookEvent"("provider", "audience", "receivedAt");
CREATE INDEX "BotWebhookEvent_externalUserId_idx" ON "BotWebhookEvent"("externalUserId");
CREATE INDEX "BotWebhookEvent_commandId_idx" ON "BotWebhookEvent"("commandId");

ALTER TABLE "BotIdentity" ADD CONSTRAINT "BotIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotIdentity" ADD CONSTRAINT "BotIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotIdentity" ADD CONSTRAINT "BotIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotWebhookEvent" ADD CONSTRAINT "BotWebhookEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "EcosystemIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BotWebhookEvent" ADD CONSTRAINT "BotWebhookEvent_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "BotCommand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
