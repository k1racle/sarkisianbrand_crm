import { holdVerifiedOneCStock, oneCStockAvailability, releaseUnconfirmedOneCHold } from './one-c-sale-stock';

function fixture() {
  const now = Date.now();
  const state: any = {
    integration: { isEnabled: true, configuredSecretKeys: ['password', 'exchangeSecret'], config: { baseUrl: 'https://fixture.invalid', username: 'test', warehouseId: 'warehouse' } },
    variant: { id: 'variant', sku: 'SKU', stock: 10, reserved: 5, product: { externalId: 'product-1c', productType: 'PHYSICAL' } },
    snapshot: { variantId: 'variant', warehouseId: 'warehouse', externalProductId: 'product-1c', sku: 'SKU', revision: 2, stock: 10, reserved1C: 2, localPending: 3, asOf: new Date(now - 1000), validUntil: new Date(now + 60000) },
    coverage: null,
  };
  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    ecosystemIntegration: { findUnique: jest.fn(async () => state.integration) },
    productVariant: { findUnique: jest.fn(async () => state.variant) },
    oneCWarehouseCoverage: { findUnique: jest.fn(async () => state.coverage) },
    oneCWarehouseStock: {
      findUnique: jest.fn(async () => state.snapshot),
      updateMany: jest.fn(async ({ data, where }) => {
        if (!state.snapshot || (where.localPending?.gte !== undefined && state.snapshot.localPending < where.localPending.gte)) return { count: 0 };
        if (typeof where.localPending === 'number' && state.snapshot.localPending !== where.localPending) return { count: 0 };
        state.snapshot.localPending += (data.localPending.increment || 0) - (data.localPending.decrement || 0);
        return { count: 1 };
      }),
    },
  };
  return { state, tx };
}

describe('1С stock required for a new physical hold', () => {
  it('increases only the uncovered hold from a fresh snapshot; damaged stock is not subtracted twice', async () => {
    const f = fixture();
    expect(oneCStockAvailability(f.state.variant, { ...f.state.snapshot, damagedStock: 4 }, f.state.integration)).toMatchObject({ availabilityStatus: 'CURRENT', available: 5 });
    await holdVerifiedOneCStock(f.tx, 'variant', 3);
    expect(f.state.snapshot.localPending).toBe(6);
    expect(f.state.variant).toMatchObject({ stock: 10, reserved: 5 });
  });
  it.each(['missing', 'expired', 'disabled', 'wrong-warehouse', 'wrong-sku', 'mismatched-projection', 'missing-secret'])('fails closed on %s without changing holds', async condition => {
    const f = fixture();
    if (condition === 'missing') f.state.snapshot = null;
    if (condition === 'expired') f.state.snapshot.validUntil = new Date(0);
    if (condition === 'disabled') f.state.integration.isEnabled = false;
    if (condition === 'wrong-warehouse') f.state.snapshot.warehouseId = 'other';
    if (condition === 'wrong-sku') f.state.snapshot.sku = 'other';
    if (condition === 'mismatched-projection') f.state.variant.reserved++;
    if (condition === 'missing-secret') f.state.integration.configuredSecretKeys = ['password'];
    await expect(holdVerifiedOneCStock(f.tx, 'variant', 1)).rejects.toMatchObject({ status: 409 });
    expect(f.tx.oneCWarehouseStock.updateMany).not.toHaveBeenCalled();
    expect(oneCStockAvailability(f.state.variant, f.state.snapshot, f.state.integration)).toMatchObject({ availabilityStatus: 'UNAVAILABLE', available: null });
  });
  it('rejects a concurrent snapshot change and insufficient quantity', async () => {
    const f = fixture(); f.tx.oneCWarehouseStock.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(holdVerifiedOneCStock(f.tx, 'variant', 1)).rejects.toMatchObject({ status: 409 });
    await expect(holdVerifiedOneCStock(f.tx, 'variant', 6)).rejects.toMatchObject({ status: 400 });
    expect(f.state.snapshot.localPending).toBe(3);
  });
  it('releases a draft hold even if its stock snapshot expired, while preserving holds already covered by 1С', async () => {
    const f = fixture(); f.state.snapshot.validUntil = new Date(0);
    f.state.coverage = { reserved: 0, shipped: 0, cancelled: 0 };
    await releaseUnconfirmedOneCHold(f.tx, 'line', 'variant', 2);
    expect(f.state.snapshot.localPending).toBe(1);
    f.state.coverage = { reserved: 1, shipped: 0, cancelled: 0 };
    await expect(releaseUnconfirmedOneCHold(f.tx, 'line', 'variant', 1)).rejects.toMatchObject({ status: 409 });
    expect(f.state.snapshot.localPending).toBe(1);
  });
});
