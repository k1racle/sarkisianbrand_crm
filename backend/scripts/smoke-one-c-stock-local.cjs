/* Local HTTP/PostgreSQL acceptance. Restores integration settings and removes only its own fixtures. */
const { PrismaClient, Prisma } = require('@prisma/client'), { randomUUID } = require('node:crypto'), assert = require('node:assert/strict'), fs = require('node:fs'), bcrypt = require('bcrypt');
const { IntegrationSecretsService } = require('/app/dist/src/system-settings/integration-secrets.service');
if (process.env.ALLOW_LOCAL_STOCK_SMOKE !== 'true') throw Error('Set ALLOW_LOCAL_STOCK_SMOKE=true');
for (const flag of ['STOREFRONT_EXTERNAL_CALLS_ENABLED','ECOSYSTEM_AUTOMATION_ENABLED','MAIL_DELIVERY_ENABLED']) if (process.env[flag] === 'true') throw Error('External calls, automation and mail must be disabled');
const db = new PrismaClient(), base = 'http://backend:3000/api/v1', key = 'qa-one-c-stock-' + randomUUID(), warehouse = key+'-warehouse';
let product, order, user, profile, integration, integrationChanged = false;
async function api(path, token, method='GET', body, expected=200, headers={}) {
 const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(expected!==null)assert.equal(r.status,expected,path+': '+JSON.stringify(data));return expected===null?{status:r.status,data}:data;
}
(async()=>{try{
 integration=await db.ecosystemIntegration.findUniqueOrThrow({where:{key:'ONE_C'}});if(integration.isEnabled)throw Error('Refusing to replace an enabled integration');
 const admin=(await api('/auth/login','','POST',{email:process.env.LOCAL_ADMIN_EMAIL,password:process.env.LOCAL_ADMIN_PASSWORD})).accessToken;
 const actor=await db.user.findUniqueOrThrow({where:{email:process.env.LOCAL_ADMIN_EMAIL}}), password=randomUUID();
 user=await db.user.create({data:{email:key+'@local.test',password:await bcrypt.hash(password,10),role:'MANAGER_B2B',firstName:'QA склад',accessProfileMode:true}});
 profile=await db.crmAccessProfile.create({data:{name:key,normalizedName:key}});
 const grants=[{permissionKey:'inventory.read',scope:'COMPANY',departmentIds:[]},{permissionKey:'oms.read',scope:'OWN',departmentIds:[]},{permissionKey:'customers.read',scope:'OWN',departmentIds:[]}];
 await db.crmAccessAssignment.create({data:{userId:user.id,profileId:profile.id,profileVersion:1,snapshot:{name:key,grants}}});
 const scoped=(await api('/auth/login','','POST',{email:user.email,password})).accessToken;
 product=await db.product.create({data:{sku:key,externalId:key,slug:key,nameRu:'QA сверка остатков',basePrice:100,isActive:false,variants:{create:[{sku:key+'-A',name:'Тестовый вариант',options:{},price:100,stock:10,reserved:6},{sku:key+'-B',name:'Другой вариант',options:{},price:100,stock:5}]}},include:{variants:{orderBy:{sku:'asc'}}}});
 const [v,other]=product.variants;
 order=await db.order.create({data:{orderNumber:key,source:'WEB',managerId:actor.id,buyerName:'SECRET_BUYER',buyerEmail:'secret@local.test',shippingAddress:{address:'SECRET_ADDRESS'},paymentStatus:'SUCCEEDED',reservationState:'ACTIVE',totalAmount:600,finalAmount:600,payments:{create:{amount:600,provider:'LOCAL_QA',status:'SUCCEEDED'}},items:{create:{variantId:v.id,productName:product.nameRu,variantName:v.name,quantity:6,price:100,total:600}}},include:{items:true}});
 const read=()=>db.order.findUniqueOrThrow({where:{id:order.id},include:{execution:true,items:true}});
 const run=async(kind,extra={},adjust=false)=>{const o=await read();return api('/oms/orders/'+order.id+(adjust?'/adjustments':'/execution'),admin,'POST',{kind,requestKey:randomUUID(),expectedVersion:o.execution?.version||0,expectedUpdatedAt:o.updatedAt.toISOString(),...extra},201);};
 await run('CONFIRM',{compositionChecked:true,pricesChecked:true,paymentTerms:'Тест',deliveryTerms:'Самовывоз'});await run('PICK',{lines:[{itemId:order.items[0].id,quantity:4}]});
 const ship=await run('SHIP',{lines:[{itemId:order.items[0].id,quantity:4}]}),returned=await run('RETURN',{reason:'Локальная проверка',lines:[{itemId:order.items[0].id,quantity:3,damagedQuantity:1}]},true);
 const qty=()=>db.productVariant.findUniqueOrThrow({where:{id:v.id},select:{stock:true,reserved:true,damagedStock:true}}),before=await qty();assert.deepEqual(before,{stock:8,reserved:2,damagedStock:1});
 const detail=(token=admin)=>api('/oms/inventory/'+v.id,token);
 assert.equal((await detail()).reconciliation.status,'MISSING');
 const secret=randomUUID(),encryptedSecrets=new IntegrationSecretsService({get:name=>process.env[name]}).encrypt({password:'local-only',exchangeSecret:secret});
 await db.ecosystemIntegration.update({where:{id:integration.id},data:{isEnabled:true,status:'CONNECTED',config:{baseUrl:'http://127.0.0.1:1',username:'qa',warehouseId:warehouse},encryptedSecrets,configuredSecretKeys:['password','exchangeSecret']}});integrationChanged=true;
 const position={variantId:v.id,externalProductId:key,sku:v.sku,revision:1,stock:10,damagedStock:0,asOf:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()+3600000).toISOString(),includedOperationIds:[]};
 const packet=positions=>({protocolVersion:1,warehouseId:warehouse,stockBasis:'PHYSICAL_INCLUDING_RESERVED',positions});
 const receive=(positions,expected=201,headers={'x-integration-key':secret})=>api('/1c-webhook/stock-snapshots','','POST',packet(positions),expected,headers);
 await receive([position],401,{'x-integration-key':'wrong'});assert.equal(await db.oneCStockSnapshot.count({where:{variantId:v.id}}),0);
 await receive([{...position,stock:true}],400);await receive([{...position,stock:1.5}],400);await receive([position,position],400);await receive([null],400);
 assert.equal((await receive([position])).accepted,1);assert.equal((await receive([position])).repeated,1);await receive([{...position,stock:11}],409);
 let d=await detail();assert.equal(d.reconciliation.status,'PENDING');assert.equal(d.reconciliation.expectedStock,8);assert.equal(d.reconciliation.pendingDamaged,1);
 const evidence={pending:d};
 const hidden=await detail(scoped);assert.equal(hidden.orders.length,0);assert.equal(hidden.reconciliation.expectedStock,8);
 for(const value of [order.id,ship.operationId,returned.operationId,'SECRET_BUYER','SECRET_ADDRESS','secret@local.test'])assert(!JSON.stringify(hidden).includes(value),'Leaked hidden order metadata');
 // A bad second position rolls back the already processed first position and its log.
 const logs=await db.syncLog.count({where:{action:'STOCK_SNAPSHOTS',details:{path:['warehouseId'],equals:warehouse}}});
 await receive([{...position,revision:2},{...position,variantId:other.id,sku:'WRONG'}],409);assert.equal((await db.oneCStockSnapshot.findUniqueOrThrow({where:{variantId:v.id}})).revision,1);
 assert.equal(await db.syncLog.count({where:{action:'STOCK_SNAPSHOTS',details:{path:['warehouseId'],equals:warehouse}}}),logs);
 await receive([{...position,revision:2,includedOperationIds:[randomUUID()]}],409);
 await receive([{...position,revision:2,includedOperationIds:[ship.operationId]}],409); // Document was created after asOf.
 await receive([{...position,variantId:other.id,sku:other.sku,revision:1,asOf:new Date().toISOString(),includedOperationIds:[ship.operationId]}],409);
 const settled={...position,revision:2,stock:8,damagedStock:1,asOf:new Date().toISOString(),includedOperationIds:[ship.operationId,returned.operationId]};
 await receive([settled]);d=await detail();assert.equal(d.reconciliation.status,'MATCHED');evidence.matched=d;
 assert.equal((await receive([position])).ignored,1);assert.equal((await receive([{...settled,includedOperationIds:[...settled.includedOperationIds].reverse()}])).repeated,1);
 await receive([{...settled,revision:3,includedOperationIds:[ship.operationId]}],409);
 await receive([{...settled,revision:3,stock:9}]);d=await detail();assert.equal(d.reconciliation.status,'DIFFERENCE');assert.equal(d.reconciliation.difference,-1);evidence.difference=d;
 // Same-version concurrent deliveries are idempotent or return an explicit retryable conflict.
 const parallel={...settled,revision:4};const replies=await Promise.all([receive([parallel],null),receive([parallel],null)]);assert(replies.every(r=>[201,409].includes(r.status)));assert(replies.some(r=>r.status===201));assert.equal((await receive([parallel])).repeated,1);
 await db.oneCStockSnapshot.update({where:{variantId:v.id},data:{asOf:new Date(Date.now()-60000),validUntil:new Date(Date.now()-1000)}});d=await detail();assert.equal(d.reconciliation.status,'STALE');assert.equal(d.reconciliation.expectedStock,null);evidence.stale=d;
 await receive([{...settled,revision:5}]);await db.ecosystemIntegration.update({where:{id:integration.id},data:{config:{...integration.config,warehouseId:'different'}}});assert.equal((await detail()).reconciliation.status,'WAREHOUSE_CHANGED');
 await db.ecosystemIntegration.update({where:{id:integration.id},data:{config:{baseUrl:'http://127.0.0.1:1',username:'qa',warehouseId:warehouse}}});
 await db.orderItem.update({where:{id:order.items[0].id},data:{shippedQuantity:5,pickedQuantity:5}});assert.equal((await detail()).reconciliation.status,'HISTORY_INCOMPLETE');await db.orderItem.update({where:{id:order.items[0].id},data:{shippedQuantity:4,pickedQuantity:4}});
 await db.productVariant.update({where:{id:v.id},data:{sku:v.sku+'-renamed'}});assert.equal((await detail()).reconciliation.status,'MAPPING_CHANGED');await db.productVariant.update({where:{id:v.id},data:{sku:v.sku}});
 assert.deepEqual(await qty(),before);const payments=await db.payment.findMany({where:{orderId:order.id}});assert.equal(payments.length,1);assert.equal(Number(payments[0].amount),600);assert.equal(payments[0].status,'SUCCEEDED');assert.equal(await db.orderFinanceEntry.count({where:{orderId:order.id}}),0);
 await db.crmAccessAssignment.deleteMany({where:{userId:user.id}});await api('/oms/inventory/'+v.id,scoped,'GET',undefined,403);
 const list=await api('/oms/inventory?search='+encodeURIComponent(key),admin);evidence.list=list;evidence.variantId=v.id;
 if(fs.existsSync('/evidence'))fs.writeFileSync('/evidence/stock-acceptance.json',JSON.stringify(evidence));
 console.log('PASS HTTP/PostgreSQL: real shipment/good+damaged return, pending and accounted documents, replay, stale/conflicting versions, numeric validation, atomic batch rollback, concurrent imports, wrong warehouse/SKU/documents, incomplete history, scoped reads/revoked access, unchanged stock/reservations/payments.');
}finally{
 if(integrationChanged)await db.ecosystemIntegration.update({where:{id:integration.id},data:{isEnabled:integration.isEnabled,status:integration.status,config:integration.config??Prisma.DbNull,encryptedSecrets:integration.encryptedSecrets,configuredSecretKeys:integration.configuredSecretKeys}});
 await db.$transaction(async tx=>{
  await tx.syncLog.deleteMany({where:{system:'1C_KA',action:'STOCK_SNAPSHOTS',details:{path:['warehouseId'],equals:warehouse}}});
  if(order){await tx.auditLog.deleteMany({where:{resourceId:order.id}});await tx.jobRun.deleteMany({where:{jobName:'1C_ORDER_EXPORT',input:{path:['orderId'],equals:order.id}}});await tx.payment.deleteMany({where:{orderId:order.id}});await tx.order.delete({where:{id:order.id}});}
  if(product){await tx.productVariant.deleteMany({where:{productId:product.id}});await tx.product.delete({where:{id:product.id}});}
  if(user){await tx.auditLog.deleteMany({where:{actorId:user.id}});await tx.user.delete({where:{id:user.id}});}if(profile)await tx.crmAccessProfile.delete({where:{id:profile.id}});
 });await db.$disconnect();
}})().catch(e=>{console.error(e);process.exitCode=1;});
