import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmTimesheetPeriod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { TimesheetActionDto, TimesheetQueryDto } from './timesheet.dto';
import { calculateWorkTimePlan } from './work-time-plan';
import { correctionTouches, sheetDays, sheetEmployee, sheetSummary } from './timesheet.policy';
import { timeTotals, timeZone } from './work-time.policy';
import { closingBlockers, lockTimeEmployee, requireSheetTransition, sheetHash } from './timesheet-closing.policy';
const employeeSelect={id:true,firstName:true,lastName:true,isActive:true,departmentId:true,department:{select:{id:true,name:true,archivedAt:true}}} as const;
type Employee=Prisma.UserGetPayload<{select:typeof employeeSelect}>;
@Injectable()
export class TimesheetService {
  constructor(private readonly prisma:PrismaService){}
  private read<T>(run:(db:Prisma.TransactionClient)=>Promise<T>){return this.prisma.$transaction(run,{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});}
  private async actor(db:Prisma.TransactionClient,id:string){
    const user=await db.user.findUnique({where:{id},select:{id:true,firstName:true,lastName:true,isActive:true,role:true,accessProfileMode:true,timezone:true}});
    if(!user?.isActive || !internalWorkspaceRoles.includes(user.role))throw new ForbiddenException('Табель доступен руководителям команды');
    const [roles,overrides]=await Promise.all([db.rolePermission.findMany({where:{role:user.role},select:{permission:{select:{key:true}}}}),db.userPermission.findMany({where:{userId:id},select:{effect:true,permission:{select:{key:true}}}})]);
    const permissions=(await employeeAccess(db,user,roles,overrides)).permissions;
    if(!permissions.includes('work_time.read') || !permissions.includes('work_time.review'))throw new ForbiddenException('Нет доступа к табелю команды');
    const company=['ADMIN','EXECUTIVE'].includes(user.role);
    const departments=await db.crmDepartment.findMany({where:company?{}:{leaderId:id,archivedAt:null},select:{id:true,name:true,archivedAt:true},orderBy:[{name:'asc'},{id:'asc'}]});
    if(!company && !departments.length)throw new ForbiddenException('Нет доступных отделов для табеля');
    return {...user,company,departments,canPlan:permissions.includes('work_schedule.read'),canExport:permissions.includes('work_time.export'),timezone:timeZone(user.timezone)};
  }
  async options(id:string){return this.read(async db=>{const actor=await this.actor(db,id);return {departments:actor.departments,timezone:actor.timezone,company:actor.company,canExport:actor.canExport};});}
  private employeeWhere(actor:Awaited<ReturnType<TimesheetService['actor']>>,query:TimesheetQueryDto,employeeId?:string):Prisma.UserWhereInput{
    if(query.departmentId && !actor.departments.some(row=>row.id===query.departmentId))throw new NotFoundException('Отдел не найден');
    const words=(query.search||'').split(/\s+/).filter(Boolean);
    return {role:{in:internalWorkspaceRoles},...(employeeId?{id:employeeId}:{}),...(!actor.company?{isActive:true,departmentId:{in:actor.departments.map(row=>row.id)}}:{}),
      AND:[...(query.departmentId?[{departmentId:query.departmentId}]:[]),...words.map(word=>({OR:[{firstName:{contains:word,mode:Prisma.QueryMode.insensitive}},{lastName:{contains:word,mode:Prisma.QueryMode.insensitive}}]}))]};
  }
  private async calculate(db:Prisma.TransactionClient,actor:Awaited<ReturnType<TimesheetService['actor']>>,people:Employee[],month:string){
    const days=sheetDays(month,actor.timezone),period={start:days[0].start,end:days[days.length-1].end};
    const [clock]=await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`; const now=clock.now;
    if(!people.length)return {rows:[],sessions:[],corrections:[],hashes:new Map<string,string>(),now,period};
    // Apply the historical department boundary to EVERY input before calculating totals.
    const scope=actor.company?{employeeId:{in:people.map(row=>row.id)}}:{OR:people.map(row=>({employeeId:row.id,departmentId:row.departmentId}))};
    const sessionPeriod={startedAt:{lt:period.end},OR:[...(+now>+period.start?[{endedAt:null}]:[]),{endedAt:{gt:period.start}}]};
    const [sessions,manual,patterns,corrections]=await Promise.all([
      db.crmWorkSession.findMany({where:{AND:[scope,sessionPeriod]},include:{breaks:{orderBy:{startedAt:'asc'}}},orderBy:[{startedAt:'asc'},{id:'asc'}],take:20001}),
      actor.canPlan?db.crmWorkSchedule.findMany({where:{AND:[scope,{status:'PUBLISHED',startsAt:{lt:new Date(+period.end+2*86400000)},endsAt:{gt:new Date(+period.start-2*86400000)}}]},take:10001}):[],
      actor.canPlan?db.crmWorkPattern.findMany({where:{AND:[scope,{status:'PUBLISHED'}]},take:2001}):[],
      db.crmWorkTimeCorrection.findMany({where:{AND:[scope,{status:'PENDING'}]},select:{id:true,employeeId:true,startedAt:true,endedAt:true,original:true,baseVersion:true,session:{select:{version:true}}},take:5001}),
    ]);
    if(sessions.length>20000 || manual.length>10000 || patterns.length>2000 || corrections.length>5000)throw new BadRequestException('Слишком много данных для табеля. Выберите отдел или уточните сотрудника; частичные итоги не показаны');
    const grouped=<T extends {employeeId:string}>(items:T[])=>{const map=new Map<string,T[]>();for(const row of items){const bucket=map.get(row.employeeId)||[];bucket.push(row);map.set(row.employeeId,bucket);}return map;};
    const sessionGroups=grouped(sessions),manualGroups=grouped(manual),patternGroups=grouped(patterns),correctionGroups=grouped(corrections);
    const rows=people.map(employee=>{
      const plan=actor.canPlan?calculateWorkTimePlan(manualGroups.get(employee.id)||[],patternGroups.get(employee.id)||[],period):{available:false,plannedMs:null,shifts:null,intervals:[],warning:'Нет доступа к опубликованному графику'};
      return {employee,...sheetEmployee(sessionGroups.get(employee.id)||[],plan,correctionGroups.get(employee.id)||[],days,now)};
    });
    const sorted=(items:any[])=>[...items].sort((a,b)=>a.id.localeCompare(b.id));
    const hashes=new Map(people.map(employee=>[employee.id,sheetHash({employee,month,timezone:actor.timezone,
      sessions:sorted(sessionGroups.get(employee.id)||[]).map(row=>({...row,breaks:sorted(row.breaks)})),
      manual:sorted(manualGroups.get(employee.id)||[]),patterns:sorted(patternGroups.get(employee.id)||[]),
      corrections:sorted((correctionGroups.get(employee.id)||[]).filter(row=>correctionTouches(row,period.start,period.end,now)))} )]));
    return {rows,sessions,corrections,hashes,now,period};
  }
  private periodVisible(actor:Awaited<ReturnType<TimesheetService['actor']>>,employee:Employee,period:CrmTimesheetPeriod){
    return actor.company || period.departmentId===employee.departmentId;
  }
  private state(period:CrmTimesheetPeriod|null|undefined,hash?:string){return {status:period?.status||'DRAFT',revision:period?.revision||0,edition:period?.edition||1,stale:Boolean(period?.sourceHash&&period.status!=='CLOSED'&&period.sourceHash!==hash)};}
  private stored(period:CrmTimesheetPeriod,canPlan:boolean){
    const snapshot=JSON.parse(JSON.stringify(period.snapshot));
    if(!snapshot)throw new ConflictException('Сохранённая версия табеля недоступна. Обратитесь к администратору');
    if(!canPlan){snapshot.plannedMs=null;snapshot.planWarning='Нет доступа к опубликованному графику';snapshot.issues.planUnavailable=true;snapshot.needsAttention=true;for(const day of snapshot.days){day.plannedMs=null;day.issues.planUnavailable=true;}}
    return snapshot;
  }
  private snapshot(result:Awaited<ReturnType<TimesheetService['calculate']>>,month:string,timezone:string){
    return {month,timezone,serverTime:result.now,...result.rows[0],
      intervals:result.sessions.map(row=>({id:row.id,startedAt:row.startedAt,endedAt:row.endedAt,timezone:row.timezone,breaks:row.breaks.map(({startedAt,endedAt})=>({startedAt,endedAt})),periodTotals:timeTotals(row,result.now,result.period.start,result.period.end)})),
      corrections:result.corrections.filter(row=>correctionTouches(row,result.period.start,result.period.end,result.now)).map(row=>({id:row.id,stale:Boolean(row.session&&row.baseVersion!==row.session.version)}))};
  }
  async list(id:string,query:TimesheetQueryDto){return this.read(async db=>{
    const result=await this.collect(db,id,query,false);
    return {...result,items:result.items.slice((result.page-1)*25,result.page*25).map(({days,intervals,corrections,serverTime,...row})=>row)};
  });}
  async exportData(id:string,query:TimesheetQueryDto){return this.read(db=>this.collect(db,id,query,true));}
  private async collect(db:Prisma.TransactionClient,id:string,query:TimesheetQueryDto,exporting:boolean){
    const actor=await this.actor(db,id);
    if(exporting&&!actor.canExport)throw new ForbiddenException('Нет разрешения на экспорт табеля');
    const people=await db.user.findMany({where:this.employeeWhere(actor,query),select:employeeSelect,orderBy:[{lastName:'asc'},{firstName:'asc'},{id:'asc'}],take:201});
    if(people.length>200)throw new BadRequestException('В выборке больше 200 сотрудников. Выберите отдел или уточните имя для полного расчёта');
    const records=await db.crmTimesheetPeriod.findMany({where:{employeeId:{in:people.map(row=>row.id)},month:query.month}}),byPerson=new Map(records.map(row=>[row.employeeId,row]));
    const visible=people.filter(person=>!byPerson.has(person.id)||this.periodVisible(actor,person,byPerson.get(person.id)!));
    const rows:any[]=[],groups=new Map<string,Employee[]>();
    for(const person of visible){const saved=byPerson.get(person.id),tz=saved?.timezone||actor.timezone;
      if(saved?.status==='CLOSED')rows.push({...this.stored(saved,actor.canPlan),workflow:this.state(saved)});
      else {const bucket=groups.get(tz)||[];bucket.push(person);groups.set(tz,bucket);}}
    for(const [timezone,group] of groups){const result=await this.calculate(db,{...actor,timezone},group,query.month);rows.push(...result.rows.map(row=>({
      ...(exporting?this.snapshot({...result,rows:[row],sessions:result.sessions.filter(s=>s.employeeId===row.employee.id),corrections:result.corrections.filter(c=>c.employeeId===row.employee.id)},query.month,timezone):row),
      timezone,workflow:this.state(byPerson.get(row.employee.id),result.hashes.get(row.employee.id))})));}
    const order=new Map(people.map((row,index)=>[row.id,index]));rows.sort((a,b)=>order.get(a.employee.id)!-order.get(b.employee.id)!);
    const filtered=rows.filter(row=>query.view!=='ATTENTION'||row.needsAttention||row.workflow.stale),total=filtered.length,pages=Math.max(1,Math.ceil(total/25)),page=Math.min(query.page,pages);
    const [clock]=await db.$queryRaw<{now:Date}[]>`SELECT clock_timestamp() AS now`;
    if(exporting)await db.auditLog.create({data:{actorId:id,resource:'crm.timesheet',action:'EXPORT',payload:{month:query.month,departmentId:query.departmentId||null,view:query.view,total}}});
    return {month:query.month,timezone:actor.timezone,serverTime:clock.now,scope:actor.company?'COMPANY':'DEPARTMENTS',page,pages,total,summary:sheetSummary(filtered),items:filtered};
  }
  async detail(id:string,employeeId:string,month:string){return this.read(async db=>{
    const actor=await this.actor(db,id),employee=await db.user.findFirst({where:this.employeeWhere(actor,{month,page:1,view:'ALL'},employeeId),select:employeeSelect});
    if(!employee)throw new NotFoundException('Сотрудник не найден');
    const saved=await db.crmTimesheetPeriod.findUnique({where:{employeeId_month:{employeeId,month}}});
    if(saved&&!this.periodVisible(actor,employee,saved))throw new NotFoundException('Табель недоступен в текущем отделе');
    const events=saved?await db.crmTimesheetEvent.findMany({where:{periodId:saved.id},orderBy:{revision:'desc'},take:100,select:{revision:true,edition:true,action:true,actorName:true,reason:true,createdAt:true}}):[];
    if(saved?.status==='CLOSED')return {...this.stored(saved,actor.canPlan),workflow:{...this.state(saved),actions:actor.canPlan&&employeeId!==id?['REOPEN']:[],blockers:employeeId===id?['Свой табель должен переоткрыть другой руководитель.']:[],events}};
    const timezone=saved?.timezone||actor.timezone,result=await this.calculate(db,{...actor,timezone},[employee],month),hash=result.hashes.get(employeeId),state=this.state(saved,hash);
    const blockers=closingBlockers(result.rows[0],+result.now>=+result.period.end,actor.canPlan,employeeId===id);
    if(!actor.company){const full=await this.calculate(db,{...actor,timezone,company:true},[employee],month);if(full.hashes.get(employeeId)!==hash)blockers.push('Есть история другого отдела. Табель должен проверить администратор или высшее руководство.');}
    const actions=blockers.length?[]:['REVIEW',...(!state.stale&&state.status==='REVIEWED'?['APPROVE']:[]),...(!state.stale&&state.status==='APPROVED'?['CLOSE']:[])];
    return {...this.snapshot(result,month,timezone),workflow:{...state,actions,blockers,events}};
  });}
  async archive(id:string,employeeId:string,month:string,revision:number){return this.read(async db=>{
    const actor=await this.actor(db,id),employee=await db.user.findFirst({where:this.employeeWhere(actor,{month,page:1,view:'ALL'},employeeId),select:employeeSelect});
    const saved=employee?await db.crmTimesheetPeriod.findUnique({where:{employeeId_month:{employeeId,month}}}):null;
    if(!employee||!saved)throw new NotFoundException('Версия табеля не найдена');
    const event=await db.crmTimesheetEvent.findUnique({where:{periodId_revision:{periodId:saved.id,revision}}});
    const snapshot=event?.snapshot as any;
    if(event?.action!=='CLOSE'||!snapshot||!actor.company&&snapshot.employee.departmentId!==employee.departmentId)throw new NotFoundException('Версия табеля не найдена');
    return {...this.stored({...saved,snapshot},actor.canPlan),workflow:{status:'CLOSED',revision,edition:event.edition,stale:false,archived:true,actions:[],blockers:[],events:[]}};
  });}
  async act(id:string,employeeId:string,dto:TimesheetActionDto){
    const requestHash=sheetHash({employeeId,...dto});
    try{return await this.prisma.$transaction(async db=>{
      await lockTimeEmployee(db,employeeId);
      const actor=await this.actor(db,id),employee=await db.user.findFirst({where:this.employeeWhere(actor,{month:dto.month,page:1,view:'ALL'},employeeId),select:employeeSelect});
      if(!employee)throw new NotFoundException('Сотрудник не найден');
      if(employeeId===id)throw new ForbiddenException('Свой табель должен подтвердить другой руководитель');
      if(!actor.canPlan)throw new ForbiddenException('Для утверждения нужен доступ к опубликованному графику');
      const saved=await db.crmTimesheetPeriod.findUnique({where:{employeeId_month:{employeeId,month:dto.month}}});
      if(saved&&!this.periodVisible(actor,employee,saved))throw new NotFoundException('Табель недоступен в текущем отделе');
      const previous=await db.crmTimesheetEvent.findUnique({where:{actorId_requestKey:{actorId:id,requestKey:dto.requestKey}}});
      if(previous){if(previous.requestHash!==requestHash)throw new ConflictException('Ключ запроса уже использован с другими данными');return {revision:previous.revision,reused:true};}
      if((saved?.revision||0)!==dto.revision)throw new ConflictException('Табель уже изменён. Обновите карточку');
      requireSheetTransition(saved?.status||'DRAFT',dto.action,false);
      const timezone=saved?.timezone||actor.timezone,edition=(saved?.edition||1)+(dto.action==='REOPEN'?1:0),revision=(saved?.revision||0)+1;
      let snapshot:Prisma.InputJsonValue|typeof Prisma.DbNull=Prisma.DbNull,sourceHash:string|null=null;
      const days=sheetDays(dto.month,timezone),startsAt=days[0].start,endsAt=days[days.length-1].end;
      if(dto.action!=='REOPEN'){
        const result=await this.calculate(db,{...actor,timezone,company:true},[employee],dto.month);
        sourceHash=result.hashes.get(employeeId)!;
        if(!actor.company){const scoped=await this.calculate(db,{...actor,timezone},[employee],dto.month);if(scoped.hashes.get(employeeId)!==sourceHash)throw new ForbiddenException('Есть история другого отдела. Табель должен проверить администратор или высшее руководство');}
        const blockers=closingBlockers(result.rows[0],+result.now>=+endsAt,actor.canPlan,false);
        if(blockers.length)throw new ConflictException(blockers.join(' '));
        requireSheetTransition(saved?.status||'DRAFT',dto.action,Boolean(saved?.sourceHash&&saved.sourceHash!==sourceHash));
        snapshot=JSON.parse(JSON.stringify(this.snapshot(result,dto.month,timezone)));
      }
      const status={REVIEW:'REVIEWED',APPROVE:'APPROVED',CLOSE:'CLOSED',REOPEN:'DRAFT'}[dto.action];
      const fields={status,revision,edition,snapshot,sourceHash,departmentId:employee.departmentId};
      const period=saved?await db.crmTimesheetPeriod.update({where:{id:saved.id},data:fields}):await db.crmTimesheetPeriod.create({data:{...fields,employeeId,month:dto.month,timezone,startsAt,endsAt}});
      await db.crmTimesheetEvent.create({data:{periodId:period.id,revision,edition,action:dto.action,actorId:id,actorName:[actor.firstName,actor.lastName].filter(Boolean).join(' ')||'Сотрудник CRM',reason:dto.reason.trim(),requestKey:dto.requestKey,requestHash,snapshot:dto.action==='CLOSE'?snapshot:Prisma.DbNull}});
      await db.auditLog.create({data:{actorId:id,resource:'crm.timesheet',resourceId:period.id,action:dto.action,payload:{employeeId,month:dto.month,revision,edition,reason:dto.reason.trim()}}});
      return {revision,reused:false};
    },{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:30000});}
    catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&['P2002','P2034'].includes(e.code))throw new ConflictException('Табель изменяется другим сотрудником. Обновите карточку');throw e;}
  }
}
