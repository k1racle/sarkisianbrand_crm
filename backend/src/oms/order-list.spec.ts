import { OmsService } from './oms.service';
import { OmsOrderListDto } from './dto/order-list.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('CRM B2B order register', () => {
  it('validates source, status and pagination before database access', async () => {
    expect((await validate(plainToInstance(OmsOrderListDto, { source: 'OTHER', page: 0, limit: 101 }))).length).toBe(3);
    const query = plainToInstance(OmsOrderListDto, { source: 'B2B', page: '2', limit: '30' });
    expect(await validate(query)).toEqual([]); expect(query.page).toBe(2);
  });
  it('uses canonical orders, filters before pagination, and returns a real count', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'b2b' }]), count = jest.fn().mockResolvedValue(31);
    const db = { order: { findMany, count }, $transaction: (queries: any[]) => Promise.all(queries) };
    const service = new OmsService(db as any, {} as any);
    const result = await service.listOrders({ source: 'B2B', page: 2, limit: 30, search: '  Салон  ' });
    expect(findMany.mock.calls[0][0]).toMatchObject({ where: { source: 'B2B' }, skip: 30, take: 30 });
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(result).toMatchObject({ total: 31, page: 2, pages: 2 });
  });
});
