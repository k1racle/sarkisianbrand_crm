import { BadRequestException } from '@nestjs/common';
import { dashboardPeriod, storeDashboard } from './store-dashboard';

describe('WEB store dashboard (isolated, read-only)', () => {
  it('starts/ends Moscow calendar days and includes today', () => {
    const period = dashboardPeriod(7, new Date('2026-09-16T22:00:00Z'));
    expect(period.from.toISOString()).toBe('2026-09-10T21:00:00.000Z');
    expect(period.to.toISOString()).toBe('2026-09-17T21:00:00.000Z');
  });
  it.each(['all', '', '8', '-7', 'Infinity'])('rejects invalid period %s', value => {
    expect(()=>dashboardPeriod(value)).toThrow(BadRequestException);
  });
  it('uses WEB-only sales, ignores refunded/cancelled/trashed products, excludes gift inventory and zero-fills days', async () => {
    const requests: any[] = [];
    const query = (type:string) => jest.fn(args=>{ requests.push({type,...args}); return {}; });
    const db:any = {
      dataTrashEntry:{findMany:jest.fn().mockResolvedValue([{entityId:'trashed'}])},
      customer:{count:query('customer.count')},
      order:{count:query('order.count'), aggregate:query('order.aggregate'), groupBy:query('order.groupBy'), findMany:query('order.findMany')},
      product:{count:query('product.count')}, productVariant:{count:query('variant.count'), fields:{reserved:'reserved-column'}},
      $queryRaw:query('daily'),
      $transaction:jest.fn().mockResolvedValue([12,5,10,11,{_sum:{finalAmount:'1800'},_count:{_all:2}},3,[{status:'NEW',_count:{_all:4}}],[],2,1,3,4,1,[{day:'2026-09-17',revenue:'1800',count:2n}]]),
    };
    const result = await storeDashboard(db,7,new Date('2026-09-17T12:00:00Z'));
    expect(result.sales).toEqual({revenue:1800,paidOrders:2,orders:3,averageOrder:900});
    expect(result.trend).toHaveLength(7);
    expect(result.trend[0]).toEqual({day:'2026-09-11',revenue:0,orders:0});
    expect(result.trend[6]).toEqual({day:'2026-09-17',revenue:1800,orders:2});
    expect(result.newOrders).toBe(4);
    for(const request of requests.filter(r=>r.type.startsWith('order.'))) expect(request.where.source).toBe('WEB');
    const paid = requests.find(r=>r.type==='order.aggregate');
    expect(paid.where.status.notIn).toEqual(['CANCELLED','REFUNDED']);
    expect(paid.where.createdAt.gte.toISOString()).toBe('2026-09-10T21:00:00.000Z');
    for(const request of requests.filter(r=>r.type==='product.count')) expect(request.where.id.notIn).toEqual(['trashed']);
    expect(requests.find(r=>r.type==='variant.count').where.product.productType).toEqual({not:'GIFT_CARD'});
    const latest = requests.find(r=>r.type==='order.findMany');
    expect(latest.take).toBe(6);
    expect(latest.select).not.toHaveProperty('buyerEmail');
    expect(result.issues.syncErrors).toBe(1);
    JSON.stringify(result); // BigInt/Decimal daily SQL values must be JSON-safe.
  });
  it('returns zero average when no paid orders exist', async () => {
    const query=()=>({});
    const db:any={dataTrashEntry:{findMany:async()=>[]},customer:{count:query},order:{count:query,aggregate:query,groupBy:query,findMany:query},product:{count:query},productVariant:{count:query,fields:{reserved:'reserved'}},$queryRaw:query,$transaction:async()=>[0,0,0,0,{_sum:{finalAmount:null},_count:{_all:0}},0,[],[],0,0,0,0,0,[]]};
    expect((await storeDashboard(db)).sales.averageOrder).toBe(0);
  });
});
