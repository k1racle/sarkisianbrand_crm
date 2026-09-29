ALTER TABLE "CrmWorkTimeEvent" ADD COLUMN "beforeSnapshot" JSONB, ADD COLUMN "afterSnapshot" JSONB;
ALTER TABLE "CrmWorkTimeEvent" DROP CONSTRAINT "CrmWorkTimeEvent_action_check";
ALTER TABLE "CrmWorkTimeEvent" ADD CONSTRAINT "CrmWorkTimeEvent_action_check" CHECK ("action" IN ('START','PAUSE','RESUME','FINISH','CORRECTED','MANUAL'));
CREATE TABLE "CrmWorkTimeCorrection" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "departmentId" TEXT, "sessionId" TEXT, "baseVersion" INTEGER,
 "timezone" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3) NOT NULL, "breaks" JSONB NOT NULL, "original" JSONB,
 "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "version" INTEGER NOT NULL DEFAULT 1,
 "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "reviewerId" TEXT, "reviewerName" TEXT, "reviewNote" TEXT, "reviewRequestKey" TEXT,
 "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmWorkTimeCorrection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkTimeCorrection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CrmWorkSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkTimeCorrection_values_check" CHECK ("endedAt">"startedAt" AND "version">0 AND ("baseVersion" IS NULL OR "baseVersion">0)),
 CONSTRAINT "CrmWorkTimeCorrection_status_check" CHECK ("status" IN ('PENDING','APPROVED','REJECTED','CANCELLED'))
);
CREATE UNIQUE INDEX "CrmWorkTimeCorrection_employeeId_requestKey_key" ON "CrmWorkTimeCorrection"("employeeId","requestKey");
CREATE UNIQUE INDEX "CrmWorkTimeCorrection_reviewerId_reviewRequestKey_key" ON "CrmWorkTimeCorrection"("reviewerId","reviewRequestKey");
CREATE UNIQUE INDEX "CrmWorkTimeCorrection_one_pending_session" ON "CrmWorkTimeCorrection"("sessionId") WHERE "status"='PENDING' AND "sessionId" IS NOT NULL;
CREATE INDEX "CrmWorkTimeCorrection_employeeId_createdAt_idx" ON "CrmWorkTimeCorrection"("employeeId","createdAt");
CREATE INDEX "CrmWorkTimeCorrection_status_departmentId_createdAt_idx" ON "CrmWorkTimeCorrection"("status","departmentId","createdAt");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70690928-1600-4000-8000-000000000001','work_time.review','work_time','review','Проверка исправлений рабочего времени и незакрытых дней команды') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('EXECUTIVE'),('SUPERVISOR')) roles(role)
 WHERE p.key='work_time.review' ON CONFLICT DO NOTHING;
