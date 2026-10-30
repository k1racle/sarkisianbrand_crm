CREATE TABLE "LmsLessonQuiz" (
  "lessonId" TEXT NOT NULL,
  "draftData" JSONB,
  "publishedData" JSONB,
  "draftRemoved" BOOLEAN NOT NULL DEFAULT false,
  "hasDraftChanges" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "publishedRevision" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LmsLessonQuiz_pkey" PRIMARY KEY ("lessonId"),
  CONSTRAINT "LmsLessonQuiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "LmsQuizAttempt" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "publishedRevision" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LmsQuizAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LmsQuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LmsQuizAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LmsQuizAttempt_enrollmentId_lessonId_createdAt_idx" ON "LmsQuizAttempt"("enrollmentId", "lessonId", "createdAt");
