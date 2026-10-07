import { marketplaceContentHash, marketplaceLines } from './marketplace-lines';
import { BadRequestException, ConflictException, ForbiddenException, GoneException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { OmsExecutionService } from './oms-execution.service';
import { OrderExecutionDto } from './dto/execution.dto';
import { OrderAdjustmentDto } from './dto/order-adjustment.dto';
import { OmsAdjustmentService } from './oms-adjustment.service';
import { OmsFinanceService } from './oms-finance.service';
import { OrderFinanceDto, ReceivablesQueryDto } from './dto/order-finance.dto';
import { CreateOneCRequestDto } from '../1c-sync/dto/finance.dto';
import { MarketplaceChannel, MarketplaceOrderStatus, OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignOrderManagerDto, MapMarketplaceItemDto, ResolveMarketplaceImportDto, UpdateOmsOrderDto } from './dto/oms.dto';
import { OmsManagerService } from './oms-manager.service';
import { OmsOrderListDto } from './dto/order-list.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { applyStorefrontTransition } from '../common/storefront-order-transition';
import { CrmReadAccess } from '../crm/read-access';
import { OmsReadService, orderAccessWhere, orderSelect } from './oms-read.service';
import { OperationalContext, withOperationalAccess } from '../common/operational-access';
import { NotificationsService } from '../notifications/notifications.service';

export type MarketplaceOrderInput = {
  channel: MarketplaceChannel;
  externalId: string;
  status?: MarketplaceOrderStatus;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerExternalId?: string;
  totalAmount: number;
  deliveryDate?: string;
  trackingNumber?: string;
  items: Record<string, unknown> | unknown[];
  payload?: Record<string, unknown>;
};

@Injectable()
export class OmsService {
  private readonly marketplaceSources: OrderSource[] = [OrderSource.WILDBERRIES, OrderSource.OZON, OrderSource.YANDEX_MARKET, OrderSource.MEGAMARKET];

  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService,
    @Optional() private readonly notifications?: NotificationsService, private readonly access: CrmReadAccess = new CrmReadAccess()) {}

  private get reads() { return new OmsReadService(this.prisma, this.access); }
  finance(actor: string, id: string) { return new OmsFinanceService(this.prisma, this.access).get(actor, id); }
  receivables(actor: string, dto: ReceivablesQueryDto) { return new OmsFinanceService(this.prisma, this.access).list(actor, dto); }
  postFinance(_actor: string, _id: string, _dto: OrderFinanceDto) { throw new GoneException('Финансовый учёт ведётся в 1С. В CRM доступны только данные 1С и запросы на обработку.'); }
  async requestOneC(actor: string, id: string, dto: CreateOneCRequestDto) { const result = await new OmsFinanceService(this.prisma, this.access).request(actor, id, dto); if (!result.repeated) await this.oneC.enqueueOrder(id, actor); return result; }
  resolveMarketplaceImport(actor: string, id: string, dto: ResolveMarketplaceImportDto) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include: { marketplaceStaging: true } });
      if (!order || !this.marketplaceSources.includes(order.source)) throw new NotFoundException('Заказ площадки не найден');
      if (!dto.reason.trim()) throw new BadRequestException('Укажите основание сохранения локального заказа');
      const incoming = order.marketplaceStaging;
      if (!order.marketplaceImportIssue || !incoming || order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime() || incoming.updatedAt.getTime() !== new Date(dto.expectedIncomingAt).getTime()) throw new ConflictException('Данные сверки изменились. Обновите карточку');
      const contentHash = marketplaceContentHash({ status: incoming.status, items: incoming.items, totalAmount: Number(incoming.totalAmount), buyerName: incoming.buyerName ?? undefined, buyerEmail: incoming.buyerEmail ?? undefined, buyerPhone: incoming.buyerPhone ?? undefined, deliveryDate: incoming.deliveryDate?.toISOString() });
      await tx.order.update({ where: { id }, data: { marketplaceImportHash: contentHash, marketplaceImportIssue: null } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: order.status, changedBy: actor, comment: `Расхождение с площадкой рассмотрено. Сохранён локальный заказ. Основание: ${dto.reason.trim()}` } });
      await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: 'MARKETPLACE_IMPORT_KEEP_LOCAL', payload: { incomingAt: incoming.updatedAt.toISOString(), incomingStatus: incoming.status, contentHash, reason: dto.reason.trim() } } });
      return { id, resolved: true };
    });
  }
  async mapMarketplaceItem(actor: string, id: string, dto: MapMarketplaceItemDto) {
    return withOperationalAccess(this.prisma, this.access, actor, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id }] }, include: { items: true } });
      if (!order || !this.marketplaceSources.includes(order.source)) throw new NotFoundException('Заказ площадки не найден');
      if (order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Обновите карточку заказа');
      if (order.fulfillmentManaged || order.reservationState !== 'LEGACY' || !['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(order.status)) throw new ConflictException('Сопоставление после передачи на исполнение запрещено');
      if (!order.items.some(item => item.id === dto.itemId)) throw new NotFoundException('Позиция заказа не найдена');
      const variant = await tx.productVariant.findFirst({ where: { sku: dto.sku.trim(), isActive: true, product: { isActive: true, productType: 'PHYSICAL' } }, select: { id: true, sku: true } });
      if (!variant) throw new BadRequestException('Не найден активный физический товар с таким SKU');
      await tx.orderItem.update({ where: { id: dto.itemId }, data: { variantId: variant.id, productType: 'PHYSICAL' } });
      await tx.order.update({ where: { id }, data: { isSynced1C: false } });
      await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: order.status, changedBy: actor, comment: `Позиция ${dto.itemId} сопоставлена с SKU ${variant.sku}` } });
      await tx.auditLog.create({ data: { actorId: actor, resource: 'oms', resourceId: id, action: 'MARKETPLACE_ITEM_MAPPED', payload: { itemId: dto.itemId, variantId: variant.id } } });
      return { id, itemId: dto.itemId, sku: variant.sku };
    });
  }
  async adjustOrder(actor: string, id: string, dto: OrderAdjustmentDto) {
    const result = await new OmsAdjustmentService(this.prisma, this.access).adjust(actor, id, dto);
    if (!result.repeated) await this.oneC.enqueueOrder(id, actor);
    return result;
  }
  async executeOrder(actor: string, id: string, dto: OrderExecutionDto) {
    const result = await new OmsExecutionService(this.prisma, this.access).execute(actor, id, dto);
    if (!result.repeated) await this.oneC.enqueueOrder(id, actor);
    return result;
  }
  managers(actor: string, id: string, search?: string) { return new OmsManagerService(this.prisma, this.access).choices(actor, id, search); }
  assignManager(actor: string, id: string, dto: AssignOrderManagerDto) { return new OmsManagerService(this.prisma, this.access).assign(actor, id, dto); }

  dashboard(actor: string) { return this.reads.dashboard(actor); }
  orders(actor: string, source?: OrderSource, status?: OrderStatus, search?: string) { return this.reads.orders(actor, source, status, search); }
  order(actor: string, id: string) { return this.reads.order(actor, id); }
  listOrders(actor: string, query: OmsOrderListDto) { return this.reads.listOrders(actor, query); }

  async update(id: string, dto: UpdateOmsOrderDto, changedBy: string) {
    const updated = await withOperationalAccess(this.prisma, this.access, changedBy, 'oms', true, async ctx => {
      const tx = ctx.db;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id} OR "orderNumber" = ${id} ORDER BY id FOR UPDATE`;
      const order = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx)], OR: [{ id }, { orderNumber: id }] }, include: { marketplaceStaging: true, items: true, payments: true } });
      if (!order) throw new NotFoundException('Заказ не найден');
      if (dto.expectedUpdatedAt && order.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) throw new ConflictException('Заказ изменился. Обновите карточку перед сохранением');
      this.assertTransition(order.status, dto.status);
      if (order.source === 'B2B' && order.reservationState === 'ACTIVE' && !order.fulfillmentManaged && ['ASSEMBLING', 'SHIPPED'].includes(dto.status)) throw new ConflictException('Подтвердите состав и условия, затем выполните задание на сборку');
      if (dto.status === OrderStatus.CANCELLED && order.status !== dto.status && !dto.comment?.trim()) throw new BadRequestException('Укажите причину отмены заказа');
      const lifecycle = await applyStorefrontTransition(tx, order, dto.status, this.notifications);
      const updated = await tx.order.update({ where: { id: order.id }, data: { status: dto.status, trackingNumber: dto.trackingNumber, internalNotes: dto.internalNotes, isSynced1C: false, ...lifecycle } });
      if (order.status !== dto.status) await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment || 'Статус изменён в OMS', changedBy } });
      if (order.marketplaceStaging) await tx.marketplaceOrder.update({ where: { canonicalOrderId: order.id }, data: { status: this.toMarketplaceStatus(dto.status), trackingNumber: dto.trackingNumber, internalNote: dto.internalNotes } });
      const safe = await tx.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { id: updated.id }] }, select: orderSelect(ctx, true) });
      if (!safe) throw new NotFoundException('Заказ не найден или недоступен');
      return (await this.reads.views(ctx, [safe]))[0];
    });
    await this.oneC.enqueueOrder(updated.id, changedBy);
    return updated;
  }

  async marketplaceOrders(actor: string, channel?: MarketplaceChannel) { return (await this.reads.marketplaceOrders(actor, channel)).map(row => this.marketplaceView(row)); }
  marketplaceDashboard(actor: string) { return this.reads.marketplaceDashboard(actor); }

  assertMarketplaceImport(actor: string) {
    return withOperationalAccess(this.prisma, this.access, actor, 'marketplace', false, async ctx => {
      for (const permission of ['marketplace.read', 'marketplace.write', 'customers.read', 'customers.write']) {
        if (!ctx.read.company(permission)) throw new ForbiddenException('Импорт требует доступа компании к заказам площадок и клиентской базе');
      }
    });
  }

  async ingestMarketplace(dto: MarketplaceOrderInput, actor: string) {
    if (!dto.externalId?.trim()) throw new BadRequestException('Не указан номер заказа площадки');
    const result = await withOperationalAccess(this.prisma, this.access, actor, 'marketplace', true, async ctx => {
      if (!ctx.read.company('marketplace.read') || !ctx.write!.company('marketplace.write') || !ctx.read.company('customers.read') || !ctx.read.company('customers.write')) throw new ForbiddenException('Импорт требует доступа компании к заказам площадок и клиентской базе');
      const tx = ctx.db;
      const source = dto.channel as unknown as OrderSource;
      await tx.$queryRaw`SELECT id FROM "Order" WHERE source = ${source}::"OrderSource" AND "externalOrderId" = ${dto.externalId} FOR UPDATE`;
      const existing = await tx.order.findUnique({ where: { source_externalOrderId: { source, externalOrderId: dto.externalId } } });
      const staging = await tx.marketplaceOrder.upsert({
        where: { channel_externalId: { channel: dto.channel, externalId: dto.externalId } },
        update: { status: dto.status, buyerName: dto.buyerName, buyerEmail: dto.buyerEmail, buyerPhone: dto.buyerPhone, buyerExternalId: dto.buyerExternalId, totalAmount: dto.totalAmount, deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined, trackingNumber: dto.trackingNumber, items: dto.items as Prisma.InputJsonValue, payload: dto.payload as Prisma.InputJsonValue },
        create: { channel: dto.channel, externalId: dto.externalId, status: dto.status, buyerName: dto.buyerName, buyerEmail: dto.buyerEmail, buyerPhone: dto.buyerPhone, buyerExternalId: dto.buyerExternalId, totalAmount: dto.totalAmount, deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined, trackingNumber: dto.trackingNumber, items: dto.items as Prisma.InputJsonValue, payload: dto.payload as Prisma.InputJsonValue },
      });
      const contentHash = marketplaceContentHash({ ...dto, status: staging.status });
      if (existing && (existing.fulfillmentManaged || existing.reservationState !== 'LEGACY' || !['NEW', 'CONFIRMED', 'PAYMENT_WAITING'].includes(existing.status))) {
        const issue = existing.marketplaceImportHash !== contentHash
          ? 'Площадка изменила состав, условия или сообщила об отмене/возврате после начала исполнения. Нужна сверка; заказ сохранён без перезаписи.' : existing.marketplaceImportIssue;
        if (existing.marketplaceImportIssue !== issue) await tx.order.update({ where: { id: existing.id }, data: { marketplaceImportIssue: issue } });
        const safe = await tx.order.findUniqueOrThrow({ where: { id: existing.id }, select: orderSelect(ctx) });
        return { view: this.marketplaceView((await this.reads.views(ctx, [safe], 'marketplace'))[0]), changed: false };
      }
      if (existing?.marketplaceImportHash === contentHash && existing.status === this.toOrderStatus(staging.status) && (dto.trackingNumber === undefined || dto.trackingNumber === existing.trackingNumber)) {
        const safe = await tx.order.findUniqueOrThrow({ where: { id: existing.id }, select: orderSelect(ctx) });
        return { view: this.marketplaceView((await this.reads.views(ctx, [safe], 'marketplace'))[0]), changed: false };
      }
      const customerId = await this.resolveCustomer(tx, { ...dto, status: staging.status }, ctx);
      const status = this.toOrderStatus(staging.status);

      const common = {
        marketplaceImportHash: contentHash, marketplaceImportIssue: null, status, source, sourceChannel: dto.channel, externalOrderId: dto.externalId,
        customerId, buyerName: dto.buyerName, buyerEmail: dto.buyerEmail, buyerPhone: dto.buyerPhone,
        sourcePayload: { items: dto.items, payload: dto.payload || null, stagingId: staging.id } as Prisma.InputJsonValue,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null, trackingNumber: dto.trackingNumber,
        totalAmount: dto.totalAmount, finalAmount: dto.totalAmount, currency: staging.currency,
        shippingAddress: {} as Prisma.InputJsonValue, shippingProvider: dto.channel, paymentStatus: 'MARKETPLACE', isSynced1C: false,
      };
      const canonical = existing
        ? await tx.order.update({ where: { id: existing.id }, data: common })
        : await tx.order.create({ data: { ...common, orderNumber: this.marketplaceNumber(dto.channel, dto.externalId), history: { create: { toStatus: status, comment: `Заказ импортирован из ${dto.channel}` } } } });
      if (existing && existing.status !== status) await tx.orderStatusHistory.create({ data: { orderId: existing.id, fromStatus: existing.status, toStatus: status, comment: `Статус синхронизирован из ${dto.channel}` } });
      await tx.marketplaceOrder.update({ where: { id: staging.id }, data: { canonicalOrderId: canonical.id } });
      if (!existing || existing.marketplaceImportHash !== contentHash) await this.replaceLines(tx, canonical.id, dto.items);
      const result = await tx.order.findUniqueOrThrow({ where: { id: canonical.id }, select: orderSelect(ctx) });
      return { view: this.marketplaceView((await this.reads.views(ctx, [result], 'marketplace'))[0]), changed: true };
    });
    if (result.changed) await this.oneC.enqueueOrder(result.view.id, actor);
    return result.view;
  }

  async updateMarketplace(id: string, status: MarketplaceOrderStatus, trackingNumber?: string, internalNote?: string, changedBy?: string) {
    if (!changedBy) throw new ForbiddenException('Сотрудник не определён');
    const next = this.toOrderStatus(status);
    const result = await withOperationalAccess(this.prisma, this.access, changedBy, 'marketplace', true, async ctx => {
      const tx = ctx.db;
      const candidate = await tx.order.findFirst({
        where: { AND: [orderAccessWhere(ctx, 'marketplace')], source: { in: this.marketplaceSources }, OR: [{ id }, { marketplaceStaging: { id } }] },
        select: { id: true },
      });
      if (!candidate) throw new NotFoundException('Заказ маркетплейса не найден');
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${candidate.id} FOR UPDATE`;
      // Re-read after acquiring the lock: another operator may have changed the status.
      const canonical = await tx.order.findFirst({
        where: { AND: [orderAccessWhere(ctx, 'marketplace')], id: candidate.id, source: { in: this.marketplaceSources } },
        include: { marketplaceStaging: true, items: true },
      });
      if (!canonical || !this.marketplaceSources.includes(canonical.source)) throw new NotFoundException('Заказ маркетплейса не найден');
      this.assertTransition(canonical.status, next);
      await applyStorefrontTransition(tx, canonical, next, this.notifications);
      const updated = await tx.order.update({ where: { id: canonical.id }, data: { status: next, trackingNumber, internalNotes: internalNote, isSynced1C: false }, select: orderSelect(ctx) });
      if (canonical.status !== next) await tx.orderStatusHistory.create({ data: { orderId: canonical.id, fromStatus: canonical.status, toStatus: next, changedBy, comment: 'Статус изменён оператором маркетплейсов' } });
      if (canonical.marketplaceStaging) await tx.marketplaceOrder.update({ where: { id: canonical.marketplaceStaging.id }, data: { status, trackingNumber, internalNote } });
      return this.marketplaceView((await this.reads.views(ctx, [updated], 'marketplace'))[0]);
    });
    await this.oneC.enqueueOrder(result.id, changedBy);
    return result;
  }

  private async resolveCustomer(tx: Prisma.TransactionClient, dto: MarketplaceOrderInput, ctx: OperationalContext) {
    const normalizedEmail = dto.buyerEmail?.trim().toLowerCase() || null;
    const normalizedPhone = dto.buyerPhone?.replace(/\D/g, '') || null;
    let customer = dto.buyerExternalId ? (await tx.customerExternalIdentity.findUnique({ where: { provider_externalId: { provider: dto.channel, externalId: dto.buyerExternalId } }, select: { customer: true } }))?.customer : null;
    if (customer && !await tx.customer.findFirst({ where: { AND: [ctx.visible.customers, { id: customer.id }] }, select: { id: true } })) throw new NotFoundException('Клиент импорта недоступен');
    if (!customer && (normalizedEmail || normalizedPhone)) customer = await tx.customer.findFirst({ where: { AND: [ctx.visible.customers], OR: [normalizedEmail ? { normalizedEmail } : {}, normalizedPhone ? { normalizedPhone } : {}].filter(item => Object.keys(item).length) } });
    if (!customer && (dto.buyerName || normalizedEmail || normalizedPhone || dto.buyerExternalId)) customer = await tx.customer.create({ data: { firstName: dto.buyerName, email: dto.buyerEmail, phone: dto.buyerPhone, normalizedEmail, normalizedPhone, segment: 'B2C', source: dto.channel, accountManagerId: ctx.read.actorId, createdById: ctx.read.actorId } });
    if (customer && dto.buyerExternalId) await tx.customerExternalIdentity.upsert({ where: { provider_externalId: { provider: dto.channel, externalId: dto.buyerExternalId } }, create: { customerId: customer.id, provider: dto.channel, externalId: dto.buyerExternalId }, update: { customerId: customer.id } });
    return customer?.id;
  }

  private async replaceLines(tx: Prisma.TransactionClient, orderId: string, source: Record<string, unknown> | unknown[]) {
    const records = marketplaceLines(source);
    await tx.orderItem.deleteMany({ where: { orderId } });
    for (const item of records) {
      // A product ID may have multiple variants: never choose an arbitrary size.
      const variant = item.externalSku ? await tx.productVariant.findUnique({ where: { sku: item.externalSku }, include: { product: true } }) : null;
      await tx.orderItem.create({ data: { orderId, ...item, externalSku: item.externalSku || null, variantId: variant?.id, productType: variant?.product.productType || 'PHYSICAL',
        productName: item.productName || variant?.product.nameRu || item.externalSku || 'Товар маркетплейса', variantName: item.variantName || variant?.name || 'Не сопоставлен' } });
    }
  }
  private marketplaceView(order: any) {
    return { marketplaceImportIssue: order.marketplaceImportIssue, id: order.id, orderNumber: order.orderNumber, channel: order.source, externalId: order.externalOrderId, status: this.toMarketplaceStatus(order.status), buyerName: order.buyerName, buyerEmail: order.buyerEmail, buyerPhone: order.buyerPhone, totalAmount: order.finalAmount, currency: order.currency, deliveryDate: order.deliveryDate, trackingNumber: order.trackingNumber, items: order.items, canWrite: order.canWrite === true, internalNote: order.internalNotes, customer: order.customer, stagingId: order.marketplaceStaging?.id, createdAt: order.createdAt, updatedAt: order.updatedAt };
  }

  private marketplaceNumber(channel: MarketplaceChannel, externalId: string) { return `MP-${channel.slice(0, 3)}-${createHash('sha1').update(`${channel}:${externalId}`).digest('hex').slice(0, 10).toUpperCase()}`; }
  private toOrderStatus(status: MarketplaceOrderStatus): OrderStatus { return status === 'RETURNED' ? OrderStatus.REFUNDED : status as unknown as OrderStatus; }
  private toMarketplaceStatus(status: OrderStatus): MarketplaceOrderStatus { return status === OrderStatus.REFUNDED ? MarketplaceOrderStatus.RETURNED : status === OrderStatus.PAID || status === OrderStatus.PAYMENT_WAITING ? MarketplaceOrderStatus.CONFIRMED : status as unknown as MarketplaceOrderStatus; }
  private assertTransition(from: OrderStatus, to: OrderStatus) {
    if (from === to) return;
    const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
      NEW: [OrderStatus.CONFIRMED, OrderStatus.PAYMENT_WAITING, OrderStatus.PAID, OrderStatus.CANCELLED],
      CONFIRMED: [OrderStatus.PAYMENT_WAITING, OrderStatus.PAID, OrderStatus.ASSEMBLING, OrderStatus.CANCELLED],
      PAYMENT_WAITING: [OrderStatus.PAID, OrderStatus.CANCELLED], PAID: [OrderStatus.ASSEMBLING, OrderStatus.REFUNDED],
      ASSEMBLING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED], SHIPPED: [OrderStatus.DELIVERED, OrderStatus.REFUNDED], DELIVERED: [OrderStatus.REFUNDED],
    };
    if (!allowed[from]?.includes(to)) throw new BadRequestException(`Переход из статуса ${from} в ${to} запрещён`);
  }
}
