import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { employeeAccess } from '../auth/employee-access';
import { KnowledgeCreateDto, KnowledgeQueryDto, KnowledgeUpdateDto } from './knowledge.dto';
const roles=['ADMIN','IT_SUPPORT','SUPERVISOR','EXECUTIVE'];
@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma:PrismaService){}
  private async access(db:Prisma.TransactionClient,id:string){
    const actor=await db.user.findUnique({where:{id},select:{role:true,accessProfileMode:true,isActive:true}});
    if(!actor?.isActive||!roles.includes(actor.role))throw new ForbiddenException('Нет доступа к базе знаний');
    const [grants,overrides]=await Promise.all([db.rolePermission.findMany({where:{role:actor.role},select:{permission:{select:{key:true}}}}),db.userPermission.findMany({where:{userId:id},select:{effect:true,permission:{select:{key:true}}}})]);
    const permissions=(await employeeAccess(db,{...actor,id},grants,overrides)).permissions;
    if(!permissions.includes('helpdesk.read'))throw new ForbiddenException('Нет доступа к базе знаний');
    return {canWrite:permissions.includes('knowledge.write')};
  }
  list(actorId:string,query:KnowledgeQueryDto){return this.prisma.$transaction(async db=>{
    const access=await this.access(db,actorId);
    if(!access.canWrite&&query.status!=='PUBLISHED')throw new ForbiddenException('Черновики и архив доступны редакторам');
    const baseWhere:Prisma.CrmKnowledgeArticleWhereInput={...(query.status==='ALL'?{}:{status:query.status}),...(query.search?{OR:['title','category','body'].map(field=>({[field]:{contains:query.search,mode:Prisma.QueryMode.insensitive}}))}:{})};
    const where:Prisma.CrmKnowledgeArticleWhereInput={...baseWhere,...(query.category?{category:query.category}:{})};
    const total=await db.crmKnowledgeArticle.count({where}),pages=Math.max(1,Math.ceil(total/20)),page=Math.min(query.page,pages);
    const rows=await db.crmKnowledgeArticle.findMany({where,select:{id:true,title:true,category:true,body:true,status:true,version:true,updatedAt:true},orderBy:[{updatedAt:'desc'},{id:'asc'}],skip:(page-1)*20,take:20});
    // Facets cover every matching page, without restricting the other sections.
    const groups=await db.crmKnowledgeArticle.groupBy({by:['category'],where:baseWhere,_count:{_all:true},orderBy:{category:'asc'}});
    const items=rows.map(({body,...article})=>{const text=body.replace(/\s+/g,' ').trim();return {...article,excerpt:text.length>180?text.slice(0,180)+'…':text};});
    const categories=groups.map(group=>({name:group.category,count:group._count._all}));
    return {items,categories,total,page,pages,...access};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});}
  detail(actorId:string,id:string){return this.prisma.$transaction(async db=>{
    const access=await this.access(db,actorId),article=await db.crmKnowledgeArticle.findFirst({where:{id,...(!access.canWrite?{status:'PUBLISHED'}:{})}});
    if(!article)throw new NotFoundException('Статья не найдена');return {...article,...access};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});}
  create(actorId:string,dto:KnowledgeCreateDto){return this.prisma.$transaction(async db=>{
    if(!(await this.access(db,actorId)).canWrite)throw new ForbiddenException('Нет права редактирования базы знаний');
    const article=await db.crmKnowledgeArticle.create({data:{title:dto.title,category:dto.category,body:dto.body,createdById:actorId}});
    await db.auditLog.create({data:{actorId,resource:'crm.knowledge',resourceId:article.id,action:'CREATE',payload:{version:article.version,status:article.status}}});return article;
  });}
  update(actorId:string,id:string,dto:KnowledgeUpdateDto){return this.prisma.$transaction(async db=>{
    if(!(await this.access(db,actorId)).canWrite)throw new ForbiddenException('Нет права редактирования базы знаний');
    const result=await db.crmKnowledgeArticle.updateMany({where:{id,version:dto.version},data:{title:dto.title,category:dto.category,body:dto.body,status:dto.status,version:{increment:1}}});
    if(result.count!==1)throw new ConflictException('Статья уже изменена или недоступна. Обновите её перед сохранением');
    await db.auditLog.create({data:{actorId,resource:'crm.knowledge',resourceId:id,action:'UPDATE',payload:{version:dto.version+1,status:dto.status}}});return db.crmKnowledgeArticle.findUniqueOrThrow({where:{id}});
  });}
}
