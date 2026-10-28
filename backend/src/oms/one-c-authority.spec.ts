import { OrderStatus } from '@prisma/client';
import { assertLocalWarehouseTransition } from '../common/storefront-order-transition';
import { OmsExecutionService } from './oms-execution.service';
import { OmsAdjustmentService } from './oms-adjustment.service';

jest.mock('../common/operational-access', () => ({
  withOperationalAccess: (prisma: any, _access: any, _actor: string, _domain: string, _write: boolean, action: any) =>
    prisma.$transaction((tx: any) => action({ db: tx, read: { orders: () => ({}) }, write: { orders: () => ({}) } })),
}));

function fixture() {
  const order: any = {
    id: 'order', source: 'B2B', sourceChannel: 'B2B', status: 'NEW', managerId: 'manager',
    reservationState: 'ACTIVE', reservationExpiresAt: null, fulfillmentManaged: false, paymentStatus: 'PENDING',
    updatedAt: new Date('2026-01-01T00:00:00Z'), currency: 'RUB', totalAmount: 100, discountAmount: 0, finalAmount: 100,
    shippingAddress: {}, shippingCost: 0, shippingProvider: 'delivery', paymentMethod: null,
    items: [{ id: 'line', variantId: 'variant', quantity: 1, productType: 'PHYSICAL', price: 100, total: 100 }], payments: [], execution: null,
  };
  const writes: any[] = [];
  let prior: any = null;
  const tx: any = {
    $queryRaw: jest.fn(async () => [{ id: 'variant' }]),
    order: { findFirst: jest.fn(async () => order), update: jest.fn(async data => { writes.push(['order', data]); }) },
    orderExecution: { create: jest.fn(async data => { writes.push(['execution', data]); }) },
    orderExecutionOperation: {
      findUnique: jest.fn(async () => prior),
      create: jest.fn(async ({ data }) => { prior = { ...data, id: 'operation' }; writes.push(['operation', data]); return prior; }),
    },
    productVariant: { findUnique: jest.fn(async () => ({ stock: 5, reserved: 1 })), updateMany: jest.fn() },
    user: { findUniqueOrThrow: jest.fn(async () => ({ firstName: 'Анна', lastName: '' })) },
    orderStatusHistory: { create: jest.fn(async data => { writes.push(['history', data]); }) },
    auditLog: { create: jest.fn(async data => { writes.push(['audit', data]); }) },
  };
  const prisma: any = { $transaction: jest.fn(async fn => {
    const before = writes.length, oldPrior = prior;
    try { return await fn(tx); } catch (error) { writes.splice(before); prior = oldPrior; throw error; }
  }) };
  const oneC: any = { stageOrderExport: jest.fn(async (db, id, actor) => { expect(db).toBe(tx); writes.push(['stage', id, actor]); return { id: 'job' }; }) };
  const service = new OmsExecutionService(prisma, {} as any, oneC);
  const request: any = { kind: 'CONFIRM', requestKey: 'request', expectedVersion: 0, expectedUpdatedAt: order.updatedAt.toISOString(), compositionChecked: true, pricesChecked: true, paymentTerms: 'По счёту', deliveryTerms: 'Доставка' };
  return { order, writes, tx, prisma, oneC, service, request };
}

