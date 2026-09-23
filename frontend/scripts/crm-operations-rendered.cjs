// Only in-memory responses are mutated; no requests reach the application's API.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
async function main() {
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      let order = structuredClone(base.get('/oms/orders/qa-b2b-order')), departments = [], publication = structuredClone(base.get('/crm/content-plan/qa-publication'));
      const fixtures = new Map(base), writes = [];
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const p = f.page;
      await p.route('**/api/v1/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '');
        const cors = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3001', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH' };
        if (req.method() === 'OPTIONS' && ['/oms/orders/qa-b2b-order', '/system-settings/departments', '/crm/content-plan/qa-publication'].includes(path)) return route.fulfill({ status: 204, headers: cors });
        const send = value => route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(value) });
        if (path === '/crm/content-plan/qa-publication' && req.method() === 'PATCH') {
          const body = req.postDataJSON(); writes.push({ path, body });
          publication = { ...publication, ...body, version: publication.version + 1, task: { ...publication.task, title: body.title } };
          return send(publication);
        }
        if (path === '/oms/orders/qa-b2b-order' && req.method() === 'PATCH') {
          const body = req.postDataJSON(); writes.push({ path, body }); order = { ...order, ...body }; return send(order);
        }
        if (path === '/oms/orders/qa-b2b-order' && req.method() === 'GET') return send(order);
        if (path === '/oms/orders/list' && req.method() === 'GET') { assert.equal(url.searchParams.get('source'), 'B2B'); return send({ items: [order], total: 1, page: 1, pages: 1 }); }
        if (path === '/system-settings/departments' && req.method() === 'GET') return send(departments);
        if (path === '/system-settings/departments' && req.method() === 'POST') {
          const body = req.postDataJSON(); writes.push({ path, body });
          const team = base.get('/system-settings/staff');
          const department = { id: 'created-department', ...body, version: 1, members: team.filter(p => body.memberIds.includes(p.id)), leader: team.find(p => p.id === body.leaderId) };
          departments.push(department); return send(department);
        }
        return route.fallback();
      });
      try {
        await p.goto('http://127.0.0.1:3001/crm/b2b-orders', { waitUntil: 'networkidle' });
        await p.locator('.crm-record-list button').first().click();
        await p.getByRole('dialog').getByLabel(/^Статус/).selectOption('ASSEMBLING');
        await p.getByLabel('Внутренняя заметка').fill('Собрать первую поставку');
        const savedOrder = p.waitForResponse(response => response.url().endsWith('/oms/orders/qa-b2b-order') && response.request().method() === 'PATCH');
        await p.getByRole('button', { name: 'Сохранить', exact: true }).click();
        assert.equal((await savedOrder).status(), 200);
        assert.equal(writes[0].body.status, 'ASSEMBLING');
        assert.equal(writes[0].body.internalNotes, 'Собрать первую поставку');
        await p.getByRole('button', { name: 'Закрыть заказ', exact: true }).click();
        await p.goto('http://127.0.0.1:3001/crm/settings/departments', { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: 'Новый отдел', exact: true }).click();
        await p.getByLabel('Название', { exact: true }).fill('  Маркетинг  ');
        await p.getByRole('checkbox').first().check();
        await p.getByRole('dialog').getByLabel(/^Руководитель/).selectOption('mock-admin');
        await p.getByRole('button', { name: 'Сохранить отдел', exact: true }).click();
        await p.locator('.crm-register').getByText('Маркетинг', { exact: true }).waitFor();
        assert.equal(writes.length, 2);
        assert.deepEqual(writes[1].body, { name: 'Маркетинг', parentId: null, leaderId: 'mock-admin', memberIds: ['mock-admin'] });
        await p.goto('http://127.0.0.1:3001/crm/content-plan', { waitUntil: 'networkidle' });
        await p.locator('.crm-publication').first().click();
        const panel = p.locator('.crm-content-editor');
        await panel.getByLabel('Тема публикации', { exact: true }).fill('Новый сценарий');
        await panel.getByRole('button', { name: 'Сохранить', exact: true }).click();
        await p.getByText('Публикация сохранена', { exact: true }).waitFor();
        assert.equal(writes.length, 3); assert.equal(writes[2].body.title, 'Новый сценарий');
        for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors, []);
        console.log(`${width}px: B2B status + notes, department + member + leader, publication via fixed drawer footer saved. Real writes: 0.`);
      } catch (error) { console.error({ errors: f.errors, traffic: f.traffic, alerts: await p.locator('[role=alert]').allTextContents() }); throw error; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
