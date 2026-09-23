// Browser regression against a LOCAL build. All API reads are fixtures; all writes and external requests are blocked.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-launch-actions');
const checks = [];
const orders = ['NEW', 'DELIVERED'].map((status, i) => ({
  id: `launch-order-${i}`, orderNumber: `LAUNCH-${status}`, source: 'WEB', status,
  paymentStatus: i ? 'SUCCEEDED' : 'PENDING', reservationState: i ? 'CONSUMED' : 'ACTIVE',
  totalAmount: 1000, finalAmount: 1000, createdAt: '2026-09-23T10:00:00Z', items: [], history: [],
}));
function responses(write) {
  return new Map([...base,
    ['/admin/orders/list', { items: orders, total: 2, page: 1, limit: 24 }],
    ['/auth/access', { permissions: [...base.get('/auth/access').permissions, ...(write ? ['web_orders.write'] : [])] }],
  ]);
}
function assertIsolated(f) {
  for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
  assert.deepEqual(f.errors, [], 'No browser errors');
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const f = await isolatedContext(browser, width, false, false, { fixtures: responses(true) });
      const p = f.page;
      try {
        await p.goto(`${origin}/crm/marketplaces/overview`, { waitUntil: 'networkidle' });
        await p.locator('.dashboard-view').waitFor();
        assert.ok(await p.getByText('Всего заказов', { exact: true }).isVisible());
        assert.ok((await p.locator('.dashboard-view').innerText()).includes('Ozon'));
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow');
        await p.screenshot({ path: path.join(output, `${width}-marketplace-overview.png`) });
        checks.push(`${width}: overview renders with data`);
        await p.goto(`${origin}/crm/orders`, { waitUntil: 'networkidle' });
        const rows = p.locator(width < 800 ? '.studio-mobile-order' : '.studio-orders-table tbody tr');
        await rows.first().waitFor();
        for (const [index, expected] of [[0, ['Статус: Подтверждён', 'Статус: Отменён']], [1, []]]) {
          await rows.nth(index).click({ button: 'right' });
          const menu = p.locator('.workspace-context');
          await menu.waitFor();
          const menuActions = (await menu.getByRole('menuitem').allTextContents()).map(x => x.trim()).filter(x => x.startsWith('Статус:'));
          assert.deepEqual(menuActions, expected);
          await menu.getByRole('menuitem', { name: 'Открыть карточку', exact: true }).click();
          const drawer = p.locator('.order-drawer');
          await drawer.waitFor();
          const options = await drawer.locator('.studio-order-actions select option:not([value=""])').allTextContents();
          assert.deepEqual(options.map(x => `Статус: ${x.trim()}`), expected, 'Drawer and context menu expose the same actions');
          await p.screenshot({ path: path.join(output, `${width}-order-${index}.png`) });
          await drawer.getByRole('button', { name: 'Закрыть карточку заказа', exact: true }).click();
          checks.push(`${width}: ${orders[index].status} drawer/menu parity`);
        }
        assertIsolated(f);
      } finally { await f.context.close(); }
      const readonly = await isolatedContext(browser, width, false, false, { fixtures: responses(false) });
      try {
        const p = readonly.page;
        await p.goto(`${origin}/crm/orders`, { waitUntil: 'networkidle' });
        const row = p.locator(width < 800 ? '.studio-mobile-order' : '.studio-orders-table tbody tr').first();
        await row.waitFor();
        await row.click({ button: 'right' });
        const menu = p.locator('.workspace-context');
        await menu.waitFor();
        assert.ok(!(await menu.innerText()).includes('Статус:'));
        await menu.getByRole('menuitem', { name: 'Открыть карточку', exact: true }).click();
        await p.locator('.order-drawer').waitFor();
        assert.equal(await p.locator('.studio-order-actions').count(), 0);
        assertIsolated(readonly);
        checks.push(`${width}: read-only cannot change status in either entry point`);
      } finally { await readonly.context.close(); }
    }
    for (const scenario of ['empty-overview', 'failed-overview', 'failed-access']) {
      const fixture = responses(true);
      if (scenario === 'empty-overview') fixture.set('/marketplaces/orders', []);
      const failures = scenario === 'failed-overview' ? ['/marketplaces/orders'] : scenario === 'failed-access' ? ['/auth/access'] : [];
      const f = await isolatedContext(browser, 1440, false, false, { fixtures: fixture, failures });
      try {
        const p = f.page;
        await p.goto(`${origin}${scenario === 'failed-access' ? '/crm/orders' : '/crm/marketplaces/overview'}`, { waitUntil: 'networkidle' });
        if (scenario === 'empty-overview') {
          await p.locator('.dashboard-view').waitFor();
          assert.ok(await p.getByText('Заказов пока нет', { exact: true }).isVisible());
          assert.equal((await p.locator('.dashboard-view .kpi-grid strong').first().innerText()).trim(), '0');
        } else if (scenario === 'failed-overview') {
          await p.locator('.marketplace-page [role="alert"]').waitFor();
          assert.equal(await p.locator('.dashboard-view').count(), 0, 'Failure is not displayed as an empty successful report');
        } else {
          const row = p.locator('.studio-orders-table tbody tr').first();
          await row.waitFor();
          await row.click({ button: 'right' });
          const menu = p.locator('.workspace-context');
          await menu.waitFor();
          assert.ok(!(await menu.innerText()).includes('Статус:'));
          await menu.getByRole('menuitem', { name: 'Открыть карточку', exact: true }).click();
          await p.locator('.order-drawer').waitFor();
          assert.equal(await p.locator('.studio-order-actions').count(), 0, 'Access lookup failure must not enable writes');
        }
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(error => !error.startsWith('console: Failed to load resource: the server responded with a status of 503')), []);
        checks.push(scenario);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: checks.length, checks, screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
