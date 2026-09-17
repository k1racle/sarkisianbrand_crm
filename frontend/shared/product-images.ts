// Legacy demo paths did not have files. Map only photos actually bundled with the site.
const legacyPhotos: Record<string, string> = {
  '/catalog/gel-muss-prozrachnyi-15-gr.jpg': '/storefront/products/gel-mousse-clear.jpg',
  '/catalog/freza-almaznaya-shar-40-mm.jpg': '/storefront/products/cutter-ball.jpg',
  '/catalog/gel-muss-kamufliruyushchiy-23.jpg': '/storefront/products/gel-mousse-23.jpg',
  '/catalog/gel-skorostnoy-002-30-ml.jpg': '/storefront/products/speed-gel-002.jpg',
};
export function normalizeMediaImageUrl(value: unknown, apiBase: string, siteUrl = 'http://localhost:3001'): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || /[\x00-\x20\\]/.test(raw) || !/^(?:\/(?!\/)|https?:\/\/)/i.test(raw)) return '';
  try {
    if (/^\/api(?:\/|$)/.test(raw)) return new URL(raw, new URL(apiBase, siteUrl).origin).href;
    if (raw.startsWith('/')) return raw;
    const parsed = new URL(raw);
    return parsed.username || parsed.password ? '' : parsed.href;
  } catch { return ''; }
}
export function resolveProductImageUrl(value: unknown, apiBase: string, siteUrl?: string): string {
  const normalized = normalizeMediaImageUrl(value, apiBase, siteUrl);
  return normalized.startsWith('/catalog/') ? legacyPhotos[normalized] || '' : normalized;
}
