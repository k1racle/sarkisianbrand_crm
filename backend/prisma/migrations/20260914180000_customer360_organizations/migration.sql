-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'ON_HOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'BUYER', 'ACCOUNTANT', 'EMPLOYEE');

-- AlterTable
ALTER TABLE "HelpdeskTicket" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN     "customerId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "normalizedEmail" TEXT,
    "normalizedPhone" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "segment" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerExternalIdentity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "legalAddress" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PROSPECT',
    "discountTier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "accountManagerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "role" "OrganizationMemberRole" NOT NULL DEFAULT 'EMPLOYEE',
    "jobTitle" TEXT,
    "canOrder" BOOLEAN NOT NULL DEFAULT true,
    "canSeeFinance" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- Preserve existing customer history and connect it to the canonical profile.
INSERT INTO "Customer" (
    "id", "userId", "firstName", "lastName", "email", "phone",
    "normalizedEmail", "normalizedPhone", "status", "segment", "source", "createdAt", "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || u."id")::uuid::text,
    u."id", u."firstName", u."lastName", u."email", u."phone",
    lower(trim(u."email")), NULLIF(regexp_replace(COALESCE(u."phone", ''), '\D', '', 'g'), ''),
    'ACTIVE'::"CustomerStatus",
    CASE WHEN u."role"::text = 'CUSTOMER_B2B' THEN 'B2B' ELSE 'B2C' END,
    'WEB', u."createdAt", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."role"::text IN ('CUSTOMER_B2C', 'CUSTOMER_B2B')
   OR EXISTS (SELECT 1 FROM "Order" o WHERE o."userId" = u."id")
   OR EXISTS (SELECT 1 FROM "B2BProfile" bp WHERE bp."userId" = u."id");

-- Convert legacy one-user B2B profiles into organizations with memberships.
INSERT INTO "Organization" (
    "id", "name", "legalName", "inn", "kpp", "legalAddress", "status",
    "discountTier", "creditLimit", "accountManagerId", "createdAt", "updatedAt"
)
SELECT
    bp."id", COALESCE(NULLIF(bp."companyName", ''), 'Организация без названия'), bp."companyName",
    bp."inn", bp."kpp", bp."legalAddress",
    CASE WHEN bp."isVerified" THEN 'ACTIVE'::"OrganizationStatus" ELSE 'PROSPECT'::"OrganizationStatus" END,
    bp."discountTier", bp."creditLimit", bp."managerId", bp."createdAt", CURRENT_TIMESTAMP
FROM "B2BProfile" bp;

INSERT INTO "OrganizationMember" (
    "id", "organizationId", "userId", "customerId", "role", "canOrder", "canSeeFinance", "isActive", "createdAt", "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || bp."id")::uuid::text,
    bp."id", bp."userId", c."id", 'OWNER'::"OrganizationMemberRole", true, true, true,
    bp."createdAt", CURRENT_TIMESTAMP
FROM "B2BProfile" bp
LEFT JOIN "Customer" c ON c."userId" = bp."userId";

UPDATE "Order" o SET
    "customerId" = c."id",
    "organizationId" = o."b2bProfileId"
FROM "Customer" c
WHERE o."userId" = c."userId";

UPDATE "Order" SET "organizationId" = "b2bProfileId"
WHERE "organizationId" IS NULL AND "b2bProfileId" IS NOT NULL;

UPDATE "Lead" l SET "organizationId" = l."b2bProfileId"
WHERE l."b2bProfileId" IS NOT NULL;

UPDATE "Lead" l SET "customerId" = c."id"
FROM "Customer" c
WHERE l."customerId" IS NULL
  AND ((l."contactEmail" IS NOT NULL AND lower(trim(l."contactEmail")) = c."normalizedEmail")
    OR (NULLIF(regexp_replace(COALESCE(l."contactPhone", ''), '\D', '', 'g'), '') = c."normalizedPhone"));

UPDATE "Interaction" i SET "customerId" = c."id"
FROM "Customer" c
WHERE i."userId" = c."userId";

UPDATE "Interaction" i SET "customerId" = l."customerId"
FROM "Lead" l
WHERE i."customerId" IS NULL AND i."leadId" = l."id";

UPDATE "HelpdeskTicket" t SET "customerId" = c."id"
FROM "Customer" c
WHERE t."requesterUserId" = c."userId";

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE INDEX "Customer_normalizedEmail_idx" ON "Customer"("normalizedEmail");

-- CreateIndex
CREATE INDEX "Customer_normalizedPhone_idx" ON "Customer"("normalizedPhone");

-- CreateIndex
CREATE INDEX "Customer_status_segment_idx" ON "Customer"("status", "segment");

-- CreateIndex
CREATE INDEX "CustomerExternalIdentity_customerId_idx" ON "CustomerExternalIdentity"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerExternalIdentity_provider_externalId_key" ON "CustomerExternalIdentity"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_inn_key" ON "Organization"("inn");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_accountManagerId_idx" ON "Organization"("accountManagerId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_customerId_idx" ON "OrganizationMember"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_customerId_idx" ON "HelpdeskTicket"("customerId");

-- CreateIndex
CREATE INDEX "HelpdeskTicket_organizationId_idx" ON "HelpdeskTicket"("organizationId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_organizationId_idx" ON "Order"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_customerId_idx" ON "Lead"("customerId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Interaction_customerId_idx" ON "Interaction"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerExternalIdentity" ADD CONSTRAINT "CustomerExternalIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskTicket" ADD CONSTRAINT "HelpdeskTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
