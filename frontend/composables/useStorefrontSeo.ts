import { computed, toValue, type MaybeRefOrGetter } from 'vue';

type SeoQuery = Record<string, unknown>;
const privatePrefixes = ['/api', '/docs', '/admin', '/media-library', '/account', '/cart', '/checkout', '/favorites', '/login', '/password-reset', '/auth', '/workspace', '/system-settings', '/crm', '/marketplaces', '/b2b', '/leadership', '/helpdesk', '/preview', '/drafts'];

export function storefrontSiteOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) throw new Error('Некорректный публичный домен сайта');
  return url.origin;
}

/** Category and pagination are meaningful; sorting, tracking and filters are not canonical. */
export function storefrontCanonicalUrl(base: string, path: string, query: SeoQuery = {}): string {
  const origin = storefrontSiteOrigin(base);
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n]/.test(path)) throw new Error('Ожидается внутренний путь сайта');
  const url = new URL(path, origin);
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
  if (url.pathname === '/catalog') {
    if (typeof query.category === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.category)) url.searchParams.set('category', query.category);
    if (typeof query.page === 'string' || typeof query.page === 'number') {
      const page = Number(query.page);
      if (Number.isInteger(page) && page > 1 && page <= 100_000) url.searchParams.set('page', String(page));
    }
  }
  return url.toString();
}

export function storefrontRobotsPolicy(path: string, query: SeoQuery = {}, reviewRequired = false, indexing = false): string {
  const privatePage = privatePrefixes.some(prefix => path.startsWith(prefix));
  const preview = Object.prototype.hasOwnProperty.call(query, 'preview') || Object.prototype.hasOwnProperty.call(query, 'draft');
  const filtered = path.replace(/\/+$/, '') === '/catalog' && (
    ['search', 'purpose', 'feature', 'minPrice', 'maxPrice', 'inStock'].some(key => query[key] !== undefined && query[key] !== '') ||
    (query.sort !== undefined && query.sort !== 'new') ||
    (query.category !== undefined && !(typeof query.category === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.category)))
  );
  return !indexing || privatePage || preview || reviewRequired || filtered ? 'noindex, follow' : 'index, follow';
}

export interface StorefrontSeoOptions {
  title?: MaybeRefOrGetter<string | undefined>;
  description?: MaybeRefOrGetter<string | undefined>;
  image?: MaybeRefOrGetter<string | undefined>;
  canonical?: MaybeRefOrGetter<string | undefined>;
  reviewRequired?: MaybeRefOrGetter<boolean>;
  noindex?: MaybeRefOrGetter<boolean>;
}

/** Editorial canonical must stay on this storefront's configured origin. */
export function storefrontEditorialCanonical(origin: string, value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value || value.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(value) || (!value.startsWith('/') && !/^https?:\/\//i.test(value))) return fallback;
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== storefrontSiteOrigin(origin) || url.username || url.password) return fallback;
    url.hash = '';
    return url.toString();
  } catch { return fallback; }
}

/** Call once in each public page, replacing its old meta hook. */
export function useStorefrontSeo(options: StorefrontSeoOptions = {}) {
  const route = useRoute();
  const config = useRuntimeConfig();
  // Parent must declare public.siteUrl and public.seoIndexingEnabled in runtimeConfig.
  const indexing = String((config.public as any).seoIndexingEnabled || 'false') === 'true';
  if (indexing && !(config.public as any).siteUrl) throw new Error('Для индексации необходимо задать публичный домен сайта');
  const origin = storefrontSiteOrigin(String((config.public as any).siteUrl || 'http://localhost:3001'));
  const canonical = computed(() => storefrontEditorialCanonical(origin, toValue(options.canonical), storefrontCanonicalUrl(origin, route.path, route.query)));
  const robots = computed(() => toValue(options.noindex) ? 'noindex, follow' : storefrontRobotsPolicy(route.path, route.query, Boolean(toValue(options.reviewRequired)), indexing));
  const image = computed(() => {
    const value = toValue(options.image);
    if (!value) return undefined;
    try { const url = new URL(value, origin); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined; }
    catch { return undefined; }
  });
  useHead(() => ({ link: [{ key: 'storefront-canonical', rel: 'canonical', href: canonical.value }] }));
  useSeoMeta({
    title: () => toValue(options.title), description: () => toValue(options.description), robots: () => robots.value,
    ogTitle: () => toValue(options.title), ogDescription: () => toValue(options.description), ogUrl: () => canonical.value,
    ogType: 'website', ogImage: () => image.value, twitterCard: () => image.value ? 'summary_large_image' : 'summary',
    twitterTitle: () => toValue(options.title), twitterDescription: () => toValue(options.description), twitterImage: () => image.value,
  });
  return { canonical, robots };
}
