ALTER TABLE "OrganizationMember" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "BusinessTeamInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrganizationMemberRole" NOT NULL,
  "canOrder" BOOLEAN NOT NULL DEFAULT false,
  "canSeeFinance" BOOLEAN NOT NULL DEFAULT false,
  "tokenHash" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessTeamInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessTeamInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BusinessTeamInvitation_status_check" CHECK ("status" IN ('PENDING','ACCEPTED','REVOKED')),
  CONSTRAINT "BusinessTeamInvitation_role_check" CHECK ("role" IN ('EMPLOYEE','BUYER','ACCOUNTANT'))
);
CREATE UNIQUE INDEX "BusinessTeamInvitation_tokenHash_key" ON "BusinessTeamInvitation"("tokenHash");
CREATE UNIQUE INDEX "BusinessTeamInvitation_organizationId_requestKey_key" ON "BusinessTeamInvitation"("organizationId","requestKey");
CREATE INDEX "BusinessTeamInvitation_organizationId_status_createdAt_idx" ON "BusinessTeamInvitation"("organizationId","status","createdAt");
CREATE INDEX "BusinessTeamInvitation_email_status_expiresAt_idx" ON "BusinessTeamInvitation"("email","status","expiresAt");
