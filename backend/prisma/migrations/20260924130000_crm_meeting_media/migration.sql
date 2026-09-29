CREATE TABLE "CrmMeetingMediaRoom" (
 "id" TEXT NOT NULL PRIMARY KEY, "meetingId" TEXT NOT NULL, "meetingVersion" INTEGER NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "openedAt" TIMESTAMP(3) NOT NULL,
 "closedAt" TIMESTAMP(3), "closeReason" TEXT, "remoteClosedAt" TIMESTAMP(3),
 "lastCheckedAt" TIMESTAMP(3), "lastError" TEXT,
 CONSTRAINT "CrmMeetingMediaRoom_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CrmMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CrmMeetingMediaRoom_version_check" CHECK ("version">0 AND "meetingVersion">0)
);
CREATE UNIQUE INDEX "CrmMeetingMediaRoom_meetingId_meetingVersion_key" ON "CrmMeetingMediaRoom"("meetingId","meetingVersion");
CREATE INDEX "CrmMeetingMediaRoom_remoteClosedAt_openedAt_idx" ON "CrmMeetingMediaRoom"("remoteClosedAt","openedAt");
CREATE TABLE "CrmMeetingMediaSession" (
 "id" TEXT NOT NULL PRIMARY KEY, "roomId" TEXT NOT NULL, "userId" TEXT, "guestId" TEXT, "guestTicketHash" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
 CONSTRAINT "CrmMeetingMediaSession_principal_check" CHECK (("userId" IS NOT NULL AND "guestId" IS NULL AND "guestTicketHash" IS NULL) OR ("userId" IS NULL AND "guestId" IS NOT NULL AND "guestTicketHash" IS NOT NULL)),
 CONSTRAINT "CrmMeetingMediaSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CrmMeetingMediaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CrmMeetingMediaSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CrmMeetingMediaSession_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "CrmMeetingGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CrmMeetingMediaSession_roomId_revokedAt_idx" ON "CrmMeetingMediaSession"("roomId","revokedAt");
CREATE INDEX "CrmMeetingMediaSession_userId_roomId_idx" ON "CrmMeetingMediaSession"("userId","roomId");
CREATE INDEX "CrmMeetingMediaSession_guestId_roomId_idx" ON "CrmMeetingMediaSession"("guestId","roomId");
