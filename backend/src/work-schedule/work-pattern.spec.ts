import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkPatternDto, WorkPatternActionDto } from './work-schedule.dto';
import { addDays, manualOverrides, patternDate, patternDays, workingDay, workPatternFields } from './work-pattern.policy';
const base = { pattern: 'CYCLE_2_2', startDate: '2026-09-24', endDate: null, startTime: '09:00', endTime: '18:00', timezone: 'Europe/Moscow', breakMinutes: 60, note: '' };
describe('Permanent work patterns', () => {
  it.each([['CYCLE_2_2', 'WWRRWWRR'], ['CYCLE_3_3', 'WWWRRRWW'], ['CYCLE_5_2', 'WWWWWRRW']])('%s starts with work and does not reset at month boundary', (pattern, expected) => {
    expect(Array.from({ length: 8 }, (_, i) => workingDay({ ...base, pattern }, addDays(base.startDate, i)) ? 'W' : 'R').join('')).toBe(expected);
  });
  it('calendar 5/2 uses weekdays, not five days from arbitrary anchor', () => {
    const rule = { ...base, pattern: 'WEEKDAYS', startDate: '2026-09-26' };
    expect(Array.from({ length: 9 }, (_, i) => workingDay(rule, addDays(rule.startDate, i)) ? 'W' : 'R').join('')).toBe('RRWWWWWRR');
  });
  it('honours the inclusive end date', () => expect(patternDays({ ...base, endDate: '2026-09-26' }, '2026-09-20', '2026-10-01').items.map(row => row.occurrenceDate)).toEqual(['2026-09-24','2026-09-25','2026-09-26']));
  it('has no synthetic one-month or one-year horizon', () => expect(patternDays(base, '2050-06-01', '2050-06-30').items).toHaveLength(30));
  it('preserves cycle phase across leap day', () => {
    const rule = { ...base, startDate: '2028-02-27' };
    expect(patternDays(rule, '2028-02-27', '2028-03-03').items.map(row => row.kind)).toEqual(['SHIFT','SHIFT','DAY_OFF','DAY_OFF','SHIFT','SHIFT']);
  });
  it('returns nothing before activation', () => expect(patternDays(base, '2026-09-01', '2026-09-23').items).toHaveLength(0));
  it('returns nothing after termination', () => expect(patternDays({ ...base, endDate: '2026-09-30' }, '2026-10-01', '2026-10-31').items).toHaveLength(0));
  it('clips first rest day after a night shift, with no overlapping generated intervals', () => {
    const rows = patternDays({ ...base, startTime: '22:00', endTime: '06:00', breakMinutes: 30 }, '2026-09-24', '2026-10-03').items;
    expect(rows[2].startLocal).toBe('2026-09-26T06:00'); expect(rows[0].plannedMinutes).toBe(450);
    for (let i = 1; i < rows.length; i++) expect(+rows[i].startsAt).toBeGreaterThanOrEqual(+rows[i - 1].endsAt);
  });
  it('reports DST date problems rather than silently converting wall time', () => {
    const result = patternDays({ ...base, pattern: 'CYCLE_5_2', startDate: '2026-03-28', timezone: 'Europe/Berlin', startTime: '02:30', endTime: '10:30' }, '2026-03-28', '2026-03-30');
    expect(result.issues[0].date).toBe('2026-03-29'); expect(result.items).toHaveLength(2);
  });
  it('published manual overrides the whole generated occurrence', () => {
    const row = patternDays(base, base.startDate, base.startDate).items[0];
    const manual = [{ startsAt: new Date(+row.startsAt + 60000), endsAt: new Date(+row.endsAt - 60000), status: 'PUBLISHED' }];
    expect(manualOverrides(row, manual, 'PUBLISHED')).toBe(true);
    expect(manualOverrides(row, [{ ...manual[0], status: 'DRAFT' }], 'PUBLISHED')).toBe(false);
    expect(manualOverrides(row, [{ ...manual[0], status: 'DRAFT' }], 'DRAFT')).toBe(true);
    expect(manualOverrides(row, [{ ...manual[0], status: 'CANCELLED' }], 'DRAFT')).toBe(false);
  });
  it('touching intervals do not conflict', () => {
    const row = patternDays(base, base.startDate, base.startDate).items[0];
    expect(manualOverrides(row, [{ startsAt: row.endsAt, endsAt: new Date(+row.endsAt + 60000), status: 'PUBLISHED' }], 'PUBLISHED')).toBe(false);
  });
  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2100-01-01'])('rejects invalid anchor %s', value => expect(() => patternDate(value)).toThrow());
  it('rejects end before start', () => expect(() => workPatternFields({ ...base, endDate: '2026-09-23' })).toThrow());
  it('rejects break consuming entire shift', () => expect(() => workPatternFields({ ...base, breakMinutes: 540 })).toThrow());
  it('keeps an empty end as null', () => expect(workPatternFields(base).endDate).toBeNull());
  it('bounds any single expansion without bounding permanent storage', () => expect(() => patternDays(base, '2026-09-01', '2026-12-31')).toThrow());
  const payload = { ...base, employeeId: '51000000-0000-4000-8000-000000000001', requestKey: '51000000-0000-4000-8000-000000000002', status: 'PUBLISHED' };
  it('accepts perpetual template DTO', async () => expect(await validate(plainToInstance(CreateWorkPatternDto, payload))).toHaveLength(0));
  it.each([{ startTime: '24:00' }, { endTime: '9:00' }, { breakMinutes: -1 }, { pattern: 'UNKNOWN' }, { creatorId: payload.employeeId }, { departmentId: payload.employeeId }])('rejects invalid or forged values %j', async changes => expect((await validate(plainToInstance(CreateWorkPatternDto, { ...payload, ...changes }), { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0));
  it('requires action reasons', async () => expect((await validate(plainToInstance(WorkPatternActionDto, { action: 'END', version: 1, reason: ' ' }))).length).toBeGreaterThan(0));
});
