CREATE TABLE "CrmWorkPattern" (
 "id" TEXT PRIMARY KEY, "employeeId" TEXT NOT NULL, "creatorId" TEXT NOT NULL, "departmentId" TEXT, "departmentName" TEXT NOT NULL DEFAULT '',
 "pattern" TEXT NOT NULL, "startDate" TEXT NOT NULL, "endDate" TEXT, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL, "timezone" TEXT NOT NULL,
 "breakMinutes" INTEGER NOT NULL DEFAULT 0, "note" TEXT NOT NULL DEFAULT '', "status" TEXT NOT NULL DEFAULT 'DRAFT', "version" INTEGER NOT NULL DEFAULT 1,
 "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmWorkPattern_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkPattern_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkPattern_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CrmWorkPattern_values_check" CHECK ("version">0 AND "breakMinutes">=0 AND "breakMinutes"<1440 AND ("endDate" IS NULL OR "endDate">="startDate")),
 CONSTRAINT "CrmWorkPattern_pattern_check" CHECK ("pattern" IN ('WEEKDAYS','CYCLE_5_2','CYCLE_2_2','CYCLE_3_3')),
 CONSTRAINT "CrmWorkPattern_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','CANCELLED'))
);
CREATE UNIQUE INDEX "CrmWorkPattern_creatorId_requestKey_key" ON "CrmWorkPattern"("creatorId","requestKey");
CREATE INDEX "CrmWorkPattern_employeeId_startDate_idx" ON "CrmWorkPattern"("employeeId","startDate");
CREATE INDEX "CrmWorkPattern_departmentId_startDate_idx" ON "CrmWorkPattern"("departmentId","startDate");
CREATE TABLE "CrmWorkPatternEvent" (
 "id" TEXT PRIMARY KEY, "patternId" TEXT NOT NULL, "version" INTEGER NOT NULL, "action" TEXT NOT NULL,
 "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "reason" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmWorkPatternEvent_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "CrmWorkPattern"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmWorkPatternEvent_patternId_version_key" ON "CrmWorkPatternEvent"("patternId","version");
