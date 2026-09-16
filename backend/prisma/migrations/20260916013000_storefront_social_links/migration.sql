CREATE TABLE "StorefrontSocialLink" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "iconKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorefrontSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorefrontSocialLink_isActive_sortOrder_idx" ON "StorefrontSocialLink"("isActive", "sortOrder");

INSERT INTO "StorefrontSocialLink" ("id", "name", "iconKey", "url", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'ВКонтакте', 'vk', 'https://vk.com/', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Telegram', 'telegram', 'https://t.me/', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'MAX', 'max', 'https://max.ru/', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
