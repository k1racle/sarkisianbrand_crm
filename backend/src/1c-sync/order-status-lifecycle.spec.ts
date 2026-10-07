import { settlementBasis } from './finance-policy';
import { OneCSyncService } from './1c-sync.service';

describe('1C B2B fulfillment events (no external calls)', () => {
  function fixture() {
    const order: any = { id: 'order', externalId: 'one-c-order', source: 'B2B', status: 'CONFIRMED', reservationState: 'ACTIVE', items: [{ id: 'line', variantId: 'variant', quantity: 2 }] };
    const stock = { stock: 10, reserved: 2 };
    const tx: any = {
      oneCOrderFinance: { findUnique: jest.fn(async () => ({ basisHash: settlementBasis(order), releaseAllowed: true, validUntil: new Date(Date.now()+60000) })) }, $queryRaw: jest.fn(),
      order: { findFirst: jest.fn(async () => ({ ...order })), update: jest.fn(async ({ data }) => Object.assign(order, data)) },
      orderStatusHistory: { create: jest.fn() },
      productVariant: { updateMany: jest.fn(async ({ data }) => { stock.stock -= data.stock?.decrement || 0; stock.reserved -= data.reserved.decrement; return { count: 1 }; }) },
    };
    const db: any = { $transaction: jest.fn(async fn => fn(tx)), syncLog: { create: jest.fn() } };
    const service = new OneCSyncService(db, {} as any, {} as any);
    const send = (status: string, extra = {}) => service.importOrderStatuses({ statuses: [{ platformOrderId: 'order', external1CId: 'one-c-order', status, ...extra }] });
    return { order, stock, tx, send };
  }
  it('picks, ships and delivers; replays never consume stock or rewrite milestone time twice', async () => {
    const f = fixture();
    await f.send('PICKING', { occurredAt: '2026-10-05T09:00:00Z' });
    await f.send('PACKED', { occurredAt: '2026-10-05T10:00:00Z' });
    await f.send('PACKED', { occurredAt: '2026-10-05T11:00:00Z' });
    expect(f.order.packedAt.toISOString()).toBe('2026-10-05T10:00:00.000Z');
    await f.send('SHIPPED'); await f.send('SHIPPED'); await f.send('DELIVERED'); await f.send('DELIVERED');
    expect(f.order).toMatchObject({ status: 'DELIVERED', reservationState: 'CONSUMED' });
    expect(f.stock).toEqual({ stock: 8, reserved: 0 });
    expect(f.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
    expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(3);
  });
  it('late cancellation after shipping is rejected without status or stock changes', async () => {
    const f = fixture(); await f.send('SHIPPED');
    await expect(f.send('CANCELLED')).rejects.toMatchObject({ status: 409 });
    expect(f.order.status).toBe('SHIPPED'); expect(f.stock).toEqual({ stock: 8, reserved: 0 });
    expect(f.tx.order.update).toHaveBeenCalledTimes(1);
  });
  it('rejects conflicting CRM/1C identifiers before any write', async () => {
    const f = fixture();
    await expect(f.send('SHIPPED', { external1CId: 'different-order' })).rejects.toMatchObject({ status: 409 });
    expect(f.tx.order.update).not.toHaveBeenCalled(); expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
});
