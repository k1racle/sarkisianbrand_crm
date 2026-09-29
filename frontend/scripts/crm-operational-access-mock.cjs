// API fixtures only. No production JWT, real writes, provider or database connections.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = 'http://127.0.0.1:3001';
async function main() {
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) for (const writable of [false, true]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...new Set([...access.permissions, 'oms.read', 'oms.write', 'marketplace.read', 'marketplace.write', 'helpdesk.read', 'helpdesk.write'])] });
      const order = { ...structuredClone(base.get('/oms/orders/qa-b2b-order')), canWrite: writable };
      const market = { ...structuredClone(base.get('/marketplaces/orders')[0]), canWrite: writable };
      const ticket = { id: 'ticket', number: 'HD-TEST', subject: 'Проверка поддержки', description: 'Пример обращения', source: 'EMPLOYEE', priority: 'MEDIUM', status: 'NEW', queue: 'Первая линия', assignedToId: 'mock-admin', canWrite: writable, comments: [], createdAt: '2026-09-28T10:00:00Z' };
      fixtures.set('/oms/orders/list', { items: [order], total: 1, page: 1, pages: 1 }); fixtures.set('/oms/orders/qa-b2b-order', order);
      fixtures.set('/marketplaces/orders', [market]); fixtures.set('/helpdesk/tickets', [ticket]); fixtures.set('/helpdesk/agents', [{ id: 'mock-admin', firstName: 'Анна', lastName: 'Соколова' }]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true }), p = f.page, writes = [];
      await p.route('**/api/v1/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname.replace('/api/v1', '');
        const known = ['/oms/orders/qa-b2b-order', '/marketplaces/orders/qa-market-order', '/helpdesk/tickets/ticket', '/helpdesk/tickets/ticket/comments'].includes(path);
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, POST' };
        if (known && req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (known && ['PATCH', 'POST'].includes(req.method())) {
          assert.ok(writable, 'Read-only record attempted a write'); const body = req.postDataJSON(); writes.push({ path, body });
          const result = path.includes('/comments') ? { id: 'comment', ...body, createdAt: ticket.createdAt } : Object.assign(path.includes('/helpdesk/') ? ticket : path.includes('/marketplaces/') ? market : order, body);
          return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(result) });
        }
        return route.fallback();
      });
      try {
        await p.goto(origin + '/crm/b2b-orders', { waitUntil: 'networkidle' });
        await p.locator('.crm-record-list button').first().click();
        const dialog = p.getByRole('dialog');
        assert.equal(await dialog.getByLabel(/^Статус/).isEnabled(), writable);
        assert.equal(await dialog.getByRole('button', { name: 'Сохранить', exact: true }).count(), writable ? 1 : 0);
        if (writable) { await dialog.getByLabel('Внутренняя заметка').fill('Mock note'); const saved = p.waitForResponse(r => r.url().includes('/oms/orders/list')); await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click(); await saved; }
        await p.getByRole('button', { name: 'Закрыть заказ', exact: true }).click();
        await p.goto(origin + '/crm/marketplaces/orders', { waitUntil: 'networkidle' });
        await p.locator('.order-row.clickable').first().click();
        assert.equal(await p.locator('.order-actions button').count() > 0, writable);
        if (writable) { const saved = p.waitForResponse(r => r.request().method() === 'PATCH'); await p.locator('.order-actions button').first().click(); await saved; }
        await p.getByRole('button', { name: 'Закрыть заказ маркетплейса' }).click();
        await p.locator('.order-row.clickable').first().click({ button: 'right' });
        assert.equal(await p.getByText(/^Статус:/).count() > 0, writable); await p.keyboard.press('Escape');
        await p.goto(origin + '/crm/support/tickets', { waitUntil: 'networkidle' });
        await p.locator('.ticket-row[role=button]').first().click();
        const panel = p.locator('.ticket-detail');
        assert.equal(await panel.getByLabel(/^Статус/).isEnabled(), writable);
        assert.equal(await panel.getByRole('button', { name: 'Решить заявку', exact: true }).count(), writable ? 1 : 0);
        assert.equal(await panel.locator('.reply').count(), writable ? 1 : 0);
        if (writable) {
          const changed = p.waitForResponse(r => r.request().method() === 'PATCH'); await panel.getByLabel(/^Статус/).selectOption('OPEN'); await changed;
          await panel.locator('.reply textarea').fill('Mock comment'); const saved = p.waitForResponse(r => r.request().method() === 'POST'); await panel.getByRole('button', { name: 'Сохранить комментарий' }).click(); await saved;
          await p.getByText('Комментарий сохранён', { exact: true }).waitFor();
        }
        await p.getByRole('button', { name: 'Закрыть заявку' }).click();
        await p.locator('.ticket-row[role=button]').first().click({ button: 'right' });
        assert.equal(await p.getByText('Отметить решённой', { exact: true }).count(), writable ? 1 : 0);
        assert.equal(writes.length, writable ? 4 : 0);
        for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors, []);
        console.log(`${width}px ${writable ? 'editable' : 'read-only'}: B2B + marketplaces + support, fields/actions/context menus. Mock writes: ${writes.length}; real writes: 0.`);
      } catch (error) { console.error({ errors: f.errors, traffic: f.traffic, alerts: await p.locator('[role=alert]').allTextContents() }); throw error; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
