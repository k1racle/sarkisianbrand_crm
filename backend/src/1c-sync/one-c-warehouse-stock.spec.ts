import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { executionSnapshot } from '../oms/execution-snapshot';
import { OneCWebhookController } from './1c-sync.controller';
import { OneCWarehouseStocksDto } from './dto/warehouse-stock.dto';
import { OneCWarehouseStockService } from './one-c-warehouse-stock.service';

jest.mock('../oms/one-c-warehouse-projector',()=>({projectCoveredOrders:jest.fn(async()=>({projected:0,pending:0,review:0}))}));

describe('authoritative 1C warehouse stock and local holds',()=>{
 function fixture() {
  const variantId=randomUUID(),itemId=randomUUID(),orderId=randomUUID(),eventId=randomUUID();
  const variant:any={id:variantId,sku:'SKU',stock:8,reserved:5,damagedStock:0,product:{externalId:'product',productType:'PHYSICAL'},oneCWarehouseStock:null};
  const item:any={id:itemId,orderId,variantId,quantity:5,productType:'PHYSICAL',price:'20.00',total:'100.00'};
  const order:any={id:orderId,externalId:'one-c-order',source:'WEB',fulfillmentManaged:false,reservationState:'ACTIVE',totalAmount:'100.00',discountAmount:'0.00',finalAmount:'100.00',currency:'RUB',shippingAddress:{},shippingCost:'0.00',shippingProvider:'POST',paymentMethod:'CARD',items:[item]};
  order.execution={version:1,snapshotHash:executionSnapshot(order)};order.warehouseExecution={eventId,revision:1};item.order=order;
  const event:any={eventId,orderId,revision:1,order,payload:{protocolVersion:1,eventId,revision:1,platformOrderId:orderId,external1CId:order.externalId,warehouseId:'main',executionVersion:1,basisHash:executionSnapshot(order),asOf:new Date(Date.now()-2000).toISOString(),lines:[{orderItemId:itemId,reserved:2,picked:2,checked:1,shipped:1,cancelled:0,returned:0,damaged:0}]}};
  const events=[event],holds=[item],coverages=new Map<string,any>();
  const tx:any={
   $executeRaw:jest.fn(),$queryRaw:jest.fn(),ecosystemIntegration:{findUnique:jest.fn(async()=>({isEnabled:true,config:{warehouseId:'main'}}))},
   productVariant:{findUnique:jest.fn(async()=>variant),update:jest.fn(async({data})=>Object.assign(variant,data))},
   orderItem:{findMany:jest.fn(async()=>holds)},oneCWarehouseEvent:{findMany:jest.fn(async({where})=>events.filter(event=>where.eventId.in.includes(event.eventId)))},
   oneCWarehouseCoverage:{upsert:jest.fn(async({where,create,update})=>coverages.set(where.orderItemId,coverages.has(where.orderItemId)?update:create))},
   oneCWarehouseStock:{upsert:jest.fn(async({create,update})=>variant.oneCWarehouseStock=variant.oneCWarehouseStock?{...variant.oneCWarehouseStock,...update}:create)},syncLog:{create:jest.fn()},
  };
  const db:any={$transaction:jest.fn(async fn=>fn(tx))};
  const position:any={variantId,externalProductId:'product',sku:'SKU',revision:1,stock:10,damagedStock:1,reserved1C:3,asOf:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),coveredEventIds:[eventId]};
  const dto:any={protocolVersion:2,stockBasis:'PHYSICAL_INCLUDING_RESERVED',warehouseId:'main',positions:[position]};
  return {variant,item,order,event,events,holds,coverages,tx,db,position,dto,service:new OneCWarehouseStockService(db)};
 }
 it('counts a partial reservation and shipment once while including reservations outside CRM',async()=>{
  const f=fixture();expect(await f.service.receive(f.dto)).toEqual({accepted:1,repeated:0,ignored:0});
  // Ordered 5: 1 shipped, 2 reserved in 1C, 2 still held locally. 1 extra unit is reserved outside CRM.
  expect(f.variant).toMatchObject({stock:10,reserved:5,damagedStock:1});expect(f.variant.oneCWarehouseStock).toMatchObject({reserved1C:3,localPending:2});
  expect(f.coverages.get(f.item.id)).toMatchObject({eventId:f.event.eventId,reserved:2,shipped:1,cancelled:0});
  expect(f.db.$transaction).toHaveBeenCalledWith(expect.any(Function),expect.objectContaining({isolationLevel:'Serializable'}));
 });
 it('counts a full hold when its event is not covered by the stock snapshot',async()=>{
  const f=fixture();f.position.coveredEventIds=[];await f.service.receive(f.dto);
  expect(f.variant).toMatchObject({stock:10,reserved:8});expect(f.variant.oneCWarehouseStock.localPending).toBe(5);expect(f.coverages.size).toBe(0);
 });
 it('treats an old event as uncovered when a newer warehouse event exists',async()=>{
  const f=fixture();f.order.warehouseExecution={eventId:randomUUID(),revision:2};await f.service.receive(f.dto);
  expect(f.variant.reserved).toBe(8);expect(f.coverages.size).toBe(0);
 });
 it('releases the local hold only when a fully shipped order is covered by the physical stock snapshot',async()=>{
  const f=fixture();f.event.payload.lines=[{...f.event.payload.lines[0],reserved:0,picked:5,checked:5,shipped:5}];f.position.reserved1C=1;
  await f.service.receive(f.dto);
  expect(f.variant).toMatchObject({stock:10,reserved:1});expect(f.variant.oneCWarehouseStock.localPending).toBe(0);
  expect(f.coverages.get(f.item.id)).toMatchObject({eventId:f.event.eventId,shipped:5,reserved:0});
 });
 it('does not rebuild a projection while a locally managed warehouse order still holds stock',async()=>{
  const f=fixture();f.order.fulfillmentManaged=true;
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});expect(f.tx.productVariant.update).not.toHaveBeenCalled();
 });
 it('does not overwrite new holds on a replay and does not restore an invalidated snapshot',async()=>{
  const f=fixture();await f.service.receive(f.dto);f.variant.reserved++;f.variant.oneCWarehouseStock.localPending++;
  expect(await f.service.receive(f.dto)).toMatchObject({repeated:1});expect(f.variant.reserved).toBe(6);
  f.variant.oneCWarehouseStock.validUntil=new Date(0);
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});expect(f.variant.reserved).toBe(6);
 });
 it('keeps newer stock when an older revision arrives and rejects a changed payload for the same version',async()=>{
  const f=fixture();f.position.revision=3;await f.service.receive(f.dto);
  expect(await f.service.receive({...f.dto,positions:[{...f.position,revision:2}]})).toMatchObject({ignored:1});
  await expect(f.service.receive({...f.dto,positions:[{...f.position,stock:11}]})).rejects.toMatchObject({status:409});
  expect(f.variant.stock).toBe(10);expect(f.tx.productVariant.update).toHaveBeenCalledTimes(1);
 });
 it('rejects unknown covered events or reserved totals smaller than the covered reservation',async()=>{
  const f=fixture();await expect(f.service.receive({...f.dto,positions:[{...f.position,coveredEventIds:[randomUUID()]}]})).rejects.toMatchObject({status:409});
  await expect(f.service.receive({...f.dto,positions:[{...f.position,reserved1C:1}]})).rejects.toMatchObject({status:409});
  expect(f.tx.productVariant.update).not.toHaveBeenCalled();expect(f.tx.oneCWarehouseCoverage.upsert).not.toHaveBeenCalled();
 });
 it('refuses events for a different variant or later than the stock observation',async()=>{
  const f=fixture();f.item.variantId=randomUUID();await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  f.item.variantId=f.variant.id;f.event.payload.asOf=new Date(Date.now()+2000).toISOString();await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  expect(f.tx.productVariant.update).not.toHaveBeenCalled();
 });
 it('rejects two different event versions of the same order in one variant snapshot',async()=>{
  const f=fixture(),other={...f.event,eventId:randomUUID(),revision:2,payload:{...f.event.payload}};
  other.payload.eventId=other.eventId;other.payload.revision=other.revision;f.events.push(other);f.position.coveredEventIds.push(other.eventId);
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});expect(f.tx.productVariant.update).not.toHaveBeenCalled();
 });
 it('acquires all variant locks in sorted order before reading any stock or local holds',async()=>{
  const f=fixture(), secondId=randomUUID(), second:any={...f.variant,id:secondId,sku:'SECOND',product:{externalId:'other-product',productType:'PHYSICAL'},oneCWarehouseStock:null};
  f.tx.productVariant.findUnique.mockImplementation(async({where})=>where.id===secondId?second:f.variant);
  f.tx.orderItem.findMany.mockImplementation(async({where})=>where.variantId===secondId?[]:f.holds);
  f.tx.productVariant.update.mockImplementation(async({where,data})=>Object.assign(where.id===secondId?second:f.variant,data));
  f.tx.oneCWarehouseStock.upsert.mockImplementation(async({where,create,update})=>{const row=where.variantId===secondId?second:f.variant;row.oneCWarehouseStock=row.oneCWarehouseStock?{...row.oneCWarehouseStock,...update}:create;});
  const secondPosition={...f.position,variantId:secondId,sku:'SECOND',externalProductId:'other-product',coveredEventIds:[],reserved1C:0};
  await f.service.receive({...f.dto,positions:[f.position,secondPosition]});
  expect(f.tx.$queryRaw.mock.calls.map((call:any[])=>call[1])).toEqual([f.order.id,...[f.variant.id,secondId].sort()]);
  expect(Math.max(...f.tx.$queryRaw.mock.invocationCallOrder)).toBeLessThan(f.tx.productVariant.findUnique.mock.invocationCallOrder[0]);
 });
 it('allows a truthful shortage without reducing the reservation',async()=>{
  const f=fixture();f.position.stock=3;await f.service.receive(f.dto);
  expect(f.variant).toMatchObject({stock:3,reserved:5});
 });
 it.each([{sku:'other'},{externalProductId:'other'},{stock:'10'},{reserved1C:-1},{coveredEventIds:[randomUUID(),randomUUID(),null]}])('rejects invalid data or incorrect mappings: %j',async patch=>{
  const f=fixture();await expect(f.service.receive({...f.dto,positions:[{...f.position,...patch}]})).rejects.toBeDefined();expect(f.tx.productVariant.update).not.toHaveBeenCalled();
 });
 it('rejects expired, too long-lived and future snapshots before acquiring locks',async()=>{
  const f=fixture();const cases=[{validUntil:new Date(Date.now()-1).toISOString()},{validUntil:new Date(Date.now()+16*60_000).toISOString()},{asOf:new Date(Date.now()+120_000).toISOString()}];
  for(const patch of cases)await expect(f.service.receive({...f.dto,positions:[{...f.position,...patch}]})).rejects.toMatchObject({status:400});
  expect(f.db.$transaction).not.toHaveBeenCalled();
 });
 it('keeps strict JSON types even when global implicit conversion is enabled',async()=>{
  const f=fixture();const transformed=plainToInstance(OneCWarehouseStocksDto,{...f.dto,positions:[{...f.position,stock:'10'}]},{enableImplicitConversion:true});
  await expect(f.service.receive(transformed)).rejects.toMatchObject({status:400});expect(f.db.$transaction).not.toHaveBeenCalled();
 });
 it('treats concurrent transaction conflicts as a request to retry the same packet',async()=>{
  const f=fixture();f.db.$transaction.mockRejectedValue({code:'P2034'});await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
 });
 it('checks the shared integration key before importing a packet',async()=>{
  const f=fixture(),sync:any={verifyInboundSecret:jest.fn(async()=>false),importWarehouseStock:jest.fn()},controller=new OneCWebhookController(sync);
  await expect(controller.warehouseStock('wrong',f.dto)).rejects.toMatchObject({status:401});expect(sync.importWarehouseStock).not.toHaveBeenCalled();
 });
});
