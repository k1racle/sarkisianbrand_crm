// Real Nest validation and PostgreSQL. Temporary committed fixtures are removed in finally.
// SMTP/Redis/1C are never contacted. Mail content is encrypted with a test-only key.
require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),bcrypt=require('bcrypt');
const {PrismaClient}=require('@prisma/client'),{Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common'),{JwtService}=require('@nestjs/jwt'),{ConfigService}=require('@nestjs/config'),{ThrottlerGuard}=require('@nestjs/throttler');
const {PrismaService}=require('../dist/src/prisma/prisma.service'),{JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard'),{AuthService}=require('../dist/src/auth/auth.service');
const {BusinessTeamService}=require('../dist/src/b2b/business-team.service'),{BusinessTeamController,BusinessInvitationController}=require('../dist/src/b2b/business-team.controller'),{BusinessContextMiddleware}=require('../dist/src/b2b/business-context');
const {NotificationsService}=require('../dist/src/notifications/notifications.service'),{IntegrationSecretsService}=require('../dist/src/system-settings/integration-secrets.service');
const {loadBusinessTerms}=require('../dist/src/b2b/business-consent');
async function main(){
 const host=new URL(process.env.DATABASE_URL).hostname;
 assert.ok(['localhost','127.0.0.1'].includes(host)||(host==='postgres'&&process.env.B2B_TEAM_TEST_ALLOW_DOCKER==='1'),'Local database only');
 assert.notEqual(process.env.ECOSYSTEM_AUTOMATION_ENABLED,'true');assert.notEqual(process.env.MAIL_DELIVERY_ENABLED,'true');assert.notEqual(process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED,'true');
 const db=new PrismaClient(),prefix='qa-team-'+randomUUID(),ids=Array.from({length:6},()=>randomUUID()),orgId=randomUUID(),foreignOrg=randomUUID(),password='TeamTest12345!';let app;
 try{
  const hash=await bcrypt.hash(password,4);
  await db.$transaction(async tx=>{
   for(const [index,id]of ids.entries())await tx.user.create({data:{id,email:`${prefix}-${index}@example.invalid`,password:hash,firstName:'Team QA',role:index===4?'CUSTOMER_B2C':index===5?'WAREHOUSE':'CUSTOMER_B2B'}});
   for(const id of [orgId,foreignOrg])await tx.organization.create({data:{id,name:prefix,status:'ACTIVE'}});
   for(const [index,id]of ids.entries())if(index!==4&&index!==5)await tx.organizationMember.create({data:{organizationId:index===3?foreignOrg:orgId,userId:id,role:index===0||index===3?'OWNER':'EMPLOYEE',canOrder:index===0,canSeeFinance:index===0}});
  });
  const config=new ConfigService({PUBLIC_APP_URL:'http://localhost:3001',INTEGRATION_ENCRYPTION_KEY:'test-only-encryption-key-at-least-32-characters',JWT_SECRET:'test-only-jwt-secret-at-least-32-characters',JWT_REFRESH_SECRET:'test-only-refresh-secret-at-least-32-characters',B2B_TEAM_LOCAL_INVITE_LINKS:'true',MAIL_DELIVERY_ENABLED:'false',STOREFRONT_EXTERNAL_CALLS_ENABLED:'false'}),secrets=new IntegrationSecretsService(config);
  const mail=new NotificationsService(db,secrets,{},config),auth=new AuthService(db,new JwtService(),config),actors=new Set(ids);
  const module=await Test.createTestingModule({controllers:[BusinessTeamController,BusinessInvitationController],providers:[BusinessTeamService,{provide:PrismaService,useValue:db},{provide:ConfigService,useValue:config},{provide:NotificationsService,useValue:{prepare:mail.prepare.bind(mail)}},{provide:AuthService,useValue:auth}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),id=String(req.headers.authorization||'').replace('Bearer ','');if(!actors.has(id))throw new UnauthorizedException();req.user={sub:id};return true;}}).overrideGuard(ThrottlerGuard).useValue({canActivate:()=>true}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');const context=new BusinessContextMiddleware();app.use('/api/v1/b2b',(req,res,next)=>context.use(req,res,next));app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
  async function call(path,status=200,{actor=ids[0],method='GET',body}={}){const response=await fetch(base+'/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor}:{})},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(result)}`);return result;}
  const invite=(email,extra={})=>({requestKey:randomUUID(),email,role:'BUYER',canOrder:true,canSeeFinance:false,...extra});
  const invitePath='/b2b/team/invitations',tokenOf=result=>new URLSearchParams(new URL(result.localLink).hash.slice(1)).get('token');
  const email=index=>`${prefix}-${index}@example.invalid`;
  await call(invitePath,403,{actor:ids[1],method:'POST',body:invite(email(2))});await call(invitePath,400,{method:'POST',body:invite(email(2),{role:'OWNER'})});
  const body=invite(`${prefix}-new@example.invalid`),issued=await call(invitePath,201,{method:'POST',body}),token=tokenOf(issued);
  assert.ok(token);assert.equal(issued.invitation.role,'BUYER');
  const stored=await db.businessTeamInvitation.findUniqueOrThrow({where:{id:issued.invitation.id}});assert.notEqual(stored.tokenHash,token);assert.equal(stored.tokenHash,createHash('sha256').update(token).digest('hex'));
  const outbox=await db.mailOutbox.findMany({where:{recipient:body.email}});assert.equal(outbox.length,1);assert.ok(!outbox[0].encryptedPayload.includes(token));assert.ok(secrets.decrypt(outbox[0].encryptedPayload).text.includes(token));
  assert.equal((await call(invitePath,201,{method:'POST',body})).localLink,null);assert.equal(await db.mailOutbox.count({where:{recipient:body.email}}),1);
  await call(invitePath,409,{method:'POST',body:{...body,canSeeFinance:true}});
  const preview=await call('/business-team-invitations/preview',201,{actor:null,method:'POST',body:{token}});assert.ok(preview.emailHint.includes('***'));assert.equal('email'in preview,false);
  await call('/business-team-invitations/accept',403,{actor:ids[2],method:'POST',body:{token}});
  const terms=await loadBusinessTerms(db);
  const registration={token,email:body.email,password:'InvitedAccount123!',firstName:'New',lastName:'Member',acceptedTerms:true,termsVersion:terms.version};
  await call('/business-team-invitations/register',400,{actor:null,method:'POST',body:{...registration,acceptedTerms:false}});
  await call('/business-team-invitations/register',400,{actor:null,method:'POST',body:{...registration,acceptedTerms:'false'}});
  await call('/business-team-invitations/register',409,{actor:null,method:'POST',body:{...registration,termsVersion:'f'.repeat(64)}});
  assert.equal(await db.user.count({where:{email:body.email}}),0,'Stale consent rolls back the new account');
  assert.equal((await db.businessTeamInvitation.findUniqueOrThrow({where:{id:issued.invitation.id}})).status,'PENDING');
  const registered=await call('/business-team-invitations/register',201,{actor:null,method:'POST',body:registration});actors.add(registered.user.id);assert.equal(registered.user.role,'CUSTOMER_B2B');assert.equal(registered.organizationId,orgId);assert.ok(registered.accessToken);assert.equal(await db.loyaltyAccount.count({where:{userId:registered.user.id}}),0);
  assert.equal(await db.auditLog.count({where:{actorId:registered.user.id,action:'ACCEPT_TERMS',resource:'business-consent',payload:{path:['accepted'],equals:true}}}),1);
  const accepted=await Promise.all(Array.from({length:6},()=>call('/business-team-invitations/accept',201,{actor:registered.user.id,method:'POST',body:{token}})));assert.ok(accepted.every(row=>row.reused));assert.equal(await db.organizationMember.count({where:{userId:registered.user.id,organizationId:orgId}}),1);
  const consumer=await call(invitePath,201,{method:'POST',body:invite(email(4))});await call('/business-team-invitations/accept',403,{actor:ids[4],method:'POST',body:{token:tokenOf(consumer)}});await call('/business-team-invitations/register',409,{actor:null,method:'POST',body:{...registration,email:email(4),token:tokenOf(consumer)}});assert.equal((await db.user.findUniqueOrThrow({where:{id:ids[4]}})).role,'CUSTOMER_B2C');
  const staff=await call(invitePath,201,{method:'POST',body:invite(email(5))});await call('/business-team-invitations/accept',403,{actor:ids[5],method:'POST',body:{token:tokenOf(staff)}});
  const existingBusiness=await call(invitePath,201,{method:'POST',body:invite(email(3))});await call('/business-team-invitations/accept',201,{actor:ids[3],method:'POST',body:{token:tokenOf(existingBusiness)}});
  assert.equal((await db.organizationMember.findUniqueOrThrow({where:{organizationId_userId:{organizationId:foreignOrg,userId:ids[3]}}})).role,'OWNER');
  assert.equal((await db.organizationMember.findUniqueOrThrow({where:{organizationId_userId:{organizationId:orgId,userId:ids[3]}}})).canSeeFinance,false);
  const revoked=await call(invitePath,201,{method:'POST',body:invite(`${prefix}-revoke@example.invalid`)});await call(invitePath+'/'+revoked.invitation.id+'/revoke',201,{method:'POST',body:{version:1}});await call('/business-team-invitations/preview',404,{actor:null,method:'POST',body:{token:tokenOf(revoked)}});
  const expired=await call(invitePath,201,{method:'POST',body:invite(`${prefix}-expired@example.invalid`)});await db.businessTeamInvitation.update({where:{id:expired.invitation.id},data:{expiresAt:new Date(Date.now()-1000)}});await call('/business-team-invitations/preview',404,{actor:null,method:'POST',body:{token:tokenOf(expired)}});
  let team=await call('/b2b/team');assert.ok(!JSON.stringify(team).includes('tokenHash'));const target=team.members.find(row=>row.userId===ids[1]),owner=team.members.find(row=>row.userId===ids[0]),foreign=await db.organizationMember.findUniqueOrThrow({where:{organizationId_userId:{userId:ids[3],organizationId:foreignOrg}}});
  const patch={version:target.version,role:'BUYER',canOrder:true,canSeeFinance:false,isActive:true};
  await call('/b2b/team/members/'+target.id,403,{actor:ids[2],method:'PATCH',body:patch});await call('/b2b/team/members/'+foreign.id,404,{method:'PATCH',body:patch});
  await call('/b2b/team/members/'+target.id,400,{method:'PATCH',body:{...patch,role:'OWNER'}});
  const updated=await call('/b2b/team/members/'+target.id,200,{method:'PATCH',body:patch});assert.equal(updated.role,'BUYER');assert.equal(updated.canSeeFinance,false);await call('/b2b/team/members/'+target.id,409,{method:'PATCH',body:patch});
  const client=await db.b2BClient.create({data:{organizationId:orgId,firstName:'QA'}}),service=await db.b2BService.create({data:{organizationId:orgId,name:'QA',duration:60,price:100}});
  const booking=await db.b2BBooking.create({data:{organizationId:orgId,clientId:client.id,serviceId:service.id,masterMemberId:target.id,priceSnapshot:100,startTime:new Date(Date.now()+86400000),endTime:new Date(Date.now()+90000000)}});
  const inactive=await call('/b2b/team/members/'+target.id,200,{method:'PATCH',body:{...patch,version:updated.version,isActive:false}});assert.equal((await db.b2BBooking.findUniqueOrThrow({where:{id:booking.id}})).masterMemberId,target.id);await call('/b2b/team',404,{actor:ids[1]});
  await call('/b2b/team/members/'+target.id,200,{method:'PATCH',body:{...patch,version:inactive.version,isActive:true}});
  await call('/b2b/team/members/'+owner.id,409,{method:'PATCH',body:{...patch,version:owner.version,isActive:false}});
  team=await call('/b2b/team');const next=team.members.find(row=>row.userId===ids[2]);const transfer={targetMemberId:next.id,ownerVersion:owner.version,targetVersion:next.version,currentPassword:'wrong'};
  await call('/b2b/team/transfer-ownership',401,{method:'POST',body:transfer});
  const pending=await call(invitePath,201,{method:'POST',body:invite(`${prefix}-pending@example.invalid`)});
  const transfers=await Promise.all([1,2].map(()=>fetch(base+'/api/v1/b2b/team/transfer-ownership',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+ids[0]},body:JSON.stringify({...transfer,currentPassword:password})})));assert.deepEqual(transfers.map(row=>row.status).sort(),[201,403]);
  await call(invitePath,403,{method:'POST',body:invite(`${prefix}-denied@example.invalid`)});
  const former=await db.organizationMember.findUniqueOrThrow({where:{id:owner.id}});assert.equal(former.role,'EMPLOYEE');assert.equal(former.canOrder,false);assert.equal(former.canSeeFinance,false);assert.equal(await db.organizationMember.count({where:{organizationId:orgId,isActive:true,role:'OWNER'}}),1);
  await call('/business-team-invitations/preview',404,{actor:null,method:'POST',body:{token:tokenOf(pending)}});assert.equal((await call('/b2b/team',200,{actor:ids[2]})).canManage,true);
  assert.equal(await db.mailOutbox.count({where:{recipient:{startsWith:prefix},status:{not:'QUEUED'}}}),0);
  console.log('PASS B2B team HTTP/PostgreSQL: owner-only invitations/access, encrypted mail, idempotency, isolated business registration, B2C/staff unchanged, acceptance/revoke/expiry, stale/foreign member protection, deactivation preserves bookings, password-confirmed owner transfer and invalidation of former-owner invitations. All fixtures removed.');
 }finally{
  if(app)await app.close();const users=await db.user.findMany({where:{email:{startsWith:prefix}},select:{id:true}}),userIds=users.map(row=>row.id);
  await db.$transaction(async tx=>{await tx.auditLog.deleteMany({where:{actorId:{in:userIds}}});await tx.mailOutbox.deleteMany({where:{recipient:{startsWith:prefix},kind:'BUSINESS_TEAM_INVITE'}});await tx.b2BBooking.deleteMany({where:{organizationId:orgId}});await tx.organization.deleteMany({where:{id:{in:[orgId,foreignOrg]},name:prefix}});await tx.customer.deleteMany({where:{userId:{in:userIds}}});await tx.user.deleteMany({where:{id:{in:userIds},email:{startsWith:prefix}}});});await db.$disconnect();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1});
