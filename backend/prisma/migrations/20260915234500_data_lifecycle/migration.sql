CREATE TYPE "DataEntityType" AS ENUM ('USER', 'CUSTOMER', 'ORGANIZATION', 'PRODUCT', 'CATEGORY', 'LEAD', 'TASK', 'HELPDESK_TICKET', 'B2B_CLIENT', 'B2B_SERVICE', 'BOT_COMMAND');
CREATE TYPE "TrashEntryStatus" AS ENUM ('TRASHED', 'RESTORED', 'PURGED');

CREATE TABLE "DataTrashEntry" (
  "id" TEXT NOT NULL,
  "entityType" "DataEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "previousState" JSONB NOT NULL,
  "dependencySummary" JSONB NOT NULL,
  "status" "TrashEntryStatus" NOT NULL DEFAULT 'TRASHED',
  "reason" TEXT,
  "actorId" TEXT,
  "trashedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purgeAfter" TIMESTAMP(3) NOT NULL,
  "restoredAt" TIMESTAMP(3),
  "purgedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataTrashEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataTrashEntry_status_purgeAfter_idx" ON "DataTrashEntry"("status", "purgeAfter");
CREATE INDEX "DataTrashEntry_entityType_entityId_status_idx" ON "DataTrashEntry"("entityType", "entityId", "status");
CREATE INDEX "DataTrashEntry_actorId_trashedAt_idx" ON "DataTrashEntry"("actorId", "trashedAt");

ALTER TABLE "DataTrashEntry"
  ADD CONSTRAINT "DataTrashEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
