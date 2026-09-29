// Local PostgreSQL + real Nest/DTO/service/permissions. Only JWT identities are synthetic.
// All fixtures roll back; no notifications, HR exports or payroll operations.
require('dotenv').config(); require('reflect-metadata');
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing'), { ValidationPipe, UnauthorizedException } = require('@nestjs/common'), { Reflector } = require('@nestjs/core'), { PrismaClient } = require('@prisma/client');
const { PrismaService } = require('../dist/src/prisma/prisma.service'), { RolesGuard } = require('../dist/src/common/guards/roles.guard'), { JwtAuthGuard } = require('../dist/src/auth/jwt-auth.guard');
const { WorkScheduleController } = require('../dist/src/work-schedule/work-schedule.controller'), { WorkScheduleService } = require('../dist/src/work-schedule/work-schedule.service');
async function main() {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const db = new PrismaClient(), rollback = new Error('ROLLBACK_SCHEDULE'); let app, createdId, checks = 0;
  const fields = { kind:'SHIFT', startLocal:'2026-09-24T22:00', endLocal:'2026-09-25T06:00', timezone:'Europe/Moscow', breakMinutes:30, note:'Склад' };
  try { await db.$transaction(async tx => {
    const a = await tx.crmDepartment.create({data:{name:'Schedule test A'}}), b = await tx.crmDepartment.create({data:{name:'Schedule test B'}});
    const make = (role, departmentId) => tx.user.create({data:{role,departmentId,email:`schedule-${randomUUID()}@example.invalid`,password:'not-a-login'}});
    const admin = await make('ADMIN'), executive = await make('EXECUTIVE'), leader = await make('SUPERVISOR',a.id), nonLeader = await make('SUPERVISOR',a.id), employee = await make('MANAGER_SALES',a.id), peer = await make('MANAGER_SALES',a.id), foreign = await make('MANAGER_SALES',b.id), customer = await make('CUSTOMER_B2C');
    await tx.crmDepartment.update({where:{id:a.id},data:{leaderId:leader.id}});
    const actors = new Map([admin,executive,leader,nonLeader,employee,peer,foreign,customer].map(user => [user.id,user]));
    const prisma = new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
    const module = await Test.createTestingModule({controllers:[WorkScheduleController],providers:[WorkScheduleService,Reflector,RolesGuard,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),user=actors.get(req.headers.authorization?.replace('Bearer ',''));if(!user)throw new UnauthorizedException();req.user={sub:user.id,role:user.role};return true;}}).compile();
    app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
    const call=async(path='',status=200,{method='GET',body,actor=admin}={})=>{const response=await fetch(base+'/api/v1/crm/work-schedule'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor.id}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(json)}`);if(status<300)assert.equal(response.headers.get('cache-control'),'private, no-store');checks++;return json;};
    await call('?month=2026-09',401,{actor:null});await call('?month=2026-09',403,{actor:customer});await call('?month=2026-13',400);
    const ownOptions=await call('/options',200,{actor:employee});assert.deepEqual(ownOptions.people.map(p=>p.id),[employee.id]);assert.equal(ownOptions.people[0].canAssign,false);
    assert.ok(!(await call('/options',200,{actor:leader})).people.some(p=>p.id===foreign.id));
    const body={...fields,employeeId:employee.id,requestKey:randomUUID()};
    await call('',403,{actor:employee,method:'POST',body});await call('',403,{actor:executive,method:'POST',body});await call('',404,{actor:nonLeader,method:'POST',body});
    await call('',404,{actor:leader,method:'POST',body:{...body,employeeId:foreign.id}});
    await call('',400,{method:'POST',body:{...body,departmentId:b.id}});await call('',400,{method:'POST',body:{...body,status:'PUBLISHED'}});
    const draft=await call('',201,{actor:leader,method:'POST',body});createdId=draft.id;assert.equal(draft.plannedMinutes,450);assert.equal(draft.startsAt,'2026-09-24T19:00:00.000Z');assert.equal(draft.departmentId,a.id);assert.ok(!('requestHash' in draft));
    assert.equal((await call('',201,{actor:leader,method:'POST',body})).id,draft.id);
    await call('',409,{actor:leader,method:'POST',body:{...body,note:'changed'}});
    await call('',409,{actor:leader,method:'POST',body:{...body,requestKey:randomUUID()}});
    await call('/'+draft.id,404,{actor:employee});await call('/'+draft.id,404,{actor:peer});
    assert.equal((await call('?month=2026-09',200,{actor:employee})).items.length,0);
    const update={...fields,version:1,reason:'Уточнение перерыва',breakMinutes:60};
    await call('/'+draft.id,200,{actor:leader,method:'PATCH',body:update});await call('/'+draft.id,409,{actor:leader,method:'PATCH',body:update});
    await call('/'+draft.id+'/status',400,{actor:leader,method:'POST',body:{status:'PUBLISHED',version:2,reason:'  '}});
    const published=await call('/'+draft.id+'/status',201,{actor:leader,method:'POST',body:{status:'PUBLISHED',version:2,reason:'Утверждён график'}});assert.equal(published.version,3);
    const own=await call('/'+draft.id,200,{actor:employee});assert.equal(own.canEdit,false);assert.deepEqual(own.events.map(event=>event.action),['PUBLISHED']);
    await call('/'+draft.id,404,{actor:peer});await call('/'+draft.id,404,{actor:foreign});await call('/'+draft.id,200,{actor:executive});
    const calendar=await call('?month=2026-09',200,{actor:employee});assert.equal(calendar.totals.publishedMinutes,420);assert.equal(calendar.items.length,1);
    await call('/'+draft.id,403,{actor:leader,method:'PATCH',body:{...update,version:3}});
    await call('/'+draft.id+'/status',403,{actor:employee,method:'POST',body:{status:'CANCELLED',version:3,reason:'Попытка'}});
    const dayOff={...fields,kind:'DAY_OFF',startLocal:'2026-09-25T00:00',endLocal:'2026-09-26T00:00',breakMinutes:0,employeeId:employee.id,requestKey:randomUUID()};
    await call('',409,{actor:leader,method:'POST',body:dayOff});
    // Historical department is immutable. Both old and new department managers fail closed.
    await tx.user.update({where:{id:employee.id},data:{departmentId:b.id}});
    await call('/'+draft.id,404,{actor:leader});await call('/'+draft.id,200,{actor:employee});await call('/'+draft.id,200,{actor:admin});
    await tx.crmDepartment.update({where:{id:b.id},data:{leaderId:nonLeader.id}});await call('/'+draft.id,404,{actor:nonLeader});
    await call('/'+draft.id+'/status',201,{method:'POST',body:{status:'CANCELLED',version:3,reason:'Перевод в другой отдел'}});
    const cancelled=await call('/'+draft.id,200,{actor:employee});assert.deepEqual(cancelled.events.map(event=>event.action),['CANCELLED','PUBLISHED']);assert.equal(cancelled.departmentName,a.name);
    assert.equal((await call('?month=2026-09',200,{actor:employee})).items.length,0);
    assert.equal((await call('?month=2026-09&status=CANCELLED',200,{actor:employee})).totals.publishedMinutes,0);
    const replacement=await call('',201,{actor:nonLeader,method:'POST',body:dayOff});assert.equal(replacement.plannedMinutes,0);assert.equal(replacement.departmentId,b.id);
    await tx.crmDepartment.update({where:{id:b.id},data:{archivedAt:new Date()}});await call('/'+replacement.id,404,{actor:nonLeader});
    await tx.user.update({where:{id:employee.id},data:{isActive:false}});await call('/'+draft.id,403,{actor:employee});
    const permission=await tx.permission.findUnique({where:{key:'work_schedule.read'}});await tx.userPermission.create({data:{userId:admin.id,permissionId:permission.id,effect:'DENY'}});await call('/options',403);
    assert.equal(await tx.crmWorkScheduleEvent.count({where:{scheduleId:draft.id}}),4);
    await app.close();app=null;throw rollback;
  },{timeout:60000}); } catch(error) { if(error!==rollback)throw error; } finally { if(app)await app.close(); if(createdId)assert.equal(await db.crmWorkSchedule.count({where:{id:createdId}}),0);await db.$disconnect(); }
  const atomicDb = new PrismaClient(); let failedId;
  try {
    await assert.rejects(() => atomicDb.$transaction(async tx => {
      const owner = await tx.user.create({data:{email:`schedule-audit-${randomUUID()}@example.invalid`,password:'not-a-login',role:'ADMIN'}});
      const broken = new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(new Proxy(tx,{get:(inner,prop)=>prop==='auditLog'?{create:async()=>{throw new Error('AUDIT_UNAVAILABLE');}}:prop==='crmWorkSchedule'?{...inner.crmWorkSchedule,create:async args=>{const row=await inner.crmWorkSchedule.create(args);failedId=row.id;return row;}}:Reflect.get(inner,prop)})):Reflect.get(target,key)});
      await new WorkScheduleService(broken).create(owner.id,{...fields,employeeId:owner.id,requestKey:randomUUID()});
    },{timeout:15000}), /AUDIT_UNAVAILABLE/);
    assert.ok(failedId); assert.equal(await atomicDb.crmWorkSchedule.count({where:{id:failedId}}),0); assert.equal(await atomicDb.crmWorkScheduleEvent.count({where:{scheduleId:failedId}}),0);
  } finally { await atomicDb.$disconnect(); }
  console.log(`Work schedule HTTP/SQL PASS: ${checks} checks plus atomic audit rollback; drafts/publication, conflicts, overlap, snapshots, employee/department/company scopes, transfers/archive/DENY; synthetic data rolled back.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
