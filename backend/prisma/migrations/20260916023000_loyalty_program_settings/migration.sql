CREATE TABLE "LoyaltyProgramSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "programName" TEXT NOT NULL DEFAULT 'SARKISIAN CLUB',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "earnPercent" INTEGER NOT NULL DEFAULT 1,
    "maxWriteOffPercent" INTEGER NOT NULL DEFAULT 30,
    "signupBonus" INTEGER NOT NULL DEFAULT 0,
    "birthdayBonus" INTEGER NOT NULL DEFAULT 0,
    "bonusValidityDays" INTEGER NOT NULL DEFAULT 365,
    "proThreshold" INTEGER NOT NULL DEFAULT 3000,
    "premiumThreshold" INTEGER NOT NULL DEFAULT 10000,
    "proMultiplierPercent" INTEGER NOT NULL DEFAULT 120,
    "premiumMultiplierPercent" INTEGER NOT NULL DEFAULT 150,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyProgramSetting_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoyaltyProgramSetting" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);

INSERT INTO "Permission" ("id", "key", "resource", "action", "description") VALUES
  ((substr(md5('loyalty.read'),1,8)||'-'||substr(md5('loyalty.read'),9,4)||'-'||substr(md5('loyalty.read'),13,4)||'-'||substr(md5('loyalty.read'),17,4)||'-'||substr(md5('loyalty.read'),21,12)), 'loyalty.read', 'loyalty', 'read', 'Просмотр бонусной программы'),
  ((substr(md5('loyalty.write'),1,8)||'-'||substr(md5('loyalty.write'),9,4)||'-'||substr(md5('loyalty.write'),13,4)||'-'||substr(md5('loyalty.write'),17,4)||'-'||substr(md5('loyalty.write'),21,12)), 'loyalty.write', 'loyalty', 'write', 'Управление бонусной программой')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("role", "permissionId")
SELECT role_value::"UserRole", permission."id"
FROM (VALUES
  ('ADMIN', 'loyalty.read'), ('ADMIN', 'loyalty.write'),
  ('SUPERVISOR', 'loyalty.read'), ('SUPERVISOR', 'loyalty.write'),
  ('MANAGER_SALES', 'loyalty.read'), ('MANAGER_SALES', 'loyalty.write')
) AS grants(role_value, permission_key)
JOIN "Permission" permission ON permission."key" = grants.permission_key
ON CONFLICT DO NOTHING;
