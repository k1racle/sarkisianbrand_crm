import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContentCreateDto, ContentListDto, ContentUpdateDto } from './content.dto';
import { CrmReadAccess, CrmReadPolicy } from './read-access';
import { driveWhere } from './drive-access';
export const contentRoles: UserRole[] = ['ADMIN','SUPERVISOR','EXECUTIVE','CONTENT_MANAGER','MANAGER_SALES','MANAGER_B2B'];
const person = { id:true, firstName:true, lastName:true, email:true } as const;
const include = (read: CrmReadPolicy) => ({ task:{ select:{ id:true,title:true,status:true,progress:true,dueDate:true,assignedToId:true,assignedTo:{select:person}, _count:{select:{comments:true,files:{where:{node:{AND:[driveWhere(read,'TEAM'),{deletedAt:null}]}}},children:{where:read.tasks()}}} } } });
export function contentTimezone(value:string) { try { new Intl.DateTimeFormat('ru',{timeZone:value}).format();return value; } catch { throw new BadRequestException('Укажите существующий часовой пояс'); } }
export function contentUrl(value:string) { if(!value)return '';try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error();return url.href;}catch{throw new BadRequestException('Укажите полную ссылку на публикацию: https://…');} }
@Injectable()
export class CrmContentService {
 constructor(private readonly prisma:PrismaService,private readonly access:CrmReadAccess) {}
 private read<T>(fn:(db:Prisma.TransactionClient)=>Promise<T>){return this.prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});}
 team(actor:string){return this.read(async db=>{const read=await this.access.resolve(db,actor,'content_plan.read');const write=read.allowed('content_plan.write')?await this.access.resolve(db,actor,'content_plan.write'):null;return db.user.findMany({where:{AND:[{isActive:true,role:{in:contentRoles}},read.assignees(),...(write?[write.assignees()]:[])]},select:person,orderBy:[{firstName:'asc'},{id:'asc'}]});});}
 private async assignee(db:Prisma.TransactionClient,id:string,read:CrmReadPolicy,write:CrmReadPolicy){if(!await db.user.findFirst({where:{AND:[{id,isActive:true,role:{in:contentRoles}},read.assignees(),write.assignees()]},select:{id:true}}))throw new BadRequestException('Выберите доступного активного сотрудника команды');}
 private write<T>(fn:(db:Prisma.TransactionClient)=>Promise<T>){return this.prisma.$transaction(async db=>{await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;await db.$executeRaw`SELECT pg_advisory_xact_lock(73422109)`;await db.$executeRaw`SELECT pg_advisory_xact_lock(73422111)`;await db.$executeRaw`SELECT pg_advisory_xact_lock(73422110)`;return fn(db);},{timeout:15000});}
 private async policies(db:Prisma.TransactionClient,actor:string,permission='content_plan.write'){return {read:await this.access.resolve(db,actor,'content_plan.read'),write:await this.access.resolve(db,actor,permission)};}
 private async find(db:Prisma.TransactionClient,id:string,read:CrmReadPolicy,write?:CrmReadPolicy){const row=await db.crmPublication.findFirst({where:{id,task:{AND:[read.tasks(),...(write?[write.tasks()]:[])]}},include:include(read)});if(!row)throw new NotFoundException('Публикация не найдена или недоступна');return row;}
 get(id:string,actor:string){return this.read(async db=>this.find(db,id,await this.access.resolve(db,actor,'content_plan.read')));}
 async list(dto:ContentListDto,actor:string){
  if(dto.from&&dto.to&&new Date(dto.from)>=new Date(dto.to))throw new BadRequestException('Некорректный период');
  return this.read(async db=>{const read=await this.access.resolve(db,actor,'content_plan.read');
  const where:Prisma.CrmPublicationWhereInput={archivedAt:dto.archived==='true'?{not:null}:null,platform:dto.platform,status:dto.status,
   task:{AND:[read.tasks(),{assignedToId:dto.assignedToId,...(dto.search?.trim()?{title:{contains:dto.search.trim(),mode:'insensitive' as const}}:{})}]},
   ...(dto.from||dto.to?{OR:[{scheduledAt:null},{scheduledAt:{gte:dto.from?new Date(dto.from):undefined,lt:dto.to?new Date(dto.to):undefined}}]}:{})};
  const [items,total]=await Promise.all([db.crmPublication.findMany({where,include:include(read),orderBy:[{scheduledAt:'asc'},{id:'asc'}],skip:dto.offset||0,take:100}),db.crmPublication.count({where})]);return {items,total};});
 }
 async create(dto:ContentCreateDto,actor:string){
  if(!dto.title.trim())throw new BadRequestException('Введите название публикации');
  const timezone=contentTimezone(dto.timezone||'Europe/Moscow');
  return this.write(async db=>{
   const {read,write}=await this.policies(db,actor);
   const assignedToId=dto.assignedToId||actor;await this.assignee(db,assignedToId,read,write);
   const source=dto.sourceId?await this.find(db,dto.sourceId,read):null;
   const sourceFiles=source?await db.crmTaskFile.findMany({where:{taskId:source.taskId,node:{scope:'TEAM',deletedAt:null}},select:{nodeId:true}}):[];
   if(sourceFiles.length&&await db.crmDriveNode.count({where:{AND:[{id:{in:sourceFiles.map(file=>file.nodeId)}},driveWhere(read,'TEAM',write)]}})!==sourceFiles.length)throw new NotFoundException('Материалы исходной публикации недоступны');
   const task=await db.task.create({data:{title:dto.title.trim(),assignedToId,createdById:actor,labels:['SMM'],dueDate:dto.scheduledAt?new Date(dto.scheduledAt):null,description:'Подготовка публикации. Сценарий и согласование — в контент-плане.'}});
   const row=await db.crmPublication.create({data:{taskId:task.id,ideaId:source?.ideaId||randomUUID(),platform:dto.platform,format:dto.format,campaign:dto.campaign||'',brief:dto.brief||'',script:dto.script||'',caption:dto.caption||'',cta:dto.cta||'',timezone,scheduledAt:dto.scheduledAt?new Date(dto.scheduledAt):null},include:include(read)});
   if(sourceFiles.length)await db.crmTaskFile.createMany({data:sourceFiles.map(f=>({taskId:task.id,nodeId:f.nodeId}))});
   await this.reminder(db,task.id,assignedToId,row.scheduledAt);return this.find(db,row.id,read,write);
  });
 }
 private check(row:any,version:number){if(row.version!==version)throw new ConflictException('Публикация уже изменена другим сотрудником. Откройте свежую версию; ваш черновик сохранён в форме.');}
 async update(id:string,dto:ContentUpdateDto,actor:string){return this.write(async db=>{
  const {read,write}=await this.policies(db,actor);const row=await this.find(db,id,read,write);this.check(row,dto.version);if(row.archivedAt)throw new BadRequestException('Сначала восстановите публикацию из архива');
  if(dto.sourceId)throw new BadRequestException('Источник задаётся только при создании версии');
  if(dto.title!==undefined&&!dto.title.trim())throw new BadRequestException('Введите название публикации');
  if(dto.assignedToId)await this.assignee(db,dto.assignedToId,read,write);
  const data:any={version:{increment:1}};
  for(const key of ['platform','format','campaign','brief','script','caption','cta'] as const)if(dto[key]!==undefined)data[key]=dto[key];
  if(dto.timezone!==undefined)data.timezone=contentTimezone(dto.timezone);
  if(dto.scheduledAt!==undefined)data.scheduledAt=dto.scheduledAt?new Date(dto.scheduledAt):null;
  if(dto.publishedUrl!==undefined)data.publishedUrl=contentUrl(dto.publishedUrl.trim());
  const contentChanged=(dto.title!==undefined&&dto.title.trim()!==row.task.title)||['platform','format','brief','script','caption','cta'].some(k=>data[k]!==undefined&&data[k]!==row[k]);
  const next=dto.status||row.status;
  if(next==='REVIEW'&&row.status!=='REVIEW'){data.approvedAt=null;data.approvedById=null;}
  if(row.status==='PUBLISHED'&&contentChanged&&next==='PUBLISHED')throw new BadRequestException('Для правки опубликованного материала сначала верните его на согласование');
  if(contentChanged){data.approvedAt=null;data.approvedById=null;}
  const approved=!contentChanged&&row.approvedAt;
  if(['SCHEDULED','PUBLISHED'].includes(next)){
   if(!approved)throw new BadRequestException('Сначала согласуйте актуальный сценарий и текст');
   if(!(data.scheduledAt===undefined?row.scheduledAt:data.scheduledAt))throw new BadRequestException('Укажите дату и время публикации');
   if(next==='PUBLISHED'&&!(data.publishedUrl===undefined?row.publishedUrl:data.publishedUrl))throw new BadRequestException('Добавьте ссылку на опубликованный материал');
  }
  data.status=next;
  if(next==='PUBLISHED'&&await db.task.count({where:{parentId:row.taskId,status:{notIn:['DONE','CANCELLED']}}}))throw new BadRequestException('Завершите подзадачи подготовки перед отметкой о публикации');
  await db.task.update({where:{id:row.taskId},data:{title:dto.title?.trim(),assignedToId:dto.assignedToId,dueDate:data.scheduledAt,
   ...(next==='PUBLISHED'?{status:'DONE',progress:100,completedAt:new Date()}:row.status==='PUBLISHED'?{status:'IN_PROGRESS',completedAt:null,progress:0}:{})}});
  if(dto.scheduledAt!==undefined||dto.assignedToId!==undefined)await this.reminder(db,row.taskId,dto.assignedToId||row.task.assignedToId,data.scheduledAt===undefined?row.scheduledAt:data.scheduledAt);
  if(next==='PUBLISHED')await db.crmTaskReminder.deleteMany({where:{taskId:row.taskId,deliveredAt:null}});
  if(next!==row.status)await db.crmTaskComment.create({data:{taskId:row.taskId,authorId:actor,body:`Этап публикации: ${this.statusName(row.status)} → ${this.statusName(next)}.`}});
  await db.crmPublication.update({where:{id},data});return this.find(db,id,read,write);
 });}
 private statusName(value:string){return ({IDEA:'Идея',SCRIPT:'Сценарий',SHOOTING:'Съёмка',EDITING:'Монтаж',REVIEW:'Согласование',SCHEDULED:'Готово к публикации',PUBLISHED:'Опубликовано'} as any)[value]||value;}
 async approve(id:string,version:number,actor:string){return this.write(async db=>{const {read,write}=await this.policies(db,actor,'content_plan.approve');const row=await this.find(db,id,read,write);this.check(row,version);if(row.archivedAt||row.status!=='REVIEW')throw new BadRequestException('На согласование отправляются материалы на этапе «Согласование»');
  await db.crmTaskComment.create({data:{taskId:row.taskId,authorId:actor,body:'Сценарий и текст публикации согласованы.'}});
  return db.crmPublication.update({where:{id},data:{approvedAt:new Date(),approvedById:actor,version:{increment:1}},include:include(read)});
 });}
 archive(id:string,version:number,restore:boolean,actor:string){return this.write(async db=>{const {read,write}=await this.policies(db,actor);const row=await this.find(db,id,read,write);this.check(row,version);const result=await db.crmPublication.update({where:{id},data:{archivedAt:restore?null:new Date(),version:{increment:1}},include:include(read)});if(!restore)await db.crmTaskReminder.deleteMany({where:{taskId:row.taskId,deliveredAt:null}});else await this.reminder(db,row.taskId,row.task.assignedToId,row.scheduledAt);return result;});}
 private async reminder(db:any,taskId:string,recipientId:string,at:Date|null){await db.crmTaskReminder.deleteMany({where:{taskId,deliveredAt:null}});if(at&&at.getTime()>Date.now()){const remindAt=new Date(Math.max(Date.now(),at.getTime()-3600000));await db.crmTaskReminder.upsert({where:{taskId_recipientId_remindAt:{taskId,recipientId,remindAt}},create:{taskId,recipientId,remindAt},update:{}});}}
}
