import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { executionSnapshot } from '../oms/execution-snapshot';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerGiftDto } from './partner-gifts.dto';

const nameOf = (user: any) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Сотрудник';

@Injectable()
export class PartnerGiftsService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService) {}

  async workspace() {
    const [participants, products, shipments] = await Promise.all([
      this.prisma.partnerParticipant.findMany({ where: { kind: 'BLOGGER', status: 'ACTIVE' }, select: { id: true, displayName: true, code: true, user: { select: { email: true, phone: true } } }, orderBy: [{ displayName: 'asc' }, { id: 'asc' }] }),
      this.prisma.productVariant.findMany({ where: { isActive: true, product: { isActive: true, productType: 'PHYSICAL' } }, select: { id: true, sku: true, name: true, price: true, stock: true, reserved: true, product: { select: { nameRu: true } } }, orderBy: [{ product: { nameRu: 'asc' } }, { name: 'asc' }] }),
      this.prisma.partnerGiftShipment.findMany({
        take: 100,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          participant: { select: { displayName: true, code: true } },
          order: {
            select: {
              id: true, orderNumber: true, status: true, isSynced1C: true, oneCStatus: true,
              oneCSyncError: true, warehouseDocumentId: true, createdAt: true, buyerName: true, shippingAddress: true,
              items: { select: { id: true, productName: true, variantName: true, externalSku: true, quantity: true, pickedQuantity: true, shippedQuantity: true } },
            },
          },
        },
      }),
    ]);
    return {
      participants,
      products: products.map(row => ({ id: row.id, sku: row.sku, variantName: row.name, productName: row.product.nameRu, stock: row.stock, reserved: row.reserved, available: Math.max(0, row.stock - row.reserved) })),
      shipments,
    };
  }

  async create(actorId: string, dto: CreatePartnerGiftDto) {
    const result = await this.prisma.$transaction(async tx => {
      const repeated = await tx.partnerGiftShipment.findUnique({ where: { requestKey: dto.requestKey }, select: { orderId: true, order: { select: { orderNumber: true } } } });
      if (repeated) return { id: repeated.orderId, orderNumber: repeated.order.orderNumber, repeated: true };

      const participant = await tx.partnerParticipant.findFirst({ where: { id: dto.participantId, kind: 'BLOGGER', status: 'ACTIVE' }, select: { id: true, displayName: true, code: true } });
      if (!participant) throw new NotFoundException('Активный блогер не найден');
      const actor = await tx.user.findUnique({ where: { id: actorId }, select: { firstName: true, lastName: true, email: true } });
      if (!actor) throw new NotFoundException('Сотрудник не найден');

      const quantities = new Map<string, number>();
      for (const line of dto.items) quantities.set(line.variantId, (quantities.get(line.variantId) || 0) + line.quantity);
      const variantIds = [...quantities.keys()].sort();
      for (const variantId of variantIds) await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
      const variants = await tx.productVariant.findMany({ where: { id: { in: variantIds }, isActive: true, product: { isActive: true, productType: 'PHYSICAL' } }, include: { product: { select: { nameRu: true, isActive: true, productType: true } } } });
      if (variants.length !== variantIds.length) throw new BadRequestException('В списке есть товар, который больше нельзя отправить');
      const byId = new Map(variants.map(row => [row.id, row]));
      for (const variantId of variantIds) {
        const row = byId.get(variantId)!;
        const quantity = quantities.get(variantId)!;
        if (row.stock - row.reserved < quantity) throw new ConflictException(`Недостаточно остатка для ${row.product.nameRu} · ${row.name}. Доступно: ${Math.max(0, row.stock - row.reserved)}`);
        const reserved = await tx.productVariant.updateMany({ where: { id: variantId, stock: { gte: row.reserved + quantity } }, data: { reserved: { increment: quantity } } });
        if (reserved.count !== 1) throw new ConflictException('Остаток изменился во время создания отправки. Обновите страницу.');
      }

      const selectedItems = variantIds.map(variantId => {
        const variant = byId.get(variantId)!;
        const quantity = quantities.get(variantId)!;
        return { variantId, externalSku: variant.sku, productName: variant.product.nameRu, variantName: variant.name, price: 0, quantity, total: 0, productType: 'PHYSICAL' };
      });
      const orderId = randomUUID();
      const orderNumber = `GIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${orderId.slice(0, 6).toUpperCase()}`;
      const note = dto.note?.trim() || '';
      const order = await tx.order.create({
        data: {
          id: orderId, orderNumber, source: OrderSource.MANUAL, sourceChannel: 'PARTNER_GIFT', status: OrderStatus.CONFIRMED,
          buyerName: dto.recipientName.trim(), buyerEmail: dto.recipientEmail?.trim() || null, buyerPhone: dto.recipientPhone.trim(),
          shippingAddress: { recipientName: dto.recipientName.trim(), phone: dto.recipientPhone.trim(), email: dto.recipientEmail?.trim() || null, address: dto.deliveryAddress.trim(), deliveryService: dto.deliveryService?.trim() || null } as Prisma.InputJsonValue,
          shippingProvider: dto.deliveryService?.trim() || null, shippingCost: 0, totalAmount: 0, discountAmount: 0, finalAmount: 0, currency: 'RUB',
          paymentStatus: 'NOT_REQUIRED', paymentMethod: null, reservationState: 'ACTIVE', reservationExpiresAt: null,
          managerId: actorId, internalNotes: note || `Подарок блогеру ${participant.displayName} (${participant.code})`, comments: `Подарочная отправка блогеру ${participant.displayName}`,
          fulfillmentManaged: true, isSynced1C: false,
          items: { create: selectedItems },
          history: { create: { toStatus: OrderStatus.CONFIRMED, changedBy: actorId, comment: `Подарочная отправка блогеру ${participant.displayName}. Сумма продажи: 0 ₽. Создано задание на сборку.` } },
        }, include: { items: true },
      });
      const deliveryTerms = `${dto.deliveryService?.trim() || 'Служба доставки не указана'} · ${dto.deliveryAddress.trim()}`;
      await tx.orderExecution.create({ data: { orderId, snapshotHash: executionSnapshot(order), paymentTerms: 'Оплата не требуется: подарок блогеру, стоимость продажи 0 ₽', deliveryTerms, confirmedBy: actorId } });
      await tx.orderExecutionOperation.create({ data: {
        orderId, requestKey: randomUUID(), requestHash: createHash('sha256').update(`${dto.requestKey}:CONFIRM`).digest('hex'), kind: 'CONFIRM', actorId,
        actorName: nameOf(actor), lines: [],
      } });
      await tx.partnerGiftShipment.create({ data: { requestKey: dto.requestKey, orderId, participantId: participant.id, createdById: actorId, createdByName: nameOf(actor), note } });
      await tx.auditLog.create({ data: { actorId, resource: 'partner-gift', resourceId: orderId, action: 'PARTNER_GIFT_CREATED', payload: { participantId: participant.id, requestKey: dto.requestKey, items: selectedItems.map(({ variantId, quantity }) => ({ variantId, quantity })), finalAmount: 0 } } });
      return { id: order.id, orderNumber: order.orderNumber, repeated: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });

    if (!result.repeated) await this.oneC.enqueueOrder(result.id, actorId);
    return { ...result, message: 'Заказ на 0 ₽ и задание на сборку созданы. Передача в 1С выполняется через обмен заказами; расход товара будет отражён при отгрузке задания.' };
  }
}
