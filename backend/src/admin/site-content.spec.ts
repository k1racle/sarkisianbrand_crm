import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SiteContentController } from './site-content.controller';
import { RestoreSiteContentDto, SITE_CONTENT_SECTION_KEYS, UpdateSiteContentDto, siteContentUrlValid, validateSiteContent } from './site-content.dto';
import { SiteContentService } from './site-content.service';
import { MarketplacesService } from '../marketplaces/marketplaces.service';

const copy = (value: any) => JSON.parse(JSON.stringify(value));
describe('business cabinet demonstration content', () => {
  it('preserves optional demo copy, local product image and integer price', () => {
    const content = { home: { business: { preview: { salonTitle: 'Мой салон', appointmentTitle: 'Пример услуги', productImageUrl: '/storefront/products/gel-mousse-23.jpg', productPrice: 663, demoLabel: 'Пример данных' } } } };
    expect(validateSiteContent(content)).toEqual(content);
    expect(validateSiteContent({ home: { business: { title: 'Existing copy' } } })).toEqual({ home: { business: { title: 'Existing copy' } } });
  });
  it.each([
    { productPrice: -1 }, { productPrice: 1.5 }, { productPrice: 1000001 }, { productPrice: '663' },
    { productImageUrl: 'javascript:alert(1)' }, { productImageUrl: 'https://localhost/private.png' },
    { salonTitle: 'x'.repeat(81) }, { invented: 'unknown' },
  ])('rejects invalid demo snapshot %j', preview => {
    expect(() => validateSiteContent({ home: { business: { preview } } })).toThrow(BadRequestException);
  });
  it('does not add demonstration fields to the referral or blogger programs', () => {
    expect(() => validateSiteContent({ home: { referral: { preview: {} } } })).toThrow(BadRequestException);
  });
});
function fixture(initial: any = null) {
  let setting = initial && copy(initial), history: any[] = [], tail = Promise.resolve();
  const tx: any = {
    $queryRaw: jest.fn(async () => [{ key: 'main' }]),
    storefrontSetting: {
      findUnique: jest.fn(async () => setting && copy(setting)),
      findUniqueOrThrow: jest.fn(async () => copy(setting)),
      upsert: jest.fn(async ({ create }: any) => {
        if (!setting) setting = { ...create, announcementText: 'Сохранить объявление', catalogMenu: { entries: [] }, catalogMenuRevision: 12, siteContent: null, siteContentRevision: 0 };
        return copy(setting);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.siteContentRevision !== setting.siteContentRevision) return { count: 0 };
        setting.siteContent = copy(data.siteContent); setting.siteContentRevision++; return { count: 1 };
      }),
    },
    siteContentRevision: {
      findUnique: jest.fn(async ({ where }: any) => history.find(row => row.revision === where.revision) ?? null),
      upsert: jest.fn(async ({ where, create }: any) => {
        let row = history.find(item => item.revision === where.revision);
        if (!row) { row = { ...copy(create), createdAt: new Date('2026-09-16T12:00:00Z') }; history.push(row); }
        return row;
      }),
      create: jest.fn(async ({ data }: any) => {
        if (history.some(row => row.revision === data.revision)) throw new Error('Duplicate revision');
        const row = { ...copy(data), createdAt: new Date('2026-09-16T12:00:00Z') }; history.push(row); return row;
      }),
      findMany: jest.fn(async ({ take }: any) => history.slice().sort((a, b) => b.revision - a.revision).slice(0, take)
        .map(({ revision, actorId, createdAt }) => ({ revision, actorId, createdAt }))),
      count: jest.fn(async () => history.length),
    },
    product: { findMany: jest.fn(async ({ where }: any) => where.id.in.filter((id: string) => id !== 'missing').map((id: string) => ({ id }))) },
    auditLog: { create: jest.fn(async ({ data }: any) => data) },
  };
  const prisma: any = { storefrontSetting: tx.storefrontSetting, $transaction: jest.fn((fn: any) => {
    const run = tail.then(async () => {
      const beforeSetting = setting && copy(setting), beforeHistory = copy(history);
      try { return await fn(tx); } catch (error) { setting = beforeSetting; history = beforeHistory; throw error; }
    });
    tail = run.then(() => undefined, () => undefined); return run;
  }) };
  return { service: new SiteContentService(prisma), tx, prisma, setting: () => setting, history: () => history };
}

