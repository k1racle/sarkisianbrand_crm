CREATE TYPE "CrmMeetingGuestStatus" AS ENUM ('WAITING','ADMITTED','REJECTED','REVOKED','LEFT');
CREATE TABLE "CrmMeetingInvitation" (
 "id" TEXT NOT NULL PRIMARY KEY, "meetingId" TEXT NOT NULL, "label" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL, "pinHash" TEXT NOT NULL, "requestKey" TEXT NOT NULL,
 "version" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CrmMeetingInvitation_version_check" CHECK ("version">0),
 CONSTRAINT "CrmMeetingInvitation_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CrmMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmMeetingInvitation_tokenHash_key" ON "CrmMeetingInvitation"("tokenHash");
CREATE UNIQUE INDEX "CrmMeetingInvitation_meetingId_requestKey_key" ON "CrmMeetingInvitation"("meetingId","requestKey");
CREATE INDEX "CrmMeetingInvitation_meetingId_expiresAt_idx" ON "CrmMeetingInvitation"("meetingId","expiresAt");
CREATE TABLE "CrmMeetingGuest" (
 "id" TEXT NOT NULL PRIMARY KEY, "invitationId" TEXT NOT NULL, "displayName" TEXT NOT NULL,
 "joinKeyHash" TEXT NOT NULL, "ticketHash" TEXT NOT NULL,
 "status" "CrmMeetingGuestStatus" NOT NULL DEFAULT 'WAITING', "version" INTEGER NOT NULL DEFAULT 1,
 "expiresAt" TIMESTAMP(3) NOT NULL, "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "decidedAt" TIMESTAMP(3),
 CONSTRAINT "CrmMeetingGuest_version_check" CHECK ("version">0),
 CONSTRAINT "CrmMeetingGuest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "CrmMeetingInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmMeetingGuest_invitationId_key" ON "CrmMeetingGuest"("invitationId");
CREATE UNIQUE INDEX "CrmMeetingGuest_ticketHash_key" ON "CrmMeetingGuest"("ticketHash");
CREATE TABLE "CrmMeetingGuestRate" ("key" TEXT NOT NULL PRIMARY KEY, "hits" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "CrmMeetingGuestRate_resetAt_idx" ON "CrmMeetingGuestRate"("resetAt");
