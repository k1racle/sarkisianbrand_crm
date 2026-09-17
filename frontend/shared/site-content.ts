export const homeSectionKeys = ['hero', 'categories', 'bestsellers', 'club', 'manifesto', 'story', 'benefits'] as const;
export type HomeSection = typeof homeSectionKeys[number];
export type SiteContentAction = 'none' | 'account' | 'favorites' | 'cart';
export interface SiteContentLink { id: string; label: string; url: string; newTab: boolean }
export interface SiteContentFooterItem extends SiteContentLink { action: SiteContentAction }
export interface SiteContent {
  contacts: { phone: string; email: string; country: string };
  brand: { name: string; logoUrl: string; footerText: string };
  home: {
    order: HomeSection[]; hidden: HomeSection[];
    categories: { eyebrow: string; title: string; buttonLabel: string };
    bestsellers: { eyebrow: string; title: string; buttonLabel: string; mode: 'popular' | 'manual'; productIds: string[] };
    club: { label: string; title: string; accent: string; benefits: Array<{ id: string; icon: 'award' | 'gift' | 'shield'; text: string }>; joinLabel: string; aboutLabel: string; previewLabel: string; previewBalance: number };
    manifesto: { text: string };
    story: { eyebrow: string; title: string; accent: string; body: string; buttonLabel: string; portraitUrl: string };
    benefits: Array<{ id: string; icon: 'package' | 'shield' | 'award' | 'sparkles'; eyebrow: string; title: string; body: string }>;
  };
  footer: { columns: Array<{ id: string; title: string; items: SiteContentFooterItem[] }>; legalLinks: SiteContentLink[] };
}
export type SiteContentInput = { [K in keyof SiteContent]?: DeepOptional<SiteContent[K]> };
type DeepOptional<T> = T extends Array<infer U> ? Array<DeepOptional<U>> : T extends object ? { [K in keyof T]?: DeepOptional<T[K]> } : T;

const link = (id: string, label: string, url: string, action: SiteContentAction = 'none'): SiteContentFooterItem => ({ id, label, url, action, newTab: false });
export const defaultSiteContent: SiteContent = {
  contacts: { phone: '8 (918) 449-63-94', email: 'info@sarkisianbrand.ru', country: 'Россия' },
  brand: { name: 'SARKISIAN BRAND', logoUrl: '/sarkisian-logo.png', footerText: 'Профессиональные материалы и инструменты для мастеров маникюра. От мастера — мастерам.' },
  home: {
    order: [...homeSectionKeys], hidden: [],
    categories: { eyebrow: 'ВЫБИРАЙТЕ ПО ЗАДАЧЕ', title: 'Всё необходимое\nдля уверенной работы', buttonLabel: 'Весь каталог' },
    bestsellers: { eyebrow: 'ВЫБОР МАСТЕРОВ', title: 'Бестселлеры', buttonLabel: 'Смотреть все', mode: 'popular', productIds: [] },
    club: { label: 'SARKISIAN CLUB', title: 'Покупайте любимое.', accent: 'Получайте больше.', benefits: [
      { id: 'rewards', icon: 'award', text: 'Бонусы за покупки для следующих заказов' },
      { id: 'levels', icon: 'gift', text: 'Уровень участия и условия программы в кабинете' },
      { id: 'balance', icon: 'shield', text: 'Баланс и история начислений всегда под рукой' },
    ], joinLabel: 'Вступить в клуб', aboutLabel: 'О клубе', previewLabel: 'Пример бонусного баланса', previewBalance: 1250 },
    manifesto: { text: 'SARKISIAN — премиальный бренд для мастеров маникюра, который понимает профессию изнутри.' },
    story: { eyebrow: 'SARKISIAN BRAND', title: 'Материалы, которые помогают работать', accent: 'быстрее и увереннее', body: 'Мы не просто продаём — мы производим профессиональные материалы под личным контролем Светланы Саркисян. Только решения, которые действительно удобны в ежедневной работе.', buttonLabel: 'Познакомиться с продуктами', portraitUrl: '/storefront/svetlana-portrait.png' },
    benefits: [
      { id: 'delivery', icon: 'package', eyebrow: '01 / ДОСТАВКА', title: 'Быстрая отправка', body: 'Передаём заказ в сборку сразу после оплаты и сообщаем о каждом этапе.' },
      { id: 'quality', icon: 'shield', eyebrow: '02 / КАЧЕСТВО', title: 'Оригинальная продукция', body: 'Напрямую от SARKISIAN BRAND — с контролем каждой партии.' },
      { id: 'club', icon: 'award', eyebrow: '03 / SARKISIAN CLUB', title: 'Бонусы за покупки', body: 'Возвращаем часть заказа баллами для следующих покупок.' },
      { id: 'expertise', icon: 'sparkles', eyebrow: '04 / ЭКСПЕРТИЗА', title: 'Создано для мастеров', body: 'Продукты проверены Светланой Саркисян в реальной ежедневной работе.' },
    ],
  },
  footer: { columns: [
    { id: 'buyers', title: 'Покупателям', items: [link('catalog', 'Каталог', '/catalog'), link('account', 'Личный кабинет', '/account', 'account'), link('favorites', 'Избранное', '/favorites', 'favorites'), link('cart', 'Корзина', '/cart', 'cart')] },
    { id: 'company', title: 'Компания', items: [link('about', 'О бренде', '/about'), link('delivery', 'Доставка и оплата', '/delivery'), link('club', 'О клубе', '/club'), link('contacts', 'Контакты', '/contacts'), link('b2b', 'Кабинет B2B', '/b2b-login')] },
  ], legalLinks: [
    { id: 'privacy', label: 'Политика конфиденциальности', url: '/privacy', newTab: false },
    { id: 'oferta', label: 'Публичная оферта', url: '/oferta', newTab: false },
    { id: 'returns', label: 'Правила возврата', url: '/returns', newTab: false },
  ] },
};

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** No protocol-relative URLs, credentials, traversal or private external hosts. Never fetches URLs. */
export function safeSiteContentUrl(value: unknown, image = false): value is string {
  if (typeof value !== 'string' || !value || value.length > 500 || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  let decoded = value;
  try { for (let i = 0; i < 3; i++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } } catch { return false; }
  if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.split(/[/?#]/).includes('..') || decoded.startsWith('//')) return false;
  if (value.startsWith('/')) return !image || value === '/sarkisian-logo.png' || /^\/(?:storefront\/|api\/v1\/media\/files\/)/.test(value);
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && host.includes('.') &&
      !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) &&
      !/\.(?:localhost|local|internal|test|invalid)$/.test(host) && !host.includes(':') && !/^\d+(?:\.\d+){3}$/.test(host);
  } catch { return false; }
}
export function siteContentPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `tel:${digits.length === 11 && digits.startsWith('8') ? `+7${digits.slice(1)}` : phone.startsWith('+') ? `+${digits}` : digits.length === 10 ? `+7${digits}` : `+${digits || '79184496394'}`}`;
}

