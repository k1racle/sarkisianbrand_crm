import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin.dto';

describe('Admin paginated lists', () => {
  const prisma: any = { dataTrashEntry: { findMany: jest.fn() }, product: { count: jest.fn(), findMany: jest.fn() }, productVariant: { count: jest.fn() }, customer: { count: jest.fn() }, order: { count: jest.fn(), findMany: jest.fn() }, $transaction: jest.fn() };
  const service = new AdminService(prisma, {} as any, {} as any);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((items: any[]) => Promise.all(items)); });
  it('reports new WEB orders separately without querying or invoking providers', async () => {
    prisma.order.count.mockResolvedValueOnce(110).mockResolvedValueOnce(90).mockResolvedValueOnce(7);
    prisma.customer.count.mockResolvedValue(25); prisma.product.count.mockResolvedValue(15); prisma.productVariant.count.mockResolvedValue(3);
    await expect(service.dashboard()).resolves.toEqual({ orders: 110, paidOrders: 90, customers: 25, products: 15, lowStock: 3, newOrders: 7 });
    expect(prisma.order.count.mock.calls.map(call => call[0])).toEqual([
      { where: { source: 'WEB' } }, { where: { source: 'WEB', paymentStatus: { in: ['PAID', 'SUCCEEDED'] } } }, { where: { source: 'WEB', status: 'NEW' } },
    ]);
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
