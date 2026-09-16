import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConflictException } from '@nestjs/common';
import { CatalogMenuController } from './catalog-menu.controller';
import { UpdateCatalogMenuDto } from './catalog-menu.dto';
import { CatalogMenuCategory, CatalogMenuService, CATALOG_MENU_DEFAULT_QUICK_LINKS, resolveCatalogMenu } from './catalog-menu.service';

const categories: CatalogMenuCategory[] = [
  { id: 'category-gels', nameRu: 'Гели', slug: 'gels', parentId: null, isActive: true },
  { id: 'category-tools', nameRu: 'Инструменты', slug: 'tools', parentId: null, isActive: true },
  { id: 'category-old', nameRu: 'Архив', slug: 'old', parentId: 'category-tools', isActive: false },
];
function payload(revision = 0): UpdateCatalogMenuDto {
  return { revision, entries: [{ categoryId: 'category-tools', label: '  Инструменты мастера  ', isVisible: false }],
    quickLinks: CATALOG_MENU_DEFAULT_QUICK_LINKS.map(link => ({ ...link })) };
}
function fixture(initial: any = null) {
  let settings: any = initial;
  const tx: any = {
    $queryRaw: jest.fn(async () => [{ key: 'main' }]),
    category: { findMany: jest.fn(async () => categories.map(category => ({ ...category }))) },
    storefrontSetting: {
      findUnique: jest.fn(async () => settings && { ...settings }),
      findUniqueOrThrow: jest.fn(async () => ({ ...settings })),
      upsert: jest.fn(async ({ create }: any) => { if (!settings) settings = { announcementText: 'Существующее объявление', catalogMenuRevision: 0, catalogMenu: null, ...create }; return { ...settings }; }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (settings?.catalogMenuRevision !== where.catalogMenuRevision) return { count: 0 };
        settings.catalogMenu = data.catalogMenu; settings.catalogMenuRevision++; return { count: 1 };
      }),
    },
    auditLog: { create: jest.fn(async ({ data }: any) => data) },
  };
  const prisma: any = { $transaction: jest.fn(async (fn: any) => fn(tx)) };
  return { service: new CatalogMenuService(prisma), tx, prisma, settings: () => settings };
}

describe('catalog menu pure public-reader defaults', () => {
  it('default is all known categories with current names and default Russian quick links', () => {
    expect(resolveCatalogMenu(null, categories)).toEqual({ entries: categories.map(category => ({ categoryId: category.id, label: category.nameRu, isVisible: true })),
      quickLinks: CATALOG_MENU_DEFAULT_QUICK_LINKS.map(link => ({ ...link })) });
  });
  it('preserves custom order, label/hidden flag, appends new categories without mutating input', () => {
    const dto = payload(); const original = JSON.stringify(dto);
    const config = resolveCatalogMenu(dto, categories);
    expect(config.entries.map(entry => entry.categoryId)).toEqual(['category-tools', 'category-gels', 'category-old']);
    expect(config.entries[0]).toEqual({ categoryId: 'category-tools', label: 'Инструменты мастера', isVisible: false });
    expect(config.entries[2].isVisible).toBe(true); // inactive remains an editor entry, NOT public permission.
    expect(JSON.stringify(dto)).toBe(original);
  });
  it('ignores stale/deleted IDs and duplicates; never invents routes', () => {
    const config = resolveCatalogMenu({ entries: [{ categoryId: '/catalog?search=evil', label: 'Fake', isVisible: true },
      { categoryId: 'category-gels', label: 'Гели', isVisible: false }, { categoryId: 'category-gels', label: 'Duplicate', isVisible: true }] }, categories);
    expect(config.entries).toHaveLength(3); expect(config.entries[0].isVisible).toBe(false);
    expect(JSON.stringify(config)).not.toContain('search=evil');
  });
  it('malformed legacy JSON and quick links safely fall back to defaults', () => {
    const config = resolveCatalogMenu({ entries: [{ categoryId: 'category-gels', label: '', isVisible: 'false' }],
      quickLinks: [{ key: 'unknown', label: 'Fake', isVisible: true }, { key: 'gift-card', label: '  Подарок  ', isVisible: false }, { key: 'gift-card', label: 'Duplicate', isVisible: true }] }, categories);
    expect(config.entries[0]).toEqual({ categoryId: 'category-gels', label: 'Гели', isVisible: true });
    expect(config.quickLinks[0]).toEqual({ key: 'gift-card', label: 'Подарок', isVisible: false });
    expect(config.quickLinks).toHaveLength(3);
  });
  it('does not expose inactive/hidden entries when caller applies public policy', () => {
    const result = resolveCatalogMenu(payload(), categories);
    const active = new Set(categories.filter(category => category.isActive).map(category => category.id));
    expect(result.entries.filter(entry => entry.isVisible && active.has(entry.categoryId)).map(entry => entry.categoryId)).toEqual(['category-gels']);
  });
  it('returns new default arrays so a caller cannot mutate shared configuration', () => {
    const first = resolveCatalogMenu(null, []); first.quickLinks[0].label = 'Changed';
    expect(resolveCatalogMenu(null, []).quickLinks[0].label).toBe('Новинки');
  });
});

