/* Read-only local public pages/API; no credentials or external integrations. */
const { test, expect } = require('@playwright/test');
const { stripTypeScriptTypes } = require('node:module');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const source = stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname, '../../shared/catalog-paths.ts'), 'utf8')).replaceAll('export function', 'function');
const { catalogProductPath } = vm.runInNewContext(source + '\n({catalogProductPath})');

test('Every published product opens under its real catalog/category path', async ({ browser, request }, testInfo) => {
  test.setTimeout(120000);
  const response = await request.get('http://localhost:3000/api/v1/products?limit=100');
  expect(response.ok()).toBe(true);
  const { items } = await response.json();
  expect(items.length).toBeGreaterThan(0);
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
  const writes = [], external = [], errors = [];
  await context.route('**/*', route => {
    const r = route.request(), url = new URL(r.url());
    if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) { writes.push(url.pathname); return route.abort(); }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) { external.push(url.origin); return route.abort(); }
    if (url.pathname.startsWith('/api/v1/') && !url.pathname.startsWith('/api/v1/products') && !url.pathname.startsWith('/api/v1/seo')) return route.fulfill({ status: 403, json: {} });
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  try {
    for (const product of items) {
      const url = catalogProductPath(product);
      const document = await page.goto('http://localhost:3001' + url);
      expect(document.status(), url).toBe(200);
      await expect(page.locator('.sb-product-info h1')).toHaveText(product.nameRu);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'http://localhost:3001' + url);
      expect(await page.locator('.sb-breadcrumbs').getByRole('link', { name: 'Каталог', exact: true }).count()).toBe(1);
    }
    const categoryResponse = await page.goto('http://localhost:3001/catalog/gels');
    expect(categoryResponse.status()).toBe(200);
    await expect(page.locator('.sb-catalog-title h1')).toHaveText('Гели');
    const link = page.locator('.sb-product-card__visual').first();
    await expect(link).toHaveAttribute('href', /^\/catalog\/gels\/[^/]+$/);
    await link.click(); await expect(page.locator('.sb-product-info h1')).toBeVisible();
    const bad = await page.goto('http://localhost:3001/catalog/instruments/gel-muss-prozrachnyi-15-gr');
    expect(bad.status()).toBe(404);
    await testInfo.attach('catalog-product-count', { body: Buffer.from(String(items.length)), contentType: 'text/plain' });
    expect(writes).toEqual([]); expect(external).toEqual([]); expect(errors).toEqual([]);
  } finally { await context.close(); }
});
