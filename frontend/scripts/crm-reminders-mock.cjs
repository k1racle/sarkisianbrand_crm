// Browser regression using synthetic sessions and mocked API; real writes blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, task } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-reminders');

async function notify(page) {
  await page.evaluate(() => {
    const state = document.getElementById('__nuxt').__vue_app__.config.globalProperties.$nuxt.payload.state;
    state['$splatform-chat-last-reminder'] = { id: 'fixture-reminder', receivedAt: Date.now() };
  });
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  const checks = [];
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map([...base,
        ['/auth/access', { role: 'EXECUTIVE', permissions: ['crm.read', 'customers.read'], denied: [] }],
        ['/crm/reminders', [{ id: 'fixture-reminder', remindAt: '2026-09-01T08:00:00Z', task: { id: task.id, title: task.title, dueDate: task.dueDate, priority: task.priority } }]],
      ]);
      const f = await isolatedContext(browser, width, false, false, { actor: { role: 'EXECUTIVE' }, fixtures });
      try {
        const page = f.page;
        await page.goto(`${origin}/crm`, { waitUntil: 'networkidle' });
        const center = page.locator('.reminder-center');
        await center.getByText(task.title, { exact: true }).waitFor();
        assert.equal(await center.getByTitle('Скрыть напоминание').count(), 0, 'Read-only access has no dismissal write');
        const box = await center.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, 'Reminder fits the viewport');
        const topbar = await page.locator('.crm-topbar').boundingBox();
        assert.ok(topbar && box.y >= topbar.y + topbar.height, 'Reminder does not cover the navigation header');
        const row = await center.locator('article').boundingBox(), open = await center.locator('button.open').boundingBox();
        assert.ok(row && open && Math.abs(row.width - open.width) <= 1, 'No empty action column in read-only mode');
        const colors = await center.locator('header').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, tint: getComputedStyle(el).getPropertyValue('--crm-tint').trim() }));
        assert.equal(colors.background, 'rgb(241, 238, 255)', 'Header uses the canonical CRM tint');
        await page.screenshot({ path: path.join(output, `${width}-readonly.png`) });
        await center.getByTitle('Свернуть', { exact: true }).click();
        const collapsed = await center.boundingBox(), expand = await center.getByTitle('Развернуть', { exact: true }).boundingBox();
        assert.ok(collapsed && expand && expand.x + expand.width <= collapsed.x + collapsed.width + 1, 'Expand control stays inside the collapsed panel');
        await center.getByTitle('Развернуть', { exact: true }).click();
        await center.locator('button.open').click();
        await page.getByRole('dialog', { name: 'Карточка задачи' }).waitFor();
        assert.equal(new URL(page.url()).pathname, '/crm/tasks');
        assert.equal(new URL(page.url()).searchParams.get('task'), task.id);

        let deny = true;
        await f.context.route('**/api/v1/crm/reminders', route => {
          if (!deny || route.request().method() !== 'GET') return route.fallback();
          return route.fulfill({ status: 403, headers: { 'Access-Control-Allow-Origin': origin }, contentType: 'application/json', body: '{"message":"Fixture revoked access"}' });
        });
        await notify(page);
        await center.waitFor({ state: 'detached' });
        deny = false;
        await notify(page);
        await center.getByText(task.title, { exact: true }).waitFor();
        await page.evaluate(() => {
          const state = document.getElementById('__nuxt').__vue_app__.config.globalProperties.$nuxt.payload.state;
          state['$sworkspace-access'] = { ...state['$sworkspace-access'], permissions: [], ready: true, loading: false, error: '' };
        });
        await center.waitFor({ state: 'detached' });
        await page.getByRole('heading', { name: 'Нет доступа к разделу', exact: true }).waitFor();
        assert.equal(await page.getByText(task.title, { exact: true }).count(), 0, 'Neither card nor reminder keeps revoked task text');
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(message => message !== 'console: Failed to load resource: the server responded with a status of 403 (Forbidden)'), []);
        checks.push(`${width}: read-only reminder, canonical task link, API rejection clears stale data, permission revocation clears card and reminder`);
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, `${width}-failure.png`) });
        console.error(JSON.stringify({ errors: f.errors, unknown: f.traffic.unknownReads }));
        throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'fixtures only; no real writes or external calls', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
