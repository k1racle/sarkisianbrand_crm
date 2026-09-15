ALTER TABLE "Order"
ADD COLUMN "oneCStatus" TEXT,
ADD COLUMN "oneCSyncAt" TIMESTAMP(3),
ADD COLUMN "oneCSyncError" TEXT,
ADD COLUMN "warehouseDocumentId" TEXT,
ADD COLUMN "pickingStartedAt" TIMESTAMP(3),
ADD COLUMN "pickedAt" TIMESTAMP(3),
ADD COLUMN "packedAt" TIMESTAMP(3);

CREATE INDEX "Order_isSynced1C_source_idx" ON "Order"("isSynced1C", "source");
CREATE INDEX "Order_warehouseDocumentId_idx" ON "Order"("warehouseDocumentId");
