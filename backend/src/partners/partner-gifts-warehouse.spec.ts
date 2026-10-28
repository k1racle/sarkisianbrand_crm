import { PartnerGiftsService } from './partner-gifts.service';
import { executionSnapshot } from '../oms/execution-snapshot';

function fixture() {
  const state: any = { stock: 5, reserved: 0, pending: 0, order: null, shipment: null, operations: [], stages: [] };
  const variant = { id: 'variant', sku: 'SKU', name: '30 мл', stock: 5, reserved: 0, product: { nameRu: 'Гель', externalId: '1c-product', isActive: true, productType: 'PHYSICAL' } };
  const integration = { isEnabled: true, configuredSecretKeys: ['password', 'exchangeSecret'], config: { baseUrl: 'https://fixture.invalid', username: 'fixture', warehouseId: 'warehouse' } };
  const tx: any = {
    $queryRaw: jest.fn(async () => []),
    partnerParticipant: { findFirst: jest.fn(async () => ({ id: 'partner', displayName: 'Автор', code: 'P1' })) },
    user: { findUnique: jest.fn(async () => ({ firstName: 'Менеджер', lastName: '', email: 'fixture@example.invalid' })) },
    productVariant: {
      findMany: jest.fn(async () => [{ ...variant, stock: state.stock, reserved: state.reserved }]),
      findUnique: jest.fn(async () => ({ ...variant, stock: state.stock, reserved: state.reserved })),
      updateMany: jest.fn(async ({ data }) => { state.reserved += data.reserved.increment; return { count: 1 }; }),
    },
    ecosystemIntegration: { findUnique: jest.fn(async () => integration) },
    oneCWarehouseStock: {
      findUnique: jest.fn(async () => ({ variantId: 'variant', warehouseId: 'warehouse', sku: 'SKU', externalProductId: '1c-product', stock: state.stock, reserved1C: 0, localPending: state.pending, revision: 1, asOf: new Date(Date.now() - 1000), validUntil: new Date(Date.now() + 60000) })),
      updateMany: jest.fn(async ({ data }) => { state.pending += data.localPending.increment || 0; return { count: 1 }; }),
    },
    order: { create: jest.fn(async ({ data }) => { state.order = { ...data, items: data.items.create.map((item: any, i: number) => ({ ...item, id: `line-${i}` })) }; return state.order; }) },
    orderExecution: { create: jest.fn(async ({ data }) => { state.execution = data; }) },
    orderExecutionOperation: { create: jest.fn(async ({ data }) => { state.operations.push(data); }) },
    partnerGiftShipment: {
      findUnique: jest.fn(async () => state.shipment ? { ...state.shipment, order: state.order } : null),
      create: jest.fn(async ({ data }) => { state.shipment = data; }),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  const prisma: any = { $transaction: jest.fn(async fn => {
    const previous = structuredClone(state);
    try { return await fn(tx); } catch (error) { Object.assign(state, previous); throw error; }
  }) };
  prisma.ecosystemIntegration = tx.ecosystemIntegration;
  const oneC: any = { stageOrderExport: jest.fn(async (db, id, actor) => { expect(db).toBe(tx); state.stages.push({ id, actor }); return { id: 'job' }; }) };
  const service = new PartnerGiftsService(prisma, oneC);
  const dto: any = { requestKey: 'request', participantId: 'partner', recipientName: 'Анна', recipientEmail: 'fixture@example.invalid', recipientPhone: '+70000000000', deliveryAddress: 'Москва', deliveryService: 'СДЭК', note: 'Подарок', items: [{ variantId: 'variant', quantity: 2 }] };
  return { state, tx, prisma, oneC, service, dto };
}

describe('Partner gift warehouse ownership', () => {
  it('reserves locally, retains commercial confirmation, and stages one 1С-owned warehouse export', async () => {
    const f = fixture();
    const first = await f.service.create('actor', f.dto);
    expect(first.repeated).toBe(false);
    expect(first.message).toContain('после подтверждения 1С');
    expect(f.state.order).toMatchObject({ source: 'MANUAL', sourceChannel: 'PARTNER_GIFT', fulfillmentManaged: false, isSynced1C: false, paymentStatus: 'NOT_REQUIRED', reservationState: 'ACTIVE' });
    expect(f.state.execution).toMatchObject({ orderId: first.id, confirmedBy: 'actor' });
    expect(f.state.operations).toHaveLength(1); expect(f.state.operations[0].kind).toBe('CONFIRM');
    expect(f.state.stock).toBe(5); expect(f.state.reserved).toBe(2); expect(f.state.pending).toBe(2);
    expect(f.oneC.stageOrderExport).toHaveBeenCalledWith(f.tx, first.id, 'actor');
    expect(await f.service.create('actor', f.dto)).toMatchObject({ id: first.id, repeated: true });
    expect(f.state.reserved).toBe(2); expect(f.state.stages).toHaveLength(1);
    await expect(f.service.create('actor', { ...f.dto, deliveryAddress: 'Другая улица' })).rejects.toMatchObject({ status: 409 });
    await expect(f.service.create('actor', { ...f.dto, items: [{ variantId: 'variant', quantity: 3 }] })).rejects.toMatchObject({ status: 409 });
    expect(f.state.reserved).toBe(2); expect(f.state.stages).toHaveLength(1);
  });

  it('rolls the whole gift back when the outbox cannot be staged', async () => {
    const f = fixture(); f.oneC.stageOrderExport.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(f.service.create('actor', f.dto)).rejects.toThrow('outbox unavailable');
    expect(f.state).toMatchObject({ stock: 5, reserved: 0, pending: 0, order: null, shipment: null, stages: [] });
    expect((await f.service.create('actor', f.dto)).repeated).toBe(false);
    expect(f.state.reserved).toBe(2); expect(f.state.stages).toHaveLength(1);
  });

  it('rejects a gift if current 1С stock is missing, without creating an order or hold', async () => {
    const f = fixture(); f.tx.oneCWarehouseStock.findUnique.mockResolvedValueOnce(null);
    await expect(f.service.create('actor', f.dto)).rejects.toMatchObject({ status: 409 });
    expect(f.state).toMatchObject({ reserved: 0, pending: 0, order: null, shipment: null, stages: [] });
  });

  it('returns only a current, safe warehouse projection and never exposes its basis hash', async () => {
    const f = fixture(); await f.service.create('actor', f.dto);
    const order = { ...f.state.order, execution: { version: 1 }, warehouseExecution: null };
    const basisHash = executionSnapshot(order);
    order.warehouseExecution = { basisHash, executionVersion: 1, owner: 'ONE_C', status: 'PICKING', revision: 1, warehouseId: 'warehouse', asOf: new Date(), validUntil: new Date(Date.now() + 60000), receivedAt: new Date(), documentId: 'doc', documentNumber: '42', executorName: null, error: null, lines: [], documents: [] };
    f.prisma.partnerParticipant = { findMany: jest.fn(async () => []) };
    f.prisma.productVariant = { findMany: jest.fn(async () => []) };
    f.prisma.partnerGiftShipment = { findMany: jest.fn(async () => [{ ...f.state.shipment, participant: { displayName: 'Автор', code: 'P1' }, order }]) };
    const first = await f.service.workspace(); const view = first.shipments[0].order;
    expect(view.warehouseExecution).toMatchObject({ owner: 'ONE_C', status: 'PICKING', isCurrent: true, staleReason: null });
    expect(view.warehouseExecution).not.toHaveProperty('basisHash');
    expect(view).not.toHaveProperty('totalAmount'); expect(view.items[0]).not.toHaveProperty('variantId');
    order.warehouseExecution.basisHash = 'outdated';
    expect((await f.service.workspace()).shipments[0].order.warehouseExecution).toMatchObject({ isCurrent: false, staleReason: 'ORDER_CHANGED' });
    order.warehouseExecution.basisHash = basisHash; order.warehouseExecution.validUntil = new Date(0);
    expect((await f.service.workspace()).shipments[0].order.warehouseExecution).toMatchObject({ isCurrent: false, staleReason: 'EXPIRED' });
  });
});
