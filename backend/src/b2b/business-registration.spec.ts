import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessOwnerRegistrationDto } from './dto/business-registration.dto';
import { businessCompanyDetails, validBusinessInn } from './business-registration.validation';
import { loadBusinessTerms, recordBusinessConsent } from './business-consent';
import { BusinessRegistrationService } from './business-registration.service';
import { B2BService } from './b2b.service';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));

describe('Separate owner business registration — fixtures only',()=>{
 const pages=[{slug:'oferta',title:'Оферта',lead:'Условия',blocks:[],revision:1,reviewRequired:false},{slug:'privacy',title:'Политика',lead:'Обработка данных',blocks:[],revision:1,reviewRequired:false}];
 const input={companyName:'Салон',firstName:'Анна',lastName:'',email:'owner@example.invalid',password:'Pass1234567',acceptedTerms:true,termsVersion:'0'.repeat(64)};
 function fixture(){
  const db:any={storefrontPage:{findMany:jest.fn().mockResolvedValue(pages)},$queryRaw:jest.fn().mockResolvedValue([]),auditLog:{create:jest.fn()},organization:{findUnique:jest.fn().mockResolvedValue(null),create:jest.fn(async({data})=>({id:'org',...data}))},customer:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:'customer'})},b2BProfile:{create:jest.fn().mockResolvedValue({id:'profile'})},organizationMember:{create:jest.fn()}};
  const auth:any={registerBusinessAccount:jest.fn(async(dto:any,_context:any,enroll:any)=>{await enroll(db,{id:'owner',email:dto.email,role:'CUSTOMER_B2B',isActive:true});return{user:{id:'owner',role:'CUSTOMER_B2B'},accessToken:'business-access',refreshToken:'business-refresh'};})};
  return{db,auth,service:new BusinessRegistrationService(db,auth)};
 }
 it.each(['7707083893','500100732259'])('checks valid INN check digits %s',inn=>expect(validBusinessInn(inn)).toBe(true));
 it.each(['7707083894','500100732250','0000000000','123','abcdefghij','77070838930'])('rejects malformed INN %s',inn=>expect(validBusinessInn(inn)).toBe(false));
 it('rejects KPP on an individual INN, non-digit KPP and preserves valid leading-zero region codes',()=>{
  for(const patch of [{inn:'500100732259',kpp:'770101001'},{kpp:'770101001'},{inn:'7707083893',kpp:'7701AA001'}])expect(()=>businessCompanyDetails({companyName:'Салон',...patch})).toThrow(BadRequestException);
  expect(businessCompanyDetails({companyName:' Салон ',inn:'7707083893',kpp:'010101001'})).toMatchObject({companyName:'Салон',kpp:'010101001'});
 });
 it.each([false,'false','true',0,1,undefined])('requires literal consent true, even with implicit conversion: %p',async acceptedTerms=>{
  const value=plainToInstance(BusinessOwnerRegistrationDto,{...input,acceptedTerms},{enableImplicitConversion:true});
  expect((await validate(value)).some(item=>item.property==='acceptedTerms')).toBe(true);
 });
 it('validates the complete new account and company DTO',async()=>expect(await validate(plainToInstance(BusinessOwnerRegistrationDto,input))).toHaveLength(0));
 it('changes the consent version when the published text or revision changes',async()=>{
  const f=fixture(),initial=await loadBusinessTerms(f.db);f.db.storefrontPage.findMany.mockResolvedValue(pages.map(page=>({...page,revision:2})));
  expect((await loadBusinessTerms(f.db)).version).not.toBe(initial.version);
  f.db.storefrontPage.findMany.mockResolvedValue(pages.map(page=>({...page,lead:'Новая редакция'})));expect((await loadBusinessTerms(f.db)).version).not.toBe(initial.version);
 });
 it('records immutable text editions and context, rejects stale consent before writing',async()=>{
  const f=fixture(),terms=await loadBusinessTerms(f.db);
  await expect(recordBusinessConsent(f.db,'owner','org',{},'TEST','0'.repeat(64))).rejects.toThrow(ConflictException);expect(f.db.auditLog.create).not.toHaveBeenCalled();
  await recordBusinessConsent(f.db,'owner','org',{ipAddress:'127.0.0.1',userAgent:'Test'},'TEST',terms.version);
  expect(f.db.auditLog.create).toHaveBeenCalledWith({data:expect.objectContaining({actorId:'owner',resource:'business-consent',resourceId:'org',ipAddress:'127.0.0.1',payload:expect.objectContaining({accepted:true,termsVersion:terms.version,documents:expect.arrayContaining([expect.objectContaining({slug:'privacy',revision:1})])})})});
 });
 it('enrolls a new B2B owner/profile/prospect organization inside the auth transaction callback',async()=>{
  const f=fixture(),terms=await f.service.terms();const result=await f.service.register({...input,termsVersion:terms.version},{ipAddress:'127.0.0.1'});
  expect(result.organization).toEqual({id:'org',name:'Салон',status:'PROSPECT'});expect(result.user.role).toBe('CUSTOMER_B2B');
  expect(f.db.organizationMember.create).toHaveBeenCalledWith({data:expect.objectContaining({userId:'owner',organizationId:'org',role:'OWNER',customerId:'customer'})});expect(f.db.b2BProfile.create).toHaveBeenCalledTimes(1);expect(f.db.auditLog.create).toHaveBeenCalledTimes(2);
  expect(f.auth.registerBusinessAccount).toHaveBeenCalledTimes(1);expect(terms).not.toHaveProperty('snapshots');
 });
 it.each(['CUSTOMER_B2C','ADMIN','MANAGER_SALES'])('never promotes an existing %s through the legacy profile route',async role=>{
  const f=fixture(),user={id:'ordinary',email:'customer@example.invalid',role,isActive:true};f.db.user={findUnique:jest.fn().mockResolvedValue(user)};f.db.$transaction=jest.fn(fn=>fn(f.db));
  await expect(new B2BService(f.db,{} as any,{} as any).createProfile('ordinary',{companyName:'Компания',acceptedTerms:true,termsVersion:'0'.repeat(64)})).rejects.toThrow(ForbiddenException);
  expect(user.role).toBe(role);expect(f.db.organization.create).not.toHaveBeenCalled();expect(f.db.organizationMember.create).not.toHaveBeenCalled();
 });
});
