import { settlementBasis } from '../1c-sync/finance-policy';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { B2BService } from './b2b.service';
import { applyB2BStockTransition } from './b2b-order-lifecycle';
import { randomUUID } from 'crypto';
import { executionSnapshot } from '../oms/execution-snapshot';
jest.mock('../1c-sync/1c-sync.service',()=>({OneCSyncService:class{}}));

describe('B2B inventory: memory-only transactions; no 1C/database',()=>{
 function fixture(canOrder=true){
  const state={stock:10,reserved:3};const writes:any[]=[],exports:any[]=[];
  let localPending=0;
  const integration={isEnabled:true,configuredSecretKeys:['password','exchangeSecret'],config:{baseUrl:'https://fixture.invalid',username:'fixture',warehouseId:'warehouse'}};
  const variants={findMany:jest.fn().mockResolvedValue([{id:'v',sku:'sku',price:100,name:'15g',product:{nameRu:'Gel'}}]),findUnique:jest.fn(async()=>({id:'v',sku:'sku',stock:state.stock,reserved:state.reserved,product:{externalId:'1c-product',productType:'PHYSICAL'}}))};
  const tx:any={ecosystemIntegration:{findUnique:jest.fn().mockResolvedValue(integration)},oneCWarehouseStock:{findUnique:jest.fn(async()=>({variantId:'v',warehouseId:'warehouse',externalProductId:'1c-product',sku:'sku',revision:1,stock:state.stock,reserved1C:3,localPending,asOf:new Date(Date.now()-1000),validUntil:new Date(Date.now()+60000)})),updateMany:jest.fn(async({data}:any)=>{localPending+=data.localPending.increment||0;return {count:1};})},$queryRaw:jest.fn(async(sql:any,quantity:number)=>{if(sql[0].startsWith('SELECT'))return [{id:'v'}];if(state.stock-state.reserved<quantity)return [];state.reserved+=quantity;return [{id:'v'}];}),productVariant:variants,order:{findUnique:jest.fn(async({where}:any)=>writes.find(w=>w.checkoutKey===where.checkoutKey)||null),create:jest.fn(async({data}:any)=>{const order={id:randomUUID(),...data,items:data.items.create};writes.push(order);return order;})}};
  let pending=Promise.resolve();
  const prisma:any={organizationMember:{findFirst:jest.fn().mockResolvedValue({organizationId:'org',customerId:'customer',canOrder,canSeeFinance:true,organization:{status:'ACTIVE',discountTier:10},user:{firstName:'Test',email:'mock@example.invalid'}})},productVariant:variants,ecosystemIntegration:tx.ecosystemIntegration,$transaction:jest.fn((f:any)=>{const next=pending.then(async()=>{const before={...state},beforePending=localPending,count=writes.length,exportCount=exports.length;try{return await f(tx)}catch(e){Object.assign(state,before);localPending=beforePending;writes.length=count;exports.length=exportCount;throw e;}});pending=next.catch(()=>{});return next;})};
  prisma.organizationMember.findMany=jest.fn(async()=>[await prisma.organizationMember.findFirst()]);
  tx.organizationMember=prisma.organizationMember;
  const oneC:any={stageOrderExport:jest.fn(async(_tx:any,id:string,actor:string)=>{exports.push({id,actor});})};return {state,tx,prisma,writes,exports,oneC,service:new B2BService(prisma,oneC,{} as any)};
 }
 it('reserves available stock only, merges duplicate variants and marks lifecycle ACTIVE',async()=>{
  const f=fixture();await f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity:2},{variantId:'v',quantity:3}]});
  expect(f.state).toEqual({stock:10,reserved:8});expect(f.tx.$queryRaw).toHaveBeenCalledTimes(7);
  expect(f.writes[0]).toMatchObject({source:'B2B',reservationState:'ACTIVE'});expect(Number(f.writes[0].finalAmount)).toBe(450);expect(f.writes[0].items).toHaveLength(1);
  expect(f.prisma.productVariant.findMany.mock.calls[0][0].where.product).toEqual({isActive:true,productType:'PHYSICAL'});
  expect(f.oneC.stageOrderExport).toHaveBeenCalledWith(f.tx,f.writes[0].id,'u');
 });
 it('rejects shortage without creating a half-order or queueing synchronization',async()=>{
  const f=fixture();await expect(f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity:8}]})).rejects.toBeInstanceOf(BadRequestException);
  expect(f.state).toEqual({stock:10,reserved:3});expect(f.writes).toHaveLength(0);expect(f.oneC.stageOrderExport).not.toHaveBeenCalled();
 });
 it('fails closed when the 1C snapshot is unavailable and allows idempotent replay after it expires',async()=>{
  const f=fixture(),dto={requestKey:randomUUID(),items:[{variantId:'v',quantity:2}]};
  f.tx.oneCWarehouseStock.findUnique.mockResolvedValueOnce(null);
  await expect(f.service.createOrder('u',dto)).rejects.toBeInstanceOf(ConflictException);
  expect(f.writes).toHaveLength(0);expect(f.state.reserved).toBe(3);expect(f.exports).toHaveLength(0);
  const order=await f.service.createOrder('u',dto);
  f.tx.oneCWarehouseStock.findUnique.mockResolvedValue(null);
  expect((await f.service.createOrder('u',dto)).id).toBe(order.id);
  expect(f.state.reserved).toBe(5);expect(f.exports).toHaveLength(1);
 });
 it('denies purchasing before inventory access',async()=>{
  const f=fixture(false);await expect(f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity:1}]})).rejects.toBeInstanceOf(ForbiddenException);expect(f.prisma.productVariant.findMany).not.toHaveBeenCalled();
 });
 it('exposes only safe 1C progress to the owning organization',async()=>{
  const f=fixture();
  const order:any={id:'order',source:'B2B',totalAmount:100,discountAmount:0,finalAmount:100,currency:'RUB',shippingAddress:{},shippingCost:0,shippingProvider:null,paymentMethod:null,items:[{id:'line',variantId:'v',quantity:1,price:100,total:100,productType:'PHYSICAL'}],execution:{version:1}};
  order.warehouseExecution={status:'PICKING',executionVersion:1,basisHash:executionSnapshot(order),asOf:new Date(),validUntil:new Date(Date.now()+60000),executorName:'private',error:'private',lines:[{private:true}]};
  f.prisma.order={findMany:jest.fn().mockResolvedValue([order])};
  const [result]:any[]=await f.service.orders('u');
  expect(result.warehouseStatus).toMatchObject({stage:'PICKING',isCurrent:true});
  expect(result.requiresWarehouse).toBe(true);
  expect(Object.keys(result.warehouseStatus).sort()).toEqual(['asOf','isCurrent','stage']);
  expect(result).not.toHaveProperty('warehouseExecution');expect(result).not.toHaveProperty('execution');
  expect(f.prisma.order.findMany.mock.calls[0][0].where.organizationId).toBe('org');
 });
 it('shows availability only when the 1C snapshot is fresh and matches the variant',async()=>{
  const f=fixture(),snapshot={warehouseId:'warehouse',externalProductId:'1c-product',sku:'sku',stock:10,reserved1C:3,localPending:0,asOf:new Date(Date.now()-1000),validUntil:new Date(Date.now()+60000)};
  f.prisma.product={findMany:jest.fn().mockResolvedValue([{id:'p',externalId:'1c-product',productType:'PHYSICAL',variants:[{id:'v',sku:'sku',price:100,stock:10,reserved:3,oneCWarehouseStock:snapshot}]}])};
  let [product]:any[]=await f.service.catalog('u');
  expect(product.variants[0]).toMatchObject({availabilityStatus:'CURRENT',available:7});
  expect(product.variants[0]).not.toHaveProperty('oneCWarehouseStock');
  snapshot.validUntil=new Date(0);
  [product]=await f.service.catalog('u');
  expect(product.variants[0]).toMatchObject({availabilityStatus:'UNAVAILABLE',available:null,stock:null,reserved:null});
 });
 it('rejects invalid or excessive aggregated quantities',async()=>{
  for(const quantities of [[0],[1.5],[6000,6000]]){const f=fixture();await expect(f.service.createOrder('u',{requestKey:randomUUID(),items:quantities.map(quantity=>({variantId:'v',quantity}))})).rejects.toBeInstanceOf(BadRequestException);expect(f.writes).toHaveLength(0);}
 });
 it('returns a single purchase and reservation for simultaneous retries, including a lost response',async()=>{
  const f=fixture(),dto={requestKey:randomUUID(),items:[{variantId:'v',quantity:2}]};
  const results=await Promise.all(Array.from({length:12},()=>f.service.createOrder('u',dto)));
  expect(new Set(results.map(order=>order.id)).size).toBe(1);expect(f.writes).toHaveLength(1);expect(f.state.reserved).toBe(5);expect(f.exports).toHaveLength(1);
  for (const response of results) {
   expect(response).not.toHaveProperty('checkoutKey');expect(response).not.toHaveProperty('checkoutRequestHash');
   expect(response).not.toHaveProperty('isSynced1C');expect(response).not.toHaveProperty('oneCSyncError');expect(response).not.toHaveProperty('externalId');
  }
  f.prisma.productVariant.findMany.mockResolvedValue([]);
  expect((await f.service.createOrder('u',dto)).id).toBe(results[0].id); // No current stock/price check on replay.
 });
 it('canonicalizes duplicate lines and address property order but rejects changed payload for the same key',async()=>{
  const f=fixture(),requestKey=randomUUID();
  await f.service.createOrder('u',{requestKey,items:[{variantId:'v',quantity:1},{variantId:'v',quantity:1}],shippingAddress:{city:'Moscow',address:'1'}});
  await f.service.createOrder('u',{requestKey,items:[{variantId:'v',quantity:2}],shippingAddress:{address:'1',city:'Moscow'}});
  await expect(f.service.createOrder('u',{requestKey,items:[{variantId:'v',quantity:3}],shippingAddress:{address:'1',city:'Moscow'}})).rejects.toBeInstanceOf(ConflictException);
  expect(f.writes).toHaveLength(1);expect(f.state.reserved).toBe(5);
 });
 it('rolls back inventory and the purchase when durable export staging fails',async()=>{
  const f=fixture();f.oneC.stageOrderExport.mockRejectedValueOnce(new Error('outbox unavailable'));
  const dto={requestKey:randomUUID(),items:[{variantId:'v',quantity:2}]};
  await expect(f.service.createOrder('u',dto)).rejects.toThrow('outbox unavailable');
  expect(f.writes).toHaveLength(0);expect(f.state.reserved).toBe(3);expect(f.exports).toHaveLength(0);
  await f.service.createOrder('u',dto);expect(f.state.reserved).toBe(5);expect(f.writes).toHaveLength(1);
 });
 it('keeps monetary totals exact to kopecks',async()=>{
  const f=fixture();f.tx.productVariant.findMany.mockResolvedValue([{id:'v',sku:'sku',price:'0.10',name:'test',product:{nameRu:'Test'}}]);
  const result=await f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity:3}]});
  expect(String(result.totalAmount)).toBe('0.3');expect(String(result.finalAmount)).toBe('0.27');expect(String(result.discountAmount)).toBe('0.03');
 });
 it.each([
  ['1.15',1.04,'3.12'],
  ['16.15',14.54,'43.62'],
  ['2.35',2.12,'6.36'],
  ['0.15',0.14,'0.42'],
 ])('quotes retail %s with the same rounded unit price and line total as checkout',async(retail,expectedUnit,expectedTotal)=>{
  const f=fixture(),quantity=3;
  const variant={id:'v',sku:'sku',price:new Prisma.Decimal(retail),name:'test',stock:10,reserved:3,product:{nameRu:'Test'}};
  f.prisma.product={findMany:jest.fn().mockResolvedValue([{id:'p',nameRu:'Test',productType:'PHYSICAL',variants:[variant]}])};
  f.tx.productVariant.findMany.mockResolvedValue([variant]);
  const catalog=await f.service.catalog('u'),quoted=catalog[0].variants[0].b2bPrice;
  const order=await f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity}]});
  expect(quoted).toBe(expectedUnit);
  expect(Number(order.items[0].price)).toBe(quoted);
  expect(order.items[0].total.toFixed(2)).toBe(expectedTotal);
  expect(Math.round(Number(order.finalAmount)*100)).toBe(Math.round(quoted*100)*quantity);
 });
 it('requires a key and scopes the same key to its purchaser',async()=>{
  const f=fixture();await expect(f.service.createOrder('u',{requestKey:'',items:[{variantId:'v',quantity:1}]})).rejects.toBeInstanceOf(BadRequestException);
  const dto={requestKey:randomUUID(),items:[{variantId:'v',quantity:1}]};await f.service.createOrder('u',dto);await f.service.createOrder('other-user',dto);
  expect(f.writes).toHaveLength(2);expect(f.writes[0].checkoutKey).not.toBe(f.writes[1].checkoutKey);
 });
 it.each(['PROSPECT','ON_HOLD','ARCHIVED'])('prevents procurement for %s organizations before inventory or replay access',async status=>{
  const f=fixture();const member=await f.prisma.organizationMember.findFirst();member.organization.status=status;
  await expect(f.service.createOrder('u',{requestKey:randomUUID(),items:[{variantId:'v',quantity:1}]})).rejects.toBeInstanceOf(ForbiddenException);
  expect(f.prisma.$transaction).not.toHaveBeenCalled();expect(f.state.reserved).toBe(3);
 });
 function stockFixture(){const state={stock:10,reserved:5};const tx:any={productVariant:{updateMany:jest.fn(async({where,data}:any)=>{if(state.reserved<where.reserved.gte||where.stock&&state.stock<where.stock.gte)return {count:0};state.reserved-=data.reserved.decrement;state.stock-=data.stock?.decrement||0;return {count:1};})}};const order={id:'order',source:'B2B',reservationState:'ACTIVE',items:[{id:'line',variantId:'v',quantity:2}]};tx.oneCOrderFinance={findUnique:jest.fn(async()=>({basisHash:settlementBasis(order),releaseAllowed:true,validUntil:new Date(Date.now()+60000)}))};return{state,tx,order};}
 it('cancellation releases reservation without restoring stock that was never consumed',async()=>{const f=stockFixture();expect(await applyB2BStockTransition(f.tx,f.order,OrderStatus.CANCELLED)).toEqual({reservationState:'RELEASED',reservationExpiresAt:null});expect(f.state).toEqual({stock:10,reserved:3});});
 it('dispatch consumes physical stock and reservation atomically; replay is inert',async()=>{const f=stockFixture();const update=await applyB2BStockTransition(f.tx,f.order,OrderStatus.SHIPPED);expect(f.state).toEqual({stock:8,reserved:3});Object.assign(f.order,update);await applyB2BStockTransition(f.tx,f.order,OrderStatus.DELIVERED);expect(f.state).toEqual({stock:8,reserved:3});});
 it('historic LEGACY inventory is never auto-corrected',async()=>{const f=stockFixture();f.order.reservationState='LEGACY';expect(await applyB2BStockTransition(f.tx,f.order,OrderStatus.CANCELLED)).toEqual({});expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();});
 it('unmatched reserves stop transition, never mark a failed order consumed',async()=>{const f=stockFixture();f.state.reserved=0;await expect(applyB2BStockTransition(f.tx,f.order,OrderStatus.SHIPPED)).rejects.toBeInstanceOf(ConflictException);});
 it.each(['NEW','CONFIRMED','ASSEMBLING','CANCELLED','REFUNDED'] as OrderStatus[])('rejects %s after dispatch without changing inventory',async target=>{
  const f=stockFixture();const order={...f.order,status:OrderStatus.SHIPPED,reservationState:'CONSUMED'};
  await expect(applyB2BStockTransition(f.tx,order,target)).rejects.toBeInstanceOf(ConflictException);
  expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
 it('cancellation replay is inert but reopening requires a new reservation',async()=>{
  const f=stockFixture();const order={...f.order,status:OrderStatus.NEW};
  Object.assign(order,await applyB2BStockTransition(f.tx,order,OrderStatus.CANCELLED),{status:OrderStatus.CANCELLED});
  expect(await applyB2BStockTransition(f.tx,order,OrderStatus.CANCELLED)).toEqual({});
  await expect(applyB2BStockTransition(f.tx,order,OrderStatus.CONFIRMED)).rejects.toBeInstanceOf(ConflictException);
  expect(f.state).toEqual({stock:10,reserved:3});expect(f.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
 });
 it.each(['UNKNOWN','DIGITAL'])('rejects unexpected reservation %s',async reservationState=>{
  const f=stockFixture();await expect(applyB2BStockTransition(f.tx,{...f.order,reservationState},OrderStatus.SHIPPED)).rejects.toBeInstanceOf(ConflictException);
  expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
 it('does not implement a return by merely changing status and leaving a reserve behind',async()=>{
  const f=stockFixture();await expect(applyB2BStockTransition(f.tx,{...f.order,status:OrderStatus.PAID},OrderStatus.REFUNDED)).rejects.toBeInstanceOf(ConflictException);
  expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
 it('does not reopen a delivered order or regress an active picking order',async()=>{
  const f=stockFixture();
  await expect(applyB2BStockTransition(f.tx,{...f.order,status:OrderStatus.DELIVERED,reservationState:'CONSUMED'},OrderStatus.SHIPPED)).rejects.toBeInstanceOf(ConflictException);
  await expect(applyB2BStockTransition(f.tx,{...f.order,status:OrderStatus.ASSEMBLING},OrderStatus.CONFIRMED)).rejects.toBeInstanceOf(ConflictException);
  expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
});
