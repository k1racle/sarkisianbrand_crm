CREATE TABLE "PartnerLegalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxStatus" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "ogrnip" TEXT,
    "address" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerLegalProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnerLegalProfile_userId_key" ON "PartnerLegalProfile"("userId");
ALTER TABLE "PartnerLegalProfile" ADD CONSTRAINT "PartnerLegalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PartnerLegalEntity" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "kpp" TEXT,
    "ogrn" TEXT,
    "ogrnip" TEXT,
    "address" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT,
    "signerBasis" TEXT NOT NULL,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerLegalEntity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerLegalEntity_isActive_entityType_idx" ON "PartnerLegalEntity"("isActive", "entityType");

CREATE TABLE "PartnerGeneratedDocument" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'DOC',
    "status" TEXT NOT NULL DEFAULT 'DRAFT_LEGAL_REVIEW',
    "templateVersion" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerGeneratedDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerGeneratedDocument_participantId_createdAt_idx" ON "PartnerGeneratedDocument"("participantId", "createdAt");
ALTER TABLE "PartnerGeneratedDocument" ADD CONSTRAINT "PartnerGeneratedDocument_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerGeneratedDocument" ADD CONSTRAINT "PartnerGeneratedDocument_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "PartnerLegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
