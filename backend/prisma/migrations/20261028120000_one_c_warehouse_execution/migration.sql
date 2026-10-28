CREATE TABLE "OneCOrderWarehouse" (
  "orderId" TEXT PRIMARY KEY REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "owner" TEXT NOT NULL DEFAULT 'ONE_C',
  "external1CId" TEXT NOT NULL UNIQUE,
  "warehouseId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "executionVersion" INTEGER,
  "eventId" TEXT NOT NULL UNIQUE,
  "payloadHash" TEXT NOT NULL,
  "basisHash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "documentId" TEXT,
  "documentNumber" TEXT,
  "executorName" TEXT,
  "error" TEXT,
  "lines" JSONB NOT NULL,
  "documents" JSONB NOT NULL,
  CONSTRAINT "OneCOrderWarehouse_validity" CHECK ("validUntil" > "asOf")
);

CREATE TABLE "OneCWarehouseEvent" (
  "eventId" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "payloadHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OneCWarehouseEvent_orderId_revision_key" UNIQUE ("orderId", "revision")
);
CREATE INDEX "OneCWarehouseEvent_orderId_receivedAt_idx" ON "OneCWarehouseEvent"("orderId", "receivedAt");
