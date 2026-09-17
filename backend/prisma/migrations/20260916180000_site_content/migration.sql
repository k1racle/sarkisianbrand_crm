ALTER TABLE "StorefrontSetting" ADD COLUMN "siteContent" JSONB,
  ADD COLUMN "siteContentRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StorefrontSetting" ADD CONSTRAINT "StorefrontSetting_siteContentRevision_check" CHECK ("siteContentRevision" >= 0);

CREATE TABLE "SiteContentRevision" (
  "id" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteContentRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteContentRevision_revision_check" CHECK ("revision" >= 0),
  CONSTRAINT "SiteContentRevision_snapshot_check" CHECK (jsonb_typeof("snapshot") = 'object')
);
CREATE UNIQUE INDEX "SiteContentRevision_revision_key" ON "SiteContentRevision"("revision");
CREATE INDEX "SiteContentRevision_createdAt_idx" ON "SiteContentRevision"("createdAt");
ALTER TABLE "SiteContentRevision" ADD CONSTRAINT "SiteContentRevision_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
