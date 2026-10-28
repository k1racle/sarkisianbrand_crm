/* Read-only browser acceptance for the business workspace.
 * Uses synthetic records, blocks every write and all external traffic.
 * ADMIN_DESIGN_URL may select another loopback frontend, including a dev build.
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const base = process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001';
const origin = new URL(base).origin;
const output = path.resolve(__dirname, '../.screenshots/business-workspace-design');
fs.mkdirSync(output, { recursive: true });
const companyId = '10000000-0000-4000-8000-000000000001';
const actor = { id: 'business-design-owner', firstName: 'Анна', lastName: 'Проверка', email: 'business-design@example.invalid', role: 'CUSTOMER_B2B', isActive: true };
const organizations = [{ id: companyId, name: 'Студия красоты SARKISIAN', role: 'OWNER', status: 'ACTIVE', canOrder: true, canSeeFinance: true, canUseSalon: true }];
const profile = { id: companyId, name: organizations[0].name, inn: '7700123456', legalAddress: 'Москва, Тестовая улица, 1', status: 'ACTIVE', discountTier: 10, creditLimit: '150000', membership: { role: 'OWNER', canOrder: true, canSeeFinance: true }, capabilities: { salon: true, purchasing: true }, members: [], presentation: null };
const products = Array.from({ length: 25 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return { id: `product-${number}`, sku: `SB-${number}`, nameRu: `Гель скоростной ${number}, камуфлирующий, 30 мл`, images: [{ url: '/storefront/products/gel-mousse-23.jpg' }], categories: [{ category: { id: index % 2 ? 'gels' : 'bases', nameRu: index % 2 ? 'Гели' : 'Базы' } }], variants: [{ id: `variant-${number}`, sku: `QA-GEL-${number}`, name: '30 мл', availabilityStatus: 'CURRENT', available: index % 4 === 3 ? 0 : 12, b2bPrice: 1296, retailPrice: 1440 }] };
});
const clients = Array.from({ length: 26 }, (_, index) => ({ id: `client-${index}`, firstName: `Клиент ${String(index + 1).padStart(2, '0')}`, lastName: 'Тестовая', phone: `+7 999 000 ${String(index).padStart(4, '0')}`, email: `client-${index}@example.invalid`, tags: index % 2 ? ['Постоянный клиент'] : ['Первый визит'], lastVisitAt: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`, totalVisits: index + 1, totalSpent: (index + 1) * 1800 }));
const services = Array.from({ length: 26 }, (_, index) => ({ id: `service-${index}`, name: `Маникюр ${String(index + 1).padStart(2, '0')} с покрытием`, description: index ? '' : 'Подготовка ногтей, выравнивание и однотонное покрытие', price: 1800 + index * 100, duration: 60 + index, isActive: index % 3 !== 2, color: '#6b7280' }));
const orders = Array.from({ length: 21 }, (_, index) => ({ id: `order-${index}`, orderNumber: `SB-${String(index + 1).padStart(3, '0')}`, status: index % 2 ? 'DELIVERED' : 'NEW', createdAt: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00Z`, finalAmount: '2592', oneCSyncError: null, isSynced1C: true, items: [{ id: `line-${index}`, productName: products[index % products.length].nameRu, variantName: '30 мл', quantity: 2, price: '1296', total: '2592' }] }));
const dashboard = { bookingsToday: 4, upcoming: 12, clients: 26, serviceRevenueMonth: '126450', purchaseOrdersMonth: 3, purchasesMonth: '18345.60', timeZone: 'Europe/Moscow', nextBookings: [{ id: 'visit-1', client: clients[0], service: services[0], startTime: '2026-10-27T06:00:00Z', endTime: '2026-10-27T07:30:00Z', masterMember: { user: { firstName: 'Мария', lastName: 'Мастер' } } }, { id: 'visit-2', client: clients[1], service: services[1], startTime: '2026-10-27T08:00:00Z', endTime: '2026-10-27T09:00:00Z' }] };

async function geometry(page) {
  const result = await page.evaluate(() => {
    const visible = element => { const style = getComputedStyle(element), rect = element.getBoundingClientRect(); return rect.width > 2 && rect.height > 2 && style.visibility !== 'hidden' && style.display !== 'none'; };
    const intentionalScroller = element => { for (let node = element.parentElement; node; node = node.parentElement) { const style = getComputedStyle(node); if (['scroll', 'auto'].includes(style.overflowX) && node.scrollWidth > node.clientWidth) return true; } return false; };
    return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, outside: [...document.querySelectorAll('.b2b-frame :is(button,input,select,a),.b2b-rail :is(button,a)')].filter(visible).filter(element => { const rect = element.getBoundingClientRect(); return (rect.left < -2 || rect.right > innerWidth + 2) && !intentionalScroller(element); }).map(element => (element.getAttribute('aria-label') || element.textContent || element.className).trim().slice(0, 100)) };
  });
  assert.ok(result.documentWidth <= result.width + 2, JSON.stringify(result));
  assert.deepEqual(result.outside, [], 'Visible controls must stay within the viewport');
}

async function expectRowCount(page, selector, expected) {
  await page.waitForFunction(({ selector, expected }) => document.querySelectorAll(selector).length === expected, { selector, expected });
  assert.equal(await page.locator(selector).count(), expected);
}

async function contrast(page, selector) {
  const values = await page.locator(selector).evaluateAll(elements => elements.map(element => {
    const rgba = value => { const parts = value.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return [...parts.slice(0, 3), parts[3] ?? 1]; };
    const blend = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
    const luminance = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const layers = []; for (let node = element; node; node = node.parentElement) layers.push(rgba(getComputedStyle(node).backgroundColor));
    const background = layers.reverse().reduce((back, front) => blend(front, back), [255, 255, 255]);
    const foreground = luminance(blend(rgba(getComputedStyle(element).color), background)), back = luminance(background);
    return { text: element.textContent.trim().slice(0, 80), ratio: (Math.max(foreground, back) + .05) / (Math.min(foreground, back) + .05) };
  }));
  for (const value of values) assert.ok(value.ratio >= 4.5, `Text contrast: ${JSON.stringify(value)}`);
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const width of [1440, 390, 320]) for (const dark of [false, true]) {
      const fixtureProfile = structuredClone(profile), fixtureDashboard = structuredClone(dashboard);
      const fixtures = new Map([['/b2b/organizations', organizations], ['/b2b/profile', fixtureProfile], ['/b2b/catalog', products], ['/b2b/clients', clients], ['/b2b/services', services], ['/b2b/orders', orders], ['/b2b/dashboard', fixtureDashboard]]);
      const fixture = await isolatedContext(browser, width, false, false, { b2b: true, actor, fixtures });
      const { page, context } = fixture;
      const label = `${width}-${dark ? 'dark' : 'light'}`;
      const delayedEndpoints = new Set();
      try {
        // Fields render before their records arrive; exercise that state deliberately.
        // Fallback keeps the isolated fixture router responsible for every response.
        await page.route(/\/api\/v1\/b2b\/(clients|services|orders)(?:\?.*)?$/, async route => {
          delayedEndpoints.add(new URL(route.request().url()).pathname.split('/').pop());
          await new Promise(resolve => setTimeout(resolve, 250));
          await route.fallback();
        });
        await context.addCookies([{ name: 'sarkisian-crm-theme', value: dark ? 'dark' : 'light', domain: new URL(origin).hostname, path: '/' }]);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`${origin}/b2b?section=catalog`);
        await page.addStyleTag({ content: '#nuxt-devtools-container { display: none !important; }' });
        await page.getByLabel('Поиск оптовых товаров', { exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelectorAll('.business-product').length === 12);
        assert.equal(await page.getByLabel('Следующая страница товаров', { exact: true }).isEnabled(), true);
        await page.getByLabel('Следующая страница товаров', { exact: true }).click();
        await page.getByLabel('Количество QA-GEL-13', { exact: true }).waitFor();
        assert.equal(await page.locator('.business-product').count(), 12);
        await page.getByLabel('Следующая страница товаров', { exact: true }).click();
        await page.getByLabel('Количество QA-GEL-25', { exact: true }).waitFor();
        assert.equal(await page.locator('.business-product').count(), 1);
        await page.getByLabel('Добавить QA-GEL-25', { exact: true }).click();
        assert.equal(await page.getByLabel('Количество QA-GEL-25', { exact: true }).inputValue(), '1');
        await page.getByLabel('Поиск оптовых товаров', { exact: true }).fill('товара которого нет');
        await page.getByRole('heading', { name: 'Подходящих товаров нет', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Показать все товары', exact: true }).click();
        await page.getByLabel('Количество QA-GEL-01', { exact: true }).waitFor();
        assert.equal(await page.locator('.business-product').count(), 12);
        assert.ok((await page.locator('.business-cart').innerText()).includes('Гель скоростной 25'));
        await page.getByLabel('Наличие оптовых товаров', { exact: true }).selectOption('unavailable');
        assert.equal(await page.locator('.business-product').count(), 6);
        assert.equal(await page.getByLabel('Добавить QA-GEL-04', { exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        await page.getByLabel('Количество QA-GEL-01', { exact: true }).waitFor();
        await page.getByLabel('Поиск оптовых товаров', { exact: true }).focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.getByLabel('Категория оптовых товаров', { exact: true }).evaluate(element => element === document.activeElement), true);
        const focus = await page.getByLabel('Категория оптовых товаров', { exact: true }).evaluate(element => ({ width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle }));
        assert.ok(parseFloat(focus.width) >= 2 && focus.style !== 'none', 'Keyboard focus must be visible');
        await geometry(page);
        await contrast(page, '.business-cart footer button.primary,.business-cart footer small,.business-results-summary>span');
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, `${label}-catalog.png`) });
        if (width < 800) {
          await contrast(page, '.business-cart-jump,.business-cart-jump span,.business-cart-jump strong');
          await page.getByRole('button', { name: /Ваш заказ ·/ }).click();
          assert.equal(await page.getByRole('complementary', { name: 'Корзина закупок' }).evaluate(element => element === document.activeElement), true);
          await page.locator('.business-cart footer').scrollIntoViewIfNeeded();
          await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
          const bounds = await page.evaluate(() => ({ footer: document.querySelector('.business-cart footer').getBoundingClientRect().bottom, dock: document.querySelector('.ui-mobile-dock').getBoundingClientRect().top }));
          assert.ok(bounds.footer <= bounds.dock - 8, `Checkout must scroll above the mobile dock: ${JSON.stringify(bounds)}`);
          await page.screenshot({ path: path.join(output, `${label}-cart.png`) });
        }
        await page.getByRole('button', { name: 'Оформить заказ', exact: true }).click();
        await page.getByRole('dialog').waitFor();
        assert.ok((await page.getByRole('dialog').innerText()).includes('Гель скоростной 25'));
        await page.getByRole('button', { name: 'Отмена', exact: true }).click();
        assert.equal(await page.getByRole('dialog').count(), 0);

        await page.goto(`${origin}/b2b?section=clients`);
        await page.getByLabel('Поиск клиентов', { exact: true }).waitFor();
        await expectRowCount(page, '.salon-client-row', 25);
        await page.getByLabel('Следующая страница клиентов', { exact: true }).click();
        await expectRowCount(page, '.salon-client-row', 1);
        await page.getByLabel('Поиск клиентов', { exact: true }).fill('client-25@');
        await page.waitForFunction(() => document.querySelectorAll('.salon-client-row').length === 1);
        assert.ok((await page.locator('.salon-client-row').innerText()).includes('Клиент 26'));
        await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        await expectRowCount(page, '.salon-client-row', 25);
        await geometry(page);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, `${label}-clients.png`) });

        await page.goto(`${origin}/b2b?section=services`);
        await page.getByLabel('Поиск услуг', { exact: true }).waitFor();
        await expectRowCount(page, '.salon-service-row', 25);
        await page.getByLabel('Следующая страница услуг', { exact: true }).click();
        await expectRowCount(page, '.salon-service-row', 1);
        await page.getByLabel('Доступность услуг', { exact: true }).selectOption('inactive');
        await expectRowCount(page, '.salon-service-row', 8);
        await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        await contrast(page, '.salon-service-status.is-active');
        await geometry(page);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, `${label}-services.png`) });

        await page.goto(`${origin}/b2b?section=orders`);
        await page.getByLabel('Поиск закупочных заказов', { exact: true }).waitFor();
        await expectRowCount(page, '.business-order-row', 20);
        await page.getByLabel('Следующая страница заказов', { exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('.business-order-row').length === 1);
        assert.equal(await page.locator('.business-order-row').count(), 1);
        await page.getByLabel('Статус закупочного заказа', { exact: true }).selectOption('DELIVERED');
        await page.waitForFunction(() => document.querySelectorAll('.business-order-row').length === 10);
        assert.equal(await page.locator('.business-order-row').count(), 10);
        await page.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        const expander = page.getByLabel('Состав заказа SB-021', { exact: true });
        await expander.click();
        assert.equal(await expander.getAttribute('aria-expanded'), 'true');
        assert.ok((await page.locator('.business-order-details').innerText()).includes('30 мл'));
        await geometry(page);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, `${label}-orders.png`) });

        await page.goto(`${origin}/b2b`);
        await page.getByRole('heading', { name: 'Ближайшие записи', exact: true }).waitFor();
        assert.ok((await page.locator('.business-upcoming-list').innerText()).includes('90 мин.'), 'Duration uses the saved visit interval, not the changed service duration');
        await contrast(page, '.business-overview-metrics small,.business-overview-shortcuts small,.salon-organization-status');
        await geometry(page);
        await page.screenshot({ path: path.join(output, `${label}-salon.png`) });

        await page.goto(`${origin}/b2b?section=purchases`);
        await page.getByRole('heading', { name: 'Последние заказы', exact: true }).waitFor();
        await contrast(page, '.business-shortcut--primary strong,.business-shortcut--primary small,.business-dashboard-order small');
        await geometry(page);
        await page.screenshot({ path: path.join(output, `${label}-purchases.png`) });

        fixtureProfile.membership.canSeeFinance = false;
        await page.goto(`${origin}/b2b?section=orders`);
        await page.getByLabel('Поиск закупочных заказов', { exact: true }).waitFor();
        assert.equal(await page.getByRole('columnheader', { name: 'Сумма', exact: true }).count(), 0);
        await page.getByLabel('Состав заказа SB-021', { exact: true }).click();
        assert.equal(await page.locator('.business-order-line>strong').count(), 0, 'Order details hide amounts without financial access');
        await page.goto(`${origin}/b2b`);
        await page.getByRole('heading', { name: 'Ближайшие записи', exact: true }).waitFor();
        assert.equal(await page.getByText('Выручка за месяц', { exact: true }).count(), 0);
        assert.deepEqual([...delayedEndpoints].sort(), ['clients', 'orders', 'services'], 'Each records fixture must exercise delayed loading');
        assert.deepEqual(fixture.traffic.prohibitedWrites, []);
        assert.deepEqual(fixture.traffic.unknownReads, []);
        assert.deepEqual(fixture.traffic.credentialLeaks, []);
        // Dev tooling may attempt a blocked local websocket/icon; the application
        // must still have no Vue/runtime errors. Production has no dev tooling.
        assert.deepEqual(fixture.errors.filter(error => !error.includes('net::ERR_BLOCKED_BY_CLIENT')), []);
        results.push({ width, theme: dark ? 'dark' : 'light', passed: true });
        console.log(`PASS business workspace ${label}: paging/search/reset, retained cart, keyboard focus, checkout preview, phone dock, record filters, financial visibility and real text contrast.`);
      } catch (error) {
        await page.screenshot({ path: path.join(output, `${label}-failure.png`), fullPage: true });
        console.error(JSON.stringify({ label, errors: fixture.errors, unknownReads: fixture.traffic.unknownReads, blockedExternal: fixture.traffic.externalRequests }, null, 2));
        throw error;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ mockedOnly: true, actualApiWrites: 0, results }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
