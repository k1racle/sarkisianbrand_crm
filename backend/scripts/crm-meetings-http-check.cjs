// Real Nest/DTO/roles/permissions + local PostgreSQL. Only JWT identity is synthetic.
require('dotenv').config(); require('reflect-metadata');
const assert=require('node:assert/strict'), {randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'), {ValidationPipe,UnauthorizedException}=require('@nestjs/common');
const {Reflector}=require('@nestjs/core'), {PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service');
const {MeetingsController}=require('../dist/src/meetings/meetings.controller');
const {MeetingsService}=require('../dist/src/meetings/meetings.service');
const {RolesGuard}=require('../dist/src/common/guards/roles.guard');
const {JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard');
async function main(){
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
 const db=new PrismaClient(),rollback=new Error('ROLLBACK_HTTP_MEETINGS');let app,createdId;
 try{await db.$transaction(async tx=>{
  const make=role=>tx.user.create({data:{role,email:`meeting-http-${randomUUID()}@example.invalid`,password:'not-a-login'}});
  const owner=await make('MANAGER_SALES'), outsider=await make('MANAGER_SALES'), customer=await make('CUSTOMER_B2C');
  const actors=new Map([owner,outsider,customer].map(user=>[`Bearer contract-${user.id}`,user]));
  const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
  const module=await Test.createTestingModule({controllers:[MeetingsController],providers:[MeetingsService,RolesGuard,Reflector,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),actor=actors.get(req.headers.authorization);if(!actor)throw new UnauthorizedException();req.user={sub:actor.id,role:actor.role};return true;}}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();
  const call=async(path,status=200,{method='GET',body,actor=owner}={})=>{
   const res=await fetch(`${base}/api/v1/crm/meetings${path}`,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:`Bearer contract-${actor.id}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json();
   assert.equal(res.status,status,`${method} ${path}: ${JSON.stringify(json)}`);if(method==='GET'&&status===200)assert.equal(res.headers.get('cache-control'),'private, no-store');return json;
  };
  const from=new Date(Date.now()+86400000),to=new Date(+from+86400000),query='?'+new URLSearchParams({from:from.toISOString(),to:to.toISOString()});
  await call(query,401,{actor:null});await call(query,403,{actor:customer});await call(query+'&scope=COMPANY',400);await call(query+'&page=0',400);await call('/team?q[]=bad',400);await call('/not-a-uuid',400);
  const dto={title:'Проверка HTTP',agenda:'',kind:'TEAM',startsAt:new Date(+from+3600000).toISOString(),endsAt:new Date(+from+7200000).toISOString(),timezone:'Europe/Moscow',memberIds:[],requestKey:randomUUID()};
  await call('',400,{method:'POST',body:{...dto,organizerId:outsider.id}});await call('',400,{method:'POST',body:{...dto,title:'   '}});
  const row=await call('',201,{method:'POST',body:dto});createdId=row.id;
  assert.equal((await call('',201,{method:'POST',body:dto})).id,row.id);
  assert.equal((await call(query)).total,1);assert.equal((await call(query,200,{actor:outsider})).total,0);await call('/'+row.id,404,{actor:outsider});
  const {requestKey,...fields}=dto;
  await call('/'+row.id,400,{method:'PATCH',body:fields});await call('/'+row.id,404,{method:'PATCH',body:{...fields,version:1},actor:outsider});
  const changed=await call('/'+row.id,200,{method:'PATCH',body:{...fields,title:'Перенесённая встреча',version:1}});assert.equal(changed.version,2);
  await call('/'+row.id,409,{method:'PATCH',body:{...fields,version:1}});
  await call('/'+row.id+'/cancel',400,{method:'POST',body:{version:2,reason:' '}});
  await call('/'+row.id+'/cancel',201,{method:'POST',body:{version:2,reason:'Перенос'}});assert.equal((await call(query)).total,0);assert.equal((await call(query+'&status=CANCELLED')).total,1);
  const p=await tx.permission.findUniqueOrThrow({where:{key:'meetings.read'}});await tx.userPermission.create({data:{userId:owner.id,permissionId:p.id,effect:'DENY'}});await call(query,403);await call('/'+row.id,403);
  await app.close();app=null;throw rollback;
 },{timeout:30000});}catch(e){if(e!==rollback)throw e;}finally{if(app)await app.close();if(createdId)assert.equal(await db.crmMeeting.count({where:{id:createdId}}),0);await db.$disconnect();}
 console.log('CRM meetings HTTP PASS: auth boundary, DTO, role/DENY, no-store, CRUD, idempotency, conflict, foreign IDs; all synthetic data rolled back.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
