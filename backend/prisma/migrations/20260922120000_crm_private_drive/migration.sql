CREATE TABLE "CrmDriveNode" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL,
  "scope" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "parentId" TEXT,
  "storageKey" TEXT, "mime" TEXT, "size" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3), "trashBatch" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmDriveNode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmDriveNode_kind_check" CHECK ("kind" IN ('FILE','FOLDER')),
  CONSTRAINT "CrmDriveNode_scope_check" CHECK ("scope" IN ('PERSONAL','TEAM')),
  CONSTRAINT "CrmDriveNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CrmDriveNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmDriveNode_storageKey_key" ON "CrmDriveNode"("storageKey");
CREATE INDEX "CrmDriveNode_scope_ownerId_parentId_deletedAt_idx" ON "CrmDriveNode"("scope","ownerId","parentId","deletedAt");
CREATE INDEX "CrmDriveNode_trashBatch_idx" ON "CrmDriveNode"("trashBatch");
CREATE UNIQUE INDEX "CrmDriveNode_live_name_key" ON "CrmDriveNode"("scope", (CASE WHEN "scope" = 'TEAM' THEN '' ELSE "ownerId" END), COALESCE("parentId", ''), lower("name")) WHERE "deletedAt" IS NULL;
CREATE TABLE "CrmTaskFile" (
  "taskId" TEXT NOT NULL, "nodeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmTaskFile_pkey" PRIMARY KEY ("taskId","nodeId"),
  CONSTRAINT "CrmTaskFile_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmTaskFile_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CrmDriveNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
