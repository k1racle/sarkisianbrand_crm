import { executionSnapshot } from './execution-snapshot';
import { customerWarehouseView, warehouseExecutionView } from './warehouse-execution-view';

describe('warehouse execution shown in CRM', () => {
  const now = new Date('2026-10-28T12:00:00Z');
  const order = {
    source: 'WEB', totalAmount: '1000.00', discountAmount: '0.00', finalAmount: '1000.00', currency: 'RUB',
    shippingAddress: { city: 'Москва' }, shippingCost: '0.00', shippingProvider: 'pickup', paymentMethod: 'CARD',
    items: [{ id: 'item', variantId: 'variant', quantity: 2, price: '500.00', total: '1000.00', productType: 'PHYSICAL' }],
  };
  const snapshot = () => ({ owner: 'ONE_C', status: 'PICKING', basisHash: executionSnapshot(order), validUntil: '2026-10-28T13:00:00Z', lines: [{ orderItemId: 'item', picked: 1 }] });

  it('returns only confirmed facts and does not expose the internal basis hash', () => {
    const result = warehouseExecutionView(snapshot(), order, now);
    expect(result).toMatchObject({ status: 'PICKING', isCurrent: true, staleReason: null, lines: [{ orderItemId: 'item', picked: 1 }] });
    expect(result).not.toHaveProperty('basisHash');
    expect(warehouseExecutionView(null, order, now)).toBeNull();
  });

  it('keeps old facts visible but marks them stale when the order changed or the response expired', () => {
    const changed = { ...order, items: [{ ...order.items[0], quantity: 3 }] };
    expect(warehouseExecutionView(snapshot(), changed, now)).toMatchObject({ isCurrent: false, staleReason: 'ORDER_CHANGED' });
    expect(warehouseExecutionView({ ...snapshot(), validUntil: '2026-10-28T11:59:00Z' }, order, now)).toMatchObject({ isCurrent: false, staleReason: 'EXPIRED' });
    expect(warehouseExecutionView({ ...snapshot(), validUntil: 'invalid' }, order, now)).toMatchObject({ isCurrent: false, staleReason: 'EXPIRED' });
    expect(warehouseExecutionView(snapshot(), { ...order, execution: { version: 1 } }, now)).toMatchObject({ isCurrent: false, staleReason: 'ORDER_CHANGED' });
  });

  it('only exposes a safe, current stage to customers, never 1C or staff details', () => {
    const internal = { ...snapshot(), asOf: '2026-10-28T11:59:00Z', documentId: 'secret-doc', error: 'internal reason', executorName: 'Сотрудник' };
    expect(customerWarehouseView(internal, order, now)).toEqual({ stage: 'PICKING', asOf: internal.asOf, isCurrent: true });
    expect(customerWarehouseView({ ...internal, status: 'REJECTED' }, order, now)).toEqual({ stage: 'NEEDS_ATTENTION', asOf: internal.asOf, isCurrent: true });
    expect(customerWarehouseView({ ...internal, validUntil: '2026-10-28T11:58:00Z' }, order, now)).toEqual({ stage: null, asOf: internal.asOf, isCurrent: false });
  });
});
