import { BadRequestException } from '@nestjs/common';

export function localStamp(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

// Resolve wall-clock input on the server, independently of the browser/host zone.
// Reject missing AND repeated DST times rather than silently picking an offset.
export function scheduleInstant(value: string, timezone: string, allowExclusiveBoundary = false) {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !(allowExclusiveBoundary && value === '2100-01-01T00:00')) throw new BadRequestException('Дата должна быть в пределах 2000–2099 годов');
  const nominal = new Date(value + ':00.000Z');
  if (!Number.isFinite(+nominal) || nominal.toISOString().slice(0, 16) !== value) throw new BadRequestException('Некорректная дата или время');
  try { localStamp(nominal, timezone); } catch { throw new BadRequestException('Некорректный часовой пояс'); }
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = new Date(+nominal + hours * 3600000);
    offsets.add(Date.parse(localStamp(probe, timezone) + ':00Z') - +probe);
  }
  const candidates = [...offsets].map(offset => new Date(+nominal - offset)).filter(date => localStamp(date, timezone) === value);
  if (candidates.length !== 1) throw new BadRequestException('Время отсутствует или повторяется при переводе часов. Выберите однозначное время');
  return candidates[0];
}

export function scheduleFields(dto: { kind: string; startLocal: string; endLocal: string; timezone: string; breakMinutes: number; note: string }) {
  const startsAt = scheduleInstant(dto.startLocal, dto.timezone), endsAt = scheduleInstant(dto.endLocal, dto.timezone);
  const elapsed = (+endsAt - +startsAt) / 60000;
  if (elapsed <= 0 || elapsed > 1500 || dto.endLocal <= dto.startLocal) throw new BadRequestException('Запись должна длиться от одной минуты до 25 часов');
  if (dto.kind === 'SHIFT') {
    if (elapsed > 1440 || dto.breakMinutes >= elapsed) throw new BadRequestException('Смена — до 24 часов; перерыв короче смены');
  } else {
    const nextDay = new Date(Date.parse(dto.startLocal.slice(0, 10) + 'T00:00Z') + 86400000).toISOString().slice(0, 10);
    if (!dto.startLocal.endsWith('T00:00') || dto.endLocal !== nextDay + 'T00:00' || dto.breakMinutes !== 0) throw new BadRequestException('Выходной и отсутствие задаются на один полный местный день, без перерыва');
  }
  return { kind: dto.kind, startLocal: dto.startLocal, endLocal: dto.endLocal, timezone: dto.timezone, startsAt, endsAt, breakMinutes: dto.breakMinutes, plannedMinutes: dto.kind === 'SHIFT' ? elapsed - dto.breakMinutes : 0, note: dto.note.trim() };
}

export function scheduleMonth(month: string) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Выберите месяц в пределах 2000–2099 годов');
  const start = month + '-01T00:00', date = new Date(start + ':00Z');
  return { start, end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 16) };
}
