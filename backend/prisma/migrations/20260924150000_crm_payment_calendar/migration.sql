CREATE TABLE "CrmPaymentPlan" (
 "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "vendor" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL, "notes" TEXT NOT NULL DEFAULT '',
 "amountCents" INTEGER NOT NULL, "startDate" DATE NOT NULL, "endDate" DATE, "frequency" TEXT NOT NULL, "interval" INTEGER NOT NULL DEFAULT 1,
 "visibility" TEXT NOT NULL DEFAULT 'PERSONAL', "ownerId" TEXT NOT NULL, "departmentId" TEXT,
 "version" INTEGER NOT NULL DEFAULT 1, "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmPaymentPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmPaymentPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmPaymentPlan_values_check" CHECK ("amountCents">0 AND "amountCents"<=1000000000 AND "interval" BETWEEN 1 AND 36 AND "version">0 AND ("endDate" IS NULL OR "endDate">="startDate")),
 CONSTRAINT "CrmPaymentPlan_frequency_check" CHECK ("frequency" IN ('ONCE','WEEK','MONTH','YEAR')),
 CONSTRAINT "CrmPaymentPlan_visibility_check" CHECK ("visibility" IN ('PERSONAL','DEPARTMENT','COMPANY') AND (("visibility"='DEPARTMENT' AND "departmentId" IS NOT NULL) OR ("visibility"<>'DEPARTMENT' AND "departmentId" IS NULL)))
);
CREATE UNIQUE INDEX "CrmPaymentPlan_ownerId_requestKey_key" ON "CrmPaymentPlan"("ownerId","requestKey");
CREATE INDEX "CrmPaymentPlan_ownerId_startDate_idx" ON "CrmPaymentPlan"("ownerId","startDate");
CREATE INDEX "CrmPaymentPlan_departmentId_startDate_idx" ON "CrmPaymentPlan"("departmentId","startDate");
CREATE TABLE "CrmPlannedPayment" (
 "id" TEXT PRIMARY KEY, "planId" TEXT NOT NULL, "dueDate" DATE NOT NULL, "paidOn" DATE,
 "amountCents" INTEGER NOT NULL, "title" TEXT NOT NULL, "vendor" TEXT NOT NULL, "category" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmPlannedPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CrmPaymentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmPlannedPayment_values_check" CHECK ("version">0 AND "amountCents">0)
);
CREATE UNIQUE INDEX "CrmPlannedPayment_planId_dueDate_key" ON "CrmPlannedPayment"("planId","dueDate");
CREATE INDEX "CrmPlannedPayment_dueDate_idx" ON "CrmPlannedPayment"("dueDate");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('70690924-1500-4000-8000-000000000001','payment_calendar.read','payment_calendar','read','Просмотр календаря доступных расходов'),
 ('70690924-1500-4000-8000-000000000002','payment_calendar.write','payment_calendar','write','Создание и изменение планов расходов'),
 ('70690924-1500-4000-8000-000000000003','payment_calendar.settle','payment_calendar','settle','Отметка и исправление оплаты плановых расходов')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT 'ADMIN'::"UserRole",id FROM "Permission" WHERE "resource"='payment_calendar' ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT 'EXECUTIVE'::"UserRole",id FROM "Permission" WHERE "key"='payment_calendar.read' ON CONFLICT DO NOTHING;
