export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  // Use internal API in production; never infer canonical domain from Host.
  const baseURL = String((config as any).seoApiBase || config.public.apiBase);
  let xml: string;
  try {
    xml = await $fetch<string>('/seo/sitemap', { baseURL, responseType: 'text', timeout: 10_000, retry: 0 });
    if (!xml.startsWith('<?xml') || !xml.includes('<urlset')) throw new Error('Invalid sitemap');
  } catch {
    setHeader(event, 'Cache-Control', 'no-store');
    throw createError({ statusCode: 503, statusMessage: 'Sitemap temporarily unavailable' });
  }
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=60, must-revalidate');
  return xml;
});
