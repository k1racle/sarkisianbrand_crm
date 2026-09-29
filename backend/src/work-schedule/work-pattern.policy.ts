import { BadRequestException } from '@nestjs/common';
import { scheduleFields, scheduleInstant } from './work-schedule.policy';

export type PatternFields = { pattern: string; startDate: string; endDate?: string | null; startTime: string; endTime: string; timezone: string; breakMinutes: number; note: string };
export const patternLabels: Record<string, string> = { WEEKDAYS: '5/2 · Пн–Пт', CYCLE_5_2: '5/2 · цикл', CYCLE_2_2: '2/2', CYCLE_3_3: '3/3' };
export function patternDate(value: string) {
  const date = new Date(value + 'T00:00:00Z');
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Выберите корректную дату в пределах 2000–2099 годов');
  return date;
}
export function addDays(value: string, days: number) { return new Date(Date.parse(value + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10); }
export function workingDay(rule: PatternFields, day: string) {
  if (day < rule.startDate || rule.endDate && day > rule.endDate) return false;
  if (rule.pattern === 'WEEKDAYS') return ![0, 6].includes(new Date(day + 'T00:00:00Z').getUTCDay());
  const [work, rest] = rule.pattern === 'CYCLE_5_2' ? [5, 2] : rule.pattern === 'CYCLE_2_2' ? [2, 2] : [3, 3];
  return Math.round((Date.parse(day + 'T00:00Z') - Date.parse(rule.startDate + 'T00:00Z')) / 86400000) % (work + rest) < work;
}
function shift(rule: PatternFields, day: string) {
  return scheduleFields({ kind: 'SHIFT', startLocal: day + 'T' + rule.startTime, endLocal: (rule.endTime <= rule.startTime ? addDays(day, 1) : day) + 'T' + rule.endTime, timezone: rule.timezone, breakMinutes: rule.breakMinutes, note: rule.note });
}
export function workPatternFields(rule: PatternFields) {
  patternDate(rule.startDate); if (rule.endDate) patternDate(rule.endDate);
  if (rule.endDate && rule.endDate < rule.startDate) throw new BadRequestException('Последний день не может быть раньше начала графика');
  if (!(rule.pattern in patternLabels)) throw new BadRequestException('Неизвестный шаблон графика');
  shift(rule, rule.startDate); // Validate zone, shift duration and break even if anchor is a weekend.
  return { pattern: rule.pattern, startDate: rule.startDate, endDate: rule.endDate || null, startTime: rule.startTime, endTime: rule.endTime, timezone: rule.timezone, breakMinutes: rule.breakMinutes, note: rule.note.trim() };
}

export function patternDays(rule: PatternFields, from: string, to: string) {
  const items: (ReturnType<typeof scheduleFields> & { occurrenceDate: string })[] = [], issues: { date: string; message: string }[] = [];
  const start = from < rule.startDate ? rule.startDate : from, end = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (Date.parse(to + 'T00:00Z') - Date.parse(from + 'T00:00Z') > 40 * 86400000) throw new BadRequestException('Слишком большой период расчёта шаблона');
  for (let day = start; day <= end; day = addDays(day, 1)) {
    try {
      if (workingDay(rule, day)) items.push({ ...shift(rule, day), occurrenceDate: day });
      else {
        // The first rest day begins after a preceding overnight shift, not at midnight.
        const previous = addDays(day, -1), overnight = rule.endTime <= rule.startTime && workingDay(rule, previous);
        const startLocal = day + 'T' + (overnight ? rule.endTime : '00:00'), endLocal = addDays(day, 1) + 'T00:00';
        items.push({ kind: 'DAY_OFF', startLocal, endLocal, startsAt: scheduleInstant(startLocal, rule.timezone), endsAt: scheduleInstant(endLocal, rule.timezone),
          timezone: rule.timezone, breakMinutes: 0, plannedMinutes: 0, note: rule.note, occurrenceDate: day });
      }
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      issues.push({ date: day, message: error.message });
    }
  }
  return { items, issues };
}

export function manualOverrides(generated: { startsAt: Date; endsAt: Date }, manual: { startsAt: Date; endsAt: Date; status: string }[], patternStatus: string) {
  return manual.some(row => row.status !== 'CANCELLED' && (row.status === 'PUBLISHED' || patternStatus === 'DRAFT') && row.startsAt < generated.endsAt && row.endsAt > generated.startsAt);
}
