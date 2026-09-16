/* Actual local page and public catalogue reads; no cart/order/payment mutation. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const path = require('node:path');
const fs = require('node:fs');
const site = 'http://localhost:3001';
const api = 'http://localhost:3000/api/v1';
const output = path.resolve(__dirname, '../.screenshots/gift-page-local');

async function main() {
  const responses = await Promise.all(['/products/gift-card', '/products?limit=24', '/products/storefront-content'].map(async endpoint => {
    const response = await fetch(api + endpoint);
    assert.equal(response.status, 200, endpoint);
    return response.json();
  }));
  const [product, catalog, content] = responses;
  assert.equal(product.productType, 'GIFT_CARD');
  assert.equal(product.isActive, true);
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const checks = [];
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block' });
      const errors = [], blockedMutations = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          blockedMutations.push(url.pathname);
          return route.fulfill({ status: 501, json: { message: 'Read-only check' } });
        }
        if (url.pathname.startsWith('/api/v1/')) {
          const endpoint = url.pathname.slice('/api/v1'.length);
          if (endpoint === '/products/gift-card') return route.fulfill({ json: product });
          if (endpoint === '/products') return route.fulfill({ json: catalog });
          if (endpoint === '/products/storefront-content') return route.fulfill({ json: content });
          if (endpoint === '/cart') return route.fulfill({ json: { items: [], total: 0 } });
          if (endpoint === '/storefront/favorites') return route.fulfill({ json: [] });
          return route.fulfill({ status: 401, json: { message: 'No private reads' } });
        }
        if (url.origin !== site) return route.abort('blockedbyclient');
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(site + '/products/gift-card', { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await page.getByRole('heading', { name: 'Подарочная карта', exact: true }).waitFor();
      await page.getByLabel('Номинал карты', { exact: false }).selectOption(product.variants.find(variant => Number(variant.price) === 3000).id);
      assert.match(await page.locator('.sb-product-price').innerText(), /3\s*000/);
      assert.equal(await page.locator('.sb-product-buy').getByRole('button', { name: 'В корзину', exact: false }).isEnabled(), true);
      assert(await page.locator('.sb-gift-product-art').isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, width + '.png'), fullPage: true });
      assert.deepEqual(errors, []);
      assert.deepEqual(blockedMutations, []);
      checks.push({ width, passed: true, publicProductPublished: true, denominationSelection: true, cartButtonEnabledWithoutStock: true });
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ checks, actualBrowserApiWrites: 0, actualPrivateReads: 0, actualProviderCalls: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
