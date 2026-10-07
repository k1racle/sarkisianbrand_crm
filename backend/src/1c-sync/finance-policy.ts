import { createHash } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { executionSnapshot } from '../oms/execution-snapshot';
export function settlementBasis(order: any) {
 return createHash('sha256').update(JSON.stringify({ commercial: executionSnapshot(order), cancelled: ['CANCELLED', 'REFUNDED'].includes(order.status), adjustments: [...order.items].sort((a,b) => a.id.localeCompare(b.id)).map(i => [i.id, i.cancelledQuantity || 0, i.returnedQuantity || 0]) })).digest('hex');
}
export function oneCFinanceState(order: any, now = new Date()) {
 const snapshot = order.oneCFinance;
 if (!snapshot) return { state: 'MISSING', releaseAllowed: false, reason: 'Расчёты из 1С ещё не получены' };
 if (snapshot.basisHash !== settlementBasis(order)) return { state: 'CHANGED', releaseAllowed: false, reason: 'Заказ изменён. Нужна повторная сверка с 1С' };
 if (snapshot.validUntil.getTime() <= now.getTime()) return { state: 'STALE', releaseAllowed: false, reason: 'Данные 1С устарели. Запросите сверку' };
 return { state: 'CURRENT', releaseAllowed: snapshot.releaseAllowed, reason: snapshot.releaseReason || (snapshot.releaseAllowed ? 'Отгрузка разрешена 1С' : 'Отгрузка не разрешена 1С') };
}
export function requireOneCRelease(order: any) {
 const state = oneCFinanceState(order);
 if (!state.releaseAllowed) throw new ConflictException(state.reason);
}
export const isOrderAdjusted = (order: any) => order.items?.some((item: any) => item.cancelledQuantity > 0 || item.returnedQuantity > 0) === true;

/** Safe operational decision. Financial reasons/documents stay behind finance.read. */
export function oneCClosureState(order: any, now = new Date()) {
 if (!isOrderAdjusted(order)) return { required: false, allowed: true, reason: '' };
 const state = oneCFinanceState(order, now);
 if (state.state !== 'CURRENT') return { required: true, allowed: false, reason: state.reason };
 if (order.execution?.settlementReviewRequired !== false) return { required: true, allowed: false, reason: 'Нужна сверка всех документов отмены и возврата в 1С' };
 if (!order.oneCFinance.closeAllowed || Number(order.oneCFinance.refundDue) !== 0) return { required: true, allowed: false, reason: '1С ещё не разрешила закрытие расчётов по отменам и возвратам' };
 return { required: true, allowed: true, reason: 'Отмены и возвраты сверены; закрытие разрешено 1С' };
}
