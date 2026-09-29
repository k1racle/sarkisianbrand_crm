/* Built local UI + synthetic sessions. All API traffic isolated; no business writes. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { assertWidth, assertTypography } = require('./crm-workspace-smoke.cjs');
const { fixtures: rich } = require('./crm-rich-fixtures.cjs');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = 'http://127.0.0.1:3001';
const output = path.resolve(__dirname, '../.screenshots/crm-navigation');
const fixtures = new Map([...rich, ['/platform-chat/channels', []]]);
const expectedGroups = ['Мой день','Клиенты и продажи','Заказы и исполнение','Финансы','Команда','Маркетинг и партнёры','Поддержка','Аналитика','Настройки CRM'];
async function menu(page, width) {
  if (width < 1024 && await page.locator('.crm-app-sidebar.is-open').count() === 0) await page.getByRole('button', { name:'Открыть разделы CRM', exact:true }).click();
}
async function search(page, value) {
  await page.getByRole('button', { name:'Найти раздел CRM', exact:true }).click();
  await page.getByRole('searchbox', { name:'Название раздела CRM' }).fill(value);
}
async function clean(f) {
  for (const key of ['unknownReads','prohibitedWrites','externalRequests','credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
  assert.deepEqual(f.errors, [], 'No browser errors');
}
async function main() {
  fs.mkdirSync(output, { recursive:true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  let scenarios = 0;
  try {
    for (const width of [390, 1440]) {
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      const page = f.page;
      try {
        await page.goto(base + '/crm/', { waitUntil:'networkidle' });
        await menu(page, width);
        assert.deepEqual(await page.locator('.crm-navigation > section[aria-label] > h2').allTextContents(), expectedGroups);
        assert.equal(await page.locator('.crm-navigation a[href="/crm/buyers"]').count(), 0);
        assert.equal(await page.locator('.crm-nav-module[open]').count(), 0);
        const summary = page.locator('[data-module="bloggers"] > summary');
        await summary.focus(); await summary.press('Enter');
        await page.locator('[data-module="bloggers"][open]').waitFor();
        assert.ok((await summary.boundingBox()).height >= 44, 'Touch-sized group header');
        await page.locator('[data-module="bloggers"] a[href="/crm/bloggers/settings"]').click();
        await page.waitForURL('**/crm/bloggers/settings');
        await page.locator('.crm-frame h1').filter({ hasText:'Настройки блогеров' }).waitFor();
        assert.equal(await page.locator('.crm-app-sidebar.is-open').count(), 0, 'Mobile menu closes on navigation');
        assert.equal(await page.locator('.crm-section-title strong').textContent(), 'Настройки блогеров');
        assert.match(await page.locator('.crm-breadcrumbs').innerText(), /Маркетинг и партнёры[\s\S]*Блогеры[\s\S]*Настройки блогеров/);
        assert.equal(await page.locator('.crm-section-links [aria-current="page"]').textContent(), 'Настройки блогеров');
        assert.equal(await page.locator('.crm-section-links [aria-current="page"]').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(241, 238, 255)', 'Same active surface as other CRM controls');
        assert.ok(await page.locator('.crm-section-links').evaluate(bar => {
          const bounds = bar.getBoundingClientRect(), item = bar.querySelector('[aria-current="page"]').getBoundingClientRect();
          return item.left >= bounds.left - 1 && item.right <= bounds.right + 1;
        }), 'Active subsection stays in horizontal view');
        await assertWidth(page); await assertTypography(page);
        await page.screenshot({ path:path.join(output, `program-${width}.png`) });
        await menu(page, width);
        await page.locator('[data-module="bloggers"][open]').waitFor();
        assert.equal(await page.locator('.crm-navigation a[aria-current="page"]').getAttribute('href'), '/crm/bloggers/settings');
        await page.screenshot({ path:path.join(output, `menu-${width}.png`) });
        if (width < 1024) {
          assert.equal(await page.locator('.crm-frame').getAttribute('inert'), '');
          const last = page.locator('.crm-sidebar-footer button').last();
          await last.focus(); await last.press('Tab');
          assert.ok(await page.locator('.crm-brand a').evaluate(el => el === document.activeElement), 'Focus wraps inside mobile menu');
          await page.keyboard.press('Escape');
          await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Открыть разделы CRM');
          assert.ok(await page.getByRole('button', { name:'Открыть разделы CRM', exact:true }).evaluate(el => el === document.activeElement), 'Focus restored');
        }
        await search(page, 'блогеры начисления');
        const results = page.locator('.crm-search-dialog nav a');
        assert.equal(await results.count(), 1);
        assert.equal(await results.first().getAttribute('href'), '/crm/bloggers/rewards');
        await results.first().click();
        await page.waitForURL('**/crm/bloggers/rewards');
        if (width >= 1024) {
          await page.getByRole('button', { name:'Добавить в избранное', exact:true }).click();
          assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('sarkisian-workspace-navigation:v1:mock-admin')).favorites.includes('bloggers-rewards')), 'Stable favorite id');
        }
        await page.locator('.crm-section-links a[href="/crm/bloggers/overview"]').click();
        await page.waitForURL('**/crm/bloggers/overview');
        if (width >= 1024) assert.equal(await page.locator('.crm-navigation > section:not([aria-label]) a').first().getAttribute('href'), '/crm/bloggers/rewards');
        await page.goto(base + '/admin-workspace/referral-settings?keep=1#rules', { waitUntil:'networkidle' });
        assert.equal(new URL(page.url()).pathname, '/crm/referrals/settings');
        assert.equal(new URL(page.url()).searchParams.get('keep'), '1');
        assert.equal(new URL(page.url()).hash, '#rules');
        await page.goto(base + '/crm/buyers', { waitUntil:'networkidle' });
        assert.equal(await page.locator('.crm-legacy-navigation a').getAttribute('href'), '/crm/customers');
        await page.locator('.crm-legacy-navigation a').click();
        await page.waitForURL('**/crm/customers');
        await page.goto(base + '/crm/chat', { waitUntil:'networkidle' });
        await page.locator('.platform-chat').waitFor();
        assert.equal(new URL(page.url()).pathname, '/crm/');
        await clean(f); scenarios++;
        console.log(`CRM navigation ${width}px: groups, keyboard, search, favorites, legacy links, chat PASS`);
      } finally { await f.context.close(); }
    }
    for (const variant of ['payout-deny','finance-deny','schedule-deny','content-role','customer-fallback','chat-only']) {
      const access = fixtures.get('/auth/access');
      const permissions = variant === 'schedule-deny' ? access.permissions.filter(p => !p.startsWith('work_schedule.')) : variant === 'finance-deny' ? access.permissions.filter(p => !p.startsWith('payment_calendar.')) : variant === 'payout-deny' ? access.permissions.filter(p => p !== 'partners.payouts') : variant === 'customer-fallback' ? access.permissions.filter(p => p !== 'customers.read') : variant === 'chat-only' ? [] : ['content_plan.read'];
      const role = variant === 'content-role' ? 'CONTENT_MANAGER' : variant === 'chat-only' ? 'CURATOR' : 'ADMIN';
      const f = await isolatedContext(browser, 1440, false, false, { fixtures:new Map([...fixtures, ['/auth/access', { role, permissions }]]), actor:{ role } });
      try {
        const page = f.page;
        if (variant === 'chat-only') {
          await page.goto(base + '/crm/chat', { waitUntil:'networkidle' });
          await page.locator('.platform-chat').waitFor();
          assert.equal(new URL(page.url()).pathname, '/workspace', 'No home/chat redirect loop');
        } else {
          await page.goto(base + (variant === 'content-role' ? '/crm/content-plan' : '/crm/'), { waitUntil:'networkidle' });
          if (variant === 'schedule-deny') {
            assert.equal(await page.locator('.crm-navigation a[href="/crm/work-schedule"]').count(), 0);
            await search(page, 'графики работы');
            assert.equal(await page.locator('.crm-search-dialog nav a').count(), 0);
            await page.goto(base + '/crm/work-schedule', { waitUntil:'networkidle' });
            assert.notEqual(new URL(page.url()).pathname, '/crm/work-schedule');
            assert.ok(!f.traffic.mockedReads.some(value => value.startsWith('/crm/work-schedule')));
          } else if (variant === 'finance-deny') {
            assert.equal(await page.locator('.crm-navigation section[aria-label="Финансы"]').count(), 0);
            assert.equal(await page.locator('.crm-navigation a[href="/crm/payment-calendar"]').count(), 0);
            await search(page, 'календарь платежей');
            assert.equal(await page.locator('.crm-search-dialog nav a').count(), 0);
            await page.goto(base + '/crm/payment-calendar', { waitUntil:'networkidle' });
            assert.notEqual(new URL(page.url()).pathname, '/crm/payment-calendar');
            assert.ok(!f.traffic.mockedReads.some(value => value.startsWith('/crm/payment-calendar')));
          } else if (variant === 'payout-deny') {
            assert.equal(await page.locator('.crm-navigation a[href="/crm/bloggers/payouts"]').count(), 0);
            await page.goto(base + '/crm/bloggers/settings', { waitUntil:'networkidle' });
            assert.equal(await page.locator('.crm-section-links a[href="/crm/bloggers/payouts"]').count(), 0);
            await search(page, 'выплаты блогерам');
            assert.equal(await page.locator('.crm-search-dialog nav a').count(), 0);
            await page.goto(base + '/crm/bloggers/payouts', { waitUntil:'networkidle' });
            assert.notEqual(new URL(page.url()).pathname, '/crm/bloggers/payouts');
            assert.ok(!f.traffic.mockedReads.includes('/partners/admin/BLOGGER/payouts'));
          } else if (variant === 'content-role') {
            assert.deepEqual(await page.locator('.crm-navigation > section[aria-label] h2').allTextContents(), ['Команда','Маркетинг и партнёры']);
            assert.equal(await page.locator('.crm-navigation a[href="/crm/orders"]').count(), 0);
            await search(page, 'заказы');
            assert.equal(await page.locator('.crm-search-dialog nav a').count(), 0);
          } else {
            assert.equal(await page.locator('.crm-navigation a[href="/crm/buyers"]').count(), 1);
            assert.equal(await page.locator('.crm-navigation a[href="/crm/customers"]').count(), 0);
            await page.goto(base + '/crm/buyers', { waitUntil:'networkidle' });
            assert.equal(await page.locator('.crm-legacy-navigation').count(), 0);
          }
        }
        await clean(f); scenarios++;
        console.log(`CRM navigation ${variant}: PASS`);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`CRM navigation browser PASS: ${scenarios} scenarios, zero business writes/external requests. Screenshots: ${output}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
