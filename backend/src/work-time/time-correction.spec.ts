import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { CreateTimeCorrectionDto, DecideTimeCorrectionDto, TimeCorrectionQueryDto } from './time-correction.dto';
import { correctionFields, proposalView, timeSnapshot } from './time-correction.policy';
import { plannedOverlap, workTimePlan } from './work-time-plan';
const input = { requestKey: randomUUID(), timezone: 'Europe/Moscow', startLocal: '2026-09-01T09:00', endLocal: '2026-09-01T18:00', reason: 'Забыл завершить смену', breaks: [{ startLocal: '2026-09-01T13:00', endLocal: '2026-09-01T14:00' }] };
const now = new Date('2026-10-01T12:00Z');
const errors = (type: any, values: any) => validate(plainToInstance(type, values) as object, { whitelist: true, forbidNonWhitelisted: true });
describe('Time corrections contract', () => {
  it('validates a minute-precision proposal', async () => expect(await errors(CreateTimeCorrectionDto,input)).toHaveLength(0));
  it.each([{ employeeId: randomUUID() }, { status: 'APPROVED' }, { timezone: '' }, { baseVersion: 0 }, { sessionId: 'foreign' }, { reason: '   ' }, { breaks: null }, { breaks: Array(25).fill(input.breaks[0]) }, { startLocal: '2026-09-01T09:00:01' }, { breaks: [{ ...input.breaks[0], employeeId: 'forged' }] }])('rejects forged/invalid input %j', async change => expect((await errors(CreateTimeCorrectionDto,{ ...input,...change })).length).toBeGreaterThan(0));
  it('resolves timezone and deducts breaks', () => {
    const fields = correctionFields(input,now), proposal = proposalView({ ...fields, timezone: input.timezone },now);
    expect(fields.startedAt.toISOString()).toBe('2026-09-01T06:00:00.000Z'); expect(proposal.totals.workedMs).toBe(8*3600000);
  });
  it.each([
    { endLocal: '2026-09-01T08:00' }, { endLocal: input.startLocal }, { endLocal: '2026-09-02T09:01' }, { startLocal: '2026-10-01T15:00', endLocal: '2026-10-01T16:00', breaks: [] },
    { timezone: 'Bad/Zone' }, { startLocal: '2026-02-30T09:00' },
    { breaks: [{ startLocal: '2026-09-01T08:00', endLocal: '2026-09-01T10:00' }] },
    { breaks: [{ startLocal: '2026-09-01T17:00', endLocal: '2026-09-01T19:00' }] },
    { breaks: [{ startLocal: '2026-09-01T14:00', endLocal: '2026-09-01T13:00' }] },
    { breaks: [input.breaks[0],input.breaks[0]] },
    { timezone: 'Europe/Berlin', startLocal: '2026-03-29T02:30', endLocal: '2026-03-29T04:30', breaks: [] },
    { timezone: 'Europe/Berlin', startLocal: '2026-10-25T02:30', endLocal: '2026-10-25T04:30', breaks: [] },
  ])('rejects impossible or unsafe intervals %j', change => expect(() => correctionFields({ ...input, ...change },now)).toThrow());
  it('sorts touching breaks without double counting', () => {
    const breaks = [input.breaks[0],{ startLocal: '2026-09-01T12:00', endLocal: '2026-09-01T13:00' }];
    expect(correctionFields({ ...input,breaks },now).breaks[0].startedAt.toISOString()).toBe('2026-09-01T09:00:00.000Z');
  });
  it('retains original seconds and only attendance fields in snapshot', () => {
    const row = { ...correctionFields(input,now), startedAt: new Date('2026-09-01T06:00:32.123Z'), timezone: 'Europe/Moscow', version: 2, privateEmail: 'not serialized' };
    const snapshot = timeSnapshot(row); expect(snapshot.startedAt).toBe(row.startedAt.toISOString()); expect(snapshot.privateEmail).toBeUndefined(); expect(snapshot.version).toBe(2);
  });
  it.each([{ action: 'DELETE' },{ version: 0 },{ note: '  ' },{ reviewerId: randomUUID() }])('rejects invalid decision %j', async change => expect((await errors(DecideTimeCorrectionDto,{action:'APPROVE',version:1,note:'Проверено',requestKey:randomUUID(),...change})).length).toBeGreaterThan(0));
  it.each([{ page: 0 },{ page: '1.5' },{ scope: 'COMPANY' },{ status: 'UNKNOWN' }])('rejects invalid listing %j', async change => expect((await errors(TimeCorrectionQueryDto,change)).length).toBeGreaterThan(0));
});
describe('Published plan versus actual', () => {
  const period = { start: new Date('2026-09-01T00:00Z'), end: new Date('2026-10-01T00:00Z') };
  const pattern = { pattern:'WEEKDAYS',startDate:'2026-09-01',endDate:null,startTime:'09:00',endTime:'18:00',timezone:'UTC',breakMinutes:60,note:'',status:'PUBLISHED' };
  const manual = { kind:'DAY_OFF',status:'PUBLISHED',startsAt:new Date('2026-09-01T00:00Z'),endsAt:new Date('2026-09-02T00:00Z'),plannedMinutes:0 };
  const db = (manuals: any[] = [],patterns: any[] = []) => ({ crmWorkSchedule:{findMany:jest.fn().mockResolvedValue(manuals)},crmWorkPattern:{findMany:jest.fn().mockResolvedValue(patterns)} }) as any;
  it('does not treat unplanned month as unavailable', async () => expect(await workTimePlan(db(),'u',period)).toEqual({available:true,plannedMs:0,shifts:0,warning:null}));
  it('expands permanent schedule and subtracts published manual rest day', async () => expect(await workTimePlan(db([manual],[pattern]),'u',period)).toMatchObject({available:true,plannedMs:21*8*3600000,shifts:21}));
  it('counts replacement manual work shift instead of both shifts', async () => {
    const replacement = { ...manual,kind:'SHIFT',startsAt:new Date('2026-09-01T10:00Z'),endsAt:new Date('2026-09-01T15:00Z'),plannedMinutes:300 };
    expect(await workTimePlan(db([replacement],[pattern]),'u',period)).toMatchObject({available:true,plannedMs:(21*8+5)*3600000,shifts:22});
  });
  it('does not hide overlaps in a numeric total', async () => expect(await workTimePlan(db([],[pattern,pattern]),'u',period)).toMatchObject({available:false,plannedMs:null}));
  it('keeps actual history available when legacy pattern timezone is invalid', async () => expect(await workTimePlan(db([],[{...pattern,timezone:'Invalid/Zone'}]),'u',period)).toMatchObject({available:false,plannedMs:null}));
  it('fails closed for overflow', async () => expect(await workTimePlan(db(Array(1001).fill(manual)),'u',period)).toMatchObject({available:false,plannedMs:null}));
  it('only queries employee published records', async () => { const fixture=db(); await workTimePlan(fixture,'owner',period); expect(fixture.crmWorkSchedule.findMany.mock.calls[0][0].where).toMatchObject({employeeId:'owner',status:'PUBLISHED'}); expect(fixture.crmWorkPattern.findMany.mock.calls[0][0].where).toEqual({employeeId:'owner',status:'PUBLISHED'}); });
  it('conserves planned minutes across adjacent months with proportional breaks', () => {
    const row={startsAt:new Date('2026-09-30T22:00Z'),endsAt:new Date('2026-10-01T06:00Z'),plannedMinutes:421};
    expect(plannedOverlap(row,period.start,period.end)+plannedOverlap(row,period.end,new Date('2026-11-01T00:00Z'))).toBe(421*60000);
    expect(plannedOverlap(row,period.start,period.end)).toBe(421*60000/4);
  });
});
