CREATE TABLE "CrmTaskParticipant" (
  "taskId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmTaskParticipant_pkey" PRIMARY KEY ("taskId", "userId"),
  CONSTRAINT "CrmTaskParticipant_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmTaskParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CrmTaskParticipant_userId_taskId_idx" ON "CrmTaskParticipant"("userId", "taskId");
ALTER TABLE "CrmTaskComment" ADD COLUMN "mentions" JSONB NOT NULL DEFAULT '[]';

-- One comment event per recipient; a mention replaces the ordinary comment alert.
-- Capture the audience at posting time, so a new participant receives no old alerts.
DROP TRIGGER crm_notification_source ON "CrmTaskComment";
CREATE FUNCTION crm_task_comment_notifications() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "CrmNotificationEvent" ("sourceKey", kind, category, "actorId", "recipientId", "taskId")
  SELECT 'CrmTaskComment:' || NEW.id || ':' || audience.id,
    CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.mentions) m WHERE m->>'id' = audience.id)
      THEN 'TASK_MENTION' ELSE 'TASK_COMMENT' END,
    'TASK', NEW."authorId", audience.id, NEW."taskId"
  FROM (
    SELECT "assignedToId" AS id FROM "Task" WHERE id = NEW."taskId"
    UNION SELECT "createdById" FROM "Task" WHERE id = NEW."taskId"
    UNION SELECT "userId" FROM "CrmTaskParticipant" WHERE "taskId" = NEW."taskId"
    UNION SELECT m->>'id' FROM jsonb_array_elements(NEW.mentions) m
  ) audience
  WHERE audience.id IS NOT NULL AND audience.id <> NEW."authorId"
  ON CONFLICT ("sourceKey") DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_task_comment_notifications AFTER INSERT ON "CrmTaskComment"
FOR EACH ROW EXECUTE FUNCTION crm_task_comment_notifications();
