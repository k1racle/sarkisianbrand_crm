import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { WorkTimeCommandDto, WorkTimeQueryDto } from './work-time.dto';
import { timePeriod, timeTotals, timeZone, todayPeriod, transitionAllowed } from './work-time.policy';
import { WorkTimeService } from './work-time.service';

const date = (s: string) => new Date('2026-09-' + s + ':00Z');
const span = (start: string, end: string | null) => ({ startedAt: date(start), endedAt: end ? date(end) : null });
describe('Actual work time, not planned hours', () => {
  it('subtracts multiple breaks', () => expect(timeTotals({ ...span('28T06:00', '28T15:00'), breaks: [span('28T09:00', '28T09:30'), span('28T12:00', '28T12:15')] }, date('28T16:00'))).toEqual({ elapsedMs: 32400000, breakMs: 2700000, workedMs: 29700000 }));
  it('freezes work during an open break', () => expect(timeTotals({ ...span('28T06:00', null), breaks: [span('28T07:00', null)] }, date('28T10:00')).workedMs).toBe(3600000));
  it('clips night work and break to month', () => {
    const period = timePeriod('2026-10', 'Europe/Moscow');
    const t = timeTotals({ startedAt: date('30T20:00'), endedAt: new Date('2026-10-01T02:00Z'), breaks: [{ startedAt: date('30T20:30'), endedAt: date('30T21:30') }] }, new Date('2026-10-02'), period.start, period.end);
    expect(t).toEqual({ elapsedMs: 18000000, breakMs: 1800000, workedMs: 16200000 });
  });
  it('clips an ongoing session started before today', () => { const day = todayPeriod(date('28T01:00'), 'Europe/Moscow'); expect(day.date).toBe('2026-09-28'); expect(timeTotals({ ...span('27T20:00', null), breaks: [] }, date('28T01:00'), day.start, day.end).workedMs).toBe(4 * 3600000); });
  it('does not double-subtract overlapping legacy breaks', () => expect(timeTotals({ ...span('28T06:00', '28T09:00'), breaks: [span('28T07:00', '28T08:00'), span('28T07:30', '28T08:30')] }, date('28T10:00')).workedMs).toBe(5400000));
  it('a session ending at period start contributes zero', () => expect(timeTotals({ ...span('27T20:00', '27T21:00'), breaks: [] }, date('28T10:00'), date('27T21:00')).workedMs).toBe(0));
  it('keeps sub-minute precision', () => expect(timeTotals({ startedAt: new Date(100), endedAt: new Date(1100), breaks: [{ startedAt: new Date(300), endedAt: new Date(500) }] }, new Date(2000)).workedMs).toBe(800));
  it('does not invent time before a future session', () => expect(timeTotals({ ...span('28T10:00', null), breaks: [] }, date('28T09:00')).workedMs).toBe(0));
  it('handles a 25-hour DST day', () => { const p = todayPeriod(new Date('2026-10-25T12:00Z'), 'Europe/Berlin'); expect(+p.end - +p.start).toBe(25 * 3600000); });
  it('rejects invalid timezone', () => expect(() => timeZone('Invalid/Zone')).toThrow());
  it('supports the final allowed month with an exclusive 2100 boundary', () => expect(timePeriod('2099-12', 'Europe/Moscow').end.toISOString()).toBe('2099-12-31T21:00:00.000Z'));
  const row = { id: 'own', version: 2, ...span('28T06:00', null), breaks: [] };
  it.each(['PAUSE', 'FINISH'])('allows %s while working', action => expect(() => transitionAllowed(row, action, 'own', 2, date('28T07:00'))).not.toThrow());
  it('allows resume on a break', () => expect(() => transitionAllowed({ ...row, breaks: [span('28T06:30', null)] }, 'RESUME', 'own', 2, date('28T07:00'))).not.toThrow());
  it.each([
    ['START', 'own', 2], ['RESUME', 'own', 2], ['PAUSE', 'foreign', 2], ['PAUSE', 'own', 1], ['CANCEL', 'own', 2],
  ])('rejects invalid transition %s %s %s', (action, id, version) => expect(() => transitionAllowed(row, String(action), String(id), Number(version), date('28T07:00'))).toThrow());
  it('rejects a second pause', () => expect(() => transitionAllowed({ ...row, breaks: [span('28T06:30', null)] }, 'PAUSE', 'own', 2, date('28T07:00'))).toThrow());
  it('rejects backwards server clock', () => expect(() => transitionAllowed(row, 'FINISH', 'own', 2, date('28T05:00'))).toThrow());
  it('requires a fresh START', () => expect(() => transitionAllowed(null, 'START', 'old', 0, date('28T07:00'))).toThrow());
  it('allows a new day without scheduled hours', () => expect(() => transitionAllowed(null, 'START', undefined, 0, date('28T07:00'))).not.toThrow());
  const input = { action: 'START', version: 0, requestKey: randomUUID() };
  it('accepts server-time commands', async () => expect(await validate(plainToInstance(WorkTimeCommandDto, input))).toHaveLength(0));
  it.each([{ employeeId: randomUUID() }, { startedAt: new Date().toISOString() }, { timezone: 'UTC' }, { version: -1 }, { action: 'DELETE' }, { requestKey: 'invalid' }])('rejects forged/invalid fields %j', async patch => expect((await validate(plainToInstance(WorkTimeCommandDto, { ...input, ...patch }), { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0));
  it.each(['2026-13', '2100-01', 'invalid'])('rejects invalid month %s', async month => expect((await validate(plainToInstance(WorkTimeQueryDto, { month }))).length).toBeGreaterThan(0));
});

function fixture() {
  let state: any = { sessions: [], breaks: [], events: [], audits: [] }, chain = Promise.resolve();
  const f = { now: date('28T06:00'), active: true, role: 'MANAGER_SALES', deny: [] as string[], failAudit: false };
  const copyRow = (row: any) => row ? { ...row, breaks: state.breaks.filter((p: any) => p.sessionId === row.id).map((p: any) => ({ ...p })) } : null;
  function filter(where: any, row: any): boolean {
    if (where.employeeId && row.employeeId !== where.employeeId) return false;
    if ('endedAt' in where) {
      if (where.endedAt === null && row.endedAt !== null) return false;
      if (where.endedAt?.not === null && row.endedAt === null) return false;
      if (where.endedAt?.gt && (!row.endedAt || +row.endedAt <= +where.endedAt.gt)) return false;
    }
    if (where.startedAt?.lt && +row.startedAt >= +where.startedAt.lt) return false;
    return !where.OR || where.OR.some((part: any) => filter(part, row));
  }
  const db: any = {
    $executeRaw: jest.fn(async()=>1),
    crmTimesheetPeriod: {findFirst:jest.fn(async()=>null)},
    $queryRaw: jest.fn(async (strings: any) => String(strings[0]).includes('clock_timestamp') ? [{ now: f.now }] : []),
    user: { findUnique: jest.fn(async ({ where }) => ({ id: where.id, isActive: f.active, role: f.role, timezone: 'Europe/Moscow', departmentId: 'dept' })) },
    rolePermission: { findMany: async () => ['work_time.read', 'work_time.track'].map(key => ({ permission: { key } })) },
    userPermission: { findMany: async () => f.deny.map(key => ({ effect: 'DENY', permission: { key } })) },
    crmWorkSession: {
      findFirst: jest.fn(async ({ where, orderBy }) => { let rows = state.sessions.filter((r: any) => filter(where, r)); if (orderBy?.endedAt) rows = rows.sort((a: any, b: any) => +b.endedAt - +a.endedAt); return copyRow(rows[0]); }),
      findMany: jest.fn(async ({ where }) => state.sessions.filter((r: any) => filter(where, r)).map(copyRow)),
      create: async ({ data }) => { const r = { ...data, id: randomUUID(), version: 1, endedAt: null }; state.sessions.push(r); return copyRow(r); },
      update: async ({ where, data }) => { const r = state.sessions.find((r: any) => r.id === where.id); r.version += data.version.increment; if (data.endedAt) r.endedAt = data.endedAt; return copyRow(r); },
    },
    crmWorkBreak: { create: async ({ data }) => { const r = { ...data, id: randomUUID(), endedAt: null }; state.breaks.push(r); return r; }, update: async ({ where, data }) => Object.assign(state.breaks.find((r: any) => r.id === where.id), data) },
    crmWorkTimeEvent: { findUnique: async ({ where }) => state.events.find((r: any) => r.actorId === where.actorId_requestKey.actorId && r.requestKey === where.actorId_requestKey.requestKey), create: async ({ data }) => { state.events.push({ ...data }); return data; } },
    auditLog: { create: async ({ data }) => { if (f.failAudit) throw new Error('audit unavailable'); state.audits.push(data); return data; } },
  };
  const prisma: any = { $transaction: (run: any) => {
    const operation = chain.then(async () => { const before = structuredClone(state); try { return await run(db); } catch (e) { state = before; throw e; } });
    chain = operation.then(() => undefined, () => undefined); return operation;
  } };
  return { ...f, config: f, db, state: () => state, service: new WorkTimeService(prisma) };
}
describe('Persisted work-day commands', () => {
  const start = () => ({ action: 'START', version: 0, requestKey: randomUUID() }) as WorkTimeCommandDto;
  it('creates one day and one audit for concurrent identical requests', async () => { const f = fixture(), dto = start(); const results = await Promise.all(Array.from({ length: 10 }, () => f.service.command('me', dto))); expect(results.filter(r => !r.reused)).toHaveLength(1); expect(f.state().sessions).toHaveLength(1); expect(f.state().events).toHaveLength(1); expect(f.state().audits).toHaveLength(1); });
  it('a second device with a different key cannot start another day', async () => { const f = fixture(); await f.service.command('me', start()); await expect(f.service.command('me', start())).rejects.toThrow('уже начат'); });
  it('persists start, multiple breaks, and finish during a break', async () => {
    const f = fixture(), r = await f.service.command('me', start());
    const command = (action: WorkTimeCommandDto['action'], version: number, hour: string) => { f.config.now = date('28T' + hour); return f.service.command('me', { action, version, sessionId: r.sessionId, requestKey: randomUUID() }); };
    await command('PAUSE', 1, '07:00'); await command('RESUME', 2, '07:30'); await command('PAUSE', 3, '08:00'); await command('FINISH', 4, '09:00');
    const state = await f.service.current('me'); expect(state.active).toBeNull(); expect(state.today).toEqual({ workedMs: 5400000, breakMs: 5400000 }); expect(f.state().breaks.every((b: any) => b.endedAt)).toBe(true); expect(f.state().events).toHaveLength(5);
    const history = await f.service.history('me', { month: '2026-09' }); expect(history.items[0].status).toBe('FINISHED'); expect(history.totals.workedMs).toBe(5400000);
  });
  it('does not reopen a day when a delayed old START repeats', async () => { const f = fixture(), dto = start(), r = await f.service.command('me', dto); await f.service.command('me', { action: 'FINISH', version: 1, sessionId: r.sessionId, requestKey: randomUUID() }); expect((await f.service.command('me', dto)).reused).toBe(true); expect((await f.service.current('me')).active).toBeNull(); });
  it('rejects changed payload with a reused key', async () => { const f = fixture(), dto = start(), r = await f.service.command('me', dto); await expect(f.service.command('me', { ...dto, action: 'FINISH', version: 1, sessionId: r.sessionId })).rejects.toThrow('другого действия'); });
  it('rejects a stale version from another device', async () => { const f = fixture(), r = await f.service.command('me', start()); await f.service.command('me', { action: 'PAUSE', version: 1, sessionId: r.sessionId, requestKey: randomUUID() }); await expect(f.service.command('me', { action: 'FINISH', version: 1, sessionId: r.sessionId, requestKey: randomUUID() })).rejects.toThrow('изменилось'); });
  it('cannot close another employee day by ID', async () => { const f = fixture(), r = await f.service.command('other', start()); await expect(f.service.command('me', { action: 'FINISH', version: 1, sessionId: r.sessionId, requestKey: randomUUID() })).rejects.toThrow(); expect((await f.service.history('me', { month: '2026-09' })).items).toHaveLength(0); });
  it('rolls back the day if audit fails', async () => { const f = fixture(); f.config.failAudit = true; await expect(f.service.command('me', start())).rejects.toThrow('audit unavailable'); expect(f.state().sessions).toHaveLength(0); expect(f.state().events).toHaveLength(0); });
  it('rolls back a break and version if audit fails', async () => { const f = fixture(), r = await f.service.command('me', start()); f.config.failAudit = true; await expect(f.service.command('me', { action: 'PAUSE', version: 1, sessionId: r.sessionId, requestKey: randomUUID() })).rejects.toThrow(); expect(f.state().breaks).toHaveLength(0); expect(f.state().sessions[0].version).toBe(1); });
  it('warns about a day open longer than 24h without auto-closing it', async () => { const f = fixture(); await f.service.command('me', start()); f.config.now = date('29T07:00'); const s = await f.service.current('me'); expect(s.active?.longRunning).toBe(true); expect(s.active?.status).toBe('WORKING'); });
  it('does not project an open day into future months', async () => { const f = fixture(); await f.service.command('me', start()); expect((await f.service.history('me', { month: '2026-10' })).items).toHaveLength(0); });
  it.each(['work_time.read', 'work_time.track'])('honors denied %s even on replay', async key => { const f = fixture(), dto = start(); await f.service.command('me', dto); f.config.deny = [key]; await expect(f.service.command('me', dto)).rejects.toThrow(); });
  it('inactive employees cannot record', async () => { const f = fixture(); f.config.active = false; await expect(f.service.command('me', start())).rejects.toThrow(); });
  it('clients cannot record', async () => { const f = fixture(); f.config.role = 'CUSTOMER_B2C'; await expect(f.service.command('me', start())).rejects.toThrow(); });
  it('does not return internal department, employee or request keys', async () => { const f = fixture(); await f.service.command('me', start()); const row = (await f.service.current('me')).active!; expect(row).not.toHaveProperty('employeeId'); expect(row).not.toHaveProperty('departmentId'); expect(row).not.toHaveProperty('requestKey'); });
  it('refuses START before the last end when the server clock goes backwards', async () => { const f = fixture(), r = await f.service.command('me', start()); f.config.now = date('28T07:00'); await f.service.command('me', { action: 'FINISH', version: 1, sessionId: r.sessionId, requestKey: randomUUID() }); f.config.now = date('28T06:30'); await expect(f.service.command('me', start())).rejects.toThrow('синхронизации'); });
});
