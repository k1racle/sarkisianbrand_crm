// Real local Nest/DTO/guards/service/SQL; synthetic JWT identity; all data rolled back.
require('dotenv').config(); require('reflect-metadata');
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {Test}=require('@nestjs/testing'),{ValidationPipe,UnauthorizedException}=require('@nestjs/common'),{Reflector}=require('@nestjs/core'),{PrismaClient}=require('@prisma/client');
const {PrismaService}=require('../dist/src/prisma/prisma.service'),{RolesGuard}=require('../dist/src/common/guards/roles.guard'),{JwtAuthGuard}=require('../dist/src/auth/jwt-auth.guard');
const {WorkScheduleController}=require('../dist/src/work-schedule/work-schedule.controller'),{WorkScheduleService}=require('../dist/src/work-schedule/work-schedule.service');
async function main(){
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
  const db=new PrismaClient(),rollback=new Error('ROLLBACK_WORK_PATTERNS');let app,id,checks=0;
  const fields={pattern:'CYCLE_2_2',startDate:'2026-09-24',endDate:null,startTime:'09:00',endTime:'18:00',timezone:'Europe/Moscow',breakMinutes:60,note:'Постоянно',status:'PUBLISHED'};
  try{await db.$transaction(async tx=>{
    const a=await tx.crmDepartment.create({data:{name:'Pattern A'}}),b=await tx.crmDepartment.create({data:{name:'Pattern B'}});
    const make=(role,departmentId)=>tx.user.create({data:{role,departmentId,email:`pattern-${randomUUID()}@example.invalid`,password:'not-a-login'}});
    const admin=await make('ADMIN'),leader=await make('SUPERVISOR',a.id),employee=await make('MANAGER_SALES',a.id),peer=await make('MANAGER_SALES',a.id),foreign=await make('MANAGER_SALES',b.id),executive=await make('EXECUTIVE');
    await tx.crmDepartment.update({where:{id:a.id},data:{leaderId:leader.id}});
    const actors=new Map([admin,leader,employee,peer,foreign,executive].map(user=>[user.id,user]));
    const prisma=new Proxy(tx,{get:(target,key)=>key==='$transaction'?fn=>fn(tx):Reflect.get(target,key)});
    const module=await Test.createTestingModule({controllers:[WorkScheduleController],providers:[WorkScheduleService,Reflector,RolesGuard,{provide:PrismaService,useValue:prisma}]}).overrideGuard(JwtAuthGuard).useValue({canActivate(ctx){const req=ctx.switchToHttp().getRequest(),user=actors.get(req.headers.authorization?.replace('Bearer ',''));if(!user)throw new UnauthorizedException();req.user={sub:user.id,role:user.role};return true;}}).compile();
    app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true,transformOptions:{enableImplicitConversion:true}}));await app.listen(0,'127.0.0.1');const base=await app.getUrl();
    const call=async(path='',status=200,{method='GET',body,actor=admin}={})=>{const res=await fetch(base+'/api/v1/crm/work-schedule'+path,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor.id}:{})},...(body?{body:JSON.stringify(body)}:{})});const json=await res.json();assert.equal(res.status,status,`${method} ${path}: ${JSON.stringify(json)}`);if(status<300)assert.equal(res.headers.get('cache-control'),'private, no-store');checks++;return json;};
    const body={...fields,employeeId:employee.id,requestKey:randomUUID()};
    await call('/patterns/preview',401,{actor:null,method:'POST',body});await call('/patterns',403,{actor:employee,method:'POST',body});await call('/patterns',403,{actor:executive,method:'POST',body});
    await call('/patterns/preview',404,{actor:leader,method:'POST',body:{...body,employeeId:foreign.id}});
    await call('/patterns',400,{method:'POST',body:{...body,departmentId:a.id}});await call('/patterns/preview',400,{method:'POST',body:{...body,startDate:'2026-02-30'}});
    const manual=await call('',201,{method:'POST',body:{employeeId:employee.id,requestKey:randomUUID(),kind:'SHIFT',startLocal:'2026-09-24T10:00',endLocal:'2026-09-24T12:00',timezone:'Europe/Moscow',breakMinutes:0,note:'Индивидуальное исключение'}});
    await call('/'+manual.id+'/status',201,{method:'POST',body:{version:1,status:'PUBLISHED',reason:'Исключение'}});
    const preview=await call('/patterns/preview',201,{actor:leader,method:'POST',body});assert.equal(preview.items.length,35);assert.equal(preview.permanent,true);assert.equal(preview.items.filter(row=>row.overridden).length,1);assert.equal(await tx.crmWorkPattern.count({where:{employeeId:employee.id}}),0);
    const draft=await call('/patterns',201,{actor:leader,method:'POST',body:{...body,status:'DRAFT'}});id=draft.id;assert.equal(draft.endDate,null);assert.ok(!('requestKey'in draft));
    assert.equal((await call('/patterns',201,{actor:leader,method:'POST',body:{...body,status:'DRAFT'}})).id,id);
    await call('/patterns',409,{actor:leader,method:'POST',body});await call('/patterns/'+id,404,{actor:employee});
    const hidden=await call('?month=2026-10',200,{actor:employee});assert.equal(hidden.patterns.length,0);assert.equal(hidden.items.length,0);
    await call('/patterns/'+id+'/action',201,{actor:leader,method:'POST',body:{version:1,action:'PUBLISH',reason:'Утверждён'}});
    const own=await call('/patterns/'+id,200,{actor:employee});assert.equal(own.canEnd,false);assert.deepEqual(own.events.map(event=>event.action),['PUBLISH']);
    await call('/patterns/'+id,404,{actor:peer});await call('/patterns/'+id,404,{actor:foreign});await call('/patterns/'+id,200,{actor:executive});
    const month=await call('?month=2026-09',200,{actor:employee});assert.equal(month.items.length,7);assert.equal(month.totals.publishedMinutes,1560);assert.ok(!month.items.some(row=>row.patternId&&row.occurrenceDate==='2026-09-24'));assert.equal(month.warnings.length,0);
    const future=await call('?month=2050-06',200,{actor:employee});assert.equal(future.items.length,30);assert.ok(future.items.every(row=>row.patternId===id));assert.equal(await tx.crmWorkSchedule.count({where:{employeeId:employee.id}}),1,'GET never materializes future shifts');
    await call('/patterns/preview',409,{actor:leader,method:'POST',body:{...body,startDate:'2050-06-01',requestKey:randomUUID()}});
    await call('/patterns',409,{actor:leader,method:'POST',body:{...body,startDate:'2050-06-01',requestKey:randomUUID()}});
    await call('/patterns/'+id+'/action',403,{actor:employee,method:'POST',body:{version:2,action:'END',endDate:'2090-09-30',reason:'Попытка'}});
    await call('/patterns/'+id+'/action',400,{actor:leader,method:'POST',body:{version:2,action:'END',endDate:'2020-01-01',reason:'Нельзя менять прошлое'}});
    await call('/patterns/'+id+'/action',409,{actor:leader,method:'POST',body:{version:1,action:'END',endDate:'2090-09-30',reason:'Конфликт'}});
    await call('/patterns/'+id+'/action',201,{actor:leader,method:'POST',body:{version:2,action:'END',endDate:'2090-09-30',reason:'Смена режима'}});
    assert.equal((await call('?month=2090-10',200,{actor:employee})).items.length,0);
    assert.equal((await call('?month=2026-09',200,{actor:employee})).totals.publishedMinutes,1560);
    const next=await call('/patterns',201,{actor:leader,method:'POST',body:{...body,startDate:'2090-10-01',pattern:'CYCLE_3_3',requestKey:randomUUID()}});
    assert.equal((await call('?month=2091-01',200,{actor:employee})).items.length,31);
    await call('/patterns/'+next.id+'/action',201,{actor:leader,method:'POST',body:{version:1,action:'CANCEL',reason:'Будущий график не нужен'}});
    assert.equal((await call('?month=2091-01',200,{actor:employee})).items.length,0);
    // Draft manual records cannot erase a published rule visible to its employee.
    const reserve=await call('',201,{method:'POST',body:{employeeId:employee.id,requestKey:randomUUID(),kind:'DAY_OFF',startLocal:'2026-09-25T00:00',endLocal:'2026-09-26T00:00',timezone:'Europe/Moscow',breakMinutes:0,note:'Отгул'}});
    assert.ok((await call('?month=2026-09',200,{actor:employee})).items.some(row=>row.patternId===id&&row.occurrenceDate==='2026-09-25'));
    await call('/'+reserve.id+'/status',201,{method:'POST',body:{version:1,status:'PUBLISHED',reason:'Согласован отгул'}});
    assert.ok(!(await call('?month=2026-09',200,{actor:employee})).items.some(row=>row.patternId===id&&row.occurrenceDate==='2026-09-25'));
    await tx.user.update({where:{id:employee.id},data:{departmentId:b.id}});await call('/patterns/'+id,404,{actor:leader});await call('/patterns/'+id,200,{actor:employee});
    assert.equal((await call('?month=2026-09',200,{actor:leader})).patterns.length,0);
    const read=await tx.permission.findUnique({where:{key:'work_schedule.read'}});await tx.userPermission.create({data:{userId:admin.id,permissionId:read.id,effect:'DENY'}});await call('/patterns/'+id,403);
    await app.close();app=null;throw rollback;
  },{timeout:90000});}catch(error){if(error!==rollback)throw error;}finally{if(app)await app.close();if(id)assert.equal(await db.crmWorkPattern.count({where:{id}}),0);await db.$disconnect();}
  console.log(`Work patterns HTTP/SQL PASS: ${checks} checks, permanent future expansion without GET writes, preview, manual priority, cycle/stop/history, idempotency, scopes/transfer/DENY; fixtures rolled back.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
