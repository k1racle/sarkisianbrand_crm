import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmPaymentPlan, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { employeeAccess } from '../auth/employee-access';
import { calendarDate, companyToday, dateKey, dueDates } from './payment-calendar.policy';
import { CreatePaymentPlanDto, PaymentCalendarQueryDto, PaymentPlanFieldsDto, SetPlannedPaymentDto, UpdatePaymentPlanDto } from './payment-calendar.dto';

@Injectable()
export class PaymentCalendarService {
  constructor(private readonly prisma:PrismaService){}
  private async transaction<T>(fn:(db:Prisma.TransactionClient)=>Promise<T>):Promise<T>{
    try{return await this.prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});}
    catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&['P2034','P2002'].includes(e.code))throw new ConflictException('Данные уже изменены. Обновите карточку и повторите действие');throw e;}
  }
  private async actor(db:Prisma.TransactionClient,id:string,operation='read'){
    const user=await db.user.findUnique({where:{id},select:{id:true,role:true,accessProfileMode:true,isActive:true,departmentId:true,department:{select:{archivedAt:true}}}});
    if(!user?.isActive||!internalWorkspaceRoles.includes(user.role))throw new ForbiddenException('Нет доступа к финансам CRM');
    const [roles,overrides]=await Promise.all([db.rolePermission.findMany({where:{role:user.role},select:{permission:{select:{key:true}}}}),db.userPermission.findMany({where:{userId:id},select:{effect:true,permission:{select:{key:true}}}})]);
    const permissions=new Set((await employeeAccess(db,user,roles,overrides)).permissions);
    if(!permissions.has('payment_calendar.read')||!permissions.has('payment_calendar.'+operation))throw new ForbiddenException('Нет разрешения на эту операцию календаря платежей');
    return {...user,permissions,company:['ADMIN','EXECUTIVE'].includes(user.role),departmentId:user.department&&!user.department.archivedAt?user.departmentId:null};
  }
  private where(actor:Awaited<ReturnType<PaymentCalendarService['actor']>>):Prisma.CrmPaymentPlanWhereInput {
    return actor.company?{}:{OR:[{visibility:'PERSONAL',ownerId:actor.id},...(actor.departmentId?[{visibility:'DEPARTMENT',departmentId:actor.departmentId}]:[])]};
  }
  private view(row:CrmPaymentPlan,locked:boolean){
    const {requestKey,requestHash,...safe}=row;
    return {...safe,startDate:dateKey(row.startDate),endDate:row.endDate?dateKey(row.endDate):null,scheduleLocked:locked};
  }
  private fields(dto:PaymentPlanFieldsDto){
    const startDate=calendarDate(dto.startDate),endDate=dto.endDate?calendarDate(dto.endDate):null;
    if(endDate&&endDate<startDate)throw new BadRequestException('Дата окончания не может быть раньше первого платежа');
    if(dto.frequency==='ONCE'&&(dto.interval!==1||endDate))throw new BadRequestException('Для разового платежа не задаются интервал и окончание повторений');
    return {title:dto.title.trim(),vendor:dto.vendor.trim(),category:dto.category,notes:dto.notes.trim(),amountCents:dto.amountCents,startDate,endDate,frequency:dto.frequency,interval:dto.interval,visibility:dto.visibility};
  }
  private digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
  private async scope(db:Prisma.TransactionClient,actor:Awaited<ReturnType<PaymentCalendarService['actor']>>,visibility:string,previous?:CrmPaymentPlan){
    if(visibility==='COMPANY'&&!actor.company)throw new ForbiddenException('Общие расходы компании задаёт администратор или высшее руководство с правом изменения');
    if(visibility!=='DEPARTMENT')return null;
    const departmentId=previous?.visibility==='DEPARTMENT'?previous.departmentId:actor.departmentId;
    if(!departmentId||!await db.crmDepartment.count({where:{id:departmentId,archivedAt:null}}))throw new BadRequestException('Для плана отдела нужен действующий отдел сотрудника');
    return departmentId;
  }
  private async row(db:Prisma.TransactionClient,actor:Awaited<ReturnType<PaymentCalendarService['actor']>>,id:string){
    const row=await db.crmPaymentPlan.findFirst({where:{AND:[{id},this.where(actor)]}});
    if(!row)throw new NotFoundException('План платежа не найден');return row;
  }
  async list(id:string,query:PaymentCalendarQueryDto){
    const from=calendarDate(query.month+'-01'),to=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+1,0)),today=companyToday();
    return this.transaction(async db=>{
      const actor=await this.actor(db,id);
      const plans=await db.crmPaymentPlan.findMany({where:this.where(actor),orderBy:[{title:'asc'},{id:'asc'}],take:501,include:{_count:{select:{payments:true}},payments:{where:{dueDate:{gte:from,lte:to}}}}});
      if(plans.length>500)throw new BadRequestException('Слишком много планов для одной выборки. Требуется расширение постраничного реестра');
      const items=plans.flatMap(plan=>{
        const dates=new Set([...dueDates(plan,from,to),...plan.payments.filter(payment=>payment.paidOn).map(payment=>dateKey(payment.dueDate))]);
        return [...dates].map(dueDate=>{
          const payment=plan.payments.find(payment=>dateKey(payment.dueDate)===dueDate),paid=Boolean(payment?.paidOn);
          return {planId:plan.id,dueDate,title:paid?payment!.title:plan.title,vendor:paid?payment!.vendor:plan.vendor,category:paid?payment!.category:plan.category,amountCents:paid?payment!.amountCents:plan.amountCents,
            paidOn:payment?.paidOn?dateKey(payment.paidOn):null,status:paid?'PAID':dueDate<today?'OVERDUE':'PLANNED',version:payment?.version||0,planVersion:plan.version};
        });
      }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.title.localeCompare(b.title)||a.planId.localeCompare(b.planId));
      const totals={plannedCents:0,paidCents:0,outstandingCents:0,overdueCents:0};
      for(const item of items){totals.plannedCents+=item.amountCents;if(item.paidOn)totals.paidCents+=item.amountCents;else{totals.outstandingCents+=item.amountCents;if(item.status==='OVERDUE')totals.overdueCents+=item.amountCents;}}
      return {items,plans:plans.map(({payments,_count,...plan})=>this.view(plan,_count.payments>0)),totals,today,timezone:'Europe/Moscow',currency:'RUB',canWrite:actor.permissions.has('payment_calendar.write'),canSettle:actor.permissions.has('payment_calendar.settle'),visibilities:['PERSONAL',...(actor.departmentId?['DEPARTMENT']:[]),...(actor.company?['COMPANY']:[])]};
    });
  }
  async detail(id:string,planId:string){return this.transaction(async db=>{
    const actor=await this.actor(db,id),row=await this.row(db,actor,planId);
    return this.view(row,Boolean(await db.crmPlannedPayment.count({where:{planId}})));
  });}
  async create(id:string,dto:CreatePaymentPlanDto){return this.transaction(async db=>{
    const actor=await this.actor(db,id,'write'),fields=this.fields(dto),hash=this.digest(fields);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('payment-calendar-create'))`;
    const existing=await db.crmPaymentPlan.findUnique({where:{ownerId_requestKey:{ownerId:id,requestKey:dto.requestKey}}});
    if(existing){await this.row(db,actor,existing.id);if(existing.requestHash!==hash)throw new ConflictException('Ключ сохранения уже использован для другого плана');return this.view(existing,Boolean(await db.crmPlannedPayment.count({where:{planId:existing.id}})));}
    if(await db.crmPaymentPlan.count()>=500)throw new ConflictException('Достигнут предел 500 планов. Обратитесь к администратору');
    const departmentId=await this.scope(db,actor,dto.visibility);
    const row=await db.crmPaymentPlan.create({data:{...fields,ownerId:id,departmentId,requestKey:dto.requestKey,requestHash:hash}});
    await db.auditLog.create({data:{actorId:id,resource:'crm.payment_plan',resourceId:row.id,action:'CREATE',payload:{version:1}}});return this.view(row,false);
  });}
  async update(id:string,planId:string,dto:UpdatePaymentPlanDto){return this.transaction(async db=>{
    const actor=await this.actor(db,id,'write');await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-plan:${planId}`}))`;
    const row=await this.row(db,actor,planId),fields=this.fields(dto);
    if(row.version!==dto.version)throw new ConflictException('План уже изменён. Обновите карточку; черновик пока сохранён');
    const locked=Boolean(await db.crmPlannedPayment.count({where:{planId}}));
    if(locked&&(dateKey(row.startDate)!==dto.startDate||row.frequency!==dto.frequency||row.interval!==dto.interval))throw new BadRequestException('После отметки оплаты дата начала и периодичность неизменны. Укажите окончание текущего плана и создайте новый');
    const departmentId=await this.scope(db,actor,dto.visibility,row);
    const updated=await db.crmPaymentPlan.update({where:{id:planId},data:{...fields,departmentId,version:{increment:1}}});
    await db.auditLog.create({data:{actorId:id,resource:'crm.payment_plan',resourceId:planId,action:'UPDATE',payload:{fromVersion:row.version,version:updated.version}}});return this.view(updated,locked);
  });}
  async settle(id:string,planId:string,dto:SetPlannedPaymentDto){return this.transaction(async db=>{
    const actor=await this.actor(db,id,'settle');await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-plan:${planId}`}))`;
    const plan=await this.row(db,actor,planId),dueDate=calendarDate(dto.dueDate),where={planId_dueDate:{planId,dueDate}};
    const existing=await db.crmPlannedPayment.findUnique({where}),hash=this.digest(dto);
    if(existing?.requestKey===dto.requestKey){if(existing.requestHash!==hash)throw new ConflictException('Повторный запрос отличается от сохранённого');return {version:existing.version};}
    if(plan.version!==dto.planVersion||(existing?.version||0)!==dto.version)throw new ConflictException('Платёж или план изменены. Обновите календарь');
    if(!dueDates(plan,dueDate,dueDate).length&&!existing?.paidOn)throw new BadRequestException('Такой даты нет в расписании платежей');
    if(Boolean(existing?.paidOn)===dto.paid)throw new ConflictException('Состояние платежа уже изменено');
    const paidOn=dto.paid?calendarDate(dto.paidOn||''):null;
    if(paidOn&&dateKey(paidOn)>companyToday())throw new BadRequestException('Дата оплаты не может быть в будущем');
    if(!dto.paid&&!dto.reason.trim())throw new BadRequestException('Укажите причину исправления отметки');
    const data={paidOn,amountCents:dto.paid?plan.amountCents:existing!.amountCents,title:dto.paid?plan.title:existing!.title,vendor:dto.paid?plan.vendor:existing!.vendor,category:dto.paid?plan.category:existing!.category,requestKey:dto.requestKey,requestHash:hash};
    const row=existing?await db.crmPlannedPayment.update({where,data:{...data,version:{increment:1}}}):await db.crmPlannedPayment.create({data:{...data,planId,dueDate}});
    await db.auditLog.create({data:{actorId:id,resource:'crm.payment_plan',resourceId:planId,action:dto.paid?'PAYMENT_MARKED':'PAYMENT_CORRECTED',payload:{dueDate:dto.dueDate,paidOn:dto.paidOn||null,amountCents:data.amountCents,reason:dto.reason.trim(),version:row.version}}});
    return {version:row.version};
  });}
}
