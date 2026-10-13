/* Browser check for cart/auth drawers. All cart and account mutations are mocked.
 * Docker: NODE_PATH=/checks/node_modules STOREFRONT_URL=http://frontend:3000
 * Uses the existing sarkisian-site-smoke image and the local application network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const api = process.env.API_URL || 'http://backend:3000/api/v1';
const output = process.env.OUTPUT || path.join(__dirname, '../.screenshots/drawers');
fs.mkdirSync(output, { recursive: true });

const products = Array.from({ length: 7 }, (_, index) => ({
  id: `drawer-product-${index}`, slug: `drawer-product-${index}`,
  nameRu: index === 0 ? 'Гель-мусс конструирующий камуфлирующий № 23' : `Гель-мусс камуфлирующий № ${index + 23}`,
  currency: 'RUB', isActive: true, categories: [],
  images: [{ url: '/storefront/products/gel-mousse-23.jpg', sortOrder: 0 }],
  variants: [15, 30].map((size, variant) => ({ id: `drawer-variant-${index}-${variant}`, name: `${size} гр`, sku: `DRAWER-${index}-${size}`, price: variant ? 1200 : 780, stock: 8, reserved: 0, isActive: true })),
}));

async function setup(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  let items = [{ id: 'drawer-item-0', quantity: 1, variant: { ...products[0].variants[0], product: products[0] } }];
  const state = { failCart: false, failRecommendations: false, failLogin: true, cartWrites: 0, resetRequests: 0, registrations: 0, unexpected: [] };
  const cart = () => ({ items, total: items.reduce((sum, item) => sum + item.quantity * item.variant.price, 0) });
  const headers = { 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
  const session = { accessToken: 'drawer-test-token', refreshToken: 'drawer-test-refresh', user: { id: 'drawer-test-user', role: 'CUSTOMER_B2C', email: 'drawer@example.test', firstName: 'Анна' } };
  await context.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.slice('/api/v1'.length), method = request.method();
    const reply = (json, status = 200) => route.fulfill({ status, headers, json });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (endpoint === '/cart') return reply(cart());
    if (endpoint === '/products/recommendations/cart') return state.failRecommendations ? reply({ message: 'Recommendations unavailable' }, 503) : reply({ items: products.filter(p => !(url.searchParams.get('exclude') || '').split(',').includes(p.id)) });
    if (endpoint.startsWith('/cart/items')) {
      state.cartWrites++;
      if (state.failCart) return reply({ message: 'Не удалось обновить корзину. Попробуйте ещё раз.' }, 409);
      if (method === 'PATCH') {
        const item = items.find(i => i.id === endpoint.split('/').pop());
        const quantity = request.postDataJSON().quantity;
        assert.ok(quantity >= 1 && quantity <= item.variant.stock);
        item.quantity = quantity;
      } else if (method === 'DELETE') items = items.filter(i => i.id !== endpoint.split('/').pop());
      else if (method === 'POST') {
        const { variantId, quantity } = request.postDataJSON();
        const product = products.find(p => p.variants.some(v => v.id === variantId));
        assert.ok(product, 'Recommendation uses its own variant');
        items.push({ id: `drawer-item-${variantId}`, quantity, variant: { ...product.variants.find(v => v.id === variantId), product } });
      }
      return reply(cart());
    }
    if (endpoint === '/auth/login') return state.failLogin ? reply({ message: 'Неверный email или пароль' }, 401) : reply(session);
    if (endpoint === '/auth/register') { state.registrations++; assert.equal(request.postDataJSON().firstName, 'Анна'); return reply(session); }
    if (endpoint === '/auth/password-reset/request') { state.resetRequests++; assert.equal(request.postDataJSON().email, 'drawer@example.test'); return reply({ message: 'Ссылка для восстановления отправлена.' }); }
    if (endpoint.startsWith('/auth/social/')) return reply({ message: 'Социальный вход временно недоступен.' }, 503);
    if (endpoint === '/auth/me') return reply(session.user);
    if (endpoint === '/storefront/cart/bind') return reply(cart());
    if (endpoint === '/storefront/favorites') return reply([]);
    if (endpoint.startsWith('/storefront/favorites/')) return reply({});
    if (!['GET', 'HEAD'].includes(method)) { state.unexpected.push(`${method} ${endpoint}`); return reply({ message: 'Unexpected mutation' }, 405); }
    const response = await fetch(api + endpoint + url.search);
    return route.fulfill({ status: response.status, headers: { ...headers, 'content-type': response.headers.get('content-type') || 'application/json' }, body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.setDefaultTimeout(15000);
  await page.goto(base, { waitUntil: 'networkidle' });
  return { context, page, state, errors };
}
async function visual(page, width, state) {
  const panel = page.locator('.sd-drawer');
  await page.mouse.move(1, 1);
  await panel.evaluate(el => { el.scrollTop = 0; });
  await panel.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode().catch(() => {}))));
  const audit = await panel.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, background: getComputedStyle(el).backgroundColor, brokenImages: [...el.querySelectorAll('img')].filter(img => !img.complete || !img.naturalWidth).map(img => img.src) }));
  assert.ok(audit.scrollWidth <= audit.width + 1, `${width} ${state}: panel fits horizontally`);
  assert.equal(audit.background, 'rgb(53, 53, 53)');
  assert.deepEqual(audit.brokenImages, [], 'Product/provider assets load');
  const buttons = await panel.locator('.sb-liquid-primary').evaluateAll(items => items.map(el => { const css = getComputedStyle(el); return { text: el.textContent.trim(), background: css.backgroundColor, color: css.color, radius: parseFloat(css.borderRadius), border: css.borderTopWidth }; }));
  for (const button of buttons) {
    assert.ok(button.text.length, 'Action has a visible label');
    assert.equal(button.background, 'rgba(0, 0, 0, 0)', `${state}: outlined action has no white fill`);
    assert.equal(button.color, 'rgb(255, 255, 255)', `${state}: action label is white`);
    assert.ok(button.radius >= 24, `${state}: pill-shaped action`);
    assert.equal(button.border, '1px', `${state}: thin outline`);
  }
  await assertRestingFills(panel.locator('.sb-liquid-primary,.sb-social-buttons button,.sb-drawer-tabs button'), state);
  await panel.screenshot({ path: path.join(output, `${width}-${state}.png`) });
}
async function assertRestingFills(locator, state) {
  const restingFills = await locator.evaluateAll(items => items.map(el => {
    const css = getComputedStyle(el, '::before'), matrix = new DOMMatrix(css.transform);
    const [ox, oy] = css.transformOrigin.split(' ').map(parseFloat), w = parseFloat(css.width), h = parseFloat(css.height);
    const top = Math.min(...[[0,0],[w,0],[0,h],[w,h]].map(([x,y]) => parseFloat(css.top) + oy + matrix.b * (x - ox) + matrix.d * (y - oy) + matrix.f));
    return { label: el.textContent.trim(), top, bottom: el.clientHeight };
  }));
  for (const fill of restingFills) assert.ok(fill.top >= fill.bottom, `${state}: hidden fill stays completely below ${fill.label}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const width of (process.env.WIDTHS || '1512,950,768,390,320').split(',').map(Number)) {
      const { context, page, state, errors } = await setup(browser, width, width > 950 ? 1500 : width < 600 ? 844 : 1367);
      const openCart = () => page.locator('.sh-dock').getByRole('button', { name: 'Корзина', exact: true }).click();
      const openAuth = () => page.locator('.sh-dock').getByRole('button', { name: 'Личный кабинет', exact: true }).click();
      await assertRestingFills(page.locator('.sh-pill,.sh-product-buy'), `${width} homepage`);
      await openCart();
      await page.locator('.sd-recommendations-grid .sd-suggestion').last().waitFor();
      await page.locator('.sd-suggestion img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
      assert.equal(await page.locator('.sd-cart-heading > span').textContent(), '1 товар');
      await visual(page, width, 'cart');
      if (width === 1512) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const checkout = page.locator('.sd-cart-footer .sb-liquid-primary');
        await checkout.scrollIntoViewIfNeeded();
        const before = await checkout.boundingBox();
        await checkout.hover();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.sd-cart-footer .sb-liquid-primary'), '::before').transform === 'matrix(1, 0, 0, 1, 0, 0)');
        assert.equal(await checkout.evaluate(el => getComputedStyle(el).color), 'rgb(53, 53, 53)', 'Filled button keeps a contrasting label');
        assert.equal(await checkout.evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 240, 219)', 'Fill matches homepage');
        const after = await checkout.boundingBox();
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before[key] - after[key]) < 1, 'Hover does not move the button');
        await checkout.screenshot({ path: path.join(output, 'checkout-hover.png') });
        await page.mouse.move(1, 1);
        await page.emulateMedia({ reducedMotion: 'reduce' });
      }
      await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.sd-cart-heading > span').textContent === '2 товара');
      assert.match(await page.locator('.sd-cart-total').textContent(), /1\s*560/);
      state.failCart = true;
      await page.getByRole('button', { name: 'Уменьшить количество', exact: true }).click();
      await page.locator('.sb-cart-drawer [role=alert]').waitFor();
      assert.equal(await page.locator('.sd-cart-heading > span').textContent(), '2 товара');
      state.failCart = false;
      await page.getByRole('button', { name: 'Уменьшить количество', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.sd-cart-heading > span').textContent === '1 товар');
      assert.equal(await page.locator('.sd-suggestion-featured,.sd-suggestion-add').count(), 0, 'No separate upsell block');
      await page.locator('.sd-recommendations-grid .sd-suggestion-favorite').first().click();
      assert.equal(await page.locator('.sd-recommendations-grid .sd-suggestion-favorite').first().getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.sd-cart-footer a').getAttribute('href'), '/cart');
      await page.locator('.sd-remove').first().click();
      await page.waitForFunction(() => document.querySelectorAll('.sd-cart-item').length === 0);
      await page.getByRole('heading', { name: 'Здесь пока пусто' }).waitFor();
      await visual(page, width, 'empty-cart');
      await page.keyboard.press('Escape');
      await page.locator('.sd-drawer').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      assert.equal(await page.locator('.sh-dock').getByRole('button', { name: 'Корзина', exact: true }).evaluate(el => el === document.activeElement), true);

      await openAuth();
      await page.locator('.sb-auth-drawer').waitFor();
      await visual(page, width, 'login');
      await page.locator('.sb-auth-drawer input[type=email]').fill('drawer@example.test');
      await page.locator('.sb-auth-drawer input[type=password]').fill('test-password-123');
      await page.getByRole('button', { name: 'Показать пароль', exact: true }).click();
      assert.equal(await page.locator('input[autocomplete=current-password]').getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Войти', exact: true }).click();
      await page.getByRole('alert').getByText('Неверный email или пароль').waitFor();
      await page.getByRole('button', { name: 'Забыли пароль?', exact: true }).click();
      await page.getByRole('button', { name: 'Отправить ссылку', exact: true }).click();
      await page.getByRole('status').getByText('Ссылка для восстановления отправлена.').waitFor();
      assert.equal(state.resetRequests, 1);
      await visual(page, width, 'reset');
      await page.locator('.sd-toolbar').getByRole('button', { name: 'Вернуться ко входу', exact: true }).click();
      await page.getByRole('button', { name: 'VK ID', exact: true }).click();
      await page.getByText('Социальный вход временно недоступен.').waitFor();
      await page.getByRole('button', { name: 'Регистрация', exact: true }).click();
      await visual(page, width, 'register');
      await page.locator('input[autocomplete=given-name]').fill('Анна');
      await page.locator('input[autocomplete=new-password]').fill('test-password-123');
      const submit = page.getByRole('button', { name: 'Создать аккаунт', exact: true });
      await submit.click();
      assert.equal(state.registrations, 0, 'Consent remains required');
      await page.locator('.sb-auth-consent input').check();
      await submit.click();
      await page.locator('.sb-auth-drawer').waitFor({ state: 'hidden' });
      assert.equal(state.registrations, 1);
      assert.deepEqual(state.unexpected, []);
      assert.deepEqual(errors, []);
      console.log(`${width}: responsive cart/auth, outlined buttons, quantity, failure recovery, recommendations, favorites, empty state, Escape/focus, login errors, reset, social errors, registration PASS`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
