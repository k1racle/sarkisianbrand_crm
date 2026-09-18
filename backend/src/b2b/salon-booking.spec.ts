import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SalonBookingService } from './salon-booking.service';
import { dateKey, isOccupied, localInstant } from './salon-booking-time';
import { PublicSalonBookingDto } from './dto/salon-booking.dto';
import { B2BService } from './b2b.service';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));

describe('Salon booking — isolated fixtures, no business database/provider calls', () => {
  const setting = { organizationId:'org',enabled:true,timeZone:'Europe/Moscow',startMinute:540,endMinute:720,slotStep:15,horizonDays:30,workingDays:[0,1,2,3,4,5,6],masterIds:['master'],organization:{name:'Salon',status:'ACTIVE'} };
  const selection = {serviceId:'service',masterMemberId:'master',date:'2026-09-19'};
  const visit = {id:'visit',organizationId:'org',clientId:'client',serviceId:'service',masterMemberId:'master',startTime:new Date('2026-09-19T06:00:00.000Z'),endTime:new Date('2026-09-19T07:00:00.000Z'),status:'NEW',service:{price:100,duration:60}};
  function fixture() {
    const db:any = {
      organizationMember:{findFirst:jest.fn().mockResolvedValue({id:'master',organizationId:'org',role:'OWNER'}),count:jest.fn().mockResolvedValue(1),findMany:jest.fn().mockResolvedValue([{id:'master',user:{firstName:'Master',lastName:'Test'}}])},
      salonBookingSetting:{findUnique:jest.fn().mockResolvedValue(setting),upsert:jest.fn().mockResolvedValue(setting)},
      salonPresentation:{findUnique:jest.fn().mockResolvedValue(null)},
      b2BService:{findFirst:jest.fn().mockResolvedValue({id:'service',name:'Manicure',duration:60,price:100,isActive:true}),findMany:jest.fn().mockResolvedValue([{id:'service',name:'Manicure',duration:60,price:100}])},
      b2BBooking:{findFirst:jest.fn().mockResolvedValue(null),findMany:jest.fn().mockResolvedValue([]),create:jest.fn(async({data}:any)=>({id:'visit',...data})),update:jest.fn(async({data}:any)=>({...visit,...data}))},
      b2BClient:{findFirst:jest.fn().mockResolvedValue({id:'client'}),create:jest.fn().mockResolvedValue({id:'client'}),update:jest.fn()},
      $executeRaw:jest.fn().mockResolvedValue(1),
    };
    db.$transaction=jest.fn((fn:any)=>fn(db));return {db,service:new SalonBookingService(db)};
  }
  beforeEach(()=>{jest.useFakeTimers().setSystemTime(new Date('2026-09-18T12:00:00Z'));});
  it('uses a different opening time on each weekday and excludes any visit crossing a break',async()=>{
    const f=fixture();f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,endMinute:1200,weeklySchedule:[{day:6,startMinute:600,endMinute:1020,breaks:[{startMinute:780,endMinute:840}]}]});
    const value=await f.service.slots('org',selection);
    expect(value.slots[0]).toBe('2026-09-19T07:00:00.000Z');expect(value.slots).not.toContain('2026-09-19T09:15:00.000Z');expect(value.slots).not.toContain('2026-09-19T10:00:00.000Z');expect(value.slots).toContain('2026-09-19T11:00:00.000Z');expect(value.slots.at(-1)).toBe('2026-09-19T13:00:00.000Z');
  });
  it('rejects overlapping breaks or pauses outside the workday',async()=>{
    const f=fixture();for(const breaks of [[{startMinute:480,endMinute:600}],[{startMinute:600,endMinute:620},{startMinute:610,endMinute:650}],[{startMinute:630,endMinute:620}]])await expect(f.service.saveSettings('user',{...setting,weeklySchedule:[{day:6,startMinute:540,endMinute:720,breaks}]})).rejects.toThrow(BadRequestException);expect(f.db.salonBookingSetting.upsert).not.toHaveBeenCalled();
  });
  afterEach(()=>jest.useRealTimers());

  it('rejects private creation and moves that cross a configured break',async()=>{
    const f=fixture();f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,weeklySchedule:[{day:6,startMinute:600,endMinute:1020,breaks:[{startMinute:780,endMinute:840}]}]});
    await expect(f.service.create('org',{clientId:'client',serviceId:'service',masterMemberId:'master',startTime:'2026-09-19T09:30:00.000Z'})).rejects.toThrow(ConflictException);
    f.db.b2BBooking.findFirst.mockResolvedValueOnce(visit).mockResolvedValue(null);
    await expect(f.service.update('org','visit',{startTime:'2026-09-19T09:30:00.000Z'})).rejects.toThrow(ConflictException);
    expect(f.db.b2BBooking.create).not.toHaveBeenCalled();expect(f.db.b2BBooking.update).not.toHaveBeenCalled();
  });
  it('allows completion of an existing visit after the working schedule changes',async()=>{
    const f=fixture();f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,weeklySchedule:[{day:6,startMinute:600,endMinute:1020,breaks:[]}]});
    f.db.b2BBooking.findFirst.mockResolvedValueOnce(visit).mockResolvedValue(null);
    await f.service.update('org','visit',{status:'COMPLETED'});
    expect(f.db.b2BClient.update).toHaveBeenCalledTimes(1);expect(f.db.salonBookingSetting.findUnique).not.toHaveBeenCalled();
  });

  it('converts local Moscow time and midnight independently of server TZ',()=>{
    expect(localInstant('2026-09-19',540,'Europe/Moscow')?.toISOString()).toBe('2026-09-19T06:00:00.000Z');
    expect(localInstant('2026-09-19',1440,'Europe/Moscow')?.toISOString()).toBe('2026-09-19T21:00:00.000Z');
    expect(dateKey(new Date('2026-09-18T22:00:00Z'),'Europe/Moscow')).toBe('2026-09-19');
  });
  it('rejects nonexistent calendar dates and DST-gap wall times',()=>{
    expect(()=>localInstant('2026-02-30',540,'Europe/Moscow')).toThrow(BadRequestException);
    expect(localInstant('2026-03-29',150,'Europe/Berlin')).toBeNull();
  });
  it('treats touching endpoints as free but overlapping/cross-midnight visits as busy',()=>{
    expect(isOccupied(new Date('2026-09-19T07:00Z'),new Date('2026-09-19T08:00Z'),[visit])).toBe(false);
    expect(isOccupied(new Date('2026-09-19T06:30Z'),new Date('2026-09-19T07:30Z'),[visit])).toBe(true);
  });
  it('returns no customer contacts, employee email or occupied visit details publicly',async()=>{
    const f=fixture();const profile=await f.service.publicProfile('org');
    expect(profile.masters).toEqual([{id:'master',name:'Master Test'}]);
    expect(f.db.organizationMember.findMany.mock.calls[0][0].select.user.select).toEqual({firstName:true,lastName:true});
    expect(profile).not.toHaveProperty('members');expect(profile).not.toHaveProperty('creditLimit');
  });
  it('does not publish a disabled or unapproved organization',async()=>{
    const f=fixture();f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,enabled:false});await expect(f.service.publicProfile('org')).rejects.toThrow(NotFoundException);
    f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,organization:{status:'PROSPECT'}});await expect(f.service.publicProfile('org')).rejects.toThrow(NotFoundException);
  });
  it('fits the full service duration within working hours and excludes occupied intervals',async()=>{
    const f=fixture();f.db.b2BBooking.findMany.mockResolvedValue([visit]);const value=await f.service.slots('org',selection);
    expect(value.slots[0]).toBe('2026-09-19T07:00:00.000Z');expect(value.slots.at(-1)).toBe('2026-09-19T08:00:00.000Z');
    expect(f.db.b2BBooking.findMany.mock.calls[0][0].select).toEqual({startTime:true,endTime:true});
  });
  it('rejects a foreign/unpublished master and unavailable service',async()=>{
    const f=fixture();await expect(f.service.slots('org',{...selection,masterMemberId:'foreign'})).rejects.toThrow(NotFoundException);
    f.db.b2BService.findFirst.mockResolvedValue(null);await expect(f.service.slots('org',selection)).rejects.toThrow(NotFoundException);
  });
  it('enforces horizon, past dates and working days',async()=>{
    const f=fixture();await expect(f.service.slots('org',{...selection,date:'2026-09-17'})).rejects.toThrow(BadRequestException);
    await expect(f.service.slots('org',{...selection,date:'2026-11-19'})).rejects.toThrow(BadRequestException);
    f.db.salonBookingSetting.findUnique.mockResolvedValue({...setting,workingDays:[]});expect((await f.service.slots('org',selection)).slots).toEqual([]);
  });
  it('locks before public slot validation and does not overwrite an existing client',async()=>{
    const f=fixture();const result=await f.service.publicCreate('org',{...selection,startTime:'2026-09-19T06:00:00.000Z',firstName:'Test',phone:'+7 900 123-45-67',personalDataConsent:true});
    expect(f.db.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(f.db.b2BBooking.findMany.mock.invocationCallOrder[0]);
    expect(f.db.b2BBooking.create.mock.calls[0][0].data).toMatchObject({organizationId:'org',clientId:'client',masterMemberId:'master'});
    expect(f.db.b2BClient.update).not.toHaveBeenCalled();expect(result).not.toHaveProperty('client');
  });
  it('rejects forged/occupied starts without inserting clients or bookings',async()=>{
    const f=fixture();await expect(f.service.publicCreate('org',{...selection,startTime:'2026-09-19T06:01:00.000Z',firstName:'Test',phone:'79001234567',personalDataConsent:true})).rejects.toThrow(ConflictException);
    expect(f.db.b2BBooking.create).not.toHaveBeenCalled();expect(f.db.b2BClient.create).not.toHaveBeenCalled();
  });
  it('never converts textual consent into boolean true',async()=>{
    const dto=plainToInstance(PublicSalonBookingDto,{personalDataConsent:'false'},{enableImplicitConversion:true});
    expect((await validate(dto)).some(e=>e.property==='personalDataConsent')).toBe(true);
  });
  it('requires the owner for publication and validates foreign master selection',async()=>{
    const f=fixture();f.db.organizationMember.findFirst.mockResolvedValue({organizationId:'org',role:'EMPLOYEE'});await expect(f.service.saveSettings('user',setting)).rejects.toThrow(ForbiddenException);
    f.db.organizationMember.findFirst.mockResolvedValue({organizationId:'org',role:'OWNER'});f.db.organizationMember.count.mockResolvedValue(0);await expect(f.service.saveSettings('user',setting)).rejects.toThrow(BadRequestException);
  });
  it('locks private writes and rejects concurrent occupied-master checks',async()=>{
    const f=fixture();f.db.b2BBooking.findFirst.mockResolvedValue(visit);
    await expect(f.service.create('org',{clientId:'client',serviceId:'service',masterMemberId:'master',startTime:visit.startTime.toISOString()})).rejects.toThrow(ConflictException);
    expect(f.db.$executeRaw).toHaveBeenCalled();expect(f.db.b2BBooking.create).not.toHaveBeenCalled();
  });
  it('allows cancellation without conflict checking and counts completed visits only once',async()=>{
    const f=fixture();f.db.b2BBooking.findFirst.mockResolvedValue(visit);
    await f.service.update('org','visit',{status:'CANCELLED'});expect(f.db.b2BBooking.findFirst).toHaveBeenCalledTimes(1);
    f.db.b2BBooking.findFirst.mockReset().mockResolvedValueOnce(visit).mockResolvedValue(null);
    await f.service.update('org','visit',{status:'COMPLETED'});expect(f.db.b2BClient.update).toHaveBeenCalledTimes(1);
    f.db.b2BBooking.findFirst.mockReset().mockResolvedValueOnce({...visit,status:'COMPLETED'}).mockResolvedValue(null);await f.service.update('org','visit',{status:'COMPLETED'});expect(f.db.b2BClient.update).toHaveBeenCalledTimes(1);
    f.db.b2BBooking.findFirst.mockResolvedValue({...visit,status:'COMPLETED'});
    await expect(f.service.update('org','visit',{status:'NEW'})).rejects.toThrow(BadRequestException);
  });
  it('preserves historical booking duration on moves rather than changed service duration',async()=>{
    const f=fixture();f.db.b2BBooking.findFirst.mockResolvedValueOnce({...visit,service:{price:100,duration:90}}).mockResolvedValue(null);
    await f.service.update('org','visit',{startTime:'2026-09-19T08:00:00.000Z'});
    expect(f.db.b2BBooking.update.mock.calls[0][0].data.endTime.toISOString()).toBe('2026-09-19T09:00:00.000Z');
  });
  it.each(['BUYER','ACCOUNTANT'])('keeps salon clients/bookings out of the %s role',async role=>{
    const f=fixture();f.db.organizationMember.findFirst.mockResolvedValue({organizationId:'org',role,canSeeFinance:true});
    const b2b=new B2BService(f.db,{} as any,f.service);
    await expect(b2b.clients('user')).rejects.toThrow(ForbiddenException);
    await expect(b2b.bookings('user')).rejects.toThrow(ForbiddenException);
    await expect(b2b.createBooking('user',{clientId:'client',serviceId:'service',startTime:visit.startTime.toISOString()})).rejects.toThrow(ForbiddenException);
    await expect(f.service.settings('user')).rejects.toThrow(ForbiddenException);
    expect(f.db.b2BClient.findFirst).not.toHaveBeenCalled();expect(f.db.b2BBooking.findMany).not.toHaveBeenCalled();
    f.db.order={aggregate:jest.fn().mockResolvedValue({_count:{_all:0},_sum:{finalAmount:null}}),findMany:jest.fn().mockResolvedValue([])};
    const dashboard=await b2b.dashboard('user');expect(dashboard).not.toHaveProperty('nextBookings');expect(dashboard).not.toHaveProperty('clients');
  });
  it('does not silently truncate a bounded calendar and rejects invalid/unbounded ranges',async()=>{
    const f=fixture(),b2b=new B2BService(f.db,{} as any,f.service);
    await b2b.bookings('user','2026-09-19T00:00:00Z','2026-09-20T00:00:00Z');
    const query=f.db.b2BBooking.findMany.mock.calls[0][0];expect(query).not.toHaveProperty('take');expect(query.where).toMatchObject({organizationId:'org',endTime:{gt:new Date('2026-09-19T00:00Z')}});
    await expect(b2b.bookings('user','invalid','2026-09-20')).rejects.toThrow(BadRequestException);
    await expect(b2b.bookings('user','2026-09-19')).rejects.toThrow(BadRequestException);
    await expect(b2b.bookings('user','2026-09-19','2027-09-19')).rejects.toThrow(BadRequestException);
  });
});
