import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { B2BService } from './b2b.service';
import { applyB2BStockTransition } from './b2b-order-lifecycle';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));

describe('B2B inventory: memory-only transactions; no 1C/database',()=>{
 function fixture(canOrder=true){
  const state={stock:10,reserved:3};const writes:any[]=[];
  const tx:any={$queryRaw:jest.fn(async(_sql:any,quantity:number)=>{if(state.stock-state.reserved<quantity)return [];state.reserved+=quantity;return [{id:'v'}];}),order:{create:jest.fn(async({data}:any)=>{writes.push(data);return {id:'order',...data,items:data.items.create};})}};
  const prisma:any={organizationMember:{findFirst:jest.fn().mockResolvedValue({organizationId:'org',customerId:'customer',canOrder,organization:{discountTier:10},user:{firstName:'Test',email:'mock@example.invalid'}})},productVariant:{findMany:jest.fn().mockResolvedValue([{id:'v',sku:'sku',price:100,name:'15g',product:{nameRu:'Gel'}}])},$transaction:jest.fn(async(f:any)=>{const before={...state};try{return await f(tx)}catch(e){Object.assign(state,before);throw e;}})};
  const oneC:any={enqueueOrder:jest.fn().mockResolvedValue({})};return {state,tx,prisma,writes,oneC,service:new B2BService(prisma,oneC,{} as any)};
 }
 it('reserves available stock only, merges duplicate variants and marks lifecycle ACTIVE',async()=>{
  const f=fixture();await f.service.createOrder('u',{items:[{variantId:'v',quantity:2},{variantId:'v',quantity:3}]});
  expect(f.state).toEqual({stock:10,reserved:8});expect(f.tx.$queryRaw).toHaveBeenCalledTimes(1);
  expect(f.writes[0]).toMatchObject({source:'B2B',reservationState:'ACTIVE',finalAmount:450});expect(f.writes[0].items.create).toHaveLength(1);
  expect(f.prisma.productVariant.findMany.mock.calls[0][0].where.product).toEqual({isActive:true,productType:'PHYSICAL'});
  expect(f.oneC.enqueueOrder).toHaveBeenCalledWith('order','u');
 });
 it('rejects shortage without creating a half-order or queueing synchronization',async()=>{
  const f=fixture();await expect(f.service.createOrder('u',{items:[{variantId:'v',quantity:8}]})).rejects.toBeInstanceOf(BadRequestException);
  expect(f.state).toEqual({stock:10,reserved:3});expect(f.writes).toHaveLength(0);expect(f.oneC.enqueueOrder).not.toHaveBeenCalled();
 });
 it('denies purchasing before inventory access',async()=>{
  const f=fixture(false);await expect(f.service.createOrder('u',{items:[{variantId:'v',quantity:1}]})).rejects.toBeInstanceOf(ForbiddenException);expect(f.prisma.productVariant.findMany).not.toHaveBeenCalled();
 });
 it('rejects invalid or excessive aggregated quantities',async()=>{
  for(const quantities of [[0],[1.5],[6000,6000]]){const f=fixture();await expect(f.service.createOrder('u',{items:quantities.map(quantity=>({variantId:'v',quantity}))})).rejects.toBeInstanceOf(BadRequestException);expect(f.writes).toHaveLength(0);}
 });
 function stockFixture(){const state={stock:10,reserved:5};const tx:any={productVariant:{updateMany:jest.fn(async({where,data}:any)=>{if(state.reserved<where.reserved.gte||where.stock&&state.stock<where.stock.gte)return {count:0};state.reserved-=data.reserved.decrement;state.stock-=data.stock?.decrement||0;return {count:1};})}};return{state,tx,order:{source:'B2B',reservationState:'ACTIVE',items:[{variantId:'v',quantity:2}]}};}
 it('cancellation releases reservation without restoring stock that was never consumed',async()=>{const f=stockFixture();expect(await applyB2BStockTransition(f.tx,f.order,OrderStatus.CANCELLED)).toEqual({reservationState:'RELEASED',reservationExpiresAt:null});expect(f.state).toEqual({stock:10,reserved:3});});
 it('dispatch consumes physical stock and reservation atomically; replay is inert',async()=>{const f=stockFixture();const update=await applyB2BStockTransition(f.tx,f.order,OrderStatus.SHIPPED);expect(f.state).toEqual({stock:8,reserved:3});Object.assign(f.order,update);await applyB2BStockTransition(f.tx,f.order,OrderStatus.DELIVERED);expect(f.state).toEqual({stock:8,reserved:3});});
 it('historic LEGACY inventory is never auto-corrected',async()=>{const f=stockFixture();f.order.reservationState='LEGACY';expect(await applyB2BStockTransition(f.tx,f.order,OrderStatus.CANCELLED)).toEqual({});expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();});
 it('unmatched reserves stop transition, never mark a failed order consumed',async()=>{const f=stockFixture();f.state.reserved=0;await expect(applyB2BStockTransition(f.tx,f.order,OrderStatus.SHIPPED)).rejects.toBeInstanceOf(ConflictException);});
});
