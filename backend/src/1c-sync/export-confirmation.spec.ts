import { OneCSyncService } from './1c-sync.service';
import { executionSnapshot } from '../oms/execution-snapshot';

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
  it('marks blogger gifts for a zero-payment 1C issue document', () => {
    const f = fixture();
    const payload = f.service.orderPayload({ ...order(), source: 'MANUAL', sourceChannel: 'PARTNER_GIFT', finalAmount: 0, totalAmount: 0 }, {});
    expect(payload).toMatchObject({ documentPurpose: 'PARTNER_GIFT', inventoryOperation: 'PARTNER_GIFT_ISSUE', requiresCustomerPayment: false, finalAmount: 0 });
  });
  it('exports a commercial draft without reservation or picking; manager confirmation enables both for the exact basis', () => {
    const f = fixture(), physical = { id:'line',variantId:'variant',quantity:2,price:'50.00',total:'100.00',productType:'PHYSICAL' };
    const draft:any = { ...order(),fulfillmentManaged:false,status:'NEW',execution:null,executionOperations:[],items:[physical] };
    const first = f.service.orderPayload(draft, {warehouseId:'main'});
    expect(first.warehouse).toMatchObject({warehouseId:'main',requiresReservation:false,requiresPicking:false,fulfillmentMode:'TSD_PICKING'});
    const confirmed={...draft,status:'CONFIRMED',execution:{version:1,snapshotHash:executionSnapshot(draft)}};
    const second=f.service.orderPayload(confirmed,{warehouseId:'main'});
    expect(second.warehouse).toMatchObject({requiresReservation:true,requiresPicking:true});
    expect(second.warehouseBasis).toBe(executionSnapshot(confirmed));expect(second.execution.managedBy).toBe('ONE_C');
    expect(f.service.orderPayload({...confirmed,status:'CANCELLED'},{}).warehouse).toMatchObject({requiresReservation:false,requiresPicking:false});
    expect(f.service.orderPayload({...confirmed,items:[{...physical,quantity:1}]},{}).warehouse).toMatchObject({requiresReservation:false,requiresPicking:false});
  });
  it.each(['OZON', 'WILDBERRIES'])('routes %s FBS, FBO and unknown schemes without assigning external fulfillment to our warehouse', source => {
    const f = fixture(), physical = { id:'line',variantId:'variant',quantity:2,price:'50.00',total:'100.00',productType:'PHYSICAL' };
    const draft:any = { ...order(),source,externalOrderId:'market-123',fulfillmentManaged:false,status:'NEW',execution:null,executionOperations:[],items:[physical] };
    const confirmed = { ...draft,status:'CONFIRMED',execution:{version:1,snapshotHash:executionSnapshot(draft)} };
    const fbs = f.service.orderPayload({ ...confirmed,sourcePayload:{fulfillmentMode:'FBS'} }, {warehouseId:'main'});
    expect(fbs.marketplace).toEqual({channel:source,externalOrderId:'market-123',fulfillmentMode:'FBS'});
    expect(fbs.warehouse).toMatchObject({warehouseId:'main',fulfillmentMode:'TSD_PICKING',requiresReservation:true,requiresPicking:true});
    for (const [sourcePayload, mode, fulfillmentMode] of [[{fulfillmentMode:'FBO'},'FBO','MARKETPLACE_FBO'],[{},'UNKNOWN','MARKETPLACE_UNKNOWN'],[{fulfillmentMode:'spoof'},'UNKNOWN','MARKETPLACE_UNKNOWN']]) {
      const payload = f.service.orderPayload({...confirmed,sourcePayload}, {warehouseId:'main'});
      expect(payload.marketplace.fulfillmentMode).toBe(mode);
      expect(payload.warehouse).toMatchObject({warehouseId:null,fulfillmentMode,requiresReservation:false,requiresPicking:false});
    }
  });
  it('requires an exact 1C acknowledgement and external identity for commercial confirmation',async()=>{
    const f=fixture(), row:any={...order(),fulfillmentManaged:false,execution:{version:1},executionOperations:[{id:'confirm',kind:'CONFIRM',lines:[]}],items:[{id:'line',productType:'PHYSICAL'}]};
    await expect(f.service.applyAcknowledgement(row,{acceptedIds:['order']})).rejects.toMatchObject({status:502});
    const response:any={orders:[{platformOrderId:'order',accepted:true,revision:row.updatedAt.toISOString(),executionVersion:1,acceptedOperationIds:['confirm']}]};
    await expect(f.service.applyAcknowledgement(row,response)).rejects.toMatchObject({status:502});
    response.orders[0].external1CId='one-c-order';await f.service.applyAcknowledgement(row,response);
    expect(f.db.order.updateMany).toHaveBeenCalledTimes(1);
  });
});
