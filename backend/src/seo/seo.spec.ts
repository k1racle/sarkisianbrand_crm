import { ConfigService } from '@nestjs/config';
import { buildRobots, buildSitemap, isPublicCmsSlug, PRIVATE_ROUTES, SeoSnapshot, siteOrigin, xmlEscape } from './seo-document';
import { SeoService } from './seo.service';

const date = new Date('2026-09-16T10:00:00Z');
const data: SeoSnapshot = {
  categories: [{ slug: 'gels' }], products: [{ slug: 'gel-1', updatedAt: date }],
  pages: [
    { slug: 'about', isActive: true, reviewRequired: false, updatedAt: date },
    { slug: 'privacy-policy', isActive: true, reviewRequired: true, updatedAt: date },
    { slug: 'hidden', isActive: false, reviewRequired: false, updatedAt: date },
    { slug: 'account', isActive: true, reviewRequired: false, updatedAt: date },
    { slug: '../escape', isActive: true, reviewRequired: false, updatedAt: date },
  ],
};

describe('SEO documents (pure)', () => {
  it('uses real category query routes, products, home/catalog and reviewed active CMS', () => {
    const xml = buildSitemap('https://shop.example/', data);
    expect(xml).toContain('<loc>https://shop.example/catalog?category=gels</loc>');
    expect(xml).not.toContain('/catalog/gels');
    for (const path of ['/', '/catalog', '/products/gel-1', '/about']) expect(xml).toContain(`<loc>https://shop.example${path}</loc>`);
    for (const slug of ['privacy-policy', 'hidden', 'account', 'escape']) expect(xml).not.toContain(`<loc>https://shop.example/${slug}`);
    expect(xml).toContain('<lastmod>2026-09-16T10:00:00.000Z</lastmod>');
    expect(xml).not.toContain('sarkisianbrand.ru');
  });

  it('escapes all XML entities and URL-encodes product slugs', () => {
    expect(xmlEscape('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&apos;');
    const xml = buildSitemap('https://shop.example', { ...data, products: [{ slug: 'гель & <new>', updatedAt: 'invalid' }] });
    expect(xml).toContain(encodeURIComponent('гель & <new>'));
    expect(xml).not.toContain('Invalid Date');
    expect(xml).not.toContain('<new>');
  });

  it('deduplicates deterministic entries and guards protocol size limits', () => {
    expect(buildSitemap('https://shop.example', { ...data, categories: [...data.categories, ...data.categories] })).toBe(buildSitemap('https://shop.example', data));
    expect(() => buildSitemap('https://shop.example', { ...data, products: Array.from({ length: 50_000 }, (_, i) => ({ slug: `p-${i}`, updatedAt: date })) })).toThrow('50000');
  });

  it.each(['https://user:secret@shop.example', 'ftp://shop.example', 'https://shop.example/path', 'https://shop.example?q=1', 'https://shop.example/#hash', 'not-url'])('rejects unsafe origin %s', base => {
    expect(() => siteOrigin(base)).toThrow();
  });

  it('robots blocks private paths and drafts, but not public category queries', () => {
    const robots = buildRobots('https://shop.example', data.pages);
    for (const path of PRIVATE_ROUTES) expect(robots).toContain(`Disallow: ${path}\n`);
    expect(robots).toContain('Disallow: /privacy-policy$');
    expect(robots).toContain('Disallow: /privacy-policy?');
    expect(robots).toContain('Disallow: /hidden$');
    expect(robots).not.toContain('Disallow: /about');
    expect(robots).not.toContain('Disallow: /catalog');
    expect(robots).toContain('Sitemap: https://shop.example/sitemap.xml\n');
    expect(robots).not.toContain('/api/v1/seo/sitemap');
    expect(isPublicCmsSlug('sitemap')).toBe(false);
  });

  it('stage emits deny-all robots and an empty valid sitemap', () => {
    expect(buildRobots('https://stage.example', data.pages, false)).toBe('User-agent: *\nDisallow: /\n');
    const xml = buildSitemap('https://stage.example', data, false);
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<loc>');
  });
});

describe('SEO cache and failures (mock DB only)', () => {
  const setup = (values: Record<string, string> = { SITE_URL: 'https://shop.example', SEO_INDEXING_ENABLED: 'true' }) => {
    const prisma = {
      product: { findMany: jest.fn() }, category: { findMany: jest.fn() }, storefrontPage: { findMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([data.products, data.categories, data.pages]),
    };
    // Isolate ConfigService's process.env fallback from the parent environment.
    const config = { get: (key: string) => values[key] } as ConfigService;
    return { prisma, service: new SeoService(prisma as any, config) };
  };

  afterEach(() => jest.restoreAllMocks());

  it('coalesces concurrent requests, shares robots cache and expires after 60 seconds', async () => {
    let now = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const { prisma, service } = setup();
    await Promise.all([service.sitemap(), service.sitemap(), service.robots()]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    expect(prisma.category.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    now += 60_001;
    await service.sitemap();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('returns 503 on failure, does not poison cache and allows retry', async () => {
    const { prisma, service } = setup();
    prisma.$transaction.mockRejectedValueOnce(new Error('DB password must not leak'));
    await expect(service.sitemap()).rejects.toMatchObject({ status: 503, message: 'SEO-данные временно недоступны' });
    await expect(service.sitemap()).resolves.toContain('/products/gel-1');
  });

  it('does not query DB while indexing disabled', async () => {
    const { prisma, service } = setup({});
    await service.sitemap(); await service.robots();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires explicit production origin and HTTPS when indexing', () => {
    expect(() => setup({ NODE_ENV: 'production' })).toThrow('SITE_URL');
    expect(() => setup({ NODE_ENV: 'production', SITE_URL: 'http://shop.example', SEO_INDEXING_ENABLED: 'true' })).toThrow('HTTPS');
  });
});
