import { PrismaClient } from '@prisma/client';
import { WildberriesFbsService } from './wildberries-fbs.service';

// Only the temporary, explicitly provisioned local test DB may be used.
const url = process.env.WB_FBS_TEST_DATABASE_URL;
if (url && (!url.startsWith('postgresql://wb_fixture:') || !url.includes('@127.0.0.1:55433/wb_fixture'))) throw new Error('WB_FBS_TEST_DATABASE_URL must point to the isolated fixture database');
const pg = url ? describe : describe.skip;
const asResponse = (value: unknown) => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } });
const order = { id: 111, chrtId: 222, article: 'EXAMPLE', deliveryType: 'fbs', convertedPrice: 1000, convertedCurrencyCode: 643 };
const status = { id: 111, supplierStatus: 'new', wbStatus: 'waiting' };

pg('WB FBS persistent cursor and concurrent workers (isolated PostgreSQL)', () => {
  const db = new PrismaClient({ datasources: { db: { url: url || 'postgresql://unused:unused@127.0.0.1:55433/wb_fixture' } } });
  const secrets: any = { decrypt: () => ({ apiToken: 'fixture-only' }) };
  beforeEach(async () => {
    process.env.WB_FBS_ALLOW_SANDBOX_IMPORT = 'true';
    await db.marketplaceSyncCursor.deleteMany();
    await db.ecosystemIntegration.deleteMany({ where: { key: 'WILDBERRIES' } });
    await db.ecosystemIntegration.create({ data: { key: 'WILDBERRIES', provider: 'WILDBERRIES', name: 'Fixture', category: 'MARKETPLACE', isEnabled: true, environment: 'TEST', encryptedSecrets: 'fixture', configuredSecretKeys: ['apiToken'] } });
  });
  afterEach(() => { delete process.env.WB_FBS_ALLOW_SANDBOX_IMPORT; jest.restoreAllMocks(); });
  afterAll(async () => db.$disconnect());

  it('allows only one live worker and releases its lease after successful processing', async () => {
    let entered!: () => void, release!: () => void;
    const enteredImport = new Promise<void>(resolve => entered = resolve);
    const blocked = new Promise<void>(resolve => release = resolve);
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn(async () => { entered(); await blocked; }) };
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(asResponse({ next: 0, orders: [order] })).mockResolvedValueOnce(asResponse({ orders: [status] }));
    const first = new WildberriesFbsService(db as any, oms, secrets), second = new WildberriesFbsService(db as any, oms, secrets);
    const pending = first.sync('fixture-actor');
    await enteredImport;
    await expect(second.sync('fixture-actor')).rejects.toThrow('уже выполняется');
    release();
    expect(await pending).toMatchObject({ processed: 1, unmapped: 1, hasMore: false });
    const cursor = await db.marketplaceSyncCursor.findUniqueOrThrow({ where: { key: 'WILDBERRIES:FBS' } });
    expect(cursor.leaseId).toBeNull(); expect(cursor.lastSuccessAt).not.toBeNull();
    expect(oms.ingestMarketplace).toHaveBeenCalledTimes(1); expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not advance the persisted page when CRM import fails and retries exactly that page', async () => {
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn().mockRejectedValueOnce(new Error('fixture-fail')).mockResolvedValueOnce({}) };
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(asResponse({ next: 999, orders: [order] })).mockResolvedValueOnce(asResponse({ orders: [status] }))
      .mockResolvedValueOnce(asResponse({ next: 999, orders: [order] })).mockResolvedValueOnce(asResponse({ orders: [status] }));
    const now = Math.floor(Date.now() / 1000), saved = { from: now - 100, to: now, next: 50 };
    await db.marketplaceSyncCursor.create({ data: { key: 'WILDBERRIES:FBS', state: saved } });
    const service = new WildberriesFbsService(db as any, oms, secrets);
    await expect(service.sync('fixture-actor')).rejects.toThrow('fixture-fail');
    expect((await db.marketplaceSyncCursor.findUniqueOrThrow({ where: { key: 'WILDBERRIES:FBS' } })).state).toEqual(saved);
    await service.sync('fixture-actor');
    expect((await db.marketplaceSyncCursor.findUniqueOrThrow({ where: { key: 'WILDBERRIES:FBS' } })).state).toEqual({ ...saved, next: 999 });
  });

  it('does not import a stale response if settings change during the network request', async () => {
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn() };
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(asResponse({ next: 0, orders: [order] })).mockImplementationOnce(async () => {
      await db.ecosystemIntegration.update({ where: { key: 'WILDBERRIES' }, data: { isEnabled: false } });
      return asResponse({ orders: [status] });
    });
    await expect(new WildberriesFbsService(db as any, oms, secrets).sync('fixture-actor')).rejects.toThrow('Настройки Wildberries изменились');
    expect(oms.ingestMarketplace).not.toHaveBeenCalled();
  });

  it('catches up in 30-day windows after an extended but recoverable interruption', async () => {
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn() };
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => asResponse({ next: 0, orders: [] }));
    await db.marketplaceSyncCursor.create({ data: { key: 'WILDBERRIES:FBS', lastSuccessAt: new Date(Date.now() - 60 * 86400 * 1000) } });
    const service = new WildberriesFbsService(db as any, oms, secrets);
    expect(await service.sync('fixture-actor')).toMatchObject({ hasMore: true });
    const saved: any = (await db.marketplaceSyncCursor.findUniqueOrThrow({ where: { key: 'WILDBERRIES:FBS' } })).state;
    expect(saved.to - saved.from).toBeLessThanOrEqual(30 * 86400);
    expect(await service.sync('fixture-actor')).toMatchObject({ hasMore: true });
    expect(await service.sync('fixture-actor')).toMatchObject({ hasMore: false });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
