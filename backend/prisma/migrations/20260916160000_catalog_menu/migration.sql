-- Additive; does not rewrite announcement or other storefront settings.
ALTER TABLE "StorefrontSetting"
  ADD COLUMN "catalogMenu" JSONB,
  ADD COLUMN "catalogMenuRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StorefrontSetting" ADD CONSTRAINT "StorefrontSetting_catalogMenuRevision_check" CHECK ("catalogMenuRevision" >= 0);
