/* Synthetic cart/recommendations only; every API call is intercepted. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const origin = new URL(process.env.STOREFRONT_URL || 'http://127.0.0.1:3001').origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const output = path.join(__dirname, '..', '.screenshots', 'compact-product-card');
const product = { id: 'fixture-recommendation', slug: 'fixture-gel', nameRu: 'Гель скоростной № 011, 30 мл', basePrice: 1440, currency: 'RUB', images: [{ url: '/storefront/categories/gels.jpg', sortOrder: 0 }], categories: [], variants: [{ id: 'fixture-recommended-variant', sku: 'FIX-GEL', price: 1440, stock: 5, reserved: 0, name: '30 мл', isActive: true }] };
const unavailable = { ...product, id: 'fixture-unavailable', slug: 'fixture-unavailable', nameRu: 'Нет в наличии', variants: [{ ...product.variants[0], id: 'fixture-unavailable-variant', stock: 0 }] };
const gift = { ...product, id: 'fixture-gift', slug: 'fixture-gift', nameRu: 'Подарочная карта', productType: 'GIFT_CARD', variants: [{ ...product.variants[0], id: 'fixture-gift-variant', stock: 0 }] };
const recommendations = [product, unavailable, gift, ...Array.from({ length: 5 }, (_, index) => ({ ...product, id: `fixture-extra-${index}`, slug: `fixture-extra-${index}` }))];
const cart = { items: [{ id: 'fixture-item', quantity: 1, variantId: 'fixture-cart-variant', variant: { id: 'fixture-cart-variant', sku: 'FIX-CART', price: 500, stock: 5, name: '30 мл', product: { ...product, id: 'fixture-cart-product' } } }], total: 500 };

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 760, hasTouch: width < 760 });
      const page = await context.newPage();
      const errors = [], writes = [], blocked = [];
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.pathname.startsWith('/api/v1/')) {
          const endpoint = url.pathname.slice('/api/v1'.length);
          const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type,x-cart-session,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
          const reply = (json, status = 200) => route.fulfill({ status, headers, json });
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (endpoint === '/cart/items' && request.method() === 'POST') { writes.push(request.postDataJSON()); return reply(cart); }
          if (endpoint === '/orders/quote' && request.method() === 'POST') return reply({ subtotal: 500, discount: 0, bonusAmount: 0, giftCardAmount: 0, total: 500, currency: 'RUB', shippingAmount: null, deliveryConfirmed: false, canPay: false, messages: [] });
          if (request.method() !== 'GET') { blocked.push(`${request.method()} ${endpoint}`); return route.fulfill({ status: 403, headers, json: {} }); }
          if (endpoint === '/cart') return reply(cart);
          if (endpoint === '/products/categories') return reply([]);
          if (endpoint === '/products/fixture-gel') return reply(product);
          if (endpoint === '/products/fixture-gift') return reply(gift);
          if (endpoint === '/products/recommendations/cart') return reply({ items: recommendations });
          if (endpoint === '/products/storefront-content') return reply({ settings: {}, categories: [], banners: [], socialLinks: [], menuItems: [] });
          if (endpoint === '/shipping/capabilities') return reply({ providers: [] });
          if (endpoint === '/payments/providers') return reply({ providers: [] });
          return reply({});
        }
        if (url.origin !== origin) { blocked.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort(); }
        return route.continue();
      });
      await page.goto(`${origin}/cart`, { waitUntil: 'domcontentloaded' });
      const card = page.locator('.sb-cart-recommendations .sb-product-card').first();
      await card.waitFor({ state: 'visible', timeout: 30000 });
      assert.equal(await card.locator('a button,button a').count(), 0, 'Interactive controls must never be nested');
      const link = card.locator('.sb-product-card__visual'), favorite = card.locator('.sb-favorite');
      assert.equal(await link.getAttribute('aria-label'), 'Подробнее: ' + product.nameRu);
      const href = await link.getAttribute('href');
      assert.ok(href && href.includes('fixture-gel'), 'Image remains a real product link');
      assert.equal(await favorite.getAttribute('aria-pressed'), 'false');
      await favorite.focus();
      assert.equal(await favorite.evaluate(element => document.activeElement === element), true, 'Favorite receives keyboard focus');
      await page.keyboard.press('Enter');
      assert.equal(await favorite.getAttribute('aria-pressed'), 'true');
      assert.equal(new URL(page.url()).pathname, '/cart', 'Favorite does not navigate');
      const add = card.locator(width > 760 ? '.sb-card-add-overlay' : '.sb-card-add-mobile');
      if (width > 760) await card.locator('.sb-product-card__frame').hover();
      await add.focus();
      assert.equal(await add.evaluate(element => document.activeElement === element), true, 'Cart button receives keyboard focus');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('.sb-cart-recommendations .sb-product-card [role="status"]')?.textContent?.includes('Добавлено'));
      assert.equal(writes.length, 1); assert.deepEqual(writes[0], { variantId: 'fixture-recommended-variant', quantity: 1 });
      assert.equal(new URL(page.url()).pathname, '/cart', 'Adding to cart does not navigate');
      const unavailableCard = page.locator('.sb-cart-recommendations .sb-product-card').nth(1);
      assert.equal(await unavailableCard.locator(width > 760 ? '.sb-card-add-overlay' : '.sb-card-add-mobile').isDisabled(), true, 'Unavailable products cannot be added');
      const dimensions = await card.evaluate(element => { const rect = element.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2 }; });
      assert.ok(dimensions.left >= -1 && dimensions.right <= dimensions.width + 1 && !dimensions.overflow, 'Card fits the viewport');
      await card.screenshot({ path: path.join(output, `${width}.png`) });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.ok(await link.evaluate(element => getComputedStyle(element).transitionDuration.split(',').every(value => parseFloat(value) <= .001)), 'Reduced motion removes frame transition');
      await context.route(`${origin}${href}`, route => route.fulfill({ contentType: 'text/html', body: '<main>Тестовая карточка товара</main>' }));
      await link.focus(); await page.keyboard.press('Enter');
      await page.waitForURL(url => url.pathname === href);
      await page.locator('#product-heading').waitFor({ timeout: 30000 });
      assert.equal((await page.locator('#product-heading').textContent()).trim(), product.nameRu);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      const giftCard = page.locator('.sb-cart-recommendations .sb-product-card').nth(2);
      await giftCard.waitFor({ state: 'visible', timeout: 30000 });
      const giftHref = await giftCard.locator('.sb-product-card__visual').getAttribute('href');
      await context.route(`${origin}${giftHref}`, route => route.fulfill({ contentType: 'text/html', body: '<main>Тестовая подарочная карта</main>' }));
      const giftButton = giftCard.locator(width > 760 ? '.sb-card-add-overlay' : '.sb-card-add-mobile');
      await giftButton.scrollIntoViewIfNeeded();
      if (width > 760) await giftCard.locator('.sb-product-card__frame').hover();
      await giftButton.click();
      await page.waitForURL(url => url.pathname === giftHref);
      await page.locator('#product-heading').waitFor({ timeout: 30000 });
      assert.equal((await page.locator('#product-heading').textContent()).trim(), gift.nameRu);
      assert.equal(writes.length, 1, 'Gift card opens its page without adding a physical product');
      assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
      await context.close();
      console.log(`${width}px: keyboard, separate controls, cart, favorite and product navigation PASS`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
