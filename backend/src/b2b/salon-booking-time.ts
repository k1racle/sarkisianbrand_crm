import { BadRequestException } from '@nestjs/common';

export function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (key: string) => Number(parts.find(p => p.type === key)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), minute: value('hour') * 60 + value('minute') };
}

export function dateKey(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function localInstant(day: string, minute: number, timeZone: string) {
  const base = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 10) !== day) throw new BadRequestException('Некорректная дата');
  const target = base + minute * 60000;
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const p = zonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(p.year, p.month - 1, p.day) + p.minute * 60000;
    const delta = target - represented;
    if (!delta) return new Date(instant);
    instant += delta;
  }
  // A nonexistent wall-clock time at a DST boundary must not become another slot.
  return null;
}

export function isOccupied(start: Date, end: Date, rows: { startTime: Date; endTime: Date }[]) {
  return rows.some(row => row.startTime < end && row.endTime > start);
}
