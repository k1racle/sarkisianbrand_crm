// Real local PostgreSQL + HTTP acceptance. Fixtures only; never invokes external providers.
const {PrismaClient}=require('@prisma/client'),{randomUUID}=require('node:crypto'),bcrypt=require('bcrypt'),assert=require('node:assert/strict'),fs=require('node:fs');
if(process.env.ALLOW_LOCAL_MINIMUM_STOCK_SMOKE!=='true'||process.env.ECOSYSTEM_AUTOMATION_ENABLED==='true'||process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED==='true')throw Error('Local isolated checks require external calls disabled');
const db=new PrismaClient(),base='http://backend:3000/api/v1',key='qa-minimum-'+randomUUID().slice(0,8),products=[],categories=[],users=[],groups=[],rules=[],carts=[],profiles=[],organizations=[];
let admin,actor;const all=['WEB','B2B','OZON','WILDBERRIES','YANDEX_MARKET','MEGAMARKET'];
async function api(path,token=admin,status=200,method='GET',body,headers={}){const res=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json();assert.equal(res.status,status,path+': '+JSON.stringify(json));return json;}
const config='/inventory-settings';
const quantity=(id,channel)=>db.inventoryChannelStock.findUniqueOrThrow({where:{variantId_channel:{variantId:id,channel}}});
async function check(id,channel,value,blocked){const r=await quantity(id,channel);assert.equal(r.quantity,value,channel);if(blocked!==undefined)assert.equal(r.blocked,blocked);}
async function createRule(extra){const body={name:key+' scenario',targetKind:'VARIANT',includeChildren:true,threshold:5,basis:'AVAILABLE',channels:['OZON'],autoResume:true,isEnabled:true,...extra};const r=await api(config+'/rules',admin,201,'POST',body);rules.push(r.id);return {...r,body};}
async function edit(r,patch={}){const body={...r.body,...patch,expectedVersion:r.version};return {...await api(config+'/rules/'+r.id,admin,200,'PATCH',body),body};}
async function product(suffix,cat,quantities=[10]){const p=await db.product.create({data:{sku:key+suffix,slug:key+suffix,nameRu:'QA минимальный запас '+suffix,basePrice:100,isActive:true,...(cat?{categories:{create:{categoryId:cat}}}:{}),variants:{create:quantities.map((q,i)=>({sku:key+suffix+i,name:'Вариант '+i,options:{},price:100,stock:q,isActive:true}))}},include:{variants:{orderBy:{sku:'asc'}}}});products.push(p.id);return p;}
async function cleanup(){
 const orders=await db.order.findMany({where:{OR:[{userId:{in:users}},{items:{some:{variant:{productId:{in:products}}}}}]} ,select:{id:true}}),ids=orders.map(x=>x.id);
 await db.auditLog.deleteMany({where:{OR:[{resourceId:{in:[...rules,...groups,...ids]}},{actorId:{in:users}}]}});
 await db.inventoryStockRule.deleteMany({where:{id:{in:rules},name:{startsWith:key}}});await db.inventoryStockGroup.deleteMany({where:{id:{in:groups},name:{startsWith:key}}});
 await db.order.deleteMany({where:{id:{in:ids}}});await db.cart.deleteMany({where:{sessionId:{in:carts}}});
 await db.user.deleteMany({where:{id:{in:users},email:{startsWith:key}}});await db.crmAccessProfile.deleteMany({where:{id:{in:profiles},name:{startsWith:key}}});await db.organization.deleteMany({where:{id:{in:organizations},name:{startsWith:key}}});
 await db.productVariant.deleteMany({where:{productId:{in:products}}});await db.product.deleteMany({where:{id:{in:products},sku:{startsWith:key}}});await db.category.deleteMany({where:{id:{in:categories},slug:{startsWith:key}}});
}
(async()=>{try{
 admin=(await api('/auth/login','',200,'POST',{email:process.env.LOCAL_ADMIN_EMAIL,password:process.env.LOCAL_ADMIN_PASSWORD})).accessToken;
 actor=await db.user.findUniqueOrThrow({where:{email:process.env.LOCAL_ADMIN_EMAIL}});
 assert.equal((await api(config)).canManage,true);
 const root=await db.category.create({data:{nameRu:key,slug:key,isActive:true}});categories.push(root.id);
 const child=await db.category.create({data:{nameRu:key+' child',slug:key+'-child',parentId:root.id,isActive:true}});categories.push(child.id);
 const p=await product('-A',child.id,[10,30]),other=await product('-B',null,[15]);const [a,b]=p.variants,c=other.variants[0];
 const physical=await db.productVariant.findMany({where:{productId:{in:products}},orderBy:{id:'asc'}});
 let r=await createRule({targetId:a.id,threshold:10,channels:['OZON']});await check(a.id,'OZON',0,true);await check(a.id,'WEB',10,false);await check(b.id,'OZON',30,false);
 assert.deepEqual(await db.productVariant.findMany({where:{productId:{in:products}},orderBy:{id:'asc'}}),physical,'rules must not mutate stock');
 const rev=(await quantity(a.id,'OZON')).revision;await db.productVariant.update({where:{id:a.id},data:{stock:10}});assert.equal((await quantity(a.id,'OZON')).revision,rev,'no duplicate revision for same value');
 await db.productVariant.update({where:{id:a.id},data:{stock:11}});await check(a.id,'OZON',11,false);
 await db.productVariant.update({where:{id:a.id},data:{reserved:1}});await check(a.id,'OZON',0,true);
 r=await edit(r,{basis:'PHYSICAL'});await check(a.id,'OZON',10,false);
 r=await edit(r,{basis:'AVAILABLE',autoResume:false});await check(a.id,'OZON',0,true);
 await api(config+'/rules/'+r.id+'/release',admin,409,'POST',{expectedVersion:r.version});
 await db.productVariant.update({where:{id:a.id},data:{stock:20}});await check(a.id,'OZON',0,true);
 assert.equal((await api(config+'/rules/'+r.id+'/release',admin,201,'POST',{expectedVersion:r.version})).released,1);await check(a.id,'OZON',19,false);
 const old=r;r=await edit(r,{threshold:20,autoResume:true});await api(config+'/rules/'+r.id,admin,409,'PATCH',{...old.body,expectedVersion:old.version});await check(a.id,'OZON',0,true);
 let cat=await createRule({targetKind:'CATEGORY',targetId:root.id,threshold:20,channels:['WEB','B2B']});await check(a.id,'WEB',0,true);await check(b.id,'WEB',30,false);await check(c.id,'WEB',15,false);
 cat=await edit(cat,{includeChildren:false});await check(a.id,'WEB',19,false);cat=await edit(cat,{includeChildren:true});await check(a.id,'WEB',0,true);
 await db.category.update({where:{id:child.id},data:{parentId:null}});await check(a.id,'WEB',19,false);await db.category.update({where:{id:child.id},data:{parentId:root.id}});await check(a.id,'WEB',0,true);
 const g=await api(config+'/groups',admin,201,'POST',{name:key+' favorites',productIds:[p.id,other.id],isActive:true});groups.push(g.id);
 let gr=await createRule({targetKind:'GROUP',targetId:g.id,threshold:25,channels:['WILDBERRIES']});await check(a.id,'WILDBERRIES',0,true);await check(c.id,'WILDBERRIES',0,true);await check(b.id,'WILDBERRIES',30,false);
 await api(config+'/groups/'+g.id,admin,200,'PATCH',{name:g.name,productIds:[other.id],isActive:true,expectedVersion:g.version});await check(a.id,'WILDBERRIES',19,false);await check(c.id,'WILDBERRIES',0,true);
 await api(config+'/groups/'+g.id,admin,409,'PATCH',{name:g.name,productIds:[p.id],isActive:true,expectedVersion:g.version});
 let productRule=await createRule({targetKind:'PRODUCT',targetId:p.id,threshold:40,channels:all});for(const channel of all)await check(b.id,channel,0,true);
 productRule=await edit(productRule,{isEnabled:false});await check(b.id,'WEB',30,false);await check(a.id,'WEB',0,true);await check(a.id,'OZON',0,true);
 const f=await api(config+'/channel-feed?channel=OZON&limit=100');assert.equal(f.delivery,'NOT_CONNECTED');assert.equal(f.items.find(x=>x.variantId===a.id).quantity,0);
 const revision=(await quantity(a.id,'OZON')).revision;await api(config+'/channel-feed?channel=OZON');assert.equal((await quantity(a.id,'OZON')).revision,revision);
 let pg=await api('/products/'+p.slug,'');assert.equal(pg.variants.find(x=>x.id===a.id).stock-pg.variants.find(x=>x.id===a.id).reserved,0);assert(!JSON.stringify(pg).includes('channelStocks'));
 await db.productVariant.update({where:{id:b.id},data:{stock:20}});
 let catalogue=await api('/products?search='+p.sku+'&inStock=true','');assert.equal(catalogue.pagination.total,0,'in stock filter must respect channel');
 catalogue=await api('/products?search='+p.sku+'&inStock=true&sort=popular','',200);assert.equal(catalogue.pagination.total,0);
 const cartSession=key+'-cart';carts.push(cartSession);
 await api('/cart/items','',400,'POST',{variantId:a.id,quantity:1},{'x-cart-session':cartSession});
 const basket=await db.cart.upsert({where:{sessionId:cartSession},create:{sessionId:cartSession},update:{}});await db.cartItem.create({data:{cartId:basket.id,variantId:a.id,quantity:1}});
 const cart=await api('/cart','',200,'GET',undefined,{'x-cart-session':cartSession});assert.equal(cart.items[0].variant.stock-cart.items[0].variant.reserved,0);
 await api('/orders/quote','',400,'POST',{}, {'x-cart-session':cartSession});
 const contact={firstName:'QA',email:key+'@local.test',phone:'+79990001122'};
 const rejected=await api('/orders/checkout','',400,'POST',{acceptedTerms:true,contact,deliveryMethod:'COURIER',shippingAddress:{city:'Москва',address:'Тест 1'}},{'x-cart-session':cartSession,'x-idempotency-key':randomUUID()});assert.match(rejected.message,/Недостаточно товара/);
 const password='QA-'+randomUUID(),hash=await bcrypt.hash(password,10);
 const customer=await db.user.create({data:{email:key+'-buyer@local.test',password:hash,firstName:'QA',role:'CUSTOMER_B2B'}});users.push(customer.id);
 const organization=await db.organization.create({data:{name:key+' company'}});organizations.push(organization.id);await db.organizationMember.create({data:{organizationId:organization.id,userId:customer.id,canOrder:true,canSeeFinance:true,role:'OWNER'}});
 const buyer=(await api('/auth/login','',200,'POST',{email:customer.email,password})).accessToken;
 const b2b=await api('/b2b/catalog',buyer);assert.equal(b2b.find(x=>x.id===p.id).variants.find(x=>x.id===a.id).available,0);
 await api('/b2b/orders',buyer,400,'POST',{items:[{variantId:a.id,quantity:1}]});
 await api(config,buyer,403);await api(config+'/rules',buyer,403,'POST',r.body);
 const employee=await db.user.create({data:{email:key+'-read@local.test',password:hash,role:'WAREHOUSE',accessProfileMode:true}});users.push(employee.id);
 const profile=await db.crmAccessProfile.create({data:{name:key,normalizedName:key}});profiles.push(profile.id);const grants=[{permissionKey:'inventory.read',scope:'COMPANY',departmentIds:[]}];
 await db.crmAccessAssignment.create({data:{userId:employee.id,profileId:profile.id,profileVersion:1,snapshot:{name:key,grants}}});
 const read=(await api('/auth/login','',200,'POST',{email:employee.email,password})).accessToken;assert.equal((await api(config,read)).canManage,false);await api(config+'/rules',read,403,'POST',r.body);
 const permission=await db.permission.findUniqueOrThrow({where:{key:'inventory.read'}});await db.userPermission.create({data:{userId:employee.id,permissionId:permission.id,effect:'DENY'}});await api(config,read,403);await db.userPermission.deleteMany({where:{userId:employee.id}});
 await db.crmAccessAssignment.updateMany({where:{userId:employee.id},data:{snapshot:{name:key,grants:[{...grants[0],scope:'OWN'},{permissionKey:'inventory.manage',scope:'OWN',departmentIds:[]}]}}});await api(config,read,403);await api(config+'/rules',read,403,'POST',r.body);
 for(const patch of [{threshold:-1},{threshold:1.5},{threshold:'2'},{channels:[]},{channels:['ALIEN']},{channels:['WEB','WEB']},{autoResume:'false'},{targetId:randomUUID()}])await api(config+'/rules',admin,400,'POST',{...r.body,...patch});
 // Same rules protect concurrent checkout after the first order reaches the threshold.
 await db.productVariant.update({where:{id:a.id},data:{stock:21,reserved:0}});
 const responses=await Promise.all([1,2].map(()=>fetch(base+'/b2b/orders',{method:'POST',headers:{Authorization:'Bearer '+buyer,'Content-Type':'application/json'},body:JSON.stringify({items:[{variantId:a.id,quantity:1}]})})));
 assert.deepEqual(responses.map(x=>x.status).sort(),[201,400]);assert.equal((await db.productVariant.findUniqueOrThrow({where:{id:a.id}})).reserved,1);await check(a.id,'B2B',0,true);
 const created=(await api('/b2b/orders',buyer)).find(x=>x.items.some(i=>i.variantId===a.id));assert(created,'existing order stays visible');
 await api('/b2b/orders/'+created.id+'/repeat',buyer,400,'POST',{});
 // Above threshold a WEB order is accepted and its reservation closes the next order.
 await db.productVariant.update({where:{id:a.id},data:{stock:22}});
 await api('/orders/checkout','',201,'POST',{acceptedTerms:true,contact,deliveryMethod:'COURIER',shippingAddress:{city:'Москва',address:'Тест 1'}},{'x-cart-session':cartSession,'x-idempotency-key':randomUUID()});await check(a.id,'WEB',0,true);
 const result=await api(config),detail=await api('/oms/inventory/'+a.id),list=await api('/oms/inventory?search='+key);
 fs.writeFileSync('/evidence/minimum-stock-acceptance.json',JSON.stringify({rules:result.rules.filter(x=>rules.includes(x.id)),groups:result.groups.filter(x=>groups.includes(x.id)),canManage:true,externalDelivery:'NOT_CONNECTED',detail,list,variantId:a.id}));
 await api(config+'/rules/'+cat.id,admin,200,'DELETE',{expectedVersion:cat.version});await check(a.id,'WEB',20,false);await check(a.id,'OZON',0,true);
 await db.product.update({where:{id:p.id},data:{isActive:false}});await check(a.id,'WEB',0,false);await db.product.update({where:{id:p.id},data:{isActive:true}});await check(a.id,'WEB',20,false);
 console.log('PASS minimum stock: SKU/product/category descendants/groups, inclusive boundary, free/physical stock, overlapping channels, auto/manual resume, version conflicts, idempotent revisions, membership/tree updates, real catalog/cart/quote/WEB+B2B checkout and concurrent reservations, feed pending, access profiles/DENY, unchanged physical inventory and retained orders.');
}finally{await cleanup();await db.$disconnect();}})().catch(e=>{console.error(e.message||e);process.exitCode=1;});
