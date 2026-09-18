CREATE TABLE "SalonBookingSetting" (
  "organizationId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "timeZone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
  "startMinute" INTEGER NOT NULL DEFAULT 540,
  "endMinute" INTEGER NOT NULL DEFAULT 1200,
  "slotStep" INTEGER NOT NULL DEFAULT 15,
  "horizonDays" INTEGER NOT NULL DEFAULT 30,
  "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::INTEGER[],
  "masterIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalonBookingSetting_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "SalonBookingSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SalonBookingSetting_hours_check" CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute")
);
