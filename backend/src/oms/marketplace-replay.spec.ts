import { marketplaceContentHash } from './marketplace-lines';
import { OmsService } from './oms.service';
import { normalizeOzonPosting } from '../marketplaces/ozon-orders';

jest.mock('../common/operational-access', () => ({
  withOperationalAccess: (db: any, _access: any, _actor: string, _domain: string, _mutation: boolean, run: any) =>
    db.$transaction((tx: any) => run({ db: tx, read: { company: () => true }, write: { company: () => true }, visible: {} })),
}));
jest.mock('./oms-read.service', () => ({
  orderSelect: () => ({}), orderAccessWhere: () => ({}), marketplaceSources: ['OZON', 'WILDBERRIES'],
  OmsReadService: class { async views(_ctx: any, rows: any[]) { return rows; } },
}));

describe('replaying an Ozon order after confirming its mapping', () => {
  function fixture(mapping: any) {
    const input = normalizeOzonPosting({ posting_number: 'O-1', status: 'awaiting_packaging', products: [{ sku: 123, offer_id: 'article', name: 'Гель', quantity: 1, price: '100' }] }, 'FBS');
    const line: any = { id: 'line', offerId: 'sku:123', variantId: null };
    const order: any = { id: 'order', orderNumber: 'O-1', source: 'OZON', status: 'NEW', reservationState: 'LEGACY', fulfillmentManaged: false, marketplaceImportHash: marketplaceContentHash(input), items: [line] };
    const tx: any = {
      $queryRaw: jest.fn(),
      order: {findUnique: jest.fn(async () => order), findUniqueOrThrow: jest.fn(async () => order), update: jest.fn(async ({data}: any) => Object.assign(order, data))},
      marketplaceOrder: {upsert: jest.fn(async () => ({id: 'staging', status: 'NEW'}))},
      orderItem: {findMany: jest.fn(async () => line.variantId ? [] : [line]), count: jest.fn(async () => line.variantId ? 0 : 1), update: jest.fn(async ({data}: any) => Object.assign(line, data)), deleteMany: jest.fn()},
      marketplaceVariantMapping: {findUnique: jest.fn(async () => mapping)},
    };
    const db: any = {$transaction: async (run: any) => run(tx)};
    const oneC: any = {stageOrderExport: jest.fn()};
    return {input, line, order, tx, oneC, service: new OmsService(db, oneC, undefined, {} as any)};
  }
  it('uses the exact normalized Ozon variant ID, preserves the order line and stages export once', async () => {
    const f = fixture({variant: {id: 'variant', isActive: true, product: {isActive: true, productType: 'PHYSICAL'}}});
    expect((f.input.items as any[])[0]).toMatchObject({offerId: 'sku:123', externalVariantId: 'sku:123', sku: 'article'});
    await f.service.ingestMarketplace(f.input, 'actor');
    expect(f.tx.marketplaceVariantMapping.findUnique).toHaveBeenCalledWith(expect.objectContaining({where: {channel_externalVariantId: {channel: 'OZON', externalVariantId: 'sku:123'}}}));
    expect(f.line.variantId).toBe('variant'); expect(f.tx.orderItem.deleteMany).not.toHaveBeenCalled();
    expect(f.oneC.stageOrderExport).toHaveBeenCalledTimes(1);
    expect(f.oneC.stageOrderExport).toHaveBeenCalledWith(f.tx, 'order', 'actor');
    await f.service.ingestMarketplace(f.input, 'actor');
    expect(f.oneC.stageOrderExport).toHaveBeenCalledTimes(1);
  });
  it('keeps an unmapped line and does not enqueue export', async () => {
    const f = fixture(null);
    await f.service.ingestMarketplace(f.input, 'actor');
    expect(f.line.variantId).toBeNull(); expect(f.oneC.stageOrderExport).not.toHaveBeenCalled();
  });
});
