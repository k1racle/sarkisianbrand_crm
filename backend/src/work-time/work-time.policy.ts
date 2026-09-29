import { BadRequestException, ConflictException } from '@nestjs/common';
import { localStamp, scheduleInstant, scheduleMonth } from '../work-schedule/work-schedule.policy';

export type TimeInterval = { startedAt: Date; endedAt: Date | null };
export type TimeSession = TimeInterval & { breaks: TimeInterval[] };
export function timeZone(value: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); } catch { throw new BadRequestException('Проверьте часовой пояс в профиле сотрудника'); }
  return value;
}
export function timePeriod(month: string, timezone: string) {
  const period = scheduleMonth(month);
  return { start: scheduleInstant(period.start, timezone), end: scheduleInstant(period.end, timezone, true) };
}
export function todayPeriod(now: Date, timezone: string) {
  const date = localStamp(now, timezone).slice(0, 10);
  const next = new Date(Date.parse(date + 'T00:00Z') + 86400000).toISOString().slice(0, 10);
  return { date, start: scheduleInstant(date + 'T00:00', timezone), end: scheduleInstant(next + 'T00:00', timezone, true) };
}
// Clip both work and breaks to the requested period. Merge breaks defensively to avoid double subtraction.
export function timeTotals(session: TimeSession, now: Date, start?: Date, end?: Date) {
  const from = Math.max(+session.startedAt, start ? +start : -Infinity);
  const to = Math.min(+(session.endedAt || now), +now, end ? +end : Infinity);
  if (to <= from) return { elapsedMs: 0, breakMs: 0, workedMs: 0 };
  const spans = session.breaks.map(row => [Math.max(from, +row.startedAt), Math.min(to, +(row.endedAt || now))]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let breakMs = 0, cursor = from;
  for (const [a, b] of spans) { breakMs += Math.max(0, b - Math.max(a, cursor)); cursor = Math.max(cursor, b); }
  return { elapsedMs: to - from, breakMs, workedMs: to - from - breakMs };
}
export function transitionAllowed(session: TimeSession & { id: string; version: number } | null, action: string, id: string | undefined, version: number, now: Date) {
  if (action === 'START') {
    if (id || version !== 0) throw new BadRequestException('Для начала дня не передаются прежняя смена и версия');
    if (session) throw new ConflictException('Рабочий день уже начат. Обновите данные');
    return;
  }
  if (!session || session.id !== id || session.version !== version || session.endedAt) throw new ConflictException('Состояние рабочего дня изменилось. Обновите данные');
  const pause = session.breaks.find(row => !row.endedAt);
  const last = Math.max(+session.startedAt, ...session.breaks.map(row => +(row.endedAt || row.startedAt)));
  if (+now < last) throw new ConflictException('Время сервера изменилось. Повторите после синхронизации часов');
  if (action === 'PAUSE' && pause) throw new ConflictException('Перерыв уже начат');
  if (action === 'RESUME' && !pause) throw new ConflictException('Нет открытого перерыва');
  if (!['PAUSE', 'RESUME', 'FINISH'].includes(action)) throw new BadRequestException('Неизвестное действие');
}
