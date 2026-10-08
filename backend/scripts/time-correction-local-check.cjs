// Only existing loopback PostgreSQL. All fixtures and mutations are rolled back.
require('dotenv').config();
const assert = require('node:assert/strict'), { randomUUID } = require('node:crypto'), { PrismaClient } = require('@prisma/client');
const { TimeCorrectionService } = require('../dist/src/work-time/time-correction.service');
const { WorkTimeService } = require('../dist/src/work-time/work-time.service');
const url = new URL(process.env.DATABASE_URL);
if (!(['localhost','127.0.0.1'].includes(url.hostname) || (url.hostname === 'postgres' && process.env.ALLOW_LOCAL_ACCESS_SMOKE === 'true')) || (url.port && url.port !== '5432')) throw Error('Only local PostgreSQL is allowed; Docker requires ALLOW_LOCAL_ACCESS_SMOKE=true');
const prisma = new PrismaClient(), ids = Array.from({length:5},()=>randomUUID()), [employee,admin,leader,stranger,outsider] = ids;
const rollback = new Error('ROLLBACK_TIME_CORRECTIONS'); let checks=0;
async function main() {
  try { await prisma.$transaction(async db => {
    for (const [index,id] of ids.entries()) await db.user.create({data:{id,email:'time-review-'+id+'@example.invalid',password:'NOT_A_LOGIN_HASH',role:index===0||index===1?'ADMIN':index===2||index===3?'SUPERVISOR':'MANAGER_SALES',timezone:'Europe/Moscow',firstName:'Synthetic '+index}});
    const department = await db.crmDepartment.create({data:{name:'Synthetic time department',leaderId:leader}});
    await db.user.updateMany({where:{id:{in:[employee,leader]}},data:{departmentId:department.id}});
    let now=new Date('2026-09-28T16:00Z'), failAudit=false, serial=0;
    const scoped = new Proxy(db,{get(target,name){
      if(name==='$queryRaw') return (strings,...args)=>String(strings[0]).includes('clock_timestamp')?Promise.resolve([{now}]):target.$queryRaw(strings,...args);
      if(name==='auditLog' && failAudit) return {create:()=>{throw Error('synthetic audit failure');}};
      return target[name];
    }});
    const connection = {$transaction:async callback=>{
      const savepoint='time_review_'+(++serial); await db.$executeRawUnsafe('SAVEPOINT '+savepoint);
      try {const result=await callback(scoped);await db.$executeRawUnsafe('RELEASE SAVEPOINT '+savepoint);return result;}
      catch(e){await db.$executeRawUnsafe('ROLLBACK TO SAVEPOINT '+savepoint);await db.$executeRawUnsafe('RELEASE SAVEPOINT '+savepoint);throw e;}
    }};
    const corrections=new TimeCorrectionService(connection), clock=new WorkTimeService(connection);
    const original=await db.crmWorkSession.create({data:{employeeId:employee,departmentId:department.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-01T06:00:32.123Z'),endedAt:new Date('2026-09-01T16:00Z'),breaks:{create:{startedAt:new Date('2026-09-01T10:00Z'),endedAt:new Date('2026-09-01T11:00Z')}}}});
    const fields={requestKey:randomUUID(),sessionId:original.id,baseVersion:1,timezone:'Europe/Moscow',startLocal:'2026-09-01T09:00',endLocal:'2026-09-01T18:00',reason:'Забыл вовремя завершить',breaks:[{startLocal:'2026-09-01T13:00',endLocal:'2026-09-01T14:00'}]};
    const decision=(action='APPROVE')=>({action,version:1,note:'Проверено по графику',requestKey:randomUUID()});
    const existingReviewTotal=(await corrections.list(employee,{scope:'REVIEW',status:'PENDING',page:1})).total;
    const request=await corrections.create(employee,fields);
    assert.equal((await db.crmWorkSession.findUnique({where:{id:original.id}})).endedAt.toISOString(),'2026-09-01T16:00:00.000Z');checks++;
    assert.equal((await corrections.create(employee,fields)).id,request.id);checks++;
    await assert.rejects(corrections.create(employee,{...fields,reason:'Другие данные'}),/другими значениями/);checks++;
    await assert.rejects(corrections.create(employee,{...fields,requestKey:randomUUID()}),/уже проверяют/);checks++;
    await assert.rejects(corrections.decide(employee,request.id,decision()),/другой руководитель/);checks++;
    assert.equal((await corrections.detail(employee,request.id)).canApprove,false);checks++;
    assert.equal((await corrections.detail(leader,request.id)).canApprove,true);checks++;
    await assert.rejects(corrections.detail(stranger,request.id),/не найдена/);checks++;
    assert.equal((await corrections.list(leader,{scope:'REVIEW',page:1})).total,1);checks++;
    assert.equal((await corrections.list(employee,{scope:'REVIEW',page:1})).items.some(r=>r.id===request.id),false);checks++;
    const ownQueue=await corrections.list(employee,{scope:'REVIEW',status:'PENDING',page:1});
    assert.equal(ownQueue.ownPendingTotal,1);assert.equal(ownQueue.total,existingReviewTotal);assert.equal(ownQueue.reviewScope,'COMPANY');checks++;
    assert.equal((await corrections.list(employee,{scope:'REVIEW',status:'APPROVED',page:2})).ownPendingTotal,1);checks++;
    const adminQueue=await corrections.list(admin,{scope:'REVIEW',status:'PENDING',page:1});
    assert.equal(adminQueue.items[0].id,request.id);assert.equal(adminQueue.items[0].canApprove,true);assert.equal(adminQueue.ownPendingTotal,0);checks++;
    assert.equal((await corrections.list(leader,{scope:'REVIEW',page:1})).reviewScope,'DEPARTMENTS');checks++;
    const accepted=decision(); failAudit=true;
    await assert.rejects(corrections.decide(admin,request.id,accepted),/audit failure/); failAudit=false;
    assert.equal((await db.crmWorkSession.findUnique({where:{id:original.id}})).version,1);
    assert.equal(await db.crmWorkBreak.count({where:{sessionId:original.id}}),1);
    assert.equal((await db.crmWorkTimeCorrection.findUnique({where:{id:request.id}})).status,'PENDING');checks++;
    assert.equal((await corrections.decide(admin,request.id,accepted)).status,'APPROVED');
    assert.equal((await corrections.decide(admin,request.id,accepted)).status,'APPROVED');checks++;
    const event=await db.crmWorkTimeEvent.findFirst({where:{sessionId:original.id}});
    assert.equal(event.beforeSnapshot.startedAt,'2026-09-01T06:00:32.123Z');assert.equal(event.afterSnapshot.startedAt,'2026-09-01T06:00:00.000Z');assert.equal(event.action,'CORRECTED');checks++;
    assert.equal((await clock.history(employee,{month:'2026-09'})).totals.workedMs,8*3600000);checks++;
    assert.equal(await db.crmWorkTimeEvent.count({where:{sessionId:original.id}}),1);checks++;
    const missing=day=>({...fields,sessionId:undefined,baseVersion:undefined,requestKey:randomUUID(),startLocal:`2026-09-${day}T09:00`,endLocal:`2026-09-${day}T18:00`,breaks:[]});
    const reject=await corrections.create(employee,missing('02'));
    await corrections.decide(leader,reject.id,decision('REJECT'));assert.equal(await db.crmWorkSession.count({where:{employeeId:employee}}),1);checks++;
    const cancelled=await corrections.create(employee,missing('03'));
    await corrections.decide(employee,cancelled.id,decision('CANCEL'));assert.equal((await corrections.detail(employee,cancelled.id)).status,'CANCELLED');checks++;
    const newDay=await corrections.create(employee,missing('04'));await corrections.decide(leader,newDay.id,decision());
    assert.equal(await db.crmWorkTimeEvent.count({where:{actorId:leader,action:'MANUAL'}}),1);checks++;
    const pending=await corrections.create(employee,missing('05'));
    await db.crmWorkSession.create({data:{employeeId:employee,timezone:'Europe/Moscow',startedAt:new Date('2026-09-05T09:00Z'),endedAt:new Date('2026-09-05T10:00Z')}});
    await assert.rejects(corrections.decide(admin,pending.id,decision()),/пересекается/);checks++;
    const stale=await corrections.create(employee,{...fields,baseVersion:2,requestKey:randomUUID()});
    await db.crmWorkSession.update({where:{id:original.id},data:{version:{increment:1}}});
    assert.equal((await corrections.detail(admin,stale.id)).canApprove,false);
    await assert.rejects(corrections.decide(admin,stale.id,decision()),/отметка изменилась/);checks++;
    await corrections.decide(admin,stale.id,decision('REJECT'));checks++;
    const transferred=await corrections.create(employee,missing('06'));
    await db.user.update({where:{id:employee},data:{departmentId:null}});
    await assert.rejects(corrections.detail(leader,transferred.id),/не найдена/);assert.equal((await corrections.detail(admin,transferred.id)).canApprove,true);checks++;
    await db.user.update({where:{id:employee},data:{departmentId:department.id}});
    await db.crmWorkSession.create({data:{employeeId:employee,departmentId:department.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-25T06:00Z')}});
    await db.crmWorkSession.create({data:{employeeId:outsider,timezone:'Europe/Moscow',startedAt:new Date('2026-09-25T06:00Z')}});
    const unclosed=await corrections.unclosed(leader,1);assert.equal(unclosed.total,1);assert.equal(unclosed.items[0].employee.id,employee);checks++;
    const permission=await db.permission.findUnique({where:{key:'work_time.review'}});
    await db.userPermission.create({data:{userId:admin,permissionId:permission.id,effect:'DENY'}});
    assert.equal((await corrections.options(admin)).canReview,false);await assert.rejects(corrections.decide(admin,transferred.id,decision()),/не найдена/);checks++;
    const createCount=await db.crmWorkTimeCorrection.count({where:{employeeId:employee}}); failAudit=true;
    await assert.rejects(corrections.create(employee,missing('07')),/audit failure/);failAudit=false;
    assert.equal(await db.crmWorkTimeCorrection.count({where:{employeeId:employee}}),createCount);checks++;
    throw rollback;
  },{timeout:60000});}catch(e){if(e!==rollback)throw e;}
  assert.equal(await prisma.user.count({where:{id:{in:ids}}}),0);checks++;
  assert.equal(await prisma.crmWorkTimeCorrection.count({where:{employeeId:{in:ids}}}),0);checks++;
  console.log(JSON.stringify({result:'PASS',checks,storage:'local PostgreSQL; per-call savepoints',fixtures:'rolled back',integrations:'not called',concurrency:'same employee lock; independent-connection race test remains'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
