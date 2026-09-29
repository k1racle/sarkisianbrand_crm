BEGIN;
ALTER TABLE "CrmDriveNode" ADD COLUMN "restricted" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "CrmDriveRestriction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nodeId" TEXT NOT NULL REFERENCES "CrmDriveNode"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "originKind" TEXT NOT NULL,
  "originId" TEXT NOT NULL,
  "taskId" TEXT REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "leadId" TEXT REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmDriveRestriction_origin_check" CHECK (
    ("originKind" = 'TASK' AND "leadId" IS NULL AND ("taskId" IS NULL OR "taskId" = "originId")) OR
    ("originKind" = 'LEAD' AND "taskId" IS NULL AND ("leadId" IS NULL OR "leadId" = "originId"))
  )
);
CREATE UNIQUE INDEX "CrmDriveRestriction_nodeId_originKind_originId_key" ON "CrmDriveRestriction"("nodeId", "originKind", "originId");
CREATE INDEX "CrmDriveRestriction_taskId_idx" ON "CrmDriveRestriction"("taskId");
CREATE INDEX "CrmDriveRestriction_leadId_idx" ON "CrmDriveRestriction"("leadId");

-- Backfill does not remove or move files or attachment links.
INSERT INTO "CrmDriveRestriction" ("id", "nodeId", "originKind", "originId", "taskId", "createdAt")
SELECT 'task:' || "nodeId" || ':' || "taskId", "nodeId", 'TASK', "taskId", "taskId", "createdAt" FROM "CrmTaskFile";
INSERT INTO "CrmDriveRestriction" ("id", "nodeId", "originKind", "originId", "leadId", "createdAt")
SELECT 'lead:' || "nodeId" || ':' || "leadId", "nodeId", 'LEAD', "leadId", "leadId", "createdAt" FROM "CrmLeadFile";
UPDATE "CrmDriveNode" n SET "restricted" = true WHERE EXISTS (SELECT 1 FROM "CrmDriveRestriction" r WHERE r."nodeId" = n."id");

-- All writers, including publication cloning/legacy bulk insert, retain origins.
-- No DELETE trigger: removing a link must never republish the underlying file.
CREATE FUNCTION crm_pin_drive_origin() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'CrmTaskFile' THEN
    INSERT INTO "CrmDriveRestriction" ("id", "nodeId", "originKind", "originId", "taskId")
    VALUES ('task:' || NEW."nodeId" || ':' || NEW."taskId", NEW."nodeId", 'TASK', NEW."taskId", NEW."taskId")
    ON CONFLICT ("nodeId", "originKind", "originId") DO NOTHING;
  ELSE
    INSERT INTO "CrmDriveRestriction" ("id", "nodeId", "originKind", "originId", "leadId")
    VALUES ('lead:' || NEW."nodeId" || ':' || NEW."leadId", NEW."nodeId", 'LEAD', NEW."leadId", NEW."leadId")
    ON CONFLICT ("nodeId", "originKind", "originId") DO NOTHING;
  END IF;
  UPDATE "CrmDriveNode" SET "restricted" = true WHERE "id" = NEW."nodeId";
  RETURN NEW;
END;
$$;
CREATE TRIGGER crm_task_file_access_origin AFTER INSERT OR UPDATE OF "nodeId", "taskId" ON "CrmTaskFile" FOR EACH ROW EXECUTE FUNCTION crm_pin_drive_origin();
CREATE TRIGGER crm_lead_file_access_origin AFTER INSERT OR UPDATE OF "nodeId", "leadId" ON "CrmLeadFile" FOR EACH ROW EXECUTE FUNCTION crm_pin_drive_origin();
COMMIT;
