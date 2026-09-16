import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';
import { CatalogQueryDto } from './dto/product.dto';

describe('Server-side catalog filtering', () => {
  function setup() {
    const prisma = { productVariant: { fields: { reserved: 'reserved-field-reference' } }, product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(33) }, $transaction: jest.fn(async values => Promise.all(values)) };
    return { prisma, service: new ProductsService(prisma as any, {} as any) };
  }
  it('combines real category, purpose, features, price and available stock before pagination', async () => {
    const { service, prisma } = setup();
    const result = await service.list({ category: 'gels,cutters', purpose: 'Маникюр', feature: 'Прозрачный', minPrice: 800, maxPrice: 1500, inStock: 'true', sort: 'price-asc', page: 2, limit: 24 });
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where.categories.some.category.slug.in).toEqual(['gels', 'cutters']);
    expect(args.where.purposes.hasSome).toEqual(['Маникюр']);
    expect(args.where.features.hasSome).toEqual(['Прозрачный']);
    expect(args.where.basePrice).toEqual({ gte: 800, lte: 1500 });
    expect(args.where.AND[0].OR).toEqual([
      { productType: 'GIFT_CARD', variants: { some: { isActive: true } } },
      { variants: { some: { isActive: true, stock: { gt: 'reserved-field-reference' } } } },
    ]);
    expect(args.orderBy).toEqual([{ basePrice: 'asc' }, { id: 'asc' }]);
    expect(args.skip).toBe(24);
    expect(prisma.product.count.mock.calls[0][0].where).toEqual(args.where);
    expect(result.pagination.pages).toBe(2);
  });
  it('rejects reversed price range before accessing the database', async () => {
    const { service, prisma } = setup();
    await expect(service.list({ minPrice: 2000, maxPrice: 1000 })).rejects.toThrow('Минимальная цена');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
  it('validates invalid sorting, prices, page size and flags', async () => {
    for (const query of [{ sort: 'bad' }, { minPrice: -1 }, { page: 0 }, { limit: 101 }, { inStock: 'anything' }, { maxPrice: 'no' }]) expect((await validate(plainToInstance(CatalogQueryDto, query))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(CatalogQueryDto, { sort: 'price-asc', minPrice: '800', page: '2', inStock: 'true' }))).toEqual([]);
  });

  describe('real popular sorting', () => {
    function popularSetup() {
      const ranked = [{ id: 'most-sold' }, { id: 'next-sold' }];
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(ranked),
        product: {
          count: jest.fn().mockResolvedValue(55),
          findMany: jest.fn().mockResolvedValue([{ id: 'next-sold', nameRu: 'Second' }, { id: 'most-sold', nameRu: 'First' }]),
        },
      };
      const prisma = {
        productVariant: { fields: { reserved: 'reserved-field-reference' } },
        product: { count: jest.fn(), findMany: jest.fn() },
        $queryRaw: jest.fn(),
        $transaction: jest.fn(async (callback: any) => callback(tx)),
      };
      return { tx, prisma, service: new ProductsService(prisma as any, {} as any) };
    }

    it('accepts popular in the public DTO with transformed pagination', async () => {
      expect(await validate(plainToInstance(CatalogQueryDto, { sort: 'popular', page: '100000', limit: '100' }))).toEqual([]);
    });

    it('orders returned products by purchased units ranking, not ORM return order or badges', async () => {
      const f = popularSetup();
      const result = await f.service.list({ sort: 'popular', page: 2, limit: 24 });
      expect(result.items.map(item => item.id)).toEqual(['most-sold', 'next-sold']);
      expect(result.items[0]).not.toHaveProperty('isBestseller');
      expect(result.pagination).toEqual({ page: 2, limit: 24, total: 55, pages: 3 });
      const sql = f.tx.$queryRaw.mock.calls[0][0];
      expect(sql.text).toContain('SUM(i.quantity)');
      expect(sql.text).toContain("IN ('PAID', 'SUCCEEDED')");
      expect(sql.text).toContain("NOT IN ('CANCELLED', 'REFUNDED')");
      expect(sql.text).toContain("NOW() - INTERVAL '90 days'");
      expect(sql.text).toContain('ORDER BY COALESCE(sales.units, 0) DESC, p."createdAt" DESC, p.id ASC');
      expect(sql.text).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
      expect(sql.values.slice(-2)).toEqual([24, 24]);
    });

    it('applies every normalized filter before ranking/pagination and preserves the same Prisma count criteria', async () => {
      const f = popularSetup();
      await f.service.list({ sort: 'popular', category: 'gels, cutters,gels', purpose: 'repair,care',
        feature: 'clear,shimmer', minPrice: 0, maxPrice: 1500, search: 'needle', inStock: 'true' });
      const sql = f.tx.$queryRaw.mock.calls[0][0];
      expect(sql.text).toContain('p."isActive" = true');
      expect(sql.text).toContain('p."nameRu" ILIKE');
      expect(sql.text).toContain('p.sku ILIKE');
      expect(sql.text).toContain('"ProductCategory" pc JOIN "Category" c');
      expect(sql.text).toContain('c."isActive" = true');
      expect(sql.text).toContain('p.purposes && ARRAY[');
      expect(sql.text).toContain('p.features && ARRAY[');
      expect(sql.text).toContain('p."basePrice" >=');
      expect(sql.text).toContain('p."basePrice" <=');
      expect(sql.text).toContain('available."isActive" = true');
      expect(sql.text).toContain("p.\"productType\" = 'GIFT_CARD' OR available.stock > available.reserved");
      expect(sql.values).toEqual(expect.arrayContaining(['gels', 'cutters', 'repair', 'care', 'clear', 'shimmer', '%needle%', 0, 1500]));
      const where = f.tx.product.count.mock.calls[0][0].where;
      expect(where.categories.some.category.slug.in).toEqual(['gels', 'cutters']);
      expect(where.purposes.hasSome).toEqual(['repair', 'care']);
      expect(where.features.hasSome).toEqual(['clear', 'shimmer']);
      expect(where.basePrice).toEqual({ gte: 0, lte: 1500 });
      expect(where.AND[0].OR).toHaveLength(2);
      expect(f.tx.product.findMany.mock.calls[0][0]).toMatchObject({
        where: { AND: [where, { id: { in: ['most-sold', 'next-sold'] } }] },
      });
    });

    it('uses repeatable-read and never escapes to root DB reads', async () => {
      const f = popularSetup();
      await f.service.list({ sort: 'popular' });
      expect(f.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
      expect(f.prisma.$queryRaw).not.toHaveBeenCalled();
      expect(f.prisma.product.count).not.toHaveBeenCalled();
      expect(f.prisma.product.findMany).not.toHaveBeenCalled();
      expect(f.tx.product.findMany.mock.calls[0][0]).not.toHaveProperty('take');
      expect(f.tx.$queryRaw.mock.calls[0][0].values.slice(-2)).toEqual([24, 0]);
    });

    it('binds hostile filter strings while preserving Prisma LIKE wildcard semantics', async () => {
      const f = popularSetup();
      const search = "50%_\\'; DROP TABLE Product; --";
      const category = "gels'); DROP TABLE Product; --";
      await f.service.list({ sort: 'popular', search, category });
      const sql = f.tx.$queryRaw.mock.calls[0][0];
      expect(sql.text).not.toContain('DROP TABLE');
      expect(sql.values).toContain(category);
      expect(sql.values).toContain(`%${search}%`);
      expect(f.tx.product.count.mock.calls[0][0].where.OR[0].nameRu.contains).toBe(search);
    });

    it.each(['%', '_', '50%', 'a_b'])('keeps search %s identical between ranked SQL and Prisma count', async search => {
      const f = popularSetup();
      await f.service.list({ sort: 'popular', search });
      expect(f.tx.$queryRaw.mock.calls[0][0].values).toContain(`%${search}%`);
      expect(f.tx.product.count.mock.calls[0][0].where.OR).toEqual([
        { nameRu: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]);
    });

    it('does not apply stock filters unless requested and includes zero-sales products through LEFT JOIN', async () => {
      const f = popularSetup();
      await f.service.list({ sort: 'popular', inStock: 'false' });
      const sql = f.tx.$queryRaw.mock.calls[0][0];
      expect(sql.text).toContain('LEFT JOIN');
      expect(sql.text).toContain('COALESCE(sales.units, 0)');
      expect(sql.text).not.toContain('available.stock');
      expect(f.tx.product.count.mock.calls[0][0].where).toEqual({ isActive: true });
    });

    it('returns empty out-of-range pages with the correct filtered total without loading all IDs', async () => {
      const f = popularSetup();
      f.tx.$queryRaw.mockResolvedValueOnce([]);
      expect(await f.service.list({ sort: 'popular', page: 100000, limit: 100 }))
        .toEqual({ items: [], pagination: { page: 100000, limit: 100, total: 55, pages: 1 } });
      expect(f.tx.$queryRaw.mock.calls[0][0].values.slice(-2)).toEqual([100, 9999900]);
      expect(f.tx.product.findMany).not.toHaveBeenCalled();
    });

    it('rejects invalid price ranges before starting a popular query transaction', async () => {
      const f = popularSetup();
      await expect(f.service.list({ sort: 'popular', minPrice: 2000, maxPrice: 1000 })).rejects.toThrow();
      expect(f.prisma.$transaction).not.toHaveBeenCalled();
    });

    it('shares exactly the same successful-sales subquery with cart recommendations', async () => {
      const f = popularSetup();
      await f.service.list({ sort: 'popular' });
      const popularSql = f.tx.$queryRaw.mock.calls[0][0].text;
      f.prisma.$queryRaw.mockResolvedValueOnce([]);
      await f.service.cartRecommendations();
      const recommendationSql = f.prisma.$queryRaw.mock.calls[0][0].text;
      const sales = (sql: string) => sql.slice(sql.indexOf('SELECT v."productId"'), sql.indexOf('GROUP BY v."productId"') + 'GROUP BY v."productId"'.length);
      expect(sales(popularSql)).toBe(sales(recommendationSql));
    });
  });
});
