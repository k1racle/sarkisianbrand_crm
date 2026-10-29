-- Older records have no reliable publication history. Treat all as previously
-- published so migration cannot make an already exposed file deletable.
ALTER TABLE "CourseAsset"
  ADD COLUMN "everPublished" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pendingDelete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storageRemovedAt" TIMESTAMP(3);
ALTER TABLE "CourseAsset" ALTER COLUMN "everPublished" SET DEFAULT false;
CREATE INDEX "CourseAsset_pendingDelete_storageRemovedAt_idx" ON "CourseAsset"("pendingDelete", "storageRemovedAt");
