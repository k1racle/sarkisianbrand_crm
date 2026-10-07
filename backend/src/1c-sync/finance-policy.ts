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
