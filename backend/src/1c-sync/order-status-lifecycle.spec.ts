import { OneCSyncService } from './1c-sync.service';

describe('legacy 1C statuses cannot perform physical warehouse movements', () => {
 function fixture(digital = false) {
  const order:any = { id:'order',externalId:'one-c-order',source:digital?'WEB':'B2B',status:'NEW',reservationState:digital?'DIGITAL':'ACTIVE',items:[{id:'line',variantId:'variant',quantity:2,productType:digital?'GIFT_CARD':'PHYSICAL'}] };
  const tx:any = {$queryRaw:jest.fn(),order:{findFirst:jest.fn(async()=>({...order})),update:jest.fn(async({data})=>Object.assign(order,data))},orderStatusHistory:{create:jest.fn()},productVariant:{updateMany:jest.fn()}};
  const db:any = {$transaction:jest.fn(async fn=>fn(tx)),syncLog:{create:jest.fn()}};
  const service=new OneCSyncService(db,{} as any,{} as any);
  const send=(status:string,extra={})=>service.importOrderStatuses({statuses:[{platformOrderId:'order',external1CId:'one-c-order',status,...extra}]});
  return {order,tx,send};
 }
 it.each(['RESERVING','RESERVED','PARTIAL_RESERVE','READY_FOR_PICKING','PICKING','PICKED','CHECKING','CHECKED','PACKED','READY_TO_SHIP','PARTIALLY_SHIPPED','SHIPPED','DELIVERED','CANCELLED','REFUNDED','RETURNED'])('rejects %s for a physical order without changing stock or status',async status=>{
  const f=fixture();await expect(f.send(status)).rejects.toMatchObject({status:409});
  expect(f.tx.order.update).not.toHaveBeenCalled();expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();expect(f.tx.orderStatusHistory.create).not.toHaveBeenCalled();
 });
 it('retains unambiguous acknowledgement of receipt without touching stock',async()=>{
  const f=fixture();await f.send('RECEIVED');expect(f.order.status).toBe('CONFIRMED');expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
 it('does not use a mismatching external identifier',async()=>{
  const f=fixture();await expect(f.send('RECEIVED',{external1CId:'other'})).rejects.toMatchObject({status:409});expect(f.tx.order.update).not.toHaveBeenCalled();
 });
 it('does not apply the physical guard to a digital-only order',async()=>{
  const f=fixture(true);await f.send('RECEIVED');expect(f.order.status).toBe('CONFIRMED');
 });
 it('accepts delivery only after the 1C shipment projection has consumed the hold',async()=>{
  const f=fixture();f.order.status='SHIPPED';f.order.reservationState='CONSUMED';
  await f.send('DELIVERED');await f.send('DELIVERED');
  expect(f.order.status).toBe('DELIVERED');expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
  expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
 });
 it('ignores a repeated generic SHIPPED after the confirmed 1C projection, without changing data',async()=>{
  const f=fixture();Object.assign(f.order,{status:'SHIPPED',reservationState:'CONSUMED',fulfillmentManaged:false,warehouseExecution:{owner:'ONE_C',status:'SHIPPED'}});
  await f.send('SHIPPED',{trackingNumber:'untrusted',warehouseDocumentId:'untrusted'});
  expect(f.tx.order.update).not.toHaveBeenCalled();expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();expect(f.tx.orderStatusHistory.create).not.toHaveBeenCalled();
 });
 it.each([{status:'SHIPPED',reservationState:'ACTIVE',warehouseExecution:{owner:'ONE_C',status:'SHIPPED'}},{status:'SHIPPED',reservationState:'CONSUMED',warehouseExecution:null},{status:'SHIPPED',reservationState:'CONSUMED',warehouseExecution:{owner:'ONE_C',status:'PICKED'}},{status:'CONFIRMED',reservationState:'CONSUMED',warehouseExecution:{owner:'ONE_C',status:'SHIPPED'}}])('refuses generic shipment without an already confirmed completed projection %#',async state=>{
  const f=fixture();Object.assign(f.order,state);await expect(f.send('SHIPPED')).rejects.toMatchObject({status:409});expect(f.tx.order.update).not.toHaveBeenCalled();
 });
});
