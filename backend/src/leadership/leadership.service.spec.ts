import { LeadershipService } from './leadership.service';

describe('Leadership overview: mock-only financial basis', () => {
 function fixture(current = 1000, previous = 500) {
  const prisma:any={order:{aggregate:jest.fn().mockResolvedValueOnce({_count:2,_sum:{finalAmount:current}}).mockResolvedValueOnce({_count:1,_sum:{finalAmount:previous}}),findMany:jest.fn().mockResolvedValue([]),groupBy:jest.fn().mockResolvedValue([{source:'WEB',_count:2,_sum:{finalAmount:current}}])},customer:{count:jest.fn().mockResolvedValue(1)},productVariant:{count:jest.fn().mockResolvedValue(0)},lead:{count:jest.fn().mockResolvedValue(0)},task:{count:jest.fn().mockResolvedValue(0)},helpdeskTicket:{count:jest.fn().mockResolvedValue(0)}};
  return {prisma,service:new LeadershipService(prisma)};
 }
 it('never counts unpaid orders as revenue; periods and channels share the same payment basis',async()=>{
  const f=fixture();const result=await f.service.overview();
  for(const [input] of f.prisma.order.aggregate.mock.calls)expect(input.where.paymentStatus).toBe('SUCCEEDED');
  expect(f.prisma.order.groupBy.mock.calls[0][0].where.paymentStatus).toBe('SUCCEEDED');
  expect(result.sales).toMatchObject({revenue:1000,orders:2,averageOrder:500,growth:100,basis:'CONFIRMED_PAYMENTS'});
  expect(f.prisma.task.count.mock.calls[0][0].where.status.notIn).toEqual(['DONE','CANCELLED']);
 });
 it('empty period has finite zero average and growth',async()=>{
  const f=fixture(0,0);f.prisma.order.aggregate.mockReset().mockResolvedValue({_count:0,_sum:{finalAmount:null}});
  const result=await f.service.overview();expect(result.sales.averageOrder).toBe(0);expect(result.sales.growth).toBe(0);
 });
});
