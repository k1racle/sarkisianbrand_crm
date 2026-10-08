// Isolated pipeline settings workflows. All reads and writes are synthetic.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-pipeline-settings');
const clone = value => JSON.parse(JSON.stringify(value));
async function bounds(dialog) {
  const failures = await dialog.evaluate(root => {
    const box = root.getBoundingClientRect(), failures = [];
    if (box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1 || root.scrollWidth > root.clientWidth + 2) failures.push('Dialog bounds');
    for (const el of root.querySelectorAll('button,input,select,textarea')) {
      if (!el.getClientRects().length) continue;
      const rect = el.getBoundingClientRect();
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 2)) failures.push(el.getAttribute('aria-label') || el.textContent);
    }
    const header = root.querySelector('.crm-pipeline-header').getBoundingClientRect(), footer = root.querySelector('footer').getBoundingClientRect();
    if (header.top < 0 || footer.bottom > innerHeight + 1) failures.push('Header or footer clipped');
    return failures;
  });
  assert.deepEqual(failures, [], 'Dialog and controls must fit');
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), checks = [];
  try {
    for (const width of [360, 390, 768, 1440]) {
      const stages = ['Новые', 'Первичный контакт', 'Квалификация', 'Предложение и переговоры', 'Успешно реализовано', 'Закрыто без продажи'].map((name, index) => ({ id: 's' + index, name, color: ['#8b8f98', '#4f7dcf', '#7f65c7', '#d58a35', '#2d9568', '#bb5145'][index], probability: [10,25,45,70,100,0][index], isWon: index === 4, isLost: index === 5, sortOrder: index * 10, leads: [] }));
      const pipelines = [{ id: 'p1', name: 'Оптовые продажи', isDefault: true, requiredFields: ['contactName', 'contactPhone'], lostReasons: ['Не устроила цена', 'Выбран конкурент', 'Нет ответа'], stages: clone(stages) }, { id: 'p2', name: 'Партнёрская программа', isDefault: false, requiredFields: [], lostReasons: [], stages: stages.map(row => ({ ...row, id: row.id + 'b' })) }];
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'crm.read', 'crm.write'] });
      fixtures.set('/staff-notifications', { items: [], fresh: [], unreadCount: 0, nextCursor: null, through: '2026-10-08T00:00:00Z', popupsEnabled: false });
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true }), writes = [];
      let stageAttempts = 0, reorderAttempts = 0, acceptDialog = false;
      f.page.removeAllListeners('dialog'); f.page.on('dialog', dialog => acceptDialog ? dialog.accept() : dialog.dismiss());
      const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, POST, DELETE, OPTIONS' };
      await f.context.route('**/api/v1/crm/pipeline**', async route => {
        const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.replace('/api/v1/crm/', '');
        const reply = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        if (req.method() === 'GET') return reply(endpoint === 'pipelines' ? pipelines : pipelines.find(item => item.id === url.searchParams.get('pipelineId')) || pipelines[0]);
        const body = req.postDataJSON();
        writes.push(req.method() + ' ' + endpoint);
        if (endpoint.startsWith('pipeline-stages/')) {
          const id = endpoint.split('/')[1], pipeline = pipelines.find(item => item.stages.some(stage => stage.id === id));
          if (req.method() === 'DELETE') { pipeline.stages = pipeline.stages.filter(item => item.id !== id); return reply({ success: true }); }
          assert.ok(!(body.isWon && body.isLost), 'A stage has exactly one result type');
          if (++stageAttempts === 1) return reply({ message: 'Не удалось сохранить этап: тестовый конфликт' }, 409);
          const stage = pipeline.stages.find(item => item.id === id); Object.assign(stage, body); return reply(stage);
        }
        if (endpoint.endsWith('/reorder')) {
          const pipeline = pipelines.find(item => item.id === endpoint.split('/')[1]);
          if (++reorderAttempts === 1) return reply({ message: 'Не удалось изменить порядок: тестовый конфликт' }, 409);
          assert.equal(new Set(body.stageIds).size, pipeline.stages.length);
          pipeline.stages = body.stageIds.map(id => pipeline.stages.find(stage => stage.id === id)); return reply(pipeline);
        }
        if (endpoint.endsWith('/stages')) { const pipeline = pipelines.find(item => item.id === endpoint.split('/')[1]); const stage = { ...body, id: 'new-stage', leads: [] }; pipeline.stages.push(stage); return reply(stage, 201); }
        if (endpoint === 'pipelines') { const item = { ...body, id: 'new-pipeline', isDefault: false, stages: clone(stages) }; pipelines.push(item); return reply(item, 201); }
        const id = endpoint.split('/')[1], pipeline = pipelines.find(item => item.id === id);
        if (req.method() === 'DELETE') { assert.equal(pipeline.isDefault, false); pipelines.splice(pipelines.indexOf(pipeline), 1); return reply({ success: true }); }
        Object.assign(pipeline, body); return reply(pipeline);
      });
      try {
        const p = f.page; p.setDefaultTimeout(12000);
        await p.goto(origin + '/crm/deals', { waitUntil: 'networkidle' });
        await p.getByRole('button', { name: 'Настроить', exact: true }).click();
        const dialog = p.getByRole('dialog', { name: 'Воронки продаж', exact: true });
        await dialog.locator('.crm-pipeline-stage').first().waitFor();
        await p.evaluate(() => document.fonts.ready); await bounds(dialog);
        assert.equal(await dialog.getByRole('tabpanel').count(), 1);
        assert.equal(await dialog.locator('.crm-pipeline-stage').count(), 6);
        await p.screenshot({ path: path.join(output, width + '-stages.png') });
        await dialog.getByRole('tab', { name: 'Поля сделки', exact: true }).click();
        await dialog.getByRole('checkbox', { name: 'Название сделки', exact: true }).check();
        assert.equal(writes.length, 0);
        await bounds(dialog); await p.screenshot({ path: path.join(output, width + '-fields.png') });
        await dialog.getByRole('tab', { name: 'Настройки', exact: true }).click();
        assert.ok(await dialog.getByRole('button', { name: 'В архив', exact: true }).isDisabled());
        await dialog.getByLabel('Название воронки', { exact: true }).fill('Оптовые продажи команды');
        await dialog.getByRole('tab', { name: 'Этапы', exact: true }).click();
        await dialog.getByRole('button', { name: 'Настроить этап Новые', exact: true }).click();
        await dialog.getByLabel('Название', { exact: true }).fill('Новый запрос');
        await dialog.getByLabel('Тип этапа', { exact: true }).selectOption('won');
        assert.equal(await dialog.getByLabel('Вероятность, %').inputValue(), '100');
        await dialog.getByLabel('Тип этапа', { exact: true }).selectOption('open');
        await dialog.getByLabel('Вероятность, %').fill('15');
        await bounds(dialog); await p.screenshot({ path: path.join(output, width + '-stage-editor.png') });
        await dialog.getByRole('button', { name: 'Сохранить этап', exact: true }).click();
        await dialog.getByText('Не удалось сохранить этап: тестовый конфликт', { exact: true }).waitFor();
        assert.equal(await dialog.getByLabel('Название', { exact: true }).inputValue(), 'Новый запрос');
        await dialog.getByRole('button', { name: 'Сохранить этап', exact: true }).click();
        await dialog.locator('.crm-pipeline-stage-editor').waitFor({ state: 'hidden' });
        const handle = dialog.getByRole('button', { name: 'Переместить этап Новый запрос', exact: true });
        await handle.focus(); await p.keyboard.press('Alt+ArrowDown');
        await dialog.getByText('Не удалось изменить порядок: тестовый конфликт', { exact: true }).waitFor();
        assert.match(await dialog.locator('.crm-pipeline-stage').first().textContent(), /Новый запрос/);
        await handle.focus(); await p.keyboard.press('Alt+ArrowDown');
        await p.waitForFunction(() => document.querySelector('.crm-pipeline-stage')?.textContent.includes('Первичный контакт'));
        await dialog.getByRole('tab', { name: 'Настройки', exact: true }).click();
        assert.equal(await dialog.getByLabel('Название воронки', { exact: true }).inputValue(), 'Оптовые продажи команды', 'Stage writes preserve metadata draft');
        await dialog.getByRole('tab', { name: 'Причины отказа', exact: true }).click();
        await dialog.getByLabel('Новая причина отказа', { exact: true }).fill('Не подошёл ассортимент');
        await dialog.getByRole('button', { name: 'Добавить', exact: true }).click();
        await dialog.getByRole('button', { name: 'Удалить причину Нет ответа', exact: true }).click();
        await bounds(dialog); await p.screenshot({ path: path.join(output, width + '-reasons.png') });
        await p.keyboard.press('Escape'); assert.ok(await dialog.isVisible(), 'Dismissed discard preserves draft');
        if (width <= 700) await dialog.getByLabel('Редактируемая воронка', { exact: true }).selectOption('p2');
        else await dialog.locator('.crm-pipeline-list').getByRole('button', { name: /Партнёрская программа/ }).click();
        assert.match(await dialog.locator('.crm-pipeline-current').textContent(), /Оптовые продажи/, 'Cancelled switch retains selected pipeline');
        await dialog.getByRole('button', { name: 'Сохранить настройки', exact: true }).click();
        await dialog.getByRole('button', { name: 'Сохранить настройки', exact: true }).waitFor({ state: 'hidden' });
        assert.ok(pipelines[0].requiredFields.includes('title')); assert.equal(pipelines[0].name, 'Оптовые продажи команды');
        assert.deepEqual(pipelines[0].lostReasons, ['Не устроила цена', 'Выбран конкурент', 'Не подошёл ассортимент']);
        await dialog.getByRole('tab', { name: 'Этапы', exact: true }).click();
        await dialog.getByRole('button', { name: 'Добавить этап', exact: true }).click();
        await dialog.getByLabel('Название', { exact: true }).fill('Подписание договора');
        await dialog.locator('.crm-pipeline-footer').getByRole('button', { name: 'Добавить этап', exact: true }).click();
        await dialog.getByRole('button', { name: 'Настроить этап Подписание договора', exact: true }).waitFor();
        assert.equal(await dialog.locator('.crm-pipeline-stage').count(), 7);
        await dialog.getByRole('button', { name: 'Настроить этап Подписание договора', exact: true }).click();
        await dialog.getByRole('button', { name: 'Поднять этап', exact: true }).click();
        await p.waitForFunction(() => document.querySelectorAll('.crm-pipeline-stage')[5]?.textContent.includes('Подписание договора'));
        acceptDialog = true;
        await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
        await p.waitForFunction(() => document.querySelectorAll('.crm-pipeline-stage').length === 6);
        await dialog.getByRole('button', { name: 'Новая воронка', exact: true }).click();
        await dialog.getByLabel('Название воронки', { exact: true }).fill('Работа с салонами');
        await bounds(dialog); await p.screenshot({ path: path.join(output, width + '-create.png') });
        await dialog.getByRole('button', { name: 'Создать воронку', exact: true }).click();
        await dialog.getByRole('tab', { name: 'Настройки', exact: true }).click();
        await dialog.getByRole('button', { name: 'В архив', exact: true }).click();
        await p.waitForFunction(() => !document.querySelector('.crm-pipeline-sidebar')?.textContent.includes('Работа с салонами'));
        await dialog.getByRole('tab', { name: 'Этапы', exact: true }).focus(); await p.keyboard.press('ArrowRight');
        assert.equal(await dialog.getByRole('tab', { name: 'Поля сделки', exact: true }).getAttribute('aria-selected'), 'true');
        await dialog.getByRole('button', { name: 'Готово', exact: true }).click(); await dialog.waitFor({ state: 'hidden' });
        await p.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Настроить');
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
        assert.deepEqual(f.errors.filter(item => !JSON.stringify(item).includes('409 (Conflict)')), []);
        checks.push(width + ': layout/tabs, field and metadata drafts, stage edit/retry, reorder rollback/keyboard/mobile controls, reasons, create/delete/archive, unsaved guard and focus');
      } catch (error) {
        await f.page.screenshot({ path: path.join(output, width + '-failure.png') }); console.error(JSON.stringify({ errors: f.errors, traffic: f.traffic, writes })); throw error;
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ result: 'PASS', checks, screenshots: output, api: 'Fixtures only' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
