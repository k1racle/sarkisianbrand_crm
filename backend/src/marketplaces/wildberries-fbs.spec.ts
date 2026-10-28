import { BadGatewayException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { WildberriesFbsClient } from './wildberries-fbs.client';
import { normalizeWildberriesFbs, WildberriesFbsService } from './wildberries-fbs.service';

const wbOrder = { id: 42, chrtId: 1234, nmId: 321, article: 'SELLER-ARTICLE', deliveryType: 'fbs', convertedPrice: 12345, convertedCurrencyCode: 643, price: 12000, currencyCode: 643, createdAt: '2026-10-27T12:00:00Z' };
const wbStatus = { id: 42, supplierStatus: 'new', wbStatus: 'waiting' };
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

describe('Wildberries FBS adapter', () => {
  it('uses fixed sandbox host and treats the seller token as a header, not a query', async () => {
    const request: any = jest.fn().mockResolvedValue(response({ next: 0, orders: [wbOrder] }));
    const client = new WildberriesFbsClient('fixture-token', 'TEST', request);
    expect(await client.orders(100, 200, 0)).toEqual({ next: 0, orders: [wbOrder] });
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://marketplace-api-sandbox.wildberries.ru/api/v3/orders?limit=100&next=0&dateFrom=100&dateTo=200');
    expect(url).not.toContain('fixture-token');
    expect(options).toMatchObject({ method: 'GET', redirect: 'error', headers: { Authorization: 'fixture-token' } });
  });

  it('rejects invalid pagination and missing or duplicated statuses instead of advancing', async () => {
    const request: any = jest.fn().mockResolvedValue(response({ orders: [wbStatus, wbStatus] }));
    const client = new WildberriesFbsClient('fixture-token', 'PRODUCTION', request);
    await expect(client.orders(100, 100 + 31 * 86400, 0)).rejects.toBeInstanceOf(BadGatewayException);
    await expect(client.statuses([42, 43])).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('does not leak provider error body or token and never follows redirects', async () => {
    const request: any = jest.fn().mockResolvedValue(response({ secret: 'fixture-token' }, 429));
    const client = new WildberriesFbsClient('fixture-token', 'TEST', request);
    await expect(client.orders(100, 200, 0)).rejects.toThrow('HTTP 429');
    expect(request.mock.calls[0][1].redirect).toBe('error');
    request.mockRejectedValue(new Error('fixture-token'));
    await expect(client.orders(100, 200, 0)).rejects.toThrow('Нет связи');
  });

  it('keeps WB prices informational and only uses a confirmed variant mapping', () => {
    const mapped = normalizeWildberriesFbs(wbOrder, wbStatus, 'CRM-SKU');
    expect(mapped).toMatchObject({ channel: 'WILDBERRIES', externalId: '42', fulfillmentMode: 'FBS', totalAmount: 123.45, items: [{ sku: 'CRM-SKU', externalVariantId: '1234', quantity: 1 }], payload: { financialData: 'INFORMATIONAL', variantMappingConfirmed: true } });
    const unresolved = normalizeWildberriesFbs(wbOrder, wbStatus, null);
    expect(unresolved.items[0].sku).toBe('WB-UNMAPPED-CHRT-1234');
    expect(unresolved.payload.variantMappingConfirmed).toBe(false);
    expect(normalizeWildberriesFbs(wbOrder, { ...wbStatus, wbStatus: 'canceled_by_client' }, null).status).toBe('CANCELLED');
    expect(normalizeWildberriesFbs(wbOrder, { ...wbStatus, wbStatus: 'sold' }, null).status).toBe('NEW');
    expect(() => normalizeWildberriesFbs({ ...wbOrder, convertedCurrencyCode: 840 }, wbStatus, null)).toThrow();
    expect(() => normalizeWildberriesFbs({ ...wbOrder, deliveryType: 'dbs' }, wbStatus, null)).toThrow();
  });

  function fixture() {
    const settings = { isEnabled: true, environment: 'TEST', encryptedSecrets: 'encrypted', updatedAt: new Date('2026-10-28T00:00:00Z') };
    const now = Math.floor(Date.now() / 1000);
    const row: any = { state: { from: now - 100, to: now, next: 0 }, actorId: null };
    const prisma: any = {
      ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(settings) },
      marketplaceSyncCursor: {
        upsert: jest.fn().mockResolvedValue(row), findUniqueOrThrow: jest.fn().mockResolvedValue(row),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      marketplaceVariantMapping: { findUnique: jest.fn().mockResolvedValue({ variant: { sku: 'CRM-SKU', isActive: true, product: { productType: 'PHYSICAL', isActive: true } } }) },
      productVariant: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn().mockResolvedValue({}) };
    const secrets: any = { decrypt: jest.fn().mockReturnValue({ apiToken: 'fixture-token' }) };
    const service = new WildberriesFbsService(prisma, oms, secrets);
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(response({ next: 77, orders: [wbOrder] })).mockResolvedValueOnce(response({ orders: [wbStatus] }));
    return { service, prisma, oms, fetchSpy, settings, row };
  }

  beforeEach(() => { process.env.WB_FBS_ALLOW_SANDBOX_IMPORT = 'true'; });
  afterEach(() => { delete process.env.WB_FBS_ALLOW_SANDBOX_IMPORT; jest.restoreAllMocks(); });

  it('saves pagination only after status retrieval and successful CRM import', async () => {
    const f = fixture();
    expect(await f.service.sync('actor')).toEqual({ processed: 1, unmapped: 0, hasMore: true });
    expect(f.oms.assertMarketplaceImport).toHaveBeenCalledWith('actor');
    expect(f.oms.ingestMarketplace).toHaveBeenCalledWith(expect.objectContaining({ fulfillmentMode: 'FBS', externalId: '42' }), 'actor', { integrationKey: 'WILDBERRIES', integrationUpdatedAt: f.settings.updatedAt });
    const final = f.prisma.marketplaceSyncCursor.updateMany.mock.calls.at(-1)[0];
    expect(final.data.state).toEqual({ ...f.row.state, next: 77 });
    expect(final.where.leaseId).toBeTruthy();
  });

  it('leaves the cursor intact on failure and rejects competing worker', async () => {
    const f = fixture(); f.oms.ingestMarketplace.mockRejectedValue(new Error('failed'));
    await expect(f.service.sync('actor')).rejects.toThrow('failed');
    const final = f.prisma.marketplaceSyncCursor.updateMany.mock.calls.at(-1)[0];
    expect(final.data).not.toHaveProperty('state');
    expect(final.data.lastError).not.toContain('fixture-token');
    const g = fixture(); g.prisma.marketplaceSyncCursor.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(g.service.sync('actor')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an in-flight response after the WB account was changed', async () => {
    const f = fixture();
    f.prisma.ecosystemIntegration.findUnique.mockResolvedValueOnce(f.settings).mockResolvedValueOnce({ isEnabled: true, updatedAt: new Date('2026-10-28T01:00:00Z') });
    await expect(f.service.sync('actor')).rejects.toBeInstanceOf(ConflictException);
    expect(f.oms.ingestMarketplace).not.toHaveBeenCalled();
  });

  it('does not call WB when the integration is disabled', async () => {
    const f = fixture(); f.prisma.ecosystemIntegration.findUnique.mockResolvedValueOnce({ ...f.settings, isEnabled: false });
    await expect(f.service.sync('actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f.fetchSpy).not.toHaveBeenCalled();
  });

  it('does not mix sandbox orders into an ordinary CRM database by default', async () => {
    const f = fixture(); delete process.env.WB_FBS_ALLOW_SANDBOX_IMPORT;
    await expect(f.service.sync('actor')).rejects.toThrow('изолированную базу');
    expect(f.fetchSpy).not.toHaveBeenCalled();
  });

  it('reports an unrecoverable history gap without advancing the cursor', async () => {
    const f = fixture(); f.row.state = { from: Math.floor(Date.now() / 1000) - 90 * 86400, to: Math.floor(Date.now() / 1000) - 60 * 86400, next: 0 };
    await expect(f.service.sync('actor')).rejects.toThrow('Нужна отдельная сверка');
    expect(f.fetchSpy).not.toHaveBeenCalled();
    const last = f.prisma.marketplaceSyncCursor.updateMany.mock.calls.at(-1)[0];
    expect(last.data).not.toHaveProperty('state');
    expect(last.data.lastError).toContain('История FBS старше');
  });
});
