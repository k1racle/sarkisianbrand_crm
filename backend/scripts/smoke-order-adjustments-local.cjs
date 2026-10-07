/* Local PostgreSQL smoke: every QA write is rolled back, no providers or job enqueue. */
const {PrismaClient}=require('@prisma/client');
const {randomUUID}=require('node:crypto');
const assert=require('node:assert/strict');
const {OmsExecutionService}=require('../dist/src/oms/oms-execution.service');
const {OmsAdjustmentService}=require('../dist/src/oms/oms-adjustment.service');
const {CrmReadAccess}=require('../dist/src/crm/read-access');
if(process.env.ALLOW_LOCAL_ORDER_SMOKE!=='true')throw new Error('Set ALLOW_LOCAL_ORDER_SMOKE=true for the local rollback-only smoke');
const db=new PrismaClient(),rollback=new Error('QA rollback');
(async()=>{
 try{await db.$transaction(async tx=>{
  const actor=await tx.user.findUniqueOrThrow({where:{email:process.env.LOCAL_ADMIN_EMAIL||'admin@local.sarkisian.test'},select:{id:true}});
  const key='qa-return-'+randomUUID();
  const product=await tx.product.create({data:{sku:key,slug:key,nameRu:'QA return',basePrice:100,isActive:false,variants:{create:{sku:key+'-v',name:'QA',options:{},price:100,stock:30,reserved:18}}},include:{variants:true}}),variant=product.variants[0];
  const orders=[];
  for(let n=0;n<3;n++)orders.push(await tx.order.create({data:{orderNumber:key+'-'+n,source:'B2B',managerId:actor.id,status:'NEW',reservationState:'ACTIVE',totalAmount:600,finalAmount:600,shippingAddress:{address:'QA'},items:{create:{variantId:variant.id,productName:'QA return',variantName:'QA',quantity:6,price:100,total:600}}},include:{items:true}}));
  const adapter={$transaction:fn=>fn(tx)},access=new CrmReadAccess(),execution=new OmsExecutionService(adapter,access),adjustment=new OmsAdjustmentService(adapter,access);
  const read=id=>tx.order.findUniqueOrThrow({where:{id},include:{items:true,execution:true,executionOperations:true,payments:true}});
  const inventory=()=>tx.productVariant.findUniqueOrThrow({where:{id:variant.id}});
  const body=async(id,kind,extra={})=>{const o=await read(id);return {kind,requestKey:randomUUID(),expectedVersion:o.execution?.version||0,expectedUpdatedAt:o.updatedAt.toISOString(),...extra}};
  const run=async(id,kind,extra={})=>{if(kind==='SHIP'){const {settlementBasis}=require('../dist/src/1c-sync/finance-policy'),o=await read(id),data={revision:1,payloadHash:'qa',basisHash:settlementBasis(o),asOf:new Date(),validUntil:new Date(Date.now()+60000),currency:'RUB',total:600,paid:0,refunded:0,debt:600,refundDue:0,releaseAllowed:true,releaseReason:'QA 1C test release',documents:[]};await tx.oneCOrderFinance.upsert({where:{orderId:id},create:{orderId:id,...data},update:data})}return execution.execute(actor.id,id,await body(id,kind,extra))};
  const adjust=async(id,kind,lines,reason='QA')=>{const dto=await body(id,kind,{lines,reason});return {dto,result:await adjustment.adjust(actor.id,id,dto)}};
  const confirm=id=>run(id,'CONFIRM',{compositionChecked:true,pricesChecked:true,paymentTerms:'Deferred',deliveryTerms:'Pickup'});
  const o=orders[0],line=o.items[0].id;await confirm(o.id);await run(o.id,'PICK',{lines:[{itemId:line,quantity:4}]});await run(o.id,'SHIP',{lines:[{itemId:line,quantity:3}]});
  const cancel=await adjust(o.id,'CANCEL_REMAINDER',[{itemId:line,quantity:2}]);
  const count=(await read(o.id)).executionOperations.length;
  assert.equal((await adjustment.adjust(actor.id,o.id,cancel.dto)).repeated,true);assert.equal((await read(o.id)).executionOperations.length,count);
  await assert.rejects(adjustment.adjust(actor.id,o.id,{...cancel.dto,reason:'different'}),e=>e.status===409);
  await assert.rejects(adjust(o.id,'CANCEL_REMAINDER',[{itemId:line,quantity:2}]),e=>e.status===409);
  await assert.rejects(run(o.id,'PICK',{lines:[{itemId:line,quantity:1}]}),e=>e.status===409);
  await run(o.id,'SHIP',{lines:[{itemId:line,quantity:1}]});assert.equal((await read(o.id)).status,'SHIPPED');
  const returned=await adjust(o.id,'RETURN',[{itemId:line,quantity:3,damagedQuantity:1}]);
  assert.equal((await inventory()).stock,28);assert.equal((await inventory()).damagedStock,1);assert.equal((await inventory()).reserved,12);
  assert.equal((await adjustment.adjust(actor.id,o.id,returned.dto)).repeated,true);assert.equal((await inventory()).stock,28);
  await assert.rejects(adjust(o.id,'RETURN',[{itemId:line,quantity:2}]),e=>e.status===409);
  await assert.rejects(adjust(o.id,'RETURN',[{itemId:line,quantity:1,damagedQuantity:2}]),e=>e.status===400);
  await assert.rejects(adjust(o.id,'RETURN',[{itemId:line,quantity:1},{itemId:line,quantity:1}]),e=>e.status===400);
  await assert.rejects(adjust(o.id,'RETURN',[{itemId:orders[1].items[0].id,quantity:1}]),e=>e.status===400);
  await assert.rejects(adjust(o.id,'RETURN',[{itemId:line,quantity:1}],'  '),e=>e.status===400);
  await adjust(o.id,'RETURN',[{itemId:line,quantity:1,damagedQuantity:1}]);
  const final=await read(o.id);assert.equal(final.items[0].returnedQuantity,4);assert.equal(final.items[0].damagedReturnedQuantity,2);assert.equal(final.items[0].cancelledQuantity,2);assert.equal(Number(final.finalAmount),600);assert.equal(final.paymentStatus,'PENDING');assert.equal(final.payments.length,0);assert.equal(final.execution.settlementReviewRequired,true);assert.equal((await inventory()).damagedStock,2);
  // Cancellation also removes already picked, unshipped quantities, without restocking them.
  const second=orders[1];await confirm(second.id);await run(second.id,'PICK',{lines:[{itemId:second.items[0].id,quantity:6}]});
  const stale=await body(second.id,'CANCEL_REMAINDER',{lines:[{itemId:second.items[0].id,quantity:1}],reason:'stale'});
  await tx.order.update({where:{id:second.id},data:{internalNotes:'concurrent change',updatedAt:new Date(Date.now()+1000)}});
  await assert.rejects(adjustment.adjust(actor.id,second.id,stale),e=>e.status===409);
  await adjust(second.id,'CANCEL_REMAINDER',[{itemId:second.items[0].id,quantity:6}]);
  const cancelled=await read(second.id);assert.equal(cancelled.status,'CANCELLED');assert.equal(cancelled.items[0].pickedQuantity,0);assert.equal(cancelled.reservationState,'RELEASED');assert.equal((await inventory()).stock,28);assert.equal((await inventory()).reserved,6);
  // Altered order content is never silently accepted.
  const third=orders[2];await confirm(third.id);await tx.orderItem.update({where:{id:third.items[0].id},data:{price:101}});
  await assert.rejects(adjust(third.id,'CANCEL_REMAINDER',[{itemId:third.items[0].id,quantity:1}]),e=>e.status===409);
  throw rollback;
 },{timeout:30000,isolationLevel:'Serializable'});}catch(e){if(e!==rollback)throw e;}
 console.log('PASS partial cancellation, good/damaged returns, repeat and overrun protection, foreign lines, stale/snapshot checks, unchanged payments, other-order reserves; all QA writes rolled back');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
