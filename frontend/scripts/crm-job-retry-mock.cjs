// Synthetic sessions + intercepted API only; no real queue, write, database or provider request.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-job-retry');
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST' };
function deferred() { let resolve; const promise = new Promise(fn => resolve = fn); return { promise, resolve }; }
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'system.manage'] });
      const f = await isolatedContext(browser, width, false, false, { fixtures }), p = f.page;
      let eligible = true, failure = false, writes = 0, pending = null, failRead = false;
      const row = (id, jobName, canRetry, attempts, retryReason) => ({ id, jobName, canRetry, retryReason, attempts, maxAttempts: 1,
        status: 'FAILED', progress: 0, correlationId: 'chain-fixture', createdAt: '2026-09-28T10:00:00Z' });
      await f.context.route('**/api/v1/system-settings/**', async route => {
        const req = route.request(), endpoint = new URL(req.url()).pathname.split('/api/v1')[1];
        if (!['/system-settings/logs', '/system-settings/jobs/safe/retry'].includes(endpoint)) return route.fallback();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        const send = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
        if (endpoint.endsWith('/retry')) {
          assert.equal(req.method(), 'POST'); writes++;
          if (pending) { const wait = pending; pending = null; wait.started.resolve(); await wait.release.promise; }
          eligible = false;
          return failure ? send({ message: 'Недостаточно прав на исходную операцию' }, 403) : send({ reused: false, job: { id: 'retry', status: 'WAITING' } });
        }
        assert.equal(req.method(), 'GET');
        if (failRead) return send({ message: 'Журнал недоступен' }, 403);
        return send({ sync: [], integrations: [], recentAudit: [], detailsRestricted: true, queue: { connected: true, workerEnabled: false },
          jobs: [
            row('safe', 'MARKETPLACE_ORDERS_IMPORT', eligible, 0, eligible ? null : 'Нет доступа к исходной операции или её инициатору'),
            row('started', '1C_ORDER_EXPORT', false, 1, 'Операция уже начиналась. Сначала сверьте результат; повтор может изменить данные второй раз'),
            row('unknown', 'FIXTURE_UNKNOWN', false, 0, 'Для этой операции нет безопасного сценария повтора'),
          ] });
      });
      try {
        await p.goto(origin + '/crm/settings/logs', { waitUntil: 'networkidle' });
        const rows = p.locator('.job-row:not(.head)'), button = p.getByRole('button', { name: 'Повторить постановку в очередь', exact: true });
        await button.waitFor(); assert.equal(await button.count(), 1);
        await rows.filter({ hasText: 'Выгрузка заказа в 1С' }).click({ button: 'right' });
        assert.equal(await p.getByText('Повторить операцию', { exact: true }).count(), 0, 'Context menu has no forbidden replay');
        await p.keyboard.press('Escape');
        await rows.filter({ hasText: 'Импорт заказов маркетплейсов' }).click({ button: 'right' });
        await p.getByText('Повторить операцию', { exact: true }).waitFor();
        await p.keyboard.press('Escape');
        await button.scrollIntoViewIfNeeded();
        const bounds = await button.boundingBox();
        assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, 'Retry action fits viewport without horizontal scrolling');
        const reason = rows.filter({ hasText: 'Выгрузка заказа в 1С' }).locator('small');
        assert.equal(await reason.evaluate(el => getComputedStyle(el).whiteSpace), 'normal', 'Restriction reason wraps instead of being truncated');
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Journal does not overflow the page');
        await p.screenshot({ path: path.join(output, width + '-capabilities.png') });
        const wait = pending = { started: deferred(), release: deferred() };
        await button.click(); await wait.started.promise;
        assert.equal(await button.isDisabled(), true, 'Second click is disabled while retry is pending');
        await button.evaluate(el => el.click()); assert.equal(writes, 1);
        wait.release.resolve();
        await p.getByText('Повтор создан. Выполнение начнётся, когда автоматика включена', { exact: true }).waitFor();
        await button.waitFor({ state: 'detached' });

        eligible = true; failure = true;
        await p.getByRole('button', { name: 'Обновить', exact: true }).click();
        await button.waitFor();
        await rows.filter({ hasText: 'Импорт заказов маркетплейсов' }).click({ button: 'right' });
        await p.getByText('Повторить операцию', { exact: true }).click();
        await p.getByText('Недостаточно прав на исходную операцию', { exact: true }).waitFor();
        await button.waitFor({ state: 'detached' });
        assert.equal(writes, 2, 'No implicit retry on 403');
        failRead = true; await p.getByRole('button', { name: 'Обновить', exact: true }).click();
        await p.getByRole('alert').getByText('Журнал недоступен', { exact: true }).waitFor();
        assert.equal(await rows.count(), 0, 'Old operations disappear when journal access fails');
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(value => value !== 'console: Failed to load resource: the server responded with a status of 403 (Forbidden)'), []);
        checks.push(width + ': capability/reason, contextual menu, one pending request, server revocation, failed journal read; mock writes: ' + writes);
      } catch (error) {
        await p.screenshot({ path: path.join(output, width + '-failure.png') });
        console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic })); throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, screenshots: output, integrations: 'Not called' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
