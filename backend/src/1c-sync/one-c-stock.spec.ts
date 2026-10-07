import { randomUUID } from 'crypto';
import { OneCStockService } from './one-c-stock.service';
import { OneCWebhookController } from './1c-sync.controller';

describe('versioned stock snapshot inbox', () => {
 function fixture() {
  const variant:any={id:randomUUID(),sku:'SKU',stock:10,reserved:7,damagedStock:2,product:{externalId:'product',productType:'PHYSICAL'},oneCStock:null};
  const tx:any={ $executeRaw:jest.fn(), ecosystemIntegration:{findUnique:jest.fn(async()=>({config:{warehouseId:'warehouse'}}))},productVariant:{findUnique:jest.fn(async()=>variant)},orderExecutionOperation:{findMany:jest.fn(async()=>[])},oneCStockSnapshot:{upsert:jest.fn(async({create,update})=>variant.oneCStock=variant.oneCStock?{...variant.oneCStock,...update}:create)},syncLog:{create:jest.fn()} };
  const db:any={$transaction:jest.fn(fn=>fn(tx))};
  const item:any={variantId:variant.id,externalProductId:'product',sku:'SKU',revision:1,stock:10,damagedStock:2,asOf:new Date(Date.now()-10000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),includedOperationIds:[]};
  const dto:any={protocolVersion:1,warehouseId:'warehouse',stockBasis:'PHYSICAL_INCLUDING_RESERVED',positions:[item]};
  return {variant,tx,db,item,dto,service:new OneCStockService(db)};
 }
 it('stores a snapshot without changing current stock, reservations or accounting',async()=>{
  const f=fixture();expect(await f.service.receive(f.dto)).toEqual({accepted:1,repeated:0,ignored:0});
  expect(f.variant).toMatchObject({stock:10,reserved:7,damagedStock:2});
  expect(f.tx.syncLog.create).toHaveBeenCalledTimes(1);
  expect(f.db.$transaction).toHaveBeenCalledWith(expect.any(Function),expect.objectContaining({isolationLevel:'Serializable'}));
 });
 it('ignores old revisions, repeats idempotently, rejects changed contents with the same revision',async()=>{
  const f=fixture();f.item.revision=2;await f.service.receive(f.dto);
  expect(await f.service.receive(f.dto)).toEqual({accepted:0,repeated:1,ignored:0});
  expect(await f.service.receive({...f.dto,positions:[{...f.item,revision:1}]})).toMatchObject({ignored:1});
  await expect(f.service.receive({...f.dto,positions:[{...f.item,stock:11}]})).rejects.toMatchObject({status:409});
  expect(f.tx.oneCStockSnapshot.upsert).toHaveBeenCalledTimes(1);
 });
 it.each([{sku:'wrong'},{externalProductId:'wrong'}])('rejects mismatched mapping: %j',async patch=>{const f=fixture();await expect(f.service.receive({...f.dto,positions:[{...f.item,...patch}]})).rejects.toMatchObject({status:409});});
 it('rejects unknown and digital variants',async()=>{const f=fixture();f.variant.product.productType='GIFT_CARD';await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:404});f.tx.productVariant.findUnique.mockResolvedValue(null);await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:404});});
 it.each([{warehouseId:'wrong'},{protocolVersion:2},{stockBasis:'AVAILABLE'}])('rejects a different warehouse/protocol/free stock: %j',async patch=>{const f=fixture();await expect(f.service.receive({...f.dto,...patch})).rejects.toBeDefined();expect(f.tx.oneCStockSnapshot.upsert).not.toHaveBeenCalled();});
 it.each([{revision:0},{stock:-1},{stock:1.5},{damagedStock:-1},{stock:2147483648},{includedOperationIds:['invalid']},{validUntil:'not a date'},{asOf:new Date(Date.now()+3600000).toISOString()},{validUntil:new Date(0).toISOString()}])('validates quantities, IDs and time: %j',async patch=>{const f=fixture();await expect(f.service.receive({...f.dto,positions:[{...f.item,...patch}]})).rejects.toMatchObject({status:400});});
 it('rejects duplicate positions/documents and empty batches',async()=>{
  const f=fixture(),id=randomUUID();
  for(const positions of [[],[null],[f.item,f.item],[{...f.item,includedOperationIds:[id,id]}]])await expect(f.service.receive({...f.dto,positions})).rejects.toMatchObject({status:400});
 });
 it('rejects unknown, unrelated or too recent movement documents',async()=>{
  const f=fixture(),id=randomUUID();f.item.includedOperationIds=[id];await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  const op:any={id,kind:'SHIP',createdAt:new Date(0),lines:[{itemId:'line',quantity:2}],order:{items:[{id:'line',variantId:'other'}]}};
  f.tx.orderExecutionOperation.findMany.mockResolvedValue([op]);await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  op.order.items[0].variantId=f.variant.id;op.createdAt=new Date();await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});
  op.createdAt=new Date(0);expect(await f.service.receive(f.dto)).toMatchObject({accepted:1});
 });
 it('cannot forget an already-accounted document or move observation time backwards',async()=>{
  const f=fixture();await f.service.receive(f.dto);f.variant.oneCStock.includedOperationIds=[randomUUID()];
  await expect(f.service.receive({...f.dto,positions:[{...f.item,revision:2}]})).rejects.toMatchObject({status:409});
  f.variant.oneCStock.includedOperationIds=[];
  await expect(f.service.receive({...f.dto,positions:[{...f.item,revision:2,asOf:new Date(0).toISOString()}]})).rejects.toMatchObject({status:400});
 });
 it('does not silently switch the warehouse or product mapping of a snapshot stream',async()=>{
  const f=fixture();await f.service.receive(f.dto);f.tx.ecosystemIntegration.findUnique.mockResolvedValue({config:{warehouseId:'other'}});
  await expect(f.service.receive({...f.dto,warehouseId:'other',positions:[{...f.item,revision:2}]})).rejects.toMatchObject({status:409});
  f.tx.ecosystemIntegration.findUnique.mockResolvedValue({config:{warehouseId:'warehouse'}});f.variant.product.externalId='new';
  await expect(f.service.receive({...f.dto,positions:[{...f.item,revision:2,externalProductId:'new'}]})).rejects.toMatchObject({status:409});
 });
 it('requires an integration key before calling the stock importer',async()=>{
  const sync:any={verifyInboundSecret:jest.fn(async()=>false),importStock:jest.fn()},controller=new OneCWebhookController(sync);
  await expect(controller.stockSnapshots('wrong',fixture().dto)).rejects.toMatchObject({status:401});expect(sync.importStock).not.toHaveBeenCalled();
  sync.verifyInboundSecret.mockResolvedValue(true);await controller.stockSnapshots('correct',fixture().dto);expect(sync.importStock).toHaveBeenCalledTimes(1);
 });
 it('returns a retryable conflict on concurrent transactions',async()=>{const f=fixture();f.db.$transaction.mockRejectedValue({code:'P2034'});await expect(f.service.receive(f.dto)).rejects.toMatchObject({status:409});});
});