const limits: Record<string, number> = { phone: 30, email: 254, country: 80, name: 80, logoUrl: 500, footerText: 500, eyebrow: 100, title: 200, buttonLabel: 80, label: 80, accent: 200, text: 250, joinLabel: 80, aboutLabel: 80, previewLabel: 100, body: 1000, portraitUrl: 500, id: 80, url: 500 };
const templates: Record<string, unknown> = {
  'home.club.benefits': { id: '', icon: 'award', text: '' },
  'home.benefits': { id: '', icon: 'package', eyebrow: '', title: '', body: '' },
  'footer.columns': { id: '', title: '', items: [] },
  'footer.columns.items': { id: '', label: '', url: '/catalog', action: 'none', newTab: false },
  'footer.legalLinks': { id: '', label: '', url: '/privacy', newTab: false },
};
const arrayLimits: Record<string, number> = { 'home.club.benefits': 6, 'home.benefits': 8, 'footer.columns': 4, 'footer.columns.items': 12, 'footer.legalLinks': 8 };
function mergeValue(base: any, input: unknown, path: string): any {
  if (Array.isArray(base)) {
    if (!Array.isArray(input)) return base.map(item => mergeValue(item, undefined, path));
    if (path === 'home.order' || path === 'home.hidden') {
      const valid = input.every(item => homeSectionKeys.includes(item as HomeSection)) && new Set(input).size === input.length;
      return valid && (path !== 'home.order' || input.length === 7) ? [...input] : [...base];
    }
    if (path === 'home.bestsellers.productIds') return input.length <= 8 && input.every(item => typeof item === 'string' && !!item.trim() && item.length <= 80) && new Set(input).size === input.length ? [...input] : [...base];
    const template = templates[path];
    if (!template || input.length > arrayLimits[path]) return base.map(item => mergeValue(item, undefined, path));
    if (!input.every(item => object(item) && (item.id === undefined || typeof item.id === 'string' && !!item.id.trim() && item.id.length <= 80))) return base.map(item => mergeValue(item, undefined, path));
    const rows = input.map((item, index) => {
      const fallback = (item.id === undefined ? base[index] : base.find(row => row.id === item.id)) || { ...(template as Record<string, unknown>), id: `${path.replace(/\./g, '-')}-${index + 1}` };
      return mergeValue(fallback, item, path);
    });
    return new Set(rows.map(item => item.id)).size === rows.length ? rows : base.map(item => mergeValue(item, undefined, path));
  }
  if (object(base)) return Object.fromEntries(Object.keys(base).map(key => [key, mergeValue(base[key], object(input) && Object.prototype.hasOwnProperty.call(input, key) ? input[key] : undefined, path ? `${path}.${key}` : key)]));
  if (typeof base === 'boolean') return typeof input === 'boolean' ? input : base;
  if (typeof base === 'number') return Number.isInteger(input) && (input as number) >= 0 && (input as number) <= 1_000_000 ? input : base;
  if (typeof input !== 'string') return base;
  const key = path.split('.').pop()!;
  const max = path === 'home.manifesto.text' ? 500 : path === 'home.story.body' ? 2000 : path === 'footer.columns.title' ? 100 : limits[key] || 80;
  if (input.length > max) return base;
  if (key === 'logoUrl' || key === 'portraitUrl') return safeSiteContentUrl(input, true) ? input : base;
  if (key === 'url') return safeSiteContentUrl(input) ? input : base;
  if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return base;
  if (key === 'phone' && !/^\+?[\d ()-]+$/.test(input)) return base;
  const allowed = key === 'mode' ? ['popular', 'manual'] : key === 'action' ? ['none', 'account', 'favorites', 'cart'] : key === 'icon' ? path.startsWith('home.club.') ? ['award', 'gift', 'shield'] : ['package', 'shield', 'award', 'sparkles'] : undefined;
  return allowed && !allowed.includes(input) ? base : input;
}
/** Whitelisted deep defaults; arrays replace atomically, missing nested fields retain defaults. */
export function mergeSiteContent(input?: unknown): SiteContent {
  return mergeValue(defaultSiteContent, input, '') as SiteContent;
}
