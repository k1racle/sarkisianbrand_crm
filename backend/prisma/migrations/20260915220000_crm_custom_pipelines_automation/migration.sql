ALTER TABLE "CrmPipeline"
ADD COLUMN "requiredFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "lostReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "CrmTaskTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "estimateMinutes" INTEGER,
    "dueInHours" INTEGER,
    "reminderBeforeMin" INTEGER DEFAULT 60,
    "defaultAssigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmTaskTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmTaskReminder" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmTaskReminder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "templateId" TEXT;

CREATE UNIQUE INDEX "CrmTaskTemplate_name_key" ON "CrmTaskTemplate"("name");
CREATE INDEX "CrmTaskTemplate_isActive_name_idx" ON "CrmTaskTemplate"("isActive", "name");
CREATE UNIQUE INDEX "CrmTaskReminder_taskId_recipientId_remindAt_key" ON "CrmTaskReminder"("taskId", "recipientId", "remindAt");
CREATE INDEX "CrmTaskReminder_recipientId_remindAt_dismissedAt_idx" ON "CrmTaskReminder"("recipientId", "remindAt", "dismissedAt");
CREATE INDEX "Task_templateId_idx" ON "Task"("templateId");

ALTER TABLE "CrmTaskTemplate" ADD CONSTRAINT "CrmTaskTemplate_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmTaskTemplate" ADD CONSTRAINT "CrmTaskTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CrmTaskReminder" ADD CONSTRAINT "CrmTaskReminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmTaskReminder" ADD CONSTRAINT "CrmTaskReminder_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CrmTaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
