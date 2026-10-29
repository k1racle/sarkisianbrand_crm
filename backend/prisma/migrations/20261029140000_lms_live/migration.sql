CREATE TABLE "LmsLiveSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "courseId" TEXT NOT NULL REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "lessonId" TEXT NOT NULL REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "hostId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LmsLiveSession_courseId_lessonId_startsAt_idx" ON "LmsLiveSession"("courseId", "lessonId", "startsAt");
CREATE TABLE "LmsLiveMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "LmsLiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LmsLiveMessage_sessionId_createdAt_id_idx" ON "LmsLiveMessage"("sessionId", "createdAt", "id");
