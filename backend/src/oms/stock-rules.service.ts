import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { StockGroupDto, StockRuleDto, StockTargetQueryDto, StockFeedQueryDto } from './dto/stock-rules.dto';
const includeRule = { variant:{select:{id:true,sku:true,name:true,product:{select:{nameRu:true}}}},product:{select:{id:true,nameRu:true,sku:true}},category:{select:{id:true,nameRu:true}},group:{select:{id:true,name:true}},_count:{select:{states:{where:{triggered:true}}}} } as const;
@Injectable()
export class StockRulesService {
 constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
 private async run<T>(actor:string,write:boolean,fn:(db:Prisma.TransactionClient)=>Promise<T>) {
  try{return await this.prisma.$transaction(async db=>{
   if(write)await db.$executeRaw`SELECT pg_advisory_xact_lock(73422112)`;
   const key=write?'inventory.manage':'inventory.read', policy=await this.access.resolve(db,actor,key);
   if(!policy.company(key))throw new ForbiddenException('Настройки запасов требуют доступа ко всей компании');
   if(write)await db.$queryRaw`SELECT id FROM "ProductVariant" ORDER BY id FOR UPDATE`;
   return fn(db);
  },{isolationLevel:write?Prisma.TransactionIsolationLevel.Serializable:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});}
  catch(e:any){if(['P2034','P2002'].includes(e.code))throw new ConflictException('Данные изменились или название уже используется. Обновите список');throw e;}
 }
 private audit(db:Prisma.TransactionClient,actor:string,id:string,action:string,payload:any){return db.auditLog.create({data:{actorId:actor,resource:'inventory',resourceId:id,action,payload}});}
 list(actor:string){return this.run(actor,false,async db=>({
  rules:await db.inventoryStockRule.findMany({include:includeRule,orderBy:[{createdAt:'desc'},{id:'asc'}]}),
  groups:await db.inventoryStockGroup.findMany({include:{members:{include:{product:{select:{id:true,nameRu:true,sku:true}}}},_count:{select:{rules:true}}},orderBy:{name:'asc'}}),
  canManage:(await this.access.resolve(db,actor,'inventory.read')).company('inventory.manage'),
  externalDelivery:'NOT_CONNECTED',
 }));}
 targets(actor:string,q:StockTargetQueryDto){return this.run(actor,false,async db=>{
  const search=q.search?.trim(),contains=search?{contains:search,mode:'insensitive' as const}:undefined;
  if(q.kind==='GROUP')return (await db.inventoryStockGroup.findMany({where:{isActive:true,...(search?{name:contains}:{})},take:50,orderBy:{name:'asc'}})).map(x=>({id:x.id,label:x.name}));
  if(q.kind==='CATEGORY')return (await db.category.findMany({where:search?{nameRu:contains}:{},take:50,orderBy:{nameRu:'asc'}})).map(x=>({id:x.id,label:x.nameRu}));
  if(q.kind==='PRODUCT')return (await db.product.findMany({where:{productType:'PHYSICAL',...(search?{OR:[{nameRu:contains},{sku:contains}]}:{})},take:50,orderBy:{nameRu:'asc'}})).map(x=>({id:x.id,label:x.nameRu+' · '+x.sku}));
  return (await db.productVariant.findMany({where:{product:{productType:'PHYSICAL'},...(search?{OR:[{sku:contains},{name:contains},{product:{nameRu:contains}}]}:{})},include:{product:{select:{nameRu:true}}},take:50,orderBy:[{product:{nameRu:'asc'}},{sku:'asc'}]})).map(x=>({id:x.id,label:x.product.nameRu+' · '+x.name+' · '+x.sku}));
 });}
 saveRule(actor:string,id:string|undefined,dto:StockRuleDto){return this.run(actor,true,async db=>{
  if(!dto.name.trim())throw new BadRequestException('Укажите название сценария');
  const previous=id?await db.inventoryStockRule.findUnique({where:{id}}):null;
  if(id&&!previous)throw new NotFoundException('Сценарий не найден');
  if(previous&&previous.version!==dto.expectedVersion)throw new ConflictException('Сценарий изменился. Обновите данные');
  const target=dto.targetKind==='VARIANT'?await db.productVariant.findFirst({where:{id:dto.targetId,product:{productType:'PHYSICAL'}}}):dto.targetKind==='PRODUCT'?await db.product.findFirst({where:{id:dto.targetId,productType:'PHYSICAL'}}):dto.targetKind==='CATEGORY'?await db.category.findUnique({where:{id:dto.targetId}}):await db.inventoryStockGroup.findFirst({where:{id:dto.targetId,isActive:true}});
  if(!target)throw new BadRequestException('Выберите существующий товар, категорию или активную группу');
  const data={name:dto.name.trim(),variantId:dto.targetKind==='VARIANT'?dto.targetId:null,productId:dto.targetKind==='PRODUCT'?dto.targetId:null,categoryId:dto.targetKind==='CATEGORY'?dto.targetId:null,groupId:dto.targetKind==='GROUP'?dto.targetId:null,includeChildren:dto.includeChildren,threshold:dto.threshold,basis:dto.basis,channels:[...dto.channels].sort(),autoResume:dto.autoResume,isEnabled:dto.isEnabled};
  const saved=previous?await db.inventoryStockRule.update({where:{id},data:{...data,version:{increment:1}},include:includeRule}):await db.inventoryStockRule.create({data,include:includeRule});
  await this.audit(db,actor,saved.id,previous?'STOCK_RULE_UPDATE':'STOCK_RULE_CREATE',{before:previous,after:data});return saved;
 });}
 deleteRule(actor:string,id:string,version:number){return this.run(actor,true,async db=>{
  const old=await db.inventoryStockRule.findUnique({where:{id}});if(!old)throw new NotFoundException('Сценарий не найден');if(old.version!==version)throw new ConflictException('Сценарий изменился');
  await db.inventoryStockRule.delete({where:{id}});await this.audit(db,actor,id,'STOCK_RULE_DELETE',{before:old});return {deleted:true};
 });}
 release(actor:string,id:string,version:number){return this.run(actor,true,async db=>{
  const rule=await db.inventoryStockRule.findUnique({where:{id}});if(!rule)throw new NotFoundException('Сценарий не найден');if(rule.version!==version)throw new ConflictException('Сценарий изменился');
  const states=await db.inventoryStockRuleState.findMany({where:{ruleId:id,triggered:true,measuredQuantity:{gt:rule.threshold}}});
  if(!states.length)throw new ConflictException('Нет позиций выше порога, для которых можно возобновить продажи');
  await db.inventoryStockRuleState.updateMany({where:{ruleId:id,variantId:{in:states.map(x=>x.variantId)}},data:{triggered:false,triggeredAt:null}});
  for(const state of states)await db.$executeRaw`SELECT inventory_refresh_variant(${state.variantId})`;
  await this.audit(db,actor,id,'STOCK_RULE_RELEASE',{variantIds:states.map(x=>x.variantId)});return {released:states.length};
 });}
 saveGroup(actor:string,id:string|undefined,dto:StockGroupDto){return this.run(actor,true,async db=>{
  const name=dto.name.trim();if(!name)throw new BadRequestException('Укажите название группы');
  const previous=id?await db.inventoryStockGroup.findUnique({where:{id},include:{members:true}}):null;
  if(id&&!previous)throw new NotFoundException('Группа не найдена');if(previous&&previous.version!==dto.expectedVersion)throw new ConflictException('Группа изменена другим сотрудником');
  if(await db.product.count({where:{id:{in:dto.productIds},productType:'PHYSICAL'}})!==dto.productIds.length)throw new BadRequestException('В группе допустимы только существующие физические товары');
  const data={name,normalizedName:name.toLocaleLowerCase('ru-RU'),isActive:dto.isActive};
  const group=previous?await db.inventoryStockGroup.update({where:{id},data:{...data,version:{increment:1}}}):await db.inventoryStockGroup.create({data});
  await db.inventoryStockGroupMember.deleteMany({where:{groupId:group.id,productId:{notIn:dto.productIds}}});
  await db.inventoryStockGroupMember.createMany({data:dto.productIds.map(productId=>({groupId:group.id,productId})),skipDuplicates:true});
  await this.audit(db,actor,group.id,previous?'STOCK_GROUP_UPDATE':'STOCK_GROUP_CREATE',{before:previous,after:{...data,productIds:dto.productIds}});return group;
 });}
 feed(actor:string,q:StockFeedQueryDto){return this.run(actor,false,db=>this.channelFeed(db,q));}
 async channelFeed(db:Prisma.TransactionClient|PrismaService,q:StockFeedQueryDto){
  const rows=await db.inventoryChannelStock.findMany({where:{channel:q.channel,...(q.after?{variantId:{gt:q.after}}:{})},include:{variant:{select:{sku:true,product:{select:{externalId:true}}}}},orderBy:{variantId:'asc'},take:q.limit+1});
  return {channel:q.channel,delivery:'NOT_CONNECTED',items:rows.slice(0,q.limit).map(x=>({variantId:x.variantId,sku:x.variant.sku,externalProductId:x.variant.product.externalId,quantity:x.quantity,blocked:x.blocked,revision:x.revision,changedAt:x.changedAt})),next:rows.length>q.limit?rows[q.limit-1].variantId:null};
 }
}