describe('Warehouse operations belong to 1С', () => {
  it.each([
    { source: 'OZON', sourcePayload: { fulfillmentMode: 'FBO' } },
    { source: 'OZON', sourcePayload: { fulfillmentMode: 'FBS', payload: { provider: 'OZON', sourceStatus: 'delivered' } } },
    { source: 'WILDBERRIES', sourcePayload: { fulfillmentMode: 'FBS', payload: { provider: 'WILDBERRIES', supplierStatus: 'complete' } } },
  ])('does not create a second warehouse task for delivered or marketplace-owned orders', async data => {
    const f = fixture(); Object.assign(f.order, data, { reservationState: 'LEGACY' });
    await expect(f.service.execute('actor', f.order.id, { ...f.request, localWarehouseConfirmed: true })).rejects.toMatchObject({ status: 409 });
    expect(f.writes).toEqual([]); expect(f.oneC.stageOrderExport).not.toHaveBeenCalled();
  });
  it.each(['PICK', 'SHIP'] as const)('rejects local %s before any stock or order write', async kind => {
    const f = fixture();
    await expect(f.service.execute('actor', f.order.id, { ...f.request, kind, lines: [{ itemId: 'line', quantity: 1 }] })).rejects.toMatchObject({ status: 409 });
    expect(f.writes).toEqual([]); expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled(); expect(f.oneC.stageOrderExport).not.toHaveBeenCalled();
  });

  it.each(['CANCEL_REMAINDER', 'RETURN'] as const)('rejects local %s without changing the hold or inventory', async kind => {
    const f = fixture();
    const service = new OmsAdjustmentService(f.prisma, {} as any);
    await expect(service.adjust('actor', f.order.id, { ...f.request, kind, reason: 'Проверка', lines: [{ itemId: 'line', quantity: 1 }] })).rejects.toMatchObject({ status: 409 });
    expect(f.writes).toEqual([]); expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });

  it('confirms commercial terms and stages one export in the same transaction without claiming 1С confirmation', async () => {
    const f = fixture();
    expect(await f.service.execute('actor', f.order.id, f.request)).toEqual({ operationId: 'operation', repeated: false });
    expect(f.tx.orderExecution.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order', paymentTerms: 'По счёту', deliveryTerms: 'Доставка' }) });
    expect(f.tx.order.update).toHaveBeenCalledWith({ where: { id: 'order' }, data: expect.objectContaining({ fulfillmentManaged: false, isSynced1C: false, reservationState: 'ACTIVE' }) });
    expect(f.oneC.stageOrderExport).toHaveBeenCalledWith(f.tx, 'order', 'actor');
    expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(await f.service.execute('actor', f.order.id, f.request)).toEqual({ operationId: 'operation', repeated: true });
    expect(f.oneC.stageOrderExport).toHaveBeenCalledTimes(1);
  });

  it('rolls back the commercial confirmation when staging the export fails', async () => {
    const f = fixture(); f.oneC.stageOrderExport.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(f.service.execute('actor', f.order.id, f.request)).rejects.toThrow('outbox unavailable');
    expect(f.writes).toEqual([]);
    expect(await f.service.execute('actor', f.order.id, f.request)).toEqual({ operationId: 'operation', repeated: false });
  });

  it('protects stock-owning orders from manual warehouse status changes, but keeps digital and external marketplace flows', () => {
    const physical = { status: OrderStatus.CONFIRMED, source: 'B2B', reservationState: 'ACTIVE', items: [{ productType: 'PHYSICAL' }] };
    for (const status of [OrderStatus.ASSEMBLING, OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED]) expect(() => assertLocalWarehouseTransition(physical, status)).toThrow();
    expect(() => assertLocalWarehouseTransition(physical, OrderStatus.CONFIRMED)).not.toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, reservationState: 'DIGITAL', items: [{ productType: 'GIFT_CARD' }] }, OrderStatus.CANCELLED)).not.toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, source: 'OZON', reservationState: 'LEGACY', items: [] }, OrderStatus.SHIPPED)).not.toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, source: 'ONE_C', reservationState: 'LEGACY', items: [] }, OrderStatus.SHIPPED)).toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, status: OrderStatus.PAID }, OrderStatus.DELIVERED)).toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, status: OrderStatus.SHIPPED }, OrderStatus.DELIVERED)).toThrow();
    expect(() => assertLocalWarehouseTransition({ ...physical, status: OrderStatus.SHIPPED, reservationState: 'CONSUMED' }, OrderStatus.DELIVERED)).not.toThrow();
  });
});
