import { ProductsService } from './products.service';

describe('Cart recommendations', () => {
  function setup() {
    const available = { isActive: true, stock: 10, reserved: 2 };
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ id: 'popular' }, { id: 'next' }]), product: { findMany: jest.fn().mockResolvedValue([{ id: 'next', variants: [available] }, { id: 'popular', variants: [available, { ...available, reserved: 10 }, { ...available, isActive: false }] }]) } };
    return { prisma, service: new ProductsService(prisma as any, {} as any) };
  }
  it('keeps sales ranking and only variants with available stock', async () => {
    const { service, prisma } = setup();
    const result = await service.cartRecommendations(['already-in-cart']);
    expect(result.items.map(item => item.id)).toEqual(['popular', 'next']);
    expect(result.items[0].variants).toHaveLength(1);
    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.text).toContain("'90 days'");
    expect(sql.text).toContain("'PAID'");
    expect(sql.text).toContain("'CANCELLED', 'REFUNDED'");
    expect(sql.text).toContain('LIMIT 8');
    expect(sql.values).toContain('already-in-cart');
    expect(sql.text).not.toContain('already-in-cart');
  });
  it('returns no invented items when catalog has none available', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValue([]);
    expect(await service.cartRecommendations()).toEqual({ items: [] });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});
