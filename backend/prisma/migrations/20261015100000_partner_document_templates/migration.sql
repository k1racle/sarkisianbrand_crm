CREATE TABLE "PartnerDocumentTemplateVersion" (
  "id" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "documentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL',
  "taxStatus" TEXT NOT NULL DEFAULT 'ALL',
  "entityType" TEXT NOT NULL DEFAULT 'ALL',
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerDocumentTemplateVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnerDocumentTemplateVersion_templateKey_version_key" ON "PartnerDocumentTemplateVersion"("templateKey", "version");
CREATE INDEX "PartnerDocumentTemplateVersion_documentType_isActive_audience_taxStatus_entityType_idx" ON "PartnerDocumentTemplateVersion"("documentType", "isActive", "audience", "taxStatus", "entityType");
CREATE TABLE "PartnerDocumentSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "pepEnabled" BOOLEAN NOT NULL DEFAULT false,
  "providerKey" TEXT NOT NULL DEFAULT 'SMS_AERO',
  "codeTtlSeconds" INTEGER NOT NULL DEFAULT 300,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "resendCooldownSeconds" INTEGER NOT NULL DEFAULT 60,
  "consentRequired" BOOLEAN NOT NULL DEFAULT true,
  "eligibleDocumentTypes" TEXT[] NOT NULL DEFAULT ARRAY['SERVICE_AGREEMENT', 'REWARD_SCHEDULE', 'SERVICE_ACT', 'PAYOUT_REQUEST'],
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerDocumentSettings_pkey" PRIMARY KEY ("id")
);
