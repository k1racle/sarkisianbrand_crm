-- Existing LMS records remain drafts/unverified until deliberately reviewed.
ALTER TABLE "Course" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT', ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Course" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Enrollment" ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED', ADD COLUMN "accessExpiresAt" TIMESTAMP(3);
ALTER TABLE "Lesson" ADD COLUMN "moduleId" TEXT, ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'TEXT', ADD COLUMN "presentationUrl" TEXT, ADD COLUMN "isPreview" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CourseTariff" ("id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "title" TEXT NOT NULL, "price" DECIMAL(15,2) NOT NULL, "accessDays" INTEGER, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CourseTariff_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CourseModule" ("id" TEXT NOT NULL, "courseId" TEXT NOT NULL, "title" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LessonProgress" ("id" TEXT NOT NULL, "enrollmentId" TEXT NOT NULL, "lessonId" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id"));
-- Preserve and surface existing lessons as a draft module, without granting
-- access or publishing legacy courses. No old lesson or content is removed.
INSERT INTO "CourseModule" ("id", "courseId", "title", "sortOrder", "updatedAt")
 SELECT gen_random_uuid()::text, c.id, 'Существующие уроки', 0, CURRENT_TIMESTAMP FROM "Course" c
 WHERE EXISTS (SELECT 1 FROM "Lesson" l WHERE l."courseId" = c.id);
UPDATE "Lesson" l SET "moduleId" = m.id, "kind" = CASE WHEN NULLIF(BTRIM(l."videoUrl"), '') IS NOT NULL THEN 'VIDEO' ELSE 'TEXT' END
 FROM "CourseModule" m WHERE m."courseId" = l."courseId";
CREATE INDEX "CourseTariff_courseId_isActive_idx" ON "CourseTariff"("courseId", "isActive");
CREATE INDEX "CourseModule_courseId_sortOrder_idx" ON "CourseModule"("courseId", "sortOrder");
CREATE INDEX "Lesson_courseId_moduleId_sortOrder_idx" ON "Lesson"("courseId", "moduleId", "sortOrder");
CREATE UNIQUE INDEX "LessonProgress_enrollmentId_lessonId_key" ON "LessonProgress"("enrollmentId", "lessonId");
ALTER TABLE "CourseTariff" ADD CONSTRAINT "CourseTariff_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70661029-1100-4000-8000-000000000001','lms.read','lms','read','Просмотр курсов и учебных материалов'),
 ('70661029-1100-4000-8000-000000000002','lms.write','lms','write','Создание и публикация курсов и тарифов') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT r.role::"UserRole",p.id FROM (VALUES ('ADMIN'),('SUPERVISOR'),('CONTENT_MANAGER')) r(role) CROSS JOIN "Permission" p WHERE p.key IN ('lms.read','lms.write') ON CONFLICT DO NOTHING;
