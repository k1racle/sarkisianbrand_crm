CREATE TYPE "JobRunStatus" AS ENUM ('WAITING', 'ACTIVE', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "externalJobId" TEXT,
    "status" "JobRunStatus" NOT NULL DEFAULT 'WAITING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "input" JSONB,
    "result" JSONB,
    "error" TEXT,
    "correlationId" TEXT NOT NULL,
    "initiatedById" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobRun_externalJobId_key" ON "JobRun"("externalJobId");
CREATE INDEX "JobRun_status_createdAt_idx" ON "JobRun"("status", "createdAt");
CREATE INDEX "JobRun_queueName_jobName_idx" ON "JobRun"("queueName", "jobName");
CREATE INDEX "JobRun_correlationId_idx" ON "JobRun"("correlationId");
