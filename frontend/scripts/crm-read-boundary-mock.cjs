// Browser contracts against the local build. ALL API reads/writes are mocked, never forwarded.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, task } = require('./crm-rich-fixtures.cjs');
require('../../backend/node_modules/reflect-metadata');
const { plainToInstance } = require('../../backend/node_modules/class-transformer');
const { validateSync } = require('../../backend/node_modules/class-validator');
const { CreateLeadDto } = require('../../backend/dist/src/crm/dto/crm.dto');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-read-boundary');
const checks = [];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const overdue = { ...task, status: 'OVERDUE', workflowStatus: 'IN_PROGRESS', isOverdue: true, dueDate: '2020-01-01T00:00:00Z' };
      const fixtures = new Map([...base,
        ['/crm/tasks', [overdue]],
        ['/crm/dashboard', { ...base.get('/crm/dashboard'), customers: null, customersAvailable: false }],
        ['/crm/pipelines', []], ['/crm/pipeline', { id: null, name: 'Воронка продаж', stages: [], requiresSetup: true, requiredFields: [], lostReasons: [] }],
      ]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const writes = [];
      // Only two explicit mocked mutation targets. The base handler blocks every other write.
      for (const endpoint of ['/crm/tasks/qa-task', '/crm/leads']) await f.context.route(`**/api/v1${endpoint}`, async route => {
        const req = route.request(); if (req.method() === 'GET') return route.fallback();
        assert.ok(['127.0.0.1', 'localhost'].includes(new URL(req.url()).hostname));
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        assert.equal(req.method(), endpoint.endsWith('qa-task') ? 'PATCH' : 'POST');
        const body = req.postDataJSON(); writes.push({ endpoint, body });
        if (endpoint.endsWith('qa-task')) { assert.equal(body.status, 'IN_PROGRESS'); overdue.description = body.description; }
        else {
          assert.ok(!('stageId' in body)); assert.ok(!('managerId' in body)); assert.ok(!('contactEmail' in body));
          assert.equal(validateSync(plainToInstance(CreateLeadDto, body), { whitelist: true, forbidNonWhitelisted: true }).length, 0, 'The actual server DTO accepts a first-deal form without optional email/UUIDs');
        }
        return route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(endpoint.endsWith('qa-task') ? overdue : { id: 'mock-new-lead', ...body }) });
      });
      try {
        const p = f.page;
        await p.goto(`${origin}/crm`, { waitUntil: 'networkidle' });
        await p.getByText('База клиентов недоступна по вашим правам', { exact: true }).waitFor();
        await p.screenshot({ path: path.join(output, `${width}-dashboard.png`) });
        await p.goto(`${origin}/crm/tasks`, { waitUntil: 'networkidle' });
        await p.locator('[data-crm-drop="OVERDUE"] .task-card').click();
        const card = p.getByRole('dialog', { name: 'Карточка задачи' });
        await card.waitFor();
        assert.equal(await card.getByRole('combobox', { name: /^Статус/ }).inputValue(), 'IN_PROGRESS');
        await card.getByLabel('Описание', { exact: true }).fill('Уточнённый план без смены рабочего статуса');
        await card.getByRole('button', { name: 'Сохранить изменения', exact: true }).click();
        await p.getByText('Задача сохранена', { exact: true }).waitFor();
        assert.equal(writes[0].body.status, 'IN_PROGRESS');
        await p.screenshot({ path: path.join(output, `${width}-task.png`) });
        await card.getByRole('button', { name: 'Отмена', exact: true }).click();
        assert.equal(await p.locator('[data-crm-drop="OVERDUE"] .task-card').count(), 1, 'Overdue view survives a content-only save');
        checks.push(`${width}: unavailable customer count explained, overdue view retains workflow status on edit/save`);

        await p.goto(`${origin}/crm/deals`, { waitUntil: 'networkidle' });
        await p.getByText('Воронка ещё не создана', { exact: true }).waitFor();
        assert.ok(await p.getByLabel('Воронка продаж', { exact: true }).isDisabled());
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await p.screenshot({ path: path.join(output, `${width}-empty-pipeline.png`) });
        await p.getByRole('button', { name: 'Новая сделка', exact: true }).click();
        const create = p.locator('form.crm-detail-card');
        await create.getByLabel('Контактное лицо', { exact: true }).fill('Тестовый контакт');
        await create.getByLabel('Телефон', { exact: true }).fill('+79990000000');
        await create.getByLabel('Название сделки', { exact: true }).fill('Первая сделка');
        assert.equal(await create.getByRole('combobox', { name: /^Этап/ }).locator('option:checked').textContent(), 'Первый этап основной воронки');
        await create.getByRole('button', { name: 'Создать сделку', exact: true }).click();
        await create.waitFor({ state: 'hidden' });
        assert.equal(writes.length, 2);
        assert.ok(!('stageId' in writes[1].body), 'No empty UUID is sent for a default first stage');
        assert.deepEqual(f.traffic.prohibitedWrites, []); assert.deepEqual(f.traffic.unknownReads, []);
        assert.deepEqual(f.traffic.externalRequests, []); assert.deepEqual(f.traffic.credentialLeaks, []); assert.deepEqual(f.errors, []);
        checks.push(`${width}: empty pipeline and first-deal request; no unexpected API or external traffic`);
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, `${width}-failure.png`) });
        console.error('Isolated browser diagnostics:', JSON.stringify({ errors: f.errors, unexpected: f.traffic.unknownReads, cardCount: await f.page.locator('.crm-detail-card').count() }));
        throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, api: 'isolated fixtures, no real writes', screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
