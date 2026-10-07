import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validateAdjustmentResults } from './adjustment-results';
import { OneCFinanceDto } from './dto/finance.dto';
import { oneCClosureState, settlementBasis } from './finance-policy';
import { OneCFinanceService } from './one-c-finance.service';
import { applyStorefrontTransition } from '../common/storefront-order-transition';

function fixture() {
 const operations = ['CANCEL_REMAINDER', 'RETURN'].map(kind => ({ id: randomUUID(), kind, settlementStatus: 'REVIEW_REQUIRED' }));
 const order: any = { id: randomUUID(), orderNumber: 'QA', externalId: 'one-c-order', source: 'WEB', status: 'SHIPPED', currency: 'RUB', fulfillmentManaged: true, reservationState: 'CONSUMED', paymentStatus: 'SUCCEEDED', payments: [{ status: 'SUCCEEDED' }], items: [{ id: randomUUID(), quantity: 6, shippedQuantity: 4, cancelledQuantity: 2, returnedQuantity: 1 }], execution: { settlementReviewRequired: true }, executionOperations: operations, oneCRequests: [] };
 const dto: any = { platformOrderId: order.id, external1CId: order.externalId, revision: 1, basisHash: settlementBasis(order), asOf: new Date(Date.now() - 1000).toISOString(), validUntil: new Date(Date.now() + 60000).toISOString(), currency: 'RUB', total: '300.00', paid: '600.00', refunded: '300.00', debt: '0.00', refundDue: '0.00', releaseAllowed: false, releaseReason: 'Отгружено', documents: [{ id: 'refund', kind: 'REFUND', number: '1', date: new Date().toISOString(), status: 'POSTED', amount: '300.00' }], requests: [], closeAllowed: true, closeReason: 'Расчёты завершены', adjustments: operations.map(op => ({ operationId: op.id, status: 'RECONCILED', message: 'Возврат проведён в 1С', refundDisposition: 'REFUNDED', documentIds: ['refund'] })) };
 const tx: any = { $queryRaw: jest.fn(), order: { findUnique: async () => order, update: jest.fn(async ({ data }) => Object.assign(order, data)) }, oneCOrderFinance: { upsert: jest.fn(async ({ create, update }) => order.oneCFinance = order.oneCFinance ? update : create), findUnique: async () => order.oneCFinance }, orderExecution: { update: jest.fn(async ({ data }) => Object.assign(order.execution, data)), findUnique: async () => order.execution }, orderExecutionOperation: { update: jest.fn(async ({ where, data }) => Object.assign(operations.find(op => op.id === where.id)!, data)) }, orderStatusHistory: { create: jest.fn() }, oneCOrderRequest: { update: jest.fn() }, syncLog: { create: jest.fn() } };
 const db: any = { $transaction: (fn: any) => fn(tx) };
 return { order, operations, dto, tx, service: new OneCFinanceService(db) };
}

