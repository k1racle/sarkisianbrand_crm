ALTER TABLE "User" ADD COLUMN "accessProfileMode" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "accessVersion" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "CrmAccessAssignment" (
 "userId" TEXT NOT NULL, "profileId" TEXT NOT NULL, "profileVersion" INTEGER NOT NULL,
 "snapshot" JSONB NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmAccessAssignment_pkey" PRIMARY KEY ("userId", "profileId"),
 CONSTRAINT "CrmAccessAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CrmAccessAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CrmAccessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CrmAccessAssignment_profileId_idx" ON "CrmAccessAssignment"("profileId");
