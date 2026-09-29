// UI-only acceptance: synthetic auth, fixture reads, explicitly mocked writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-customer-access');
async function headingFont(page, selector) {
  await page.evaluate(() => document.fonts.ready);
  const heading = page.locator(selector).first();
  const computed = await heading.evaluate(el => { const s = getComputedStyle(el); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight }; });
  assert.match(computed.family, /^Mont,/); assert.equal(computed.weight, '900');
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable'); await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument');
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
    assert.ok(fonts.some(font => font.isCustomFont && /Mont/i.test(font.familyName) && !/Montserrat/i.test(font.familyName)), JSON.stringify(fonts));
  } finally { await session.detach(); }
  return computed;
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'customers.read', 'customers.write'] });
      const owner = { id: 'mock-admin', firstName: 'Анна', lastName: 'Соколова', email: 'anna@example.invalid' };
      const nextOwner = { id: 'colleague', firstName: 'Иван', lastName: 'Петров', email: 'ivan@example.invalid' };
      const shared = { status: 'ACTIVE', accountManagerId: owner.id, accountManager: owner, canWrite: true, createdAt: '2026-09-28T10:00:00Z', relatedAccess: { orders: false, helpdesk: false, leads: true }, orders: [], leads: [], interactions: [], helpdeskTickets: [], organizationMemberships: [], members: [], _count: { orders: 0, leads: 0, tasks: 0, interactions: 0, helpdeskTickets: 0, members: 0 } };
      const customers = [{ ...shared, id: 'editable', firstName: 'Мария', lastName: 'Покупатель', email: 'customer@example.invalid', phone: '+70000000000', segment: 'B2C' }, { ...shared, id: 'readonly', firstName: 'Ольга', lastName: 'Только просмотр', email: 'readonly@example.invalid', canWrite: false }];
      const organizations = [{ ...shared, id: 'organization', name: 'Салон «Пример»', legalName: 'ООО Пример', inn: '1234567890', discountTier: 5, creditLimit: 0 }];
      fixtures.set('/customer-360/customers', customers); fixtures.set('/customer-360/organizations', organizations);
      fixtures.set('/customer-360/dashboard', { customers: 2, active: 2, b2cCustomers: 2, b2bCustomers: 0, organizations: 1, newCustomers: 2, revenue: null });
      fixtures.set('/customer-360/team', [owner, nextOwner]);
      for (const row of customers) fixtures.set('/customer-360/customers/' + row.id, row);
      fixtures.set('/customer-360/organizations/organization', organizations[0]);
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      const writes = [], cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS' };
      await f.context.route('**/api/v1/customer-360/**', async route => {
        const request = route.request(), endpoint = new URL(request.url()).pathname.replace('/api/v1', '');
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (request.method() !== 'PATCH') return route.fallback();
        assert.equal(request.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        const row = endpoint === '/customer-360/customers/editable' ? customers[0] : endpoint === '/customer-360/organizations/organization' ? organizations[0] : null;
        assert.ok(row, 'Unexpected write: ' + endpoint);
        const body = request.postDataJSON(); assert.equal(body.accountManagerId, nextOwner.id);
        writes.push(endpoint); Object.assign(row, body, { accountManager: nextOwner });
        return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(row) });
      });
      try {
        const p = f.page;
        await p.goto(origin + '/crm/customers', { waitUntil: 'networkidle' });
        assert.equal((await headingFont(p, '.crm-standard h1')).size, '20px');
        assert.match(await p.getByRole('button', { name: 'Обновить', exact: true }).evaluate(el => getComputedStyle(el).fontFamily), /^Montserrat,/);
        const readOnly = p.locator('button.customer-row').filter({ hasText: 'Только просмотр' });
        await readOnly.click({ button: 'right' });
        assert.equal(await p.getByRole('button', { name: /Переместить в архив|Переместить в корзину/ }).count(), 0);
        await p.keyboard.press('Escape'); await readOnly.click();
        let dialog = p.getByRole('dialog');
        assert.ok(await dialog.getByLabel('Ответственный за клиента').isDisabled());
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить карточку' }).isDisabled());
        await dialog.getByText('Нет доступа к истории заказов', { exact: true }).waitFor();
        await p.screenshot({ path: path.join(output, width + '-readonly.png') });
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.locator('button.customer-row').filter({ hasText: 'Мария' }).click();
        dialog = p.getByRole('dialog');
        await dialog.getByLabel('Ответственный за клиента').selectOption(nextOwner.id);
        await dialog.getByRole('button', { name: 'Сохранить карточку' }).click();
        await p.getByText('Карточка клиента сохранена', { exact: true }).waitFor();
        assert.equal(await dialog.getByLabel('Ответственный за клиента').inputValue(), nextOwner.id);
        await headingFont(p, '[role=dialog] h2');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.screenshot({ path: path.join(output, width + '-customer.png') });
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.goto(origin + '/crm/organizations', { waitUntil: 'networkidle' });
        await p.locator('button.org-row').first().click(); dialog = p.getByRole('dialog');
        await dialog.getByLabel('Ответственный за клиента').selectOption(nextOwner.id);
        await dialog.getByRole('button', { name: 'Сохранить изменения' }).click();
        await p.getByText('Организация сохранена', { exact: true }).waitFor();
        await dialog.getByText('Нет доступа к истории заказов', { exact: true }).waitFor();
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.screenshot({ path: path.join(output, width + '-organization.png') });
        assert.deepEqual(writes, ['/customer-360/customers/editable', '/customer-360/organizations/organization']);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors, []);
        checks.push(width + ': scoped actions, owner selection/save, readable denied history, Mont headings/Montserrat controls, no document overflow');
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, width + '-failure.png') });
        console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic, writes })); throw error;
      } finally { await f.context.close(); }
    }
    // Use the same isolated networking to check actual public-route typography.
    const f = await isolatedContext(browser, 390, true);
    try {
      await f.context.route(origin + '/delivery', route => {
        const request = route.request();
        if (request.method() === 'GET' && request.resourceType() === 'document' && !request.headers().authorization) return route.continue();
        return route.fallback();
      });
      await f.context.route('**/api/v1/products/**', route => {
        const request = route.request();
        if (request.method() !== 'GET') return route.fallback();
        const endpoint = new URL(request.url()).pathname;
        const body = endpoint.endsWith('/storefront-pages/delivery') ? { slug: 'delivery', title: 'Доставка и оплата', eyebrow: 'Покупать удобно', lead: 'Понятные шаги от выбора продукта до получения заказа.', isActive: true, blocks: [{ id: 'steps', title: 'Получение заказа', body: 'Выберите удобный способ доставки.' }] } : {};
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': origin }, contentType: 'application/json', body: JSON.stringify(body) });
      });
      await f.page.goto(origin + '/delivery', { waitUntil: 'networkidle' });
      await headingFont(f.page, '.sb-storefront h1');
      assert.match(await f.page.locator('.sb-storefront p').first().evaluate(el => getComputedStyle(el).fontFamily), /^Montserrat,/);
      await f.page.screenshot({ path: path.join(output, '390-storefront-font.png') });
      assert.deepEqual(f.traffic.externalRequests, []); assert.deepEqual(f.traffic.prohibitedWrites, []);
      checks.push('Public delivery page: actual Mont font rendered; body remains Montserrat');
    } finally { await f.context.close(); }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'Mocked; no integrations or live writes', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
