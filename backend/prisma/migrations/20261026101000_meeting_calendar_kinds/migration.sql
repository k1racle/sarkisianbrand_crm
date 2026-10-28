ALTER TABLE "CrmMeeting" DROP CONSTRAINT "CrmMeeting_kind_check";
ALTER TABLE "CrmMeeting" ADD CONSTRAINT "CrmMeeting_kind_check" CHECK ("kind" IN ('TEAM','MEETING','EVENT','INTERVIEW','OTHER'));
ALTER TABLE "CrmMeeting" ADD CONSTRAINT "CrmMeeting_reminder_check" CHECK ("reminderMinutes" IN (0,5,15,30,60,1440));
ALTER TABLE "CrmMeetingMember" ADD CONSTRAINT "CrmMeetingMember_decline_reason_check" CHECK ("response" <> 'DECLINED' OR length(btrim("declineReason")) > 0);
