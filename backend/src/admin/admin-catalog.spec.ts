import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin.dto';
describe('Admin catalog (mock database only)',()=>{
  function fixture(){
    const db:any={dataTrashEntry:{findMany:jest.fn().mockResolvedValue([])},productVariant:{fields:{reserved:'reserved-field'}},product:{count:jest.fn().mockResolvedValue(2),findMany:jest.fn().mockResolvedValue([]),updateMany:jest.fn().mockResolvedValue({count:2})},auditLog:{create:jest.fn()},$queryRaw:jest.fn().mockResolvedValue([])};
    db.$transaction=jest.fn(async action=>typeof action==='function'?action(db):Promise.all(action));return {db,service:new AdminService(db,{} as any,{} as any)};
  }
  it('filters category/visibility/availability before pagination, with the same count criteria',async()=>{
    const f=fixture();await f.service.productList({page:2,limit:24,q:'gel',categoryId:'category',visibility:'hidden',availability:'stocked',sort:'sku'} as AdminListQueryDto);
    const args=f.db.product.findMany.mock.calls[0][0];expect(args.where).toMatchObject({isActive:false,categories:{some:{categoryId:'category'}}});expect(args.where.AND[0].OR).toHaveLength(2);expect(args.orderBy).toEqual([{sku:'asc'},{id:'asc'}]);expect(args.skip).toBe(24);expect(f.db.product.count.mock.calls[0][0].where).toEqual(args.where);
  });
  it('bulk publication locks products and changes only visibility, recording the actor',async()=>{
    const f=fixture();await expect(f.service.bulkProducts({action:'publish',ids:['a','b']},'actor')).resolves.toEqual({updated:2});
    expect(f.db.$queryRaw.mock.calls[0][0].text).toContain('FOR UPDATE');expect(f.db.product.updateMany.mock.calls[0][0].data).toEqual({isActive:true});expect(f.db.auditLog.create.mock.calls[0][0].data.actorId).toBe('actor');
  });
  it('rejects deleted/missing products before a bulk update',async()=>{
    const f=fixture();f.db.dataTrashEntry.findMany.mockResolvedValue([{entityId:'a'}]);await expect(f.service.bulkProducts({action:'hide',ids:['a','b']},'actor')).rejects.toThrow(ConflictException);expect(f.db.product.updateMany).not.toHaveBeenCalled();
  });
  it('rejects empty and duplicate selections without DB calls',async()=>{
    const f=fixture();await expect(f.service.bulkProducts({action:'hide',ids:[]},'actor')).rejects.toThrow(BadRequestException);await expect(f.service.bulkProducts({action:'hide',ids:['a','a']},'actor')).rejects.toThrow(BadRequestException);expect(f.db.$transaction).not.toHaveBeenCalled();
  });
  it('validates badge assignments under the same lock as badge deletion before creating a product',async()=>{
    const f=fixture();f.db.storefrontSetting={findUnique:jest.fn().mockResolvedValue({productBadges:[]})};f.db.product.create=jest.fn();
    await expect(f.service.createProduct({sku:'gel',nameRu:'Гель',price:100,stock:1,badgeIds:['popular']} as any)).rejects.toThrow(BadRequestException);
    expect(f.db.$queryRaw.mock.calls[0][0][0]).toContain('storefront-merchandising-main');expect(f.db.product.create).not.toHaveBeenCalled();
  });
  it('does not restore a deleted badge when an older product draft is saved',async()=>{
    const f=fixture();f.db.storefrontSetting={findUnique:jest.fn().mockResolvedValue({productBadges:[]})};f.db.product.findUnique=jest.fn().mockResolvedValue({id:'a',productType:'PHYSICAL',variants:[{price:100}]});f.db.product.update=jest.fn();
    await expect(f.service.updateProduct('a',{badgeIds:['popular']})).rejects.toThrow(BadRequestException);expect(f.db.product.update).not.toHaveBeenCalled();
  });
});
