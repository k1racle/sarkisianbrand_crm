CREATE TABLE "CrmDepartment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "leaderId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmDepartment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;
CREATE INDEX "CrmDepartment_parentId_idx" ON "CrmDepartment"("parentId");
CREATE INDEX "CrmDepartment_archivedAt_idx" ON "CrmDepartment"("archivedAt");
ALTER TABLE "CrmDepartment" ADD CONSTRAINT "CrmDepartment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmDepartment" ADD CONSTRAINT "CrmDepartment_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
