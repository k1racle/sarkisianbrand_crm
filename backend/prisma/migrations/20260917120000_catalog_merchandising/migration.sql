ALTER TABLE "StorefrontSetting" ADD COLUMN "categoryTreeRevision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "productBadges" JSONB, ADD COLUMN "productBadgesRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "badgeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ProductVariant" ADD COLUMN "salePrice" DECIMAL(15,2), ADD COLUMN "saleStartsAt" TIMESTAMP(3), ADD COLUMN "saleEndsAt" TIMESTAMP(3);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_sale_valid" CHECK (
  ("salePrice" IS NULL OR "salePrice" >= 0) AND
  ("saleStartsAt" IS NULL OR "saleEndsAt" IS NULL OR "saleStartsAt" < "saleEndsAt")
);
