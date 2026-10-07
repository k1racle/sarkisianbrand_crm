CREATE TABLE "CrmTaskPipeline" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "departmentId" TEXT,
 "labels" JSONB NOT NULL, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CrmTaskPipeline_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CrmTaskPipeline_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "CrmDepartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CrmTaskPipeline_departmentId_idx" ON "CrmTaskPipeline"("departmentId");
INSERT INTO "CrmTaskPipeline" ("id", "name", "labels", "updatedAt") VALUES
 ('00000000-0000-4000-8000-000000000001', 'Общие задачи', '{"BACKLOG":"Бэклог","TODO":"К выполнению","IN_PROGRESS":"В работе","REVIEW":"Проверка","OVERDUE":"Просрочено","DONE":"Готово"}', CURRENT_TIMESTAMP);
ALTER TABLE "Task" ADD COLUMN "pipelineId" TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';
ALTER TABLE "Task" ADD CONSTRAINT "Task_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmTaskPipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Task_pipelineId_status_position_idx" ON "Task"("pipelineId", "status", "position");