describe('catalog menu service atomic persistence', () => {
  it('GET returns revision 0 draft with safe categories and performs no creation', async () => {
    const f = fixture(); const result = await f.service.get();
    expect(result.revision).toBe(0); expect(result.entries).toHaveLength(3); expect(result.categories).toEqual(categories);
    expect(f.tx.storefrontSetting.upsert).not.toHaveBeenCalled(); expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled(); expect(f.tx.$queryRaw).not.toHaveBeenCalled();
    expect(f.tx.category.findMany.mock.calls[0][0].select).toEqual({ id: true, nameRu: true, slug: true, parentId: true, isActive: true });
  });
  it('GET preserves revision/custom menu and appends missing categories read-only', async () => {
    const f = fixture({ key: 'main', announcementText: 'Без изменений', catalogMenuRevision: 8, catalogMenu: payload() });
    const result = await f.service.get(); expect(result.revision).toBe(8); expect(result.entries[0].isVisible).toBe(false);
    expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled(); expect(f.settings().announcementText).toBe('Без изменений');
  });
  it('PATCH creates main setting then row-locks and CAS increments revision; announcement is preserved', async () => {
    const f = fixture(); const result = await f.service.update(payload(), 'actor-1');
    expect(result.revision).toBe(1); expect(result.entries).toHaveLength(3); expect(f.settings().announcementText).toBe('Существующее объявление');
    const write = f.tx.storefrontSetting.updateMany.mock.calls[0][0];
    expect(write.where).toEqual({ key: 'main', catalogMenuRevision: 0 });
    expect(Object.keys(write.data).sort()).toEqual(['catalogMenu', 'catalogMenuRevision']);
    expect(write.data.catalogMenu).not.toHaveProperty('revision'); expect(write.data.catalogMenu.entries).toHaveLength(1);
    const locks = f.tx.$queryRaw.mock.calls.map((call: any) => call[0].join('?'));
    expect(locks[0]).toContain('pg_advisory_xact_lock'); expect(locks[1]).toContain('FOR UPDATE');
  });
  it('rejects stale revisions without replacing settings or recording successful audit', async () => {
    const f = fixture({ key: 'main', catalogMenuRevision: 2, catalogMenu: payload(), announcementText: 'Keep' });
    await expect(f.service.update(payload(1), 'actor')).rejects.toBeInstanceOf(ConflictException);
    expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled(); expect(f.tx.auditLog.create).not.toHaveBeenCalled(); expect(f.settings().catalogMenuRevision).toBe(2);
  });
  it('CAS conflict after lock still cannot silently lose an update', async () => {
    const f = fixture(); f.tx.storefrontSetting.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.update(payload(), 'actor')).rejects.toBeInstanceOf(ConflictException);
    expect(f.tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('two serialized concurrent editors with same revision commit once', async () => {
    const f = fixture(); let tail: Promise<any> = Promise.resolve();
    // Mock the serializing xact lock; no actual database/customer writes.
    f.prisma.$transaction.mockImplementation((fn: any) => { const current = tail.then(() => fn(f.tx)); tail = current.catch(() => undefined); return current; });
    const result = await Promise.allSettled([f.service.update(payload(), 'actor-a'), f.service.update(payload(), 'actor-b')]);
    expect(result.filter(entry => entry.status === 'fulfilled')).toHaveLength(1); expect(result.filter(entry => entry.status === 'rejected')).toHaveLength(1);
    expect(f.tx.storefrontSetting.updateMany).toHaveBeenCalledTimes(1); expect(f.settings().catalogMenuRevision).toBe(1);
  });
  it('audit is transaction-local with actor IDs/counts only, not customer labels', async () => {
    const f = fixture(); await f.service.update(payload(), 'actor');
    expect(f.tx.auditLog.create.mock.calls[0][0].data).toEqual({ actorId: 'actor', action: 'storefront.catalog_menu.update', resource: 'storefront-catalog-menu', resourceId: 'main',
      payload: { revision: 1, categoryIds: ['category-tools'], entryCount: 1, visibleEntryCount: 0, quickLinkCount: 3 } });
    expect(JSON.stringify(f.tx.auditLog.create.mock.calls)).not.toContain('Инструменты мастера');
  });
  it('missing actor and invalid raw revision are rejected', async () => {
    const f = fixture(); await expect(f.service.update(payload(), '')).rejects.toThrow();
    await expect(f.service.update({ ...payload(), revision: '0' } as any, 'actor')).rejects.toThrow();
    expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled();
  });
  it.each(['unknown', 'duplicate', 'false-string', 'empty-label', 'long-label', 'bad-quick-key', 'duplicate-quick', 'missing-quick'])('rejects invalid configuration %s before updating', async defect => {
    const f = fixture(); const dto: any = payload();
    if (defect === 'unknown') dto.entries[0].categoryId = '/fake/url';
    if (defect === 'duplicate') dto.entries.push({ ...dto.entries[0] });
    if (defect === 'false-string') dto.entries[0].isVisible = 'false';
    if (defect === 'empty-label') dto.entries[0].label = '  ';
    if (defect === 'long-label') dto.entries[0].label = 'a'.repeat(81);
    if (defect === 'bad-quick-key') dto.quickLinks[0].key = 'url';
    if (defect === 'duplicate-quick') dto.quickLinks[1].key = 'new';
    if (defect === 'missing-quick') dto.quickLinks.pop();
    await expect(f.service.update(dto, 'actor')).rejects.toThrow(); expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled();
  });
  it('permits inactive categories as explicit hidden editor configuration', async () => {
    const f = fixture(); const dto = payload(); dto.entries = [{ categoryId: 'category-old', label: 'Архив', isVisible: false }];
    expect((await f.service.update(dto, 'actor')).entries[0]).toEqual(dto.entries[0]);
  });
});

describe('catalog menu nested DTOs with global implicit conversion', () => {
  const errors = (value: any) => validate(plainToInstance(UpdateCatalogMenuDto, value, { enableImplicitConversion: true }), { whitelist: true, forbidNonWhitelisted: true });
  it('accepts typed nested configuration and trims labels', async () => {
    expect(await errors(payload())).toHaveLength(0);
    expect(plainToInstance(UpdateCatalogMenuDto, payload(), { enableImplicitConversion: true }).entries[0].label).toBe('Инструменты мастера');
  });
  it.each(['entry-string-boolean', 'quick-string-boolean', 'numeric-label', 'numeric-id', 'numeric-key', 'string-revision', 'null-revision', 'negative-revision', 'null-entry', 'unknown-field', 'array-overcap'])('rejects malformed raw nested data %s', async defect => {
    const dto: any = payload();
    if (defect === 'entry-string-boolean') dto.entries[0].isVisible = 'false';
    if (defect === 'quick-string-boolean') dto.quickLinks[0].isVisible = 'true';
    if (defect === 'numeric-label') dto.entries[0].label = 123;
    if (defect === 'numeric-id') dto.entries[0].categoryId = 123;
    if (defect === 'numeric-key') dto.quickLinks[0].key = 123;
    if (defect === 'string-revision') dto.revision = '0';
    if (defect === 'null-revision') dto.revision = null;
    if (defect === 'negative-revision') dto.revision = -1;
    if (defect === 'null-entry') dto.entries = [null];
    if (defect === 'unknown-field') dto.entries[0].url = 'https://example.invalid';
    if (defect === 'array-overcap') dto.entries = Array.from({ length: 201 }, () => ({ ...dto.entries[0] }));
    expect((await errors(dto)).length).toBeGreaterThan(0);
  });
});

describe('catalog menu controller authorization contract', () => {
  it('requires JWT, appropriate roles and catalog.read/write permissions', () => {
    expect(Reflect.getMetadata('roles', CatalogMenuController)).toEqual(['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR']);
    expect(Reflect.getMetadata('__guards__', CatalogMenuController)).toHaveLength(2);
    expect(Reflect.getMetadata('permissions', CatalogMenuController.prototype.get)).toEqual(['catalog.read']);
    expect(Reflect.getMetadata('permissions', CatalogMenuController.prototype.update)).toEqual(['catalog.write']);
  });
  it('forwards actor from verified req.user.sub, not body', async () => {
    const service = { get: jest.fn(), update: jest.fn() }, controller = new CatalogMenuController(service as any), dto = payload();
    await controller.get(); await controller.update(dto, { user: { sub: 'verified-actor' } });
    expect(service.get).toHaveBeenCalled(); expect(service.update).toHaveBeenCalledWith(dto, 'verified-actor');
  });
});
