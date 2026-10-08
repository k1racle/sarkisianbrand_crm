// Organization workflow acceptance. Synthetic auth and fixture writes only.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-organizations');
async function bounds(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document overflow');
  const failures = await page.locator('.crm-org-row, .crm-org-dialog').evaluateAll(nodes => nodes.flatMap(node => {
    const outer = node.getBoundingClientRect();
    return [...node.querySelectorAll('button,input,select,textarea,a')].flatMap(el => {
      if (!el.getClientRects().length) return [];
      const box = el.getBoundingClientRect();
      return box.left < outer.left - 1 || box.right > outer.right + 1 || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 2) ? [el.textContent || el.getAttribute('aria-label')] : [];
    });
  }));
  assert.deepEqual(failures, [], 'Controls and their text fit the card');
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try {
    for (const width of [360, 390, 768, 1440]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'customers.read', 'customers.write'] });
      fixtures.set('/staff-notifications', { items: [], fresh: [], unreadCount: 0, nextCursor: null, through: '2026-10-08T00:00:00Z', popupsEnabled: false });
      const owner = { id: 'mock-admin', firstName: 'Анна', lastName: 'Соколова', email: 'anna@example.invalid' };
      const colleague = { id: 'colleague', firstName: 'Александра', lastName: 'Константинопольская', email: 'colleague@example.invalid' };
      const common = { status: 'ACTIVE', discountTier: 15, creditLimit: 0, accountManagerId: owner.id, accountManager: owner, canWrite: true, updatedAt: '2026-10-08T10:00:00Z', relatedAccess: { orders: true }, orders: [{ id: 'order', orderNumber: 'SB-B2B-2026-001', createdAt: '2026-10-08T10:00:00Z', finalAmount: 1989, status: 'CONFIRMED' }], members: [{ id: 'member', role: 'BUYER', user: { firstName: 'Анна', lastName: 'Волкова', email: 'anna.customer@example.invalid' } }], _count: { orders: 1, members: 1 } };
      const rows = [
        { ...common, id: 'editable', name: 'Студия красоты «Форма»', legalName: 'ООО «Студия Форма»', inn: '7700123456', kpp: '770001001' },
        { ...common, id: 'readonly', name: 'Профессиональная школа парикмахерского искусства и косметологии', legalName: 'ИП Александрова Елена Константиновна', inn: '770123456789', canWrite: false, accountManager: colleague, accountManagerId: colleague.id, relatedAccess: { orders: false }, orders: [], _count: { orders: 0, members: 1 } },
        { ...common, id: 'unassigned', name: 'Новый партнёр', status: 'PROSPECT', accountManagerId: null, accountManager: null }
      ];
      fixtures.set('/customer-360/team', [owner, colleague]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const writes = [], cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' };
      await f.context.route('**/api/v1/customer-360/organizations**', async route => {
        const req = route.request(), url = new URL(req.url()), id = url.pathname.split('/organizations/')[1];
        const reply = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        if (req.method() === 'GET') {
          const query = (url.searchParams.get('search') || '').toLowerCase(), status = url.searchParams.get('status');
          return reply(id ? rows.find(row => row.id === id) : rows.filter(row => (!status || row.status === status) && (!query || [row.name, row.legalName, row.inn].join(' ').toLowerCase().includes(query))));
        }
        const body = req.postDataJSON();
        if (req.method() === 'PATCH') {
          assert.equal(id, 'editable', 'Read-only rows cannot be modified');
          assert.equal(body.accountManagerId, colleague.id);
          Object.assign(rows[0], body, { accountManager: colleague }); writes.push('patch'); return reply(rows[0]);
        }
        assert.equal(req.method(), 'POST'); assert.equal(body.name, 'Новая компания'); assert.equal(body.inn, '7712345678'); assert.equal(body.accountManagerId, owner.id);
        const row = { ...common, ...body, id: 'created', updatedAt: '2026-10-08T12:00:00Z', orders: [], members: [], _count: { orders: 0, members: 0 } };
        rows.push(row); writes.push('create'); return reply(row, 201);
      });
      try {
        const p = f.page;
        await p.goto(origin + '/crm/organizations', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
        await bounds(p);
        if (width >= 1280) {
          const positions = await p.locator('.crm-org-tools > :not(button):visible').evaluateAll(els => els.map(el => el.getBoundingClientRect().y));
          assert.ok(Math.max(...positions) - Math.min(...positions) < 2);
          assert.ok((await p.locator('.org-row').first().boundingBox()).height < 130);
        } else {
          assert.equal(await p.getByLabel('Ответственный менеджер', { exact: true }).isVisible(), false);
        }
        if (width <= 390) assert.ok((await p.locator('.org-row').first().boundingBox()).y < 400);
        await p.screenshot({ path: path.join(output, width + '-registry.png'), fullPage: true });
        await p.getByLabel('Поиск организаций').fill('7700123456');
        await p.waitForFunction(() => document.querySelectorAll('.org-row').length === 1);
        await p.getByRole('button', { name: 'Очистить поиск' }).click();
        await p.waitForFunction(() => document.querySelectorAll('.org-row').length === 3);
        if (width < 1280) await p.getByRole('button', { name: /^Фильтры и сортировка/ }).click();
        await p.getByLabel('Ответственный менеджер', { exact: true }).selectOption('unassigned');
        assert.equal(await p.locator('.org-row').count(), 1);
        assert.match(await p.locator('.org-row').textContent(), /Новый партнёр/);
        await p.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        await p.getByLabel('Сортировка организаций').selectOption('name');
        assert.match(await p.locator('.org-row').first().textContent(), /Новый партнёр/);
        await p.getByLabel('Сортировка организаций').selectOption('updated');
        if (width <= 390) await p.getByLabel('Статус организации', { exact: true }).selectOption('PROSPECT');
        else await p.getByRole('button', { name: 'Потенциальные', exact: true }).click();
        await p.waitForFunction(() => document.querySelectorAll('.org-row').length === 1);
        await p.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click();
        await p.waitForFunction(() => document.querySelectorAll('.org-row').length === 3);
        if (width < 1280) await p.getByRole('button', { name: /^Фильтры и сортировка/ }).click();
        const editable = p.locator('.org-row').filter({ hasText: 'Студия красоты' });
        await editable.locator('.crm-org-assign').click();
        let dialog = p.getByRole('dialog');
        assert.ok(await dialog.getByLabel('Ответственный за клиента').evaluate(el => el === document.activeElement));
        await dialog.getByLabel('Ответственный за клиента').selectOption(colleague.id);
        await dialog.getByRole('tab', { name: 'Реквизиты', exact: true }).click();
        await dialog.getByLabel('КПП', { exact: true }).fill('770002002');
        await p.keyboard.press('Escape');
        assert.ok(await dialog.isVisible(), 'Discard cancellation retains the draft');
        await dialog.getByRole('tab', { name: 'Основное', exact: true }).click();
        assert.equal(await dialog.getByLabel('Ответственный за клиента').inputValue(), colleague.id);
        await dialog.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
        await p.getByText('Организация сохранена', { exact: true }).waitFor();
        await bounds(p);
        await p.screenshot({ path: path.join(output, width + '-profile.png') });
        await dialog.getByRole('tab', { name: 'Основное', exact: true }).focus(); await p.keyboard.press('ArrowRight');
        assert.equal(await dialog.getByRole('tab', { name: 'Реквизиты', exact: true }).getAttribute('aria-selected'), 'true');
        assert.equal(await dialog.getByLabel('КПП', { exact: true }).inputValue(), '770002002');
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await editable.getByRole('button', { name: /Представители/ }).click(); dialog = p.getByRole('dialog');
        await dialog.getByText('Анна Волкова', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await editable.getByRole('button', { name: /Заказы/ }).click(); dialog = p.getByRole('dialog');
        await dialog.getByText('SB-B2B-2026-001', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        const readonly = p.locator('.org-row').filter({ hasText: 'Профессиональная школа' });
        assert.equal(await readonly.locator('.crm-org-assign').count(), 0);
        await readonly.locator('.crm-org-name').click(); dialog = p.getByRole('dialog');
        assert.ok(await dialog.getByLabel('Название компании', { exact: true }).isDisabled());
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить изменения' }).isDisabled());
        await dialog.getByRole('tab', { name: 'Заказы', exact: true }).click();
        await dialog.getByText('Нет доступа к истории заказов', { exact: true }).waitFor();
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.getByRole('button', { name: 'Добавить организацию', exact: true }).click(); dialog = p.getByRole('dialog');
        await dialog.getByRole('heading', { name: 'Новая организация' }).waitFor();
        await dialog.getByRole('tab', { name: 'Реквизиты', exact: true }).click();
        await dialog.getByRole('button', { name: 'Создать организацию' }).click();
        await dialog.getByText('Укажите название организации', { exact: true }).waitFor();
        assert.equal(writes.length, 1, 'Invalid create does not make a request');
        await dialog.getByLabel('Название компании', { exact: true }).fill('Новая компания');
        assert.equal(await dialog.getByRole('alert').count(), 0, 'Corrected name clears the validation error');
        await dialog.locator('summary').click();
        await dialog.getByLabel('Кредитный лимит, ₽', { exact: true }).fill('-1');
        await dialog.locator('summary').click();
        await dialog.getByRole('tab', { name: 'Реквизиты', exact: true }).click();
        await dialog.getByRole('button', { name: 'Создать организацию' }).click();
        assert.equal(await dialog.getByRole('tab', { name: 'Основное', exact: true }).getAttribute('aria-selected'), 'true');
        assert.ok(await dialog.getByLabel('Кредитный лимит, ₽', { exact: true }).isVisible(), 'Hidden invalid field is revealed');
        assert.equal(writes.length, 1);
        await dialog.getByLabel('Кредитный лимит, ₽', { exact: true }).fill('0');
        await dialog.getByRole('tab', { name: 'Реквизиты', exact: true }).click();
        await dialog.getByLabel('ИНН', { exact: true }).fill('7712345678');
        await bounds(p); await p.screenshot({ path: path.join(output, width + '-create.png') });
        await dialog.getByRole('button', { name: 'Создать организацию' }).click();
        await p.getByText('Организация создана', { exact: true }).waitFor();
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить изменения' }).isDisabled());
        await dialog.getByRole('button', { name: 'Закрыть карточку' }).click();
        await p.getByRole('button', { name: 'Обновить', exact: true }).click();
        await p.locator('.org-row').filter({ hasText: 'Новая компания' }).waitFor();
        assert.equal(await p.locator('.org-row').count(), 4);
        assert.deepEqual(writes, ['patch', 'create']);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors, []);
        checks.push(width + ': responsive list/long names, search/status/owner/sort, manager focus/save, draft guard, tabs/keyboard, related history, readonly, create/validation/reload');
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, width + '-failure.png') }); console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic, writes })); throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, screenshots: output, api: 'Fixtures only' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
