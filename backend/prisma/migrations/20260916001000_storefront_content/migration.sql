CREATE TABLE "StorefrontSetting" (
  "key" TEXT NOT NULL DEFAULT 'main',
  "announcementText" TEXT NOT NULL DEFAULT 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorefrontSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "StorefrontBanner" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "subtitle" TEXT,
  "buttonLabel" TEXT DEFAULT 'Перейти в каталог',
  "linkUrl" TEXT DEFAULT '/catalog',
  "imageUrl" TEXT NOT NULL,
  "mobileImageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorefrontBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StorefrontBanner_isActive_sortOrder_idx" ON "StorefrontBanner"("isActive", "sortOrder");

INSERT INTO "StorefrontSetting" ("key", "announcementText", "updatedAt")
VALUES ('main', 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян', CURRENT_TIMESTAMP);

INSERT INTO "StorefrontBanner" ("id", "title", "subtitle", "buttonLabel", "linkUrl", "imageUrl", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, NULL, NULL, 'Перейти в каталог', '/catalog', '/storefront/hero.jpg', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
