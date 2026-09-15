-- Canonical order source for every sales channel.
CREATE TYPE "OrderSource" AS ENUM ('WEB', 'B2B', 'WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET', 'MANUAL', 'ONE_C');

ALTER TABLE "Order"
  ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'WEB',
  ADD COLUMN "externalOrderId" TEXT,
  ADD COLUMN "buyerName" TEXT,
  ADD COLUMN "buyerEmail" TEXT,
  ADD COLUMN "buyerPhone" TEXT,
  ADD COLUMN "sourcePayload" JSONB,
  ADD COLUMN "deliveryDate" TIMESTAMP(3);

ALTER TABLE "MarketplaceOrder"
  ADD COLUMN "buyerEmail" TEXT,
  ADD COLUMN "buyerExternalId" TEXT,
  ADD COLUMN "canonicalOrderId" TEXT;

ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD COLUMN "externalSku" TEXT, ADD COLUMN "offerId" TEXT;
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Order"
SET "source" = CASE
  WHEN "sourceChannel" IN ('B2B', 'WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET', 'MANUAL', 'ONE_C')
    THEN "sourceChannel"::"OrderSource"
  ELSE 'WEB'::"OrderSource"
END,
"externalOrderId" = "externalId";

CREATE INDEX "Order_source_status_idx" ON "Order"("source", "status");
CREATE UNIQUE INDEX "Order_source_externalOrderId_key" ON "Order"("source", "externalOrderId");
CREATE UNIQUE INDEX "MarketplaceOrder_canonicalOrderId_key" ON "MarketplaceOrder"("canonicalOrderId");

-- Create Customer 360 records for marketplace buyers when a stable contact exists.
INSERT INTO "Customer" (
  "id", "firstName", "email", "phone", "normalizedEmail", "normalizedPhone",
  "status", "segment", "source", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || src."identity")::uuid::text,
  src."buyerName", src."buyerEmail", src."buyerPhone", src."normalizedEmail", src."normalizedPhone",
  'ACTIVE'::"CustomerStatus", 'B2C', src."channel"::text, src."createdAt", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (COALESCE(lower(trim(m."buyerEmail")), NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '')))
    m."buyerName", m."buyerEmail", m."buyerPhone", m."channel", m."createdAt",
    lower(trim(m."buyerEmail")) AS "normalizedEmail",
    NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '') AS "normalizedPhone",
    COALESCE(lower(trim(m."buyerEmail")), NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '')) AS "identity"
  FROM "MarketplaceOrder" m
  WHERE m."buyerEmail" IS NOT NULL OR NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '') IS NOT NULL
  ORDER BY COALESCE(lower(trim(m."buyerEmail")), NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '')), m."createdAt" DESC
) src
WHERE NOT EXISTS (
  SELECT 1 FROM "Customer" c
  WHERE (src."normalizedEmail" IS NOT NULL AND c."normalizedEmail" = src."normalizedEmail")
     OR (src."normalizedPhone" IS NOT NULL AND c."normalizedPhone" = src."normalizedPhone")
);

-- Normalize all existing staging marketplace records into the canonical OMS.
INSERT INTO "Order" (
  "id", "orderNumber", "customerId", "status", "source", "externalOrderId",
  "buyerName", "buyerEmail", "buyerPhone", "sourcePayload", "deliveryDate",
  "totalAmount", "discountAmount", "finalAmount", "currency", "shippingAddress",
  "shippingProvider", "shippingCost", "trackingNumber", "paymentStatus", "sourceChannel",
  "internalNotes", "isSynced1C", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || m."id")::uuid::text,
  'MP-' || substr(md5(m."channel"::text || ':' || m."externalId"), 1, 12),
  customer_match."id",
  CASE m."status"
    WHEN 'CONFIRMED' THEN 'CONFIRMED'::"OrderStatus"
    WHEN 'ASSEMBLING' THEN 'ASSEMBLING'::"OrderStatus"
    WHEN 'SHIPPED' THEN 'SHIPPED'::"OrderStatus"
    WHEN 'DELIVERED' THEN 'DELIVERED'::"OrderStatus"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"OrderStatus"
    WHEN 'RETURNED' THEN 'REFUNDED'::"OrderStatus"
    ELSE 'NEW'::"OrderStatus"
  END,
  m."channel"::text::"OrderSource", m."externalId", m."buyerName", m."buyerEmail", m."buyerPhone",
  jsonb_build_object('items', m."items", 'payload', m."payload", 'stagingId', m."id"),
  m."deliveryDate", m."totalAmount", 0, m."totalAmount", m."currency", '{}'::jsonb,
  m."channel"::text, 0, m."trackingNumber", 'MARKETPLACE', m."channel"::text,
  m."internalNote", false, m."createdAt", m."updatedAt"
FROM "MarketplaceOrder" m
LEFT JOIN LATERAL (
  SELECT c."id" FROM "Customer" c
  WHERE (m."buyerEmail" IS NOT NULL AND c."normalizedEmail" = lower(trim(m."buyerEmail")))
     OR (NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), '') IS NOT NULL
       AND c."normalizedPhone" = NULLIF(regexp_replace(COALESCE(m."buyerPhone", ''), '\D', '', 'g'), ''))
  ORDER BY c."createdAt" ASC LIMIT 1
) customer_match ON true
ON CONFLICT ("source", "externalOrderId") DO NOTHING;

UPDATE "MarketplaceOrder" m
SET "canonicalOrderId" = o."id"
FROM "Order" o
WHERE o."source"::text = m."channel"::text AND o."externalOrderId" = m."externalId";

INSERT INTO "OrderStatusHistory" ("id", "orderId", "toStatus", "comment", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || o."id")::uuid::text, o."id", o."status",
  'Импортирован из staging-слоя маркетплейса', o."createdAt"
FROM "Order" o
WHERE o."source" IN ('WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET')
  AND NOT EXISTS (SELECT 1 FROM "OrderStatusHistory" h WHERE h."orderId" = o."id");

ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_canonicalOrderId_fkey"
  FOREIGN KEY ("canonicalOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
