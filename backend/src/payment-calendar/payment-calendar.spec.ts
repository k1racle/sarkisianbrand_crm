import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { calendarDate, companyToday, dueDates } from './payment-calendar.policy';
import { CreatePaymentPlanDto, SetPlannedPaymentDto } from './payment-calendar.dto';
const schedule=(start:string,frequency='MONTH',interval=1,end:string|null=null)=>({startDate:calendarDate(start),endDate:end?calendarDate(end):null,frequency,interval});
describe('Payment calendar dates and recurrence',()=>{
  it.each(['2026-02-30','2025-02-29','2026-13-01','2026-01-00','1999-12-31','2101-01-01','2026-01-01T00:00:00Z','garbage'])('rejects invalid date %s',value=>expect(()=>calendarDate(value)).toThrow());
  it('keeps monthly anchor after short February',()=>expect(dueDates(schedule('2026-01-31'),calendarDate('2026-01-01'),calendarDate('2026-04-30'))).toEqual(['2026-01-31','2026-02-28','2026-03-31','2026-04-30']));
  it('handles leap years without drift',()=>expect(dueDates(schedule('2024-02-29','YEAR'),calendarDate('2024-01-01'),calendarDate('2028-12-31'))).toEqual(['2024-02-29','2025-02-28','2026-02-28','2027-02-28','2028-02-29']));
  it('supports quarterly intervals',()=>expect(dueDates(schedule('2026-01-31','MONTH',3),calendarDate('2026-01-01'),calendarDate('2026-12-31'))).toEqual(['2026-01-31','2026-04-30','2026-07-31','2026-10-31']));
  it('supports weekly multiples and inclusive end dates',()=>expect(dueDates(schedule('2026-01-01','WEEK',2,'2026-01-29'),calendarDate('2026-01-01'),calendarDate('2026-02-28'))).toEqual(['2026-01-01','2026-01-15','2026-01-29']));
  it('returns only requested dates after years of recurrence',()=>expect(dueDates(schedule('2000-01-31'),calendarDate('2099-02-01'),calendarDate('2099-02-28'))).toEqual(['2099-02-28']));
  it('does not repeat a one-off payment',()=>{expect(dueDates(schedule('2026-01-10','ONCE'),calendarDate('2026-01-01'),calendarDate('2026-01-31'))).toEqual(['2026-01-10']);expect(dueDates(schedule('2026-01-10','ONCE'),calendarDate('2026-02-01'),calendarDate('2026-02-28'))).toEqual([]);});
  it('does not include dates before start or after end',()=>{expect(dueDates(schedule('2026-09-10'),calendarDate('2026-08-01'),calendarDate('2026-08-31'))).toEqual([]);expect(dueDates(schedule('2026-01-10','MONTH',1,'2026-01-10'),calendarDate('2026-02-01'),calendarDate('2026-02-28'))).toEqual([]);});
  it('uses Moscow midnight, not UTC or the database zone',()=>{expect(companyToday(new Date('2026-09-24T20:59:59Z'))).toBe('2026-09-24');expect(companyToday(new Date('2026-09-24T21:00:00Z'))).toBe('2026-09-25');});
  it('validates integer kopecks, bounded recurrence, and rejects owner injection',async()=>{
    const fields={title:'Internet',vendor:'Provider',category:'INTERNET',notes:'',amountCents:123456,startDate:'2026-01-31',endDate:null,frequency:'MONTH',interval:1,visibility:'PERSONAL',requestKey:'00000000-0000-4000-8000-000000000001'};
    expect(await validate(plainToInstance(CreatePaymentPlanDto,fields),{whitelist:true,forbidNonWhitelisted:true})).toEqual([]);
    for(const change of [{amountCents:0},{amountCents:1.5},{amountCents:1000000001},{interval:0},{interval:37},{title:' '},{ownerId:'another-user'}])expect((await validate(plainToInstance(CreatePaymentPlanDto,{...fields,...change}),{whitelist:true,forbidNonWhitelisted:true})).length).toBeGreaterThan(0);
  });
  it('never coerces a string false into an affirmative payment',async()=>{
    const dto=plainToInstance(SetPlannedPaymentDto,{planVersion:1,version:0,dueDate:'2026-01-31',paid:'false',paidOn:null,reason:'',requestKey:'00000000-0000-4000-8000-000000000001'},{enableImplicitConversion:true});
    expect((await validate(dto)).some(error=>error.property==='paid')).toBe(true);
  });
});
