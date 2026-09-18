ALTER TABLE "PartnerParticipant" ALTER COLUMN "acceptedTermsAt" DROP NOT NULL;
ALTER TABLE "PartnerParticipant" DROP CONSTRAINT "PartnerParticipant_status_check";
ALTER TABLE "PartnerParticipant" ADD CONSTRAINT "PartnerParticipant_status_check"
 CHECK ("status" IN ('INVITED','PENDING','ACTIVE','SUSPENDED','REJECTED'));
ALTER TABLE "PartnerParticipant" ADD CONSTRAINT "PartnerParticipant_active_consent_check"
 CHECK ("status" NOT IN ('PENDING','ACTIVE') OR "acceptedTermsAt" IS NOT NULL);
