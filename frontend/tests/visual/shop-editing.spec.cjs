/* Writes are intercepted and fulfilled locally; no real business data changes. */
const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');
const gel = { id: 'qa-gel', sku: 'QA-GEL', slug: 'qa-gel', nameRu: 'Тестовый гель', productType: 'PHYSICAL', basePrice: '1000', isActive: true, images: [], categories: [], variants: [{ id: 'qa-variant', price: '1000', salePrice: null, stock: 12, reserved: 0, isActive: true }] };
const gift = { ...gel, id: 'qa-gift', nameRu: 'Подарочная карта', sku: 'QA-GIFT', productType: 'GIFT_CARD', variants: [{ ...gel.variants[0], id: 'qa-gift-variant' }] };

for (const width of [1440, 390]) test(`Inline regular/sale prices ${width}`, async ({ browser }, testInfo) => {
  const f = await isolatedContext(browser, width, false, false, { fixtures: new Map([['/admin/products/list', { items: [gel, gift], total: 2, page: 1, limit: 24 }]]) });
  const writes = [];
  await f.context.route('**/api/v1/admin/products/qa-gel', async route => {
    const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3001', 'Access-Control-Allow-Methods': 'PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'authorization,content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().headers().authorization).toBe('Bearer mock-admin-design-not-a-valid-jwt');
    const body = route.request().postDataJSON(); writes.push(body);
    return route.fulfill({ headers, json: { ...gel, basePrice: String(body.price), variants: [{ ...gel.variants[0], price: String(body.price), salePrice: body.salePrice }] } });
  });
  try {
    await f.page.goto('/admin-workspace/products');
    const row = f.page.locator('[data-product-id="qa-gel"]');
    await expect(row).toBeVisible();
    await expect(f.page.getByRole('heading', { name: 'Товары', exact: true })).toHaveCount(1);
    await expect(f.page.locator('section.panel').getByText(/Найдено:.*на странице:/)).toHaveCount(0);
    expect(await row.getByTitle('Скрыть товар').count()).toBe(0);
    await expect(f.page.getByLabel('Изменить цену: Подарочная карта', { exact: true })).toBeDisabled();
    await row.getByLabel('Изменить цену: Тестовый гель', { exact: true }).click();
    const price = row.getByLabel('Цена: Тестовый гель', { exact: true });
    const sale = row.getByLabel('Акционная цена: Тестовый гель', { exact: true });
    await expect(price).toBeFocused();
    const save = row.getByLabel('Сохранить цены: Тестовый гель');
    const cancel = row.getByLabel('Отменить изменение цен');
    expect(await save.textContent()).toBe('');
    expect(await cancel.textContent()).toBe('');
    expect(await save.evaluate(el => Boolean(el.closest('.cs-inline-price')))).toBe(true);
    expect(await save.evaluate(el => getComputedStyle(el).color)).toBe('rgb(35, 143, 93)');
    expect(await cancel.evaluate(el => getComputedStyle(el).color)).toBe('rgb(184, 79, 65)');
    expect(await f.page.locator('.products-table .row.head').evaluate(el => el.children.length)).toBe(6);
    await price.fill('1250,50'); await sale.fill('1300');
    expect(await save.evaluate(el => el.closest('.cs-inline-price').querySelector('input').dataset.priceField)).toBe('salePrice');
    await expect(row.locator('.cs-price-value')).toHaveCount(0);
    await row.getByLabel('Сохранить цены: Тестовый гель').click();
    await expect(row.getByRole('alert')).toContainText('меньше обычной');
    expect(writes).toEqual([]);
    await sale.fill('900');
    await testInfo.attach('inline-prices', { body: await row.screenshot(), contentType: 'image/png' });
    await row.getByLabel('Сохранить цены: Тестовый гель').click();
    await expect(price).toHaveCount(0);
    expect(writes).toEqual([{ price: 1250.5, salePrice: 900, variantId: 'qa-variant' }]);
    await expect(row.getByLabel('Изменить акционную цену: Тестовый гель', { exact: true })).toContainText('900');
    await row.getByLabel('Изменить акционную цену: Тестовый гель', { exact: true }).click();
    await sale.fill(''); await price.press('Enter');
    await expect(price).toHaveCount(0);
    expect(writes[1]).toEqual({ price: 1250.5, salePrice: null, variantId: 'qa-variant' });
    await row.getByLabel('Изменить цену: Тестовый гель', { exact: true }).click();
    await price.fill('2000'); await price.press('Escape');
    await expect(price).toHaveCount(0); expect(writes).toHaveLength(2);
    await row.getByLabel('Изменить цену: Тестовый гель', { exact: true }).click();
    await price.fill('3000'); await cancel.click();
    await expect(price).toHaveCount(0); expect(writes).toHaveLength(2);
    expect(await f.page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    for (const key of ['unknownReads', 'externalRequests', 'prohibitedWrites', 'credentialLeaks']) expect(f.traffic[key]).toEqual([]);
    expect(f.errors).toEqual([]);
  } finally { await f.context.close(); }
});

test('Loyalty settings and participants are separate pages in a separate group', async ({ browser }, testInfo) => {
  const f = await isolatedContext(browser, 1440, false);
  try {
    await f.page.goto('/admin-workspace/loyalty-settings');
    await expect(f.page.locator('.loyalty-settings-panel')).toBeVisible();
    await expect(f.page.locator('.loyalty-members-panel')).toHaveCount(0);
    await expect(f.page.locator('.studio-rail').getByRole('link', { name: 'Настройки программы', exact: true })).toBeVisible();
    await f.page.locator('.studio-rail').getByRole('link', { name: 'Участники', exact: true }).click();
    await expect(f.page).toHaveURL(/\/loyalty-members$/);
    await expect(f.page.locator('.loyalty-members-panel')).toBeVisible();
    await expect(f.page.locator('.loyalty-settings-panel')).toHaveCount(0);
    await f.page.getByRole('button', { name: 'Открыть бонусный счёт' }).click();
    await expect(f.page.locator('.loyalty-history')).toBeVisible();
    await testInfo.attach('loyalty-participants', { body: await f.page.screenshot(), contentType: 'image/png' });
    for (const key of ['unknownReads', 'externalRequests', 'prohibitedWrites', 'credentialLeaks']) expect(f.traffic[key]).toEqual([]);
    expect(f.errors).toEqual([]);
  } finally { await f.context.close(); }
});
