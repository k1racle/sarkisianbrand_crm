ALTER TABLE "Order" ADD COLUMN "fulfillmentManaged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "shippedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_execution_quantities_check"
  CHECK ("pickedQuantity" >= 0 AND "shippedQuantity" >= 0 AND "shippedQuantity" <= "pickedQuantity" AND "pickedQuantity" <= quantity);
CREATE TABLE "OrderExecution" (
  "orderId" TEXT PRIMARY KEY REFERENCES "Order"(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  "snapshotHash" TEXT NOT NULL,
  "paymentTerms" TEXT NOT NULL,
  "deliveryTerms" TEXT NOT NULL,
  "confirmedBy" TEXT NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "OrderExecutionOperation" (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "requestKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  kind TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  lines JSONB NOT NULL,
  "trackingNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "OrderExecutionOperation_orderId_requestKey_key" ON "OrderExecutionOperation"("orderId", "requestKey");
CREATE INDEX "OrderExecutionOperation_orderId_createdAt_idx" ON "OrderExecutionOperation"("orderId", "createdAt");
