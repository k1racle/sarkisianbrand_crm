CREATE TABLE "CrmWorkSchedule" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "departmentId" TEXT, "departmentName" TEXT NOT NULL DEFAULT '',
 "kind" TEXT NOT NULL, "startLocal" TEXT NOT NULL, "endLocal" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
 "breakMinutes" INTEGER NOT NULL DEFAULT 0, "plannedMinutes" INTEGER NOT NULL DEFAULT 0, "note" TEXT NOT NULL DEFAULT '',
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1, "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmWorkSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkSchedule_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkSchedule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkSchedule_values_check" CHECK ("version">0 AND "endsAt">"startsAt" AND "endLocal">"startLocal" AND "breakMinutes">=0 AND "plannedMinutes">=0),
 CONSTRAINT "CrmWorkSchedule_kind_check" CHECK ("kind" IN ('SHIFT','DAY_OFF','ABSENCE')),
 CONSTRAINT "CrmWorkSchedule_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','CANCELLED'))
);
CREATE UNIQUE INDEX "CrmWorkSchedule_creatorId_requestKey_key" ON "CrmWorkSchedule"("creatorId","requestKey");
CREATE INDEX "CrmWorkSchedule_employeeId_startsAt_endsAt_idx" ON "CrmWorkSchedule"("employeeId","startsAt","endsAt");
CREATE INDEX "CrmWorkSchedule_departmentId_startLocal_idx" ON "CrmWorkSchedule"("departmentId","startLocal");
CREATE TABLE "CrmWorkScheduleEvent" (
 "id" TEXT PRIMARY KEY, "scheduleId" TEXT NOT NULL, "version" INTEGER NOT NULL, "action" TEXT NOT NULL,
 "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "reason" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmWorkScheduleEvent_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "CrmWorkSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmWorkScheduleEvent_scheduleId_version_key" ON "CrmWorkScheduleEvent"("scheduleId","version");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70690924-1700-4000-8000-000000000001','work_schedule.read','work_schedule','read','Просмотр своего графика и разрешённых отделов'),
 ('70690924-1700-4000-8000-000000000002','work_schedule.write','work_schedule','write','Подготовка графиков в разрешённых отделах'),
 ('70690924-1700-4000-8000-000000000003','work_schedule.publish','work_schedule','publish','Публикация и отмена графиков в разрешённых отделах')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id FROM "Permission" p CROSS JOIN (VALUES
 ('ADMIN'),('EXECUTIVE'),('SUPERVISOR'),('MANAGER_SALES'),('MANAGER_B2B'),('MARKETPLACE_MANAGER'),('CONTENT_MANAGER'),('IT_SUPPORT'),('WAREHOUSE'),('CURATOR')) roles(role)
 WHERE p.key='work_schedule.read' ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT roles.role::"UserRole",p.id FROM "Permission" p CROSS JOIN (VALUES ('ADMIN'),('SUPERVISOR')) roles(role)
 WHERE p.resource='work_schedule' AND p.action IN ('write','publish') ON CONFLICT DO NOTHING;
