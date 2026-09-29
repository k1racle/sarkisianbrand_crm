// Isolated browser fixtures only. All APIs are intercepted; never uses a real JWT or database.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = 'http://127.0.0.1:3001';
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE' };
const report = { access: { sales: false, customers: false, inventory: false, crm: false, helpdesk: false }, sales: { revenue: null, orders: null, averageOrder: null, previousRevenue: null, growth: null }, customers: { total: null, new: null }, operations: { lowStock: null, openLeads: null, activeTasks: null, helpdeskOpen: null, helpdeskOverdue: null }, channels: [], recentOrders: [] };
const entry = { id: 'trash-one', entityType: 'CUSTOMER', entityId: 'customer-one', displayName: 'Тестовый клиент', status: 'TRASHED', trashedAt: '2026-09-01T00:00:00Z', purgeAfter: '2026-10-01T00:00:00Z', canRestore: true };

async function main() {
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...new Set([...access.permissions, 'system.manage', 'leadership.read'])] });
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true }), p = f.page;
      let mode = 'readonly', reportFailed = false, reportZero = false, writes = [], requestedPages = [];
      await p.route('**/api/v1/**', async route => {
        const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api/v1', '');
        if (path !== '/leadership/overview' && !path.startsWith('/data-lifecycle/')) return route.fallback();
        const send = (body, status = 200) => route.fulfill({ headers, status, contentType: 'application/json', body: JSON.stringify(body) });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (path === '/leadership/overview') {
          if (reportFailed) return send({ message: 'Нет доступа к отчёту' }, 403);
          if (reportZero) return send({ ...report, access: { sales: true, customers: true, inventory: true, crm: true, helpdesk: true }, sales: { revenue: 0, orders: 0, averageOrder: 0, previousRevenue: 0, growth: 0 }, customers: { total: 0, new: 0 }, operations: { lowStock: 0, openLeads: 0, activeTasks: 0, helpdeskOpen: 0, helpdeskOverdue: 0 } });
          return send(report);
        }
        if (path === '/data-lifecycle/trash') { const page = Number(url.searchParams.get('page') || 1); requestedPages.push(page); return send({ items: [{ ...entry, canRestore: mode !== 'readonly' }], total: 51, page, pages: 2, retentionDays: 30, automaticPurge: false }); }
        if (path.endsWith('/preview')) {
          if (mode === 'failure') return send({ message: 'Объект не найден или недоступен' }, 404);
          return send({ canRestore: mode === 'restore', canPurge: mode === 'purge', dependencies: mode === 'purge' ? [] : [{ key: 'restricted', label: 'Связи в закрытых разделах', count: null, blocking: true }] });
        }
        if (path === '/data-lifecycle/trash/trash-one/restore' && req.method() === 'POST') { assert.equal(mode, 'restore'); writes.push('restore'); return send({ restored: true }); }
        if (path === '/data-lifecycle/trash/trash-one' && req.method() === 'DELETE') { assert.equal(mode, 'purge'); assert.equal(req.postDataJSON().confirmation, entry.displayName); writes.push('purge'); return send({ purged: true }); }
        throw new Error('Unexpected lifecycle request: ' + req.method() + ' ' + path);
      });
      try {
        await p.goto(origin + '/crm/reports/overview', { waitUntil: 'networkidle' });
        assert.deepEqual(await p.locator('.hero-kpis article > strong').allTextContents(), ['—', '—', '—', '—']);
        await p.getByText('Нет доступа к данным продаж', { exact: true }).waitFor();
        const standardTint = await p.locator('.revenue').evaluate(el => getComputedStyle(el).backgroundColor);
        if (width === 1440) await p.screenshot({ path: '.screenshots/crm-report-access-1440.png' });
        reportZero = true; await p.getByRole('button', { name: 'Обновить данные' }).click();
        await p.getByText('В доступной области пока нет подтверждённых оплат', { exact: true }).waitFor();
        assert.deepEqual(await p.locator('.hero-kpis article > strong').allTextContents(), ['0 ₽', '0', '0', '0']);
        reportFailed = true; await p.getByRole('button', { name: 'Обновить данные' }).click();
        await p.getByText('Нет доступа к отчёту', { exact: true }).waitFor(); assert.equal(await p.locator('.hero-kpis').count(), 0);

        await p.goto(origin + '/crm/settings/trash', { waitUntil: 'networkidle' });
        await p.locator('.trash-row:not(.head)').first().click();
        const panel = p.locator('.trash-drawer');
        await panel.getByText('Удаление сейчас запрещено', { exact: true }).waitFor();
        assert.equal(await panel.getByRole('button', { name: 'Восстановить', exact: true }).count(), 0);
        await panel.getByText('Недоступно', { exact: true }).waitFor();
        await panel.getByText('блокирует удаление', { exact: true }).waitFor();
        assert.equal(await panel.getByRole('note').evaluate(el => getComputedStyle(el).backgroundColor), standardTint, 'Trash uses the common CRM tint');
        for (const height of await panel.locator('.crm-detail-section').evaluateAll(items => items.map(el => el.getBoundingClientRect().height))) assert.ok(height < 330, 'Detail sections must not stretch to fill the drawer');
        if (width === 1440) await p.screenshot({ path: '.screenshots/crm-trash-access-1440.png' });
        await p.getByRole('button', { name: 'Закрыть карточку корзины' }).click();
        await p.getByRole('button', { name: 'Далее', exact: true }).click();
        await p.locator('.trash-card footer').getByText('2 / 2', { exact: true }).waitFor();
        assert.ok(requestedPages.includes(2));
        for (const state of ['failure', 'restore', 'purge']) {
          mode = state; const reloaded = p.waitForResponse(r => r.url().includes('/data-lifecycle/trash') && r.request().method() === 'GET');
          await p.locator('.trash-card button[title="Обновить"]').click(); await reloaded;
          await p.locator('.trash-row:not(.head)').first().click();
          if (state === 'failure') {
            await panel.getByRole('alert').waitFor(); assert.equal(await panel.locator('.restore-block, .danger-zone input').count(), 0);
            await p.getByRole('button', { name: 'Закрыть карточку корзины' }).click();
          } else if (state === 'restore') {
            const restore = panel.getByRole('button', { name: 'Восстановить', exact: true }); await restore.waitFor();
            await restore.click(); await p.getByText('Данные восстановлены', { exact: true }).waitFor();
          } else {
            const purge = panel.getByRole('button', { name: 'Удалить без возможности восстановления', exact: true }); await purge.waitFor();
            assert.equal(await purge.isDisabled(), true);
            await panel.locator('.danger-zone input').first().fill('Неправильное название');
            await panel.locator('input[type=password]').fill('unit-password'); assert.equal(await purge.isDisabled(), true);
            await panel.locator('.danger-zone input').first().fill(entry.displayName); assert.equal(await purge.isEnabled(), true);
            await purge.click(); await p.getByText('Данные окончательно удалены', { exact: true }).waitFor();
          }
        }
        assert.deepEqual(writes, ['restore', 'purge']);
        for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        // The two deliberate negative API responses above appear in Chromium's console.
        assert.deepEqual(f.errors, [
          'console: Failed to load resource: the server responded with a status of 403 (Forbidden)',
          'console: Failed to load resource: the server responded with a status of 404 (Not Found)',
        ]);
        console.log(`${width}px: report denied/zero/API failure; trash read-only/preview failure/pagination/restore/purge guards. Mock writes 2, real writes 0.`);
      } catch (error) { console.error({ errors: f.errors, traffic: f.traffic, alerts: await p.locator('[role=alert]').allTextContents() }); throw error; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
