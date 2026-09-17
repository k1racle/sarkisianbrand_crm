/* Public local catalogue navigation only. Private calls and all writes blocked. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const site = 'http://localhost:3001';
const api = 'http://localhost:3000/api/v1';

async function read(endpoint) {
  const response = await fetch(api + endpoint);
  assert.equal(response.status, 200, endpoint);
  return response.json();
}
async function main() {
  const categories = await read('/products/categories');
  assert(categories.length > 0);
  const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{}), headless: true });
  const checks = [];
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block' });
      const errors = [], mutations = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { mutations.push(url.pathname); return route.fulfill({ status: 501, json: { message: 'Read only' } }); }
        if (url.pathname.startsWith('/api/v1/')) {
          if (['/api/v1/products', '/api/v1/products/categories', '/api/v1/products/filters', '/api/v1/products/storefront-content'].includes(url.pathname)) return route.continue();
          if (url.pathname === '/api/v1/cart') return route.fulfill({ json: { items: [], total: 0 } });
          if (url.pathname === '/api/v1/storefront/favorites') return route.fulfill({ json: [] });
          return route.fulfill({ status: 401, json: { message: 'No private API reads' } });
        }
        if (url.origin !== site) return route.abort('blockedbyclient');
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(site + '/', { waitUntil: 'networkidle' });
      await page.locator(width > 760 ? '.sb-header' : '.sb-mobile-nav').getByRole('button', { name: 'Каталог', exact: true }).click();
      await page.locator('.sb-catalog-drawer').waitFor();
      const links = await page.locator('.sb-catalog-menu a').evaluateAll(elements => elements.map(element => ({ text: element.textContent.trim(), href: element.getAttribute('href') })));
      assert(links.length > 0);
      for (const link of links) {
        const url = new URL(link.href, site);
        assert.equal(url.pathname, '/catalog');
        assert(!url.searchParams.has('search'), 'category menu must not perform name searches');
        assert(categories.some(category => category.slug === url.searchParams.get('category')), JSON.stringify(link));
      }
      for (const category of categories) assert(links.some(link => new URL(link.href, site).searchParams.get('category') === category.slug), category.slug);
      for (const category of categories) {
        const url = site + links.find(link => new URL(link.href, site).searchParams.get('category') === category.slug).href;
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200, category.slug);
        const expected = await read('/products?' + new URLSearchParams({ category: category.slug, limit: 24 }));
        if (expected.items.length) {
          await page.locator('.sb-product-grid.is-catalog').waitFor();
          const paths = await page.locator('.sb-product-grid.is-catalog .sb-product-card__visual').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
          assert.equal(paths.length, expected.items.length, category.slug);
          assert(paths.every(path => expected.items.some(product => path === '/products/' + product.slug)), category.slug);
        } else await page.getByRole('heading', { name: 'Товары не найдены' }).waitFor();
      }
      await page.goto(site + '/catalog?search=' + encodeURIComponent('нов'), { waitUntil: 'networkidle' });
      await page.waitForURL(url => !url.searchParams.has('search') && url.searchParams.get('sort') === 'new');
      await page.locator('.sb-product-grid.is-catalog').waitFor();
      await page.goto(site + '/catalog?sort=popular', { waitUntil: 'networkidle' });
      await page.locator('.sb-product-grid.is-catalog').waitFor();
      if (width < 761) await page.getByRole('button', { name: 'Фильтры и сортировка', exact: true }).click();
      assert.equal(await page.locator(width < 761 ? '.sb-catalog-filter-drawer' : '.sb-filters--catalog').getByLabel('Сортировка', { exact: true }).inputValue(), 'popular');
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      checks.push({ width, passed: true, categoryCount: categories.length, realSlugLinks: true, legacyNewArrivalsRedirect: true, popularSortPreserved: true });
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ checks, actualPrivateReads: 0, actualMutations: 0, actualProviderCalls: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
