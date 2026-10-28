CREATE TABLE "MarketplaceSyncCursor" (
  "key" TEXT PRIMARY KEY,
  "actorId" TEXT,
  "state" JSONB,
  "leaseId" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "lastError" TEXT,
  "lastSuccessAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "MarketplaceVariantMapping" (
  "channel" TEXT NOT NULL,
  "externalVariantId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("channel", "externalVariantId")
);
CREATE INDEX "MarketplaceVariantMapping_variantId_idx" ON "MarketplaceVariantMapping"("variantId");
