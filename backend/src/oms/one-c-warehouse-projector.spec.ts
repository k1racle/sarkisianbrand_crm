import { OrderStatus } from '@prisma/client';
import { executionSnapshot } from './execution-snapshot';
import { settlementBasis } from '../1c-sync/finance-policy';
import { projectCoveredOrders } from './one-c-warehouse-projector';

describe('projecting 1C warehouse facts', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  function fixture(status = 'SHIPPED') {
    const order: any = {
      id: 'order', source: 'WEB', status: OrderStatus.PAID, reservationState: 'ACTIVE', fulfillmentManaged: false,
      totalAmount: '200', discountAmount: '0', finalAmount: '200', currency: 'RUB', shippingAddress: {}, shippingCost: '0', shippingProvider: 'pickup', paymentMethod: 'CARD',
      paymentStatus: 'SUCCEEDED', payments: [{ status: 'SUCCEEDED' }], oneCFinance: null,
      items: ['one', 'two'].map(id => ({ id, variantId: 'v-' + id, quantity: 1, price: '100', total: '100', productType: 'PHYSICAL', pickedQuantity: 0, shippedQuantity: 0 })),
    };
    const lines = order.items.map((item: any) => ({ orderItemId: item.id, reserved: 0, picked: 1, checked: 1, shipped: 1, cancelled: 0, returned: 0, damaged: 0 }));
    const asOf = new Date('2026-10-28T11:59:00Z'), validUntil = new Date('2026-10-28T12:10:00Z');
    order.execution = { version: 1, snapshotHash: executionSnapshot(order) };
    order.warehouseExecution = { owner: 'ONE_C', status, eventId: 'event', revision: 1, executionVersion: 1, basisHash: executionSnapshot(order), warehouseId: 'main', asOf, validUntil, lines };
    for (const item of order.items) {
      item.warehouseCoverage = { eventId: 'event', revision: 1, reserved: 0, shipped: 1, cancelled: 0 };
      item.variant = { id: item.variantId, sku: item.variantId, stock: 9, reserved: 1, product: { externalId: 'erp-' + item.id }, oneCWarehouseStock: { sku: item.variantId, externalProductId: 'erp-' + item.id, warehouseId: 'main', stock: 9, reserved1C: 1, localPending: 0, asOf, validUntil, coveredEventIds: ['event'] } };
    }
    const tx: any = {
      $queryRaw: jest.fn(), ecosystemIntegration: { findUnique: jest.fn(async () => ({ isEnabled: true, config: { warehouseId: 'main' } })) },
      order: { findUnique: jest.fn(async () => order), update: jest.fn(async ({ data }) => Object.assign(order, data)) },
      orderItem: { update: jest.fn(async ({ where, data }) => Object.assign(order.items.find((item: any) => item.id === where.id), data)) },
      orderStatusHistory: { create: jest.fn() }, productVariant: { update: jest.fn(), updateMany: jest.fn() },
    };
    return { order, lines, tx };
  }

  it('waits for every item to be covered by the current 1C event and a fresh stock snapshot', async () => {
    const f = fixture(); f.order.items[1].variant.oneCWarehouseStock.coveredEventIds = [];
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toEqual({ projected: 0, pending: 1, review: 0 });
    expect(f.tx.orderItem.update).not.toHaveBeenCalled(); expect(f.tx.order.update).not.toHaveBeenCalled();
  });

  it('projects full shipment once without decrementing stock a second time', async () => {
    const f = fixture();
    expect(await projectCoveredOrders(f.tx, ['order', 'order'], now)).toEqual({ projected: 1, pending: 0, review: 0 });
    expect(f.order).toMatchObject({ status: 'SHIPPED', reservationState: 'CONSUMED' });
    expect(f.order.items.map((item: any) => [item.pickedQuantity, item.shippedQuantity])).toEqual([[1, 1], [1, 1]]);
    expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
    expect(f.tx.productVariant.update).not.toHaveBeenCalled(); expect(f.tx.productVariant.updateMany).not.toHaveBeenCalled();
    await projectCoveredOrders(f.tx, ['order'], now);
    expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it('keeps a partial shipment in assembly with its remaining reservation', async () => {
    const f = fixture('PARTIALLY_SHIPPED'); f.lines[1].shipped = 0; f.lines[1].reserved = 1;
    f.order.items[1].warehouseCoverage.shipped = 0; f.order.items[1].warehouseCoverage.reserved = 1;
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toEqual({ projected: 1, pending: 0, review: 0 });
    expect(f.order).toMatchObject({ status: 'ASSEMBLING', reservationState: 'ACTIVE' });
    expect(f.order.items.map((item: any) => item.shippedQuantity)).toEqual([1, 0]);
  });

  it('defers physical corrections and financial release problems without changing records', async () => {
    const f = fixture(); f.lines[1].cancelled = 1; f.lines[1].picked = 0; f.lines[1].shipped = 0; f.order.items[1].warehouseCoverage.cancelled = 1; f.order.items[1].warehouseCoverage.shipped = 0;
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toMatchObject({ review: 1 });
    expect(f.tx.orderItem.update).not.toHaveBeenCalled();
    const b2b = fixture(); b2b.order.source = 'B2B'; b2b.order.warehouseExecution.basisHash = executionSnapshot(b2b.order); b2b.order.execution.snapshotHash = executionSnapshot(b2b.order);
    expect(await projectCoveredOrders(b2b.tx, ['order'], now)).toMatchObject({ review: 1 });
    expect(b2b.tx.order.update).not.toHaveBeenCalled();
    b2b.order.oneCFinance = { basisHash: settlementBasis(b2b.order), validUntil: new Date('2026-10-28T12:10:00Z'), releaseAllowed: true };
    expect(await projectCoveredOrders(b2b.tx, ['order'], now)).toMatchObject({ projected: 1 });
  });

  it('does not project an expired, changed or mismatched 1C snapshot', async () => {
    const f = fixture(); f.order.items[0].variant.oneCWarehouseStock.validUntil = new Date('2026-10-28T11:58:00Z');
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toMatchObject({ pending: 1 });
    f.order.items[0].variant.oneCWarehouseStock.validUntil = new Date('2026-10-28T12:10:00Z'); f.order.warehouseExecution.executionVersion = 2;
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toMatchObject({ pending: 1 });
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });

  it('does not project an event after the 1C warehouse is switched or disabled', async () => {
    const f = fixture();
    f.tx.ecosystemIntegration.findUnique.mockResolvedValue({ isEnabled: true, config: { warehouseId: 'other' } });
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toMatchObject({ pending: 1 });
    f.tx.ecosystemIntegration.findUnique.mockResolvedValue({ isEnabled: false, config: { warehouseId: 'main' } });
    expect(await projectCoveredOrders(f.tx, ['order'], now)).toMatchObject({ pending: 1 });
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });
});
