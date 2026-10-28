import { OneCSyncService } from './1c-sync.service';

describe('unversioned 1C catalog stock with active local holds', () => {
 function fixture(active:boolean,confirmed=false) {
  const variant:any={id:'variant',stock:8,reserved:3,price:100};
  const tx:any={ $executeRaw:jest.fn(),product:{upsert:jest.fn(async()=>({id:'product'}))},
   productVariant:{findMany:jest.fn(async()=>[variant]),updateMany:jest.fn(async({data})=>{Object.assign(variant,data);return {count:1};})},
   oneCWarehouseStock:{findUnique:jest.fn(async()=>confirmed?{variantId:'variant'}:null)},orderItem:{count:jest.fn(async({where})=>active && where.order.OR.some((entry:any)=>entry.reservationState==='ACTIVE')?1:0)},syncLog:{create:jest.fn()} };
  const db:any={$transaction:jest.fn(async fn=>fn(tx))},service:any=new OneCSyncService(db,{} as any,{} as any);
  const dto:any={products:[{externalId:'one-c',sku:'SKU',nameRu:'Товар',slug:'product',price:120,stock:10}]};
  return {variant,tx,service,dto};
 }
 it('keeps the held stock and still updates the product price',async()=>{
  const f=fixture(true);const result=await f.service.processProducts(f.dto,async()=>{});
  expect(f.variant).toMatchObject({stock:8,reserved:3,price:120});expect(result).toMatchObject({success:false,stockSkipped:['SKU']});
 });
 it('can import an unversioned stock count when no held or locally managed orders exist',async()=>{
  const f=fixture(false);const result=await f.service.processProducts(f.dto,async()=>{});
  expect(f.variant).toMatchObject({stock:10,reserved:3,price:120});expect(result).toMatchObject({success:true,stockSkipped:[]});
 });
 it('does not replace a versioned warehouse projection with an unversioned catalog count even without local holds',async()=>{
  const f=fixture(false,true);const result=await f.service.processProducts(f.dto,async()=>{});
  expect(f.variant).toMatchObject({stock:8,reserved:3,price:120});expect(result).toMatchObject({success:false,stockSkipped:['SKU']});
 });
});