describe('document-level 1C reconciliation', () => {
 it('closes only after all warehouse documents and explicit accounting approval; replay has no effects', async () => {
  const f = fixture(); await f.service.receive(f.dto);
  expect(f.order.execution.settlementReviewRequired).toBe(false);
  expect(f.operations.every(op => op.settlementStatus === 'RECONCILED')).toBe(true);
  expect(oneCClosureState(f.order).allowed).toBe(true);
  expect(f.order.status).toBe('SHIPPED'); expect(f.order.paymentStatus).toBe('SUCCEEDED');
  expect(await f.service.receive(f.dto)).toMatchObject({ repeated: true });
  expect(f.tx.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  expect(f.tx.order.update).toHaveBeenCalledTimes(1);
 });
 it.each(['partial', 'rejected', 'pending', 'denied', 'legacy'])('%s answer cannot clear the review flag', async mode => {
  const f = fixture(); f.dto.closeAllowed = false;
  if (mode === 'partial') f.dto.adjustments.pop();
  if (mode === 'rejected' || mode === 'pending') f.dto.adjustments[1] = { operationId: f.operations[1].id, status: mode.toUpperCase(), message: 'Нужна проверка', documentIds: [] };
  if (mode === 'legacy') { delete f.dto.adjustments; delete f.dto.closeAllowed; delete f.dto.closeReason; }
  await f.service.receive(f.dto); expect(f.order.execution.settlementReviewRequired).toBe(true); expect(oneCClosureState(f.order).allowed).toBe(false);
 });
 it.each(['unknown', 'ship', 'missing-document', 'cancelled-document', 'wrong-kind', 'zero-refund', 'partial', 'debt-to-refund', 'no-execution'])('rejects invalid closure/evidence: %s before any write', async mode => {
  const f = fixture();
  if (mode === 'unknown') f.dto.adjustments[0].operationId = randomUUID();
  if (mode === 'ship') f.operations[0].kind = 'SHIP';
  if (mode === 'missing-document') f.dto.documents = [];
  if (mode === 'cancelled-document') f.dto.documents[0].status = 'CANCELLED';
  if (mode === 'wrong-kind') f.dto.documents[0].kind = 'PAYMENT';
  if (mode === 'zero-refund') f.dto.documents[0].amount = '0.00';
  if (mode === 'partial') f.dto.adjustments.pop();
  if (mode === 'debt-to-refund') f.dto.refundDue = '0.01';
  if (mode === 'no-execution') f.order.execution = null;
  await expect(f.service.receive(f.dto)).rejects.toMatchObject({ status: 409 });
  expect(f.tx.oneCOrderFinance.upsert).not.toHaveBeenCalled(); expect(f.tx.orderExecutionOperation.update).not.toHaveBeenCalled();
 });
 it('requires a correction for offset and permits an explicit no-refund decision without inventing a payment', () => {
  const f = fixture(); f.dto.adjustments.forEach((r: any) => r.refundDisposition = 'OFFSET');
  expect(() => validateAdjustmentResults(f.order, f.dto)).toThrow('Зачёт');
  f.dto.documents[0].kind = 'CORRECTION'; expect(validateAdjustmentResults(f.order, f.dto).reviewRequired).toBe(false);
  f.dto.adjustments.forEach((r: any) => { r.refundDisposition = 'NOT_REQUIRED'; r.documentIds = []; }); f.dto.documents = [];
  expect(validateAdjustmentResults(f.order, f.dto).reviewRequired).toBe(false);
 });
 it('cannot attach a financial result to pending or rejected review', () => {
  const f = fixture(); f.dto.adjustments[0].status = 'PENDING';
  expect(() => validateAdjustmentResults(f.order, f.dto)).toThrow('Незавершённая');
 });
 it('newer revocation reopens review and older replay cannot clear it', async () => {
  const f = fixture(); await f.service.receive(f.dto);
  await f.service.receive({ ...f.dto, revision: 2, closeAllowed: false, adjustments: [] });
  expect(f.order.execution.settlementReviewRequired).toBe(true); expect(f.operations[0].settlementStatus).toBe('REVIEW_REQUIRED');
  expect(await f.service.receive(f.dto)).toMatchObject({ ignored: true });
  expect(oneCClosureState(f.order).allowed).toBe(false);
 });
 it('a new warehouse adjustment invalidates even a previously permitted snapshot', async () => {
  const f = fixture(); await f.service.receive(f.dto); f.order.items[0].returnedQuantity++;
  expect(oneCClosureState(f.order)).toMatchObject({ allowed: false, reason: 'Заказ изменён. Нужна повторная сверка с 1С' });
  await expect(f.service.receive({ ...f.dto, revision: 2 })).rejects.toMatchObject({ status: 409 });
 });
 it('completed RETURN_REVIEW requires the related document result', async () => {
  const f = fixture(), request = { id: randomUUID(), status: 'RECEIVED', kind: 'RETURN_REVIEW', operationId: f.operations[1].id, basisHash: f.dto.basisHash };
  f.order.oneCRequests.push(request); f.dto.requests = [{ id: request.id, status: 'COMPLETED', message: 'Готово' }];
  await expect(f.service.receive({ ...f.dto, closeAllowed: false, adjustments: [] })).rejects.toMatchObject({ status: 409 });
  await f.service.receive(f.dto); expect(f.tx.oneCOrderRequest.update).toHaveBeenCalledTimes(1);
 });
 it('a historical completed request can be repeated unchanged in a newer snapshot', async () => {
  const f = fixture(), id = randomUUID(); f.order.oneCRequests.push({ id, status: 'COMPLETED', basisHash: 'old-basis', responseMessage: 'Готово', externalDocumentId: null });
  f.dto.requests = [{ id, status: 'COMPLETED', message: 'Готово' }]; await f.service.receive(f.dto);
  expect(f.tx.oneCOrderRequest.update).toHaveBeenCalledTimes(1);
 });
 it.each(['WEB', 'B2B', 'OZON'])('permits operational closure of reconciled %s without stock or reward writes', async source => {
  const f = fixture(); f.order.source = source; f.order.partnerCode = 'QA'; f.dto.basisHash = settlementBasis(f.order);
  await f.service.receive(f.dto);
  expect(await applyStorefrontTransition(f.tx, f.order, 'DELIVERED')).toEqual({});
  f.order.oneCFinance.validUntil = new Date(0);
  await expect(applyStorefrontTransition(f.tx, f.order, 'DELIVERED')).rejects.toMatchObject({ status: 409 });
 });
 it.each([{ closeAllowed: 'true' }, { closeAllowed: null }, { closeReason: '' }, { closeReason: undefined }, { adjustments: null }])('validates closure fields strictly: %j', async patch => {
  expect((await validate(plainToInstance(OneCFinanceDto, { ...fixture().dto, ...patch }))).length).toBeGreaterThan(0);
 });
 it.each(['duplicate', 'missing-disposition', 'empty-message', 'duplicate-doc', 'extra-field'])('validates nested results: %s', async mode => {
  const f = fixture();
  if (mode === 'duplicate') f.dto.adjustments.push(f.dto.adjustments[0]);
  if (mode === 'missing-disposition') delete f.dto.adjustments[0].refundDisposition;
  if (mode === 'empty-message') f.dto.adjustments[0].message = ' ';
  if (mode === 'duplicate-doc') f.dto.adjustments[0].documentIds.push('refund');
  if (mode === 'extra-field') f.dto.adjustments[0].amount = '999.00';
  expect((await validate(plainToInstance(OneCFinanceDto, f.dto), { whitelist: true, forbidNonWhitelisted: true })).length).toBeGreaterThan(0);
 });
});
