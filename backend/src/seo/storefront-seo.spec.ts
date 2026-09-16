import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import { siteOrigin } from './seo-document';

/** Transpile only these owned frontend files. No Nuxt server, browser, network or providers. */
function loadFrontend(path: string, globals: Record<string, unknown> = {}) {
  const source = readFileSync(resolve(__dirname, '../../../frontend', path), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(js, {
    exports, URL,
    require: () => ({ computed: (getter: () => unknown) => ({ get value() { return getter(); } }), toValue: (value: any) => typeof value === 'function' ? value() : value?.value ?? value }),
    ...globals,
  });
  return exports;
}

const helpers = loadFrontend('composables/useStorefrontSeo.ts');
const canonical = helpers.storefrontCanonicalUrl;
const policy = helpers.storefrontRobotsPolicy;

describe('canonical and robots meta (pure)', () => {
  it('keeps category and pagination, removes tracking/sorting/filter/hash', () => {
    expect(canonical('https://shop.example/', '/catalog/', { category: 'gels', page: '2', sort: 'price-asc', minPrice: '1000', utm_source: 'vk' })).toBe('https://shop.example/catalog?category=gels&page=2');
    expect(canonical('https://shop.example', '/products/gel-1?utm_source=vk#photo')).toBe('https://shop.example/products/gel-1');
    expect(canonical('https://shop.example', '/catalog', { category: 'gels', page: '1' })).toBe('https://shop.example/catalog?category=gels');
  });

  it.each(['0', '-1', 'abc', '1.5', '100001', ['2', '3']])('ignores invalid pagination %j', page => {
    expect(canonical('https://shop.example', '/catalog', { page })).toBe('https://shop.example/catalog');
  });

  it.each(['https://evil.example', '//evil.example/path', '/\\evil.example', '/path\nheader'])('rejects external or injected paths %s', path => {
    expect(() => canonical('https://shop.example', path)).toThrow();
  });

  it.each(['https://shop.example/', 'https://shop.example:444/', 'http://localhost:3001/'])('normalizes origins consistently with backend %s', base => {
    expect(helpers.storefrontSiteOrigin(base)).toBe(siteOrigin(base));
  });

  it('keeps category and page indexable but marks filtered, private and review pages noindex', () => {
    expect(policy('/catalog', { category: 'gels', page: '2' }, false, true)).toBe('index, follow');
    for (const query of [{ minPrice: '0' }, { purpose: 'Маникюр' }, { sort: 'price-asc' }, { category: 'gels,cutters' }, { search: 'gel' }, { preview: '' }]) {
      expect(policy('/catalog', query, false, true)).toBe('noindex, follow');
    }
    for (const path of ['/account', '/crm-tasks', '/workspace-login', '/admin-workspace', '/b2b-login', '/auth/callback']) expect(policy(path, {}, false, true)).toBe('noindex, follow');
    expect(policy('/privacy-policy', {}, true, true)).toBe('noindex, follow');
    expect(policy('/about')).toBe('noindex, follow');
  });

  it('SSR hook creates canonical and reactive metadata without mounting', () => {
    const route = { path: '/catalog', query: { category: 'gels' } };
    const head = jest.fn(); const meta = jest.fn();
    const module = loadFrontend('composables/useStorefrontSeo.ts', {
      useRoute: () => route,
      useRuntimeConfig: () => ({ public: { siteUrl: 'https://shop.example', seoIndexingEnabled: true } }),
      useHead: head, useSeoMeta: meta,
    });
    const state = module.useStorefrontSeo({ title: () => 'Каталог', image: '/media/photo.jpg' });
    expect(head.mock.calls[0][0]().link[0].href).toBe('https://shop.example/catalog?category=gels');
    expect(meta.mock.calls[0][0].ogImage()).toBe('https://shop.example/media/photo.jpg');
    expect(meta.mock.calls[0][0].robots()).toBe('index, follow');
    route.path = '/cart';
    expect(state.robots.value).toBe('noindex, follow');
    expect(state.canonical.value).toBe('https://shop.example/cart');
  });
});

describe.each([
  ['server/routes/sitemap.xml.ts', '/seo/sitemap', 'application/xml; charset=utf-8', '<?xml version="1.0"?><urlset></urlset>'],
  ['server/routes/robots.txt.ts', '/seo/robots', 'text/plain; charset=utf-8', 'User-agent: *\nDisallow: /\n'],
])('Nitro route %s (mock upstream)', (file, endpoint, contentType, body) => {
  const setup = () => {
    const fetch = jest.fn().mockResolvedValue(body);
    const headers: Record<string, string> = {};
    const module = loadFrontend(file, {
      defineEventHandler: (handler: unknown) => handler,
      useRuntimeConfig: () => ({ seoApiBase: 'http://internal:3000/api/v1', public: { apiBase: 'https://public.example/api/v1' } }),
      $fetch: fetch, setHeader: (_event: unknown, name: string, value: string) => { headers[name] = value; },
      createError: (error: unknown) => error,
    });
    return { fetch, headers, handler: module.default };
  };

  it('uses internal API, correct content type, bounded fetch and 60s cache', async () => {
    const { fetch, headers, handler } = setup();
    expect(await handler({})).toBe(body);
    expect(fetch).toHaveBeenCalledWith(endpoint, expect.objectContaining({ baseURL: 'http://internal:3000/api/v1', timeout: 10_000, retry: 0 }));
    expect(headers['Content-Type']).toBe(contentType);
    expect(headers['Cache-Control']).toBe('public, max-age=60, must-revalidate');
  });

  it('returns no-store 503 on upstream failure, never a partial 200', async () => {
    const { fetch, headers, handler } = setup();
    fetch.mockRejectedValueOnce(new Error('upstream'));
    await expect(handler({})).rejects.toMatchObject({ statusCode: 503 });
    expect(headers['Cache-Control']).toBe('no-store');
  });

  it('rejects an unexpected HTML upstream response', async () => {
    const { fetch, handler } = setup();
    fetch.mockResolvedValueOnce('<html>login/error page</html>');
    await expect(handler({})).rejects.toMatchObject({ statusCode: 503 });
  });
});
