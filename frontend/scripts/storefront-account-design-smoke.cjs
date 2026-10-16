/* Account design and navigation check. Customer data and every write are mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const output = process.env.OUTPUT || path.resolve(__dirname, '../.screenshots/account-design');

async function check(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 980 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const profile = { id: 'design-user', role: 'CUSTOMER_B2C', firstName: 'Анна', lastName: 'Иванова', email: 'anna@example.test', phone: '+79990000000', avatarUrl: null, birthday: '1995-06-15', notificationPreferences: { email: true } };
  const order = { id: 'design-order', orderNumber: 'SB-2026-000123', createdAt: '2026-10-01T12:00:00Z', status: 'NEW', finalAmount: 1560, items: [{ id: 'line', productName: 'Гель-мусс конструирующий камуфлирующий № 23', variantName: '15 гр', quantity: 2, price: 780, total: 1560, variant: { product: { images: [{ url: '/storefront/products/gel-mousse-23.jpg' }] } } }], shippingAddress: { city: 'Москва', street: 'Тверская', house: '10' }, history: [], payments: [] };
  const dashboard = { summary: { orders: 1, spent: 1560 }, orders: [order], addresses: [], giftCards: [], loyalty: { isEligible: true, isEnabled: true, balance: 1250, levelLabel: 'Профи', progress: 40, earnPercent: 3, maxWriteOffPercent: 30, nextLevelLabel: 'Эксперт', toNextLevel: 1750, entries: [{ id: 'entry', amount: 250, reason: 'Бонусы за заказ', createdAt: order.createdAt }] } };
  const errors = [], unexpected = [], writes = [];
  let unavailable = false;
  await context.addCookies([{ name: 'sb-customer-token', value: 'account-design-token', url: base }]);
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), endpoint = new URL(req.url()).pathname.slice(7), method = req.method();
    const headers = { 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
    const reply = (json, status = 200) => route.fulfill({ json, status, headers });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (method === 'GET') {
      if (endpoint === '/auth/me' || endpoint === '/auth/profile') return reply(profile);
      if (endpoint === '/storefront/dashboard') return unavailable ? reply({ message: 'Unavailable' }, 503) : reply(dashboard);
      if (endpoint === '/storefront/addresses') return reply(dashboard.addresses);
      if (endpoint === '/storefront/orders/' + order.orderNumber) return reply(order);
      if (endpoint === '/cart') return reply({ items: [], total: 0 });
      if (endpoint === '/storefront/favorites') return reply([]);
      if (endpoint === '/products/storefront-content') return reply({ settings: {}, categories: [], socialLinks: [], menuItems: [] });
      if (endpoint.startsWith('/products')) return reply({ items: [] });
      if (endpoint.startsWith('/partners/me/')) return reply({ participant: null, settings: { isEnabled: true, termsVersion: 1, termsText: 'Условия тестовой программы', rewardPercent: 5, attributionDays: 30, holdDays: 14 } });
    }
    if (method === 'POST' && endpoint === '/storefront/cart/bind') return reply({ items: [], total: 0 });
    if (method === 'POST' && endpoint === '/auth/logout') return reply({ success: true });
    if (method === 'POST' && endpoint === '/storefront/addresses') { writes.push(endpoint); dashboard.addresses = [{ ...req.postDataJSON(), id: 'saved-address' }]; return reply(dashboard.addresses[0]); }
    unexpected.push(`${method} ${endpoint}`);
    return reply({ message: 'Unexpected mock request' }, 405);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  const nav = page.locator('.sb-account-nav');
  const content = page.locator('.sb-account-content');
  const drawer = page.locator('.sa-drawer');
  const screenshot = async (name, target = page.locator('.sk-account')) => {
    await page.mouse.move(width - 1, 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} ${name}: no page overflow`);
    await target.screenshot({ path: path.join(output, `${width}-${name}.png`) });
  };
  const tab = async name => { await nav.getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(50); };
  const close = async () => { await page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' }); };
  try {
    await page.goto(base + '/account', { waitUntil: 'networkidle' });
    await nav.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('.sh-dock').evaluate(el => getComputedStyle(el).position), 'fixed');
    for (const icon of await page.locator('.sa-summary .sa-panel > svg').all()) {
      const style = await icon.evaluate(el => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, padding: s.padding, width: parseFloat(s.width) }; });
      assert.equal(style.color, 'rgb(255, 255, 255)', 'Summary icons stay white on dark cards');
      assert.equal(style.background, 'rgba(0, 0, 0, 0)', 'No legacy white icon tile');
      assert.equal(style.padding, '0px');
      assert.ok(style.width >= 16);
    }
    await screenshot('overview');
    await tab('Мои заказы');
    await content.locator('.sa-order').click();
    await drawer.getByText('Повторить заказ', { exact: true }).waitFor();
    assert.equal(await drawer.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(53, 53, 53)');
    await screenshot('order', drawer);
    await drawer.getByRole('button', { name: 'Отменить заказ', exact: true }).click();
    await drawer.getByRole('button', { name: 'Оставить заказ', exact: true }).click();
    await close();
    await tab('Подарочные карты');
    await screenshot('empty-gifts');
    await tab('Бонусы');
    await screenshot('loyalty');
    await tab('Адреса');
    await content.getByRole('button', { name: 'Добавить адрес', exact: true }).click();
    await drawer.waitFor();
    await drawer.getByLabel('Название адреса', { exact: true }).fill('Дом');
    await drawer.getByLabel('Город', { exact: true }).fill('Москва');
    await drawer.getByLabel('Улица', { exact: true }).fill('Тверская');
    await drawer.getByLabel('Дом', { exact: true }).fill('10');
    await screenshot('address-editor', drawer);
    await drawer.getByRole('button', { name: 'Сохранить адрес', exact: true }).click();
    await drawer.waitFor({ state: 'hidden' });
    await content.getByText('Адрес сохранён.', { exact: true }).waitFor();
    await screenshot('addresses');
    await tab('Мои данные');
    await screenshot('profile');
    await tab('Уведомления');
    await content.getByRole('checkbox', { name: 'Получать уведомления по электронной почте', exact: true }).waitFor();
    await screenshot('notifications');
    await tab('Пригласить друзей');
    await content.getByRole('button', { name: 'Получить ссылку', exact: true }).waitFor();
    await screenshot('referrals');
    await tab('Блогерам');
    await content.getByLabel('Публичное имя', { exact: true }).waitFor();
    await screenshot('bloggers');
    // Reload preserves the selected section, without making any real account changes.
    await page.reload({ waitUntil: 'networkidle' });
    await content.getByLabel('Публичное имя', { exact: true }).waitFor();
    assert.equal(await nav.getByRole('button', { name: 'Блогерам', exact: true }).getAttribute('aria-current'), 'page');
    unavailable = true;
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.sk-account [role=alert]').waitFor();
    await screenshot('load-error');
    unavailable = false;
    await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
    await nav.waitFor();
    await nav.getByRole('button', { name: 'Выйти', exact: true }).click();
    await page.locator('.sk-entry').waitFor();
    await screenshot('signed-out');
    const login = page.locator('.sk-entry').getByRole('button', { name: 'Войти', exact: true });
    assert.equal(await login.evaluate(el => getComputedStyle(el).color), 'rgb(255, 255, 255)');
    await login.hover();
    assert.equal(await login.evaluate(el => getComputedStyle(el, '::before').transform), 'matrix(1, 0, 0, 1, 0, 0)');
    assert.equal(await login.evaluate(el => getComputedStyle(el).color), 'rgb(52, 52, 51)');
    await login.click();
    await page.locator('.sb-auth-drawer').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.sb-auth-drawer').waitFor({ state: 'hidden' });
    assert.deepEqual(writes, ['/storefront/addresses']);
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
    console.log(`${width}: account tabs, icon contrast, dark drawers, mocked address save, navigation/reload, error retry, logout/login PASS`);
  } finally { await context.close(); }
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try { for (const width of (process.env.WIDTHS || '1512,1024,768,390,320').split(',').map(Number)) await check(browser, width); }
  finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