describe('site content strict bounded contract', () => {
  it('retains legacy orders and accepts the three editable partnership promotions', () => {
    const legacy = SITE_CONTENT_SECTION_KEYS.filter(key => !['business', 'referral', 'bloggers'].includes(key));
    expect(validateSiteContent({ home: { order: legacy } })).toEqual({ home: { order: legacy } });
    const content = { home: { order: [...SITE_CONTENT_SECTION_KEYS], hidden: ['bloggers'], business: { title: 'Для бизнеса', url: '/business', theme: 'dark', visualLines: ['Закупки', 'Запись'] } } };
    expect(validateSiteContent(content)).toEqual(content);
    expect(() => validateSiteContent({ home: { business: { url: 'javascript:alert(1)' } } })).toThrow();
    expect(() => validateSiteContent({ home: { referral: { theme: 'unknown' } } })).toThrow();
    expect(() => validateSiteContent({ home: { bloggers: { visualLines: Array(5).fill('line') } } })).toThrow();
    expect(validateSiteContent({ home: { bloggers: { visualImageUrl: '/api/v1/media/files/creator.png' } } })).toEqual({ home: { bloggers: { visualImageUrl: '/api/v1/media/files/creator.png' } } });
    expect(() => validateSiteContent({ home: { bloggers: { visualImageUrl: 'javascript:alert(1)' } } })).toThrow();
    expect(validateSiteContent({ home: { bloggers: { visualVideoUrl: '/storefront/svetlana-creator-video.mp4' } } })).toEqual({ home: { bloggers: { visualVideoUrl: '/storefront/svetlana-creator-video.mp4' } } });
    expect(() => validateSiteContent({ home: { bloggers: { visualVideoUrl: 'javascript:alert(1)' } } })).toThrow();
    expect(() => validateSiteContent({ home: { bloggers: { visualVideoUrl: 'http://localhost:1234/private.mp4' } } })).toThrow();
  });
  it('accepts empty content and partial optional blocks without adding frontend defaults', () => {
    expect(validateSiteContent({})).toEqual({});
    expect(validateSiteContent({ home: { story: { title: '  Заголовок  ' } } })).toEqual({ home: { story: { title: 'Заголовок' } } });
  });
  it('supports all content sections and stable lists', () => {
    const content = { contacts: { phone: '+7 (918) 449-63-94', email: 'info@example.com', country: 'Россия' },
      brand: { name: 'SARKISIAN', logoUrl: '/sarkisian-logo.png', footerText: 'От мастера — мастерам' },
      home: { order: [...SITE_CONTENT_SECTION_KEYS], hidden: ['hero'], categories: { title: 'Категории' },
        bestsellers: { mode: 'manual', productIds: ['product-1'] },
        club: { benefits: [{ id: 'one', icon: 'gift', text: 'Бонусы' }], previewBalance: 1250 },
        manifesto: { text: 'Материалы для мастеров' }, story: { portraitUrl: '/storefront/svetlana.webp' },
        benefits: [{ id: 'delivery', icon: 'package', title: 'Доставка' }] },
      footer: { columns: [{ id: 'shop', title: 'Покупателям', items: [{ id: 'account', label: 'Кабинет', action: 'account', url: '', newTab: false }] }],
        legalLinks: [{ id: 'privacy', label: 'Политика', url: '/privacy', newTab: false }] } };
    expect(validateSiteContent(content)).toEqual(content);
  });
  it.each([
    null, [], 'text', { extra: true }, { home: { unknown: {} } }, { home: { club: { icon: 'gift' } } },
    { footer: { legalLinks: [{ id: 'x', secret: 'no' }] } }, { contacts: { phone: 123 } },
    { home: { club: { previewBalance: '1250' } } }, { home: { club: { previewBalance: -1 } } },
    { home: { club: { previewBalance: 1.5 } } }, { home: { club: { previewBalance: 1000001 } } },
    { footer: { legalLinks: [{ newTab: 'false' }] } }, { contacts: { email: 'not-email' } },
    { home: { order: ['hero'] } }, { home: { hidden: ['unknown'] } }, { home: { hidden: ['hero', 'hero'] } },
    { home: { order: ['hero', 'hero', 'bestsellers', 'club', 'manifesto', 'story', 'benefits'] } },
    { home: { bestsellers: { productIds: ['p', 'p'] } } }, { home: { bestsellers: { productIds: [''] } } },
    { home: { bestsellers: { productIds: Array.from({ length: 9 }, (_, i) => `p-${i}`) } } },
    { home: { club: { benefits: [{ id: 'x' }, { id: 'x' }] } } },
    { home: { benefits: [{ icon: 'gift' }] } }, { home: { club: { benefits: [{ icon: 'package' }] } } },
    { footer: { columns: [{ items: [{ action: 'delete' }] }] } }, { brand: { name: 'x'.repeat(81) } },
    { footer: { columns: Array.from({ length: 5 }, (_, i) => ({ id: String(i) })) } },
    JSON.parse('{"__proto__":{"polluted":true}}'),
  ])('rejects invalid content %# without accepting arbitrary JSON', content => {
    expect(() => validateSiteContent(content)).toThrow(BadRequestException);
  });
  it('limits UTF-8 bytes, not only character count', () => {
    const content = { footer: { columns: Array.from({ length: 4 }, (_, c) => ({ id: `c${c}`, title: 'я'.repeat(100),
      items: Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, label: 'я'.repeat(80), url: `https://example.com/${'я'.repeat(350)}`, newTab: false, action: 'none' })) })) } };
    expect(Buffer.byteLength(JSON.stringify(content))).toBeGreaterThan(32768);
    expect(() => validateSiteContent(content)).toThrow('32 КБ');
  });
  it.each(['javascript:alert(1)', '//example.com/a', '/%2fexample.com', '/storefront/../secret.png',
    '/storefront/%252e%252e/secret.png', 'https://user:password@example.com/a', 'http://example.com/a',
    'https://localhost/a', 'https://127.0.0.1/a', 'https://10.0.0.1/a', '/x\\y', '/x%0ay', 'https://example.com:8080/a'])
    ('rejects unsafe link %s', value => expect(siteContentUrlValid(value)).toBe(false));
  it.each(['/storefront/categories/gels.webp', '/api/v1/media/files/asset-1.png', '/sarkisian-logo.png', 'https://cdn.example.com/image.webp'])
    ('accepts approved image %s without fetching', value => expect(siteContentUrlValid(value, true)).toBe(true));
  it('rejects arbitrary internal image roots but permits internal navigation', () => {
    expect(siteContentUrlValid('/uploads/platform-chat/private.png', true)).toBe(false);
    expect(siteContentUrlValid('/catalog?category=gels')).toBe(true);
  });
  it('strict DTO rejects implicit booleans/numbers and extra top-level fields', async () => {
    const dto = plainToInstance(UpdateSiteContentDto, { revision: '0', content: { footer: { legalLinks: [{ newTab: 'false' }] } }, extra: 'no' }, { enableImplicitConversion: true });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['revision', 'content', 'extra']));
  });
  it('accepts valid transformed DTO and enforces strict restore revision types', async () => {
    const dto = plainToInstance(UpdateSiteContentDto, { revision: 0, content: {} }, { enableImplicitConversion: true });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const restore = plainToInstance(RestoreSiteContentDto, { revision: 1, targetRevision: '0' }, { enableImplicitConversion: true });
    expect((await validate(restore)).map(error => error.property)).toContain('targetRevision');
  });
});

