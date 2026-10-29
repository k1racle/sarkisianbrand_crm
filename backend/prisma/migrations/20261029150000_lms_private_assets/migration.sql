ALTER TABLE "Lesson" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "CourseAsset" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseAsset_storageKey_key" ON "CourseAsset"("storageKey");
CREATE INDEX "CourseAsset_lessonId_createdAt_idx" ON "CourseAsset"("lessonId", "createdAt");
ALTER TABLE "CourseAsset" ADD CONSTRAINT "CourseAsset_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
