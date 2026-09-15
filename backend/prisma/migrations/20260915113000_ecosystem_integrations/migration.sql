CREATE TYPE "IntegrationCategory" AS ENUM ('MARKETPLACE', 'DELIVERY', 'ERP', 'PAYMENT', 'FISCAL', 'COMMUNICATION', 'BOT');
CREATE TYPE "IntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'DISABLED', 'CONFIGURED', 'CONNECTED', 'ERROR');
CREATE TYPE "IntegrationEnvironment" AS ENUM ('TEST', 'PRODUCTION');
CREATE TYPE "BotAudience" AS ENUM ('EMPLOYEE', 'B2C', 'B2B');

CREATE TABLE "EcosystemIntegration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "audience" "BotAudience",
    "description" TEXT,
    "documentationUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "environment" "IntegrationEnvironment" NOT NULL DEFAULT 'TEST',
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "config" JSONB,
    "encryptedSecrets" TEXT,
    "configuredSecretKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastTestAt" TIMESTAMP(3),
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EcosystemIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BotCommand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audiences" "BotAudience"[],
    "channels" TEXT[],
    "handlerKey" TEXT NOT NULL,
    "responseTemplate" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BotCommand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EcosystemIntegration_key_key" ON "EcosystemIntegration"("key");
CREATE INDEX "EcosystemIntegration_category_isEnabled_idx" ON "EcosystemIntegration"("category", "isEnabled");
CREATE INDEX "EcosystemIntegration_provider_audience_idx" ON "EcosystemIntegration"("provider", "audience");
CREATE INDEX "EcosystemIntegration_status_idx" ON "EcosystemIntegration"("status");
CREATE UNIQUE INDEX "BotCommand_slug_key" ON "BotCommand"("slug");
CREATE INDEX "BotCommand_isEnabled_sortOrder_idx" ON "BotCommand"("isEnabled", "sortOrder");
