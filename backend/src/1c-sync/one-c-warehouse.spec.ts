import { randomUUID } from 'crypto';
import { OneCWarehouseService } from './one-c-warehouse.service';
import { executionSnapshot } from '../oms/execution-snapshot';
import { plainToInstance } from 'class-transformer';
import { OneCWarehouseSnapshotDto } from './dto/warehouse.dto';
import { OneCWebhookController } from './1c-sync.controller';

describe('confirmed 1C warehouse facts', () => {
 function fixture() {
  const itemId = randomUUID(), variantId = randomUUID();
  const order:any = { id: randomUUID(), orderNumber:'QA', externalId:'1c-order', source:'WEB', status:'CONFIRMED', fulfillmentManaged:false,
   totalAmount:'100.00', discountAmount:'0.00', finalAmount:'100.00', currency:'RUB', shippingAddress:{city:'Москва'}, shippingCost:'0.00', shippingProvider:'POST', paymentMethod:'CARD',
   items:[{id:itemId,variantId,quantity:5,price:'20.00',total:'100.00',productType:'PHYSICAL'}], warehouseExecution:null };
  order.execution={snapshotHash:executionSnapshot(order),version:1};
  const events=new Map<string,any>();
  const tx:any = {
   $queryRaw:jest.fn(), ecosystemIntegration:{findUnique:jest.fn(async()=>({isEnabled:true,config:{warehouseId:'main'}}))},
   order:{findUnique:jest.fn(async()=>order),update:jest.fn()},
   oneCOrderWarehouse:{upsert:jest.fn(async ({create,update})=>order.warehouseExecution=order.warehouseExecution?update:create)},
   oneCWarehouseEvent:{findUnique:jest.fn(async ({where})=>events.get(where.eventId)||null),create:jest.fn(async ({data})=>{events.set(data.eventId,data);return data;})},
   oneCWarehouseStock:{updateMany:jest.fn()},productVariant:{update:jest.fn(),updateMany:jest.fn()},orderItem:{update:jest.fn()},syncLog:{create:jest.fn()},
  };
  const db:any={$transaction:jest.fn(async fn=>fn(tx))};
  const line={orderItemId:itemId,reserved:5,picked:0,checked:0,shipped:0,cancelled:0,returned:0,damaged:0};
  const dto:any={protocolVersion:1,platformOrderId:order.id,external1CId:order.externalId,eventId:randomUUID(),revision:1,executionVersion:1,basisHash:executionSnapshot(order),warehouseId:'main',status:'RESERVED',asOf:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),lines:[line],documents:[]};
  return {order,itemId,line,tx,db,dto,events,service:new OneCWarehouseService(db)};
 }
 it('stores complete reserved and partial-shipment facts without making a local warehouse movement',async()=>{
  const f=fixture();await f.service.receive(f.dto);
  const partial={...f.dto,eventId:randomUUID(),revision:2,status:'PARTIALLY_SHIPPED',documentId:'document-1',lines:[{...f.line,reserved:4,picked:2,checked:1,shipped:1}]};
  await f.service.receive(partial);
  expect(f.order.warehouseExecution).toMatchObject({owner:'ONE_C',revision:2,status:'PARTIALLY_SHIPPED',documentId:'document-1',lines:partial.lines});
  expect(f.events.size).toBe(2);expect(f.tx.productVariant.update).not.toHaveBeenCalled();expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();expect(f.tx.orderItem.update).not.toHaveBeenCalled();expect(f.tx.order.update).not.toHaveBeenCalled();
 });
 it('invalidates availability for reservation/shipment changes, but not for picking alone',async()=>{
  const f=fixture();await f.service.receive(f.dto);expect(f.tx.oneCWarehouseStock.updateMany).toHaveBeenCalledTimes(1);
  f.tx.oneCWarehouseStock.updateMany.mockClear();
  await f.service.receive({...f.dto,eventId:randomUUID(),revision:2,status:'PICKING',lines:[{...f.line,picked:2}]});
  expect(f.tx.oneCWarehouseStock.updateMany).not.toHaveBeenCalled();
  await f.service.receive({...f.dto,eventId:randomUUID(),revision:3,status:'PARTIALLY_SHIPPED',documentId:'ship',lines:[{...f.line,reserved:4,picked:2,shipped:1}]});
  expect(f.tx.oneCWarehouseStock.updateMany).toHaveBeenCalledWith({where:{variantId:{in:[f.order.items[0].variantId]}},data:{validUntil:new Date(0)}});
 });
 it('replays identical events and prevents conflicting or out-of-order snapshots from overwriting newer data',async()=>{
  const f=fixture();await f.service.receive(f.dto);expect(await f.service.receive(f.dto)).toMatchObject({repeated:true,revision:1});
  await expect(f.service.receive({...f.dto,lines:[{...f.line,reserved:4}]})).rejects.toMatchObject({status:409});
  await expect(f.service.receive({...f.dto,eventId:randomUUID()})).rejects.toMatchObject({status:409});
  await f.service.receive({...f.dto,eventId:randomUUID(),revision:3});
  expect(await f.service.receive({...f.dto,eventId:randomUUID(),revision:2})).toMatchObject({ignored:true,revision:3});
  expect(await f.service.receive(f.dto)).toMatchObject({repeated:true,revision:1});
  expect(f.tx.oneCOrderWarehouse.upsert).toHaveBeenCalledTimes(2);
 });
 it.each([
  {external1CId:'other-1c'}, {basisHash:'0'.repeat(64)}, {warehouseId:'other'},
  {lines:[]}, {lines:[{orderItemId:randomUUID(),reserved:0,picked:0,checked:0,shipped:0,cancelled:0,returned:0,damaged:0}]},
  {lines:[{orderItemId:'line',reserved:0,picked:0,checked:0,shipped:0,cancelled:0,returned:0,damaged:0}]},
 ])('rejects mismatched order identity, warehouse, conditions or lines: %j',async patch=>{
  const f=fixture();await expect(f.service.receive({...f.dto,...patch})).rejects.toBeDefined();expect(f.tx.oneCOrderWarehouse.upsert).not.toHaveBeenCalled();
 });
 it.each([
  {picked:6}, {picked:1,shipped:2}, {picked:1,checked:2}, {picked:1,shipped:1,returned:2}, {picked:1,shipped:1,returned:1,damaged:2}, {cancelled:1,reserved:5}, {reserved:'5'},
 ])('rejects impossible or incorrectly typed quantities: %j',async patch=>{
  const f=fixture();await expect(f.service.receive({...f.dto,lines:[{...f.line,...patch}]})).rejects.toBeDefined();expect(f.tx.oneCOrderWarehouse.upsert).not.toHaveBeenCalled();
 });
 it('requires a reason for reducing previously confirmed quantities and keeps the corrected audit payload',async()=>{
  const f=fixture();const first={...f.dto,status:'PICKING',lines:[{...f.line,picked:3}]};await f.service.receive(first);
  const correction={...first,eventId:randomUUID(),revision:2,lines:[{...f.line,picked:2}]};
  await expect(f.service.receive(correction)).rejects.toMatchObject({status:409});
  await f.service.receive({...correction,correctionReason:'Исправлен ошибочный отбор'});
  expect(f.events.get(correction.eventId).payload.correctionReason).toBe('Исправлен ошибочный отбор');
 });
 it('requires manager confirmation and full documented quantities before announcing shipment',async()=>{
  const f=fixture();f.order.execution=null;
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  const received={...f.dto,status:'RECEIVED',executionVersion:undefined,lines:[{...f.line,reserved:0}]};
  await f.service.receive(received);
  f.order.execution={snapshotHash:executionSnapshot(f.order),version:1};
  const final={...f.dto,eventId:randomUUID(),revision:2,status:'SHIPPED',lines:[{...f.line,reserved:0,picked:5,checked:5,shipped:5}]};
  await expect(f.service.receive(final)).rejects.toMatchObject({status:409});
  await f.service.receive({...final,documentId:'1c-shipment'});
  expect(f.order.warehouseExecution.status).toBe('SHIPPED');
 });
 it('requires an explanation for a rejection and refuses obsolete commercial confirmation',async()=>{
  const f=fixture();await expect(f.service.receive({...f.dto,status:'REJECTED'})).rejects.toMatchObject({status:400});
  f.order.execution.snapshotHash='0'.repeat(64);await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
 });
 it('requires the exact manager confirmation version even if the order basis is unchanged',async()=>{
  const f=fixture();for(const executionVersion of [undefined,2]) await expect(f.service.receive({...f.dto,executionVersion})).rejects.toMatchObject({status:409});
  expect(f.tx.oneCOrderWarehouse.upsert).not.toHaveBeenCalled();
 });
 it('waits for the order export acknowledgement before accepting a warehouse event',async()=>{
  const f=fixture();f.order.externalId=null;
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  expect(f.tx.oneCOrderWarehouse.upsert).not.toHaveBeenCalled();
  f.order.externalId=f.dto.external1CId;
  await f.service.receive(f.dto);expect(f.order.warehouseExecution.external1CId).toBe(f.dto.external1CId);
 });
 it('does not allow unknown fields or stringified numbers into an authenticated snapshot',async()=>{
  const f=fixture();for(const patch of [{unknown:true},{protocolVersion:'1'},{revision:'1'},{lines:[{...f.line,unexpected:true}]}]) await expect(f.service.receive({...f.dto,...patch})).rejects.toMatchObject({status:400});
  expect(f.db.$transaction).not.toHaveBeenCalled();
 });
 it('keeps strict field types under the global implicit conversion settings',async()=>{
  const f=fixture();
  for(const patch of [{external1CId:123},{eventId:456},{documentId:789},{lines:[{...f.line,picked:'1'}]}]) {
   const transformed=plainToInstance(OneCWarehouseSnapshotDto,{...f.dto,...patch},{enableImplicitConversion:true});
   await expect(f.service.receive(transformed)).rejects.toMatchObject({status:400});
  }
  expect(f.db.$transaction).not.toHaveBeenCalled();
 });
 it('checks the integration key before accepting order facts',async()=>{
  const f=fixture(),sync:any={verifyInboundSecret:jest.fn(async()=>false),importWarehouse:jest.fn()},controller=new OneCWebhookController(sync);
  await expect(controller.warehouseSnapshot('wrong',f.dto)).rejects.toMatchObject({status:401});expect(sync.importWarehouse).not.toHaveBeenCalled();
 });
});
