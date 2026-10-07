/* Local HTTP/PostgreSQL inventory acceptance. Only isolated fixtures are changed; no external calls. */
const { PrismaClient } = require('@prisma/client'), { randomUUID } = require('node:crypto'), bcrypt = require('bcrypt'), assert = require('node:assert/strict'), fs = require('node:fs');
const { executionSnapshot } = require('/app/dist/src/oms/execution-snapshot'), { settlementBasis } = require('/app/dist/src/1c-sync/finance-policy'), { OneCFinanceService } = require('/app/dist/src/1c-sync/one-c-finance.service');
if (process.env.ALLOW_LOCAL_INVENTORY_SMOKE !== 'true') throw Error('Set ALLOW_LOCAL_INVENTORY_SMOKE=true');
if (process.env.ECOSYSTEM_AUTOMATION_ENABLED === 'true' || process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED === 'true') throw Error('Use local Docker with external calls and automation disabled');
const db = new PrismaClient(), base = 'http://backend:3000/api/v1', file = '/evidence/inventory-fixture.json';
let f = { key: 'qa-inventory-' + randomUUID().slice(0,8), products: [], orders: [], users: [], profiles: [], categories: [], organizations: [] }, succeeded = false;
const keep = process.argv[2] === 'prepare';
async function api(path, token, status=200, method='GET', body) {
 const r = await fetch(base+path, { method, headers: { Authorization: 'Bearer '+token, 'Content-Type':'application/json' }, ...(body ? { body:JSON.stringify(body) } : {}) });
 const result = await r.json(); assert.equal(r.status,status,path+': '+JSON.stringify(result)); return result;
}
async function cleanup() {
 await db.$transaction(async tx => {
  // Verify ownership before removing fixture records from a persisted browser run.
  if (!/^qa-inventory-[a-f0-9]{8}$/.test(f.key)) throw Error('Invalid fixture prefix');
  for (const id of f.products) { const row=await tx.product.findUnique({where:{id}});if(row&&!row.sku.startsWith(f.key))throw Error('Refusing to remove unrelated product'); }
  for (const id of f.orders) { const row=await tx.order.findUnique({where:{id}});if(row&&!row.orderNumber.startsWith(f.key))throw Error('Refusing to remove unrelated order'); }
  for (const id of f.users) { const row=await tx.user.findUnique({where:{id}});if(row&&!row.email.startsWith(f.key))throw Error('Refusing to remove unrelated user'); }
  await tx.auditLog.deleteMany({where:{OR:[{resourceId:{in:f.orders}},{actorId:{in:f.users}}]}});
  for(const id of f.orders){await tx.syncLog.deleteMany({where:{system:'1C_KA',details:{path:['orderId'],equals:id}}});await tx.jobRun.deleteMany({where:{jobName:'1C_ORDER_EXPORT',input:{path:['orderId'],equals:id}}});}
  await tx.order.deleteMany({where:{id:{in:f.orders}}});await tx.user.deleteMany({where:{id:{in:f.users}}});await tx.crmAccessProfile.deleteMany({where:{id:{in:f.profiles},name:{startsWith:f.key}}});await tx.organization.deleteMany({where:{id:{in:f.organizations},name:{startsWith:f.key}}});
  await tx.productVariant.deleteMany({where:{productId:{in:f.products}}});await tx.product.deleteMany({where:{id:{in:f.products}}});await tx.category.deleteMany({where:{id:{in:f.categories},slug:{startsWith:f.key}}});
 });
}
(async()=>{try{
 if(process.argv[2]==='cleanup'){f=JSON.parse(fs.readFileSync(file));await cleanup();console.log('Inventory browser fixtures removed');succeeded=true;return;}
 const admin=(await api('/auth/login','',200,'POST',{email:process.env.LOCAL_ADMIN_EMAIL,password:process.env.LOCAL_ADMIN_PASSWORD})).accessToken;
 const actor=await db.user.findUniqueOrThrow({where:{email:process.env.LOCAL_ADMIN_EMAIL}});
 const password='QA-'+randomUUID(), hash=await bcrypt.hash(password,10);
 const scoped=await db.user.create({data:{email:f.key+'@local.test',password:hash,role:'MANAGER_B2B',firstName:'QA менеджер',accessProfileMode:true}});f.users.push(scoped.id);
 const customer=await db.user.create({data:{email:f.key+'-customer@local.test',password:hash,role:'CUSTOMER_B2C'}});f.users.push(customer.id);
 const profile=await db.crmAccessProfile.create({data:{name:f.key,normalizedName:f.key}});f.profiles.push(profile.id);
 const grants=[{permissionKey:'inventory.read',scope:'COMPANY',departmentIds:[]},{permissionKey:'oms.read',scope:'OWN',departmentIds:[]},{permissionKey:'customers.read',scope:'OWN',departmentIds:[]}];
 const assignment=await db.crmAccessAssignment.create({data:{userId:scoped.id,profileId:profile.id,profileVersion:1,snapshot:{name:f.key,grants}}});
 const token=(await api('/auth/login','',200,'POST',{email:scoped.email,password})).accessToken, customerToken=(await api('/auth/login','',200,'POST',{email:customer.email,password})).accessToken;
 const category=await db.category.create({data:{nameRu:f.key+' категория',slug:f.key,isActive:false}});f.categories.push(category.id);
 const product=await db.product.create({data:{nameRu:'Тестовый гель — '+f.key,sku:f.key,slug:f.key,vendorCode:f.key+'-vendor',basePrice:100,isActive:false,categories:{create:{categoryId:category.id}},variants:{create:[{name:'Прозрачный, 15 мл',sku:f.key+'-A',options:{},price:100,stock:20,reserved:9,damagedStock:1},{name:'Розовый, 15 мл',sku:f.key+'-B',options:{},price:100,stock:0,reserved:3},{name:'Молочный, 15 мл',sku:f.key+'-C',options:{},price:100,stock:6,reserved:2,damagedStock:2}]}},include:{variants:{orderBy:{sku:'asc'}}}});f.products.push(product.id);
 const digital=await db.product.create({data:{nameRu:f.key+' digital',sku:f.key+'-digital',slug:f.key+'-digital',productType:'GIFT_CARD',basePrice:100,isActive:false,variants:{create:{name:'Digital',sku:f.key+'-D',options:{},price:100,stock:999,reserved:0}}},include:{variants:true}});f.products.push(digital.id);
 const [a,b,c]=product.variants;f.variantId=a.id;f.productName=product.nameRu;
 const organization=await db.organization.create({data:{name:f.key+' SECRET_ORGANIZATION',inn:randomUUID().replace(/\D/g,'').padEnd(10,'0').slice(0,10),accountManagerId:actor.id}});f.organizations.push(organization.id);
 async function order(suffix,lines,extra={}) { const o=await db.order.create({data:{orderNumber:f.key+'-'+suffix,source:'B2B',status:'ASSEMBLING',reservationState:'ACTIVE',managerId:scoped.id,fulfillmentManaged:true,totalAmount:800,finalAmount:800,shippingAddress:{city:'Москва',address:'ул. Тестовая, 12'},buyerName:'Салон «Тестовый»',items:{create:lines.map(line=>({productName:product.nameRu,variantName:'QA',price:100,total:line.quantity*100,...line}))},...extra},include:{items:true}});f.orders.push(o.id);return o; }
 const own=await order('OWN',[{variantId:a.id,quantity:6,pickedQuantity:3,shippedQuantity:2,cancelledQuantity:1,returnedQuantity:1},{variantId:a.id,quantity:2,pickedQuantity:1}],{organizationId:organization.id,deliveryDate:new Date(Date.now()+86400000)});f.orderId=own.id;f.orderNumber=own.orderNumber;
 await db.orderExecution.create({data:{orderId:own.id,confirmedBy:actor.id,paymentTerms:'QA',deliveryTerms:'Самовывоз',snapshotHash:executionSnapshot(own)}});
 const foreign=await order('FOREIGN',[{variantId:a.id,quantity:8,pickedQuantity:5,shippedQuantity:3,cancelledQuantity:1}],{managerId:actor.id,buyerName:'SECRET_BUYER',shippingAddress:{address:'SECRET_ADDRESS'}});
 await order('SHORTAGE',[{variantId:b.id,quantity:3}],{managerId:actor.id,fulfillmentManaged:false});
 await order('EXPIRED',[{variantId:c.id,quantity:2}],{status:'NEW',fulfillmentManaged:false,reservationExpiresAt:new Date(Date.now()-60000)});
 for(const status of ['CANCELLED','REFUNDED','DELIVERED','SHIPPED'])await order(status,[{variantId:a.id,quantity:100}],{status});
 await order('LEGACY',[{variantId:a.id,quantity:100}],{reservationState:'LEGACY',fulfillmentManaged:false});
 await order('FINISHED-LINE',[{variantId:a.id,quantity:2,pickedQuantity:2,shippedQuantity:2}]);
 const path='/oms/inventory', list=(auth=admin,extra='')=>api(path+'?search='+f.key+extra,auth), detail=(auth=admin,extra='')=>api(path+'/'+a.id+extra,auth);
 const before=await db.productVariant.findMany({where:{productId:product.id},orderBy:{sku:'asc'}});
 await api(path,'',401);await api(path,customerToken,403);await api(path+'/'+a.id,customerToken,403);
 let result=await list();assert.equal(result.total,3);assert.deepEqual(result.summary,{positions:3,stock:26,reserved:14,toShip:14});
 assert.equal(result.items[0].id,a.id);assert.deepEqual([result.items[0].available,result.items[0].toShip,result.items[0].picked,result.items[0].reservationDifference],[11,9,4,0]);
 assert.equal((await list(admin,'&stock=SHORTAGE')).items[0].id,b.id);assert.equal((await list(admin,'&stock=SHORTAGE')).items[0].shortage,3);
 assert.equal((await list(admin,'&stock=EMPTY')).total,1);assert.equal((await list(admin,'&stock=AVAILABLE')).total,2);assert.equal((await list(admin,'&stock=DAMAGED')).total,2);assert.equal((await list(admin,'&stock=RESERVED')).total,3);
 assert.equal((await list(admin,'&activity=ACTIVE')).total,0);assert.equal((await list(admin,'&activity=INACTIVE')).total,3);
 assert.equal((await list(admin,'&categoryId='+category.id)).total,3);assert.equal((await list(admin,'&page=2&limit=1')).items[0].id,b.id);
 assert.equal((await api(path+'?search='+f.key.toUpperCase()+'-vendor',admin)).total,3);assert.equal((await api(path+'?search='+a.sku,admin)).total,1);
 await api(path+'/'+digital.variants[0].id,admin,404);await api(path+'/'+randomUUID(),admin,404);
 for(const query of ['page=0','page=1.5','limit=101','stock=invalid','scope=COMPANY','categoryId=bad'])await api(path+'?'+query,admin,400);
 await api(path+'/'+a.id,admin,404,'PATCH',{stock:999});
 result=await detail();assert.equal(result.total,2);assert.equal(result.orders.find(row=>row.id===own.id).remaining,5);assert.equal(result.orders.find(row=>row.id===own.id).picked,2);
 assert.equal((await detail(admin,'?limit=1&page=2')).orders.length,1);
 const mine=await list(token);assert.equal(mine.summary.toShip,7);assert.equal(mine.items[0].reserved,9);assert.equal(mine.items[0].toShip,5);assert.equal(mine.allOrdersVisible,false);
 const myDetail=await detail(token);assert.equal(myDetail.total,1);assert.equal(myDetail.orders[0].destination,'Салон «Тестовый»');assert(!JSON.stringify(myDetail).includes('SECRET_'));assert(!JSON.stringify(myDetail).includes(foreign.id));await api('/oms/orders/'+foreign.id,token,404);
 assert.equal((await api(path+'/'+c.id,token)).orders[0].reservationExpired,true);
 assert.deepEqual(await db.productVariant.findMany({where:{productId:product.id},orderBy:{sku:'asc'}}),before);
 const permission=await db.permission.findUniqueOrThrow({where:{key:'inventory.read'}});await db.userPermission.create({data:{userId:scoped.id,permissionId:permission.id,effect:'DENY'}});await api(path,token,403);await api(path+'/'+a.id,token,403);await db.userPermission.delete({where:{userId_permissionId:{userId:scoped.id,permissionId:permission.id}}});
 await db.crmAccessAssignment.update({where:{userId_profileId:{userId:scoped.id,profileId:profile.id}},data:{snapshot:{name:f.key,grants:grants.filter(g=>g.permissionKey!=='inventory.read')}}});await api(path,token,403);
 await db.crmAccessAssignment.update({where:{userId_profileId:{userId:scoped.id,profileId:profile.id}},data:{snapshot:{name:f.key,grants:grants.map(g=>g.permissionKey==='inventory.read'?{...g,scope:'OWN'}:g)}}});await api(path,token,403);
 await db.crmAccessAssignment.update({where:{userId_profileId:{userId:scoped.id,profileId:profile.id}},data:{snapshot:{name:f.key,grants}}});
 // A genuine partial dispatch/cancellation/return updates the read model immediately.
 await new OneCFinanceService(db).receive({platformOrderId:own.id,external1CId:f.key,revision:1,basisHash:settlementBasis(own),asOf:new Date().toISOString(),validUntil:new Date(Date.now()+600000).toISOString(),currency:'RUB',total:'800.00',paid:'0.00',refunded:'0.00',debt:'800.00',refundDue:'0.00',releaseAllowed:true,releaseReason:'Local QA',documents:[],requests:[]});
 const body=async(kind,quantity)=>{const o=await db.order.findUniqueOrThrow({where:{id:own.id},include:{execution:true}});return{kind,requestKey:randomUUID(),expectedVersion:o.execution.version,expectedUpdatedAt:o.updatedAt.toISOString(),lines:[{itemId:own.items[0].id,quantity}],...(kind==='SHIP'?{}:{reason:'Local QA'})}};
 await api('/oms/orders/'+own.id+'/execution',admin,201,'POST',await body('SHIP',1));let changed=(await detail()).item;assert.deepEqual([changed.stock,changed.reserved,changed.toShip,changed.picked],[19,8,8,3]);
 await api('/oms/orders/'+own.id+'/adjustments',admin,201,'POST',await body('CANCEL_REMAINDER',1));changed=(await detail()).item;assert.deepEqual([changed.stock,changed.reserved,changed.toShip],[19,7,7]);
 await api('/oms/orders/'+own.id+'/adjustments',admin,201,'POST',await body('RETURN',1));changed=(await detail()).item;assert.deepEqual([changed.stock,changed.reserved,changed.toShip],[20,7,7]);assert.equal(changed.reservationDifference,0);
 await db.productVariant.update({where:{id:a.id},data:{reserved:{increment:1}}});assert.equal((await detail()).item.reservationDifference,1);await db.productVariant.update({where:{id:a.id},data:{reserved:{decrement:1}}});
 succeeded=true;if(keep)fs.writeFileSync(file,JSON.stringify(f));
 console.log('PASS HTTP/PostgreSQL inventory: global stock, scoped orders, duplicate lines, partial dispatch/cancel/return, expired reservations, shortages and drift, search/categories/filters/pagination, digital exclusion, no read side effects, read-only endpoints, role/profile/DENY protection');
}finally{if(process.argv[2]!=='cleanup'&&(!keep||!succeeded))await cleanup();await db.$disconnect();}})().catch(e=>{console.error(e);process.exitCode=1});
