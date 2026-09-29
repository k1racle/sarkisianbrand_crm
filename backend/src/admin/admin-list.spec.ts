import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin.dto';

describe('Admin paginated lists', () => {
  const prisma: any = { dataTrashEntry: { findMany: jest.fn() }, product: { count: jest.fn(), findMany: jest.fn() }, productVariant: { count: jest.fn(), fields: { reserved: 'reserved-column' } }, customer: { count: jest.fn() }, order: { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() }, $queryRaw: jest.fn(), $transaction: jest.fn() };
  const oneC = { enqueueOrder: jest.fn() };
  const service = new AdminService(prisma, oneC as any, {} as any);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((items: any[]) => Promise.all(items)); });
  afterEach(() => jest.useRealTimers());
  it('reports new WEB orders separately without querying or invoking providers', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-24T12:00:00Z'));
    prisma.dataTrashEntry.findMany.mockResolvedValue([]);
    prisma.order.count.mockResolvedValueOnce(110).mockResolvedValueOnce(90).mockResolvedValueOnce(12).mockResolvedValueOnce(0);
    prisma.order.aggregate.mockResolvedValue({ _sum: { finalAmount: '1800' }, _count: { _all: 2 } });
    prisma.order.groupBy.mockResolvedValue([{ status: 'NEW', _count: { _all: 7 } }]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([{ day: '2026-09-24', revenue: '1800', count: 2n }]);
    prisma.customer.count.mockResolvedValue(25); prisma.product.count.mockResolvedValue(15); prisma.productVariant.count.mockResolvedValue(3);
    const result = await service.dashboard(7);
    expect(result).toMatchObject({ orders: 110, paidOrders: 90, customers: 25, products: 15, lowStock: 3, newOrders: 7,
      sales: { revenue: 1800, paidOrders: 2, orders: 12, averageOrder: 900 },
      period: { days: 7, from: new Date('2026-09-17T21:00:00Z'), to: new Date('2026-09-24T21:00:00Z') },
      queue: { NEW: 7 }, recentOrders: [], issues: { syncErrors: 0 }, generatedAt: '2026-09-24T12:00:00.000Z' });
    expect(result.trend).toHaveLength(7);
    expect(result.trend[6]).toEqual({ day: '2026-09-24', revenue: 1800, orders: 2 });
    expect(prisma.order.count.mock.calls.map(call => call[0])).toEqual([
      { where: { source: 'WEB' } },
      { where: { source: 'WEB', paymentStatus: { in: ['PAID', 'SUCCEEDED'] }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
      { where: { source: 'WEB', createdAt: { gte: result.period.from, lt: result.period.to } } },
      { where: { source: 'WEB', isSynced1C: false, oneCSyncError: { not: null }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
    ]);
    expect(prisma.order.groupBy).toHaveBeenCalledWith({ by: ['status'], orderBy: { status: 'asc' }, where: { source: 'WEB' }, _count: { _all: true } });
    expect(oneC.enqueueOrder).not.toHaveBeenCalled();
    expect(() => JSON.stringify(result)).not.toThrow();
  });
  it('finds products beyond the previous first hundred and excludes trash', async () => {
    prisma.dataTrashEntry.findMany.mockResolvedValue([{ entityId: 'trashed' }]);
    prisma.product.count.mockResolvedValue(170);
    prisma.product.findMany.mockResolvedValue([{ id: 'matched' }]);
    const query = plainToInstance(AdminListQueryDto, { page: '6', limit: '24', q: ' Гель ' });
    expect(validateSync(query)).toHaveLength(0);
    await expect(service.productList(query)).resolves.toEqual({ items: [{ id: 'matched' }], total: 170, page: 6, limit: 24 });
    expect(prisma.product.findMany.mock.calls[0][0]).toMatchObject({ skip: 120, take: 24, where: { id: { notIn: ['trashed'] }, OR: [{ nameRu: { contains: 'Гель', mode: 'insensitive' } }, { sku: { contains: 'Гель', mode: 'insensitive' } }] } });
  });
  it('keeps the web order scope and applies status and search server-side', async () => {
    prisma.order.count.mockResolvedValue(115); prisma.order.findMany.mockResolvedValue([]);
    await service.orderList(plainToInstance(AdminListQueryDto, { page: 5, limit: 24, status: 'NEW', q: 'example' }));
    expect(prisma.order.findMany.mock.calls[0][0]).toMatchObject({ skip: 96, take: 24, where: { source: 'WEB', status: 'NEW' } });
  });
  it.each([{ page: 0 }, { limit: 101 }, { page: 'abc' }, { status: 'INVALID' }, { q: 'x'.repeat(201) }])('rejects invalid query %j', query => {
    expect(validateSync(plainToInstance(AdminListQueryDto, query)).length).toBeGreaterThan(0);
  });
});
