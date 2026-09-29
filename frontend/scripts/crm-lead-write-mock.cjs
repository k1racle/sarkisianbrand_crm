// Isolated browser contract. All API requests are fixtures; writes never reach the real backend.
const { chromium } = require('playwright-core'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
require('../../backend/node_modules/reflect-metadata');
const { plainToInstance } = require('../../backend/node_modules/class-transformer');
const { validateSync } = require('../../backend/node_modules/class-validator');
const { CreateLeadDto } = require('../../backend/dist/src/crm/dto/crm.dto');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-lead-write');
const newId = '7d04822c-0001-4000-8000-000000000001', lostId = '7d04822c-0001-4000-8000-000000000002';
const customerId = '7d04822c-0002-4000-8000-000000000001', secondId = '7d04822c-0002-4000-8000-000000000002';
const checks = [];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const pipeline = { id: 'fixture-pipeline', name: 'Тестовая воронка', requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Цена'], stages: [
        { id: newId, name: 'Новые', code: 'NEW', isLost: false, leads: [], color: '#6554d6' },
        { id: lostId, name: 'Закрыто без продажи', code: 'LOST', isLost: true, leads: [], color: '#bb5145' },
      ] };
      const fixtures = new Map([...base, ['/crm/pipelines', [pipeline]], ['/crm/pipeline', pipeline]]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const writes = [];
      await f.context.route('**/api/v1/crm/leads', async route => {
        const req = route.request(); if (req.method() === 'GET') return route.fallback();
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        assert.equal(req.method(), 'POST'); assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        const body = req.postDataJSON(); writes.push(body);
        assert.deepEqual(validateSync(plainToInstance(CreateLeadDto, body), { whitelist: true, forbidNonWhitelisted: true }), []);
        if (writes.length === 1) return route.fulfill({ status: 409, headers, contentType: 'application/json', body: JSON.stringify({ code: 'CRM_CUSTOMER_MATCH_AMBIGUOUS', message: 'Контактные данные совпадают с несколькими клиентами. Выберите клиента или уточните контакты.', candidates: [
          { id: customerId, firstName: 'Анна', lastName: 'Волкова', email: 'anna@example.invalid', phone: '+79990000000' },
          { id: secondId, firstName: 'Анна', lastName: 'Петрова', email: 'petrova@example.invalid', phone: '+79990000000' },
        ] }) });
        return route.fulfill({ status: 201, headers, contentType: 'application/json', body: JSON.stringify({ id: 'fixture-created', ...body }) });
      });
      try {
        const p = f.page; await p.goto(`${origin}/crm/deals`, { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: 'Новая сделка', exact: true }).click();
        const form = p.locator('form.crm-detail-card');
        await form.getByLabel('Контактное лицо', { exact: true }).fill('Анна Волкова');
        await form.getByLabel('Телефон', { exact: true }).fill('+79990000000');
        await form.getByRole('button', { name: 'Создать сделку', exact: true }).click();
        const select = form.getByRole('combobox', { name: /^Клиент для сделки/ }); await select.waitFor();
        assert.equal(await select.inputValue(), ''); assert.equal(writes.length, 1);
        assert.equal(await form.getByLabel('Контактное лицо', { exact: true }).inputValue(), 'Анна Волкова');
        assert.equal(await select.locator('option').count(), 3);
        await select.selectOption(customerId); await p.screenshot({ path: path.join(output, `${width}-customer-choice.png`) });
        await form.getByRole('button', { name: 'Создать сделку', exact: true }).click(); await form.waitFor({ state: 'hidden' });
        assert.equal(writes[1].customerId, customerId); assert.ok(!('customerId' in writes[0]));
        assert.ok(!('lostReason' in writes[1]));
        checks.push(`${width}: ambiguous match preserves draft, requires explicit customer, posts valid DTO and closes on success`);

        await p.getByRole('button', { name: 'Новая сделка', exact: true }).click();
        await p.locator('.toast').waitFor({ state: 'hidden' });
        assert.equal(await select.count(), 0);
        await form.getByLabel('Контактное лицо', { exact: true }).fill('Новый контакт');
        await form.getByLabel('Телефон', { exact: true }).fill('+79991111111');
        await form.getByRole('combobox', { name: /^Этап/ }).selectOption(lostId);
        const reason = form.getByRole('combobox', { name: 'Причина отказа', exact: true });
        assert.equal(await reason.inputValue(), ''); assert.ok(await reason.evaluate(el => el.required));
        await reason.selectOption('Цена'); await p.screenshot({ path: path.join(output, `${width}-lost-reason.png`) });
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await form.getByRole('button', { name: 'Создать сделку', exact: true }).click(); await form.waitFor({ state: 'hidden' });
        assert.equal(writes[2].lostReason, 'Цена'); assert.equal(writes[2].stageId, lostId); assert.ok(!('customerId' in writes[2]));
        assert.deepEqual(f.traffic.prohibitedWrites, []); assert.deepEqual(f.traffic.unknownReads, []);
        assert.deepEqual(f.traffic.externalRequests, []); assert.deepEqual(f.traffic.credentialLeaks, []);
        const expectedConflict = /^console: Failed to load resource: the server responded with a status of 409 \([^)]+\)$/;
        assert.ok(f.errors.filter(error => expectedConflict.test(error)).length <= 1);
        assert.deepEqual(f.errors.filter(error => !expectedConflict.test(error)), []);
        checks.push(`${width}: new form clears prior match, lost reason required, no page overflow or unexpected API traffic`);
      } catch (error) { await f.page.screenshot({ path: path.join(output, `${width}-failure.png`) }); throw error; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
