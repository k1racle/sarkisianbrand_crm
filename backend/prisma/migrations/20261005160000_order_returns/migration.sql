ALTER TABLE "ProductVariant" ADD COLUMN "damagedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderExecution" ADD COLUMN "settlementReviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_damagedStock_check" CHECK ("damagedStock" >= 0);
ALTER TABLE "OrderItem" ADD COLUMN "cancelledQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "damagedReturnedQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_returns_check" CHECK (
  "cancelledQuantity" >= 0 AND "cancelledQuantity" + "shippedQuantity" <= quantity
  AND "pickedQuantity" + "cancelledQuantity" <= quantity
  AND "returnedQuantity" >= 0 AND "returnedQuantity" <= "shippedQuantity"
  AND "damagedReturnedQuantity" >= 0 AND "damagedReturnedQuantity" <= "returnedQuantity"
);
ALTER TABLE "OrderExecutionOperation" ADD COLUMN reason TEXT,
  ADD COLUMN "settlementStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
