import { settlementBasis, oneCFinanceState, requireOneCRelease } from './finance-policy';
import { applyB2BStockTransition } from '../b2b/b2b-order-lifecycle';
import { OrderStatus } from '@prisma/client';
const order = () => ({ id: 'order', source: 'B2B', status: 'CONFIRMED', currency: 'RUB', finalAmount: '100.00', items: [{ id: 'line', quantity: 2, price: '50.00', total: '100.00', cancelledQuantity: 0, returnedQuantity: 0 }] });
describe('1C is the authority for dispatch', () => {
 it('never invents a zero debt or release when a snapshot is missing', () => {
  expect(oneCFinanceState(order())).toMatchObject({ state: 'MISSING', releaseAllowed: false });
  expect(() => requireOneCRelease(order())).toThrow();
 });
 it('uses the explicit 1C decision even when paid and debt look sufficient', () => {
  const o = order(), oneCFinance = { basisHash: settlementBasis(o), validUntil: new Date(Date.now()+60000), paid: 100, debt: 0, releaseAllowed: false, releaseReason: 'Лимит организации' };
  expect(oneCFinanceState({ ...o, oneCFinance })).toMatchObject({ state: 'CURRENT', releaseAllowed: false, reason: 'Лимит организации' });
  expect(() => requireOneCRelease({ ...o, oneCFinance })).toThrow('Лимит организации');
  expect(() => requireOneCRelease({ ...o, oneCFinance: { ...oneCFinance, releaseAllowed: true, paid: 0, debt: 100 } })).not.toThrow();
 });
 it('expires a once valid release and invalidates changed terms, cancellations and returns', () => {
  const o = order(), oneCFinance = { basisHash: settlementBasis(o), validUntil: new Date(Date.now()+60000), releaseAllowed: true };
  expect(oneCFinanceState({ ...o, oneCFinance: { ...oneCFinance, validUntil: new Date(0) } }).state).toBe('STALE');
  for (const changed of [{ ...o, finalAmount: '99.00' }, { ...o, status: 'CANCELLED' }, { ...o, items: [{ ...o.items[0], cancelledQuantity: 1 }] }, { ...o, items: [{ ...o.items[0], returnedQuantity: 1 }] }]) expect(oneCFinanceState({ ...changed, oneCFinance }).state).toBe('CHANGED');
 });
 it('picking and dispatch milestones do not change financial conditions', () => {
  const o=order(); expect(settlementBasis({ ...o, status:'ASSEMBLING', items:[{ ...o.items[0], pickedQuantity:2, shippedQuantity:1 }] })).toBe(settlementBasis(o));
 });
 it.each(['ACTIVE', 'LEGACY'])('cannot bypass financial release through the old %s status API', async reservationState => {
  const tx:any = { oneCOrderFinance: { findUnique:jest.fn().mockResolvedValue(null) }, productVariant: { updateMany:jest.fn() } };
  await expect(applyB2BStockTransition(tx, { ...order(), reservationState }, OrderStatus.SHIPPED)).rejects.toMatchObject({ status:409 });
  expect(tx.productVariant.updateMany).not.toHaveBeenCalled();
 });
 it.each(['ACTIVE', 'LEGACY'])('cannot record manual B2B payment or refund with %s reservations', async reservationState => {
  for (const status of [OrderStatus.PAID, OrderStatus.REFUNDED]) await expect(applyB2BStockTransition({} as any, { ...order(), reservationState }, status)).rejects.toMatchObject({ status:409 });
 });
});
