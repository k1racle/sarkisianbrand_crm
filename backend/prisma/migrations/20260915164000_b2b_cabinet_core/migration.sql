CREATE TYPE "B2BClientStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "B2BBookingStatus" AS ENUM ('NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

ALTER TABLE "Organization" ADD COLUMN "external1CId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "lastSync1CAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Organization_external1CId_key" ON "Organization"("external1CId");

CREATE TABLE "B2BClient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthday" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" "B2BClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentPersonalDataAt" TIMESTAMP(3),
    "lastVisitAt" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2BClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2BService" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f8604a',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2BService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "B2BBooking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "masterMemberId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "B2BBookingStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "B2BBooking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "B2BClient_organizationId_status_idx" ON "B2BClient"("organizationId", "status");
CREATE INDEX "B2BClient_organizationId_phone_idx" ON "B2BClient"("organizationId", "phone");
CREATE INDEX "B2BClient_organizationId_email_idx" ON "B2BClient"("organizationId", "email");
CREATE INDEX "B2BClient_organizationId_lastVisitAt_idx" ON "B2BClient"("organizationId", "lastVisitAt");
CREATE INDEX "B2BService_organizationId_isActive_idx" ON "B2BService"("organizationId", "isActive");
CREATE INDEX "B2BBooking_organizationId_startTime_idx" ON "B2BBooking"("organizationId", "startTime");
CREATE INDEX "B2BBooking_organizationId_status_idx" ON "B2BBooking"("organizationId", "status");
CREATE INDEX "B2BBooking_clientId_startTime_idx" ON "B2BBooking"("clientId", "startTime");
CREATE INDEX "B2BBooking_masterMemberId_startTime_idx" ON "B2BBooking"("masterMemberId", "startTime");

ALTER TABLE "B2BClient" ADD CONSTRAINT "B2BClient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BService" ADD CONSTRAINT "B2BService_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "B2BClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "B2BService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_masterMemberId_fkey" FOREIGN KEY ("masterMemberId") REFERENCES "OrganizationMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
