ALTER TABLE "CrmMeeting"
  ADD COLUMN "location" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "meetingUrl" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "calendarSequence" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CrmMeetingMember"
  ADD COLUMN "response" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "declineReason" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "respondedAt" TIMESTAMP(3),
  ADD COLUMN "responseVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CrmMeetingMember" ADD CONSTRAINT "CrmMeetingMember_response_check" CHECK ("response" IN ('PENDING','ACCEPTED','DECLINED'));
CREATE TABLE "CrmCalendarSubscription" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmCalendarSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "CrmNotificationEvent" ADD COLUMN "meetingId" TEXT;
ALTER TABLE "CrmNotificationEvent" ADD CONSTRAINT "CrmNotificationEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CrmMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "CrmNotificationEvent_meetingId_idx" ON "CrmNotificationEvent"("meetingId");
