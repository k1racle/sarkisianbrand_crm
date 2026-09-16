/** Pure document builders: no database, request headers or integration calls. */
export const PRIVATE_ROUTES = [
  '/api', '/docs', '/admin', '/account', '/cart', '/checkout', '/favorites',
  '/login', '/password-reset', '/auth', '/workspace', '/workspace-login',
  '/system-settings', '/crm', '/marketplaces', '/b2b', '/leadership', '/helpdesk',
  '/preview', '/drafts',
];

export function siteOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL должен быть корнем сайта http(s), без пути, пароля и параметров');
  }
  return url.origin;
}

export function xmlEscape(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

export function isPublicCmsSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !PRIVATE_ROUTES.some(path => `/${slug}`.startsWith(path)) &&
    !['catalog', 'products', 'sitemap', 'robots'].includes(slug);
}

export interface SeoSnapshot {
  products: Array<{ slug: string; updatedAt: Date | string }>;
  categories: Array<{ slug: string }>;
  pages: Array<{ slug: string; isActive: boolean; reviewRequired: boolean; updatedAt: Date | string }>;
}

export function buildSitemap(base: string, snapshot: SeoSnapshot, indexing = true): string {
  const origin = siteOrigin(base);
  const entries = new Map<string, Date | string | undefined>();
  if (indexing) {
    entries.set(`${origin}/`, undefined);
    entries.set(`${origin}/catalog`, undefined);
    for (const category of snapshot.categories) {
      if (category.slug) entries.set(`${origin}/catalog?category=${encodeURIComponent(category.slug)}`, undefined);
    }
    for (const product of snapshot.products) {
      if (product.slug) entries.set(`${origin}/products/${encodeURIComponent(product.slug)}`, product.updatedAt);
    }
    for (const page of snapshot.pages) {
      if (page.isActive && !page.reviewRequired && isPublicCmsSlug(page.slug)) entries.set(`${origin}/${page.slug}`, page.updatedAt);
    }
  }
  if (entries.size > 50_000) throw new Error('Карта превышает 50000 URL: необходимо разделение на sitemap index');
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([loc, updatedAt]) => {
      if (loc.length >= 2048) throw new Error('URL карты должен быть короче 2048 символов');
      const date = updatedAt === undefined ? undefined : new Date(updatedAt);
      const lastmod = date && Number.isFinite(date.getTime()) ? `<lastmod>${date.toISOString()}</lastmod>` : '';
      return `<url><loc>${xmlEscape(loc)}</loc>${lastmod}</url>`;
    }).join('\n') + '\n</urlset>\n';
  if (Buffer.byteLength(xml, 'utf8') > 52_428_800) throw new Error('Карта превышает 50 MiB: необходимо разделение');
  return xml;
}

export function buildRobots(base: string, pages: SeoSnapshot['pages'] = [], indexing = true): string {
  const origin = siteOrigin(base);
  if (!indexing) return 'User-agent: *\nDisallow: /\n';
  const denied = new Set(PRIVATE_ROUTES);
  for (const page of pages) {
    if ((!page.isActive || page.reviewRequired) && isPublicCmsSlug(page.slug)) {
      denied.add(`/${page.slug}$`);
      denied.add(`/${page.slug}?`);
    }
  }
  denied.add('/*?*preview=');
  denied.add('/*?*draft=');
  return `User-agent: *\nAllow: /\n${[...denied].sort().map(path => `Disallow: ${path}`).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`;
}
