import { normalizeOzonPosting, readOzonPage } from './ozon-orders';
import { OzonSyncService } from './ozon-sync.service';

const posting = { posting_number: '123-1', order_number: '123', status: 'awaiting_packaging', products: [{ sku: 123456, offer_id: 'SKU-1', name: 'Гель', quantity: 2, price: { amount: '10.20', currency: 'RUB' } }] };

describe('Ozon seller read-only import', () => {
  it('normalizes FBS and FBO separately and keeps marketplace status as a fact, not warehouse execution', () => {
    expect(normalizeOzonPosting(posting, 'FBS')).toMatchObject({ externalId: '123-1', fulfillmentMode: 'FBS', status: 'NEW', totalAmount: 20.4, payload: { sourceStatus: 'awaiting_packaging' } });
    expect(normalizeOzonPosting({ ...posting, status: 'delivered' }, 'FBO')).toMatchObject({ fulfillmentMode: 'FBO', status: 'NEW', payload: { sourceStatus: 'delivered' } });
    expect(normalizeOzonPosting({ ...posting, status: 'cancelled' }, 'FBS').status).toBe('CANCELLED');
  });
  it.each([{...posting, products: []}, {...posting, products: [{ ...posting.products[0], price: undefined }]}, {...posting, products: [{ ...posting.products[0], offer_id: '' }]}, {...posting, products: [{ ...posting.products[0], sku: undefined }]}, {...posting, products: [{ ...posting.products[0], price: { amount: '10', currency: 'USD' } }]}])('rejects missing or unsafe product facts', raw => {
    expect(() => normalizeOzonPosting(raw, 'FBS')).toThrow();
  });
  it('uses the official fixed Ozon host and cursor-based FBS response', async () => {
    const transport = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ postings: [posting], has_next: true, cursor: 'next' }) });
    expect(await readOzonPage({clientId: 'fixture', apiKey: 'secret'}, 'FBS', {since: 'a', to: 'b', cursor: ''}, transport as any)).toMatchObject({ has_next: true, cursor: 'next' });
    expect(transport.mock.calls[0][0]).toBe('https://api-seller.ozon.ru/v4/posting/fbs/list');
    expect(transport.mock.calls[0][1]).toMatchObject({ redirect: 'error', headers: { 'Client-Id': 'fixture', 'Api-Key': 'secret' } });
    expect(JSON.parse(transport.mock.calls[0][1].body)).toMatchObject({ cursor: '', filter: { since: 'a', to: 'b' } });
  });
  it('rejects incomplete pages and cursors without silently marking success', async () => {
    for (const data of [{}, { postings: [], has_next: true }, { postings: [], has_next: true, cursor: 'same' }]) {
      await expect(readOzonPage({clientId: 'x', apiKey: 'y'}, 'FBO', {since: 'a', to: 'b', cursor: 'same'}, jest.fn().mockResolvedValue({ok: true, json: async () => data}) as any)).rejects.toThrow();
    }
  });
  it('stores a cursor only after every order on the page is imported; final success waits for last page', async () => {
    const state: any = { key: 'OZON:FBS', state: null, leaseId: null };
    const db: any = {
      marketplaceSyncCursor: {
        upsert: jest.fn().mockResolvedValue(state), findUniqueOrThrow: jest.fn(async () => ({ ...state })),
        updateMany: jest.fn(async ({data}: any) => { Object.assign(state, data); return {count: 1}; }),
      },
      ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue({isEnabled: true, config: {clientId: 'fixture'}, encryptedSecrets: 'opaque'}) },
    };
    const oms: any = { assertMarketplaceImport: jest.fn(), ingestMarketplace: jest.fn().mockResolvedValue({marketplaceImportIssue: null}) };
    const secrets: any = {decrypt: jest.fn().mockReturnValue({apiKey: 'fixture-key'})};
    const service = new OzonSyncService(db, secrets, oms);
    const previous = global.fetch;
    try {
      global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({postings: [posting], has_next: true, cursor: 'page-2'})}) as any;
      expect(await service.sync('actor', 'FBS')).toMatchObject({processed: 1, hasNext: true});
      expect(state.state.cursor).toBe('page-2'); expect(state.lastSuccessAt).toBeUndefined();
      global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({postings: [posting], has_next: false})}) as any;
      oms.ingestMarketplace.mockRejectedValueOnce(new Error('failure'));
      await expect(service.sync('actor', 'FBS')).rejects.toThrow('failure');
      expect(state.state.cursor).toBe('page-2'); expect(state.lastSuccessAt).toBeUndefined();
      await service.sync('actor', 'FBS');
      expect(state.state.cursor).toBe(''); expect(state.lastSuccessAt).toBeInstanceOf(Date);
    } finally { global.fetch = previous; }
  });
});
