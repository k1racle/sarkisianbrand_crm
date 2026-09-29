import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type MeetingActor = { id: string; role: string; departmentId: string | null; permissions: Set<string> };
export const companyMeetings = (actor: MeetingActor) => ['ADMIN', 'EXECUTIVE'].includes(actor.role);
export const meetingVisibility = (actor: MeetingActor): Prisma.CrmMeetingWhereInput => companyMeetings(actor) ? {} : { OR: [{ organizerId: actor.id }, { members: { some: { userId: actor.id } } }] };
export const canManageMeeting = (actor: MeetingActor, organizerId: string) => actor.permissions.has('meetings.write') && (organizerId === actor.id || actor.role === 'ADMIN' && actor.permissions.has('meetings.manage'));
export function validateMeetingTimes(startsAt: string, endsAt: string, timezone: string, now = new Date()) {
  const start = new Date(startsAt), end = new Date(endsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 12 * 3600000) throw new BadRequestException('Укажите встречу длительностью от 1 минуты до 12 часов');
  if (end.getTime() - start.getTime() < 60000 || start <= now) throw new BadRequestException('Начало встречи должно быть в будущем, длительность — не меньше минуты');
  try { new Intl.DateTimeFormat('ru-RU', { timeZone: timezone }).format(start); } catch { throw new BadRequestException('Неизвестный часовой пояс'); }
  return { startsAt: start, endsAt: end };
}
