ALTER TABLE "PartnerProgramSetting"
  ADD COLUMN "customerRewardMode" TEXT NOT NULL DEFAULT 'FIXED' CHECK ("customerRewardMode" IN ('FIXED','PERCENT')),
  ADD COLUMN "fixedCustomerRewardAmount" DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK ("fixedCustomerRewardAmount" >= 0);

ALTER TABLE "PartnerAttribution"
  ADD COLUMN "rewardMode" TEXT NOT NULL DEFAULT 'PERCENT' CHECK ("rewardMode" IN ('FIXED','PERCENT','LEGACY_BONUS')),
  ADD COLUMN "fixedRewardAmount" DECIMAL(15,2) CHECK ("fixedRewardAmount" IS NULL OR "fixedRewardAmount" > 0);

UPDATE "PartnerAttribution" a
SET "rewardMode" = 'LEGACY_BONUS'
FROM "PartnerParticipant" p
WHERE p.id = a."participantId" AND p.kind = 'REFERRAL';
