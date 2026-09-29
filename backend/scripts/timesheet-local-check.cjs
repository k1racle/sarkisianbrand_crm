// Read-only feature tested against synthetic records in an ALWAYS rolled-back local transaction.
require('dotenv').config();
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{PrismaClient}=require('@prisma/client');
const {TimesheetService}=require('../dist/src/work-time/timesheet.service');
const url=new URL(process.env.DATABASE_URL);if(!['localhost','127.0.0.1'].includes(url.hostname)||(url.port&&url.port!=='5432'))throw Error('Only local PostgreSQL allowed');
const prisma=new PrismaClient(),ids=Array.from({length:33},()=>randomUUID()),[admin,leader,foreign,...staff]=ids,rollback=new Error('ROLLBACK_TIMESHEET_FIXTURES');let checks=0;
async function main(){
 try{await prisma.$transaction(async db=>{
  for(const [i,id] of ids.entries())await db.user.create({data:{id,email:'timesheet-'+id+'@example.invalid',password:'NOT_A_LOGIN_HASH',role:i===0?'ADMIN':i===1?'SUPERVISOR':'MANAGER_SALES',firstName:'QA',lastName:String(i).padStart(3,'0'),timezone:'Europe/Moscow'}});
  const department=await db.crmDepartment.create({data:{name:'Synthetic sheet department',leaderId:leader}}),other=await db.crmDepartment.create({data:{name:'Other synthetic department'}});
  await db.user.updateMany({where:{id:{in:staff}},data:{departmentId:department.id}});
  await db.user.update({where:{id:foreign},data:{departmentId:other.id}});
  for(const id of staff)await db.crmWorkSession.create({data:{employeeId:id,departmentId:department.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-01T06:00Z'),endedAt:new Date('2026-09-01T07:00Z')}});
  const manual=(employeeId,departmentId,plannedMinutes=480)=>({employeeId,departmentId,creatorId:admin,kind:'SHIFT',status:'PUBLISHED',startLocal:'2026-09-01T09:00',endLocal:'2026-09-01T18:00',startsAt:new Date('2026-09-01T06:00Z'),endsAt:new Date('2026-09-01T15:00Z'),timezone:'Europe/Moscow',plannedMinutes,breakMinutes:60,requestKey:randomUUID(),requestHash:'synthetic'});
  await db.crmWorkSchedule.create({data:manual(staff[0],department.id)});
  // History from another department must not leak through totals or pending counters.
  await db.crmWorkSession.create({data:{employeeId:staff[0],departmentId:other.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-02T06:00Z'),endedAt:new Date('2026-09-02T07:00Z')}});
  await db.crmWorkSchedule.create({data:{...manual(staff[0],other.id),startLocal:'2026-09-02T09:00',endLocal:'2026-09-02T18:00',startsAt:new Date('2026-09-02T06:00Z'),endsAt:new Date('2026-09-02T15:00Z')}});
  await db.crmWorkTimeCorrection.create({data:{employeeId:staff[0],departmentId:other.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-03T06:00Z'),endedAt:new Date('2026-09-03T15:00Z'),breaks:[],reason:'Synthetic foreign reason',requestKey:randomUUID(),requestHash:'synthetic'}});
  const now=new Date('2026-09-28T12:00Z'),scoped=new Proxy(db,{get(target,name){if(name==='$queryRaw')return(strings,...args)=>String(strings[0]).includes('clock_timestamp')?Promise.resolve([{now}]):target.$queryRaw(strings,...args);return target[name];}}),service=new TimesheetService({$transaction:fn=>fn(scoped)});
  const query={month:'2026-09',departmentId:department.id,page:1,view:'ALL'};
  const page1=await service.list(leader,query),page2=await service.list(leader,{...query,page:2});
  assert.equal(page1.total,30);assert.equal(page1.items.length,25);assert.equal(page2.items.length,5);checks++;
  assert.equal(page1.summary.workedMs,30*3600000);assert.deepEqual(page2.summary,page1.summary);checks++;
  assert.equal(page1.summary.plannedMs,8*3600000);assert.equal(page1.items.find(r=>r.employee.id===staff[0]).issues.pending,0);checks++;
  const detail=await service.detail(leader,staff[0],'2026-09');assert.equal(detail.intervals.length,1);assert.equal(detail.corrections.length,0);assert.equal(detail.plannedMs,8*3600000);assert.equal(detail.days.length,30);checks++;
  const company=await service.detail(admin,staff[0],'2026-09');assert.equal(company.intervals.length,2);assert.equal(company.plannedMs,16*3600000);assert.equal(company.corrections.length,1);checks++;
  await assert.rejects(service.detail(leader,foreign,'2026-09'),/не найден/);checks++;
  await assert.rejects(service.list(leader,{...query,departmentId:other.id}),/не найден/);checks++;
  assert.deepEqual((await service.options(leader)).departments.map(row=>row.id),[department.id]);checks++;
  await assert.rejects(service.list(staff[0],query),/Нет доступа/);checks++;
  assert.equal((await service.list(leader,{...query,search:'qa 003'})).total,1);checks++;
  assert.equal((await service.list(leader,{...query,search:'not-a-person'})).summary.workedMs,0);checks++;
  assert.equal((await service.list(leader,{...query,page:999})).page,2);checks++;
  await db.crmWorkSession.create({data:{employeeId:staff[1],departmentId:department.id,timezone:'Europe/Moscow',startedAt:new Date('2026-09-25T06:00Z')}});
  const problems=await service.list(leader,{...query,view:'ATTENTION'});assert.equal(problems.total,1);assert.equal(problems.items[0].employee.id,staff[1]);assert.equal(problems.summary.attention,1);checks++;
  const permission=await db.permission.findUnique({where:{key:'work_schedule.read'}});await db.userPermission.create({data:{userId:leader,permissionId:permission.id,effect:'DENY'}});
  const noPlan=await service.list(leader,query);assert.equal(noPlan.summary.plannedMs,null);assert.equal(noPlan.summary.unavailablePlan,30);assert.notEqual(noPlan.summary.workedMs,null);checks++;
  await db.userPermission.delete({where:{userId_permissionId:{userId:leader,permissionId:permission.id}}});
  await db.user.update({where:{id:staff[0]},data:{departmentId:other.id}});await assert.rejects(service.detail(leader,staff[0],'2026-09'),/не найден/);assert.equal((await service.list(leader,query)).total,29);checks++;
  await db.user.update({where:{id:staff[2]},data:{isActive:false}});await assert.rejects(service.detail(leader,staff[2],'2026-09'),/не найден/);assert.equal((await service.detail(admin,staff[2],'2026-09')).workedMs,3600000);checks++;
  await db.crmDepartment.update({where:{id:department.id},data:{archivedAt:now}});await assert.rejects(service.options(leader),/Нет доступных отделов/);checks++;
  const review=await db.permission.findUnique({where:{key:'work_time.review'}});await db.userPermission.create({data:{userId:admin,permissionId:review.id,effect:'DENY'}});await assert.rejects(service.detail(admin,staff[0],'2026-09'),/Нет доступа/);checks++;
  throw rollback;
 },{timeout:60000});}catch(e){if(e!==rollback)throw e;}
 assert.equal(await prisma.user.count({where:{id:{in:ids}}}),0);assert.equal(await prisma.crmWorkSession.count({where:{employeeId:{in:ids}}}),0);checks++;
 console.log(JSON.stringify({result:'PASS',checks,storage:'existing loopback PostgreSQL',fixtures:'rolled back',integrations:'not called',limits:'service/SQL; not real JWT or load test'}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>prisma.$disconnect());
