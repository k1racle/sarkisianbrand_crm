// Real Nest/DTO/permissions/service + local PostgreSQL. Synthetic JWT identities;
// all changes rolled back, no provider, bank, email or recurring worker calls.
require('dotenv').config();require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common'),{Reflector}=require('@nestjs/core'),{PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service'),{RolesGuard}=require('../dist/src/common/guards/roles.guard'),{JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard');
const {PaymentCalendarController}=require('../dist/src/payment-calendar/payment-calendar.controller'),{PaymentCalendarService}=require('../dist/src/payment-calendar/payment-calendar.service');
const {companyToday}=require('../dist/src/payment-calendar/payment-calendar.policy');
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname),'Local database only');
 const db=new PrismaClient(),rollback=new Error('ROLLBACK_PAYMENT_CALENDAR');let app,createdId,checks=0;
 const fields={title:'Интернет',vendor:'Провайдер',category:'INTERNET',notes:'Тест',amountCents:123456,startDate:'2024-01-31',endDate:null,frequency:'MONTH',interval:1,visibility:'COMPANY'};
 try{await db.$transaction(async tx=>{
  const deptA=await tx.crmDepartment.create({data:{name:'Finance contract A'}}),deptB=await tx.crmDepartment.create({data:{name:'Finance contract B'}});
  const make=(role,departmentId)=>tx.user.create({data:{role,departmentId,email:`calendar-${randomUUID()}@example.invalid`,password:'not-a-login'}});
  const admin=await make('ADMIN'),executive=await make('EXECUTIVE'),a=await make('MANAGER_SALES',deptA.id),b=await make('MANAGER_SALES',deptA.id),other=await make('MANAGER_SALES',deptB.id),customer=await make('CUSTOMER_B2C');
  const permissions=await tx.permission.findMany({where:{resource:'payment_calendar'}});
  for(const user of [a,b,other])for(const permission of permissions.filter(p=>p.action!=='settle'||user===a))await tx.userPermission.create({data:{userId:user.id,permissionId:permission.id,effect:'ALLOW'}});
  const actors=new Map([admin,executive,a,b,other,customer].map(user=>[user.id,user]));
  const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
  const module=await Test.createTestingModule({controllers:[PaymentCalendarController],providers:[PaymentCalendarService,Reflector,RolesGuard,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),user=actors.get(req.headers.authorization?.replace('Bearer ',''));if(!user)throw new UnauthorizedException();req.user={sub:user.id,role:user.role};return true;}}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  const call=async(path='',status=200,{method='GET',body,actor=admin}={})=>{const res=await fetch(base+'/api/v1/crm/payment-calendar'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor.id}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json();assert.equal(res.status,status,`${method} ${path}: ${JSON.stringify(json)}`);if(status<300)assert.equal(res.headers.get('cache-control'),'private, no-store');checks++;return json;};
  await call('?month=2024-02',401,{actor:null});await call('?month=2024-02',403,{actor:customer});await call('?month=2024-13',400);
  await call('',400,{method:'POST',body:{...fields,ownerId:a.id,requestKey:randomUUID()}});await call('',400,{method:'POST',body:{...fields,startDate:'2024-02-31',requestKey:randomUUID()}});
  const requestKey=randomUUID(),plan=await call('',201,{method:'POST',body:{...fields,requestKey}});createdId=plan.id;
  assert.equal('requestKey' in plan,false);assert.equal('requestHash' in plan,false);assert.equal(plan.amountCents,123456);
  assert.equal((await call('',201,{method:'POST',body:{...fields,requestKey}})).id,plan.id);
  await call('',409,{method:'POST',body:{...fields,amountCents:555,requestKey}});
  const calendar=await call('?month=2024-02'),item=calendar.items.find(row=>row.planId===plan.id);assert.equal(item.dueDate,'2024-02-29');assert.equal(item.status,'OVERDUE');
  const mark={planVersion:1,version:0,dueDate:item.dueDate,paid:true,paidOn:'2024-02-28',reason:'Оплачено вручную',requestKey:randomUUID()};
  await call('/'+plan.id+'/settle',403,{method:'POST',actor:executive,body:mark});await call('/'+plan.id,403,{method:'PATCH',actor:executive,body:{...fields,version:1}});
  await call('/'+plan.id+'/settle',400,{method:'POST',body:{...mark,paid:'false'}});
  await call('/'+plan.id+'/settle',400,{method:'POST',body:{...mark,paidOn:'2100-12-31'}});
  await call('/'+plan.id+'/settle',400,{method:'POST',body:{...mark,dueDate:'2024-02-27'}});
  const paid=await call('/'+plan.id+'/settle',201,{method:'POST',body:mark});assert.equal(paid.version,1);await call('/'+plan.id+'/settle',201,{method:'POST',body:mark});
  await call('/'+plan.id+'/settle',409,{method:'POST',body:{...mark,reason:'another payload'}});
  await call('/'+plan.id,400,{method:'PATCH',body:{...fields,startDate:'2024-01-30',version:1}});
  await call('/'+plan.id,200,{method:'PATCH',body:{...fields,title:'Новый тариф',amountCents:200000,version:1}});
  const history=(await call('?month=2024-02')).items.find(row=>row.planId===plan.id);assert.equal(history.title,fields.title);assert.equal(history.amountCents,123456);assert.equal(history.paidOn,mark.paidOn);
  const future=(await call('?month=2024-03')).items.find(row=>row.planId===plan.id);assert.equal(future.title,'Новый тариф');assert.equal(future.amountCents,200000);assert.equal(future.dueDate,'2024-03-31');
  await call('/'+plan.id,409,{method:'PATCH',body:{...fields,version:1}});
  const undo={...mark,planVersion:2,version:1,paid:false,paidOn:null,reason:'',requestKey:randomUUID()};await call('/'+plan.id+'/settle',400,{method:'POST',body:undo});
  await call('/'+plan.id+'/settle',201,{method:'POST',body:{...undo,reason:'Ошибочная отметка'}});
  assert.equal((await call('?month=2024-02')).items.find(row=>row.planId===plan.id).amountCents,200000);
  const department=await call('',201,{method:'POST',actor:a,body:{...fields,visibility:'DEPARTMENT',requestKey:randomUUID()}});
  const personal=await call('',201,{method:'POST',actor:a,body:{...fields,visibility:'PERSONAL',requestKey:randomUUID()}});
  await call('/'+department.id,200,{actor:b});await call('/'+personal.id,404,{actor:b});await call('/'+department.id,404,{actor:other});await call('/'+department.id,200,{actor:executive});
  await call('/'+department.id+'/settle',403,{method:'POST',actor:b,body:{...mark,requestKey:randomUUID()}});
  await call('/'+department.id,404,{method:'PATCH',actor:other,body:{...fields,visibility:'DEPARTMENT',version:1}});
  await call('',403,{method:'POST',actor:a,body:{...fields,requestKey:randomUUID()}});
  const foreignCalendar=await call('?month=2024-02',200,{actor:other});assert.equal(foreignCalendar.items.length,0);assert.equal(foreignCalendar.plans.length,0);assert.equal(foreignCalendar.totals.plannedCents,0);
  await tx.user.update({where:{id:a.id},data:{departmentId:deptB.id}});await call('/'+department.id,404,{actor:a});await call('/'+personal.id,200,{actor:a});
  await tx.user.update({where:{id:b.id},data:{isActive:false}});await call('/'+department.id,403,{actor:b});
  const read=permissions.find(p=>p.action==='read');await tx.userPermission.create({data:{userId:admin.id,permissionId:read.id,effect:'DENY'}});await call('?month=2024-02',403);
  const logs=await tx.auditLog.findMany({where:{resource:'crm.payment_plan',resourceId:plan.id}});assert.equal(logs.filter(row=>row.action==='PAYMENT_MARKED').length,1);assert.equal(logs.filter(row=>row.action==='PAYMENT_CORRECTED').length,1);
  await app.close();app=null;throw rollback;
 },{timeout:60000});}catch(e){if(e!==rollback)throw e;}finally{if(app)await app.close();if(createdId)assert.equal(await db.crmPaymentPlan.count({where:{id:createdId}}),0);await db.$disconnect();}
 // Audit failure must abort a real transaction containing the payment marker.
 const db2=new PrismaClient();let failedId;
 try{await assert.rejects(()=>db2.$transaction(async tx=>{
  const owner=await tx.user.create({data:{email:`calendar-audit-${randomUUID()}@example.invalid`,password:'not-a-login',role:'ADMIN'}});
  const proxy=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)}),service=new PaymentCalendarService(proxy);
  const plan=await service.create(owner.id,{...fields,requestKey:randomUUID()});failedId=plan.id;
  const broken=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(new Proxy(tx,{get:(inner,prop)=>prop==='auditLog'?{create:async()=>{throw new Error('AUDIT_UNAVAILABLE');}}:Reflect.get(inner,prop)})):Reflect.get(target,key)});
  await new PaymentCalendarService(broken).settle(owner.id,plan.id,{planVersion:1,version:0,dueDate:'2024-02-29',paid:true,paidOn:companyToday(),reason:'',requestKey:randomUUID()});
 },{timeout:15000}),/AUDIT_UNAVAILABLE/);assert.equal(await db2.crmPlannedPayment.count({where:{planId:failedId}}),0);}finally{await db2.$disconnect();}
 console.log(`Payment calendar HTTP/SQL PASS: ${checks} assertions, recurrence, snapshots, idempotency, versions, separate settle permission, scopes/transfers/DENY, atomic audit; all synthetic data rolled back.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
