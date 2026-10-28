import { OneCSyncService } from './1c-sync.service';

describe('1C marketplace export requires mapped product lines', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const order = (id: string, variantId: string | null) => ({
    id, orderNumber: id, source: 'WILDBERRIES', updatedAt: now,
    items: [{ productType: 'PHYSICAL', variantId }],
  });
  function fixture() {
    const db: any = { order: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const client: any = { status: jest.fn().mockResolvedValue({ enabled: true, configured: true }), configuration: jest.fn().mockResolvedValue({}), post: jest.fn().mockResolvedValue({}) };
    return { db, client, service: new OneCSyncService(db, {} as any, client) };
  }

  it('blocks the single-order export before any provider call', async () => {
    const f = fixture(); f.db.order.findFirst.mockResolvedValue(order('unmapped', null));
    await expect((f.service as any).processOrderExport('unmapped')).rejects.toThrow('Сопоставьте все товары');
    expect(f.client.post).not.toHaveBeenCalled();
    expect(f.db.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isSynced1C: false, oneCSyncError: expect.stringContaining('Сопоставьте') }) }));
  });

  it('sends only mapped orders in a full exchange and records the others for review', async () => {
    const f = fixture(); const mapped = order('mapped', 'variant');
    jest.spyOn(f.service as any, 'orderPayload').mockImplementation((row: any) => ({ id: row.id }));
    jest.spyOn(f.service as any, 'applyAcknowledgement').mockResolvedValue(undefined);
    expect(await (f.service as any).exportOrders([order('unmapped', null), mapped])).toBe(1);
    expect(f.client.post).toHaveBeenCalledWith('ordersPath', '/hs/sarkisian/v1/orders', { orders: [{ id: 'mapped' }] });
    expect(f.db.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'unmapped', updatedAt: now } }));
  });

  it('recovery excludes marketplace orders with unmatched lines', async () => {
    const f = fixture(); await (f.service as any).recoverPendingOrders();
    expect(f.db.order.findMany.mock.calls[0][0].where.AND).toContainEqual({ OR: [
      { source: { notIn: ['OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET'] } },
      { items: { some: {}, none: { productType: 'PHYSICAL', variantId: null } } },
    ] });
  });
});
