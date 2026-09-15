import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MarketplaceChannel, MarketplaceOrderStatus, OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOmsOrderDto } from './dto/oms.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';

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

  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService) {}

  async dashboard() {
    const [total, attention, revenue, channels] = await this.prisma.$transaction([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_WAITING] } } }),
      this.prisma.order.aggregate({ where: { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] } }, _sum: { finalAmount: true } }),
      this.prisma.order.groupBy({ by: ['source'], orderBy: { source: 'asc' }, _count: true, _sum: { finalAmount: true } }),
    ]);
    return { total, attention, revenue: Number(revenue._sum.finalAmount || 0), channels: channels.map(item => ({ source: item.source, orders: item._count, revenue: Number(item._sum?.finalAmount || 0) })) };
  }

  orders(source?: OrderSource, status?: OrderStatus, search?: string) {
    const query = search?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(source ? { source } : {}),
      ...(status ? { status } : {}),
      ...(query ? { OR: [
        { orderNumber: { contains: query, mode: 'insensitive' } },
        { externalOrderId: { contains: query, mode: 'insensitive' } },
        { buyerName: { contains: query, mode: 'insensitive' } },
        { buyerEmail: { contains: query, mode: 'insensitive' } },
        { buyerPhone: { contains: query } },
      ] } : {}),
    };
    return this.prisma.order.findMany({ where, include: this.orderInclude(), orderBy: { createdAt: 'desc' }, take: 300 });
  }

  async order(id: string) {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] }, include: this.orderInclude(true) });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }

  async update(id: string, dto: UpdateOmsOrderDto, changedBy: string) {
    const order = await this.prisma.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] }, include: { marketplaceStaging: true } });
    if (!order) throw new NotFoundException('Заказ не найден');
    this.assertTransition(order.status, dto.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: order.id }, data: { status: dto.status, trackingNumber: dto.trackingNumber, internalNotes: dto.internalNotes, isSynced1C: false } });
      if (order.status !== dto.status) await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment || 'Статус изменён в OMS', changedBy } });
      if (order.marketplaceStaging) await tx.marketplaceOrder.update({ where: { canonicalOrderId: order.id }, data: { status: this.toMarketplaceStatus(dto.status), trackingNumber: dto.trackingNumber, internalNote: dto.internalNotes } });
      return updated;
    });
    await this.oneC.enqueueOrder(updated.id, changedBy);
    return updated;
  }

  marketplaceOrders(channel?: MarketplaceChannel) {
    return this.prisma.order.findMany({
      where: { source: channel ? channel as unknown as OrderSource : { in: this.marketplaceSources } },
      include: { customer: true, items: true, marketplaceStaging: true },
      orderBy: { createdAt: 'desc' }, take: 200,
    }).then(orders => orders.map(order => this.marketplaceView(order)));
  }

  async marketplaceDashboard() {
    const [total, open, channels] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { source: { in: this.marketplaceSources } } }),
      this.prisma.order.count({ where: { source: { in: this.marketplaceSources }, status: { in: [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.ASSEMBLING] } } }),
      this.prisma.order.groupBy({ by: ['source'], orderBy: { source: 'asc' }, where: { source: { in: this.marketplaceSources } }, _count: { _all: true }, _sum: { finalAmount: true } }),
    ]);
    return { total, open, channels: channels.map(item => ({ channel: item.source, _count: item._count, _sum: { totalAmount: item._sum?.finalAmount || 0 } })) };
  }

  async ingestMarketplace(dto: MarketplaceOrderInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const staging = await tx.marketplaceOrder.upsert({
        where: { channel_externalId: { channel: dto.channel, externalId: dto.externalId } },
        update: { status: dto.status, buyerName: dto.buyerName, buyerEmail: dto.buyerEmail, buyerPhone: dto.buyerPhone, buyerExternalId: dto.buyerExternalId, totalAmount: dto.totalAmount, deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined, trackingNumber: dto.trackingNumber, items: dto.items as Prisma.InputJsonValue, payload: dto.payload as Prisma.InputJsonValue },
        create: { channel: dto.channel, externalId: dto.externalId, status: dto.status, buyerName: dto.buyerName, buyerEmail: dto.buyerEmail, buyerPhone: dto.buyerPhone, buyerExternalId: dto.buyerExternalId, totalAmount: dto.totalAmount, deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined, trackingNumber: dto.trackingNumber, items: dto.items as Prisma.InputJsonValue, payload: dto.payload as Prisma.InputJsonValue },
      });
      const customerId = await this.resolveCustomer(tx, { ...dto, status: staging.status });
      const source = dto.channel as unknown as OrderSource;
      const status = this.toOrderStatus(staging.status);
      const existing = await tx.order.findUnique({ where: { source_externalOrderId: { source, externalOrderId: dto.externalId } } });
      const common = {
        status, source, sourceChannel: dto.channel, externalOrderId: dto.externalId,
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
      await this.replaceLines(tx, canonical.id, dto.items);
      const result = await tx.order.findUniqueOrThrow({ where: { id: canonical.id }, include: { customer: true, items: true, marketplaceStaging: true } });
      return this.marketplaceView(result);
    });
    await this.oneC.enqueueOrder(result.id);
    return result;
  }

  async updateMarketplace(id: string, status: MarketplaceOrderStatus, trackingNumber?: string, internalNote?: string, changedBy?: string) {
    const canonical = await this.prisma.order.findFirst({ where: { OR: [{ id }, { marketplaceStaging: { id } }] }, include: { marketplaceStaging: true } });
    if (!canonical) throw new NotFoundException('Заказ маркетплейса не найден');
    const next = this.toOrderStatus(status);
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: canonical.id }, data: { status: next, trackingNumber, internalNotes: internalNote, isSynced1C: false }, include: { customer: true, items: true, marketplaceStaging: true } });
      if (canonical.status !== next) await tx.orderStatusHistory.create({ data: { orderId: canonical.id, fromStatus: canonical.status, toStatus: next, changedBy, comment: 'Статус изменён оператором маркетплейсов' } });
      if (canonical.marketplaceStaging) await tx.marketplaceOrder.update({ where: { id: canonical.marketplaceStaging.id }, data: { status, trackingNumber, internalNote } });
      return this.marketplaceView(updated);
    });
    await this.oneC.enqueueOrder(result.id, changedBy);
    return result;
  }

  private orderInclude(detail = false) {
    return {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, segment: true } },
      organization: { select: { id: true, name: true, inn: true } },
      items: true,
      marketplaceStaging: true,
      history: { orderBy: { createdAt: 'desc' as const }, ...(detail ? {} : { take: 5 }) },
      ...(detail ? { payments: true, helpdeskTickets: { select: { id: true, number: true, subject: true, status: true } } } : {}),
    };
  }

  private async resolveCustomer(tx: Prisma.TransactionClient, dto: MarketplaceOrderInput) {
    const normalizedEmail = dto.buyerEmail?.trim().toLowerCase() || null;
    const normalizedPhone = dto.buyerPhone?.replace(/\D/g, '') || null;
    let customer = dto.buyerExternalId ? (await tx.customerExternalIdentity.findUnique({ where: { provider_externalId: { provider: dto.channel, externalId: dto.buyerExternalId } }, select: { customer: true } }))?.customer : null;
    if (!customer && (normalizedEmail || normalizedPhone)) customer = await tx.customer.findFirst({ where: { OR: [normalizedEmail ? { normalizedEmail } : {}, normalizedPhone ? { normalizedPhone } : {}].filter(item => Object.keys(item).length) } });
    if (!customer && (dto.buyerName || normalizedEmail || normalizedPhone || dto.buyerExternalId)) customer = await tx.customer.create({ data: { firstName: dto.buyerName, email: dto.buyerEmail, phone: dto.buyerPhone, normalizedEmail, normalizedPhone, segment: 'B2C', source: dto.channel } });
    if (customer && dto.buyerExternalId) await tx.customerExternalIdentity.upsert({ where: { provider_externalId: { provider: dto.channel, externalId: dto.buyerExternalId } }, create: { customerId: customer.id, provider: dto.channel, externalId: dto.buyerExternalId }, update: { customerId: customer.id } });
    return customer?.id;
  }

  private async replaceLines(tx: Prisma.TransactionClient, orderId: string, source: Record<string, unknown> | unknown[]) {
    const records = Array.isArray(source) ? source : Array.isArray((source as any)?.items) ? (source as any).items : Array.isArray((source as any)?.products) ? (source as any).products : [];
    if (!records.length) return;
    await tx.orderItem.deleteMany({ where: { orderId } });
    for (const raw of records) {
      const item = raw as Record<string, any>;
      const externalSku = String(item.sku || item.offerId || item.nmId || item.productId || '');
      const variant = externalSku ? await tx.productVariant.findFirst({ where: { OR: [{ sku: externalSku }, { product: { externalId: externalSku } }] }, include: { product: true } }) : null;
      const quantity = Math.max(Number(item.quantity || item.count || 1), 1);
      const price = Number(item.price || item.salePrice || item.amount || 0);
      await tx.orderItem.create({ data: { orderId, variantId: variant?.id, externalSku: externalSku || null, offerId: item.offerId ? String(item.offerId) : null, productName: String(item.name || item.title || variant?.product.nameRu || externalSku || 'Товар маркетплейса'), variantName: String(item.variantName || item.size || variant?.name || 'Основной вариант'), price, quantity, total: Number(item.total || price * quantity) } });
    }
  }

  private marketplaceView(order: any) {
    return { id: order.id, orderNumber: order.orderNumber, channel: order.source, externalId: order.externalOrderId, status: this.toMarketplaceStatus(order.status), buyerName: order.buyerName, buyerEmail: order.buyerEmail, buyerPhone: order.buyerPhone, totalAmount: order.finalAmount, currency: order.currency, deliveryDate: order.deliveryDate, trackingNumber: order.trackingNumber, items: order.marketplaceStaging?.items || order.items, payload: order.marketplaceStaging?.payload, internalNote: order.internalNotes, customer: order.customer, stagingId: order.marketplaceStaging?.id, createdAt: order.createdAt, updatedAt: order.updatedAt };
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
