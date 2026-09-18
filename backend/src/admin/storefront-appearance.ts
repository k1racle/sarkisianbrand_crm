import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppearanceBannerDto, SaveStorefrontAppearanceDto } from './dto/admin.dto';

export const DEFAULT_ANNOUNCEMENT = 'SARKISIAN BRAND – это официальный интернет-магазин скоростного мастера-блогера Светланы Саркисян';
type Snapshot = { settings: { announcementText: string } | null; banners: unknown[]; menuItems: unknown[]; socialLinks: unknown[] };
function rowsRevision(rows: unknown[], keys: string[]) {
  return rows.map(row => keys.map(key => (row as Record<string, unknown>)[key] ?? null)).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
}
/** Content fingerprint also detects changes made through legacy single-item APIs. */
export function appearanceRevision(snapshot: Snapshot) {
  return createHash('sha256').update(JSON.stringify({
    announcementText: snapshot.settings?.announcementText ?? DEFAULT_ANNOUNCEMENT,
    banners: rowsRevision(snapshot.banners, ['id', 'title', 'subtitle', 'buttonLabel', 'linkUrl', 'imageUrl', 'mobileImageUrl', 'isActive', 'sortOrder', 'startsAt', 'endsAt', 'updatedAt']),
    menu: rowsRevision(snapshot.menuItems, ['id', 'label', 'url', 'newTab', 'isActive', 'sortOrder', 'updatedAt']),
    social: rowsRevision(snapshot.socialLinks, ['id', 'name', 'iconKey', 'url', 'isActive', 'sortOrder', 'updatedAt']),
  })).digest('hex');
}
async function snapshot(tx: Prisma.TransactionClient) {
  const orderBy = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }];
  const [settings, banners, menuItems, socialLinks] = await Promise.all([
    tx.storefrontSetting.findUnique({ where: { key: 'main' } }),
    tx.storefrontBanner.findMany({ orderBy }), tx.storefrontMenuItem.findMany({ orderBy }), tx.storefrontSocialLink.findMany({ orderBy }),
  ]);
  return { settings, banners, menuItems, socialLinks };
}
function validateIds(rows: { id?: string }[], existing: { id: string }[]) {
  const ids = rows.flatMap(row => row.id ? [row.id] : []);
  if (new Set(ids).size !== ids.length) throw new BadRequestException('Элементы настроек не должны повторяться');
  const available = new Set(existing.map(row => row.id));
  if (ids.some(id => !available.has(id))) throw new ConflictException('Список настроек изменён. Обновите страницу перед сохранением');
}
export async function saveAppearance(prisma: PrismaService, dto: SaveStorefrontAppearanceDto, bannerData: (row: AppearanceBannerDto) => Prisma.StorefrontBannerUncheckedCreateInput) {
  // Validate all dates before the first database write.
  const banners = dto.banners.map((row, sortOrder) => ({ ...bannerData(row), sortOrder }));
  try {
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('storefront-appearance'))`;
      const current = await snapshot(tx);
      if (appearanceRevision(current) !== dto.revision) throw new ConflictException('Настройки изменены другим сотрудником. Ваш черновик сохранён на экране; обновите данные перед повторным сохранением');
      validateIds(dto.banners, current.banners); validateIds(dto.menuItems, current.menuItems); validateIds(dto.socialLinks, current.socialLinks);
      await tx.storefrontBanner.deleteMany({ where: { id: { notIn: dto.banners.flatMap(row => row.id ? [row.id] : []) } } });
      await tx.storefrontMenuItem.deleteMany({ where: { id: { notIn: dto.menuItems.flatMap(row => row.id ? [row.id] : []) } } });
      await tx.storefrontSocialLink.deleteMany({ where: { id: { notIn: dto.socialLinks.flatMap(row => row.id ? [row.id] : []) } } });
      for (const [index, row] of dto.banners.entries()) {
        if (row.id) await tx.storefrontBanner.update({ where: { id: row.id }, data: banners[index] });
        else await tx.storefrontBanner.create({ data: banners[index] });
      }
      for (const [sortOrder, row] of dto.menuItems.entries()) {
        const data = { label: row.label.trim(), url: row.url.trim(), newTab: row.newTab ?? false, isActive: row.isActive ?? true, sortOrder };
        if (row.id) await tx.storefrontMenuItem.update({ where: { id: row.id }, data });
        else await tx.storefrontMenuItem.create({ data });
      }
      for (const [sortOrder, row] of dto.socialLinks.entries()) {
        const data = { name: row.name.trim(), iconKey: row.iconKey, url: row.url.trim(), isActive: row.isActive ?? true, sortOrder };
        if (row.id) await tx.storefrontSocialLink.update({ where: { id: row.id }, data });
        else await tx.storefrontSocialLink.create({ data });
      }
      await tx.storefrontSetting.upsert({ where: { key: 'main' }, create: { key: 'main', announcementText: dto.settings.announcementText }, update: { announcementText: dto.settings.announcementText } });
      const saved = await snapshot(tx);
      return { ...saved, revision: appearanceRevision(saved) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 });
  } catch (error: any) {
    if (error?.code === 'P2034') throw new ConflictException('Настройки изменены одновременно с сохранением. Черновик остался на экране; обновите данные');
    throw error;
  }
}
