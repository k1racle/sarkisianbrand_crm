CREATE TABLE "StorefrontMenuItem" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "newTab" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorefrontMenuItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StorefrontMenuItem_isActive_sortOrder_idx" ON "StorefrontMenuItem"("isActive", "sortOrder");
INSERT INTO "StorefrontMenuItem" ("id", "label", "url", "sortOrder", "updatedAt") VALUES
  ('d90916a0-0000-4000-8000-000000000001', 'О бренде', '/#about', 0, CURRENT_TIMESTAMP),
  ('d90916a0-0000-4000-8000-000000000002', 'Доставка и оплата', '/#delivery', 1, CURRENT_TIMESTAMP),
  ('d90916a0-0000-4000-8000-000000000003', 'Контакты', '/#contacts', 2, CURRENT_TIMESTAMP);
