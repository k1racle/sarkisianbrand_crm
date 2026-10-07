-- Events are written in the same transaction as their source, including imports and bots.
CREATE TABLE "CrmNotificationEvent" (
 "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
 "sourceKey" TEXT NOT NULL,
 "kind" TEXT NOT NULL,
 "category" TEXT NOT NULL,
 "actorId" TEXT,
 "recipientId" TEXT,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "taskId" TEXT,
 "orderId" TEXT,
 "ticketId" TEXT,
 "messageId" TEXT,
 "contactId" TEXT,
 "reminderId" TEXT,
 CONSTRAINT "CrmNotificationEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CrmNotificationEvent_sourceKey_key" ON "CrmNotificationEvent"("sourceKey");
CREATE INDEX "CrmNotificationEvent_occurredAt_id_idx" ON "CrmNotificationEvent"("occurredAt","id");
CREATE INDEX "CrmNotificationEvent_category_occurredAt_idx" ON "CrmNotificationEvent"("category","occurredAt");
CREATE INDEX "CrmNotificationEvent_recipientId_occurredAt_idx" ON "CrmNotificationEvent"("recipientId","occurredAt");
CREATE INDEX "CrmNotificationEvent_taskId_idx" ON "CrmNotificationEvent"("taskId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_orderId_idx" ON "CrmNotificationEvent"("orderId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_ticketId_idx" ON "CrmNotificationEvent"("ticketId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "HelpdeskTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_messageId_idx" ON "CrmNotificationEvent"("messageId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "CrmChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_contactId_idx" ON "CrmNotificationEvent"("contactId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_reminderId_idx" ON "CrmNotificationEvent"("reminderId");
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "CrmTaskReminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "CrmNotificationRead" (
 "userId" TEXT NOT NULL, "eventId" TEXT NOT NULL, "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmNotificationRead_pkey" PRIMARY KEY ("userId","eventId"),
 CONSTRAINT "CrmNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CrmNotificationRead_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CrmNotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CrmNotificationRead_eventId_idx" ON "CrmNotificationRead"("eventId");
CREATE TABLE "CrmNotificationPreference" (
 "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "popupsEnabled" BOOLEAN NOT NULL DEFAULT true
);

CREATE FUNCTION crm_notification_source() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n jsonb := to_jsonb(NEW); o jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
 k text; cat text; target text; target_id text; actor text; recipient text; at_time timestamp(3) := clock_timestamp(); event_key text;
BEGIN
 CASE TG_TABLE_NAME
 WHEN 'CrmChatMessage' THEN
  IF n->>'deletedAt' IS NOT NULL THEN RETURN NEW; END IF;
  k := 'CHAT_MESSAGE'; cat := 'CHAT'; target := 'messageId'; target_id := n->>'id'; actor := n->>'authorId';
 WHEN 'Task' THEN
  target := 'taskId'; target_id := n->>'id'; cat := 'TASK';
  IF TG_OP = 'INSERT' THEN k := 'TASK_CREATED'; actor := n->>'createdById'; recipient := n->>'assignedToId';
  ELSIF n->>'assignedToId' IS DISTINCT FROM o->>'assignedToId' THEN k := 'TASK_ASSIGNED'; recipient := n->>'assignedToId';
  ELSIF n->>'status' IS DISTINCT FROM o->>'status' THEN k := 'TASK_STATUS';
  ELSE RETURN NEW; END IF;
 WHEN 'CrmTaskComment' THEN k := 'TASK_COMMENT'; cat := 'TASK'; target := 'taskId'; target_id := n->>'taskId'; actor := n->>'authorId';
 WHEN 'CrmTaskReminder' THEN
  IF n->>'dismissedAt' IS NOT NULL THEN RETURN NEW; END IF;
  k := 'TASK_REMINDER'; cat := 'TASK'; target := 'reminderId'; target_id := n->>'id'; recipient := n->>'recipientId'; at_time := GREATEST(at_time, (n->>'remindAt')::timestamp);
 WHEN 'Order' THEN
  target := 'orderId'; target_id := n->>'id'; cat := 'ORDER';
  IF TG_OP = 'INSERT' THEN k := 'ORDER_CREATED';
  ELSIF n->>'managerId' IS DISTINCT FROM o->>'managerId' AND n->>'managerId' IS NOT NULL THEN k := 'ORDER_ASSIGNED'; recipient := n->>'managerId';
  ELSIF n->>'status' IS DISTINCT FROM o->>'status' THEN k := 'ORDER_STATUS'; recipient := n->>'managerId';
  ELSE RETURN NEW; END IF;
 WHEN 'HelpdeskTicket' THEN
  target := 'ticketId'; target_id := n->>'id'; cat := 'SUPPORT';
  IF TG_OP = 'INSERT' THEN k := 'TICKET_CREATED'; actor := n->>'requesterUserId';
  ELSIF n->>'assignedToId' IS DISTINCT FROM o->>'assignedToId' AND n->>'assignedToId' IS NOT NULL THEN k := 'TICKET_ASSIGNED'; recipient := n->>'assignedToId';
  ELSE RETURN NEW; END IF;
 WHEN 'HelpdeskComment' THEN k := 'TICKET_COMMENT'; cat := 'SUPPORT'; target := 'ticketId'; target_id := n->>'ticketId'; actor := n->>'authorId';
 WHEN 'ContactMessage' THEN k := 'CONTACT_CREATED'; cat := 'SUPPORT'; target := 'contactId'; target_id := n->>'id';
 ELSE RETURN NEW;
 END CASE;
 event_key := TG_TABLE_NAME || ':' || (n->>'id') || ':' || CASE WHEN TG_OP = 'UPDATE' THEN gen_random_uuid()::text ELSE 'created' END;
 EXECUTE format('INSERT INTO "CrmNotificationEvent" ("sourceKey",kind,category,"actorId","recipientId","occurredAt",%I) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT ("sourceKey") DO NOTHING', target)
 USING event_key,k,cat,actor,recipient,at_time,target_id;
 RETURN NEW;
END;
$$;
CREATE TRIGGER crm_notification_source AFTER INSERT OR UPDATE ON "Task" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT OR UPDATE ON "Order" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT OR UPDATE ON "HelpdeskTicket" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT ON "CrmChatMessage" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT ON "CrmTaskComment" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT ON "CrmTaskReminder" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT ON "HelpdeskComment" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();
CREATE TRIGGER crm_notification_source AFTER INSERT ON "ContactMessage" FOR EACH ROW EXECUTE FUNCTION crm_notification_source();

-- Opening a conversation also reads its entries in the bell; no messages are marked read by dismissing a popup.
CREATE FUNCTION crm_notification_chat_read() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."lastReadAt" IS NOT NULL THEN
  INSERT INTO "CrmNotificationRead" ("userId","eventId")
  SELECT NEW."userId", e.id FROM "CrmNotificationEvent" e JOIN "CrmChatMessage" m ON m.id=e."messageId"
  WHERE m."channelId"=NEW."channelId" AND m."createdAt"<=NEW."lastReadAt"
  ON CONFLICT ("userId","eventId") DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER crm_notification_chat_read AFTER INSERT OR UPDATE OF "lastReadAt" ON "CrmChatMember" FOR EACH ROW EXECUTE FUNCTION crm_notification_chat_read();

-- Start tracking new events immediately. Existing overdue reminders remain actionable.
INSERT INTO "CrmNotificationEvent" ("sourceKey",kind,category,"recipientId","reminderId","occurredAt")
 SELECT 'CrmTaskReminder:'||id||':created','TASK_REMINDER','TASK',"recipientId",id,GREATEST(CURRENT_TIMESTAMP,"remindAt")
 FROM "CrmTaskReminder" WHERE "dismissedAt" IS NULL;

