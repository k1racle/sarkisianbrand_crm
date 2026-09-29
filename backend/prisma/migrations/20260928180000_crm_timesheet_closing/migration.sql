CREATE TABLE "CrmTimesheetPeriod" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "month" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "departmentId" TEXT,
 "status" TEXT NOT NULL DEFAULT 'DRAFT', "revision" INTEGER NOT NULL DEFAULT 1, "edition" INTEGER NOT NULL DEFAULT 1,
 "sourceHash" TEXT, "snapshot" JSONB,
 CONSTRAINT "CrmTimesheetPeriod_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmTimesheetPeriod_values_check" CHECK ("month" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' AND "endsAt">"startsAt" AND "revision">0 AND "edition">0),
 CONSTRAINT "CrmTimesheetPeriod_state_check" CHECK ("status" IN ('DRAFT','REVIEWED','APPROVED','CLOSED') AND ("status"='DRAFT' OR ("snapshot" IS NOT NULL AND "sourceHash" IS NOT NULL)))
);
CREATE UNIQUE INDEX "CrmTimesheetPeriod_employeeId_month_key" ON "CrmTimesheetPeriod"("employeeId","month");
CREATE INDEX "CrmTimesheetPeriod_employeeId_status_startsAt_endsAt_idx" ON "CrmTimesheetPeriod"("employeeId","status","startsAt","endsAt");
CREATE TABLE "CrmTimesheetEvent" (
 "id" TEXT PRIMARY KEY, "periodId" TEXT NOT NULL, "revision" INTEGER NOT NULL, "edition" INTEGER NOT NULL,
 "action" TEXT NOT NULL, "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "reason" TEXT NOT NULL,
 "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "snapshot" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmTimesheetEvent_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CrmTimesheetPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmTimesheetEvent_state_check" CHECK ("revision">0 AND "edition">0 AND "action" IN ('REVIEW','APPROVE','CLOSE','REOPEN') AND ("action"<>'CLOSE' OR "snapshot" IS NOT NULL))
);
CREATE UNIQUE INDEX "CrmTimesheetEvent_periodId_revision_key" ON "CrmTimesheetEvent"("periodId","revision");
CREATE UNIQUE INDEX "CrmTimesheetEvent_actorId_requestKey_key" ON "CrmTimesheetEvent"("actorId","requestKey");
