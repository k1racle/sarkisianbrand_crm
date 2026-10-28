import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OneCSyncService } from './1c-sync.service';
import { parseOneCCatalog } from './one-c-products';

const databaseUrl = process.env.WAREHOUSE_TEST_DATABASE_URL;
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (!['127.0.0.1', 'localhost'].includes(parsed.hostname) || parsed.pathname !== '/warehouse_test' || parsed.port !== '55432') throw new Error('Catalog PostgreSQL tests require the dedicated local warehouse_test database on port 55432');
}
const run = databaseUrl ? describe : describe.skip;

run('isolated PostgreSQL: 1C product import', () => {
  let db: PrismaClient, service: any;
  const ids: string[] = [];
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await db.$connect();
    service = new OneCSyncService(db as unknown as PrismaService, {} as any, {} as any);
  });
  afterAll(async () => {
    if (db) { await db.product.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect(); }
  });
  async function product(reserved = 0) {
    const id = randomUUID(), sku = `catalog-${id}`;
    const item = await db.product.create({ data: { externalId: `external-${id}`, sku, slug: sku, nameRu: 'Прежнее название', basePrice: '100.00', variants: { create: { sku, name: 'Основной', options: {}, price: '100.00', stock: 10, reserved } } }, include: { variants: true } });
    ids.push(item.id);
    return item;
  }
  const row = (item: any, fields: any = {}) => ({ externalId: item.externalId, sku: item.sku, nameRu: 'Новое название', slug: item.slug, price: 120, ...fields });

  it('updates the supplied price and leaves the existing stock unchanged when stock is absent', async () => {
    const item = await product();
    const incoming = parseOneCCatalog({ products: [row(item)] });
    await service.processProducts({ products: incoming }, async () => {});
    const saved = await db.product.findUniqueOrThrow({ where: { id: item.id }, include: { variants: true } });
    expect(saved.nameRu).toBe('Новое название');
    expect(saved.basePrice.toString()).toBe('120');
    expect(saved.variants[0].price.toString()).toBe('120');
    expect(saved.variants[0].stock).toBe(10);
  });

  it('does not apply an earlier valid row if a later row has no price', async () => {
    const first = await product(), second = await product();
    expect(() => parseOneCCatalog({ products: [row(first, { stock: 4 }), row(second, { price: undefined })] })).toThrow(/Товар 1С №2/);
    const saved = await db.product.findUniqueOrThrow({ where: { id: first.id }, include: { variants: true } });
    expect(saved.nameRu).toBe('Прежнее название');
    expect(saved.basePrice.toString()).toBe('100');
    expect(saved.variants[0].price.toString()).toBe('100');
    expect(saved.variants[0].stock).toBe(10);
  });

  it('rolls back the first update if the second row conflicts with an existing reserve', async () => {
    const first = await product(), second = await product(3);
    const incoming = parseOneCCatalog({ products: [row(first, { stock: 4 }), row(second, { stock: 2 })] });
    await expect(service.processProducts({ products: incoming }, async () => {})).rejects.toThrow(/меньше действующего резерва/);
    for (const item of [first, second]) {
      const saved = await db.product.findUniqueOrThrow({ where: { id: item.id }, include: { variants: true } });
      expect(saved.nameRu).toBe('Прежнее название');
      expect(saved.basePrice.toString()).toBe('100');
      expect(saved.variants[0].price.toString()).toBe('100');
      expect(saved.variants[0].stock).toBe(10);
    }
  });
});
