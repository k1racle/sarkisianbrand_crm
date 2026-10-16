/* Real catalog reads; cart writes and edge-case products stay inside the browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const api = process.env.API_URL || 'http://localhost:3000/api/v1';
const output = process.env.OUTPUT || path.join(__dirname, '../.screenshots/product-design');
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const get = async suffix => { const r = await fetch(api + suffix); assert(r.ok, suffix); return r.json(); };

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const products = await get('/products?limit=24');
  const product = products.items.find(p => p.productType !== 'GIFT_CARD' && p.variants.some(v => Number(v.stock) > Number(v.reserved || 0)));
  assert(product, 'A real, available physical product is required');
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1512, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = [], hydration = [], writes = [];
  let mockProduct = null, failCart = false, cart = { items: [], total: 0 };
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.slice(7);
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (endpoint === '/cart/items' && req.method() === 'POST') {
      const body = req.postDataJSON(); writes.push(body);
      if (failCart) return route.fulfill({ status: 409, headers, json: { message: 'Товар закончился' } });
      const selected = mockProduct || product;
      const variant = selected.variants.find(v => v.id === body.variantId);
      assert(variant, 'Purchase uses the selected variant');
      cart = { items: [{ id: 'isolated-cart-line', quantity: body.quantity, variant: { ...variant, product: selected }, price: variant.price }], total: Number(variant.price) * body.quantity };
      return route.fulfill({ headers, json: cart });
    }
    assert.equal(req.method(), 'GET', 'Unexpected live write: ' + endpoint);
    if (endpoint === '/cart') return route.fulfill({ headers, json: cart });
    if (endpoint === '/storefront/favorites') return route.fulfill({ headers, json: [] });
    if (endpoint === '/products/' + product.slug && mockProduct) return route.fulfill({ headers, json: mockProduct });
    const response = await fetch(api + endpoint + url.search);
    return route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (/hydration.*mismatch/i.test(msg.text())) hydration.push(msg.text()); });
  const ready = async () => {
    await page.locator('#product-heading').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.sp-page img,.sh-footer img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
  };
  const fromCatalog = async () => {
    await page.goto(base + '/catalog', { waitUntil: 'networkidle' });
    await page.locator('.sc-product-link').filter({ has: page.locator('h3', { hasText: product.nameRu }) }).first().click();
    await ready();
  };
  try {
    await fromCatalog();
    assert.equal(await page.locator('#product-heading').textContent(), product.nameRu);
    const canonicalPath = new URL(page.url()).pathname;
    const response = await page.reload({ waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, 'Direct product URL renders on the server');
    await ready();
    assert.equal(new URL(await page.locator('link[rel=canonical]').getAttribute('href')).pathname, canonicalPath);
    assert.equal(await page.locator('.sb-product-editorial .sh-footer').count(), 1);
    assert.equal(await page.locator('.sp-masthead button').count(), 0, 'No duplicate account/cart shortcuts above the product');
    assert(await page.locator('.sp-main-image').evaluate(img => img.naturalWidth > 0), 'Actual product photo loads');
    for (const width of [1512, 1024, 768, 760, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const layout = await page.evaluate(() => {
        const bounds = el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, right: b.right, bottom: b.bottom }; };
        const cards = [...document.querySelectorAll('.sp-related-grid .sc-product')].map(bounds);
        const overlapping = cards.some((a, i) => cards.slice(i + 1).some(b => a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1));
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, overlapping,
          offscreen: [...document.querySelectorAll('.sp-info button,.sp-info select,.sc-product')].some(el => { const b = bounds(el); return b.x < -1 || b.right > innerWidth + 1; }),
          background: getComputedStyle(document.querySelector('.sb-product-editorial')).backgroundColor };
      });
      assert.deepEqual(layout, { overflow: false, overlapping: false, offscreen: false, background: 'rgb(53, 53, 53)' }, 'Layout at ' + width);
      if ([1512, 390, 320].includes(width)) {
        await page.screenshot({ path: path.join(output, 'product-' + width + '.png'), fullPage: true });
        await page.screenshot({ path: path.join(output, 'product-' + width + '-viewport.png') });
      }
      console.log(width + ': layout and recommendations PASS');
    }
    await page.setViewportSize({ width: 1512, height: 1000 });
    await page.locator('.sp-favorite').click();
    assert.equal(await page.locator('.sp-favorite').getAttribute('aria-pressed'), 'true');
    await page.reload({ waitUntil: 'networkidle' }); await ready();
    assert.equal(await page.locator('.sp-favorite').getAttribute('aria-pressed'), 'true');
    await page.locator('.sp-favorite').click();
    await page.locator('.sp-details summary').nth(1).click();
    assert(await page.locator('.sp-details dl').isVisible());
    await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click();
    await page.locator('.sp-add').click();
    await page.locator('.sp-add').filter({ hasText: 'Добавлено' }).waitFor();
    assert.equal(writes.at(-1).quantity, 2);
    assert.equal(await page.locator('.sh-dock .sb-cart-badge').textContent(), '2');
    failCart = true;
    await page.locator('.sp-add').click();
    await page.getByRole('alert').filter({ hasText: 'Товар закончился' }).waitFor();
    failCart = false;

    mockProduct = { ...product, images: [
      { url: '/storefront/products/gel-mousse-clear.jpg', sortOrder: 0 },
      { url: '/storefront/products/gel-mousse-23.jpg', sortOrder: 1 },
      { url: '/storefront/products/missing-smoke-photo.jpg', sortOrder: 2 },
    ], variants: [
      { ...product.variants[0], id: 'out-of-stock', name: '15 мл', stock: 0, reserved: 0 },
      { ...product.variants[0], id: 'selected-variant', name: '30 мл', price: '1840', salePrice: '1500', saleStartsAt: null, saleEndsAt: null, stock: 3, reserved: 1, options: { volume: '30 мл' } },
      { ...product.variants[0], id: 'inactive', name: 'Скрытый', isActive: false },
    ] };
    await fromCatalog();
    const select = page.locator('.sp-variant select');
    assert.equal(await select.locator('option').count(), 2, 'Inactive variants are hidden');
    assert.equal(await select.inputValue(), 'selected-variant', 'Available variant is selected');
    await select.selectOption('out-of-stock'); assert(await page.locator('.sp-add').isDisabled());
    await select.selectOption('selected-variant');
    assert.match(await page.locator('.sp-price strong').innerText(), /1\s*500/);
    assert.match(await page.locator('.sp-price del').innerText(), /1\s*840/);
    await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click();
    assert(await page.getByRole('button', { name: 'Увеличить количество', exact: true }).isDisabled(), 'Reserved stock is respected');
    await page.locator('.sp-add').click(); await page.locator('.sp-add').filter({ hasText: 'Добавлено' }).waitFor();
    assert.deepEqual(writes.at(-1), { variantId: 'selected-variant', quantity: 2 });
    await select.selectOption('out-of-stock');
    assert.equal(await page.locator('.sp-buy .sb-quantity b').textContent(), '1', 'Quantity resets with variant');
    await page.getByRole('button', { name: 'Фотография 2', exact: true }).click();
    assert.match(await page.locator('.sp-main-image').getAttribute('src'), /gel-mousse-23/);
    await page.getByRole('button', { name: 'Фотография 3', exact: true }).click();
    assert(await page.locator('.sp-placeholder').isVisible(), 'Broken image gets a designed placeholder');
    await page.getByRole('button', { name: 'Фотография 1', exact: true }).click();
    assert(await page.locator('.sp-main-image').isVisible());

    mockProduct = { ...product, productType: 'GIFT_CARD', slug: product.slug, nameRu: 'Электронная подарочная карта', images: [], categories: product.categories.map(r => ({ ...r, category: { ...r.category, imageUrl: null } })), giftCardValidityDays: 365,
      variants: [{ ...product.variants[0], id: 'gift-3000', name: '3 000 ₽', price: 3000, salePrice: null, stock: 0, reserved: 0 },
        { ...product.variants[0], id: 'gift-5000', name: '5 000 ₽', price: 5000, salePrice: null, stock: 0, reserved: 0 }] };
    await fromCatalog();
    assert(await page.locator('.sp-add').isEnabled(), 'Gift cards work with zero physical stock');
    assert.equal(await page.locator('.sp-assurances').count(), 0);
    assert.match(await page.locator('.sp-gift-note').textContent(), /365/);
    await page.locator('.sp-variant select').selectOption('gift-5000');
    await page.locator('.sp-add').click(); await page.locator('.sp-add').filter({ hasText: 'Добавлено' }).waitFor();
    assert.deepEqual(writes.at(-1), { variantId: 'gift-5000', quantity: 1 });
    assert.deepEqual(errors, [], 'No JavaScript errors');
    assert.deepEqual(hydration, [], 'No hydration mismatches');
    console.log('Direct URL, photos, favorites, details, cart success/error, variant prices, reserved stock, gallery fallback, gift cards PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
