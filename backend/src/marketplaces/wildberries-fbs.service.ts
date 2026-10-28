import { BadGatewayException, BadRequestException, ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { MarketplaceChannel, MarketplaceOrderStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ecosystemAutomationEnabled } from '../common/ecosystem-automation';
import { OmsService } from '../oms/oms.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { WildberriesFbsClient } from './wildberries-fbs.client';

const KEY = 'WILDBERRIES:FBS';
const LEASE_MS = 30 * 60_000;
const MAX_HISTORY = 89 * 86400;
const WINDOW = 30 * 86400 - 60;
const GAP_ERROR = 'История FBS старше доступного периода API. Нужна отдельная сверка и восстановление пропущенных заказов.';
// Explicit opt-in after verification against the current official WB contract.
const pollingEnabled = () => process.env.WB_FBS_AUTOPOLL_ENABLED === 'true' && ecosystemAutomationEnabled();
type Cursor = { from: number; to: number; next: number };
const cancellations = new Set(['canceled', 'canceled_by_client', 'declined_by_client', 'defect', 'canceled_by_carrier']);
const supplierCancellations = new Set(['cancel', 'cancel_carrier']);

/** Validate untrusted WB data before creating any CRM order. Amounts from the
 * FBS API are informational; they do not prove payment or settlement. */
export function normalizeWildberriesFbs(raw: any, status: any, sku: string | null) {
  if (!raw || !Number.isSafeInteger(raw.id) || raw.id <= 0 || !Number.isSafeInteger(raw.chrtId) || raw.chrtId <= 0 || raw.deliveryType !== 'fbs' || typeof raw.article !== 'string' || !raw.article.trim() || raw.article.length > 200 || !Number.isSafeInteger(raw.convertedPrice) || raw.convertedPrice < 0 || raw.convertedCurrencyCode !== 643 || status?.id !== raw.id) throw new BadGatewayException('Недостаточно достоверных данных для импорта задания WB');
  const cancelled = cancellations.has(status.wbStatus) || supplierCancellations.has(status.supplierStatus);
  const externalSku = sku || `WB-UNMAPPED-CHRT-${raw.chrtId}`;
  return {
    channel: MarketplaceChannel.WILDBERRIES,
    externalId: String(raw.id), fulfillmentMode: 'FBS' as const,
    status: cancelled ? MarketplaceOrderStatus.CANCELLED : MarketplaceOrderStatus.NEW,
    totalAmount: raw.convertedPrice / 100,
    items: [{ sku: externalSku, externalVariantId: String(raw.chrtId), offerId: String(raw.chrtId), name: raw.article, quantity: 1, price: raw.convertedPrice / 100 }],
    payload: {
      provider: 'WILDBERRIES', fulfillmentMode: 'FBS', variantMappingConfirmed: Boolean(sku),
      chrtId: raw.chrtId, nmId: raw.nmId ?? null, article: raw.article, rid: raw.rid ?? null,
      orderUid: raw.orderUid ?? null, warehouseId: raw.warehouseId ?? null,
      createdAt: raw.createdAt ?? null, requiredMeta: raw.requiredMeta ?? [],
      price: raw.price ?? null, convertedPrice: raw.convertedPrice, convertedFinalPrice: raw.convertedFinalPrice ?? null,
      currencyCode: raw.currencyCode ?? null, convertedCurrencyCode: raw.convertedCurrencyCode,
      financialData: 'INFORMATIONAL', supplierStatus: status.supplierStatus, wbStatus: status.wbStatus,
    },
  };
}

@Injectable()
export class WildberriesFbsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(WildberriesFbsService.name);
  constructor(private readonly prisma: PrismaService, private readonly oms: OmsService, private readonly secrets: IntegrationSecretsService) {}

  onModuleInit() {
    if (pollingEnabled()) {
      this.timer = setInterval(() => void this.scheduled().catch(() => this.logger.warn('Опрос Wildberries FBS не выполнен')), 60_000);
      this.timer.unref();
    }
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async scheduled() {
    const row = await this.prisma.marketplaceSyncCursor.findUnique({ where: { key: KEY }, select: { actorId: true } });
    if (row?.actorId) await this.sync(row.actorId);
  }

  private async settings() {
    const row = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'WILDBERRIES' } });
    const token = this.secrets.decrypt(row?.encryptedSecrets).apiToken;
    if (!row?.isEnabled || !token || !['TEST', 'PRODUCTION'].includes(row.environment)) throw new ServiceUnavailableException('Включите Wildberries и настройте токен в центре интеграций');
    return { row, token };
  }

  async sync(actorId: string) {
    await this.oms.assertMarketplaceImport(actorId);
    const settings = await this.settings();
    if (settings.row.environment === 'TEST' && process.env.WB_FBS_ALLOW_SANDBOX_IMPORT !== 'true') throw new ServiceUnavailableException('Песочницу WB можно импортировать только в изолированную базу с разрешённым тестовым режимом');
    const leaseId = randomUUID(), now = new Date();
    await this.prisma.marketplaceSyncCursor.upsert({ where: { key: KEY }, create: { key: KEY }, update: {} });
    const claimed = await this.prisma.marketplaceSyncCursor.updateMany({
      where: { key: KEY, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      data: { leaseId, leaseUntil: new Date(now.getTime() + LEASE_MS), actorId, lastError: null },
    });
    if (!claimed.count) throw new ConflictException('Обмен Wildberries уже выполняется');
    try {
      const current = await this.prisma.marketplaceSyncCursor.findUniqueOrThrow({ where: { key: KEY } });
      const saved = current.state as Cursor | null;
      const end = Math.floor(Date.now() / 1000);
      const lastSuccess = current.lastSuccessAt ? Math.floor(current.lastSuccessAt.getTime() / 1000) : null;
      const start = lastSuccess ? Math.min(end - WINDOW, lastSuccess - 60) : end - WINDOW;
      const cursor: Cursor = saved && [saved.from, saved.to, saved.next].every(Number.isSafeInteger) && saved.to >= saved.from && saved.to - saved.from <= 30 * 86400 && saved.next >= 0
        ? saved : { from: start, to: Math.min(end, start + WINDOW), next: 0 };
      if (cursor.from < end - MAX_HISTORY) throw new ConflictException(GAP_ERROR);
      const client = new WildberriesFbsClient(settings.token, settings.row.environment);
      const page = await client.orders(cursor.from, cursor.to, cursor.next);
      const ids = page.orders.map((order: any) => order?.id);
      const statuses = await client.statuses(ids);
      // Prevent a response from an old token/account being imported after settings changed.
      const active = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'WILDBERRIES' }, select: { isEnabled: true, updatedAt: true } });
      if (!active?.isEnabled || active.updatedAt.getTime() !== settings.row.updatedAt.getTime()) throw new ConflictException('Настройки Wildberries изменились; повторите обмен');
      let unmapped = 0;
      for (let index = 0; index < page.orders.length; index++) {
        const order = page.orders[index] as any;
        if (!Number.isSafeInteger(order?.chrtId) || order.chrtId <= 0) throw new BadGatewayException('Wildberries не передал идентификатор варианта товара');
        const refreshed = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key: KEY, leaseId, leaseUntil: { gt: new Date() } }, data: { leaseUntil: new Date(Date.now() + LEASE_MS) } });
        if (!refreshed.count) throw new ConflictException('Обмен Wildberries был перезапущен');
        const mapping = await this.prisma.marketplaceVariantMapping.findUnique({ where: { channel_externalVariantId: { channel: 'WILDBERRIES', externalVariantId: String(order.chrtId) } }, include: { variant: { include: { product: { select: { productType: true, isActive: true } } } } } });
        const sku = mapping?.variant?.isActive && mapping.variant.product.isActive && mapping.variant.product.productType === 'PHYSICAL' ? mapping.variant.sku : null;
        const input = normalizeWildberriesFbs(order, statuses[index], sku);
        if (!sku) {
          unmapped++;
          // Ensure the deliberately unresolved marker cannot match a real SKU.
          if (await this.prisma.productVariant.findUnique({ where: { sku: input.items[0].sku }, select: { id: true } })) throw new ConflictException('Служебный артикул WB совпадает с артикулом каталога; исправьте артикул');
        }
        await this.oms.ingestMarketplace(input, actorId, { integrationKey: 'WILDBERRIES', integrationUpdatedAt: settings.row.updatedAt });
      }
      const pageDone = page.orders.length === 0 || page.next === 0;
      const nextFrom = cursor.to - 60;
      const nextWindow = pageDone && cursor.to < end - 60 ? { from: nextFrom, to: Math.min(end, nextFrom + WINDOW), next: 0 } : null;
      const state = !pageDone ? { ...cursor, next: page.next } : nextWindow || Prisma.DbNull;
      const hasMore = !pageDone || Boolean(nextWindow);
      const committed = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key: KEY, leaseId, leaseUntil: { gt: new Date() } }, data: { state, leaseId: null, leaseUntil: null, lastSuccessAt: new Date(), lastError: null } });
      if (!committed.count) throw new ConflictException('Обмен Wildberries был перезапущен');
      return { processed: page.orders.length, unmapped, hasMore };
    } catch (error) {
      await this.prisma.marketplaceSyncCursor.updateMany({ where: { key: KEY, leaseId }, data: { leaseId: null, leaseUntil: null, lastError: error instanceof Error && error.message === GAP_ERROR ? GAP_ERROR : 'Обмен не завершён. Проверьте настройки, доступ и сопоставление товаров.' } });
      throw error;
    }
  }

  async mappings() {
    return this.prisma.marketplaceVariantMapping.findMany({ where: { channel: 'WILDBERRIES' }, select: { externalVariantId: true, variantId: true, updatedAt: true, variant: { select: { sku: true, name: true } } }, orderBy: { externalVariantId: 'asc' }, take: 1000 });
  }

  async status() {
    const [cursor, integration] = await Promise.all([
      this.prisma.marketplaceSyncCursor.findUnique({ where: { key: KEY }, select: { actorId: true, state: true, leaseUntil: true, lastSuccessAt: true, lastError: true } }),
      this.prisma.ecosystemIntegration.findUnique({ where: { key: 'WILDBERRIES' }, select: { isEnabled: true, environment: true, configuredSecretKeys: true } }),
    ]);
    const saved = cursor?.state as Cursor | null;
    const gapSince = saved?.from ? saved.from * 1000 : cursor?.lastSuccessAt?.getTime();
    return { enabled: Boolean(integration?.isEnabled), configured: Boolean(integration?.configuredSecretKeys.includes('apiToken')), environment: integration?.environment ?? null,
      coverageGap: Boolean(gapSince && gapSince < Date.now() - MAX_HISTORY * 1000),
      automatic: Boolean(cursor?.actorId && pollingEnabled()), running: Boolean(cursor?.leaseUntil && cursor.leaseUntil > new Date()),
      hasMore: Boolean(cursor?.state), lastSuccessAt: cursor?.lastSuccessAt ?? null, lastError: cursor?.lastError ?? null };
  }

  async unresolved() {
    const rows = await this.prisma.orderItem.findMany({
      where: { productType: 'PHYSICAL', variantId: null, order: { source: 'WILDBERRIES' } },
      select: { orderId: true, offerId: true, productName: true, order: { select: { sourcePayload: true } } }, take: 5001,
    });
    const groups = new Map<string, { externalVariantId: string; article: string; orderIds: Set<string> }>();
    for (const row of rows.slice(0, 5000)) {
      const payload: any = row.order.sourcePayload;
      if (payload?.payload?.provider !== 'WILDBERRIES' || payload.payload.fulfillmentMode !== 'FBS' || !row.offerId || !/^[1-9]\d{0,15}$/.test(row.offerId)) continue;
      const entry = groups.get(row.offerId) || { externalVariantId: row.offerId, article: row.productName, orderIds: new Set<string>() };
      entry.orderIds.add(row.orderId); groups.set(row.offerId, entry);
    }
    return { items: [...groups.values()].map(({ orderIds, ...item }) => ({ ...item, orders: orderIds.size })), truncated: rows.length > 5000 };
  }

  async variants(search = '') {
    const term = search.trim().slice(0, 80);
    return this.prisma.productVariant.findMany({
      where: { isActive: true, product: { productType: 'PHYSICAL', isActive: true }, ...(term ? { OR: [{ sku: { contains: term, mode: 'insensitive' } }, { name: { contains: term, mode: 'insensitive' } }, { product: { nameRu: { contains: term, mode: 'insensitive' } } }] } : {}) },
      select: { id: true, sku: true, name: true, product: { select: { nameRu: true } } }, orderBy: { sku: 'asc' }, take: 50,
    });
  }

  async mapVariant(externalVariantId: string, variantId: string) {
    if (!/^[1-9]\d{0,15}$/.test(externalVariantId)) throw new BadRequestException('Укажите числовой chrtId варианта Wildberries');
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { productType: true, isActive: true } } } });
    if (!variant?.isActive || !variant.product.isActive || variant.product.productType !== 'PHYSICAL') throw new BadRequestException('Выберите активный физический товар каталога');
    try {
      return await this.prisma.marketplaceVariantMapping.create({ data: { channel: 'WILDBERRIES', externalVariantId, variantId }, select: { externalVariantId: true, variantId: true } });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      const existing = await this.prisma.marketplaceVariantMapping.findUnique({ where: { channel_externalVariantId: { channel: 'WILDBERRIES', externalVariantId } }, select: { externalVariantId: true, variantId: true } });
      if (existing?.variantId === variantId) return existing;
      throw new ConflictException('Связь уже подтверждена. Изменение требует отдельной сверки заказов.');
    }
  }
}
