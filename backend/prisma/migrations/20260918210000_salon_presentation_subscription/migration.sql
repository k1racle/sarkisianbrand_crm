CREATE TABLE "SalonPresentation" (
 "organizationId" TEXT PRIMARY KEY,
 "displayName" TEXT NOT NULL DEFAULT '', "address" TEXT NOT NULL DEFAULT '',
 "phones" TEXT[] DEFAULT ARRAY[]::TEXT[], "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
 "socialLinks" JSONB NOT NULL DEFAULT '[]', "logoBytes" BYTEA, "logoMime" TEXT, "logoVersion" TEXT,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SalonPresentation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SalonSubscriptionSetting" (
 "key" TEXT PRIMARY KEY DEFAULT 'main', "name" TEXT NOT NULL DEFAULT 'Кабинет салона',
 "monthlyPrice" DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK ("monthlyPrice" >= 0),
 "annualPrice" DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK ("annualPrice" >= 0),
 "freeAccess" BOOLEAN NOT NULL DEFAULT true,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
