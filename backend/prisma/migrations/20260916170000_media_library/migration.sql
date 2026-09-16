-- Shared raster asset index. No backfill, file operations or existing settings modifications.
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAsset_raster_check" CHECK ("mime" IN ('image/jpeg','image/png','image/webp','image/avif') AND "size" > 0 AND "size" <= 8388608),
  CONSTRAINT "MediaAsset_dimensions_check" CHECK (("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0))
);
CREATE UNIQUE INDEX "MediaAsset_filename_key" ON "MediaAsset"("filename");
CREATE INDEX "MediaAsset_createdAt_id_idx" ON "MediaAsset"("createdAt", "id");
CREATE INDEX "MediaAsset_createdById_idx" ON "MediaAsset"("createdById");
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dedicated shared-media capabilities only. Preserve existing grants and user DENY overrides.
INSERT INTO "Permission" ("id", "key", "resource", "action", "description") VALUES
  (gen_random_uuid()::text, 'media.read', 'media', 'read', 'Просмотр общей медиатеки'),
  (gen_random_uuid()::text, 'media.write', 'media', 'write', 'Загрузка изображений в общую медиатеку')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role", "permissionId")
SELECT role_name::"UserRole", permission."id"
FROM (VALUES ('ADMIN'), ('CONTENT_MANAGER'), ('MANAGER_SALES'), ('MANAGER_B2B'),
  ('MARKETPLACE_MANAGER'), ('SUPERVISOR'), ('EXECUTIVE'), ('IT_SUPPORT'), ('WAREHOUSE'), ('CURATOR')) AS roles(role_name)
CROSS JOIN "Permission" permission
WHERE permission."key" IN ('media.read', 'media.write')
ON CONFLICT ("role", "permissionId") DO NOTHING;
