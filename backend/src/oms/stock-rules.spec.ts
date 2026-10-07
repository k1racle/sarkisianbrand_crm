import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { salesProduct, salesQuantity, salesVariant } from '../common/sales-stock';
import { StockGroupDto, StockRuleDto } from './dto/stock-rules.dto';
describe('Channel stock boundary',()=>{
 const variant={stock:20,reserved:4,price:100,channelStocks:[{channel:'WEB',quantity:0},{channel:'B2B',quantity:16}]};
 it('separates channels, strips internal projections and preserves physical inventory',()=>{
  expect(salesQuantity(variant,'WEB')).toBe(0);expect(salesQuantity(variant,'B2B')).toBe(16);
  expect(salesVariant(variant,'WEB')).toEqual({stock:4,reserved:4,price:100});
  expect(variant.stock).toBe(20);expect(variant.channelStocks).toHaveLength(2);
 });
 it('never offers more than the free physical quantity if a projection is stale',()=>{
  expect(salesQuantity({...variant,stock:7},'B2B')).toBe(3);
  expect(salesQuantity({...variant,stock:1},'B2B')).toBe(0);
 });
 it('does not disable digital gift cards through physical-stock rules',()=>{
  expect(salesProduct({productType:'GIFT_CARD',variants:[variant]}).variants[0]).toBe(variant);
  expect(salesProduct({productType:'PHYSICAL',variants:[variant]}).variants[0].stock).toBe(4);
 });
});
describe('Minimum-stock input validation with production implicit conversion',()=>{
 const valid={name:'Запас розницы',targetKind:'VARIANT',targetId:'12345678-1234-4234-8234-123456789012',threshold:5,channels:['WEB','OZON']};
 const parse=(data:any)=>plainToInstance(StockRuleDto,data,{enableImplicitConversion:true});
 it('keeps safe defaults and accepts a zero threshold',async()=>{
  const dto=parse({...valid,threshold:0});expect(await validate(dto)).toEqual([]);expect(dto.autoResume).toBe(true);expect(dto.includeChildren).toBe(true);expect(dto.basis).toBe('AVAILABLE');
 });
 it.each([{threshold:-1},{threshold:2.5},{threshold:'5'},{threshold:null},{channels:[]},{channels:['WEB','WEB']},{channels:['OTHER']},{autoResume:'false'},{isEnabled:1},{includeChildren:'true'},{targetKind:'ALL'},{targetId:'bad'},{expectedVersion:0}])('rejects invalid rule %j',async patch=>{
  expect((await validate(parse({...valid,...patch}))).length).toBeGreaterThan(0);
 });
 it('preserves explicit false booleans',async()=>{const dto=parse({...valid,autoResume:false,isEnabled:false,includeChildren:false});expect(await validate(dto)).toEqual([]);expect(dto.autoResume).toBe(false);});
 it('requires nonempty unique product membership',async()=>{for(const productIds of [[],['bad'],[valid.targetId,valid.targetId]])expect((await validate(plainToInstance(StockGroupDto,{name:'Группа',productIds}))).length).toBeGreaterThan(0);});
});
