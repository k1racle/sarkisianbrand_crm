import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { addDays, PatternFields } from '../work-schedule/work-pattern.policy';
import { scheduleInstant } from '../work-schedule/work-schedule.policy';

// A real row update also invalidates an older Serializable schedule transaction's
// snapshot after waiting. All fact/plan writes and closing share this employee lock.
export async function lockTimeEmployee(db: Prisma.TransactionClient, id: string) {
  await db.$executeRaw`UPDATE "User" SET "id"="id" WHERE "id"=${id}`;
}
export async function requireOpenTime(db: Prisma.TransactionClient, employeeId: string, start: Date, end: Date) {
  const closed = await db.crmTimesheetPeriod.findFirst({ where: { employeeId, status: 'CLOSED', startsAt: { lt: end }, endsAt: { gt: start } }, select: { month: true } });
  if (closed) throw new ConflictException(`Табель за ${closed.month} закрыт. Руководитель должен переоткрыть его с причиной до изменения времени или графика`);
}
export function patternChangeRange(rule: PatternFields, newEnd?: string) {
  // Ending a permanent template does not change its earlier published dates.
  const start = scheduleInstant((newEnd ? addDays(newEnd, 1) : rule.startDate) + 'T00:00', rule.timezone);
  const end = rule.endDate ? new Date(+scheduleInstant(rule.endDate + 'T00:00', rule.timezone) + 2 * 86400000) : new Date('2100-01-03T00:00Z');
  return { start, end };
}
export function sheetHash(value: unknown): string {
  // Stable object order; arrays preserve the explicitly sorted source order.
  const stable = (v: any): any => v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
export function closingBlockers(row: { needsAttention: boolean; openSessions: number }, ended: boolean, canPlan: boolean, own: boolean) {
  return [own ? 'Свой табель должен подтвердить другой руководитель.' : '', !canPlan ? 'Для утверждения нужен доступ к опубликованному графику.' : '', !ended ? 'Месяц ещё не завершён.' : '', row.needsAttention ? 'Сначала разберите замечания, исправления и дни по плану без отметок.' : '', row.openSessions ? 'Завершите все открытые интервалы этого месяца.' : ''].filter(Boolean);
}
export function requireSheetTransition(status: string, action: string, stale: boolean) {
  if (action === 'REOPEN' ? status !== 'CLOSED' : action === 'REVIEW' ? status === 'CLOSED' : action === 'APPROVE' ? status !== 'REVIEWED' : action === 'CLOSE' ? status !== 'APPROVED' : true) throw new ConflictException('Состояние табеля изменилось или предыдущий шаг ещё не выполнен. Обновите карточку');
  if (['APPROVE','CLOSE'].includes(action) && stale) throw new ConflictException('После проверки данные изменились. Проверьте табель заново');
}
