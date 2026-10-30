CREATE TABLE "LmsCertificate" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "courseTitle" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LmsCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LmsCertificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LmsCertificate_enrollmentId_key" ON "LmsCertificate"("enrollmentId");
CREATE INDEX "LmsCertificate_userId_courseId_idx" ON "LmsCertificate"("userId", "courseId");
