import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { withOperationalAccess } from '../common/operational-access';
import { moneyMinor } from '../common/storefront-utils';
import { orderAccessWhere, marketplaceSources } from './oms-read.service';
import { OrderExecutionDto } from './dto/execution.dto';
import { executionSnapshot } from './execution-snapshot';
export { executionSnapshot } from './execution-snapshot';
import { requireOneCRelease } from '../1c-sync/finance-policy';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class OmsExecutionService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}

  execute(actor: string, id: string, dto: OrderExecutionDto) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include: { items: true, payments: true, execution: true } });
      if (!order) throw new NotFoundException('Заказ не найден или недоступен');
      const requestHash = hash({ kind: dto.kind, expectedVersion: dto.expectedVersion, expectedUpdatedAt: dto.expectedUpdatedAt,
        compositionChecked: dto.compositionChecked ?? null, pricesChecked: dto.pricesChecked ?? null, paymentTerms: dto.paymentTerms ?? null, deliveryTerms: dto.deliveryTerms ?? null,
        localWarehouseConfirmed: dto.localWarehouseConfirmed ?? null, trackingNumber: dto.trackingNumber ?? null, lines: dto.lines ? [...dto.lines].sort((a, b) => a.itemId.localeCompare(b.itemId)) : null });
      const previous = await tx.orderExecutionOperation.findUnique({ where: { orderId_requestKey: { orderId: id, requestKey: dto.requestKey } } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException('Этот ключ запроса уже использован для другого действия');
        return { operationId: previous.id, repeated: true };
      }
      if ((order.execution?.version || 0) !== dto.expectedVersion || order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Заказ изменился. Обновите карточку перед выполнением действия');
      const marketplace = marketplaceSources.includes(order.source);
      const createReserve = marketplace && dto.kind === 'CONFIRM' && order.reservationState === 'LEGACY';
      if ((!['WEB', 'B2B'].includes(order.source) && !marketplace) || (order.reservationState !== 'ACTIVE' && !createReserve)) throw new ConflictException('Для исполнения нужен действующий резерв или подтверждение своего склада для заказа площадки');
      if (order.marketplaceImportIssue) throw new ConflictException(order.marketplaceImportIssue);
      if (createReserve && !dto.localWarehouseConfirmed) throw new BadRequestException('Подтвердите, что заказ отгружается с нашего склада, а не со склада площадки');
      if (['CANCELLED', 'REFUNDED', 'SHIPPED', 'DELIVERED'].includes(order.status)) throw new ConflictException('Заказ уже завершён или отгружен');
      if (!order.managerId) throw new BadRequestException('Сначала назначьте ответственного менеджера');
      if (order.source === 'WEB' && !(order.paymentStatus === 'SUCCEEDED' && order.payments.some(p => p.status === 'SUCCEEDED'))) throw new ConflictException('Оплата заказа сайта должна быть подтверждена платёжной системой');
      if (order.source === 'B2B' && dto.kind === 'SHIP') requireOneCRelease({ ...order, oneCFinance: await tx.oneCOrderFinance.findUnique({ where: { orderId: id } }) });
      const operator = await tx.user.findUniqueOrThrow({ where: { id: actor }, select: { firstName: true, lastName: true } });
      const actorName = [operator.firstName, operator.lastName].filter(Boolean).join(' ') || 'Сотрудник';
      let status: OrderStatus = order.status;
      let comment: string;
      let reservationState = order.reservationState;
      let pickingStartedAt = order.pickingStartedAt, pickedAt = order.pickedAt;
      const lines: { itemId: string; productName: string; quantity: number }[] = [];
      if (dto.kind === 'CONFIRM') {
        if (order.execution || order.fulfillmentManaged) throw new ConflictException('Задание на сборку уже создано');
        if (!['NEW', 'CONFIRMED', 'PAYMENT_WAITING', 'PAID'].includes(order.status)) throw new ConflictException('Заказ уже передан в исполнение другим способом');
        if (!dto.compositionChecked || !dto.pricesChecked || !dto.paymentTerms?.trim() || !dto.deliveryTerms?.trim()) throw new BadRequestException('Проверьте состав и цены, укажите условия оплаты и доставки');
        if (!order.items.length || order.items.some(i => !i.variantId || i.productType !== 'PHYSICAL' || !Number.isSafeInteger(i.quantity) || i.quantity <= 0 || moneyMinor(i.price) * i.quantity !== moneyMinor(i.total))) throw new ConflictException('Состав заказа некорректен или содержит нескладские товары');
        if ((order.source === 'B2B' || marketplace) && order.items.reduce((sum, item) => sum + moneyMinor(item.total), 0) + moneyMinor(order.shippingCost) !== moneyMinor(order.finalAmount)) throw new ConflictException('Сумма позиций и доставки не соответствует итогу заказа');
        const quantities = new Map<string, number>();
        for (const item of order.items) quantities.set(item.variantId!, (quantities.get(item.variantId!) || 0) + item.quantity);
        for (const [variantId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
          if (createReserve) {
            const reserved = await tx.$queryRaw<{ id: string }[]>`UPDATE "ProductVariant" SET reserved = reserved + ${quantity} WHERE id = ${variantId} AND "isActive" = true AND stock - reserved >= ${quantity} AND EXISTS (SELECT 1 FROM "Product" WHERE "Product".id = "ProductVariant"."productId" AND "Product"."isActive" = true AND "Product"."productType" = 'PHYSICAL') RETURNING id`;
            if (reserved.length !== 1) throw new ConflictException('Недостаточно доступного товара для резерва площадки');
          }
          const variant = await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true, reserved: true } });
          if (!variant || variant.reserved < quantity || variant.stock < quantity) throw new ConflictException('Резерв или остаток товара недостаточен для подтверждения');
        }
        if (createReserve) reservationState = 'ACTIVE';
        await tx.orderExecution.create({ data: { orderId: id, snapshotHash: executionSnapshot(order), paymentTerms: dto.paymentTerms.trim(), deliveryTerms: dto.deliveryTerms.trim(), confirmedBy: actor } });
        status = order.status === 'PAID' ? OrderStatus.PAID : OrderStatus.CONFIRMED;
        comment = 'Состав и цены проверены; условия оплаты и доставки согласованы. Создано задание на сборку';
      } else {
        if (!order.execution || !order.fulfillmentManaged) throw new ConflictException('Сначала подтвердите состав и условия заказа');
        if (order.execution.snapshotHash !== executionSnapshot(order)) throw new ConflictException('Состав или условия изменились после подтверждения. Исполнение остановлено для сверки');
        if (!dto.lines?.length || new Set(dto.lines.map(l => l.itemId)).size !== dto.lines.length) throw new BadRequestException('Укажите позиции без повторов и количество');
        const ordered = [...dto.lines].sort((a, b) => a.itemId.localeCompare(b.itemId));
        // Aggregate variant movements and lock in stable order across different orders.
        const movements = new Map<string, number>();
        for (const line of ordered) {
          const item = order.items.find(i => i.id === line.itemId);
          if (!item || !item.variantId || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new BadRequestException('Некорректная позиция или количество');
          const available = dto.kind === 'PICK' ? item.quantity - item.cancelledQuantity - item.pickedQuantity : item.pickedQuantity - item.shippedQuantity;
          if (line.quantity > available) throw new ConflictException(dto.kind === 'PICK' ? 'Нельзя собрать больше заказанного' : 'Нельзя отгрузить больше собранного');
          if (dto.kind === 'PICK') item.pickedQuantity += line.quantity;
          else { item.shippedQuantity += line.quantity; movements.set(item.variantId, (movements.get(item.variantId) || 0) + line.quantity); }
          lines.push({ itemId: item.id, productName: item.productName, quantity: line.quantity });
        }
        for (const [variantId, quantity] of [...movements].sort(([a], [b]) => a.localeCompare(b))) {
          const moved = await tx.productVariant.updateMany({ where: { id: variantId, stock: { gte: quantity }, reserved: { gte: quantity } }, data: { stock: { decrement: quantity }, reserved: { decrement: quantity } } });
          if (moved.count !== 1) throw new ConflictException('Недостаточно остатков или резерва. Отгрузка не проведена');
        }
        for (const item of order.items.filter(i => dto.lines!.some(l => l.itemId === i.id))) await tx.orderItem.update({ where: { id: item.id }, data: { pickedQuantity: item.pickedQuantity, shippedQuantity: item.shippedQuantity } });
        const complete = order.items.every(i => i.shippedQuantity + i.cancelledQuantity === i.quantity);
        status = complete ? OrderStatus.SHIPPED : OrderStatus.ASSEMBLING;
        if (complete) reservationState = 'CONSUMED';
        pickingStartedAt ||= new Date();
        if (order.items.every(i => i.pickedQuantity + i.cancelledQuantity === i.quantity)) pickedAt ||= new Date();
        comment = `${dto.kind === 'PICK' ? 'Сборка' : complete ? 'Завершена отгрузка' : 'Частичная отгрузка'}: ${lines.map(l => `${l.productName} × ${l.quantity}`).join('; ')}`;
        await tx.orderExecution.update({ where: { orderId: id }, data: { version: { increment: 1 } } });
      }
      const operation = await tx.orderExecutionOperation.create({ data: { orderId: id, requestKey: dto.requestKey, requestHash, kind: dto.kind, actorId: actor, actorName, lines, trackingNumber: dto.kind === 'SHIP' ? dto.trackingNumber?.trim() || null : null } });
      await tx.order.update({ where: { id }, data: { fulfillmentManaged: true, status, reservationState, reservationExpiresAt: null, pickingStartedAt, pickedAt, ...(dto.kind === 'SHIP' && dto.trackingNumber?.trim() ? { trackingNumber: dto.trackingNumber.trim() } : {}), isSynced1C: false } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: status, changedBy: actor, comment: `${comment}. Выполнил: ${actorName}` } });
      await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: `ORDER_EXECUTION_${dto.kind}`, payload: { operationId: operation.id, lines } } });
      return { operationId: operation.id, repeated: false };
    });
  }
}
