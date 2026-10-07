import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { withOperationalAccess } from '../common/operational-access';
import { orderAccessWhere, marketplaceSources } from './oms-read.service';
import { executionSnapshot } from './oms-execution.service';
import { OrderAdjustmentDto } from './dto/order-adjustment.dto';

export class OmsAdjustmentService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  adjust(actor: string, id: string, dto: OrderAdjustmentDto) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include: { items: true, execution: true } });
      if (!order) throw new NotFoundException('Заказ не найден или недоступен');
      const ordered = [...dto.lines].sort((a, b) => a.itemId.localeCompare(b.itemId));
      const requestHash = createHash('sha256').update(JSON.stringify({ kind: dto.kind, expectedVersion: dto.expectedVersion, expectedUpdatedAt: dto.expectedUpdatedAt, reason: dto.reason, lines: ordered.map(l => ({ itemId: l.itemId, quantity: l.quantity, damagedQuantity: l.damagedQuantity ?? 0 })) })).digest('hex');
      const previous = await tx.orderExecutionOperation.findUnique({ where: { orderId_requestKey: { orderId: id, requestKey: dto.requestKey } } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException('Ключ запроса уже использован для другой операции');
        return { operationId: previous.id, repeated: true };
      }
      if (!order.fulfillmentManaged || !order.execution || (!['WEB', 'B2B'].includes(order.source) && !marketplaceSources.includes(order.source))) throw new ConflictException('Операция доступна для заказа с заданием на сборку CRM');
      if (order.execution.version !== dto.expectedVersion || order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Заказ изменился. Обновите карточку');
      if (order.execution.snapshotHash !== executionSnapshot(order)) throw new ConflictException('Состав или условия заказа изменились. Требуется сверка');
      if (!dto.reason.trim() || !ordered.length || new Set(ordered.map(l => l.itemId)).size !== ordered.length) throw new BadRequestException('Укажите причину и позиции без повторов');
      if (!['ACTIVE', 'CONSUMED'].includes(order.reservationState) || ['CANCELLED', 'REFUNDED'].includes(order.status)) throw new ConflictException('Заказ недоступен для этой операции');
      const cancel = dto.kind === 'CANCEL_REMAINDER';
      if (cancel && (order.reservationState !== 'ACTIVE' || ['SHIPPED', 'DELIVERED'].includes(order.status))) throw new ConflictException('Неотгруженного резерва нет');
      const movements = new Map<string, { release: number; good: number; damaged: number }>();
      const lines: { itemId: string; productName: string; quantity: number; damagedQuantity: number }[] = [];
      for (const line of ordered) {
        const item = order.items.find(i => i.id === line.itemId), damaged = line.damagedQuantity ?? 0;
        if (!item || !item.variantId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0 || !Number.isSafeInteger(damaged) || damaged < 0 || damaged > line.quantity || (cancel && damaged !== 0)) throw new BadRequestException('Некорректная позиция, количество или количество повреждённого товара');
        const available = cancel ? item.quantity - item.shippedQuantity - item.cancelledQuantity : item.shippedQuantity - item.returnedQuantity;
        if (line.quantity > available) throw new ConflictException(cancel ? 'Нельзя отменить больше неотгруженного остатка' : 'Нельзя принять больше отгруженного и ещё не возвращённого количества');
        const movement = movements.get(item.variantId) || { release: 0, good: 0, damaged: 0 };
        if (cancel) {
          item.cancelledQuantity += line.quantity;
          item.pickedQuantity = Math.min(item.pickedQuantity, item.quantity - item.cancelledQuantity);
          movement.release += line.quantity;
        } else {
          item.returnedQuantity += line.quantity;
          item.damagedReturnedQuantity += damaged;
          movement.good += line.quantity - damaged; movement.damaged += damaged;
        }
        movements.set(item.variantId, movement);
        lines.push({ itemId: item.id, productName: item.productName, quantity: line.quantity, damagedQuantity: damaged });
      }
      for (const [variantId, movement] of [...movements].sort(([a], [b]) => a.localeCompare(b))) {
        const changed = await tx.productVariant.updateMany({ where: { id: variantId, ...(cancel ? { reserved: { gte: movement.release } } : {}) }, data: cancel ? { reserved: { decrement: movement.release } } : { stock: { increment: movement.good }, damagedStock: { increment: movement.damaged } } });
        if (changed.count !== 1) throw new ConflictException('Остаток или резерв изменился. Операция не проведена');
      }
      for (const item of order.items.filter(i => ordered.some(l => l.itemId === i.id))) await tx.orderItem.update({ where: { id: item.id }, data: { cancelledQuantity: item.cancelledQuantity, pickedQuantity: item.pickedQuantity, returnedQuantity: item.returnedQuantity, damagedReturnedQuantity: item.damagedReturnedQuantity } });
      const complete = order.items.every(i => i.shippedQuantity + i.cancelledQuantity === i.quantity);
      const anyShipped = order.items.some(i => i.shippedQuantity > 0);
      const status = cancel && complete ? (anyShipped ? OrderStatus.SHIPPED : OrderStatus.CANCELLED) : order.status;
      const reservationState = cancel && complete ? (anyShipped ? 'CONSUMED' : 'RELEASED') : order.reservationState;
      const operator = await tx.user.findUniqueOrThrow({ where: { id: actor }, select: { firstName: true, lastName: true } });
      const actorName = [operator.firstName, operator.lastName].filter(Boolean).join(' ') || 'Сотрудник';
      const operation = await tx.orderExecutionOperation.create({ data: { orderId: id, requestKey: dto.requestKey, requestHash, kind: dto.kind, actorId: actor, actorName, lines, reason: dto.reason.trim(), settlementStatus: 'REVIEW_REQUIRED' } });
      await tx.orderExecution.update({ where: { orderId: id }, data: { version: { increment: 1 }, settlementReviewRequired: true } });
      await tx.order.update({ where: { id }, data: { status, reservationState, isSynced1C: false } });
      // A pending reward based on the original order must not be released after an adjustment.
      if (order.source === 'WEB') await tx.partnerReward.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { readyAt: null } });
      // Original price, payments and shipment facts remain intact; finance must reconcile separately.
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: status, changedBy: actor, comment: `${cancel ? 'Отмена неотгруженного остатка' : 'Приёмка возврата'}: ${lines.map(l => `${l.productName} × ${l.quantity}${l.damagedQuantity ? ` (повреждено ${l.damagedQuantity})` : ''}`).join('; ')}. Причина: ${dto.reason.trim()}. Выполнил: ${actorName}. Расчёты требуют проверки` } });
      await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: `ORDER_EXECUTION_${dto.kind}`, payload: { operationId: operation.id, lines, reason: dto.reason.trim() } } });
      return { operationId: operation.id, repeated: false };
    });
  }
}
