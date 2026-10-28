import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { holdVerifiedOneCStock } from '../common/one-c-sale-stock';
import { executionSnapshot } from '../oms/execution-snapshot';
import { OneCWarehouseService } from './one-c-warehouse.service';
import { OneCWarehouseStockService } from './one-c-warehouse-stock.service';
import { OneCFinanceService } from './one-c-finance.service';
import { settlementBasis } from './finance-policy';

const databaseUrl=process.env.WAREHOUSE_TEST_DATABASE_URL;
if (databaseUrl) {
 const parsed=new URL(databaseUrl);
 if (!['127.0.0.1','localhost'].includes(parsed.hostname) || parsed.pathname !== '/warehouse_test' || parsed.port !== '55432') throw new Error('Warehouse PostgreSQL tests require the dedicated local test database on port 55432');
}
const run=databaseUrl?describe:describe.skip;

run('isolated PostgreSQL: 1C warehouse facts and holds',()=>{
 let db:PrismaClient, stocks:OneCWarehouseStockService, warehouse:OneCWarehouseService;
 const now=()=>new Date(Date.now()-1000).toISOString(), until=()=>new Date(Date.now()+60000).toISOString();

 beforeAll(async()=>{
  db=new PrismaClient({datasources:{db:{url:databaseUrl}}});await db.$connect();
  await db.ecosystemIntegration.upsert({where:{key:'ONE_C'},create:{key:'ONE_C',provider:'TEST',name:'Warehouse fixture',category:'ERP',isEnabled:true,config:{warehouseId:'main',baseUrl:'https://example.invalid/',username:'fixture'},configuredSecretKeys:['password','exchangeSecret']},update:{isEnabled:true,config:{warehouseId:'main',baseUrl:'https://example.invalid/',username:'fixture'},configuredSecretKeys:['password','exchangeSecret']}});
  stocks=new OneCWarehouseStockService(db as unknown as PrismaService);warehouse=new OneCWarehouseService(db as unknown as PrismaService);
 });
 afterAll(async()=>{await db?.$disconnect();});

 async function product() {
  const suffix=randomUUID();return db.product.create({data:{sku:`product-${suffix}`,slug:`product-${suffix}`,nameRu:'Тестовый товар',basePrice:'20.00',externalId:`external-${suffix}`,variants:{create:{sku:`variant-${suffix}`,name:'Вариант',options:{},price:'20.00',stock:0,reserved:0}}},include:{variants:true}});
 }
 function stockPacket(product:any,options:any={}) {
  return {protocolVersion:2,stockBasis:'PHYSICAL_INCLUDING_RESERVED',warehouseId:'main',positions:[{variantId:product.variants[0].id,externalProductId:product.externalId,sku:product.variants[0].sku,revision:1,stock:10,damagedStock:0,reserved1C:0,asOf:now(),validUntil:until(),coveredEventIds:[],...options}]};
 }
 async function createHeldOrder(product:any,quantity:number,paid=false) {
  const variant=product.variants[0],id=randomUUID();
  return db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${variant.id} FOR UPDATE`;
   await holdVerifiedOneCStock(tx,variant.id,quantity);
   await tx.productVariant.update({where:{id:variant.id},data:{reserved:{increment:quantity}}});
   return tx.order.create({data:{orderNumber:`WAREHOUSE-TEST-${id}`,source:'WEB',status:paid?'PAID':'NEW',paymentStatus:paid?'SUCCEEDED':'PENDING',reservationState:'ACTIVE',externalId:`1c-${id}`,shippingAddress:{city:'Тест'},shippingCost:'0.00',shippingProvider:'POST',paymentMethod:'CARD',totalAmount:(20*quantity).toFixed(2),discountAmount:'0.00',finalAmount:(20*quantity).toFixed(2),items:{create:{variantId:variant.id,productName:'Тестовый товар',variantName:'Вариант',price:'20.00',quantity,total:(20*quantity).toFixed(2)}},...(paid?{payments:{create:{amount:(20*quantity).toFixed(2),provider:'FIXTURE',transactionId:`payment-${id}`,status:'SUCCEEDED'}}}:{})},include:{items:true}});
  },{timeout:30000});
 }
 function fact(order:any,options:any={}) {
  return {protocolVersion:1,platformOrderId:order.id,external1CId:order.externalId,eventId:randomUUID(),revision:1,executionVersion:1,basisHash:executionSnapshot(order),warehouseId:'main',status:'RESERVED',asOf:now(),validUntil:until(),lines:[{orderItemId:order.items[0].id,reserved:2,picked:0,checked:0,shipped:0,cancelled:0,returned:0,damaged:0}],documents:[],...options};
 }

 it('projects reserved, partial and complete shipment exactly once without a local second deduction',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  const order=await createHeldOrder(p,2,true);await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'Оплачено',deliveryTerms:'Почта',confirmedBy:'fixture'}});
  const reserved=fact(order);await warehouse.receive(reserved as any);
  expect((await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).validUntil.getTime()).toBe(0);
  await expect(db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${variantId} FOR UPDATE`;await holdVerifiedOneCStock(tx,variantId,1);})).rejects.toMatchObject({status:409});
  await stocks.receive(stockPacket(p,{revision:2,reserved1C:2,coveredEventIds:[reserved.eventId]}) as any);
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:10,reserved:2});
  const partial=fact(order,{revision:2,status:'PARTIALLY_SHIPPED',documentId:'fixture-shipment-1',lines:[{...reserved.lines[0],reserved:1,picked:1,checked:1,shipped:1}]});await warehouse.receive(partial as any);
  await stocks.receive(stockPacket(p,{revision:3,stock:9,reserved1C:1,coveredEventIds:[partial.eventId]}) as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}})).toMatchObject({status:'ASSEMBLING',reservationState:'ACTIVE',items:[{pickedQuantity:1,shippedQuantity:1}]});
  const shipped=fact(order,{revision:3,status:'SHIPPED',documentId:'fixture-shipment-2',lines:[{...reserved.lines[0],reserved:0,picked:2,checked:2,shipped:2}]});await warehouse.receive(shipped as any);
  const finalStock=stockPacket(p,{revision:4,stock:8,reserved1C:0,coveredEventIds:[shipped.eventId]});await stocks.receive(finalStock as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}})).toMatchObject({status:'SHIPPED',reservationState:'CONSUMED',items:[{pickedQuantity:2,shippedQuantity:2}]});
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:8,reserved:0});
  expect(await warehouse.receive(shipped as any)).toMatchObject({repeated:true});expect(await stocks.receive(finalStock as any)).toMatchObject({repeated:1});
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:8,reserved:0});
 },30000);

 it('does not complete an order until every SKU covers the same shipment event',async()=>{
  const products=[await product(),await product()],variants=products.map(row=>row.variants[0]).sort((a,b)=>a.id.localeCompare(b.id));
  for(const row of products)await stocks.receive(stockPacket(row) as any);
  const id=randomUUID();
  const order=await db.$transaction(async tx=>{
   for(const variant of variants){await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${variant.id} FOR UPDATE`;await holdVerifiedOneCStock(tx,variant.id,2);await tx.productVariant.update({where:{id:variant.id},data:{reserved:{increment:2}}});}
   return tx.order.create({data:{orderNumber:`WAREHOUSE-TEST-${id}`,source:'WEB',status:'PAID',paymentStatus:'SUCCEEDED',reservationState:'ACTIVE',externalId:`1c-${id}`,shippingAddress:{city:'Тест'},shippingCost:'0.00',shippingProvider:'POST',paymentMethod:'CARD',totalAmount:'80.00',discountAmount:'0.00',finalAmount:'80.00',items:{create:variants.map(variant=>({variantId:variant.id,productName:'Тест',variantName:'Вариант',price:'20.00',quantity:2,total:'40.00'}))},payments:{create:{amount:'80.00',provider:'FIXTURE',transactionId:`payment-${id}`,status:'SUCCEEDED'}}},include:{items:true}});
  });
  await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'Оплачено',deliveryTerms:'Почта',confirmedBy:'fixture'}});
  const shipment=fact(order,{status:'SHIPPED',documentId:'multi-sku-shipment',lines:order.items.map(item=>({orderItemId:item.id,reserved:0,picked:2,checked:2,shipped:2,cancelled:0,returned:0,damaged:0}))});
  await warehouse.receive(shipment as any);
  await stocks.receive(stockPacket(products[0],{revision:2,stock:8,reserved1C:0,coveredEventIds:[shipment.eventId]}) as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}})).toMatchObject({status:'PAID',reservationState:'ACTIVE',items:expect.arrayContaining([expect.objectContaining({id:order.items[0].id,shippedQuantity:0}),expect.objectContaining({id:order.items[1].id,shippedQuantity:0})])});
  await stocks.receive(stockPacket(products[1],{revision:2,stock:8,reserved1C:0,coveredEventIds:[shipment.eventId]}) as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}})).toMatchObject({status:'SHIPPED',reservationState:'CONSUMED',items:expect.arrayContaining([expect.objectContaining({id:order.items[0].id,shippedQuantity:2}),expect.objectContaining({id:order.items[1].id,shippedQuantity:2})])});
 },30000);

 it('deduplicates concurrent deliveries of the same 1C event',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  const order=await createHeldOrder(p,2,true);await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'Оплачено',deliveryTerms:'Почта',confirmedBy:'fixture'}});
  const event=fact(order), results=await Promise.allSettled([warehouse.receive(event as any),warehouse.receive(event as any)]);
  expect(results.some(result=>result.status==='fulfilled')).toBe(true);
  for(const result of results)if(result.status==='rejected')expect(result.reason).toMatchObject({status:409});
  expect(await warehouse.receive(event as any)).toMatchObject({repeated:true});
  expect(await db.oneCWarehouseEvent.count({where:{orderId:order.id}})).toBe(1);
  expect(await db.oneCOrderWarehouse.findUniqueOrThrow({where:{orderId:order.id}})).toMatchObject({eventId:event.eventId,revision:1});
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:10,reserved:2});
  expect((await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).validUntil.getTime()).toBe(0);
 },30000);

 it('rolls back every position when a later position has a wrong product mapping',async()=>{
  const a=await product(),b=await product(),sorted=[a,b].sort((x,y)=>x.variants[0].id.localeCompare(y.variants[0].id));
  const first=stockPacket(sorted[0]).positions[0],second={...stockPacket(sorted[1]).positions[0],externalProductId:'wrong'};
  await expect(stocks.receive({protocolVersion:2,stockBasis:'PHYSICAL_INCLUDING_RESERVED',warehouseId:'main',positions:[first,second]} as any)).rejects.toMatchObject({status:409});
  expect(await db.oneCWarehouseStock.findUnique({where:{variantId:sorted[0].variants[0].id}})).toBeNull();
  expect(await db.productVariant.findUniqueOrThrow({where:{id:sorted[0].variants[0].id}})).toMatchObject({stock:0,reserved:0});
 },30000);

 it('projects an already covered B2B shipment when 1C subsequently permits release',async()=>{
  const p=await product(), variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  const created=await createHeldOrder(p,2);await db.order.update({where:{id:created.id},data:{source:'B2B',status:'CONFIRMED'}});
  const order=await db.order.findUniqueOrThrow({where:{id:created.id},include:{items:true}});
  await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'fixture',deliveryTerms:'fixture',confirmedBy:'fixture'}});
  const shipment=fact(order,{status:'SHIPPED',documentId:'b2b-shipment',lines:[{orderItemId:order.items[0].id,reserved:0,picked:2,checked:2,shipped:2,cancelled:0,returned:0,damaged:0}]});
  await warehouse.receive(shipment as any);
  await stocks.receive(stockPacket(p,{revision:2,stock:8,reserved1C:0,coveredEventIds:[shipment.eventId]}) as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id}})).toMatchObject({status:'CONFIRMED',reservationState:'ACTIVE'});
  const finance=new OneCFinanceService(db as unknown as PrismaService);
  const packet={platformOrderId:order.id,external1CId:order.externalId,revision:1,basisHash:settlementBasis(order),asOf:now(),validUntil:until(),currency:order.currency,total:'40.00',paid:'0.00',refunded:'0.00',debt:'40.00',refundDue:'0.00',releaseAllowed:true,releaseReason:'fixture',documents:[],requests:[]};
  await expect(finance.receive(packet as any,()=>false)).rejects.toMatchObject({status:401});
  expect(await db.oneCOrderFinance.findUnique({where:{orderId:order.id}})).toBeNull();
  await finance.receive(packet as any);
  expect(await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}})).toMatchObject({status:'SHIPPED',reservationState:'CONSUMED',items:[{shippedQuantity:2}]});
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:8,reserved:0});
  await finance.receive(packet as any);
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:8,reserved:0});
 },30000);

 it('does not accept a stock feed racing a change of the configured warehouse',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  let release!:()=>void, locked!:()=>void;const gate=new Promise<void>(resolve=>release=resolve), ready=new Promise<void>(resolve=>locked=resolve);
  const change=db.$transaction(async tx=>{
   await tx.ecosystemIntegration.update({where:{key:'ONE_C'},data:{config:{warehouseId:'other',baseUrl:'https://example.invalid/',username:'fixture'}}});
   locked();await gate;
  },{timeout:30000});
  await ready;const feed=stocks.receive(stockPacket(p,{revision:2,stock:7}) as any).then(value=>({value}),error=>({error}));
  try {
   let waiting=false;
   for(let i=0;i<80&&!waiting;i++) { const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname='warehouse_test' AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;waiting=Number(rows[0].count)>0;if(!waiting)await new Promise(resolve=>setTimeout(resolve,25)); }
   expect(waiting).toBe(true);
  } finally {release();}
  await change;
  try {
   expect(await feed).toMatchObject({error:{status:409}});
   expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:10,reserved:0});
   expect(await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).toMatchObject({revision:1,warehouseId:'main'});
  } finally {await db.ecosystemIntegration.update({where:{key:'ONE_C'},data:{config:{warehouseId:'main',baseUrl:'https://example.invalid/',username:'fixture'}}});}
 },30000);

 it('does not apply a warehouse event racing a change of the configured warehouse',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  const order=await createHeldOrder(p,2,true);
  await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'fixture',deliveryTerms:'fixture',confirmedBy:'fixture'}});
  const event=fact(order);
  let release!:()=>void, locked!:()=>void;const gate=new Promise<void>(resolve=>release=resolve), ready=new Promise<void>(resolve=>locked=resolve);
  const change=db.$transaction(async tx=>{
   await tx.ecosystemIntegration.update({where:{key:'ONE_C'},data:{config:{warehouseId:'other',baseUrl:'https://example.invalid/',username:'fixture'}}});
   locked();await gate;
  },{timeout:30000});
  await ready;const response=warehouse.receive(event as any).then(value=>({value}),error=>({error}));
  try {
   let waiting=false;
   for(let i=0;i<80&&!waiting;i++) {const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname='warehouse_test' AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;waiting=Number(rows[0].count)>0;if(!waiting)await new Promise(resolve=>setTimeout(resolve,25));}
   expect(waiting).toBe(true);
  } finally {release();}
  await change;
  try {
   expect(await response).toMatchObject({error:{status:409}});
   expect(await db.oneCWarehouseEvent.findUnique({where:{eventId:event.eventId}})).toBeNull();
   expect((await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).validUntil.getTime()).toBeGreaterThan(Date.now());
  } finally {await db.ecosystemIntegration.update({where:{key:'ONE_C'},data:{config:{warehouseId:'main',baseUrl:'https://example.invalid/',username:'fixture'}}});}
 },30000);

 it('rejects either warehouse webhook if its key no longer matches the locked integration',async()=>{
  const p=await product(), variantId=p.variants[0].id;
  await expect(stocks.receive(stockPacket(p) as any,()=>false)).rejects.toMatchObject({status:401});
  expect(await db.oneCWarehouseStock.findUnique({where:{variantId}})).toBeNull();
  await stocks.receive(stockPacket(p) as any);
  const order=await createHeldOrder(p,2,true);
  await db.orderExecution.create({data:{orderId:order.id,version:1,snapshotHash:executionSnapshot(order),paymentTerms:'fixture',deliveryTerms:'fixture',confirmedBy:'fixture'}});
  const event=fact(order);
  await expect(warehouse.receive(event as any,()=>false)).rejects.toMatchObject({status:401});
  expect(await db.oneCWarehouseEvent.findUnique({where:{eventId:event.eventId}})).toBeNull();
  expect((await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).validUntil.getTime()).toBeGreaterThan(Date.now());
 },30000);

 it('serializes concurrent local holds against the same physical quantity',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p,{stock:5}) as any);
  const attempts=await Promise.allSettled(Array.from({length:8},()=>createHeldOrder(p,1)));
  expect(attempts.filter(result=>result.status==='fulfilled')).toHaveLength(5);
  expect(attempts.filter(result=>result.status==='rejected')).toHaveLength(3);
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:5,reserved:5});
  expect(await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).toMatchObject({stock:5,reserved1C:0,localPending:5});
  expect(await db.orderItem.count({where:{variantId,order:{reservationState:'ACTIVE'}}})).toBe(5);
 },30000);

 it('returns a retryable conflict for a stock feed racing a committed local hold',async()=>{
  const p=await product(),variantId=p.variants[0].id;await stocks.receive(stockPacket(p) as any);
  let unlock!:()=>void,locked!:()=>void;const gate=new Promise<void>(resolve=>unlock=resolve),hasLock=new Promise<void>(resolve=>locked=resolve);
  const hold=db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id=${variantId} FOR UPDATE`;locked();await gate;
   await holdVerifiedOneCStock(tx,variantId,1);await tx.productVariant.update({where:{id:variantId},data:{reserved:{increment:1}}});
   await tx.order.create({data:{orderNumber:`WAREHOUSE-TEST-${randomUUID()}`,source:'WEB',status:'NEW',reservationState:'ACTIVE',shippingAddress:{},totalAmount:'20.00',discountAmount:'0.00',finalAmount:'20.00',items:{create:{variantId,productName:'Тест',variantName:'Вариант',price:'20.00',quantity:1,total:'20.00'}}}});
  },{timeout:30000});
  await hasLock;const feed=stocks.receive(stockPacket(p,{revision:2}) as any).then(value=>({value}),error=>({error}));
  try {
   let waiting=false;
   for(let attempt=0;attempt<40&&!waiting;attempt++) {
    const rows=await db.$queryRaw<{count:bigint}[]>`SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname='warehouse_test' AND wait_event_type='Lock' AND pid<>pg_backend_pid()`;
    waiting=Number(rows[0].count)>0;if(!waiting)await new Promise(resolve=>setTimeout(resolve,25));
   }
   expect(waiting).toBe(true);
  } finally {unlock();}
  await hold;
  expect(await feed).toMatchObject({error:{status:409}});
  await stocks.receive(stockPacket(p,{revision:2}) as any);
  expect(await db.productVariant.findUniqueOrThrow({where:{id:variantId}})).toMatchObject({stock:10,reserved:1});
  expect(await db.oneCWarehouseStock.findUniqueOrThrow({where:{variantId}})).toMatchObject({reserved1C:0,localPending:1});
 },30000);
});
