import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { localStamp } from '../work-schedule/work-schedule.policy';
import { addDays, manualOverrides, patternDays, PatternFields } from '../work-schedule/work-pattern.policy';

export function plannedOverlap(row: { startsAt: Date; endsAt: Date; plannedMinutes: number }, start: Date, end: Date) {
  const total = +row.endsAt - +row.startsAt;
  if (total <= 0) return 0;
  // Planned breaks have duration, not an exact position. Boundary shares are proportional.
  const at = (value: Date) => Math.round(row.plannedMinutes * 60000 * Math.max(0, Math.min(total, +value - +row.startsAt)) / total);
  return Math.max(0, at(end) - at(start));
}
export async function workTimePlan(db: Prisma.TransactionClient, employeeId: string, period: { start: Date; end: Date }) {
  const manual = await db.crmWorkSchedule.findMany({ where: { employeeId, status: 'PUBLISHED', startsAt: { lt: new Date(+period.end + 2*86400000) }, endsAt: { gt: new Date(+period.start - 2*86400000) } }, take: 1001 });
  const patterns = await db.crmWorkPattern.findMany({ where: { employeeId, status: 'PUBLISHED' }, take: 501 });
  const { intervals, ...summary } = calculateWorkTimePlan(manual, patterns, period);
  return summary;
}
export type PlannedInterval = { startsAt: Date; endsAt: Date; plannedMinutes: number };
export function calculateWorkTimePlan(manual: (PlannedInterval & { kind: string; status: string })[], patterns: PatternFields[], period: { start: Date; end: Date }) {
  if (manual.length > 1000 || patterns.length > 500) return { available: false, plannedMs: null, shifts: null, intervals: [] as PlannedInterval[], warning: 'Слишком много записей графика для расчёта. Итог не показан частично.' };
  const shifts: { startsAt: Date; endsAt: Date; plannedMinutes: number }[] = manual.filter(row => row.kind === 'SHIFT' && row.startsAt < period.end && row.endsAt > period.start), warnings: string[] = [];
  for (const pattern of patterns) {
    try {
    // Calculate in each template's zone. One prior day includes overnight shifts.
    const from = addDays(localStamp(period.start, pattern.timezone).slice(0,10), -1), to = localStamp(new Date(+period.end - 1), pattern.timezone).slice(0,10);
    const generated = patternDays(pattern, from, to);
    warnings.push(...generated.issues.map(issue => issue.date + ': ' + issue.message));
    for (const row of generated.items) if (row.kind === 'SHIFT' && row.startsAt < period.end && row.endsAt > period.start && !manualOverrides(row, manual, 'PUBLISHED')) shifts.push(row);
    } catch (e) {
      if (!(e instanceof BadRequestException) && !(e instanceof RangeError)) throw e;
      warnings.push('Не удалось рассчитать шаблон графика: ' + e.message);
    }
  }
  // Overlapping rules/legacy manual shifts must not inflate totals silently.
  shifts.sort((a,b) => +a.startsAt - +b.startsAt);
  if (shifts.some((row,index) => index > 0 && row.startsAt < shifts[index-1].endsAt)) warnings.push('В опубликованном графике есть пересекающиеся смены');
  return warnings.length ? { available: false, plannedMs: null, shifts: null, intervals: [] as PlannedInterval[], warning: warnings.join('. ') } : { available: true, plannedMs: shifts.reduce((sum,row) => sum + plannedOverlap(row,period.start,period.end), 0), shifts: shifts.length, intervals: shifts, warning: null };
}
