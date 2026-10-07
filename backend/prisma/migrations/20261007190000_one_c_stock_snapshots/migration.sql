CREATE TABLE "OneCStockSnapshot" (
  "variantId" TEXT NOT NULL PRIMARY KEY REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "warehouseId" TEXT NOT NULL,
  "externalProductId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "stock" INTEGER NOT NULL CHECK ("stock" >= 0),
  "damagedStock" INTEGER NOT NULL CHECK ("damagedStock" >= 0),
  "asOf" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadHash" TEXT NOT NULL,
  "includedOperationIds" JSONB NOT NULL,
  CONSTRAINT "OneCStockSnapshot_validity" CHECK ("validUntil" > "asOf")
);
