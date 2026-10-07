ALTER TABLE "CrmChatChannel" ADD COLUMN "directKey" TEXT;
CREATE UNIQUE INDEX "CrmChatChannel_directKey_key" ON "CrmChatChannel"("directKey");
ALTER TABLE "CrmChatChannel" ADD CONSTRAINT "CrmChatChannel_direct_private_check" CHECK ("directKey" IS NULL OR "type"='PRIVATE');
