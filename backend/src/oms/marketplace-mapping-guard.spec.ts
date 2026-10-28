import { marketplaceContentHash } from './marketplace-lines';
import { OmsService } from './oms.service';

describe('Marketplace variant safety', () => {
  const item = { sku: 'same-as-our-sku', externalVariantId: 'wb-chrt-1', price: 100, quantity: 1 };
  it('never treats a Wildberries article match as a confirmed variant mapping', async () => {
    const tx: any = { orderItem: { deleteMany: jest.fn(), create: jest.fn() }, marketplaceVariantMapping: { findUnique: jest.fn().mockResolvedValue(null) }, productVariant: { findUnique: jest.fn() } };
    await (new OmsService({} as any, {} as any) as any).replaceLines(tx, 'order', [item], 'WILDBERRIES');
    expect(tx.productVariant.findUnique).not.toHaveBeenCalled();
    expect(tx.orderItem.create.mock.calls[0][0].data.variantId).toBeUndefined();
    expect(tx.marketplaceVariantMapping.findUnique).toHaveBeenCalledWith(expect.objectContaining({where: {channel_externalVariantId: {channel: 'WILDBERRIES', externalVariantId: 'wb-chrt-1'}}}));
  });
  it('uses the explicit mapping and incorporates the marketplace variant and fulfillment mode into deduplication', async () => {
    const tx: any = { orderItem: { deleteMany: jest.fn(), create: jest.fn() }, marketplaceVariantMapping: { findUnique: jest.fn().mockResolvedValue({variant: {id: 'local', isActive: true, name: 'Основной', product: {isActive: true, productType: 'PHYSICAL', nameRu: 'Гель'}}}) }, productVariant: { findUnique: jest.fn() } };
    await (new OmsService({} as any, {} as any) as any).replaceLines(tx, 'order', [item], 'WILDBERRIES');
    expect(tx.orderItem.create.mock.calls[0][0].data.variantId).toBe('local');
    const input = { items: [item], totalAmount: 100, fulfillmentMode: 'FBS' as const };
    expect(marketplaceContentHash(input)).not.toBe(marketplaceContentHash({...input, fulfillmentMode: 'FBO'}));
    expect(marketplaceContentHash(input)).not.toBe(marketplaceContentHash({...input, items: [{...item, externalVariantId: 'other'}]}));
    expect(marketplaceContentHash({...input, payload: {provider: 'OZON', sourceStatus: 'awaiting_packaging'}})).not.toBe(marketplaceContentHash({...input, payload: {provider: 'OZON', sourceStatus: 'delivered'}}));
  });
});
