/* Public loopback reads / intercepted editor fixtures. No actual carts or writes. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
for (const width of [1440, 1024, 390, 320]) test(`Homepage business cabinet preview ${width}`, async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3001', viewport: { width, height: 960 }, serviceWorkers: 'block' });
  const errors = [], writes = [], privateReads = [];
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.abort();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { writes.push(url.pathname); return route.fulfill({ status: 405, json: {} }); }
    if (url.pathname === '/api/v1/cart') return route.fulfill({ json: { items: [], total: 0 } });
    if (url.pathname === '/api/v1/storefront/favorites') return route.fulfill({ json: [] });
    if (url.pathname.startsWith('/api/v1/') && !/^\/api\/v1\/(products(?:\/|$)|seo(?:\/|$)|gift-cards\/product$)/.test(url.pathname)) { privateReads.push(url.pathname); return route.fulfill({ status: 403, json: {} }); }
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('/', { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
    const block = page.locator('.sb-home-partnership--workspace'), mock = block.getByRole('region', { name: 'Демонстрация B2B-кабинета' });
    await mock.scrollIntoViewIfNeeded();
    await expect(block.getByRole('link', { name: 'Решения для бизнеса' })).toHaveAttribute('href', '/business');
    await expect(mock.getByText('Пример данных', { exact: true })).toBeVisible();
    const salon = mock.getByRole('tab', { name: 'Мой салон', exact: true }), purchases = mock.getByRole('tab', { name: 'Закупки SARKISIAN', exact: true });
    await expect(salon).toHaveAttribute('aria-selected', 'true');
    await expect(mock.getByRole('tabpanel')).toContainText('Перерыв');
    await expect(mock.getByRole('tabpanel')).toContainText('Онлайн-запись для клиентов');
    expect(await mock.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    const initial = await mock.boundingBox();
    await info.attach(`business-salon-${width}`, { body: await block.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await purchases.click(); await expect(purchases).toHaveAttribute('aria-selected', 'true');
    await expect(mock.getByRole('tabpanel')).toContainText('Гель-мусс конструирующий');
    await expect.poll(() => mock.locator('.sb-business-preview__product img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await expect(mock.getByRole('status', { name: 'Количество в примере' })).toHaveText('2');
    await mock.getByRole('button', { name: 'Увеличить количество в примере' }).click();
    await expect(mock.getByRole('status', { name: 'Количество в примере' })).toHaveText('3');
    await expect(mock.locator('.sb-business-preview__total strong')).toHaveText('1 989 ₽');
    for (let i = 0; i < 2; i++) await mock.getByRole('button', { name: 'Уменьшить количество в примере' }).click();
    await expect(mock.getByRole('button', { name: 'Уменьшить количество в примере' })).toBeDisabled();
    await expect(mock.locator('.sb-business-preview__total strong')).toHaveText('663 ₽');
    for (let i = 0; i < 8; i++) await mock.getByRole('button', { name: 'Увеличить количество в примере' }).click();
    await expect(mock.getByRole('button', { name: 'Увеличить количество в примере' })).toBeDisabled();
    await info.attach(`business-purchases-${width}`, { body: await block.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    if (width >= 1440) expect(Math.abs((await mock.boundingBox()).height - initial.height)).toBeLessThan(3);
    await purchases.focus(); await page.keyboard.press('ArrowLeft'); await expect(salon).toBeFocused(); await expect(salon).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End'); await expect(purchases).toBeFocused(); await expect(purchases).toHaveAttribute('aria-selected', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await mock.getByRole('tabpanel').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]); expect(writes).toEqual([]); expect(privateReads).toEqual([]);
  } finally { await context.close(); }
});
test('Admin saves editable business demonstration data without actual writes', async ({ browser }) => {
  const f = await isolatedContext(browser, 1440, false, false, { allowFixtureForms: true });
  const writes = [];
  await f.context.route('**/api/v1/admin/storefront/site-content', async route => {
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3001', 'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (route.request().method() === 'GET') return route.fulfill({ headers, json: { revision: 0, content: {} } });
    const body = route.request().postDataJSON(); writes.push(body);
    return route.fulfill({ headers, json: { revision: 1, content: body.content } });
  });
  try {
    await f.page.goto('/admin-workspace/site-content');
    await f.page.locator('.studio-block-select').filter({ hasText: 'Для бизнеса' }).click();
    const editor = f.page.getByRole('region', { name: 'Редактирование мини-макета B2B' });
    await editor.getByLabel('Первая услуга в примере', { exact: true }).fill('Новая услуга в демонстрации');
    await editor.getByLabel('Цена товара в примере, ₽', { exact: true }).fill('750');
    await f.page.getByRole('button', { name: 'Сохранить контент', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].content.home.business.preview).toMatchObject({ appointmentTitle: 'Новая услуга в демонстрации', productPrice: 750, productImageUrl: '/storefront/products/gel-mousse-23.jpg' });
    expect(f.errors).toEqual([]); expect(f.traffic.prohibitedWrites).toEqual([]);
  } finally { await f.context.close(); }
});
