import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveProductBadges } from '../common/product-merchandising';
import { CategoryEditDto, CategoryLayoutDto, ProductBadgesDto } from './merchandising.dto';

export function validateCategoryTree(nodes:{id:string;parentId:string|null}[]) {
  const byId=new Map(nodes.map(node=>[node.id,node.parentId||null]));
  if(byId.size!==nodes.length)throw new BadRequestException('Категории указаны повторно');
  for(const node of nodes){
    const seen=new Set([node.id]);let parent=node.parentId;let depth=0;
    while(parent){
      if(!byId.has(parent))throw new BadRequestException('Родительская категория не найдена');
      if(seen.has(parent))throw new BadRequestException('Нельзя вложить категорию в себя или своего потомка');
      if(++depth>=12)throw new BadRequestException('Не более 12 уровней вложенности');
      seen.add(parent);parent=byId.get(parent)||null;
    }
  }
}
function imageValid(value:string){
  if(!value)return true;
  if(/[\x00-\x20\\]/.test(value))return false;
  if(/^\/(?!\/)/.test(value))return true;
  try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}
}
@Injectable()
export class MerchandisingService {
  constructor(private readonly prisma:PrismaService){}
  private async categoryView(tx:any){
    const settings=await tx.storefrontSetting.findUnique({where:{key:'main'}});
    const items=await tx.category.findMany({include:{_count:{select:{products:true}}},orderBy:[{sortOrder:'asc'},{nameRu:'asc'},{id:'asc'}]});
    return {revision:settings?.categoryTreeRevision??0,items};
  }
  categories(){return this.prisma.$transaction(tx=>this.categoryView(tx),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});}
  private async write(kind:'categories'|'badges',revision:number,actorId:string,action:(tx:Prisma.TransactionClient)=>Promise<unknown>){
    if(!actorId)throw new BadRequestException('Не определён автор изменения');
    try{return await this.prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('storefront-merchandising-main'))`;
      await tx.storefrontSetting.upsert({where:{key:'main'},create:{key:'main'},update:{}});
      await tx.$queryRaw`SELECT key FROM "StorefrontSetting" WHERE key='main' FOR UPDATE`;
      const settings=await tx.storefrontSetting.findUniqueOrThrow({where:{key:'main'}});
      const field=kind==='categories'?'categoryTreeRevision':'productBadgesRevision';
      if(settings[field]!==revision)throw new ConflictException('Настройки уже изменены другим сотрудником. Обновите список и повторите изменения');
      await action(tx);
      await tx.storefrontSetting.update({where:{key:'main'},data:{[field]:{increment:1}}});
      await tx.auditLog.create({data:{actorId,action:`storefront.${kind}.update`,resource:`storefront-${kind}`,resourceId:'main',payload:{revision:revision+1}}});
      return kind==='categories'?this.categoryView(tx):this.badgeView(tx);
    },{timeout:15000});}catch(error:any){if(error?.code==='P2002')throw new ConflictException('Такая ссылка категории уже существует');throw error;}
  }
  editCategory(id:string|null,dto:CategoryEditDto,actorId:string){
    if(!dto.nameRu.trim()||!imageValid(dto.imageUrl))throw new BadRequestException('Проверьте название и адрес изображения');
    return this.write('categories',dto.revision,actorId,async tx=>{
      const items=await tx.category.findMany();
      if(id&&!items.some(item=>item.id===id))throw new NotFoundException('Категория не найдена');
      const provisional=id||'__new_category__';
      validateCategoryTree([...items.filter(item=>item.id!==id).map(item=>({id:item.id,parentId:item.parentId})),{id:provisional,parentId:dto.parentId||null}]);
      const data={nameRu:dto.nameRu.trim(),slug:dto.slug.toLowerCase(),parentId:dto.parentId||null,description:dto.description,imageUrl:dto.imageUrl||null,isActive:dto.isActive};
      if(id)await tx.category.update({where:{id},data});
      else await tx.category.create({data:{...data,sortOrder:items.reduce((max,item)=>Math.max(max,item.sortOrder),-1)+1}});
    });
  }
  layout(dto:CategoryLayoutDto,actorId:string){
    return this.write('categories',dto.revision,actorId,async tx=>{
      const ids=new Set((await tx.category.findMany({select:{id:true}})).map(item=>item.id));
      if(ids.size!==dto.nodes.length||dto.nodes.some(node=>!ids.has(node.id)))throw new ConflictException('Состав категорий изменён. Обновите дерево');
      validateCategoryTree(dto.nodes.map(node=>({...node,parentId:node.parentId||null})));
      for(const [sortOrder,node] of dto.nodes.entries())await tx.category.update({where:{id:node.id},data:{parentId:node.parentId||null,sortOrder}});
    });
  }
  private async badgeView(tx:any){const s=await tx.storefrontSetting.findUnique({where:{key:'main'}});return {revision:s?.productBadgesRevision??0,badges:resolveProductBadges(s?.productBadges)};}
  badges(){return this.badgeView(this.prisma);}
  updateBadges(dto:ProductBadgesDto,actorId:string){
    if(new Set(dto.badges.map(b=>b.id)).size!==dto.badges.length)throw new BadRequestException('Коды бейджей должны быть уникальными');
    return this.write('badges',dto.revision,actorId,async tx=>{
      const current=await tx.storefrontSetting.findUniqueOrThrow({where:{key:'main'}});
      const ids=new Set(dto.badges.map(b=>b.id));
      for(const badge of resolveProductBadges(current.productBadges))if(!ids.has(badge.id))await tx.$executeRaw`UPDATE "Product" SET "badgeIds"=array_remove("badgeIds",${badge.id}),"updatedAt"=NOW() WHERE ${badge.id}=ANY("badgeIds")`;
      await tx.storefrontSetting.update({where:{key:'main'},data:{productBadges:dto.badges as unknown as Prisma.InputJsonValue}});
    });
  }
}
