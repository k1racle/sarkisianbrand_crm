import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CATALOG_QUICK_KEYS, CatalogMenuEntryDto, CatalogMenuQuickLinkDto, CatalogQuickKey, UpdateCatalogMenuDto } from './catalog-menu.dto';

export interface CatalogMenuCategory { id: string; nameRu: string; slug: string; parentId: string | null; isActive: boolean; }
export interface CatalogMenuConfig { entries: CatalogMenuEntryDto[]; quickLinks: CatalogMenuQuickLinkDto[]; }
export interface CatalogMenuResponse extends CatalogMenuConfig { revision: number; categories: CatalogMenuCategory[]; }
export const CATALOG_MENU_DEFAULT_QUICK_LINKS: ReadonlyArray<Readonly<CatalogMenuQuickLinkDto>> = Object.freeze([
  Object.freeze({ key: 'new' as const, label: 'Новинки', isVisible: true }),
  Object.freeze({ key: 'popular' as const, label: 'Бестселлеры', isVisible: true }),
  Object.freeze({ key: 'gift-card' as const, label: 'Подарочная карта', isVisible: true }),
]);

const categorySelect = { id: true, nameRu: true, slug: true, parentId: true, isActive: true } as const;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const labelValid = (value: unknown): value is string => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80;
const defaultLabel = (category: CatalogMenuCategory) => category.nameRu.trim().slice(0, 80) || 'Категория';

/** Pure public-reader helper: preserves configured order, ignores unknown/deleted IDs, appends new IDs.
 * Pass known categories; public caller separately enforces Category.isActive AND entry.isVisible.
 * Never invents category URLs/search strings. Corrupt/legacy JSON falls back safely without writing DB.
 */
export function resolveCatalogMenu(value: unknown, categories: readonly CatalogMenuCategory[]): CatalogMenuConfig {
  const raw = object(value) ? value : {}, byId = new Map(categories.map(category => [category.id, category]));
  const seen = new Set<string>(), entries: CatalogMenuEntryDto[] = [];
  if (Array.isArray(raw.entries)) for (const item of raw.entries) {
    if (!object(item) || typeof item.categoryId !== 'string' || !byId.has(item.categoryId) || seen.has(item.categoryId)) continue;
    seen.add(item.categoryId);
    entries.push({ categoryId: item.categoryId, label: labelValid(item.label) ? item.label.trim() : defaultLabel(byId.get(item.categoryId)!),
      isVisible: typeof item.isVisible === 'boolean' ? item.isVisible : true });
  }
  for (const category of categories) if (!seen.has(category.id)) {
    seen.add(category.id); entries.push({ categoryId: category.id, label: defaultLabel(category), isVisible: true });
  }
  const quickSeen = new Set<CatalogQuickKey>(), quickLinks: CatalogMenuQuickLinkDto[] = [];
  if (Array.isArray(raw.quickLinks)) for (const item of raw.quickLinks) {
    if (!object(item) || !CATALOG_QUICK_KEYS.includes(item.key as CatalogQuickKey) || quickSeen.has(item.key as CatalogQuickKey)) continue;
    const key = item.key as CatalogQuickKey, fallback = CATALOG_MENU_DEFAULT_QUICK_LINKS.find(link => link.key === key)!;
    quickSeen.add(key); quickLinks.push({ key, label: labelValid(item.label) ? item.label.trim() : fallback.label,
      isVisible: typeof item.isVisible === 'boolean' ? item.isVisible : true });
  }
  for (const fallback of CATALOG_MENU_DEFAULT_QUICK_LINKS) if (!quickSeen.has(fallback.key)) quickLinks.push({ ...fallback });
  return { entries, quickLinks };
}

