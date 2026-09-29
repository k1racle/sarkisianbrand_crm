// Real Nest/DTO/permissions/services/SQL and real SDK JWT signatures. Only identity
// transport and private LiveKit RPC are fakes. All SQL writes are rolled back.
require('dotenv').config();require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common');
const {Reflector}=require('@nestjs/core'),{PrismaClient}=require('@prisma/client');
const {AccessToken,TokenVerifier}=require('livekit-server-sdk');
const {PrismaService}=require('../dist/src/prisma/prisma.service');
const {MeetingsService}=require('../dist/src/meetings/meetings.service');
const {MeetingGuestsService}=require('../dist/src/meetings/meeting-guests.service');
const {MeetingMediaAdapter}=require('../dist/src/meetings/meeting-media.adapter');
const {MeetingMediaService}=require('../dist/src/meetings/meeting-media.service');
const {MeetingMediaController,MeetingGuestMediaController,MeetingMediaGatewayController}=require('../dist/src/meetings/meeting-media.controller');
const {RolesGuard}=require('../dist/src/common/guards/roles.guard');
const {JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard');
const {guestSecret}=require('../dist/src/meetings/meeting-guest-policy');
const {AuditInterceptor}=require('../dist/src/audit/audit.interceptor');

async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname),'Local database only');
 const env={CRM_MEDIA_ENABLED:'true',CRM_MEDIA_GATEWAY_ENFORCED:'true',CRM_MEDIA_PUBLIC_URL:'wss://meet.sarkisianbrand.ru',CRM_MEDIA_API_URL:'http://127.0.0.1:7880',CRM_MEDIA_API_KEY:'contract-key',CRM_MEDIA_API_SECRET:randomBytes(32).toString('hex'),CRM_MEDIA_GATEWAY_KEY:randomBytes(32).toString('hex')};
 const original={};for(const [key,value] of Object.entries(env)){original[key]=process.env[key];process.env[key]=value;}
 const adapter=new MeetingMediaAdapter();for(const key of Object.keys(env)){if(original[key]===undefined)delete process.env[key];else process.env[key]=original[key];}
 const remote=new Map(),removed=[],created=[];let failRpc=false;
 const rpc=()=>{if(failRpc)throw new Error('SYNTHETIC_RPC_UNAVAILABLE');};
 adapter.client={
  async listRooms(){rpc();return [...remote.keys()].map(name=>({name}));},
  async createRoom(options){rpc();created.push(options);if(!remote.has(options.name))remote.set(options.name,[]);return options;},
  async deleteRoom(name){rpc();remote.delete(name);},
  async listParticipants(name){rpc();return remote.get(name)||[];},
  async removeParticipant(name,identity){rpc();removed.push(identity);remote.set(name,(remote.get(name)||[]).filter(p=>p.identity!==identity));},
 };
 const db=new PrismaClient(),rollback=new Error('ROLLBACK_MEDIA_CONTRACT');let app,meetingId,checks=0;const genericAudit=[];
 try{await db.$transaction(async tx=>{
  const make=role=>tx.user.create({data:{role,email:`media-contract-${randomUUID()}@example.invalid`,password:'not-a-login'}});
  const owner=await make('ADMIN'),member=await make('MANAGER_SALES'),outsider=await make('MANAGER_SALES'),executive=await make('EXECUTIVE'),customer=await make('CUSTOMER_B2C');
  const actors=new Map([owner,member,outsider,executive,customer].map(user=>[`Bearer contract-${user.id}`,user]));
  const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
  const module=await Test.createTestingModule({controllers:[MeetingMediaController,MeetingGuestMediaController,MeetingMediaGatewayController],providers:[MeetingsService,MeetingGuestsService,MeetingMediaService,RolesGuard,Reflector,{provide:PrismaService,useValue:prisma},{provide:MeetingMediaAdapter,useValue:adapter}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),actor=actors.get(req.headers.authorization);if(!actor)throw new UnauthorizedException();req.user={sub:actor.id,role:actor.role};return true;}}).compile();
  const media=module.get(MeetingMediaService),meetings=module.get(MeetingsService),guests=module.get(MeetingGuestsService);
  // Deterministic sweeps, not a background timer racing our outer rollback transaction.
  media.onModuleInit=()=>{};
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));
  app.useGlobalInterceptors(new AuditInterceptor({write:async event=>genericAudit.push(event)}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();
  const call=async(path,status=200,{method='GET',body,actor=owner,headers={}}={})=>{
   const res=await fetch(`${base}/api/v1${path}`,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer contract-${actor.id}`} :{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
   const raw=await res.text(),json=raw?JSON.parse(raw):null;
   assert.equal(res.status,status,`${method} ${path}: ${raw}`);checks++;
   if(status<300)assert.equal(res.headers.get('cache-control'),'private, no-store');return json;
  };
  const fields={title:'Media contract',agenda:'PRIVATE AGENDA',kind:'TEAM',startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+4200000).toISOString(),timezone:'UTC',memberIds:[member.id]};
  const meeting=await meetings.create(owner.id,{...fields,requestKey:randomUUID()});meetingId=meeting.id;
  const path='/crm/meetings/'+meeting.id+'/media';
  const post=(suffix,body={},status=201,actor=owner)=>call(path+suffix,status,{method:'POST',body,actor});
  const gateway=(token,status=204,key=env.CRM_MEDIA_GATEWAY_KEY)=>call('/meeting-media-gateway/authorize',status,{actor:null,headers:{'x-meeting-media-token':token,'x-meeting-gateway-key':key}});
  const guestToken=(ticket,status=201)=>call('/meeting-guests/media/token',status,{actor:null,method:'POST',body:{ticket}});
  await call(path,401,{actor:null});await call(path,403,{actor:customer});await call(path,404,{actor:outsider});
  assert.equal((await call(path)).clientAvailable,false);
  await post('/open',{version:1},503);await media.reconcile();
  await post('/open',{version:1},403,member);await post('/open',{version:1},403,executive);
  await post('/open',{version:2},409);await post('/open',{version:1,organizerId:outsider.id},400);
  assert.equal((await post('/open',{version:1})).state,'OPEN');await post('/open',{version:1});
  assert.equal(await tx.crmMeetingMediaRoom.count({where:{meetingId}}),1);
  await post('/token',{},404,outsider);await post('/token',{},403,executive);
  const staff=await post('/token',{},201,member),again=await post('/token',{},201,member);assert.equal(staff.identity,again.identity);
  const claims=await new TokenVerifier(env.CRM_MEDIA_API_KEY,env.CRM_MEDIA_API_SECRET).verify(staff.token,0);
  assert.equal(claims.sub,staff.identity);assert.notEqual(claims.sub,member.id);
  assert.equal(claims.video.roomJoin,true);assert.equal(claims.video.canPublishData,false);assert.equal(claims.video.canUpdateOwnMetadata,false);
  assert.ok(!claims.video.roomAdmin&&!claims.video.roomCreate&&!claims.video.roomList&&!claims.video.roomRecord&&!claims.sip);
  const payload=JSON.parse(Buffer.from(staff.token.split('.')[1],'base64url'));assert.equal(payload.exp-payload.nbf,60);
  assert.deepEqual(claims.video.canPublishSources,['camera','microphone','screen_share','screen_share_audio']);
  await gateway(staff.token);await gateway(staff.token,401,'wrong');await gateway('invalid',401);
  const foreign=new AccessToken(env.CRM_MEDIA_API_KEY,env.CRM_MEDIA_API_SECRET,{identity:staff.identity,ttl:600});foreign.addGrant({room:'different-room',roomJoin:true});await gateway(await foreign.toJwt(),403);
  const adminToken=new AccessToken(env.CRM_MEDIA_API_KEY,env.CRM_MEDIA_API_SECRET,{identity:staff.identity,ttl:600});adminToken.addGrant({room:claims.video.room,roomJoin:true,roomAdmin:true});await gateway(await adminToken.toJwt(),401);
  const issued=await guests.create(owner.id,meetingId,{label:'Guest',version:1,requestKey:randomUUID()}),clientKey=guestSecret();
  const entry={invitationToken:issued.invitationToken,pin:issued.pin,displayName:'Кандидат',clientKey};
  const waiting=await guests.join(entry,'contract');await guestToken(waiting.ticket,403);
  const guest=await tx.crmMeetingGuest.findUniqueOrThrow({where:{invitationId:issued.id}});
  await guests.decide(owner.id,meetingId,guest.id,{version:1,action:'ADMIT'});
  const admitted=await guestToken(waiting.ticket);await gateway(admitted.token);
  // Rejoin from same browser rotates its ticket: old media identity is invalid immediately.
  const resumed=await guests.join(entry,'contract');await gateway(admitted.token,403);await guestToken(waiting.ticket,401);
  const replacement=await guestToken(resumed.ticket);assert.notEqual(replacement.identity,admitted.identity);await gateway(replacement.token);
  remote.set(claims.video.room,[{identity:staff.identity},{identity:replacement.identity},{identity:'unknown'}]);
  await guests.revoke(owner.id,meetingId,issued.id,1);await gateway(replacement.token,403);await guestToken(resumed.ticket,403);
  await media.reconcile();assert.ok(removed.includes(replacement.identity));assert.ok(removed.includes('unknown'));assert.ok(!removed.includes(staff.identity));
  // SDK-refreshed tokens still go through the database gate, not just initial JWT expiry.
  const refreshed=new AccessToken(env.CRM_MEDIA_API_KEY,env.CRM_MEDIA_API_SECRET,{identity:replacement.identity,ttl:600});refreshed.addGrant({room:claims.video.room,roomJoin:true});await gateway(await refreshed.toJwt(),403);
  const perm=await tx.permission.findUniqueOrThrow({where:{key:'meetings.read'}});
  const deny=await tx.userPermission.create({data:{userId:member.id,permissionId:perm.id,effect:'DENY'}});await gateway(staff.token,403);await post('/token',{},403,member);
  await media.reconcile();assert.ok(removed.includes(staff.identity));await tx.userPermission.delete({where:{userId_permissionId:{userId:deny.userId,permissionId:deny.permissionId}}});
  const renewed=await post('/token',{},201,member);assert.notEqual(renewed.identity,staff.identity);await gateway(staff.token,403);await gateway(renewed.token);
  await tx.user.update({where:{id:member.id},data:{isActive:false}});await gateway(renewed.token,403);await tx.user.update({where:{id:member.id},data:{isActive:true}});
  await tx.crmMeetingMediaSession.update({where:{id:renewed.identity},data:{expiresAt:new Date(Date.now()-1000)}});await gateway(renewed.token,403);
  failRpc=true;await assert.rejects(()=>media.reconcile(),/SYNTHETIC_RPC/);await gateway(renewed.token,503);await post('/token',{},503,member);
  // Local closure is committed even with the private media server unavailable.
  const closed=await post('/close',{version:1});assert.equal(closed.disconnectPending,true);assert.equal(closed.state,'CLOSED');
  failRpc=false;await media.reconcile();await gateway(renewed.token,403);assert.equal((await call(path)).disconnectPending,false);
  await post('/close',{version:1},409);await post('/close',{version:2});await post('/open',{version:1},409);
  assert.ok(created.every(options=>options.maxParticipants===10));
  // Changing roster/schedule closes old media sessions atomically with the meeting.
  const second=await meetings.create(owner.id,{...fields,requestKey:randomUUID()});await media.open(owner.id,second.id,1);
  const beforeMove=await media.employeeToken(member.id,second.id);
  await meetings.update(owner.id,second.id,{...fields,version:1,memberIds:[]});await gateway(beforeMove.token,403);
  const oldRoom=await tx.crmMeetingMediaRoom.findFirstOrThrow({where:{meetingId:second.id}});assert.ok(oldRoom.closedAt);assert.equal(oldRoom.closeReason,'MEETING_CHANGED');
  await media.reconcile();await media.open(owner.id,second.id,2);const beforeCancel=await media.employeeToken(owner.id,second.id);
  await meetings.cancel(owner.id,second.id,{version:2,reason:'Contract cancellation'});await gateway(beforeCancel.token,403);await media.reconcile();
  assert.equal(remote.size,0);
  const logs=JSON.stringify([await tx.auditLog.findMany({where:{resource:'crm.meeting',resourceId:meetingId}}),genericAudit]);
  for(const secret of [staff.token,admitted.token,issued.pin,issued.invitationToken,waiting.ticket,env.CRM_MEDIA_API_SECRET,env.CRM_MEDIA_GATEWAY_KEY])assert.ok(!logs.includes(secret),'No capabilities in audit');
  assert.equal(genericAudit.filter(v=>v.route.endsWith('/media/token')).length,0);
  // Disabled mode cannot issue a token or reach the RPC transport.
  adapter.config.enabled=false;const savedClient=adapter.client;adapter.client=undefined;
  await post('/token',{},503);assert.equal((await call(path)).configured,false);adapter.config.enabled=true;adapter.client=savedClient;
  await app.close();app=null;throw rollback;
 },{timeout:90000});}catch(e){if(e!==rollback)throw e;}finally{if(app)await app.close();if(meetingId)assert.equal(await db.crmMeeting.count({where:{id:meetingId}}),0);await db.$disconnect();}
 // Real transaction abort: an audit outage must not leave an unlogged room/session
 // or reach JWT issuance. Not an assertion about a mocked transaction.
 const auditDb=new PrismaClient();
 try{for(const phase of ['open','session']){
  let id;
  await assert.rejects(()=>auditDb.$transaction(async tx=>{
   const owner=await tx.user.create({data:{email:`media-audit-${randomUUID()}@example.invalid`,password:'not-a-login',role:'ADMIN'}});
   const proxy=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
   const meetings=new MeetingsService(proxy),guests=new MeetingGuestsService(proxy,meetings);
   const meeting=await meetings.create(owner.id,{title:'Audit failure',agenda:'',kind:'TEAM',startsAt:new Date(Date.now()+600000).toISOString(),endsAt:new Date(Date.now()+4200000).toISOString(),timezone:'UTC',memberIds:[],requestKey:randomUUID()});id=meeting.id;
   if(phase==='session'){const working=new MeetingMediaService(proxy,meetings,guests,adapter);await working.reconcile();await working.open(owner.id,id,1);}
   const broken=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(new Proxy(tx,{get:(inner,prop)=>prop==='auditLog'?{create:async()=>{throw new Error('AUDIT_UNAVAILABLE');}}:Reflect.get(inner,prop)})):Reflect.get(target,key)});
   const media=new MeetingMediaService(broken,new MeetingsService(broken),guests,adapter);await media.reconcile();
   const before=created.length;
   try{if(phase==='open')await media.open(owner.id,id,1);else await media.employeeToken(owner.id,id);}catch(e){assert.equal(created.length,before,'No remote/token preparation after failed audit');throw e;}
  },{timeout:15000}),/AUDIT_UNAVAILABLE/);
  assert.equal(await auditDb.crmMeeting.count({where:{id}}),0);assert.equal(await auditDb.crmMeetingMediaRoom.count({where:{meetingId:id}}),0);
 }}finally{await auditDb.$disconnect();}
 console.log(`Meeting media PASS: ${checks} HTTP assertions; real SQL/JWT, permissions, admission/rotation/revocation, worker removals, expiry/DENY, outage/closure, schedule/cancel, no secrets and atomic audit failures; all synthetic SQL rolled back. LiveKit/network not exercised.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
