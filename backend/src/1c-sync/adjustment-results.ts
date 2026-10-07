import { BadRequestException, ConflictException } from '@nestjs/common';
import { OneCFinanceDto } from './dto/finance.dto';

export const adjustmentKinds = ['RETURN', 'CANCEL_REMAINDER'];

/** A complete accounting snapshot, not a patch. Missing results remain unresolved. */
export function validateAdjustmentResults(order: any, dto: OneCFinanceDto) {
 const operations = (order.executionOperations || []).filter((op: any) => adjustmentKinds.includes(op.kind));
 const results = dto.adjustments || [];
 for (const result of results) {
  if (!operations.some((op: any) => op.id === result.operationId)) throw new ConflictException('Результат сверки относится к неизвестному документу отмены или возврата');
  const documents = result.documentIds.map(id => dto.documents.find(doc => doc.id === id));
  if (documents.some(doc => !doc || doc.status !== 'POSTED')) throw new ConflictException('Результат сверки ссылается на отсутствующий или отменённый документ 1С');
  if (result.status === 'RECONCILED') {
   if (!['REFUNDED', 'NOT_REQUIRED', 'OFFSET'].includes(result.refundDisposition || '')) throw new BadRequestException('Нужен финансовый результат сверки');
   if (result.refundDisposition === 'REFUNDED' && !documents.some(doc => doc?.kind === 'REFUND' && Number(doc.amount) > 0)) throw new ConflictException('Возврат денег должен подтверждаться проведённым документом возврата 1С');
   if (result.refundDisposition === 'OFFSET' && !documents.some(doc => doc?.kind === 'CORRECTION')) throw new ConflictException('Зачёт требует документа корректировки 1С');
  } else if (result.refundDisposition !== undefined) throw new BadRequestException('Незавершённая сверка не подтверждает финансовый результат');
 }
 const allReconciled = operations.every((op: any) => results.some(result => result.operationId === op.id && result.status === 'RECONCILED'));
 const adjusted = order.items.some((item: any) => item.cancelledQuantity > 0 || item.returnedQuantity > 0);
 if (dto.closeAllowed && ((adjusted && (!operations.length || !order.execution)) || !allReconciled || Number(dto.refundDue) !== 0)) throw new ConflictException('Закрытие требует результатов по всем отменам и возвратам без незавершённого возврата денег');
 return { operations, results, reviewRequired: operations.length > 0 && (!allReconciled || !dto.closeAllowed || Number(dto.refundDue) !== 0) };
}
