BEGIN;
-- Do not infer ownership of existing contacts from orders, authors or B2B membership.
ALTER TABLE "Customer" ADD COLUMN "accountManagerId" TEXT, ADD COLUMN "createdById" TEXT;
ALTER TABLE "Organization" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Customer_accountManagerId_idx" ON "Customer"("accountManagerId");
CREATE INDEX "Customer_createdById_idx" ON "Customer"("createdById");
CREATE INDEX "Organization_createdById_idx" ON "Organization"("createdById");
COMMIT;
