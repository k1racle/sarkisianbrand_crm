CREATE TABLE "CrmPublication" (
 "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "ideaId" TEXT NOT NULL,
 "platform" TEXT NOT NULL, "format" TEXT NOT NULL,
 "campaign" TEXT NOT NULL DEFAULT '', "brief" TEXT NOT NULL DEFAULT '',
 "script" TEXT NOT NULL DEFAULT '', "caption" TEXT NOT NULL DEFAULT '', "cta" TEXT NOT NULL DEFAULT '',
 "status" TEXT NOT NULL DEFAULT 'IDEA', "scheduledAt" TIMESTAMP(3),
 "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow', "publishedUrl" TEXT NOT NULL DEFAULT '',
 "approvedAt" TIMESTAMP(3), "approvedById" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
 "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmPublication_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CrmPublication_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmPublication_status_check" CHECK ("status" IN ('IDEA','SCRIPT','SHOOTING','EDITING','REVIEW','SCHEDULED','PUBLISHED')),
 CONSTRAINT "CrmPublication_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "CrmPublication_taskId_key" ON "CrmPublication"("taskId");
CREATE INDEX "CrmPublication_archivedAt_scheduledAt_idx" ON "CrmPublication"("archivedAt","scheduledAt");
CREATE INDEX "CrmPublication_ideaId_idx" ON "CrmPublication"("ideaId");
CREATE INDEX "CrmPublication_status_platform_idx" ON "CrmPublication"("status","platform");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('a0494475-0c00-4aba-aeec-000000000001','content_plan.read','content_plan','read','Просмотр контент-плана и командных материалов'),
 ('a0494475-0c00-4aba-aeec-000000000002','content_plan.write','content_plan','write','Подготовка публикаций и загрузка командных материалов'),
 ('a0494475-0c00-4aba-aeec-000000000003','content_plan.approve','content_plan','approve','Согласование публикаций')
 ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId")
 SELECT r.role::"UserRole",p.id FROM (VALUES ('ADMIN'),('SUPERVISOR'),('CONTENT_MANAGER'),('MANAGER_SALES'),('MANAGER_B2B')) AS r(role)
 CROSS JOIN "Permission" p WHERE p.key IN ('content_plan.read','content_plan.write')
 ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId")
 SELECT r.role::"UserRole",p.id FROM (VALUES ('ADMIN'),('SUPERVISOR')) AS r(role)
 CROSS JOIN "Permission" p WHERE p.key='content_plan.approve' ON CONFLICT DO NOTHING;
