import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { canManageMeeting, MeetingActor, meetingVisibility, validateMeetingTimes } from './meeting-policy';
import { CancelMeetingDto, CreateMeetingDto, MeetingListDto, UpdateMeetingDto } from './meeting.dto';

const actor = (role = 'MANAGER_SALES', permissions = ['meetings.read','meetings.write']): MeetingActor => ({ id: 'self', role, departmentId: null, permissions: new Set(permissions) });
const payload = { title: 'Планёрка', agenda: '', kind: 'TEAM', startsAt: '2030-09-24T10:00:00Z', endsAt: '2030-09-24T11:00:00Z', timezone: 'Europe/Moscow', memberIds: [], requestKey: randomUUID() };
describe('Meeting policy and DTO contract', () => {
  it('uses own/invited visibility; only admin/executive see the company', () => {
    expect(meetingVisibility(actor())).toEqual({ OR: [{ organizerId: 'self' }, { members: { some: { userId: 'self' } } }] });
    expect(meetingVisibility(actor('ADMIN'))).toEqual({}); expect(meetingVisibility(actor('EXECUTIVE'))).toEqual({});
    expect(meetingVisibility(actor('SUPERVISOR'))).not.toEqual({});
  });
  it('does not grant write through visibility or management permission alone', () => {
    expect(canManageMeeting(actor(), 'self')).toBe(true); expect(canManageMeeting(actor(), 'other')).toBe(false);
    expect(canManageMeeting(actor('EXECUTIVE'), 'other')).toBe(false);
    expect(canManageMeeting(actor('ADMIN'), 'other')).toBe(false);
    expect(canManageMeeting(actor('ADMIN', ['meetings.manage']), 'other')).toBe(false);
    expect(canManageMeeting(actor('ADMIN', ['meetings.write','meetings.manage']), 'other')).toBe(true);
  });
  it('validates future intervals and timezone', () => {
    const now = new Date('2030-09-24T09:00:00Z');
    expect(validateMeetingTimes(payload.startsAt, payload.endsAt, payload.timezone, now).startsAt.toISOString()).toBe(payload.startsAt.replace('Z','.000Z'));
    for (const [start,end,zone] of [['invalid',payload.endsAt,'UTC'],[payload.startsAt,payload.startsAt,'UTC'],[payload.startsAt,'2030-09-24T10:00:59Z','UTC'],[payload.startsAt,'2030-09-25T10:00:00Z','UTC'],['2020-01-01T09:00:00Z','2020-01-01T10:00:00Z','UTC'],[payload.startsAt,payload.endsAt,'Not/AZone']]) expect(() => validateMeetingTimes(start,end,zone,now)).toThrow();
  });
  it('accepts explicit UTC/offset dates, trims title and requires an idempotency key', async () => {
    const dto = plainToInstance(CreateMeetingDto, {...payload,title:'  Планёрка  '});
    expect(await validate(dto)).toHaveLength(0); expect(dto.title).toBe('Планёрка');
    expect(await validate(plainToInstance(CreateMeetingDto,{...payload,startsAt:'2030-09-24T13:00:00+03:00'}))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateMeetingDto,{...payload,requestKey:undefined}))).length).toBeGreaterThan(0);
  });
  it.each([{ title:' ' },{ title:'a'.repeat(161) },{ startsAt:'2030-09-24T10:00' },{ startsAt:'2030-02-31T10:00:00Z' },{ agenda:'a'.repeat(5001) },{ kind:'GUEST' },{ memberIds:[randomUUID(), 'invalid'] },{ memberIds:Array.from({length:10},()=>randomUUID()) }])('rejects invalid input %j', async overrides => {
    expect((await validate(plainToInstance(CreateMeetingDto,{...payload,...overrides}))).length).toBeGreaterThan(0);
  });
  it('rejects duplicate participants, missing/stale-shape versions and empty cancellation', async () => {
    const id = randomUUID(); expect((await validate(plainToInstance(CreateMeetingDto,{...payload,memberIds:[id,id]}))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(UpdateMeetingDto,payload))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CancelMeetingDto,{version:1,reason:'   '}))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(CancelMeetingDto,{version:1,reason:'Перенос на следующую неделю'}))).toHaveLength(0);
  });
  it('validates pagination, filters and search', async () => {
    const query = {from:payload.startsAt,to:payload.endsAt,page:'2',limit:'30',status:'ALL'};
    expect(await validate(plainToInstance(MeetingListDto,query))).toHaveLength(0);
    for (const overrides of [{page:0},{page:1.5},{limit:101},{status:'UNKNOWN'},{q:['bad']},{from:'2030-09-24'}]) expect((await validate(plainToInstance(MeetingListDto,{...query,...overrides}))).length).toBeGreaterThan(0);
  });
});
