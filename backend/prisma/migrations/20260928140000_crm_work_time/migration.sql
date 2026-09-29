CREATE TABLE "CrmWorkSession" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "departmentId" TEXT,
 "timezone" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 1,
 CONSTRAINT "CrmWorkSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkSession_values_check" CHECK ("version">0 AND ("endedAt" IS NULL OR "endedAt">="startedAt"))
);
CREATE INDEX "CrmWorkSession_employeeId_startedAt_idx" ON "CrmWorkSession"("employeeId","startedAt");
CREATE UNIQUE INDEX "CrmWorkSession_one_open_employee" ON "CrmWorkSession"("employeeId") WHERE "endedAt" IS NULL;
CREATE TABLE "CrmWorkBreak" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3),
 CONSTRAINT "CrmWorkBreak_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CrmWorkSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkBreak_values_check" CHECK ("endedAt" IS NULL OR "endedAt">="startedAt")
);
CREATE INDEX "CrmWorkBreak_sessionId_startedAt_idx" ON "CrmWorkBreak"("sessionId","startedAt");
CREATE UNIQUE INDEX "CrmWorkBreak_one_open_session" ON "CrmWorkBreak"("sessionId") WHERE "endedAt" IS NULL;
CREATE TABLE "CrmWorkTimeEvent" (
 "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "action" TEXT NOT NULL,
 "version" INTEGER NOT NULL, "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmWorkTimeEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CrmWorkSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkTimeEvent_action_check" CHECK ("action" IN ('START','PAUSE','RESUME','FINISH'))
);
CREATE UNIQUE INDEX "CrmWorkTimeEvent_actorId_requestKey_key" ON "CrmWorkTimeEvent"("actorId","requestKey");
CREATE UNIQUE INDEX "CrmWorkTimeEvent_sessionId_version_key" ON "CrmWorkTimeEvent"("sessionId","version");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70690928-1400-4000-8000-000000000001','work_time.read','work_time','read','Просмотр своего фактического рабочего времени'),
 ('70690928-1400-4000-8000-000000000002','work_time.track','work_time','track','Начало, перерывы и завершение своего рабочего дня')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id FROM "Permission" p CROSS JOIN (VALUES
 ('ADMIN'),('EXECUTIVE'),('SUPERVISOR'),('MANAGER_SALES'),('MANAGER_B2B'),('MARKETPLACE_MANAGER'),('CONTENT_MANAGER'),('IT_SUPPORT'),('WAREHOUSE'),('CURATOR')) roles(role)
 WHERE p.key IN ('work_time.read','work_time.track') ON CONFLICT DO NOTHING;
