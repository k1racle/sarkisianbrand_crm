ALTER TABLE "B2BBooking" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "B2BBooking" ADD CONSTRAINT "B2BBooking_version_positive" CHECK ("version" > 0);

CREATE TABLE "SalonBookingEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "actorId" TEXT,
  "actorLabel" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "before" JSONB,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalonBookingEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalonBookingEvent_version_positive" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "SalonBookingEvent_bookingId_version_key" ON "SalonBookingEvent"("bookingId", "version");
CREATE INDEX "SalonBookingEvent_organizationId_bookingId_createdAt_idx" ON "SalonBookingEvent"("organizationId", "bookingId", "createdAt");
ALTER TABLE "SalonBookingEvent" ADD CONSTRAINT "SalonBookingEvent_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "B2BBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- This is a baseline at migration time, not a fabricated historical creation.
INSERT INTO "SalonBookingEvent" ("id", "organizationId", "bookingId", "actorLabel", "action", "version", "after")
SELECT gen_random_uuid()::text, "organizationId", "id", 'Система', 'BASELINE', 1,
  jsonb_build_object('startTime', "startTime", 'endTime', "endTime", 'status', "status", 'masterMemberId', "masterMemberId", 'notes', "notes", 'priceSnapshot', "priceSnapshot"::text, 'serviceId', "serviceId", 'clientId', "clientId")
FROM "B2BBooking";
