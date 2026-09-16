export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const baseURL = String((config as any).seoApiBase || config.public.apiBase);
  let robots: string;
  try {
    robots = await $fetch<string>('/seo/robots', { baseURL, responseType: 'text', timeout: 10_000, retry: 0 });
    if (!robots.startsWith('User-agent: *\n')) throw new Error('Invalid robots');
  } catch {
    // 503 tells crawlers to wait. Never return Allow-all on failure.
    setHeader(event, 'Cache-Control', 'no-store');
    throw createError({ statusCode: 503, statusMessage: 'Robots temporarily unavailable' });
  }
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=60, must-revalidate');
  return robots;
});
