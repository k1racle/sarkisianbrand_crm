import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SalonBookingService } from './salon-booking.service';
import { BusinessCompanySettingDto, SalonPresentationDto, SalonSubscriptionDto } from './dto/salon-presentation.dto';
import { B2BService } from './b2b.service';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));
import { publicPresentation, presentationSelect } from './salon-presentation';
describe('Salon identity — local fixtures, no providers or database writes',()=>{
 const value={displayName:'Салон',address:'Москва',phones:['+7 999 1234567'],emails:['salon@example.ru'],socialLinks:[{label:'VK',url:'https://vk.com/salon'}]};
 function fixture(role='OWNER'){
  const db:any={organizationMember:{findFirst:jest.fn().mockResolvedValue({organizationId:'org',role})},salonPresentation:{findUnique:jest.fn().mockResolvedValue(null),upsert:jest.fn(async({create,update}:any)=>({...create,...update})),updateMany:jest.fn().mockResolvedValue({count:1})}};
  return {db,service:new SalonBookingService(db)};
 }
 it('uses presentation defaults and never exposes image bytes',async()=>{
  const f=fixture();const result=await f.service.presentation('user');expect(result).toMatchObject({displayName:'',phones:[],emails:[],socialLinks:[],logoUrl:null,canEdit:true});
  expect(f.db.salonPresentation.findUnique).toHaveBeenCalledWith({where:{organizationId:'org'},select:presentationSelect});expect(publicPresentation({logoVersion:'revision',logoBytes:Buffer.from('private')},'org')).not.toHaveProperty('logoBytes');
 });
 it('scopes updates to membership organization',async()=>{
  const f=fixture();await expect(f.service.savePresentation('user',value)).resolves.toMatchObject(value);expect(f.db.salonPresentation.upsert.mock.calls[0][0].where).toEqual({organizationId:'org'});
 });
 it('does not allow employees to change identity or upload/remove a logo',async()=>{
  const f=fixture('EMPLOYEE');await expect(f.service.savePresentation('user',value)).rejects.toThrow(ForbiddenException);await expect(f.service.uploadLogo('user')).rejects.toThrow(ForbiddenException);await expect(f.service.removeLogo('user')).rejects.toThrow(ForbiddenException);expect(f.db.salonPresentation.upsert).not.toHaveBeenCalled();
 });
 it('denies purchasing-only roles access to salon settings',async()=>{await expect(fixture('BUYER').service.presentation('user')).rejects.toThrow(ForbiddenException);});
 it('validates email, HTTPS URLs and finite bounded future prices',async()=>{
  expect(await validate(plainToInstance(SalonPresentationDto,value))).toHaveLength(0);
  for(const patch of [{emails:['bad']},{socialLinks:[{label:'Script',url:'javascript:alert(1)'}]},{socialLinks:[{label:'VK',url:'http://vk.com/test'}]}])expect((await validate(plainToInstance(SalonPresentationDto,{...value,...patch}))).length).toBeGreaterThan(0);
  const tariff={name:'Кабинет',monthlyPrice:1000,annualPrice:10000,freeAccess:true};expect(await validate(plainToInstance(SalonSubscriptionDto,tariff))).toHaveLength(0);
  for(const patch of [{monthlyPrice:-1},{annualPrice:Infinity},{monthlyPrice:1.234},{freeAccess:'false'}])expect((await validate(plainToInstance(SalonSubscriptionDto,{...tariff,...patch}))).length).toBeGreaterThan(0);
 });
 it('rejects invalid phones before writing',async()=>{const f=fixture();await expect(f.service.savePresentation('user',{...value,phones:['abc']})).rejects.toThrow(BadRequestException);expect(f.db.salonPresentation.upsert).not.toHaveBeenCalled();});
 it('rejects SVG, fake MIME and oversize images',async()=>{
  const f=fixture();for(const file of [{buffer:Buffer.from('<svg/>'),mimetype:'image/svg+xml',size:6},{buffer:Buffer.from('not an image'),mimetype:'image/png',size:12},{buffer:Buffer.from([255,216]),mimetype:'image/jpeg',size:4*1024*1024}])await expect(f.service.uploadLogo('user',file)).rejects.toThrow(BadRequestException);expect(f.db.salonPresentation.upsert).not.toHaveBeenCalled();
 });
 it('creates a new logo revision without altering contact settings',async()=>{
  const f=fixture();const result=await f.service.uploadLogo('user',{buffer:Buffer.from([137,80,78,71,13,10,26,10]),mimetype:'image/png',size:8});expect(result.logoUrl).toMatch(/^\/api\/v1\/salon-booking\/org\/logo\?v=/);expect(f.db.salonPresentation.upsert.mock.calls[0][0].update).not.toHaveProperty('displayName');expect(result).not.toHaveProperty('logoBytes');
 });
 it('requires the current revision to serve an image',async()=>{const f=fixture();f.db.salonPresentation.findUnique.mockResolvedValue({logoBytes:Buffer.from('image'),logoMime:'image/png',logoVersion:'new'});await expect(f.service.logo('org','old')).rejects.toThrow(NotFoundException);await expect(f.service.logo('org','new')).resolves.toMatchObject({mime:'image/png'});});
 it('allows only the owner to update permitted company fields',async()=>{
  const db:any={organizationMember:{findFirst:jest.fn().mockResolvedValue({organizationId:'org',role:'OWNER'})},organization:{update:jest.fn().mockResolvedValue({name:'Company'})}};const service=new B2BService(db,{} as any,{} as any),dto={name:' Company ',legalName:'Legal',legalAddress:'Address'};
  await service.saveCompanySettings('user',{...dto,discountTier:100,status:'ACTIVE'} as any);expect(db.organization.update.mock.calls[0][0]).toEqual({where:{id:'org'},data:{name:'Company',legalName:'Legal',legalAddress:'Address'},select:{name:true,legalName:true,legalAddress:true}});
  db.organizationMember.findFirst.mockResolvedValue({organizationId:'org',role:'BUYER'});await expect(service.saveCompanySettings('user',dto)).rejects.toThrow(ForbiddenException);
  const violations=await validate(plainToInstance(BusinessCompanySettingDto,{...dto,creditLimit:100}),{whitelist:true,forbidNonWhitelisted:true});expect(violations.length).toBeGreaterThan(0);
 });
});
