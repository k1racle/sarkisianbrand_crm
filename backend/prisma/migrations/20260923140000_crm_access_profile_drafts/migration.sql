-- Additive preparation only. Existing users, sessions, roles and overrides stay unchanged.
CREATE TYPE "CrmAccessScope" AS ENUM ('OWN', 'PARTICIPATING', 'DEPARTMENT', 'DEPARTMENT_TREE', 'SELECTED_DEPARTMENTS', 'COMPANY');
CREATE TABLE "CrmAccessProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmAccessProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmAccessProfile_version_positive" CHECK ("version" > 0)
);
CREATE TABLE "CrmAccessProfileGrant" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "scope" "CrmAccessScope" NOT NULL,
  CONSTRAINT "CrmAccessProfileGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmAccessProfileGrant_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CrmAccessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmAccessProfileGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "CrmAccessGrantDepartment" (
  "grantId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  CONSTRAINT "CrmAccessGrantDepartment_pkey" PRIMARY KEY ("grantId", "departmentId"),
  CONSTRAINT "CrmAccessGrantDepartment_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CrmAccessProfileGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmAccessGrantDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmAccessProfile_normalizedName_key" ON "CrmAccessProfile"("normalizedName");
CREATE INDEX "CrmAccessProfile_archivedAt_name_idx" ON "CrmAccessProfile"("archivedAt", "name");
CREATE UNIQUE INDEX "CrmAccessProfileGrant_profileId_permissionId_key" ON "CrmAccessProfileGrant"("profileId", "permissionId");
CREATE INDEX "CrmAccessProfileGrant_permissionId_idx" ON "CrmAccessProfileGrant"("permissionId");
CREATE INDEX "CrmAccessGrantDepartment_departmentId_idx" ON "CrmAccessGrantDepartment"("departmentId");
