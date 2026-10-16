/* Actual catalog reads; cart writes are intercepted in an isolated browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const base = process.env.STOREFRONT_URL || 'http://frontend:3000';
const api = process.env.API_URL || 'http://backend:3000/api/v1';
const output = process.env.OUTPUT || '/output';
const get = async suffix => {
  const response = await fetch(api + suffix);
  assert(response.ok, suffix + ': ' + response.status);
  return response.json();
};
async function check(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 980 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = [], hydration = [], writes = [];
  let cart = { items: [], total: 0 }, failCart = false;
  const initial = await get('/products?limit=12');
  const facets = await get('/products/filters');
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.slice(7);
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (endpoint === '/cart/items' && req.method() === 'POST') {
      const body = req.postDataJSON(); writes.push(body);
      if (failCart) return route.fulfill({ status: 409, headers, json: { message: 'Товар закончился' } });
      const product = initial.items.find(item => item.variants.some(v => v.id === body.variantId));
      assert(product, 'Order uses an actual product variant');
      const variant = product.variants.find(v => v.id === body.variantId);
      cart = { items: [{ id: 'isolated-cart-line', quantity: 1, variant: { ...variant, product }, price: variant.price, total: variant.price }], total: Number(variant.price) };
      return route.fulfill({ headers, json: cart });
    }
    if (req.method() !== 'GET') throw Error('Unexpected live write: ' + endpoint);
    if (endpoint === '/cart') return route.fulfill({ headers, json: cart });
    if (endpoint === '/storefront/favorites') return route.fulfill({ headers, json: [] });
    const response = await fetch(api + endpoint + url.search);
    return route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (/hydration.*mismatch/i.test(msg.text())) hydration.push(msg.text()); });
  const ready = async () => {
    await page.locator('.sc-product').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.sc-page img,.sh-footer img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
  };
  try {
    await page.goto(base + '/catalog', { waitUntil: 'networkidle' });
    await ready();
    assert.deepEqual(await page.locator('.sc-product h3').allTextContents(), initial.items.map(item => item.nameRu));
    assert.equal(await page.locator('.sc-product-placeholder').count(), 0, 'Actual catalog photos restored');
    const layout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.sc-product')].map(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; });
      const overlaps = cards.flatMap((a, i) => cards.slice(i + 1).filter(b => a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1));
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, overlaps: overlaps.length, broken: [...document.querySelectorAll('.sc-page img')].filter(img => !img.naturalWidth).length, footer: document.querySelector('.sh-footer').getBoundingClientRect().top, cardsBottom: Math.max(...cards.map(c => c.bottom)) };
    });
    assert.equal(layout.overflow, false, JSON.stringify(layout));
    assert.equal(layout.overlaps, 0, JSON.stringify(layout));
    assert.equal(layout.broken, 0);
    assert(layout.footer > layout.cardsBottom, 'Footer follows cards');
    await page.screenshot({ path: path.join(output, `catalog-${width}.png`), fullPage: true });

    const favorite = page.locator('.sc-product-favorite').first();
    await favorite.click(); assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
    await page.reload({ waitUntil: 'networkidle' }); await ready();
    assert.equal(await page.locator('.sc-product-favorite').first().getAttribute('aria-pressed'), 'true');
    await page.locator('.sc-product-favorite').first().click();
    await page.locator('.sc-product-actions button').first().click();
    await page.locator('.sc-product-actions button').first().filter({ hasText: 'Добавлено' }).waitFor();
    assert.equal(writes.length, 1);
    failCart = true;
    await page.locator('.sc-product-actions button').nth(1).click();
    await page.locator('.sc-product-error').filter({ hasText: 'Товар закончился' }).waitFor();

    const filters = page.locator('.sc-filters');
    await filters.getByLabel('Цена от', { exact: true }).fill('2000');
    await filters.getByLabel('Цена до', { exact: true }).fill('1000');
    await filters.getByRole('button', { name: 'Применить', exact: true }).click();
    await filters.getByRole('alert').waitFor();
    assert(!new URL(page.url()).searchParams.has('minPrice'));
    await filters.getByRole('button', { name: 'Сбросить', exact: true }).click();
    const volume = facets.volumes[0]; assert(volume, 'Real volume facets');
    await filters.getByLabel('Объём ' + volume, { exact: true }).check();
    assert(!new URL(page.url()).searchParams.has('volume'), 'Filters are staged until Apply');
    await filters.getByRole('button', { name: 'Применить', exact: true }).click();
    await page.waitForURL('**/*volume=' + volume + '*'); await page.waitForLoadState('networkidle'); await ready();
    const filtered = await get('/products?limit=12&volume=' + volume);
    assert.deepEqual(await page.locator('.sc-product h3').allTextContents(), filtered.items.map(item => item.nameRu));
    await page.reload({ waitUntil: 'networkidle' }); await ready();
    assert(await filters.getByLabel('Объём ' + volume, { exact: true }).isChecked());
    await filters.getByRole('button', { name: 'Сбросить', exact: true }).click();
    await page.waitForURL('**/catalog'); await page.waitForLoadState('networkidle'); await ready();
    await filters.getByRole('button', { name: 'Фильтры и сортировка', exact: true }).click();
    await filters.getByLabel('Поиск', { exact: true }).fill('nonexistent-catalog-test-zzz');
    await filters.getByRole('button', { name: 'Применить', exact: true }).click();
    await page.getByRole('heading', { name: 'Товары не найдены' }).waitFor();
    await filters.getByRole('button', { name: 'Сбросить', exact: true }).click();
    await page.waitForLoadState('networkidle'); await ready();

    if (width === 1512) {
      if (initial.pagination.pages > 1) {
        await page.getByRole('button', { name: 'Следующая страница', exact: true }).click();
        await page.waitForURL('**/*page=2*'); await page.waitForLoadState('networkidle'); await ready();
        const next = await get('/products?limit=12&page=2');
        assert.deepEqual(await page.locator('.sc-product h3').allTextContents(), next.items.map(item => item.nameRu));
        await page.goBack({ waitUntil: 'networkidle' }); await ready();
      } else {
        assert.equal(await page.locator('.sc-pagination').count(), 0, 'Single page needs no pagination');
      }
      await filters.getByLabel(facets.categories[0].nameRu, { exact: true }).check();
      await filters.getByRole('button', { name: 'Применить', exact: true }).click();
      await page.waitForURL('**/catalog/' + facets.categories[0].slug); await ready();
      assert.equal(await page.locator('#catalog-heading').textContent(), facets.categories[0].nameRu);
      await page.locator('.sc-product-link').first().click();
      await page.locator('#product-heading').waitFor();
    }
    assert.deepEqual(errors, [], 'No browser errors');
    assert.deepEqual(hydration, [], 'No hydration mismatch');
    console.log(`${width}: real products/photos, layout, filters, reload, favorites, isolated cart success/error PASS`);
  } finally { await context.close(); }
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try { for (const width of (process.env.WIDTHS || '1512,1024,768,390,320').split(',').map(Number)) await check(browser, width); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
