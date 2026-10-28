import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { B2BService } from './b2b.service';
import { B2BOrderListDto } from './dto/b2b.dto';

describe('B2B purchase history', () => {
  const createdAt = new Date('2026-10-28T09:00:00Z');
  function fixture() {
    const rows = Array.from({ length: 105 }, (_, index) => ({
      id: String(index).padStart(3, '0'), organizationId: index === 104 ? 'other-org' : 'org', source: 'B2B',
      orderNumber: `ORDER-${String(index).padStart(3, '0')}`, status: index === 1 ? 'SHIPPED' : 'NEW', createdAt,
      totalAmount: 100, discountAmount: 0, finalAmount: 100, currency: 'RUB', shippingAddress: {}, shippingCost: 0,
      execution: null, warehouseExecution: null, internalNotes: 'internal note', externalId: 'internal id', oneCSyncError: 'private error',
      checkoutRequestHash: 'private hash', items: [{ id: `line-${index}`, productType: 'PHYSICAL', productName: index === 1 ? 'Rare Gel' : 'Base', variantName: '30 ml', quantity: 1, price: 100, total: 100 }],
    }));
    const select = (where: any) => rows.filter(row => row.organizationId === where.organizationId && row.source === where.source && (!where.status || row.status === where.status) && (!where.OR || [row.orderNumber, ...row.items.map(item => item.productName), ...row.items.map(item => item.variantName)].some(value => value.toLowerCase().includes(where.OR[0].orderNumber.contains.toLowerCase()))));
    const order = {
      count: jest.fn(async ({ where }: any) => select(where).length),
      findMany: jest.fn(async ({ where, skip = 0, take = 100, orderBy }: any) => {
        const direction = Array.isArray(orderBy) ? orderBy[0].createdAt : orderBy.createdAt;
        return select(where).sort((a, b) => a.id.localeCompare(b.id) * (direction === 'asc' ? 1 : -1)).slice(skip, skip + take);
      }),
    };
    const tx: any = { order };
    const prisma: any = { order, $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const service = new B2BService(prisma, {} as any, {} as any);
    jest.spyOn(service as any, 'context').mockResolvedValue({ organizationId: 'org', canSeeFinance: false });
    return { service, order, prisma };
  }

  it('pages every order for the selected organization using a stable tie breaker', async () => {
    const f = fixture();
    const first: any = await f.service.orderHistory('user', { page: 1 });
    const last: any = await f.service.orderHistory('user', { page: 6 });
    expect(first).toMatchObject({ total: 104, page: 1, pages: 6, limit: 20 });
    expect(last.items).toHaveLength(4); expect(last.items.map((x: any) => x.id)).toEqual(['003', '002', '001', '000']);
    expect(first.items.some((x: any) => x.id === '104')).toBe(false);
    expect(f.order.findMany.mock.calls[0][0]).toMatchObject({ where: { organizationId: 'org', source: 'B2B' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 0, take: 20 });
    expect(f.prisma.$transaction.mock.calls[0][1]).toMatchObject({ isolationLevel: 'RepeatableRead' });
  });

  it('searches and filters across the entire organization, not only the current page', async () => {
    const f = fixture();
    const result: any = await f.service.orderHistory('user', { page: 1, search: 'rare', status: OrderStatus.SHIPPED, sort: 'oldest' });
    expect(result.total).toBe(1); expect(result.items[0].id).toBe('001');
    expect(f.order.findMany.mock.calls[0][0]).toMatchObject({ where: { organizationId: 'org', status: 'SHIPPED' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  });

  it('clamps an out-of-range page and removes internal 1C fields and finance for both list endpoints', async () => {
    const f = fixture();
    const page: any = await f.service.orderHistory('user', { page: 100 });
    expect(page.page).toBe(6);
    const [legacy]: any[] = await f.service.orders('user');
    for (const item of [page.items[0], legacy]) {
      expect(item).not.toHaveProperty('internalNotes'); expect(item).not.toHaveProperty('externalId');
      expect(item).not.toHaveProperty('oneCSyncError'); expect(item).not.toHaveProperty('checkoutRequestHash');
      expect(item).toMatchObject({ finalAmount: null, needsAttention: true, requiresWarehouse: true });
      expect(item.items[0]).toMatchObject({ price: null, total: null });
    }
  });

  it.each([{ page: 0 }, { page: 1.5 }, { page: 100001 }, { page: 'x' }, { page: 1, status: 'INVALID' }, { page: 1, search: 'a'.repeat(121) }, { page: 1, sort: 'other' }])('rejects malformed pagination or filters: %j', async input => {
    expect((await validate(plainToInstance(B2BOrderListDto, input))).length).toBeGreaterThan(0);
  });
});