describe('site content revision persistence', () => {
  it('GET missing settings returns empty revision-0 content and does not write', async () => {
    const f = fixture(); expect(await f.service.get()).toEqual({ revision: 0, content: {} });
    expect(f.tx.storefrontSetting.upsert).not.toHaveBeenCalled(); expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('GET returns stored partial content, not arbitrary frontend defaults', async () => {
    const f = fixture({ siteContentRevision: 9, siteContent: { brand: { name: 'Brand' } } });
    expect(await f.service.get()).toEqual({ revision: 9, content: { brand: { name: 'Brand' } } });
  });
  it('PATCH locks/CAS and changes only site content fields, preserving other settings', async () => {
    const f = fixture(); expect(await f.service.update({ revision: 0, content: { brand: { name: 'Brand' } } }, 'actor')).toEqual({ revision: 1, content: { brand: { name: 'Brand' } } });
    const write = f.tx.storefrontSetting.updateMany.mock.calls[0][0];
    expect(write.where).toEqual({ key: 'main', siteContentRevision: 0 });
    expect(Object.keys(write.data).sort()).toEqual(['siteContent', 'siteContentRevision']);
    expect(f.setting().announcementText).toBe('Сохранить объявление'); expect(f.setting().catalogMenuRevision).toBe(12);
    expect(f.history().map(row => row.revision)).toEqual([0, 1]);
    const locks = f.tx.$queryRaw.mock.calls.map((call: any) => call[0].join('?'));
    expect(locks[0]).toContain('pg_advisory_xact_lock'); expect(locks[1]).toContain('FOR UPDATE');
  });
  it('full PATCH replaces prior partial object without merging stale fields', async () => {
    const f = fixture(); await f.service.update({ revision: 0, content: { brand: { name: 'Brand' } } }, 'actor');
    expect(await f.service.update({ revision: 1, content: {} }, 'actor')).toEqual({ revision: 2, content: {} });
  });
  it('rejects stale revision before creating history/audit', async () => {
    const f = fixture({ siteContentRevision: 2, siteContent: {} });
    await expect(f.service.update({ revision: 1, content: {} }, 'actor')).rejects.toBeInstanceOf(ConflictException);
    expect(f.tx.siteContentRevision.upsert).not.toHaveBeenCalled(); expect(f.tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('CAS count zero aborts transaction and does not create successful new revision', async () => {
    const f = fixture(); f.tx.storefrontSetting.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.update({ revision: 0, content: {} }, 'actor')).rejects.toBeInstanceOf(ConflictException);
    expect(f.history()).toEqual([]); expect(f.tx.siteContentRevision.create).not.toHaveBeenCalled();
    expect(f.tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('two concurrent editors cannot silently overwrite with the same expected revision', async () => {
    const f = fixture(); const results = await Promise.allSettled([
      f.service.update({ revision: 0, content: { brand: { name: 'First' } } }, 'actor-1'),
      f.service.update({ revision: 0, content: { brand: { name: 'Second' } } }, 'actor-2'),
    ]);
    expect(results.map(row => row.status)).toEqual(['fulfilled', 'rejected']); expect(f.setting().siteContentRevision).toBe(1);
  });
  it('rejects unknown product IDs but permits known inactive IDs to preserve editorial snapshots', async () => {
    const f = fixture(); await expect(f.service.update({ revision: 0, content: { home: { bestsellers: { productIds: ['missing'] } } } }, 'actor')).rejects.toThrow('товаров не найдены');
    expect(f.history()).toHaveLength(0);
    await f.service.update({ revision: 0, content: { home: { bestsellers: { productIds: ['known-inactive'] } } } }, 'actor');
    expect(f.tx.product.findMany.mock.calls[1][0].where).toEqual({ id: { in: ['known-inactive'] } });
  });
  it('restore copies target snapshot into a new revision and preserves immutable history', async () => {
    const f = fixture(); await f.service.update({ revision: 0, content: { brand: { name: 'Old' } } }, 'actor-1');
    await f.service.update({ revision: 1, content: { brand: { name: 'New' } } }, 'actor-2');
    expect(await f.service.restore({ revision: 2, targetRevision: 1 }, 'actor-3')).toEqual({ revision: 3, content: { brand: { name: 'Old' } } });
    expect(f.history().map(row => row.snapshot.brand?.name)).toEqual([undefined, 'Old', 'New', 'Old']);
    expect(f.tx.auditLog.create.mock.calls[2][0].data.payload.targetRevision).toBe(1);
  });
  it('initial revision 0 can be restored as empty content', async () => {
    const f = fixture(); await f.service.update({ revision: 0, content: { brand: { name: 'Brand' } } }, 'actor');
    expect(await f.service.restore({ revision: 1, targetRevision: 0 }, 'actor')).toEqual({ revision: 2, content: {} });
  });
  it('restore rejects missing target or stale expectation without successful writes', async () => {
    const f = fixture(); await expect(f.service.restore({ revision: 0, targetRevision: 99 }, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    expect(f.setting()).toBeNull(); expect(f.history()).toHaveLength(0);
  });
  it('audit failure rolls back content and history together', async () => {
    const f = fixture(); f.tx.auditLog.create.mockRejectedValue(new Error('Audit unavailable'));
    await expect(f.service.update({ revision: 0, content: {} }, 'actor')).rejects.toThrow('Audit unavailable');
    expect(f.setting()).toBeNull(); expect(f.history()).toHaveLength(0);
  });
  it('audit is metadata only and revision list excludes snapshots and customer data', async () => {
    const f = fixture(); await f.service.update({ revision: 0, content: { contacts: { email: 'contact@example.com' } } }, 'actor');
    expect(JSON.stringify(f.tx.auditLog.create.mock.calls[0][0])).not.toContain('contact@example.com');
    const list = await f.service.revisions(); expect(list.total).toBe(2); expect(list.items.map((row: any) => row.revision)).toEqual([1, 0]);
    expect(list.items.every((row: any) => !('snapshot' in row))).toBe(true);
    expect(f.tx.siteContentRevision.findMany.mock.calls[0][0].take).toBe(100);
  });
  it('requires actor and strict numeric revision even when service is called directly', async () => {
    const f = fixture(); await expect(f.service.update({ revision: 0, content: {} }, '')).rejects.toBeInstanceOf(BadRequestException);
    await expect(f.service.update({ revision: '0' as any, content: {} }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    expect(f.tx.storefrontSetting.updateMany).not.toHaveBeenCalled();
  });
});

describe('site content access and truthful marketplace development check', () => {
  it('uses expected role whitelist and explicit catalog read/write permissions', () => {
    expect(Reflect.getMetadata('roles', SiteContentController)).toEqual(['ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR']);
    expect(Reflect.getMetadata('path', SiteContentController)).toBe('admin/storefront/site-content');
    for (const key of ['get', 'revisions']) expect(Reflect.getMetadata('permissions', SiteContentController.prototype[key])).toEqual(['catalog.read']);
    for (const key of ['update', 'restore']) expect(Reflect.getMetadata('permissions', SiteContentController.prototype[key])).toEqual(['catalog.write']);
  });
  it('forwards authenticated actor to updates/restores, never accepts body actor', async () => {
    const service: any = { update: jest.fn(), restore: jest.fn() }, controller = new SiteContentController(service);
    const dto = { revision: 0, content: {} }; controller.update(dto, { user: { sub: 'actor' } });
    expect(service.update).toHaveBeenCalledWith(dto, 'actor');
    controller.restore({ revision: 1, targetRevision: 0 }, { user: { sub: 'actor' } });
    expect(service.restore).toHaveBeenCalledWith({ revision: 1, targetRevision: 0 }, 'actor');
  });
  it('marketplace development check cannot record a real connection or last sync', async () => {
    const prisma: any = { marketplaceIntegration: { findUnique: jest.fn(async () => ({ id: 'integration', channel: 'OZON' })), update: jest.fn() }, syncLog: { create: jest.fn() } };
    const service = new MarketplacesService(prisma, {} as any, {} as any);
    expect(await service.testIntegration('OZON')).toEqual({ success: false, developmentAdapter: true, message: 'Проверка настоящего подключения пока недоступна' });
    expect(prisma.marketplaceIntegration.update).not.toHaveBeenCalled(); expect(prisma.syncLog.create).not.toHaveBeenCalled();
  });
});
