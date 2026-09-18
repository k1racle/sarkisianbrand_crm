CREATE TABLE "PartnerProgramSetting" (
 "kind" TEXT PRIMARY KEY CHECK ("kind" IN ('REFERRAL','BLOGGER')), "name" TEXT NOT NULL,
 "isEnabled" BOOLEAN NOT NULL DEFAULT false, "rewardPercent" DECIMAL(5,2) NOT NULL DEFAULT 5 CHECK ("rewardPercent" BETWEEN 0 AND 100),
 "attributionDays" INTEGER NOT NULL DEFAULT 30 CHECK ("attributionDays" BETWEEN 1 AND 365),
 "holdDays" INTEGER NOT NULL DEFAULT 14 CHECK ("holdDays" BETWEEN 0 AND 365),
 "minimumOrderAmount" DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK ("minimumOrderAmount">=0),
 "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false, "minimumPayout" DECIMAL(15,2) NOT NULL DEFAULT 1000 CHECK ("minimumPayout">=0),
 "signupRewardAmount" DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK ("signupRewardAmount">=0),
 "signupRewardUnit" TEXT NOT NULL DEFAULT 'RUB' CHECK ("signupRewardUnit" IN ('RUB','BONUS')),
 "signupHoldDays" INTEGER NOT NULL DEFAULT 14 CHECK ("signupHoldDays" BETWEEN 0 AND 365),
 "termsText" TEXT NOT NULL DEFAULT '', "autoSettlement" BOOLEAN NOT NULL DEFAULT true, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "PartnerParticipant" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "kind" TEXT NOT NULL CHECK ("kind" IN ('REFERRAL','BLOGGER')), "code" TEXT NOT NULL UNIQUE,
 "status" TEXT NOT NULL CHECK ("status" IN ('PENDING','ACTIVE','SUSPENDED','REJECTED')),
 "displayName" TEXT NOT NULL, "channels" JSONB NOT NULL DEFAULT '[]', "description" TEXT NOT NULL DEFAULT '',
 "rewardPercent" DECIMAL(5,2) CHECK ("rewardPercent" BETWEEN 0 AND 100), "payoutVerified" BOOLEAN NOT NULL DEFAULT false,
 "bonusDebt" INTEGER NOT NULL DEFAULT 0 CHECK ("bonusDebt">=0), "acceptedTermsAt" TIMESTAMP(3) NOT NULL,
 "termsSnapshot" TEXT NOT NULL, "decisionNote" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("userId","kind")
);
CREATE INDEX "PartnerParticipant_kind_status_createdAt_idx" ON "PartnerParticipant"("kind","status","createdAt");
CREATE TABLE "PartnerClick" (
 "id" TEXT PRIMARY KEY, "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "tokenHash" TEXT NOT NULL UNIQUE, "visitorHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 "visitsCount" INTEGER NOT NULL DEFAULT 1, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastVisitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("participantId","visitorHash")
);
CREATE INDEX "PartnerClick_participantId_lastVisitAt_idx" ON "PartnerClick"("participantId","lastVisitAt");
ALTER TABLE "Order" ADD COLUMN "partnerCode" TEXT;
CREATE TABLE "PartnerAttribution" (
 "orderId" TEXT PRIMARY KEY REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "clickId" TEXT REFERENCES "PartnerClick"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "rewardPercent" DECIMAL(5,2) NOT NULL, "baseAmount" DECIMAL(15,2) NOT NULL,
 "holdDays" INTEGER NOT NULL, "firstOrderOnly" BOOLEAN NOT NULL, "rejectionReason" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PartnerAttribution_participantId_createdAt_idx" ON "PartnerAttribution"("participantId","createdAt");
CREATE TABLE "PartnerBusinessRegistration" (
 "organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "ownerId" TEXT NOT NULL, "amount" DECIMAL(15,2) NOT NULL CHECK ("amount">0),
 "unit" TEXT NOT NULL CHECK ("unit" IN ('RUB','BONUS')), "holdDays" INTEGER NOT NULL CHECK ("holdDays" BETWEEN 0 AND 365),
 "verifiedAt" TIMESTAMP(3), "verifiedBy" TEXT, "verificationNote" TEXT NOT NULL DEFAULT '', "activatedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PartnerBusinessRegistration_participantId_createdAt_idx" ON "PartnerBusinessRegistration"("participantId","createdAt");
CREATE TABLE "PartnerReward" (
 "id" TEXT PRIMARY KEY, "orderId" TEXT UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "registrationId" TEXT UNIQUE REFERENCES "PartnerBusinessRegistration"("organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
 "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "amount" DECIMAL(15,2) NOT NULL CHECK ("amount">0), "unit" TEXT NOT NULL CHECK ("unit" IN ('BONUS','RUB')),
 "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REVERSED','CANCELLED')),
 "readyAt" TIMESTAMP(3), "approvedAt" TIMESTAMP(3), "loyaltyEntryId" TEXT UNIQUE,
 "creditedBonus" INTEGER NOT NULL DEFAULT 0, "withheldBonus" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CHECK (("orderId" IS NOT NULL)::integer + ("registrationId" IS NOT NULL)::integer = 1)
);
CREATE INDEX "PartnerReward_participantId_status_createdAt_idx" ON "PartnerReward"("participantId","status","createdAt");
CREATE INDEX "PartnerReward_status_readyAt_idx" ON "PartnerReward"("status","readyAt");
CREATE TABLE "PartnerPayout" (
 "id" TEXT PRIMARY KEY, "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "requestKey" TEXT NOT NULL, "amount" DECIMAL(15,2) NOT NULL CHECK ("amount">0),
 "status" TEXT NOT NULL DEFAULT 'REQUESTED' CHECK ("status" IN ('REQUESTED','APPROVED','PAID','REJECTED','CANCELLED')),
 "requestNote" TEXT NOT NULL DEFAULT '', "decisionNote" TEXT NOT NULL DEFAULT '', "paymentReference" TEXT UNIQUE,
 "decidedBy" TEXT, "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("participantId","requestKey"),
 CHECK ("status"<>'PAID' OR ("paymentReference" IS NOT NULL AND "paidAt" IS NOT NULL AND "decidedBy" IS NOT NULL))
);
CREATE INDEX "PartnerPayout_status_createdAt_idx" ON "PartnerPayout"("status","createdAt");
CREATE TABLE "PartnerEvent" (
 "id" TEXT PRIMARY KEY, "participantId" TEXT NOT NULL REFERENCES "PartnerParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" TEXT, "type" TEXT NOT NULL, "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PartnerEvent_participantId_createdAt_idx" ON "PartnerEvent"("participantId","createdAt");
INSERT INTO "Permission" ("id","key","resource","action","description") VALUES
 ('77fbf060-3410-4c0f-b001-000000000001','partners.read','partners','read','Просмотр реферальной программы и блогеров'),
 ('77fbf060-3410-4c0f-b001-000000000002','partners.write','partners','write','Настройки и одобрение партнёров'),
 ('77fbf060-3410-4c0f-b001-000000000003','partners.payouts','partners','payouts','Проверка получателя и денежные выплаты блогерам')
 ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("role","permissionId") SELECT r.role::"UserRole",p.id FROM
 (VALUES ('ADMIN','partners.read'),('ADMIN','partners.write'),('ADMIN','partners.payouts'),('SUPERVISOR','partners.read'),('SUPERVISOR','partners.write'),('MANAGER_SALES','partners.read')) r(role,key)
 JOIN "Permission" p ON p.key=r.key ON CONFLICT DO NOTHING;
