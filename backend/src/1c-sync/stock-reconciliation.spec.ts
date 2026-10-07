import { compareStock, operationMovement, stockSnapshotSummary } from './stock-reconciliation';

describe('1C physical stock comparison', () => {
 const now = new Date('2026-10-07T12:00:00Z');
 const variant = () => ({ id: 'v', sku: 'SKU', stock: 8, reserved: 6, damagedStock: 1, product: { externalId: 'product' } });
 const snapshot = () => ({ warehouseId: 'warehouse', externalProductId: 'product', sku: 'SKU', revision: 1, stock: 10, damagedStock: 0, asOf: new Date('2026-10-07T11:00:00Z'), validUntil: new Date('2026-10-07T13:00:00Z'), includedOperationIds: [] });
 const operation = (id: string, kind: string, quantity: number, damagedQuantity = 0) => ({ id, kind, lines: [{ itemId: 'item', quantity, damagedQuantity }], order: { items: [{ id: 'item', variantId: 'v' }] } });
 const ops = () => [operation('shipment', 'SHIP', 4), operation('return', 'RETURN', 3, 1)];
 const totals = { shippedQuantity: 4, returnedQuantity: 3, damagedReturnedQuantity: 1 };
 const compare = (v = variant(), s: any = snapshot(), operations: any[] = ops(), sums = totals, warehouse: string | null = 'warehouse', limited = false) => compareStock(v,s,operations,sums,warehouse,now,limited);
 it('does not substitute missing 1C stock with zero', () => expect(compare(variant(),null)).toMatchObject({ status:'MISSING', snapshot:null, expectedStock:null, difference:null }));
 it('separates physical stock from reservations and adjusts for outstanding shipments/good/damaged returns', () => expect(compare()).toMatchObject({ status:'PENDING', expectedStock:8, expectedDamaged:1, difference:0, damagedDifference:0, pendingOperations:2, pendingShipped:4, pendingReturned:2, pendingDamaged:1 }));
 it('does not subtract an already-accounted shipment twice', () => expect(compare(variant(),{...snapshot(),stock:6,includedOperationIds:['shipment']})).toMatchObject({status:'PENDING',expectedStock:8,pendingOperations:1,pendingShipped:0}));
 it('matches only when all movements are accounted for', () => expect(compare(variant(),{...snapshot(),stock:8,damagedStock:1,includedOperationIds:['shipment','return']})).toMatchObject({status:'MATCHED',pendingOperations:0,difference:0}));
 it.each([{ stock:7 },{ damagedStock:2 }])('shows discrepancies instead of changing/clamping them: %j', patch => expect(compare({...variant(),...patch}).status).toBe('DIFFERENCE'));
 it('exposes negative expected stock as a discrepancy', () => expect(compare(variant(),{...snapshot(),stock:0})).toMatchObject({status:'DIFFERENCE',expectedStock:-2,difference:10}));
 it.each([
  ['STALE',{ validUntil:now }],['MAPPING_CHANGED',{sku:'other'}],['MAPPING_CHANGED',{externalProductId:'other'}],['WAREHOUSE_CHANGED',{warehouseId:'other'}],
 ])('does not confirm %s snapshots', (status, patch) => expect(compare(variant(),{...snapshot(),...patch as any})).toMatchObject({status,expectedStock:null,difference:null}));
 it('requires a configured matching warehouse', () => expect(compare(variant(),snapshot(),ops(),totals,null)).toMatchObject({status:'UNCONFIGURED',expectedStock:null}));
 it('rejects incomplete movement history', () => expect(compare(variant(),snapshot(),[ops()[0]])).toMatchObject({status:'HISTORY_INCOMPLETE',expectedStock:null}));
 it('rejects unknown accounted document IDs', () => expect(compare(variant(),{...snapshot(),includedOperationIds:['deleted']})).toMatchObject({status:'HISTORY_INCOMPLETE',expectedStock:null}));
 it('never labels an incomplete page of history as matched', () => expect(compare(variant(),snapshot(),ops(),totals,'warehouse',true)).toMatchObject({status:'HISTORY_INCOMPLETE',expectedStock:null}));
 it.each([
  [{ itemId:'missing',quantity:1 }], [{ itemId:'item',quantity:-1 }], [{itemId:'item',quantity:1,damagedQuantity:2}], [{itemId:'item',quantity:1},{itemId:'item',quantity:1}],
 ].map(lines => ({lines})))('rejects malformed movement lines: %j', ({lines}) => expect(compare(variant(),snapshot(),[{...ops()[0],lines}])).toMatchObject({status:'HISTORY_INCOMPLETE'}));
 it('aggregates duplicate SKU order lines without using other variants', () => {
  const op = {id:'ship',kind:'SHIP',lines:[{itemId:'a',quantity:2},{itemId:'b',quantity:3},{itemId:'c',quantity:100}],order:{items:[{id:'a',variantId:'v'},{id:'b',variantId:'v'},{id:'c',variantId:'other'}]}};
  expect(operationMovement(op,'v')).toMatchObject({shipped:5,goodDelta:-5});
  expect(operationMovement({...op,kind:'PICK'},'v')).toBeNull();
 });
 it('does not expose internal hashes or operation/order identities in the public projection', () => {
  const v = {...variant(),oneCStock:{...snapshot(),includedOperationIds:['SECRET_ID'],payloadHash:'SECRET_HASH'}};
  expect(JSON.stringify(stockSnapshotSummary(v,now))).not.toContain('SECRET');
  expect(JSON.stringify(compare())).not.toContain('shipment');
 });
});
