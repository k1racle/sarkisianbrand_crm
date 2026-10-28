import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { OmsService } from '../oms/oms.service';
import { ecosystemAutomationEnabled } from '../common/ecosystem-automation';
import { normalizeOzonPosting, OzonMode, readOzonPage } from './ozon-orders';

@Injectable()
export class OzonSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(OzonSyncService.name);
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService, private readonly oms: OmsService) {}

  onApplicationBootstrap() {
    if (!ecosystemAutomationEnabled()) return;
    this.timer = setInterval(() => void this.poll().catch(() => this.logger.warn('Не удалось запустить проверку Ozon')), 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private async poll() {
    for (const mode of ['FBS', 'FBO'] as const) {
      const saved = await this.prisma.marketplaceSyncCursor.findUnique({ where: { key: `OZON:${mode}` }, select: { actorId: true } });
      if (saved?.actorId) { try { await this.sync(saved.actorId, mode); } catch { /* lastError is retained for review */ } }
    }
  }

  async status() {
    const [integration, ...cursors] = await Promise.all([
      this.prisma.ecosystemIntegration.findUnique({ where: { key: 'OZON_SELLER' }, select: { isEnabled: true, config: true, environment: true, configuredSecretKeys: true } }),
      ...(['FBS', 'FBO'] as const).map(mode => this.prisma.marketplaceSyncCursor.findUnique({ where: { key: `OZON:${mode}` }, select: { actorId: true, state: true, leaseUntil: true, lastSuccessAt: true, lastError: true } })),
    ]);
    const config = integration?.config as Record<string, unknown> | null | undefined;
    const view = (row: typeof cursors[number], supported: boolean) => ({ supported, enabled: Boolean(integration?.isEnabled), configured: Boolean(config?.clientId && integration?.configuredSecretKeys.includes('apiKey')), environment: integration?.environment ?? null,
      automatic: Boolean(supported && row?.actorId && ecosystemAutomationEnabled()), running: Boolean(row?.leaseUntil && row.leaseUntil > new Date()), hasMore: Boolean((row?.state as any)?.cursor), lastSuccessAt: row?.lastSuccessAt ?? null, lastError: row?.lastError ?? null });
    return { FBS: view(cursors[0], true), FBO: view(cursors[1], false) };
  }

  async unresolved() {
    const rows = await this.prisma.orderItem.findMany({ where: { productType: 'PHYSICAL', variantId: null, order: { source: 'OZON' } },
      select: { orderId: true, offerId: true, externalSku: true, productName: true }, take: 5001 });
    const groups = new Map<string, { externalVariantId: string; article: string; orderIds: Set<string> }>();
    for (const row of rows.slice(0, 5000)) {
      if (!row.offerId || !/^(sku|product):[a-zA-Z0-9_-]{1,100}$/.test(row.offerId)) continue;
      const entry = groups.get(row.offerId) || { externalVariantId: row.offerId, article: row.externalSku || row.productName, orderIds: new Set<string>() };
      entry.orderIds.add(row.orderId); groups.set(row.offerId, entry);
    }
    return { items: [...groups.values()].map(({orderIds, ...item}) => ({ ...item, orders: orderIds.size })), truncated: rows.length > 5000 };
  }

  variants(search = '') {
    const term = search.trim().slice(0, 80);
    return this.prisma.productVariant.findMany({ where: { isActive: true, product: { isActive: true, productType: 'PHYSICAL' }, ...(term ? { OR: [{ sku: { contains: term, mode: 'insensitive' } }, { name: { contains: term, mode: 'insensitive' } }, { product: { nameRu: { contains: term, mode: 'insensitive' } } }] } : {}) },
      select: { id: true, sku: true, name: true, product: { select: { nameRu: true } } }, orderBy: { sku: 'asc' }, take: 50 });
  }

  mappings() { return this.prisma.marketplaceVariantMapping.findMany({ where: { channel: 'OZON' }, select: { externalVariantId: true, variantId: true, updatedAt: true, variant: { select: { sku: true, name: true } } }, orderBy: { externalVariantId: 'asc' }, take: 1000 }); }

  async mapVariant(externalVariantId: string, variantId: string) {
    if (!/^(sku|product):[a-zA-Z0-9_-]{1,100}$/.test(externalVariantId)) throw new BadRequestException('Укажите идентификатор товара Ozon');
    const variant = await this.prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { isActive: true, productType: true } } } });
    if (!variant?.isActive || !variant.product.isActive || variant.product.productType !== 'PHYSICAL') throw new BadRequestException('Выберите активный физический товар каталога');
    return this.prisma.marketplaceVariantMapping.upsert({ where: { channel_externalVariantId: { channel: 'OZON', externalVariantId } }, create: { channel: 'OZON', externalVariantId, variantId }, update: { variantId }, select: { externalVariantId: true, variantId: true } });
  }

  async sync(actor: string, mode: OzonMode) {
    if (!actor) throw new ForbiddenException('Не указан сотрудник');
    if (!['FBS', 'FBO'].includes(mode)) throw new BadRequestException('Неизвестная схема Ozon');
    if (mode === 'FBO') throw new BadRequestException('Импорт Ozon FBO пока недоступен: требуется проверить актуальный контракт API');
    await this.oms.assertMarketplaceImport(actor);
    const key = `OZON:${mode}`, leaseId = randomUUID(), now = new Date(), leaseUntil = new Date(now.getTime() + 600_000);
    await this.prisma.marketplaceSyncCursor.upsert({ where: { key }, create: { key }, update: {} });
    const claim = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key, OR: [{ leaseId: null }, { leaseUntil: { lte: now } }] }, data: { leaseId, leaseUntil, actorId: actor } });
    if (claim.count !== 1) throw new ConflictException('Синхронизация Ozon уже выполняется');
    try {
      const settings = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'OZON_SELLER' } });
      const config = settings?.config as Record<string, unknown> | null | undefined;
      const clientId = typeof config?.clientId === 'string' ? config.clientId.trim() : '';
      const apiKey = this.secrets.decrypt(settings?.encryptedSecrets).apiKey;
      if (!settings?.isEnabled || !clientId || !apiKey) throw new BadRequestException('Настройте и включите Ozon Seller в центре интеграций');
      const account = createHash('sha256').update(clientId).digest('hex');
      const saved = await this.prisma.marketplaceSyncCursor.findUniqueOrThrow({ where: { key } });
      const state: any = saved.state || {};
      if (state.account && state.account !== account) throw new ConflictException('Изменился кабинет Ozon: сначала требуется сверка заказов');
      if (!state.account) {
        // Persist the account identity before the first order can commit. Even
        // if the page fails halfway, a new seller cannot reuse that cursor.
        const bound = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key, leaseId, leaseUntil: { gt: new Date() } }, data: { state: { ...state, account } as Prisma.InputJsonValue } });
        if (bound.count !== 1) throw new ConflictException('Истёк срок синхронизации Ozon; повторите');
      }
      // Ozon filters by the original posting interval: regularly rescan almost
      // a year as well as the recent window so an old cancellation is not lost.
      const fullTime = Date.parse(state.fullCompletedAt || '');
      const full = state.cursor ? state.full === true : !Number.isFinite(fullTime) || Date.now() - fullTime >= 86400_000;
      const to = state.cursor ? state.to : new Date().toISOString();
      const since = state.cursor ? state.since : new Date(Date.now() - (full ? 364 : 30) * 86400_000).toISOString();
      if (!Number.isFinite(Date.parse(since)) || !Number.isFinite(Date.parse(to)) || typeof (state.cursor || '') !== 'string') throw new ConflictException('Некорректная сохранённая позиция синхронизации Ozon');
      const seen: string[] = state.cursor && Array.isArray(state.seen) ? state.seen : [];
      const page = await readOzonPage({ clientId, apiKey }, mode, { since, to, cursor: state.cursor || '' });
      if (page.has_next && (seen.length >= 10000 || seen.includes(page.cursor!))) throw new ConflictException('Ozon вернул повторяющийся курсор; синхронизация не завершена');
      // Validate the entire page before writing any orders. Each order and its
      // outbox commit together; a failed page retries safely with the same cursor.
      const orders = page.postings.map(posting => normalizeOzonPosting(posting, mode));
      let conflicts = state.cursor && Number.isSafeInteger(state.conflicts) && state.conflicts >= 0 ? state.conflicts : 0;
      for (const order of orders) {
        const renewed = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key, leaseId, leaseUntil: { gt: new Date() } }, data: { leaseUntil: new Date(Date.now() + 600_000) } });
        if (renewed.count !== 1) throw new ConflictException('Истёк срок синхронизации Ozon; повторите');
        const result = await this.oms.ingestMarketplace(order, actor, { integrationKey: 'OZON_SELLER', integrationUpdatedAt: settings.updatedAt });
        if (result.marketplaceImportIssue) conflicts++;
      }
      const completed = await this.prisma.marketplaceSyncCursor.updateMany({ where: { key, leaseId, leaseUntil: { gt: new Date() } }, data: {
        state: { account, since, to, cursor: page.has_next ? page.cursor! : '', conflicts, full, fullCompletedAt: !page.has_next && full ? new Date().toISOString() : state.fullCompletedAt || null, seen: page.has_next ? [...seen, page.cursor!] : [] } as Prisma.InputJsonValue,
        leaseId: null, leaseUntil: null, lastError: conflicts ? 'Есть заказы, требующие сверки' : null, ...(!page.has_next && !conflicts ? { lastSuccessAt: new Date() } : {}),
      } });
      if (completed.count !== 1) throw new ConflictException('Истёк срок синхронизации Ozon; повторите');
      return { mode, processed: orders.length, conflicts, hasNext: page.has_next };
    } catch (error) {
      await this.prisma.marketplaceSyncCursor.updateMany({ where: { key, leaseId }, data: { leaseId: null, leaseUntil: null, lastError: 'Синхронизация Ozon не завершена; проверьте подключение, права и данные' } });
      throw error;
    }
  }
}
