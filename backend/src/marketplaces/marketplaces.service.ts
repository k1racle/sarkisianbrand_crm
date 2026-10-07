import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { MarketplaceChannel, Prisma } from '@prisma/client';
import { BackgroundJobsService, JobProgress } from '../background-jobs/background-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OmsService } from '../oms/oms.service';
import { MarketplaceImportDto, UpdateMarketplaceOrderDto, UpsertMarketplaceOrderDto } from './dto/marketplace.dto';
import { SaveMarketplaceIntegrationDto } from './dto/integration.dto';

@Injectable()
export class MarketplacesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly oms: OmsService, private readonly jobs: BackgroundJobsService) {}

  onModuleInit() {
    this.jobs.register('MARKETPLACE_ORDERS_IMPORT', (payload, progress, context) => this.processImport(payload, progress, context.initiatedById));
  }

  dashboard(actor: string) { return this.oms.marketplaceDashboard(actor); }

  orders(actor: string, channel?: MarketplaceChannel) { return this.oms.marketplaceOrders(actor, channel); }

  async upsert(dto: UpsertMarketplaceOrderDto, actor: string) {
    return this.oms.ingestMarketplace(dto, actor);
  }

  async importMany(dto: MarketplaceImportDto, initiatedById: string) {
    await this.oms.assertMarketplaceImport(initiatedById);
    return this.jobs.enqueue('MARKETPLACE_ORDERS_IMPORT', dto, initiatedById);
  }

  private async processImport(dto: MarketplaceImportDto, progress: JobProgress, actor: string | null) {
    if (!actor) throw new ForbiddenException('Не указан инициатор импорта');
    await this.oms.assertMarketplaceImport(actor);
    let processed = 0, conflicts = 0;
    for (const order of dto.orders) {
      const result = await this.upsert(order, actor);
      if (result.marketplaceImportIssue) conflicts += 1;
      processed += 1;
      await progress((processed / dto.orders.length) * 100);
    }
    return { success: conflicts === 0, processed, conflicts, message: `Обработано заказов: ${processed}; требуют сверки: ${conflicts}` };
  }

  async update(id: string, dto: UpdateMarketplaceOrderDto, changedBy: string) {
    return this.oms.updateMarketplace(id, dto.status, dto.trackingNumber, dto.internalNote, changedBy);
  }

  integrations() { return this.prisma.marketplaceIntegration.findMany({ orderBy: { channel: 'asc' }, select: { id: true, channel: true, shopName: true, isActive: true, lastSyncAt: true, createdAt: true, updatedAt: true } }); }

  async saveIntegration(dto: SaveMarketplaceIntegrationDto) {
    if(dto.credentials&&Object.keys(dto.credentials).length)throw new BadRequestException('Секреты площадки настраиваются только в центре интеграций');
    // Do not rewrite or expose historical credentials. Migrate them separately.
    return this.prisma.marketplaceIntegration.upsert({ where: { channel: dto.channel }, update: { shopName: dto.shopName, isActive: dto.isActive }, create: { channel: dto.channel, shopName: dto.shopName, isActive: dto.isActive ?? false }, select: { id: true, channel: true, shopName: true, isActive: true, lastSyncAt: true } });
  }

  async testIntegration(channel: string) {
    const integration = await this.prisma.marketplaceIntegration.findUnique({ where: { channel: channel as any } });
    if (!integration) throw new NotFoundException('Интеграция ещё не настроена');
    return { success: false, developmentAdapter: true, message: 'Проверка настоящего подключения пока недоступна' };
  }
}
