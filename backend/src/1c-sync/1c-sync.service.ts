import { BadGatewayException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { JobRunStatus, MarketplaceOrderStatus, OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { BackgroundJobsService, JobProgress } from '../background-jobs/background-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneCOrderStatusesDto, OneCProductsSyncDto } from './dto/sync.dto';
import { OneCClientService } from './one-c-client.service';
import { applyStorefrontTransition } from '../common/storefront-order-transition';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OneCSyncService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OneCSyncService.name);
  private recoveryTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly jobs: BackgroundJobsService, private readonly client: OneCClientService,
    @Optional() private readonly notifications?: NotificationsService) {}

  onModuleInit() {
    this.jobs.register('1C_PRODUCTS_IMPORT', (payload, progress) => this.processProducts(payload, progress));
    this.jobs.register('1C_FULL_EXCHANGE', (_payload, progress) => this.processFullExchange(progress));
    this.jobs.register('1C_ORDER_EXPORT', payload => this.processOrderExport(String(payload.orderId)));
  }

  onApplicationBootstrap() {
    this.recoveryTimer = setInterval(() => void this.recoverPendingOrders(), 60_000);
    this.recoveryTimer.unref();
    setTimeout(() => void this.recoverPendingOrders(), 5_000).unref();
  }

  onModuleDestroy() {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
  }

  syncProducts(dto: OneCProductsSyncDto, initiatedById?: string) { return this.jobs.enqueue('1C_PRODUCTS_IMPORT', dto, initiatedById); }
  runFullExchange(initiatedById?: string) { return this.jobs.enqueue('1C_FULL_EXCHANGE', {}, initiatedById); }
  status() { return this.client.status(); }
  testConnection() { return this.client.testConnection(); }

  async enqueueOrder(orderId: string, initiatedById?: string) {
    try {
      const status = await this.client.status();
      if (!status.enabled || !status.configured) return null;
      return await this.jobs.enqueue('1C_ORDER_EXPORT', { orderId }, initiatedById);
    } catch (error: any) {
      await this.prisma.order.updateMany({ where: { id: orderId }, data: { isSynced1C: false, oneCSyncError: String(error?.message || error).slice(0, 1000) } });
      return null;
    }
  }

  private async recoverPendingOrders() {
    try {
      const status = await this.client.status();
      if (!status.enabled || !status.configured) return;
      const pending = await this.prisma.order.findMany({
        where: { isSynced1C: false, source: { not: OrderSource.ONE_C } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });
      for (const order of pending) {
        const recentRun = await this.prisma.jobRun.findFirst({
          where: {
            jobName: '1C_ORDER_EXPORT',
            status: { in: [JobRunStatus.WAITING, JobRunStatus.ACTIVE, JobRunStatus.RETRYING] },
            createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
            input: { path: ['orderId'], equals: order.id },
          },
          select: { id: true },
        });
        if (!recentRun) await this.enqueueOrder(order.id);
      }
    } catch (error: any) {
      this.logger.warn(`Не удалось восстановить очередь заказов 1С: ${error?.message || error}`);
    }
  }

  async importOrderStatuses(dto: OneCOrderStatusesDto) {
    let updated = 0;
    const missing: string[] = [];
    for (const item of dto.statuses) {
      const candidates = [item.platformOrderId ? { id: item.platformOrderId } : null, item.external1CId ? { externalId: item.external1CId } : null].filter(Boolean) as Prisma.OrderWhereInput[];
      if (!candidates.length) { missing.push('без идентификатора'); continue; }
      const occurredAt = item.occurredAt ? new Date(item.occurredAt) : new Date();
      const found = await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE (${item.platformOrderId || null}::text IS NOT NULL AND id = ${item.platformOrderId || null})
          OR (${item.external1CId || null}::text IS NOT NULL AND "externalId" = ${item.external1CId || null}) ORDER BY id FOR UPDATE`;
        const order = await tx.order.findFirst({ where: { OR: candidates }, include: { marketplaceStaging: true, items: true, payments: true } });
        if (!order) return false;
        const nextStatus = this.toOrderStatus(item.status, order.status);
        const lifecycle = await applyStorefrontTransition(tx, order, nextStatus, this.notifications);
        await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus, oneCStatus: item.status, oneCSyncAt: new Date(), oneCSyncError: null, isSynced1C: true, warehouseDocumentId: item.warehouseDocumentId, trackingNumber: item.trackingNumber, ...this.fulfillmentTimestamps(item.status, occurredAt), ...lifecycle },
        });
        if (nextStatus !== order.status) {
          await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: nextStatus, comment: item.comment || `Статус получен из 1С/ТСД: ${item.status}` } });
          if (order.marketplaceStaging) await tx.marketplaceOrder.update({ where: { id: order.marketplaceStaging.id }, data: { status: this.toMarketplaceStatus(nextStatus), trackingNumber: item.trackingNumber } });
        }
        return true;
      }, { timeout: 30_000 });
      if (!found) { missing.push(item.platformOrderId || item.external1CId || 'без идентификатора'); continue; }
      updated += 1;
    }
    await this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'ORDER_STATUSES_IMPORT', status: missing.length ? 'WARNING' : 'SUCCESS', message: `Обновлено заказов: ${updated}, не найдено: ${missing.length}`, details: { updated, missing } } });
    return { success: true, updated, missing };
  }

  async verifyInboundSecret(value?: string) { return this.client.verifyInboundSecret(value); }

  private async processProducts(dto: OneCProductsSyncDto, progress: JobProgress) {
    let processed = 0;
    await this.prisma.$transaction(async tx => {
      for (const item of dto.products) {
        const product = await tx.product.upsert({ where: { externalId: item.externalId }, update: { sku: item.sku, nameRu: item.nameRu, slug: item.slug, basePrice: item.price, isSynced: true }, create: { externalId: item.externalId, sku: item.sku, nameRu: item.nameRu, slug: item.slug, basePrice: item.price, isSynced: true } });
        const variant = await tx.productVariant.findFirst({ where: { productId: product.id } });
        if (variant) await tx.productVariant.update({ where: { id: variant.id }, data: { price: item.price, stock: item.stock ?? variant.stock } });
        else await tx.productVariant.create({ data: { productId: product.id, name: 'Основной вариант', options: {}, sku: item.sku, price: item.price, stock: item.stock ?? 0 } });
        processed += 1;
        await progress((processed / dto.products.length) * 95);
      }
      await tx.syncLog.create({ data: { system: '1C_KA', action: 'PRODUCTS_UPSERT', status: 'SUCCESS', message: `Обработано товаров: ${processed}`, details: { processed, externalIds: dto.products.map(item => item.externalId) } } });
    });
    return { success: true, processed, message: `Обработано товаров: ${processed}` };
  }

  logs() { return this.prisma.syncLog.findMany({ where: { system: '1C_KA' }, orderBy: { createdAt: 'desc' }, take: 50 }); }

  private async processFullExchange(progress: JobProgress) {
    const startedAt = new Date();
    await progress(5);
    await this.client.testConnection();
    await progress(12);
    const rawProducts = await this.client.get('productsPath', '/hs/sarkisian/v1/products');
    const products = this.normalizeProducts(rawProducts);
    if (!products.length) throw new BadGatewayException('1С не вернула товары в ожидаемом формате');
    const productResult = await this.processProducts({ products }, async value => progress(12 + value * .4));
    await progress(55);

    let counterparties = 0;
    try {
      const raw = await this.client.get('counterpartiesPath', '/hs/sarkisian/v1/counterparties');
      const items = Array.isArray(raw) ? raw : raw?.counterparties || raw?.value || [];
      for (const item of items) {
        const external1CId = String(item.externalId || item.ref || item.Ref_Key || '');
        if (!external1CId) continue;
        await this.prisma.organization.upsert({
          where: { external1CId },
          update: { name: String(item.name || item.description || item.Description || 'Контрагент 1С'), legalName: item.legalName, inn: item.inn || undefined, kpp: item.kpp || undefined, lastSync1CAt: new Date() },
          create: { external1CId, name: String(item.name || item.description || item.Description || 'Контрагент 1С'), legalName: item.legalName, inn: item.inn || undefined, kpp: item.kpp || undefined, lastSync1CAt: new Date() },
        });
        counterparties += 1;
      }
    } catch (error: any) {
      await this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'COUNTERPARTIES_IMPORT', status: 'WARNING', message: String(error?.message || error).slice(0, 1000) } });
    }
    await progress(67);

    const orders = await this.prisma.order.findMany({ where: { isSynced1C: false, source: { not: OrderSource.ONE_C } }, include: this.orderInclude(), orderBy: { createdAt: 'asc' }, take: 250 });
    const exportedOrders = await this.exportOrders(orders);
    await progress(87);

    let importedStatuses = 0;
    try {
      const raw = await this.client.get('orderStatusesPath', '/hs/sarkisian/v1/order-statuses');
      const statuses = Array.isArray(raw) ? raw : raw?.statuses || raw?.value || [];
      if (statuses.length) importedStatuses = (await this.importOrderStatuses({ statuses })).updated;
    } catch (error: any) {
      await this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'ORDER_STATUSES_PULL', status: 'WARNING', message: String(error?.message || error).slice(0, 1000) } });
    }
    await progress(96);
    const result = { products: productResult.processed, counterparties, exportedOrders, importedStatuses, durationMs: Date.now() - startedAt.getTime() };
    await this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'FULL_EXCHANGE', status: 'SUCCESS', message: `Товары: ${result.products}, контрагенты: ${counterparties}, заказы: ${exportedOrders}, статусы склада: ${importedStatuses}`, details: result as Prisma.InputJsonValue } });
    return result;
  }

  private async processOrderExport(orderId: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, source: { not: OrderSource.ONE_C } }, include: this.orderInclude() });
    if (!order) throw new BadGatewayException('Заказ для выгрузки в 1С не найден');
    try {
      const config = await this.client.configuration();
      const response = await this.client.post('ordersPath', '/hs/sarkisian/v1/orders', { orders: [this.orderPayload(order, config)] });
      await this.applyAcknowledgement(order, response);
      await this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'ORDER_EXPORT', status: 'SUCCESS', message: `Заказ ${order.orderNumber} передан в 1С`, details: { orderId: order.id, source: order.source } } });
      return { orderId: order.id, orderNumber: order.orderNumber, source: order.source };
    } catch (error: any) {
      await this.prisma.order.update({ where: { id: order.id }, data: { isSynced1C: false, oneCSyncError: String(error?.message || error).slice(0, 1000) } });
      throw error;
    }
  }

  private async exportOrders(orders: any[]) {
    if (!orders.length) return 0;
    const config = await this.client.configuration();
    const response = await this.client.post('ordersPath', '/hs/sarkisian/v1/orders', { orders: orders.map(order => this.orderPayload(order, config)) });
    let exported = 0;
    for (const order of orders) {
      try { await this.applyAcknowledgement(order, response); exported += 1; }
      catch (error: any) { await this.prisma.order.update({ where: { id: order.id }, data: { oneCSyncError: String(error?.message || error).slice(0, 1000) } }); }
    }
    return exported;
  }

  private async applyAcknowledgement(order: any, response: any) {
    const item = Array.isArray(response?.orders) ? response.orders.find((entry: any) => String(entry.platformOrderId || entry.id) === order.id) : null;
    const accepted = new Set<string>((response?.acceptedIds || []).map(String));
    if (!accepted.has(order.id) && !item?.accepted) throw new BadGatewayException(`1С не подтвердила заказ ${order.orderNumber}`);
    await this.prisma.order.update({ where: { id: order.id }, data: { isSynced1C: true, oneCSyncAt: new Date(), oneCSyncError: null, oneCStatus: item?.status || response?.statuses?.[order.id] || 'ACCEPTED', externalId: item?.external1CId || response?.externalIds?.[order.id] || order.externalId, warehouseDocumentId: item?.warehouseDocumentId || response?.warehouseDocumentIds?.[order.id] || order.warehouseDocumentId } });
  }

  private orderInclude() { return { items: true, organization: true, customer: true, user: true, marketplaceStaging: true }; }

  private orderPayload(order: any, config: Record<string, unknown>) {
    return {
      id: order.id, external1CId: order.externalId, number: order.orderNumber, revision: order.updatedAt.toISOString(), createdAt: order.createdAt,
      status: order.status, source: order.source, sourceChannel: order.sourceChannel, externalChannelOrderId: order.externalOrderId,
      organization: order.organization ? { id: order.organization.id, external1CId: order.organization.external1CId, name: order.organization.name, legalName: order.organization.legalName, inn: order.organization.inn, kpp: order.organization.kpp } : null,
      buyer: { customerId: order.customerId, name: order.buyerName, email: order.buyerEmail, phone: order.buyerPhone },
      payment: { status: order.paymentStatus, method: order.paymentMethod },
      delivery: { provider: order.shippingProvider, address: order.shippingAddress, cost: Number(order.shippingCost), deliveryDate: order.deliveryDate, trackingNumber: order.trackingNumber },
      warehouse: { warehouseId: config.warehouseId || null, businessUnitId: config.organizationId || null, orderType: config.orderType || 'Заказ клиента', requiresPicking: ![OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status), fulfillmentMode: 'TSD_PICKING' },
      currency: order.currency, totalAmount: Number(order.totalAmount), discountAmount: Number(order.discountAmount), finalAmount: Number(order.finalAmount), comments: order.comments,
      items: order.items.map((item: any) => ({ variantId: item.variantId, sku: item.externalSku, offerId: item.offerId, name: item.productName, variantName: item.variantName, price: Number(item.price), quantity: item.quantity, total: Number(item.total) })),
    };
  }

  private normalizeProducts(raw: any) {
    const items = Array.isArray(raw) ? raw : raw?.products || raw?.value || [];
    return items.map((item: any) => ({ externalId: String(item.externalId || item.ref || item.Ref_Key || ''), sku: String(item.sku || item.article || item.Code || ''), nameRu: String(item.nameRu || item.name || item.Description || ''), slug: String(item.slug || item.sku || item.article || item.Code || '').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, ''), price: Number(item.price ?? item.basePrice ?? 0), stock: Number(item.stock ?? item.quantity ?? 0) })).filter((item: any) => item.externalId && item.sku && item.nameRu && item.slug && Number.isFinite(item.price));
  }

  private toOrderStatus(status: string, current: OrderStatus) {
    const normalized = status.toUpperCase();
    const mapped: Record<string, OrderStatus> = { RECEIVED: OrderStatus.CONFIRMED, ACCEPTED: OrderStatus.CONFIRMED, READY_FOR_PICKING: OrderStatus.CONFIRMED, PICKING: OrderStatus.ASSEMBLING, PICKED: OrderStatus.ASSEMBLING, PACKED: OrderStatus.ASSEMBLING, READY_TO_SHIP: OrderStatus.ASSEMBLING, SHIPPED: OrderStatus.SHIPPED, DELIVERED: OrderStatus.DELIVERED, CANCELLED: OrderStatus.CANCELLED, REFUNDED: OrderStatus.REFUNDED };
    const next = mapped[normalized] || current;
    if (([OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.DELIVERED] as OrderStatus[]).includes(current) && next !== current) return current;
    const rank: Partial<Record<OrderStatus, number>> = { NEW: 0, PAYMENT_WAITING: 1, CONFIRMED: 2, PAID: 3, ASSEMBLING: 4, SHIPPED: 5, DELIVERED: 6 };
    if (!([OrderStatus.CANCELLED, OrderStatus.REFUNDED] as OrderStatus[]).includes(next) && (rank[next] ?? 0) < (rank[current] ?? 0)) return current;
    return next;
  }

  private fulfillmentTimestamps(status: string, occurredAt: Date) {
    const normalized = status.toUpperCase();
    return { ...(normalized === 'PICKING' ? { pickingStartedAt: occurredAt } : {}), ...(['PICKED', 'PACKED', 'READY_TO_SHIP'].includes(normalized) ? { pickedAt: occurredAt } : {}), ...(['PACKED', 'READY_TO_SHIP'].includes(normalized) ? { packedAt: occurredAt } : {}) };
  }

  private toMarketplaceStatus(status: OrderStatus): MarketplaceOrderStatus {
    if (status === OrderStatus.REFUNDED) return MarketplaceOrderStatus.RETURNED;
    if (([OrderStatus.PAID, OrderStatus.PAYMENT_WAITING] as OrderStatus[]).includes(status)) return MarketplaceOrderStatus.CONFIRMED;
    return status as unknown as MarketplaceOrderStatus;
  }
}
