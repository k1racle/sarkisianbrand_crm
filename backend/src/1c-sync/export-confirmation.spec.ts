import { OneCSyncService } from './1c-sync.service';

describe('1C document acknowledgements (no provider)', () => {
  const order = () => ({ id: 'order', orderNumber: 'QA', fulfillmentManaged: true, updatedAt: new Date('2026-10-05T10:00:00Z'), createdAt: new Date('2026-10-05T09:00:00Z'), execution: { version: 3 }, executionOperations: [{ id: 'ship-1', kind: 'SHIP', lines: [] }, { id: 'return-1', kind: 'RETURN', lines: [] }], items: [] });
  const ack = () => ({ orders: [{ platformOrderId: 'order', accepted: true, revision: '2026-10-05T10:00:00.000Z', executionVersion: 3, acceptedOperationIds: ['ship-1', 'return-1'] }] });
  function fixture(count = 1) { const db: any = { order: { updateMany: jest.fn().mockResolvedValue({ count }) } }; return { db, service: new OneCSyncService(db, {} as any, {} as any) as any }; }
  it('requires every document and the exact revision before marking synchronized', async () => {
    const f = fixture();
    await expect(f.service.applyAcknowledgement(order(), { acceptedIds: ['order'] })).rejects.toMatchObject({ status: 502 });
    const response = ack(); response.orders[0].acceptedOperationIds = ['ship-1'];
    await expect(f.service.applyAcknowledgement(order(), response)).rejects.toMatchObject({ status: 502 });
    expect(f.db.order.updateMany).not.toHaveBeenCalled();
    await f.service.applyAcknowledgement(order(), ack());
    expect(f.db.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order', updatedAt: order().updatedAt } }));
  });
  it('rejects an acknowledgement for a record edited during the network request', async () => {
    const f = fixture(0); await expect(f.service.applyAcknowledgement(order(), ack())).rejects.toMatchObject({ status: 409 });
  });
  it('does not let an acknowledgement rebind an order to another 1C identity', async () => {
    const f = fixture(), response: any = ack(); response.orders[0].external1CId = 'wrong';
    await expect(f.service.applyAcknowledgement({ ...order(), externalId: 'original' }, response)).rejects.toMatchObject({ status:409 });
    expect(f.db.order.updateMany).not.toHaveBeenCalled();
  });
  it('requires exact request acknowledgements and never treats delivery as accounting completion', async () => {
    const f = fixture(), row = { ...order(), oneCRequests: [{ id: 'invoice', kind: 'INVOICE', comment: 'Счёт' }], financeEntries: [{ id: 'legacy', amount: '10.00' }] };
    f.db.$transaction = jest.fn(fn => fn(f.db));
    f.db.oneCOrderRequest = { updateMany: jest.fn() };
    await expect(f.service.applyAcknowledgement(row, ack())).rejects.toMatchObject({ status: 502 });
    const response: any = ack(); Object.assign(response.orders[0], { acceptedRequestIds: ['unrelated'] });
    await expect(f.service.applyAcknowledgement(row, response)).rejects.toMatchObject({ status: 502 });
    response.orders[0].acceptedRequestIds = ['invoice']; await f.service.applyAcknowledgement(row, response);
    expect(f.db.oneCOrderRequest.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['invoice'] }, status: 'PENDING' }, data: { status: 'RECEIVED' } });
    const payload = f.service.orderPayload(row, {}); expect(payload.protocolVersion).toBe(4); expect(payload.accountingAuthority).toBe('ONE_C'); expect(payload.finance).toBeUndefined(); expect(payload.requests[0].id).toBe('invoice');
    expect(payload.idempotencyKey).not.toBe(f.service.orderPayload({ ...row, oneCRequests: [] }, {}).idempotencyKey);
  });
  it('keeps document IDs and a stable content key across metadata-only revision changes', () => {
    const f = fixture(), first = f.service.orderPayload(order(), {}), second = f.service.orderPayload({ ...order(), updatedAt: new Date('2026-10-05T11:00:00Z') }, {});
    expect(first.idempotencyKey).toBe(second.idempotencyKey); expect(first.operations.map(o => o.id)).toEqual(['ship-1', 'return-1']);
    expect(first.warehouse).toMatchObject({ requiresPicking: false, fulfillmentMode: 'CRM_DOCUMENTS' });
  });
});
