// Local browser regression: synthetic sessions, mocked API only, all writes blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, task } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-access');
const checks = [];

function clean(f, expectedOutage = false) {
  for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
  assert.deepEqual(f.errors.filter(message => !expectedOutage || message !== 'console: Failed to load resource: the server responded with a status of 503 (Service Unavailable)'), []);
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map([...base, ['/auth/access', { role: 'EXECUTIVE', permissions: ['crm.read', 'customers.read'], denied: [] }]]);
      const f = await isolatedContext(browser, width, false, false, { actor: { role: 'EXECUTIVE' }, fixtures });
      try {
        const p = f.page;
        await p.goto(`${origin}/crm`, { waitUntil: 'networkidle' });
        await p.getByRole('heading', { name: 'Мой день', exact: true, level: 1 }).waitFor();
        assert.equal(await p.getByRole('link', { name: /^Новая (задача|сделка)$/ }).count(), 0);
        await p.goto(`${origin}/crm/tasks`, { waitUntil: 'networkidle' });
        await p.locator('.task-card').filter({ hasText: task.title }).waitFor();
        assert.equal(await p.getByRole('button', { name: 'Новая задача', exact: true }).count(), 0);
        assert.equal(await p.getByRole('button', { name: /^(Добавить|Автоматизация)$/ }).count(), 0);
        assert.equal(await p.locator('.task-card[draggable="true"]').count(), 0);
        await p.locator('.task-card').filter({ hasText: task.title }).click({ button: 'right' });
        await p.getByText('Открыть задачу', { exact: true }).waitFor();
        assert.equal(await p.getByText('Отметить выполненной', { exact: true }).count(), 0);
        assert.equal(await p.getByText('Перенести в архив', { exact: true }).count(), 0);
        await p.keyboard.press('Escape');
        await p.locator('.task-card').filter({ hasText: task.title }).click();
        const card = p.getByRole('dialog', { name: 'Карточка задачи' });
        await card.waitFor();
        assert.equal(await card.getByLabel('Описание', { exact: true }).getAttribute('readonly'), '');
        assert.ok(await card.getByRole('combobox', { name: /^Статус/ }).isDisabled());
        assert.equal(await card.getByRole('button', { name: 'Сохранить изменения', exact: true }).count(), 0);
        assert.equal(await card.getByRole('button', { name: 'В архив', exact: true }).count(), 0);
        await p.screenshot({ path: path.join(output, `${width}-executive-task.png`) });
        await p.goto(`${origin}/crm/deals`, { waitUntil: 'networkidle' });
        await p.getByText('Поставка в салон', { exact: true }).waitFor();
        assert.equal(await p.getByRole('button', { name: 'Новая сделка', exact: true }).count(), 0);
        assert.equal(await p.getByRole('button', { name: 'Добавить сделку', exact: true }).count(), 0);
        await p.getByText('Поставка в салон', { exact: true }).click();
        const leadCard = p.getByRole('dialog', { name: 'Карточка сделки' });
        await leadCard.waitFor();
        assert.equal(await leadCard.getByLabel('Название', { exact: true }).getAttribute('readonly'), '');
        assert.ok(await leadCard.getByRole('combobox', { name: /^Этап/ }).isDisabled());
        await p.goto(`${origin}/crm/tasks?create=1`, { waitUntil: 'networkidle' });
        await p.locator('.task-card').filter({ hasText: task.title }).waitFor();
        assert.equal(await p.getByRole('heading', { name: 'Создать задачу', exact: true }).count(), 0, 'Query shortcuts cannot bypass a read-only grant');
        await p.goto(`${origin}/crm/files`, { waitUntil: 'networkidle' });
        await p.getByRole('heading', { name: 'Файлы', exact: true }).waitFor();
        await p.getByText('Бриф для съёмки.txt', { exact: true }).waitFor();
        assert.equal(await p.getByRole('button', { name: /^(Новая папка|Загрузить файлы)$/ }).count(), 0);
        clean(f);
        checks.push(`${width}: executive reads dashboard/tasks/deals/files without write controls or draggable cards`);
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, `${width}-executive-failure.png`) });
        console.error(JSON.stringify({ errors: f.errors, unexpected: f.traffic.unknownReads }));
        throw error;
      } finally { await f.context.close(); }

      const r = await isolatedContext(browser, width, false, false, { fixtures: base });
      try {
        await r.context.addInitScript(() => localStorage.setItem('sarkisian-workspace-navigation:v1:mock-admin', JSON.stringify({ favorites: ['tasks'], recent: ['pipeline'], start: 'tasks' })));
        let unavailable = true;
        await r.context.route('**/api/v1/auth/access', async route => {
          if (route.request().method() !== 'GET') return route.fallback();
          if (!unavailable) return route.fallback();
          return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': origin }, contentType: 'application/json', body: '{"message":"Mock permission outage"}' });
        });
        const p = r.page;
        await p.goto(`${origin}/crm/tasks?check=retry`, { waitUntil: 'networkidle' });
        await p.getByRole('heading', { name: 'Не удалось проверить доступ', exact: true }).waitFor();
        const alert = await p.getByRole('alert').boundingBox();
        const heading = await p.getByRole('heading', { name: 'Не удалось проверить доступ', exact: true }).boundingBox();
        const retry = await p.getByRole('button', { name: 'Повторить проверку', exact: true }).boundingBox();
        assert.ok(alert && heading && heading.x - alert.x >= 16, 'The error panel uses shared card padding');
        assert.ok(retry && retry.height >= 44 && retry.height <= 60, 'The retry control keeps the standard CRM height');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The error state does not overflow');
        assert.ok(p.url().endsWith('/crm/tasks?check=retry'), 'A temporary outage preserves the requested URL');
        assert.ok(!r.traffic.mockedReads.includes('/crm/tasks'), 'An unchecked protected page never fetches its data');
        assert.equal(await p.locator('.task-card').count(), 0);
        assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem('sarkisian-workspace-navigation:v1:mock-admin')).favorites), ['tasks'], 'A temporary outage does not erase navigation preferences');
        await p.screenshot({ path: path.join(output, `${width}-access-error.png`) });
        unavailable = false;
        await p.getByRole('button', { name: 'Повторить проверку', exact: true }).click();
        await p.locator('.task-card').filter({ hasText: task.title }).waitFor();
        assert.ok(p.url().endsWith('/crm/tasks?check=retry'));
        checks.push(`${width}: initial access failure blocks page data; retry restores the same URL`);

        await p.locator('.task-card').filter({ hasText: task.title }).click();
        const card = p.getByRole('dialog', { name: 'Карточка задачи' });
        const description = card.getByLabel('Описание', { exact: true });
        const draft = 'Несохранённый рабочий черновик — проверка восстановления';
        await description.fill(draft);
        // Simulate a failed background permission refresh through the existing
        // reactive Nuxt state; no production test hook or real mutation is used.
        await p.evaluate(() => {
          const nuxt = document.getElementById('__nuxt').__vue_app__.config.globalProperties.$nuxt;
          const state = nuxt.payload.state['$sworkspace-access'];
          if (!state?.ready) throw new Error('Expected a verified permission state');
          nuxt.payload.state['$sworkspace-access'] = { ...state, permissions: [], ready: false, loading: false, error: 'Тестовый сбой проверки прав' };
        });
        await p.getByRole('heading', { name: 'Не удалось проверить доступ', exact: true }).waitFor();
        assert.ok(await card.isHidden(), 'Unchecked content is no longer interactive/visible');
        assert.equal(await p.locator('#task-general-panel textarea').inputValue(), draft, 'The hidden draft remains mounted');
        await p.getByRole('button', { name: 'Повторить проверку', exact: true }).click();
        await card.waitFor({ state: 'visible' });
        assert.equal(await description.inputValue(), draft);
        // A confirmed denial is different from an outage: the page must unmount.
        await p.evaluate(() => {
          const state = document.getElementById('__nuxt').__vue_app__.config.globalProperties.$nuxt.payload.state;
          state['$sworkspace-access'] = { ...state['$sworkspace-access'], permissions: [], ready: true, loading: false, error: '' };
        });
        await p.getByRole('heading', { name: 'Нет доступа к разделу', exact: true }).waitFor();
        assert.equal(await p.locator('#task-general-panel').count(), 0, 'A confirmed revocation unmounts, not merely hides, the protected view');
        clean(r, true);
        checks.push(`${width}: transient refresh failure preserves the hidden draft; confirmed revocation removes it`);
      } catch (error) {
        await r.page.screenshot({ path: path.join(output, `${width}-failure.png`) });
        console.error(JSON.stringify({ errors: r.errors, unexpected: r.traffic.unknownReads }));
        throw error;
      } finally { await r.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'isolated fixtures; no real writes', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
