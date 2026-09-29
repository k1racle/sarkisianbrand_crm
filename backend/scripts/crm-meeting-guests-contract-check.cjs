// Real Nest controllers/DTO/role guard/services + local PostgreSQL. Synthetic JWT identity only.
// Every test record, capability hash, counter and audit event is rolled back. No emails/media calls.
require('dotenv').config();require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common');
const {Reflector}=require('@nestjs/core'),{PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service');
const {MeetingsController}=require('../dist/src/meetings/meetings.controller');
const {MeetingsService}=require('../dist/src/meetings/meetings.service');
const {MeetingGuestsService}=require('../dist/src/meetings/meeting-guests.service');
const {MeetingGuestHostController,MeetingGuestPublicController}=require('../dist/src/meetings/meeting-guests.controller');
const {guestSecret,guestDigest}=require('../dist/src/meetings/meeting-guest-policy');
const {RolesGuard}=require('../dist/src/common/guards/roles.guard');
const {JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard');
const {AuditInterceptor}=require('../dist/src/audit/audit.interceptor');
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname),'Local database only');
 const db=new PrismaClient(),rollback=new Error('ROLLBACK_GUEST_CONTRACT');let app,createdId;const genericAudit=[];
 try{await db.$transaction(async tx=>{
  const make=role=>tx.user.create({data:{role,email:`guest-contract-${randomUUID()}@example.invalid`,password:'not-a-login'}});
  const owner=await make('ADMIN'),member=await make('MANAGER_SALES'),outsider=await make('MANAGER_SALES'),executive=await make('EXECUTIVE'),customer=await make('CUSTOMER_B2C');
  const actors=new Map([owner,member,outsider,executive,customer].map(user=>[`Bearer contract-${user.id}`,user]));
  const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
  const module=await Test.createTestingModule({controllers:[MeetingsController,MeetingGuestHostController,MeetingGuestPublicController],providers:[MeetingsService,MeetingGuestsService,RolesGuard,Reflector,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),actor=actors.get(req.headers.authorization);if(!actor)throw new UnauthorizedException();req.user={sub:actor.id,role:actor.role};return true;}}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));
  app.useGlobalInterceptors(new AuditInterceptor({write:async value=>genericAudit.push(value)}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();
  const call=async(path,status=200,{method='GET',body,actor=owner}={})=>{
   const res=await fetch(`${base}/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:typeof actor==='string'?actor:`Bearer contract-${actor.id}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json();
   assert.equal(res.status,status,`${method} ${path}: ${JSON.stringify(json)}`);
   if(status<300&&(method==='GET'||path.includes('/invitations')||path.includes('/guests/')||path.startsWith('/meeting-guests/')))assert.equal(res.headers.get('cache-control'),'private, no-store');
   if(path.startsWith('/meeting-guests/')&&status<300)assert.equal(res.headers.get('referrer-policy'),'no-referrer');return json;
  };
  const fields={title:'Гостевая тестовая встреча',agenda:'PRIVATE AGENDA',kind:'INTERVIEW',startsAt:new Date(Date.now()+10*60000).toISOString(),endsAt:new Date(Date.now()+70*60000).toISOString(),timezone:'Europe/Moscow',memberIds:[member.id]};
  const row=await call('/crm/meetings',201,{method:'POST',body:{...fields,requestKey:randomUUID()}});createdId=row.id;
  const host='/crm/meetings/'+row.id;
  const invite=async(label='Кандидат',version=1)=>call(host+'/invitations',201,{method:'POST',body:{label,version,requestKey:randomUUID()}});
  const join=async(issued,overrides={},status=201)=>call('/meeting-guests/join',status,{actor:null,method:'POST',body:{invitationToken:issued.invitationToken,pin:issued.pin,displayName:'Гость <script>',clientKey:guestSecret(),...overrides}});
  const poll=async(ticket,status=201)=>call('/meeting-guests/status',status,{actor:null,method:'POST',body:{ticket}});
  await call(host+'/invitations',401,{actor:null});await call(host+'/invitations',403,{actor:customer});await call(host+'/invitations',404,{actor:outsider});
  await call(host+'/invitations',403,{actor:member});await call(host+'/invitations',403,{actor:executive});
  await call(host+'/invitations',400,{method:'POST',body:{label:' ',version:1,requestKey:randomUUID()}});
  await call(host+'/invitations',400,{method:'POST',body:{label:'Гость',version:1,requestKey:randomUUID(),organizerId:outsider.id}});
  await call('/meeting-guests/join',400,{method:'POST',actor:null,body:{invitationToken:guestSecret(),pin:'1234',displayName:'Гость',clientKey:guestSecret()}});
  const issued=await invite(),key=guestSecret();assert.match(issued.pin,/^\d{8}$/);assert.match(issued.invitationToken,/^[A-Za-z0-9_-]{43}$/);
  const stored=await tx.crmMeetingInvitation.findUniqueOrThrow({where:{id:issued.id}});
  assert.equal(stored.tokenHash,guestDigest(issued.invitationToken));assert.notEqual(stored.pinHash,issued.pin);assert.ok(await require('bcrypt').compare(issued.pin,stored.pinHash));
  await call(host+'/invitations',409,{method:'POST',body:{label:'Кандидат',version:1,requestKey:stored.requestKey}});
  const wrongPin=issued.pin==='00000000'?'11111111':'00000000';await join(issued,{pin:wrongPin},401);
  assert.equal((await tx.crmMeetingGuestRate.findUniqueOrThrow({where:{key:'join-invite:'+issued.id}})).hits,1,'Failed PIN attempts persist outside business transaction');
  const resetAt=(await tx.crmMeetingGuestRate.findUniqueOrThrow({where:{key:'join-invite:'+issued.id}})).resetAt;
  assert.ok(+resetAt-Date.now()>590000 && +resetAt-Date.now()<=600000,'UTC 10-minute deadline regardless of database timezone');
  const waiting=await join(issued,{clientKey:key});assert.equal(waiting.state,'WAITING');assert.equal(waiting.videoAvailable,false);
  assert.equal(waiting.meeting.title,fields.title);assert.equal('agenda' in waiting.meeting,false);assert.equal('id' in waiting.meeting,false);assert.equal('members' in waiting.meeting,false);
  await call(host+'/invitations',401,{actor:'Bearer '+waiting.ticket});
  await join(issued,{},401); // Same link on another browser cannot consume the same slot.
  const resumed=await join(issued,{clientKey:key});assert.notEqual(resumed.ticket,waiting.ticket);await poll(waiting.ticket,401);
  assert.equal(await tx.crmMeetingGuest.count({where:{invitationId:issued.id}}),1);
  const list=await call(host+'/invitations'),guest=list.items.find(v=>v.id===issued.id).guest;
  assert.equal(list.reserved,1);assert.equal(list.employeeCount,2);
  for(const secret of [issued.pin,issued.invitationToken,stored.pinHash,resumed.ticket,key])assert.ok(!JSON.stringify(list).includes(secret));
  const decision=host+'/guests/'+guest.id+'/decision';
  await call(decision,403,{method:'POST',actor:member,body:{version:1,action:'ADMIT'}});
  await call(decision,400,{method:'POST',body:{version:1,action:'OWNER'}});
  await call(decision,201,{method:'POST',body:{version:1,action:'ADMIT'}});assert.equal((await poll(resumed.ticket)).state,'ADMITTED');
  await call(decision,409,{method:'POST',body:{version:1,action:'REJECT'}});
  await call(host+'/invitations/'+issued.id+'/revoke',409,{method:'POST',body:{version:22}});
  await call(host+'/invitations/'+issued.id+'/revoke',201,{method:'POST',body:{version:1}});
  assert.deepEqual(await poll(resumed.ticket),{state:'REVOKED',videoAvailable:false});await join(issued,{clientKey:key},401);
  // Rejection and voluntary departure permanently close that invitation.
  const rejectedInvite=await invite('Отклонение'),rejected=await join(rejectedInvite);
  const rejectGuest=await tx.crmMeetingGuest.findUniqueOrThrow({where:{invitationId:rejectedInvite.id}});
  await call(host+'/guests/'+rejectGuest.id+'/decision',201,{method:'POST',body:{version:1,action:'REJECT'}});assert.equal((await poll(rejected.ticket)).state,'REJECTED');
  const leavingInvite=await invite('Выход'),leaving=await join(leavingInvite);
  await call('/meeting-guests/leave',201,{method:'POST',actor:null,body:{ticket:leaving.ticket}});assert.equal((await poll(leaving.ticket)).state,'LEFT');await join(leavingInvite,{},401);
  // Rate limit + expiry + no schedule details before valid PIN.
  const limited=await invite('Лимит');await tx.crmMeetingGuestRate.create({data:{key:'join-invite:'+limited.id,hits:10,resetAt:new Date(Date.now()+600000)}});
  const throttled=await join(limited,{},429);assert.ok(throttled.retryAfter>0);
  await tx.crmMeetingInvitation.update({where:{id:limited.id},data:{expiresAt:new Date(Date.now()-1000)}});
  await tx.crmMeetingGuestRate.update({where:{key:'join-invite:'+limited.id},data:{hits:0}});await join(limited,{},401);
  const expiredInvite=await invite('Истечение'),expiredGuest=await join(expiredInvite);
  await tx.crmMeetingGuest.update({where:{invitationId:expiredInvite.id},data:{expiresAt:new Date(Date.now()-1000)}});assert.equal((await poll(expiredGuest.ticket)).state,'EXPIRED');
  await call(host+'/invitations/'+expiredInvite.id+'/revoke',201,{method:'POST',body:{version:1}});
  // Changing times revokes links/tickets in the same transaction.
  const movedInvite=await invite('Перенос'),movedGuest=await join(movedInvite);
  const movedFields={...fields,startsAt:new Date(Date.now()+15*60000).toISOString(),endsAt:new Date(Date.now()+75*60000).toISOString()};
  await call(host,200,{method:'PATCH',body:{...movedFields,version:1}});assert.equal((await poll(movedGuest.ticket)).state,'REVOKED');await join(movedInvite,{},401);
  // Capacity counts employees AND unconsumed invitations. No phantom eleventh guest.
  for(let i=0;i<8;i++)await invite('Место '+i,2);
  await call(host+'/invitations',409,{method:'POST',body:{label:'Лишнее место',version:2,requestKey:randomUUID()}});
  const extra=await make('MANAGER_SALES');await call(host,400,{method:'PATCH',body:{...movedFields,version:2,memberIds:[member.id,extra.id]}});
  const active=(await call(host+'/invitations')).items.filter(v=>!v.revokedAt&&Date.parse(v.expiresAt)>Date.now());assert.equal(active.length,8);
  await call(host+'/cancel',201,{method:'POST',body:{version:2,reason:'Проверка отмены'}});
  assert.equal(await tx.crmMeetingInvitation.count({where:{meetingId:row.id,revokedAt:null,expiresAt:{gt:new Date()}}}),0);
  // Known valid credentials reveal only the entry-window rule, not private CRM details.
  const early=await call('/crm/meetings',201,{method:'POST',body:{...fields,memberIds:[],startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString(),requestKey:randomUUID()}});
  const earlyInvite=await call('/crm/meetings/'+early.id+'/invitations',201,{method:'POST',body:{label:'Рано',version:1,requestKey:randomUUID()}});
  await join(earlyInvite,{},400);
  await call('/crm/meetings/'+early.id+'/guests/'+guest.id+'/decision',404,{method:'POST',body:{version:2,action:'ADMIT'}});
  const distant=await call('/crm/meetings',201,{method:'POST',body:{...fields,memberIds:[],startsAt:new Date(Date.now()+40*86400000).toISOString(),endsAt:new Date(Date.now()+40*86400000+3600000).toISOString(),requestKey:randomUUID()}});
  await call('/crm/meetings/'+distant.id+'/invitations',409,{method:'POST',body:{label:'Слишком рано',version:1,requestKey:randomUUID()}});
  // DENY is checked from DB without requiring login/refresh.
  const deny=await tx.permission.findUniqueOrThrow({where:{key:'meetings.write'}});await tx.userPermission.create({data:{userId:owner.id,permissionId:deny.id,effect:'DENY'}});await call(host+'/invitations',403);
  const allAudits=await tx.auditLog.findMany({where:{resource:'crm.meeting',resourceId:row.id}});assert.ok(allAudits.some(v=>v.action==='GUEST_ADMITTED'));
  const auditText=JSON.stringify([...allAudits,...genericAudit]);for(const secret of [issued.pin,issued.invitationToken,stored.pinHash,resumed.ticket,key])assert.ok(!auditText.includes(secret),'No guest secrets in audit');
  assert.equal(genericAudit.filter(v=>v.route.includes('/meeting-guests/')).length,0,'Polling is not generic mutation audit');
  await app.close();app=null;throw rollback;
 },{timeout:90000});}catch(e){if(e!==rollback)throw e;}finally{if(app)await app.close();if(createdId)assert.equal(await db.crmMeeting.count({where:{id:createdId}}),0);await db.$disconnect();}
 // A failed transactional audit must undo the invite, not leave a usable unlogged capability.
 const db2=new PrismaClient();let id;
 try{
  await assert.rejects(()=>db2.$transaction(async tx=>{
   const user=await tx.user.create({data:{email:`guest-audit-${randomUUID()}@example.invalid`,password:'not-a-login',role:'ADMIN'}});
   const base=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)}),meetings=new MeetingsService(base);
   const row=await meetings.create(user.id,{title:'Rollback',agenda:'',kind:'TEAM',startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),timezone:'UTC',memberIds:[],requestKey:randomUUID()});id=row.id;
   const broken=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(new Proxy(tx,{get:(inner,prop)=>prop==='auditLog'?{create:async()=>{throw new Error('AUDIT_UNAVAILABLE');}}:Reflect.get(inner,prop)})):Reflect.get(target,key)});
   await new MeetingGuestsService(broken,new MeetingsService(broken)).create(user.id,row.id,{label:'Rollback',version:1,requestKey:randomUUID()});
  },{timeout:15000}),/AUDIT_UNAVAILABLE/);
  assert.equal(await db2.crmMeetingInvitation.count({where:{meetingId:id}}),0);assert.equal(await db2.crmMeeting.count({where:{id}}),0);
 }finally{await db2.$disconnect();}
 console.log('Meeting guests HTTP + SQL PASS: guest/CRM isolation, PIN hashes, one-slot redemption, resume ticket rotation, admission/reject/revoke/leave, TTL, rate limit, reschedule/cancel, capacity, DENY, safe atomic audit; all synthetic data rolled back.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
