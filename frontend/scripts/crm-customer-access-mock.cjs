// UI-only acceptance: synthetic auth, fixture reads, explicitly mocked writes.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-customer-access');
async function checkCustomerBounds(page, selector) {
  const failures = await page.locator(selector).evaluateAll(containers => containers.flatMap(container => {
    const outer = container.getBoundingClientRect();
    return [...container.querySelectorAll('button, a, input, select')].flatMap(el => {
      if (!el.getClientRects().length) return [];
      const rect = el.getBoundingClientRect();
      const clipped = rect.left < outer.left - 1 || rect.right > outer.right + 1 || rect.left < -1 || rect.right > innerWidth + 1;
      const overflowingText = el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 2;
      return clipped || overflowingText ? [{ control: el.textContent || el.getAttribute('aria-label'), left: rect.left, right: rect.right, width: rect.width, scrollWidth: el.scrollWidth }] : [];
    });
  }));
  assert.deepEqual(failures, [], 'Customer controls must fit their card, including their text');
}
async function headingFont(page, selector) {
  await page.evaluate(() => document.fonts.ready);
  const heading = page.locator(selector).first();
  const computed = await heading.evaluate(el => { const s = getComputedStyle(el); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight }; });
  assert.match(computed.family, /^Mont,/); assert.equal(computed.weight, '700');
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
    for (const width of [360, 390, 768, 1440]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/staff-notifications', { items: [], fresh: [], unreadCount: 0, nextCursor: null, through: '2026-10-08T00:00:00Z', popupsEnabled: false });
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
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const writes = [], createAttempts = [], cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS' };
      await f.context.route('**/api/v1/customer-360/**', async route => {
        const request = route.request(), endpoint = new URL(request.url()).pathname.replace('/api/v1', '');
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (request.method() === 'GET' && endpoint === '/customer-360/customers/new-customer') return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(customers.find(row => row.id === 'new-customer')) });
        if (request.method() === 'POST' && endpoint === '/customer-360/customers') {
          const body = request.postDataJSON(); createAttempts.push(body);
          assert.equal(request.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
          assert.equal(body.accountManagerId, owner.id);
          const duplicate = customers.find(row => row.email === body.email);
          if (duplicate) return route.fulfill({ status: 409, headers: cors, contentType: 'application/json', body: JSON.stringify({ code: 'CUSTOMER_EXISTS', message: 'Клиент с таким телефоном или email уже есть в базе.', existingCustomerId: duplicate.id }) });
          const row = { ...shared, ...body, id: 'new-customer', source: 'MANUAL', createdAt: '2026-10-08T15:00:00Z' };
          customers.push(row); fixtures.set('/customer-360/customers/' + row.id, row); fixtures.get('/customer-360/dashboard').customers++;
          writes.push(endpoint);
          return route.fulfill({ status: 201, headers: cors, contentType: 'application/json', body: JSON.stringify(row) });
        }
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
        if (process.env.CUSTOMER_CSS_PREVIEW) await p.addStyleTag({ path: path.resolve(__dirname, '../assets/css/crm-customers.css') });
        await checkCustomerBounds(p, '.crm-customer-register, .crm-customer-row');
        if (width < 640) {
          assert.equal(await p.getByLabel('Статус клиента', { exact: true }).isVisible(), false);
          assert.ok((await p.locator('.crm-customer-row').first().boundingBox()).y < 520, 'First customer visible before scrolling on mobile');
        }
        if (width >= 1280) {
          assert.ok((await p.locator('.crm-customer-row').first().boundingBox()).height < 120, 'Desktop rows are compact');
          const controls = await p.locator('.crm-customer-tools > :not(button)').evaluateAll(els => els.map(el => el.getBoundingClientRect().y));
          assert.ok(Math.max(...controls) - Math.min(...controls) < 2, 'Desktop filters share one row');
        }
        const segmentColors = await p.locator('.crm-customer-segments button[aria-pressed=true]').evaluate(el => ({ border: getComputedStyle(el).borderBottomColor, text: getComputedStyle(el).color }));
        assert.equal(segmentColors.border, 'rgb(60, 60, 59)');
        assert.equal(segmentColors.text, 'rgb(60, 60, 59)');
        assert.equal((await headingFont(p, '.crm-standard h1')).size, '20px');
        assert.match(await p.getByRole('button', { name: 'Обновить', exact: true }).evaluate(el => getComputedStyle(el).fontFamily), /^Montserrat,/);
        const readOnly = p.locator('.customer-row').filter({ hasText: 'Только просмотр' });
        await readOnly.click({ button: 'right' });
        assert.equal(await p.getByRole('button', { name: /Переместить в архив|Переместить в корзину/ }).count(), 0);
        await p.keyboard.press('Escape'); await readOnly.locator('.crm-customer-name').click();
        let dialog = p.getByRole('dialog');
        assert.ok(await dialog.getByLabel('Ответственный за клиента').isDisabled());
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить карточку' }).isDisabled());
        await checkCustomerBounds(p, '.crm-customer-dialog, .crm-customer-card-tabs');
        await dialog.getByRole('tab', { name: /^Заказы/ }).click();
        await dialog.getByText('Нет доступа к истории заказов', { exact: true }).waitFor();
        await p.screenshot({ path: path.join(output, width + '-readonly.png') });
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.locator('.customer-row').filter({ hasText: 'Мария' }).locator('.crm-customer-name').click();
        dialog = p.getByRole('dialog');
        await dialog.getByLabel('Ответственный за клиента').selectOption(nextOwner.id);
        await dialog.getByRole('button', { name: 'Сохранить карточку' }).click();
        await p.getByText('Карточка клиента сохранена', { exact: true }).waitFor();
        assert.equal(await dialog.getByLabel('Ответственный за клиента').inputValue(), nextOwner.id);
        await headingFont(p, '[role=dialog] h2');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.locator('.toast').waitFor({ state: 'hidden' });
        await p.screenshot({ path: path.join(output, width + '-customer.png') });
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        const phone = p.locator('.customer-row').filter({ hasText: 'Мария' }).locator('a[href^="tel:"]');
        assert.equal(await phone.getAttribute('href'), 'tel:+70000000000');
        assert.equal(await p.locator('.customer-row').filter({ hasText: 'Мария' }).locator('a[href^="mailto:"]').getAttribute('href'), 'mailto:customer@example.invalid');
        if (width < 1280) await p.getByRole('button', { name: /^Фильтры и сортировка/ }).click();
        await p.getByLabel('Ответственный менеджер', { exact: true }).selectOption('mine');
        assert.equal(await p.locator('.customer-row').count(), 1, 'Owner filter excludes reassigned record');
        await p.getByLabel('Ответственный менеджер', { exact: true }).selectOption('unassigned');
        await p.getByText('Клиенты не найдены', { exact: true }).waitFor();
        await p.getByRole('button', { name: 'Сбросить фильтры', exact: true }).first().click();
        await p.getByLabel('Сортировка клиентов').selectOption('name');
        assert.match(await p.locator('.crm-customer-name').first().textContent(), /Мария/);
        await p.locator('.customer-row').filter({ hasText: 'Мария' }).locator('.crm-customer-stat').first().click();
        dialog = p.getByRole('dialog');
        assert.equal(await dialog.getByRole('tab', { name: /^Заказы/ }).getAttribute('aria-selected'), 'true');
        await dialog.getByRole('tab', { name: 'Профиль', exact: true }).click();
        await dialog.getByLabel('Имя', { exact: true }).fill('Несохранённое');
        await p.keyboard.press('Escape');
        assert.ok(await dialog.isVisible(), 'Dismissed discard confirmation retains draft');
        await dialog.getByRole('tab', { name: 'Профиль', exact: true }).focus();
        await p.keyboard.press('ArrowRight');
        assert.equal(await dialog.getByRole('tab', { name: /^Заказы/ }).getAttribute('aria-selected'), 'true');
        assert.equal(await dialog.locator('#customer-panel-profile').isVisible(), false);
        await dialog.getByRole('tab', { name: 'Профиль', exact: true }).click();
        assert.equal(await dialog.getByLabel('Имя', { exact: true }).inputValue(), 'Несохранённое');
        await dialog.getByLabel('Имя', { exact: true }).fill('Мария');
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        if (width < 1280) await p.getByRole('button', { name: /^Фильтры и сортировка/ }).click();
        await p.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.crm-main')?.scrollTo(0, 0); });
        await checkCustomerBounds(p, '.crm-customer-register, .crm-customer-row');
        await p.screenshot({ path: path.join(output, width + '-registry.png') });
        await p.getByRole('button', { name: 'Добавить клиента', exact: true }).click();
        dialog = p.getByRole('dialog');
        await dialog.getByRole('heading', { name: 'Новый клиент' }).waitFor();
        await dialog.getByLabel('Имя', { exact: true }).fill('Новый клиент');
        await dialog.getByRole('button', { name: 'Создать клиента', exact: true }).click();
        await dialog.getByText('Укажите телефон или email, чтобы связаться с клиентом', { exact: true }).waitFor();
        assert.equal(createAttempts.length, 0);
        await dialog.getByLabel('Email', { exact: true }).fill('readonly@example.invalid');
        await dialog.getByRole('button', { name: 'Создать клиента', exact: true }).click();
        await dialog.getByRole('button', { name: 'Открыть существующего клиента' }).waitFor();
        assert.equal(await dialog.getByLabel('Имя', { exact: true }).inputValue(), 'Новый клиент');
        await dialog.getByLabel('Email', { exact: true }).fill('new@example.invalid');
        await checkCustomerBounds(p, '.crm-customer-dialog');
        await p.screenshot({ path: path.join(output, width + '-create.png') });
        await dialog.getByRole('button', { name: 'Создать клиента', exact: true }).click();
        await p.getByText('Клиент добавлен', { exact: true }).waitFor();
        assert.equal(createAttempts.length, 2);
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить карточку' }).isDisabled());
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.getByRole('button', { name: 'Обновить', exact: true }).click();
        await p.locator('.crm-customer-name').filter({ hasText: 'Новый клиент' }).waitFor();
        assert.equal(await p.locator('.customer-row').count(), 3);
        await p.locator('.crm-customer-name').filter({ hasText: 'Новый клиент' }).click();
        assert.equal(await p.getByRole('dialog').getByLabel('Имя', { exact: true }).inputValue(), 'Новый клиент');
        await p.getByRole('dialog').getByRole('button', { name: 'Закрыть карточку' }).click();
        // The deliberate duplicate response is the only expected browser resource error.
        const unexpectedErrors = f.errors.filter(item => !JSON.stringify(item).includes('409 (Conflict)'));
        if (process.argv.includes('--customers-only')) {
          assert.deepEqual(writes, ['/customer-360/customers/editable', '/customer-360/customers']);
          for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
          assert.deepEqual(unexpectedErrors, []);
          checks.push(width + ': compact layout, filters/sort, contacts, scoped editing, tabs/keyboard, retained draft, create validation/duplicate/reload, fonts and bounds');
          continue;
        }
        await p.goto(origin + '/crm/organizations', { waitUntil: 'networkidle' });
        await p.locator('.org-row .crm-org-name').first().click(); dialog = p.getByRole('dialog');
        await dialog.getByLabel('Ответственный за клиента').selectOption(nextOwner.id);
        await dialog.getByRole('button', { name: 'Сохранить изменения' }).click();
        await p.getByText('Организация сохранена', { exact: true }).waitFor();
        await dialog.getByRole('tab', { name: 'Заказы', exact: true }).click();
        await dialog.getByText('Нет доступа к истории заказов', { exact: true }).waitFor();
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.screenshot({ path: path.join(output, width + '-organization.png') });
        assert.deepEqual(writes, ['/customer-360/customers/editable', '/customer-360/customers', '/customer-360/organizations/organization']);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(item => !JSON.stringify(item).includes('409 (Conflict)')), []);
        checks.push(width + ': scoped actions, owner selection/save, readable denied history, Mont headings/Montserrat controls, no document overflow');
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, width + '-failure.png') });
        console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic, writes })); throw error;
      } finally { await f.context.close(); }
    }
    if (!process.argv.includes('--customers-only')) {
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
      assert.match(await f.page.locator('.sb-storefront p').first().evaluate(el => getComputedStyle(el).fontFamily), /^Mont,/);
      await f.page.screenshot({ path: path.join(output, '390-storefront-font.png') });
      assert.deepEqual(f.traffic.externalRequests, []); assert.deepEqual(f.traffic.prohibitedWrites, []);
      checks.push('Public delivery page: actual Mont font rendered for headings and body');
    } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'Mocked; no integrations or live writes', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
