import { OneCFinanceService } from './one-c-finance.service';
import { OneCSyncService } from './1c-sync.service';
import { settlementBasis } from './finance-policy';
import { randomUUID } from 'crypto';
describe('incoming 1C settlements', () => {
 function fixture() {
  const order:any={id:randomUUID(),orderNumber:'QA',externalId:'one-c-order',currency:'RUB',items:[],oneCRequests:[]};
  const tx:any={$queryRaw:jest.fn(),order:{findUnique:jest.fn(async()=>order),update:jest.fn()},oneCOrderFinance:{upsert:jest.fn(async ({create,update})=>order.oneCFinance=order.oneCFinance?update:create)},oneCOrderRequest:{update:jest.fn()},syncLog:{create:jest.fn()}};
  const db:any={$transaction:jest.fn(fn=>fn(tx))};
  const dto:any={platformOrderId:order.id,external1CId:order.externalId,revision:1,basisHash:settlementBasis(order),asOf:new Date(Date.now()-1000).toISOString(),validUntil:new Date(Date.now()+60000).toISOString(),currency:'RUB',total:'100.00',paid:'30.00',debt:'70.00',refunded:'0.00',refundDue:'0.00',releaseAllowed:false,releaseReason:'Долг',documents:[],requests:[]};
  return {order,tx,db,dto,service:new OneCFinanceService(db)};
 }
 it('persists supplied balances unchanged and never writes payment or inventory state',async()=>{
  const f=fixture();await f.service.receive({...f.dto,debt:'77.00'});
  expect(f.order.oneCFinance.debt).toBe('77.00');expect(f.tx.order.update).not.toHaveBeenCalled();
 });
 it('replays idempotently, ignores old revisions and rejects conflicting contents',async()=>{
  const f=fixture();await f.service.receive({...f.dto,revision:2});
  expect(await f.service.receive({...f.dto,revision:2})).toMatchObject({repeated:true});
  expect(await f.service.receive(f.dto)).toMatchObject({ignored:true});
  await expect(f.service.receive({...f.dto,revision:2,paid:'31.00'})).rejects.toMatchObject({status:409});
  expect(f.tx.oneCOrderFinance.upsert).toHaveBeenCalledTimes(1);
 });
 it.each([{external1CId:'wrong'}, {basisHash:'0'.repeat(64)}, {currency:'USD'}])('rejects mismatched order identity or conditions: %j',async patch=>{
  const f=fixture();await expect(f.service.receive({...f.dto,...patch})).rejects.toMatchObject({status:409});expect(f.tx.oneCOrderFinance.upsert).not.toHaveBeenCalled();
 });
 it.each([{validUntil:new Date(0).toISOString()},{asOf:new Date(Date.now()+3600000).toISOString()}])('rejects invalid snapshot time: %j',async patch=>{
  const f=fixture();await expect(f.service.receive({...f.dto,...patch})).rejects.toMatchObject({status:400});
 });
 it('rejects unknown request IDs and completion for outdated conditions',async()=>{
  const f=fixture(),id=randomUUID(),result={id,status:'COMPLETED',message:'Готово'};
  await expect(f.service.receive({...f.dto,requests:[result]})).rejects.toMatchObject({status:409});
  f.order.oneCRequests=[{id,status:'PENDING',basisHash:'old'}];
  await expect(f.service.receive({...f.dto,requests:[result]})).rejects.toMatchObject({status:409});
  expect(f.tx.oneCOrderRequest.update).not.toHaveBeenCalled();
 });
 it('allows completed results only from 1C and protects terminal decisions',async()=>{
  const f=fixture(),id=randomUUID();f.order.oneCRequests=[{id,status:'RECEIVED',basisHash:f.dto.basisHash}];
  await f.service.receive({...f.dto,requests:[{id,status:'COMPLETED',message:'Счёт создан',externalDocumentId:'invoice-1'}]});
  expect(f.tx.oneCOrderRequest.update).toHaveBeenCalledWith({where:{id},data:{status:'COMPLETED',responseMessage:'Счёт создан',externalDocumentId:'invoice-1'}});
  f.order.oneCRequests[0]={...f.order.oneCRequests[0],status:'COMPLETED',responseMessage:'Счёт создан',externalDocumentId:'invoice-1'};
  await expect(f.service.receive({...f.dto,revision:2,requests:[{id,status:'RECEIVED',message:''}]})).rejects.toMatchObject({status:409});
 });
 it('validates pull responses as strictly as the webhook before opening a transaction',async()=>{
  const f=fixture(),service=new OneCSyncService(f.db,{} as any,{} as any);
  for(const dto of [{...f.dto,paid:30},{...f.dto,paid:'-1.00'},{...f.dto,releaseAllowed:'true'},{...f.dto,unknown:true},{...f.dto,requests:[{id:randomUUID(),status:'COMPLETED',message:'ok',amount:'999.00'}]}]) await expect(service.importFinance(dto as any)).rejects.toMatchObject({status:400});
  expect(f.db.$transaction).not.toHaveBeenCalled();
 });
});