function validatedConfig(dto: UpdateCatalogMenuDto, categories: readonly CatalogMenuCategory[]): CatalogMenuConfig {
  if (!Number.isInteger(dto.revision) || dto.revision < 0 || dto.revision > 2_147_483_646) throw new BadRequestException('Укажите текущую ревизию меню');
  if (!Array.isArray(dto.entries) || dto.entries.length > 200 || !Array.isArray(dto.quickLinks) || dto.quickLinks.length !== 3) throw new BadRequestException('Некорректные списки меню каталога');
  const ids = new Set(categories.map(category => category.id)), seen = new Set<string>();
  const entries = dto.entries.map(item => {
    if (!object(item) || typeof item.categoryId !== 'string' || !ids.has(item.categoryId) || seen.has(item.categoryId)) throw new BadRequestException('Категория не найдена или указана повторно');
    if (!labelValid(item.label) || typeof item.isVisible !== 'boolean') throw new BadRequestException('Укажите подпись от 1 до 80 символов и корректную видимость');
    seen.add(item.categoryId); return { categoryId: item.categoryId, label: item.label.trim(), isVisible: item.isVisible };
  });
  const keys = new Set<CatalogQuickKey>();
  const quickLinks = dto.quickLinks.map(item => {
    if (!object(item) || !CATALOG_QUICK_KEYS.includes(item.key as CatalogQuickKey) || keys.has(item.key as CatalogQuickKey) || !labelValid(item.label) || typeof item.isVisible !== 'boolean') {
      throw new BadRequestException('Укажите уникальные быстрые ссылки new, popular и gift-card с корректными подписями');
    }
    keys.add(item.key as CatalogQuickKey); return { key: item.key as CatalogQuickKey, label: item.label.trim(), isVisible: item.isVisible };
  });
  return { entries, quickLinks };
}

@Injectable()
export class CatalogMenuService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<CatalogMenuResponse> {
    return this.prisma.$transaction(async tx => {
      const settings = await tx.storefrontSetting.findUnique({ where: { key: 'main' }, select: { catalogMenu: true, catalogMenuRevision: true } });
      const categories = await tx.category.findMany({ select: categorySelect, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }, { id: 'asc' }] });
      return { revision: settings?.catalogMenuRevision ?? 0, ...resolveCatalogMenu(settings?.catalogMenu, categories), categories };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async update(dto: UpdateCatalogMenuDto, actorId: string): Promise<CatalogMenuResponse> {
    if (!actorId) throw new BadRequestException('Не определён автор изменения');
    return this.prisma.$transaction(async tx => {
      // Serialize creation AND subsequent edits; then row lock interoperates with announcement writer.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('storefront-catalog-menu-main'))`;
      await tx.storefrontSetting.upsert({ where: { key: 'main' }, create: { key: 'main' }, update: {} });
      await tx.$queryRaw`SELECT key FROM "StorefrontSetting" WHERE key = 'main' FOR UPDATE`;
      const current = await tx.storefrontSetting.findUniqueOrThrow({ where: { key: 'main' }, select: { catalogMenuRevision: true } });
      if (current.catalogMenuRevision !== dto.revision) throw new ConflictException('Меню уже изменено. Обновите страницу и повторите изменения');
      const categories = await tx.category.findMany({ select: categorySelect, orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }, { id: 'asc' }] });
      const config = validatedConfig(dto, categories);
      const changed = await tx.storefrontSetting.updateMany({ where: { key: 'main', catalogMenuRevision: dto.revision },
        data: { catalogMenu: config as unknown as Prisma.InputJsonObject, catalogMenuRevision: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Меню уже изменено. Обновите страницу и повторите изменения');
      await tx.auditLog.create({ data: { actorId, action: 'storefront.catalog_menu.update', resource: 'storefront-catalog-menu', resourceId: 'main',
        payload: { revision: dto.revision + 1, categoryIds: config.entries.map(entry => entry.categoryId), entryCount: config.entries.length,
          visibleEntryCount: config.entries.filter(entry => entry.isVisible).length, quickLinkCount: config.quickLinks.length } } });
      return { revision: dto.revision + 1, ...resolveCatalogMenu(config, categories), categories };
    });
  }
}
