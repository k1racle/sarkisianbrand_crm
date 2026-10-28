// Real Nest validation/authorization and PostgreSQL, isolated transaction rolled back.
require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common'),{Reflector}=require('@nestjs/core'),{PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service'),{JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard'),{RolesGuard}=require('../dist/src/common/guards/roles.guard');
const {MeetingsController}=require('../dist/src/meetings/meetings.controller'),{MeetingsService}=require('../dist/src/meetings/meetings.service');
const {MeetingCalendarController,MeetingCalendarFeedController}=require('../dist/src/meetings/meeting-calendar.controller'),{MeetingCalendarService}=require('../dist/src/meetings/meeting-calendar.service');
const {StaffNotificationsController}=require('../dist/src/staff-notifications/staff-notifications.controller'),{StaffNotificationsService}=require('../dist/src/staff-notifications/staff-notifications.service');
async function main(){
 const host=new URL(process.env.DATABASE_URL).hostname;
 assert.ok(['localhost','127.0.0.1'].includes(host)||(host==='postgres'&&process.env.CRM_CALENDAR_TEST_ALLOW_DOCKER==='1'),'Local database only');
 const db=new PrismaClient(),rollback=new Error('ROLLBACK_CALENDAR');let app,eventId;
 try{await db.$transaction(async tx=>{
  const dept=await tx.crmDepartment.create({data:{name:'Calendar contract '+randomUUID()}});
  const make=(role='MANAGER_SALES',sameDepartment=true)=>tx.user.create({data:{role,email:`calendar-${randomUUID()}@example.invalid`,password:'not-a-login',firstName:'Тест',lastName:randomUUID().slice(0,5),departmentId:sameDepartment?dept.id:null}});
  const owner=await make(),member=await make(),peer=await make(),outsider=await make('MANAGER_SALES',false),customer=await make('CUSTOMER_B2C');
  const actors=new Map([owner,member,peer,outsider,customer].map(user=>[`Bearer contract-${user.id}`,user]));
  const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
  const module=await Test.createTestingModule({controllers:[MeetingCalendarController,MeetingsController,MeetingCalendarFeedController,StaffNotificationsController],providers:[MeetingsService,MeetingCalendarService,StaffNotificationsService,RolesGuard,Reflector,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),actor=actors.get(req.headers.authorization);if(!actor)throw new UnauthorizedException();req.user={sub:actor.id,role:actor.role};return true;}}).compile();
  app=module.createNestApplication({logger:['error']});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function call(path,status=200,{method='GET',body,actor=owner}={}){
   const res=await fetch(`${base}/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer contract-${actor.id}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const text=await res.text();assert.equal(res.status,status,`${method} ${path}: ${text}`);
   return res.headers.get('content-type')?.startsWith('text/calendar')?text:JSON.parse(text);
  }
  const startsAt=new Date(Date.now()+2*86400000),dto={title:'Календарь: проверка',agenda:'План работы',kind:'MEETING',location:'Переговорная 2',meetingUrl:'https://example.test/room',reminderMinutes:30,startsAt:startsAt.toISOString(),endsAt:new Date(+startsAt+3600000).toISOString(),timezone:'Europe/Moscow',memberIds:[member.id,peer.id],requestKey:randomUUID()};
  await call('/crm/meetings',401,{method:'POST',body:dto,actor:null});await call('/crm/meetings',403,{method:'POST',body:dto,actor:customer});
  await call('/crm/meetings',400,{method:'POST',body:{...dto,meetingUrl:'javascript:alert(1)'}});
  await call('/crm/meetings',400,{method:'POST',body:{...dto,location:'',meetingUrl:''}});
  const row=await call('/crm/meetings',201,{method:'POST',body:dto});eventId=row.id;const path='/crm/meetings/'+row.id;
  assert.equal((await call('/crm/meetings',201,{method:'POST',body:dto})).id,row.id);
  assert.equal(await tx.crmNotificationEvent.count({where:{meetingId:row.id,kind:'MEETING_INVITED'}}),2);
  assert.equal(await tx.crmNotificationEvent.count({where:{meetingId:row.id,kind:'MEETING_REMINDER'}}),3);
  await call(path,404,{actor:outsider});await call(path+'/respond',404,{method:'POST',body:{version:1,response:'ACCEPTED'},actor:outsider});
  await call(path+'/respond',400,{method:'POST',body:{version:1,response:'DECLINED',reason:' '},actor:member});
  const write=await tx.permission.findUniqueOrThrow({where:{key:'meetings.write'}});await tx.userPermission.create({data:{userId:member.id,permissionId:write.id,effect:'DENY'}});
  await call('/crm/meetings',403,{method:'POST',body:{...dto,requestKey:randomUUID()},actor:member});
  const accepted=await call(path+'/respond',201,{method:'POST',body:{version:1,response:'ACCEPTED'},actor:member});assert.equal(accepted.myResponse,'ACCEPTED');
  await call(path+'/respond',201,{method:'POST',body:{version:1,response:'ACCEPTED'},actor:member});
  assert.equal(await tx.crmNotificationEvent.count({where:{meetingId:row.id,kind:'MEETING_ACCEPTED'}}),1);
  await call(path+'/respond',201,{method:'POST',body:{version:1,response:'DECLINED',reason:'Буду в командировке'},actor:peer});
  const details=await call(path);assert.equal(details.responses.accepted,1);assert.equal(details.responses.declined,1);assert.equal(details.members.find(m=>m.id===peer.id).declineReason,'Буду в командировке');
  assert.equal((await call(path,200,{actor:member})).members.find(m=>m.id===peer.id).declineReason,'');
  const notifications=await call('/staff-notifications?category=CALENDAR',200,{actor:member});assert.ok(notifications.items.some(n=>n.url===`/crm/meetings?meeting=${row.id}`));
  const {requestKey,...fields}=dto;const moved=await call(path,200,{method:'PATCH',body:{...fields,location:'Переговорная 3',version:1}});assert.equal(moved.responses.pending,2);
  await call(path+'/respond',409,{method:'POST',body:{version:1,response:'ACCEPTED'},actor:member});
  await call(path+'/respond',201,{method:'POST',body:{version:2,response:'ACCEPTED'},actor:member});
  const {enabled}=await call('/crm/meetings/calendar-subscription',200,{actor:member});assert.equal(enabled,false);
  const subscription=await call('/crm/meetings/calendar-subscription',201,{method:'POST',actor:member});
  const feed=await call(subscription.path,200,{actor:null});assert.ok(feed.includes(`UID:${row.id}@`));assert.ok(feed.includes('Переговорная 3'));assert.ok(!feed.includes('Буду в командировке'));
  const status=await call('/crm/meetings/calendar-subscription',200,{actor:member});assert.equal(status.enabled,true);assert.equal('tokenHash' in status,false);assert.equal('path' in status,false);
  const replacement=await call('/crm/meetings/calendar-subscription',201,{method:'POST',actor:member});await call(subscription.path,404,{actor:null});
  await call(path+'/cancel',201,{method:'POST',body:{version:2,reason:'Изменились планы'}});
  assert.ok((await call(replacement.path,200,{actor:null})).includes('STATUS:CANCELLED'));
  assert.ok((await call(path+'/calendar.ics')).includes('STATUS:CANCELLED'));
  assert.equal(await tx.crmNotificationEvent.count({where:{meetingId:row.id,kind:'MEETING_REMINDER',occurredAt:{gt:new Date()}}}),0);
  const read=await tx.permission.findUniqueOrThrow({where:{key:'meetings.read'}});await tx.userPermission.create({data:{userId:member.id,permissionId:read.id,effect:'DENY'}});await call(replacement.path,404,{actor:null});assert.equal((await call('/staff-notifications?category=CALENDAR',200,{actor:member})).items.length,0);
  await tx.userPermission.deleteMany({where:{userId:member.id,permissionId:read.id}});
  await call('/crm/meetings/calendar-subscription',200,{method:'DELETE',actor:member});await call(replacement.path,404,{actor:null});
  await app.close();app=null;throw rollback;
 },{timeout:60000});}catch(e){if(e!==rollback)throw e;}finally{if(app)await app.close();if(eventId)assert.equal(await db.crmMeeting.count({where:{id:eventId}}),0);await db.$disconnect();}
 console.log('PASS calendar HTTP: invites, RSVP with reason, read-only invitees, privacy, edit/reset, reminder replacement, notifications, .ics, token rotation/revocation, current permissions; all fixtures rolled back.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
