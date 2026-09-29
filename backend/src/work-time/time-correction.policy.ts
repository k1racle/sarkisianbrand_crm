import { BadRequestException } from '@nestjs/common';
import { scheduleInstant } from '../work-schedule/work-schedule.policy';
import { CreateTimeCorrectionDto } from './time-correction.dto';
import { TimeSession, timeTotals } from './work-time.policy';
export function correctionFields(dto: CreateTimeCorrectionDto, now: Date) {
  const startedAt = scheduleInstant(dto.startLocal, dto.timezone), endedAt = scheduleInstant(dto.endLocal, dto.timezone);
  if (+endedAt <= +startedAt || +endedAt - +startedAt > 86400000) throw new BadRequestException('Исправленный рабочий день должен длиться от минуты до 24 часов');
  if (+endedAt > +now) throw new BadRequestException('Нельзя добавить фактическое время в будущем');
  const breaks = dto.breaks.map(row => ({ startedAt: scheduleInstant(row.startLocal, dto.timezone), endedAt: scheduleInstant(row.endLocal, dto.timezone) })).sort((a,b) => +a.startedAt - +b.startedAt);
  for (let i = 0; i < breaks.length; i++) {
    const row = breaks[i];
    if (+row.endedAt <= +row.startedAt || +row.startedAt < +startedAt || +row.endedAt > +endedAt) throw new BadRequestException('Каждый перерыв должен находиться внутри рабочего дня и иметь положительную длительность');
    if (i && +breaks[i-1].endedAt > +row.startedAt) throw new BadRequestException('Перерывы не должны пересекаться');
  }
  return { startedAt, endedAt, breaks };
}
export function timeSnapshot(row: TimeSession & { timezone: string; version?: number }) {
  return JSON.parse(JSON.stringify({ startedAt: row.startedAt, endedAt: row.endedAt, timezone: row.timezone, version: row.version, breaks: row.breaks.map(({ startedAt, endedAt }) => ({ startedAt, endedAt })) }));
}
export function proposalView(row: { startedAt: Date; endedAt: Date; timezone: string; breaks: unknown }, now: Date) {
  const breaks = (row.breaks as { startedAt: string; endedAt: string }[]).map(item => ({ startedAt: new Date(item.startedAt), endedAt: new Date(item.endedAt) }));
  return { startedAt: row.startedAt, endedAt: row.endedAt, timezone: row.timezone, breaks, totals: timeTotals({ ...row, breaks }, now) };
}
