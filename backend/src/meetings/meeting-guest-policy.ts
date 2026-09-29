import { CrmMeeting, CrmMeetingGuest, CrmMeetingInvitation } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
export const guestSecret = () => randomBytes(32).toString('base64url');
export const guestDigest = (value: string) => createHash('sha256').update(value).digest('hex');
export const guestWindow = (meeting: Pick<CrmMeeting,'startsAt'|'endsAt'>, now=new Date()) => +now >= +meeting.startsAt - 30*60000 && +now < +meeting.endsAt + 30*60000;
export function guestState(guest: CrmMeetingGuest, invitation: CrmMeetingInvitation, meeting: CrmMeeting, now=new Date()) {
  if (['REJECTED','REVOKED','LEFT'].includes(guest.status)) return guest.status;
  if (invitation.revokedAt || meeting.status !== 'SCHEDULED') return 'REVOKED';
  if (+guest.expiresAt <= +now || +invitation.expiresAt <= +now || +meeting.endsAt + 30*60000 <= +now) return 'EXPIRED';
  return guest.status;
}
