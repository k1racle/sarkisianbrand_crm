// Actual Nest validation + authorization boundaries + concurrent PostgreSQL
// transactions. Uniquely identified local fixtures are removed in finally.
require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common'),{PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service'),{JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard'),{OneCSyncService}=require('../dist/src/1c-sync/1c-sync.service');
const {B2BController}=require('../dist/src/b2b/b2b.controller'),{B2BService}=require('../dist/src/b2b/b2b.service'),{SalonBookingService}=require('../dist/src/b2b/salon-booking.service');
async function main(){
 const host=new URL(process.env.DATABASE_URL).hostname;
 assert.ok(['localhost','127.0.0.1'].includes(host)||(host==='postgres'&&process.env.SALON_HISTORY_TEST_ALLOW_DOCKER==='1'),'Local database only');
 const db=new PrismaClient(),orgIds=[],userIds=[];let app;
 try{
  const f=await db.$transaction(async tx=>{
   const organization=await tx.organization.create({data:{name:'Booking history '+randomUUID(),status:'ACTIVE'}}),other=await tx.organization.create({data:{name:'Other booking history '+randomUUID(),status:'ACTIVE'}});
   const make=(firstName)=>tx.user.create({data:{email:`salon-history-${randomUUID()}@example.invalid`,password:'not-a-login',role:'CUSTOMER_B2B',firstName}});
   const owner=await make('Владелец'),employee=await make('Администратор'),outsider=await make('Другая компания');
   const master=await tx.organizationMember.create({data:{organizationId:organization.id,userId:owner.id,role:'OWNER',canSeeFinance:true}});
   await tx.organizationMember.create({data:{organizationId:organization.id,userId:employee.id,role:'EMPLOYEE',canSeeFinance:false}});await tx.organizationMember.create({data:{organizationId:other.id,userId:outsider.id,role:'OWNER'}});
   const client=await tx.b2BClient.create({data:{organizationId:organization.id,firstName:'Клиент',phone:'79000000000'}}),service=await tx.b2BService.create({data:{organizationId:organization.id,name:'Маникюр',duration:60,price:'1500.25'}});
   return{organization,other,owner,employee,outsider,master,client,service};
  });orgIds.push(f.organization.id,f.other.id);userIds.push(f.owner.id,f.employee.id,f.outsider.id);
  const actors=new Map([f.owner,f.employee,f.outsider].map(actor=>[`Bearer history-${actor.id}`,actor]));
  const module=await Test.createTestingModule({controllers:[B2BController],providers:[B2BService,SalonBookingService,{provide:PrismaService,useValue:db},{provide:OneCSyncService,useValue:{}}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),actor=actors.get(req.headers.authorization);if(!actor)throw new UnauthorizedException();req.user={sub:actor.id,role:actor.role};return true;}}).compile();
  app=module.createNestApplication({logger:['error']});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function request(path,{method='GET',body,actor=f.owner}={}){const response=await fetch(base+'/api/v1/b2b'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer history-${actor.id}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};}
  const day=new Date(Date.now()+86400000).toISOString().slice(0,10),created=await request('/bookings',{method:'POST',body:{clientId:f.client.id,serviceId:f.service.id,masterMemberId:f.master.id,startTime:`${day}T09:00:00.000Z`}});assert.equal(created.status,201,JSON.stringify(created.data));const path='/bookings/'+created.data.id;assert.equal(created.data.version,1);
  assert.equal((await request(path+'/history',{actor:null})).status,401);assert.equal((await request(path+'/history',{actor:f.outsider})).status,404);assert.equal((await request(path,{actor:f.outsider})).status,404);assert.equal((await request(path,{method:'PATCH',body:{version:1,notes:'Forbidden'},actor:f.outsider})).status,404);
  assert.equal((await request(path,{method:'PATCH',body:{status:'CONFIRMED'}})).status,400);assert.equal((await request(path,{method:'PATCH',body:{version:0,status:'CONFIRMED'}})).status,400);
  const edits=await Promise.all([request(path,{method:'PATCH',body:{version:1,startTime:`${day}T12:00:00.000Z`}}),request(path,{method:'PATCH',body:{version:1,startTime:`${day}T13:00:00.000Z`},actor:f.employee})]);assert.deepEqual(edits.map(item=>item.status).sort(),[200,409]);assert.equal(edits.find(item=>item.status===409).data.code,'BOOKING_VERSION_CONFLICT');
  const current=await request(path);assert.equal(current.data.version,2);const history=await request(path+'/history');assert.equal(history.data.length,2);assert.equal(history.data[0].action,'MOVED');assert.equal(history.data[0].version,2);assert.equal(history.data[1].actorId,f.owner.id);assert.equal(history.data[1].actorLabel,'Владелец');assert.equal(history.data[1].after.priceSnapshot,'1500.25');assert.equal(JSON.stringify(history.data).includes('79000000000'),false);
  const completed=await Promise.all([request(path,{method:'PATCH',body:{version:2,status:'COMPLETED'}}),request(path,{method:'PATCH',body:{version:2,status:'COMPLETED'},actor:f.employee})]);assert.deepEqual(completed.map(item=>item.status).sort(),[200,409]);
  const totals=await db.b2BClient.findUniqueOrThrow({where:{id:f.client.id}});assert.equal(totals.totalVisits,1);assert.equal(totals.totalSpent.toFixed(2),'1500.25');
  const noop=await request(path,{method:'PATCH',body:{version:3,status:'COMPLETED'}});assert.equal(noop.status,200);assert.equal(noop.data.version,3);assert.equal((await request(path+'/history')).data.length,3);
  const redacted=await request(path+'/history',{actor:f.employee});assert.equal(redacted.status,200);assert.ok(redacted.data.every(row=>row.after.priceSnapshot===null&&(!row.before||row.before.priceSnapshot===null)));assert.equal((await request(path,{actor:f.employee})).data.priceSnapshot,null);
  assert.equal((await request(path,{method:'PATCH',body:{version:1,notes:'Stale'}})).status,409);
 }finally{
  if(app)await app.close();await db.$transaction(async tx=>{await tx.b2BBooking.deleteMany({where:{organizationId:{in:orgIds}}});await tx.b2BClient.deleteMany({where:{organizationId:{in:orgIds}}});await tx.b2BService.deleteMany({where:{organizationId:{in:orgIds}}});await tx.organizationMember.deleteMany({where:{organizationId:{in:orgIds}}});await tx.organization.deleteMany({where:{id:{in:orgIds}}});await tx.user.deleteMany({where:{id:{in:userIds}}});});assert.equal(await db.salonBookingEvent.count({where:{organizationId:{in:orgIds}}}),0);await db.$disconnect();
 }
 console.log('PASS salon booking HTTP: required optimistic version, concurrent move/completion conflicts, one client total update, actor/time/before/after history, no-op stability, organization isolation, finance redaction; all fixtures removed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
