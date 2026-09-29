CREATE TYPE "CrmMeetingStatus" AS ENUM ('SCHEDULED', 'CANCELLED');
CREATE TABLE "CrmMeeting" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "agenda" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'TEAM',
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
  "status" "CrmMeetingStatus" NOT NULL DEFAULT 'SCHEDULED', "organizerId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "requestKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
  "cancelledAt" TIMESTAMP(3), "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmMeeting_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrmMeeting_interval_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "CrmMeeting_version_check" CHECK ("version" > 0),
  CONSTRAINT "CrmMeeting_kind_check" CHECK ("kind" IN ('TEAM', 'INTERVIEW', 'OTHER')),
  CONSTRAINT "CrmMeeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CrmMeeting_organizerId_requestKey_key" ON "CrmMeeting"("organizerId", "requestKey");
CREATE INDEX "CrmMeeting_startsAt_id_idx" ON "CrmMeeting"("startsAt", "id");
CREATE INDEX "CrmMeeting_organizerId_startsAt_idx" ON "CrmMeeting"("organizerId", "startsAt");
CREATE INDEX "CrmMeeting_status_startsAt_idx" ON "CrmMeeting"("status", "startsAt");
CREATE TABLE "CrmMeetingMember" (
  "meetingId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  CONSTRAINT "CrmMeetingMember_pkey" PRIMARY KEY ("meetingId", "userId"),
  CONSTRAINT "CrmMeetingMember_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CrmMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CrmMeetingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CrmMeetingMember_userId_meetingId_idx" ON "CrmMeetingMember"("userId", "meetingId");
INSERT INTO "Permission" ("id", "key", "resource", "action", "description") VALUES
 ('70690924-0900-4000-8000-000000000001','meetings.read','meetings','read','Просмотр доступных встреч'),
 ('70690924-0900-4000-8000-000000000002','meetings.write','meetings','write','Планирование и изменение собственных встреч'),
 ('70690924-0900-4000-8000-000000000003','meetings.manage','meetings','manage','Изменение встреч компании администратором')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role", "permissionId")
SELECT r.role::"UserRole", p.id FROM (VALUES ('ADMIN'),('CONTENT_MANAGER'),('MANAGER_B2B'),('MANAGER_SALES'),('MARKETPLACE_MANAGER'),('SUPERVISOR'),('EXECUTIVE'),('IT_SUPPORT'),('CURATOR'),('WAREHOUSE')) r(role)
CROSS JOIN "Permission" p WHERE p.key IN ('meetings.read','meetings.write') ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("role", "permissionId") SELECT 'ADMIN'::"UserRole", id FROM "Permission" WHERE key='meetings.manage' ON CONFLICT DO NOTHING;
