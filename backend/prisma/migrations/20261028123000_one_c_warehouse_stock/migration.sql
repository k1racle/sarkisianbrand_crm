CREATE TABLE "OneCWarehouseStock" (
  "variantId" TEXT PRIMARY KEY REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "warehouseId" TEXT NOT NULL,
  "externalProductId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "stock" INTEGER NOT NULL CHECK ("stock" >= 0),
  "damagedStock" INTEGER NOT NULL CHECK ("damagedStock" >= 0),
  "reserved1C" INTEGER NOT NULL CHECK ("reserved1C" >= 0),
  "localPending" INTEGER NOT NULL CHECK ("localPending" >= 0),
  "asOf" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadHash" TEXT NOT NULL,
  "coveredEventIds" JSONB NOT NULL
);

CREATE TABLE "OneCWarehouseCoverage" (
  "orderItemId" TEXT PRIMARY KEY REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "eventId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "reserved" INTEGER NOT NULL CHECK ("reserved" >= 0),
  "shipped" INTEGER NOT NULL CHECK ("shipped" >= 0),
  "cancelled" INTEGER NOT NULL CHECK ("cancelled" >= 0)
);
CREATE INDEX "OneCWarehouseCoverage_eventId_idx" ON "OneCWarehouseCoverage"("eventId");
