import { OneCSyncService } from './1c-sync.service';
import { parseOneCCatalog } from './one-c-products';

describe('safe 1C catalog import', () => {
  const row = { externalId: 'id-1', sku: 'SKU-1', nameRu: 'Товар', price: 125, stock: 7 };

  it('preserves missing stock instead of manufacturing a zero balance', async () => {
    const parsed = parseOneCCatalog({ products: [{ ...row, stock: undefined, price: '125.00' }] });
    expect(parsed).toEqual([{ externalId: 'id-1', sku: 'SKU-1', nameRu: 'Товар', slug: 'sku-1', price: 125 }]);
    const variant = { id: 'v', stock: 18, reserved: 0, price: 100 };
    const tx: any = {
      $executeRaw: jest.fn(), product: { upsert: jest.fn(async () => ({ id: 'p' })) },
      productVariant: { findMany: jest.fn(async () => [variant]), updateMany: jest.fn(async ({ data }) => { Object.assign(variant, data); return { count: 1 }; }) },
      oneCWarehouseStock: { findUnique: jest.fn() }, orderItem: { count: jest.fn() }, syncLog: { create: jest.fn() },
    };
    const db: any = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
    const service: any = new OneCSyncService(db, {} as any, {} as any);
    await service.processProducts({ products: parsed }, async () => {});
    expect(variant).toMatchObject({ stock: 18, price: 125 });
    expect(tx.oneCWarehouseStock.findUnique).not.toHaveBeenCalled();
    expect(tx.orderItem.count).not.toHaveBeenCalled();
  });

  it('accepts explicit zero and documented aliases and wrappers', () => {
    expect(parseOneCCatalog({ value: [{ Ref_Key: 'ref', Code: 'CODE', Description: 'Товар', basePrice: '0', quantity: '0' }] })).toEqual([
      { externalId: 'ref', sku: 'CODE', nameRu: 'Товар', slug: 'code', price: 0, stock: 0 },
    ]);
    expect(parseOneCCatalog([row])[0]).toMatchObject({ price: 125, stock: 7 });
  });

  it.each([
    ['missing price', { ...row, price: undefined }],
    ['null price', { ...row, price: null }],
    ['empty price', { ...row, price: ' ' }],
    ['boolean price', { ...row, price: false }],
    ['negative price', { ...row, price: -1 }],
    ['price with fractions of a kopeck', { ...row, price: '10.001' }],
    ['non-finite price', { ...row, price: 'Infinity' }],
    ['null stock', { ...row, stock: null }],
    ['empty stock', { ...row, stock: '' }],
    ['boolean stock', { ...row, stock: false }],
    ['fractional stock', { ...row, stock: 1.5 }],
    ['negative stock', { ...row, stock: -1 }],
    ['missing identifier', { ...row, externalId: '' }],
    ['missing sku', { ...row, sku: '' }],
    ['missing name', { ...row, nameRu: '' }],
    ['malformed entry', null],
  ])('rejects %s and does not discard the invalid row', (_label, invalid) => {
    expect(() => parseOneCCatalog({ products: [row, invalid] })).toThrow(/Товар 1С №2/);
  });

  it.each([
    ['external identifier', { ...row, sku: 'SKU-2' }],
    ['SKU', { ...row, externalId: 'id-2' }],
    ['slug', { ...row, externalId: 'id-2', sku: 'SKU-2', slug: 'sku-1' }],
  ])('rejects duplicate %s in a whole package', (_label, duplicate) => {
    expect(() => parseOneCCatalog({ products: [row, duplicate] })).toThrow(/повторяется/);
  });

  it.each([null, {}, { products: null }, { products: [] }, { products: 'bad' }])('rejects incomplete package without opening a transaction', async raw => {
    const db: any = { $transaction: jest.fn() };
    const client: any = { testConnection: jest.fn(), get: jest.fn(async () => raw) };
    const service: any = new OneCSyncService(db, {} as any, client);
    await expect(service.processFullExchange(async () => {})).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('does not partially apply a full exchange when a later row is incomplete', async () => {
    const db: any = { $transaction: jest.fn() };
    const client: any = { testConnection: jest.fn(), get: jest.fn(async () => ({ products: [row, { ...row, externalId: 'id-2', sku: 'SKU-2', price: undefined }] })) };
    const service: any = new OneCSyncService(db, {} as any, client);
    await expect(service.processFullExchange(async () => {})).rejects.toThrow(/Товар 1С №2.*цены/);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(client.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing price', { price: undefined }], ['null stock', { stock: null }], ['negative price', { price: -1 }],
    ['duplicate sku', { sku: 'SKU-1' }],
  ])('validates the entire queued import before changing any product: %s', async (_label, invalid) => {
    const db: any = { $transaction: jest.fn() };
    const service: any = new OneCSyncService(db, {} as any, {} as any);
    await expect(service.processProducts({ products: [
      { ...row, slug: 'sku-1' }, { ...row, externalId: 'id-2', sku: 'SKU-2', slug: 'sku-2', ...invalid },
    ] }, async () => {})).rejects.toThrow(/Товар 1С №2/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
