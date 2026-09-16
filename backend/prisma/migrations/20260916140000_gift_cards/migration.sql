-- Additive only: existing physical products/orders retain their semantics.
ALTER TABLE "Product" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'PHYSICAL', ADD COLUMN "giftCardValidityDays" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'PHYSICAL', ADD COLUMN "giftCardValidityDays" INTEGER;
ALTER TABLE "Order" ADD COLUMN "giftCardAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00;

CREATE TABLE "GiftCard" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "encryptedCode" TEXT NOT NULL,
  "maskedCode" TEXT NOT NULL,
  "faceValue" DECIMAL(15,2) NOT NULL,
  "balance" DECIMAL(15,2) NOT NULL,
  "reserved" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  "currency" "Currency" NOT NULL DEFAULT 'RUB',
  "validityDays" INTEGER NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "sourceOrderId" TEXT,
  "sourceItemId" TEXT,
  "ordinal" INTEGER,
  "purchaserUserId" TEXT,
  "label" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCard_money_check" CHECK ("faceValue" > 0 AND "faceValue" <= 100000000 AND "balance" >= 0 AND "balance" <= "faceValue" AND "reserved" >= 0 AND "reserved" <= "balance"),
  CONSTRAINT "GiftCard_validity_check" CHECK ("validityDays" BETWEEN 1 AND 3650 AND "expiresAt" > "issuedAt" AND "currency" = 'RUB' AND "revision" > 0),
  CONSTRAINT "GiftCard_source_check" CHECK (("sourceItemId" IS NULL AND "ordinal" IS NULL) OR ("sourceItemId" IS NOT NULL AND "sourceOrderId" IS NOT NULL AND "ordinal" BETWEEN 1 AND 99))
);
CREATE UNIQUE INDEX "GiftCard_codeHash_key" ON "GiftCard"("codeHash");
CREATE UNIQUE INDEX "GiftCard_sourceItemId_ordinal_key" ON "GiftCard"("sourceItemId", "ordinal");
CREATE INDEX "GiftCard_sourceOrderId_idx" ON "GiftCard"("sourceOrderId");
CREATE INDEX "GiftCard_isActive_expiresAt_idx" ON "GiftCard"("isActive", "expiresAt");
CREATE INDEX "GiftCard_createdAt_idx" ON "GiftCard"("createdAt");
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GiftCardRedemption" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "appliedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardRedemption_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "GiftCardRedemption_status_check" CHECK ("status" IN ('RESERVED', 'APPLIED', 'RELEASED'))
);
CREATE UNIQUE INDEX "GiftCardRedemption_orderId_key" ON "GiftCardRedemption"("orderId");
CREATE INDEX "GiftCardRedemption_cardId_status_idx" ON "GiftCardRedemption"("cardId", "status");
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
