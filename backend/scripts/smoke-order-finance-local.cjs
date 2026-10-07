/* Local HTTP/PostgreSQL contract acceptance, not acceptance of a real 1C installation. */
const { PrismaClient, Prisma } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcrypt'), assert = require('node:assert/strict');
const { settlementBasis } = require('/app/dist/src/1c-sync/finance-policy');
const { OneCSyncService } = require('/app/dist/src/1c-sync/1c-sync.service');
const { IntegrationSecretsService } = require('/app/dist/src/system-settings/integration-secrets.service');
if (process.env.ALLOW_LOCAL_FINANCE_SMOKE !== 'true') throw Error('Set ALLOW_LOCAL_FINANCE_SMOKE=true');
if (process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED === 'true' || process.env.ECOSYSTEM_AUTOMATION_ENABLED === 'true') throw Error('Local acceptance requires external calls and automation disabled');
const db = new PrismaClient(), base = 'http://backend:3000/api/v1', key = 'qa-one-c-' + randomUUID(), ids = [], users = [];
let product, profile, integration, integrationChanged = false;
async function api(path, token, method='GET', body, status=200, headers={}) {
 const r = await fetch(base+path, { method, headers: { Authorization:'Bearer '+token, 'Content-Type':'application/json', ...headers }, ...(body ? { body:JSON.stringify(body) } : {}) });
 const result = await r.json(); assert.equal(r.status,status,path+': '+JSON.stringify(result)); return result;
}
const login = async (email,password) => (await api('/auth/login','', 'POST',{email,password})).accessToken;
(async()=>{try {
 integration = await db.ecosystemIntegration.findUniqueOrThrow({where:{key:'ONE_C'}});
 if (integration.isEnabled) throw Error('Run only with the local 1C integration disabled; do not replace a live connection');
 const admin = await login(process.env.LOCAL_ADMIN_EMAIL,process.env.LOCAL_ADMIN_PASSWORD), actor = await db.user.findUniqueOrThrow({where:{email:process.env.LOCAL_ADMIN_EMAIL}});
 product = await db.product.create({data:{sku:key,slug:key,nameRu:'QA 1C authority',basePrice:100,isActive:false,variants:{create:{sku:key+'-v',name:'QA',options:{},price:100,stock:10,reserved:2}}},include:{variants:true}});
 const variant = product.variants[0];
 const order = await db.order.create({data:{orderNumber:key,source:'B2B',managerId:actor.id,totalAmount:200,finalAmount:200,reservationState:'ACTIVE',shippingAddress:{},items:{create:{variantId:variant.id,productName:'QA',variantName:'QA',quantity:2,price:100,total:200}}},include:{items:true}});ids.push(order.id);
 const id=order.id, path='/oms/orders/'+id, get=()=>api(path+'/finance',admin), read=()=>db.order.findUniqueOrThrow({where:{id},include:{items:true,execution:true}});
 const body=async(kind,extra={})=>{const o=await read();return{kind,requestKey:randomUUID(),expectedVersion:o.execution?.version||0,expectedUpdatedAt:o.updatedAt.toISOString(),...extra}};
 const run=async(kind,extra={},status=201)=>api(path+'/execution',admin,'POST',await body(kind,extra),status);
 assert.equal((await get()).state,'MISSING');assert.equal((await get()).snapshot,null);
 await api(path,admin,'PATCH',{status:'PAID',expectedUpdatedAt:order.updatedAt.toISOString()},409);
 await api(path+'/finance',admin,'POST',{kind:'RECEIPT',amount:'200.00',document:'QA',reason:'QA',occurredAt:new Date().toISOString(),requestKey:randomUUID(),expectedVersion:1,expectedUpdatedAt:order.updatedAt.toISOString()},410);
 const requestBody={kind:'INVOICE',comment:'QA invoice request',requestKey:randomUUID(),expectedUpdatedAt:(await get()).updatedAt};
 const request=await api(path+'/1c-requests',admin,'POST',requestBody,201);
 assert.equal((await api(path+'/1c-requests',admin,'POST',requestBody,201)).repeated,true);
 await api(path+'/1c-requests',admin,'POST',{...requestBody,comment:'different'},409);
 await api(path+'/1c-requests',admin,'POST',{...requestBody,requestKey:randomUUID(),expectedUpdatedAt:(await get()).updatedAt},409);
 await api(path+'/1c-requests',admin,'POST',{...requestBody,kind:'TERMS_REVIEW',requestKey:randomUUID(),expectedUpdatedAt:(await get()).updatedAt,paid:'200.00'},400);
 assert.equal((await get()).requests[0].status,'PENDING');
 const sync=new OneCSyncService(db,{},{}), exported=await db.order.findUniqueOrThrow({where:{id},include:sync.orderInclude()});
 const payload=sync.orderPayload(exported,{});assert.equal(payload.accountingAuthority,'ONE_C');assert.equal(payload.protocolVersion,4);assert.equal(payload.finance,undefined);
 await assert.rejects(sync.applyAcknowledgement(exported,{acceptedIds:[id]}),e=>e.status===502);
 await sync.applyAcknowledgement(exported,{orders:[{platformOrderId:id,accepted:true,revision:exported.updatedAt.toISOString(),acceptedRequestIds:[request.id]}]});
 assert.equal((await get()).requests[0].status,'RECEIVED');
 await run('CONFIRM',{compositionChecked:true,pricesChecked:true,paymentTerms:'Решение 1С',deliveryTerms:'Самовывоз'});
 await run('PICK',{lines:[{itemId:order.items[0].id,quantity:2}]});
 await run('SHIP',{lines:[{itemId:order.items[0].id,quantity:1}]},409);
 // Temporarily configure only the authenticated inbound endpoint. All outgoing calls remain disabled.
 const secret=randomUUID(), encryptedSecrets=new IntegrationSecretsService({get:name=>process.env[name]}).encrypt({password:'local-test-only',exchangeSecret:secret});
 await db.ecosystemIntegration.update({where:{id:integration.id},data:{status:'CONNECTED',config:{baseUrl:'http://127.0.0.1:1',username:'qa'},encryptedSecrets,configuredSecretKeys:['password','exchangeSecret']}});integrationChanged=true;
 let revision=0;
 const snapshot=async(extra={})=>({platformOrderId:id,external1CId:key,revision:++revision,basisHash:settlementBasis(await read()),asOf:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+600000).toISOString(),currency:'RUB',total:'200.00',paid:'80.00',refunded:'0.00',debt:'120.00',refundDue:'0.00',releaseAllowed:false,releaseReason:'Лимит по данным 1С',documents:[],requests:[],...extra});
 const receive=async(dto,status=201,auth=secret)=>{await db.ecosystemIntegration.update({where:{id:integration.id},data:{isEnabled:true}});try{return await api('/1c-webhook/order-finance','', 'POST',dto,status,{'x-integration-key':auth})}finally{await db.ecosystemIntegration.update({where:{id:integration.id},data:{isEnabled:false}})}};
 const first=await snapshot();await receive(first,401,'wrong-key');await receive(first);
 assert.equal((await receive(first)).repeated,true);await receive({...first,paid:'81.00'},409);
 await receive({...first,revision:2147483648},400);
 await receive(await snapshot({currency:'USD'}),409);await receive(await snapshot({basisHash:'0'.repeat(64)}),409);
 await receive(await snapshot({requests:[{id:randomUUID(),status:'COMPLETED',message:'foreign'}]}),409);
 await receive(await snapshot({paid:80}),400);
 assert.equal((await get()).snapshot.debt,'120');assert.equal((await get()).releaseAllowed,false);
 await run('SHIP',{lines:[{itemId:order.items[0].id,quantity:1}]},409);
 await receive(await snapshot({releaseAllowed:true,releaseReason:'Разрешено с отсрочкой',asOf:new Date(Date.now()-60000).toISOString(),validUntil:new Date(Date.now()-1).toISOString()}),400);
 const accepted=await snapshot({releaseAllowed:true,releaseReason:'Разрешено с отсрочкой',documents:[{id:key+'-invoice',kind:'INVOICE',number:'QA-1',date:new Date().toISOString(),status:'POSTED',amount:'200.00'}],requests:[{id:request.id,status:'COMPLETED',message:'Счёт создан',externalDocumentId:key+'-invoice'}]});await receive(accepted);
 assert.equal((await get()).requests[0].status,'COMPLETED');assert.equal((await get()).snapshot.documents[0].number,'QA-1');
 await receive({...accepted,revision:++revision,requests:[{id:request.id,status:'RECEIVED',message:''}]},409);
 assert.equal((await read()).paymentStatus,'PENDING');assert.equal(await db.payment.count({where:{orderId:id}}),0);assert.equal(await db.orderFinanceEntry.count({where:{orderId:id}}),0);
 const before=await db.productVariant.findUniqueOrThrow({where:{id:variant.id}});assert.equal(before.stock,10);assert.equal(before.reserved,2);
 // Expiration is independent of debt, then a fresh release enables exactly one dispatch.
 await db.oneCOrderFinance.update({where:{orderId:id},data:{validUntil:new Date(0)}});assert.equal((await get()).state,'STALE');await run('SHIP',{lines:[{itemId:order.items[0].id,quantity:1}]},409);
 await receive(await snapshot({releaseAllowed:true,releaseReason:'Разрешено с отсрочкой'}));
 const ship=await body('SHIP',{lines:[{itemId:order.items[0].id,quantity:1}]});await api(path+'/execution',admin,'POST',ship,201);assert.equal((await api(path+'/execution',admin,'POST',ship,201)).repeated,true);
 const cancel=await body('CANCEL_REMAINDER',{lines:[{itemId:order.items[0].id,quantity:1}],reason:'QA remainder'});await api(path+'/adjustments',admin,'POST',cancel,201);
 assert.equal((await get()).state,'CHANGED');
 const current=await read(), qty=await db.productVariant.findUniqueOrThrow({where:{id:variant.id}});assert.equal(current.items[0].shippedQuantity,1);assert.equal(qty.stock,9);assert.equal(qty.reserved,0);
 await receive({...accepted,revision:++revision},409);
 const final=await snapshot({total:'100.00',paid:'80.00',debt:'20.00',releaseAllowed:false,releaseReason:'Остаток заказа отменён'});await receive(final);assert.equal((await get()).snapshot.total,'100');assert.equal(Number((await read()).finalAmount),200);
 // Read-only employees and scoped order access still apply to accounting projections and requests.
 const password='QA-'+randomUUID(), user=await db.user.create({data:{email:key+'@local.test',firstName:'QA',role:'MANAGER_B2B',password:await bcrypt.hash(password,10),accessProfileMode:true}});users.push(user.id);
 profile=await db.crmAccessProfile.create({data:{name:key,normalizedName:key}});
 await db.crmAccessAssignment.create({data:{userId:user.id,profileId:profile.id,profileVersion:1,snapshot:{name:key,grants:[{permissionKey:'oms.read',scope:'OWN',departmentIds:[]},{permissionKey:'order_finance.read',scope:'COMPANY',departmentIds:[]}]}}});
 const token=await login(user.email,password);await api(path+'/finance',token,'GET',undefined,404);assert.equal((await api('/oms/receivables?search='+key,token)).items.length,0);
 await db.order.update({where:{id},data:{managerId:user.id}});assert.equal((await api(path+'/finance',token)).id,id);await api(path+'/1c-requests',token,'POST',requestBody,403);
 const permission=await db.permission.findUniqueOrThrow({where:{key:'order_finance.read'}});await db.userPermission.create({data:{userId:user.id,permissionId:permission.id,effect:'DENY'}});await api(path+'/finance',token,'GET',undefined,403);
 console.log('PASS HTTP/PostgreSQL: 1C-only balances; retired ledger; durable/idempotent requests; exact transport acknowledgement; authenticated/versioned snapshots; terminal results; validation; no payment/stock side effects; missing/denied/expired/changed release; partial shipment/replay/cancellation; scoped access, read-only and DENY');
} finally {
 if(integrationChanged) await db.ecosystemIntegration.update({where:{id:integration.id},data:{isEnabled:integration.isEnabled,status:integration.status,config:integration.config??Prisma.DbNull,encryptedSecrets:integration.encryptedSecrets,configuredSecretKeys:integration.configuredSecretKeys}});
 await db.$transaction(async tx=>{
  await tx.auditLog.deleteMany({where:{OR:[{resourceId:{in:ids}},{actorId:{in:users}}]}});
  for(const id of ids) {await tx.syncLog.deleteMany({where:{system:'1C_KA',details:{path:['orderId'],equals:id}}});await tx.jobRun.deleteMany({where:{jobName:'1C_ORDER_EXPORT',input:{path:['orderId'],equals:id}}});}
  await tx.order.deleteMany({where:{id:{in:ids}}});await tx.user.deleteMany({where:{id:{in:users}}});if(profile)await tx.crmAccessProfile.delete({where:{id:profile.id}});
  if(product){await tx.productVariant.deleteMany({where:{productId:product.id}});await tx.product.delete({where:{id:product.id}});}
 });await db.$disconnect();
}})().catch(e=>{console.error(e);process.exitCode=1});
