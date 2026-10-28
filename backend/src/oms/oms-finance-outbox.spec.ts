import { OmsFinanceService } from './oms-finance.service';

jest.mock('../common/operational-access', () => ({
  withOperationalAccess: (prisma: any, _access: any, _actor: string, _domain: string, _write: boolean, action: any) =>
    prisma.$transaction((tx: any) => action({ db: tx, read: { orders: () => ({}) }, write: { orders: () => ({}) } })),
}));

function fixture() {
  const order:any = { id:'order', status:'NEW', updatedAt:new Date('2026-10-28T12:00:00Z'), items:[], oneCRequests:[], oneCFinance:null, executionOperations:[], currency:'RUB', shippingAddress:{} };
  const writes:any[] = [];
  const tx:any = {
    $queryRaw:jest.fn(), order:{findFirst:jest.fn(async()=>order),update:jest.fn(async data=>writes.push(['order',data]))},
    oneCOrderRequest:{create:jest.fn(async({data})=>{ const request={...data,id:'request-id'}; order.oneCRequests.push(request); writes.push(['request',data]); return request; })},
    user:{findUniqueOrThrow:jest.fn(async()=>({firstName:'Анна',lastName:''}))},auditLog:{create:jest.fn(async data=>writes.push(['audit',data]))},
  };
  const prisma:any = {$transaction:jest.fn(async fn=>{const length=writes.length, previous=[...order.oneCRequests];try{return await fn(tx);}catch(error){writes.splice(length);order.oneCRequests=previous;throw error;}})};
  const access:any = {resolve:jest.fn()};
  const oneC:any = {stageOrderExport:jest.fn(async(db,id,actor)=>{expect(db).toBe(tx);writes.push(['stage',id,actor]);})};
  const request:any = {requestKey:'request-key',kind:'INVOICE',comment:'Выставить счёт',expectedUpdatedAt:order.updatedAt.toISOString()};
  return {order,tx,writes,oneC,request,service:new OmsFinanceService(prisma,access,oneC)};
}

describe('1C finance request outbox',()=>{
  it('stages the export in the same transaction and does not duplicate it on replay',async()=>{
    const f=fixture();
    expect(await f.service.request('actor','order',f.request)).toEqual({id:'request-id',repeated:false});
    expect(f.oneC.stageOrderExport).toHaveBeenCalledWith(f.tx,'order','actor');
    expect(await f.service.request('actor','order',f.request)).toEqual({id:'request-id',repeated:true});
    expect(f.oneC.stageOrderExport).toHaveBeenCalledTimes(1);
  });
  it('rolls the request back when its export intent cannot be staged',async()=>{
    const f=fixture(); f.oneC.stageOrderExport.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(f.service.request('actor','order',f.request)).rejects.toThrow('outbox unavailable');
    expect(f.writes).toEqual([]); expect(f.order.oneCRequests).toEqual([]);
    expect(await f.service.request('actor','order',f.request)).toEqual({id:'request-id',repeated:false});
  });
});
