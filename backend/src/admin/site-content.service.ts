import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RestoreSiteContentDto, SiteContent, UpdateSiteContentDto, validateSiteContent } from './site-content.dto';

export interface SiteContentResponse { revision: number; content: SiteContent; }
const settingSelect = { siteContent: true, siteContentRevision: true } as const;
const revisionSelect = { revision: true, createdAt: true, actorId: true } as const;
const conflict = () => new ConflictException('Контент уже изменён. Обновите страницу и повторите изменения');
function checkRevision(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 2147483646) {
    throw new BadRequestException('Укажите корректную текущую ревизию');
  }
}

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiteContentResponse> {
    const setting = await this.prisma.storefrontSetting.findUnique({ where: { key: 'main' }, select: settingSelect });
    return { revision: setting?.siteContentRevision ?? 0, content: validateSiteContent(setting?.siteContent ?? {}) };
  }

  /** Metadata only, bounded latest 100 snapshots; no actors' names/email or content in list. */
  async revisions() {
    return this.prisma.$transaction(async tx => {
      const items = await tx.siteContentRevision.findMany({ select: revisionSelect, orderBy: { revision: 'desc' }, take: 100 });
      const total = await tx.siteContentRevision.count();
      return { items, total };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async update(dto: UpdateSiteContentDto, actorId: string): Promise<SiteContentResponse> {
    checkRevision(dto.revision);
    const content = validateSiteContent(dto.content);
    return this.save(dto.revision, actorId, content);
  }

  async restore(dto: RestoreSiteContentDto, actorId: string): Promise<SiteContentResponse> {
    checkRevision(dto.revision); checkRevision(dto.targetRevision);
    return this.save(dto.revision, actorId, undefined, dto.targetRevision);
  }

  private async save(expected: number, actorId: string, proposed?: SiteContent, targetRevision?: number): Promise<SiteContentResponse> {
    if (!actorId) throw new BadRequestException('Не определён автор изменения');
    return this.prisma.$transaction(async tx => {
      // Serializes first creation; row lock coordinates with existing writers of the same setting.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('storefront-site-content-main'))`;
      await tx.storefrontSetting.upsert({ where: { key: 'main' }, create: { key: 'main' }, update: {} });
      await tx.$queryRaw`SELECT key FROM "StorefrontSetting" WHERE key = 'main' FOR UPDATE`;
      const current = await tx.storefrontSetting.findUniqueOrThrow({ where: { key: 'main' }, select: settingSelect });
      if (current.siteContentRevision !== expected) throw conflict();
      let content = proposed;
      if (targetRevision !== undefined) {
        const previous = await tx.siteContentRevision.findUnique({ where: { revision: targetRevision }, select: { snapshot: true } });
        if (!previous) throw new NotFoundException('Ревизия контента не найдена');
        content = validateSiteContent(previous.snapshot);
      }
      if (!content) throw new BadRequestException('Не указан контент');
      const home = content.home as Record<string, unknown> | undefined;
      const bestsellers = home?.bestsellers as Record<string, unknown> | undefined;
      const productIds = (bestsellers?.productIds ?? []) as string[];
      if (productIds.length) {
        // Known inactive products may remain in editorial snapshots. Public reader enforces publication.
        const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
        if (products.length !== productIds.length) throw new BadRequestException('Один или несколько товаров не найдены');
      }
      // Keep the starting snapshot too, including revision 0, so first edit can be undone.
      await tx.siteContentRevision.upsert({ where: { revision: expected }, update: {}, create: {
        revision: expected, snapshot: validateSiteContent(current.siteContent ?? {}) as Prisma.InputJsonObject, actorId: null,
      } });
      const changed = await tx.storefrontSetting.updateMany({ where: { key: 'main', siteContentRevision: expected },
        data: { siteContent: content as Prisma.InputJsonObject, siteContentRevision: { increment: 1 } } });
      if (changed.count !== 1) throw conflict();
      const revision = expected + 1;
      await tx.siteContentRevision.create({ data: { revision, snapshot: content as Prisma.InputJsonObject, actorId } });
      await tx.auditLog.create({ data: { actorId, action: targetRevision === undefined ? 'storefront.site_content.update' : 'storefront.site_content.restore',
        resource: 'storefront-site-content', resourceId: 'main', payload: {
          revision, previousRevision: expected, ...(targetRevision === undefined ? {} : { targetRevision }),
          sections: Object.keys(content), bytes: Buffer.byteLength(JSON.stringify(content), 'utf8'),
        } } });
      // Legal page body/reviewRequired are separate. This operation cannot clear their review gate.
      return { revision, content };
    });
  }
}
