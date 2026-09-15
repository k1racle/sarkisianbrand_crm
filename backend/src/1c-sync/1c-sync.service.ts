import { Injectable, OnModuleInit } from '@nestjs/common';
import { BackgroundJobsService, JobProgress } from '../background-jobs/background-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { OneCProductsSyncDto } from './dto/sync.dto';

@Injectable()
export class OneCSyncService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly jobs: BackgroundJobsService) {}

  onModuleInit() {
    this.jobs.register('1C_PRODUCTS_IMPORT', (payload, progress) => this.processProducts(payload, progress));
  }

  syncProducts(dto: OneCProductsSyncDto, initiatedById?: string) {
    return this.jobs.enqueue('1C_PRODUCTS_IMPORT', dto, initiatedById);
  }

  private async processProducts(dto: OneCProductsSyncDto, progress: JobProgress) {
    let processed = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.products) {
        const product = await tx.product.upsert({ where: { externalId: item.externalId }, update: { sku: item.sku, nameRu: item.nameRu, slug: item.slug, basePrice: item.price, isSynced: true }, create: { externalId: item.externalId, sku: item.sku, nameRu: item.nameRu, slug: item.slug, basePrice: item.price, isSynced: true } });
        const variant = await tx.productVariant.findFirst({ where: { productId: product.id } });
        if (variant) await tx.productVariant.update({ where: { id: variant.id }, data: { price: item.price, stock: item.stock ?? variant.stock } });
        else await tx.productVariant.create({ data: { productId: product.id, name: 'Основной вариант', options: {}, sku: item.sku, price: item.price, stock: item.stock ?? 0 } });
        processed += 1;
        await progress((processed / dto.products.length) * 95);
      }
      await tx.syncLog.create({ data: { system: '1C_KA', action: 'PRODUCTS_UPSERT', status: 'SUCCESS', message: `Обработано товаров: ${processed}`, details: { processed, externalIds: dto.products.map((item) => item.externalId) } } });
    });
    return { success: true, processed, message: `Обработано товаров: ${processed}` };
  }

  logs() {
    return this.prisma.syncLog.findMany({ where: { system: '1C_KA' }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
