import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { activeCategoryTree, categoryDescendantSlugs, effectiveVariantPrice, pricedCart, resolveProductBadges } from '../common/product-merchandising';
import { CategoryEditDto, ProductBadgesDto } from './merchandising.dto';
import { MerchandisingService, validateCategoryTree } from './merchandising.service';
describe('Catalog merchandising (in-memory only)',()=>{
  const now=new Date('2026-09-17T10:00:00Z');
  it.each([
    [{salePrice:null},'1000'],[{salePrice:'800'},'800'],[{salePrice:'0'},'0'],
    [{salePrice:'1000'},'1000'],[{salePrice:'1200'},'1000'],[{salePrice:'-1'},'1000'],
    [{salePrice:'800',saleStartsAt:'2026-09-18T00:00:00Z'},'1000'],
    [{salePrice:'800',saleEndsAt:now},'1000'],
    [{salePrice:'800',saleStartsAt:now},'800'],
    [{salePrice:'800',product:{productType:'GIFT_CARD'}},'1000'],
  ])('computes the current price without changing regular price (%j)',(fields,expected)=>{
    const variant={price:'1000',...fields};expect(effectiveVariantPrice(variant,now)).toBe(expected);expect(variant.price).toBe('1000');
  });
  it('prices detached cart rows; stored prices and product references survive',()=>{
    const cart={items:[{quantity:2,variant:{price:'1000',salePrice:'800',product:{nameRu:'Товар'}}}]};
    const result=pricedCart(cart,now);expect(result.items[0].variant).toMatchObject({price:'800',regularPrice:'1000'});expect(cart.items[0].variant.price).toBe('1000');
  });
  it('rejects cycles, duplicate IDs, unknown parents and excessive depth',()=>{
    expect(()=>validateCategoryTree([{id:'a',parentId:'b'},{id:'b',parentId:'a'}])).toThrow(BadRequestException);
    expect(()=>validateCategoryTree([{id:'a',parentId:'a'}])).toThrow(BadRequestException);
    expect(()=>validateCategoryTree([{id:'a',parentId:'unknown'}])).toThrow(BadRequestException);
    expect(()=>validateCategoryTree([{id:'a',parentId:null},{id:'a',parentId:null}])).toThrow(BadRequestException);
    expect(()=>validateCategoryTree(Array.from({length:15},(_,i)=>({id:String(i),parentId:i?String(i-1):null})))).toThrow(BadRequestException);
    expect(()=>validateCategoryTree([{id:'a',parentId:null},{id:'b',parentId:'a'}])).not.toThrow();
  });
  it('hides descendants of hidden ancestors and expands parent filters',()=>{
    const categories=[{id:'a',slug:'a',parentId:null,isActive:true},{id:'b',slug:'b',parentId:'a',isActive:true},{id:'c',slug:'c',parentId:null,isActive:false},{id:'d',slug:'d',parentId:'c',isActive:true}];
    expect(activeCategoryTree(categories).map(c=>c.id)).toEqual(['a','b']);
    expect(categoryDescendantSlugs(activeCategoryTree(categories),['a'])).toEqual(['a','b']);
  });
  it('uses default badges for legacy data but an explicitly empty list disables badges',()=>{
    expect(resolveProductBadges(null)).toHaveLength(3);expect(resolveProductBadges([])).toEqual([]);
  });
  it('removing a badge clears its product assignments within the settings transaction',async()=>{
    const f=fixture();f.tx.$executeRaw=jest.fn().mockResolvedValue(1);const result:any=await f.service.updateBadges({revision:0,badges:resolveProductBadges(null).filter(b=>b.id!=='popular')} as ProductBadgesDto,'actor');expect(result.revision).toBe(1);expect(f.tx.$executeRaw).toHaveBeenCalledTimes(1);expect(f.tx.$executeRaw.mock.calls[0][1]).toBe('popular');
  });
  function fixture(){
    const settings:any={categoryTreeRevision:0,productBadgesRevision:0,productBadges:null};
    const items:any[]=[{id:'a',nameRu:'Гели',slug:'gels',parentId:null,sortOrder:0,isActive:true}];
    const tx:any={$queryRaw:jest.fn().mockResolvedValue([]),storefrontSetting:{findUnique:jest.fn(async()=>settings),findUniqueOrThrow:jest.fn(async()=>settings),upsert:jest.fn(),update:jest.fn(async({data})=>{for(const [key,value] of Object.entries(data))settings[key]=(value as any)?.increment?settings[key]+(value as any).increment:value;})},category:{findMany:jest.fn(async()=>items),update:jest.fn(async({where,data})=>Object.assign(items.find(i=>i.id===where.id),data)),create:jest.fn(async({data})=>items.push({id:'new',...data}))},auditLog:{create:jest.fn()}};
    const db:any={$transaction:jest.fn(async fn=>fn(tx))};return {tx,settings,items,service:new MerchandisingService(db)};
  }
  const category=(overrides:any={}):CategoryEditDto=>({revision:0,nameRu:'Гели',slug:'gels',parentId:'',description:'Описание',imageUrl:'/storefront/hero.jpg',isActive:true,...overrides});
  it('creates a manual category, persists presentation and records the actor',async()=>{
    const f=fixture();const result:any=await f.service.editCategory(null,category({slug:'new'}),'actor');
    expect(result.revision).toBe(1);expect(f.tx.category.create.mock.calls[0][0].data).toMatchObject({description:'Описание',imageUrl:'/storefront/hero.jpg',parentId:null});expect(f.tx.auditLog.create.mock.calls[0][0].data.actorId).toBe('actor');
  });
  it('rejects stale revisions before any category writes',async()=>{
    const f=fixture();f.settings.categoryTreeRevision=3;await expect(f.service.editCategory('a',category(),'actor')).rejects.toThrow(ConflictException);expect(f.tx.category.update).not.toHaveBeenCalled();
  });
  it('saves complete layout atomically, but rejects missing/foreign IDs',async()=>{
    const f=fixture();await f.service.layout({revision:0,nodes:[{id:'a',parentId:''}]},'actor');expect(f.settings.categoryTreeRevision).toBe(1);expect(f.tx.category.update).toHaveBeenCalledTimes(1);
    await expect(f.service.layout({revision:1,nodes:[]},'actor')).rejects.toThrow(ConflictException);
  });
  it('rejects duplicate badge codes and validates DTO bounds/colors',async()=>{
    const f=fixture(),badges=resolveProductBadges(null);expect(()=>f.service.updateBadges({revision:0,badges:[badges[0],badges[0]]} as ProductBadgesDto,'actor')).toThrow(BadRequestException);
    expect(await validate(plainToInstance(CategoryEditDto,category()))).toEqual([]);
    expect((await validate(plainToInstance(ProductBadgesDto,{revision:0,badges:[{...badges[0],color:'red',newDays:0}]})))).not.toHaveLength(0);
  });
});
