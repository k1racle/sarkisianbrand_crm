const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base } = require('./crm-rich-fixtures.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/task-collaboration');
const clone = value => JSON.parse(JSON.stringify(value));
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [1440, 390]) {
      const fixtures = new Map(base), access = fixtures.get('/auth/access');
      fixtures.set('/auth/access', { ...access, permissions: [...access.permissions, 'crm.read', 'crm.write'] });
      fixtures.set('/staff-notifications', { items: [], fresh: [], unreadCount: 0, nextCursor: null, through: new Date().toISOString(), popupsEnabled: false });
      const author = { id: 'mock-admin', firstName: 'Анна', lastName: 'Заказчик', email: 'author@example.invalid' };
      const leader = { id: 'leader', firstName: 'Иван', lastName: 'Руководитель', email: 'boss@example.invalid' };
      const accountant = { id: 'accountant', firstName: 'Елена', lastName: 'Бухгалтер', email: 'finance@example.invalid', department: { name: 'Бухгалтерия' } };
      const task = { ...clone(fixtures.get('/crm/tasks')[0]), id: 'printer', title: 'Заказать принтер', pipelineId: 'pipeline', assignedToId: author.id, assignedTo: author, createdById: author.id, createdBy: author, comments: [], participants: [], _count: { children: 0, comments: 0 } };
      fixtures.set('/crm/task-pipelines', { pipelines: [{ id: 'pipeline', name: 'Общая', labels: { BACKLOG: 'Бэклог', TODO: 'К выполнению', IN_PROGRESS: 'В работе', REVIEW: 'Проверка', OVERDUE: 'Просрочено', DONE: 'Готово' } }], departments: [], canManage: false });
      fixtures.set('/crm/team', [author]); fixtures.set('/crm/tasks', [task]); fixtures.set('/crm/tasks/printer', task);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      let failedComment = false, createdBody, outsideList = false;
      const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
      await f.context.route('**/api/v1/crm/task-people**', route => {
        const q = new URL(route.request().url()).searchParams.get('q') || '';
        return route.fulfill({ headers: cors, contentType: 'application/json', body: JSON.stringify([leader, accountant].filter(u => (u.firstName + ' ' + u.lastName).toLowerCase().includes(q.toLowerCase()))) });
      });
      await f.context.route('**/api/v1/crm/tasks**', async route => {
        const req = route.request(), endpoint = new URL(req.url()).pathname.replace('/api/v1/crm/', '');
        const reply = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (req.method() === 'GET') return reply(endpoint === 'tasks' ? outsideList ? [] : [task] : endpoint.endsWith('/files') ? [] : task);
        assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        const body = req.postDataJSON();
        if (endpoint.includes('/participants')) {
          if (req.method() === 'DELETE') task.participants = task.participants.filter(row => row.userId !== endpoint.split('/').at(-1));
          else { const user = [leader, accountant].find(user => user.id === body.userId); task.participants.push({ userId: user.id, user }); }
          return reply(task.participants);
        }
        if (endpoint.endsWith('/comments')) {
          assert.deepEqual(body.mentionIds, [leader.id]); assert(body.body.includes('@Иван Руководитель'));
          if (!failedComment) { failedComment = true; return reply({ message: 'Не удалось отправить. Повторите попытку.' }, 409); }
          if (!task.participants.some(row => row.userId === leader.id)) task.participants.push({ userId: leader.id, user: leader });
          const comment = { id: 'comment', author, body: body.body, mentions: [{ id: leader.id, name: 'Иван Руководитель' }], createdAt: new Date().toISOString() };
          task.comments.unshift(comment); task._count.comments++;
          return reply({ ...comment, participants: task.participants }, 201);
        }
        if (endpoint === 'tasks' && req.method() === 'POST') { createdBody = body; return reply({ ...task, id: 'created' }, 201); }
        throw Error('Unexpected mock mutation: ' + endpoint);
      });
      try {
        const p = f.page; p.setDefaultTimeout(10000);
        await p.goto(origin + '/crm/tasks?task=printer', { waitUntil: 'networkidle' });
        const dialog = p.getByRole('dialog', { name: 'Карточка задачи' });
        await dialog.getByLabel('Название', { exact: true }).fill('Заказать принтер и бумагу');
        await dialog.locator('.crm-task-participants').getByRole('button', { name: 'Добавить', exact: true }).click();
        await dialog.getByRole('combobox', { name: 'Найти сотрудника' }).fill('Бухгалтер');
        await dialog.getByRole('option', { name: /Елена Бухгалтер/ }).click();
        await dialog.locator('.crm-task-participant').first().waitFor();
        assert.equal(await dialog.locator('.crm-task-participant').count(), 1);
        assert.equal(await dialog.getByLabel('Название', { exact: true }).inputValue(), 'Заказать принтер и бумагу');
        assert.ok(await dialog.getByRole('button', { name: 'Сохранить изменения' }).isEnabled());
        await p.screenshot({ path: path.join(output, width + '-participants.png') });
        await dialog.getByRole('tab', { name: 'Комментарии', exact: true }).click();
        await dialog.getByLabel('Текст комментария').fill('@');
        await dialog.getByRole('combobox', { name: 'Найти сотрудника' }).fill('Руководитель');
        await dialog.getByRole('option', { name: /Иван Руководитель/ }).click();
        await dialog.getByLabel('Текст комментария').press('End');
        await dialog.getByLabel('Текст комментария').pressSequentially('согласуйте покупку принтера');
        await dialog.getByRole('button', { name: 'Отправить', exact: true }).click();
        await dialog.getByRole('alert').filter({ hasText: 'Не удалось отправить' }).waitFor();
        assert((await dialog.getByLabel('Текст комментария').inputValue()).includes('@Иван Руководитель'));
        await dialog.getByRole('button', { name: 'Отправить', exact: true }).click();
        await dialog.locator('.crm-detail-comment .crm-task-mention').waitFor();
        assert.equal(await dialog.getByLabel('Текст комментария').inputValue(), '');
        assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await p.screenshot({ path: path.join(output, width + '-mention.png') });
        await dialog.getByRole('tab', { name: 'Общее', exact: true }).click();
        assert.equal(await dialog.locator('.crm-task-participant').count(), 2);
        await dialog.getByRole('button', { name: 'Удалить участника Елена Бухгалтер', exact: true }).click();
        await dialog.getByRole('button', { name: 'Удалить участника Елена Бухгалтер', exact: true }).waitFor({ state: 'hidden' });
        assert.equal(await dialog.locator('.crm-task-participant').count(), 1);
        // Restore the unsaved title to close without discarding unrelated work.
        await dialog.getByLabel('Название', { exact: true }).fill(task.title);
        await dialog.getByRole('button', { name: 'Закрыть задачу', exact: true }).click();
        await p.getByRole('button', { name: 'Новая задача', exact: true }).click();
        const form = p.locator('form.create');
        await form.getByLabel('Название', { exact: true }).fill('Заказать бумагу');
        await form.locator('.crm-task-participants').getByRole('button', { name: 'Добавить', exact: true }).click();
        await form.getByRole('option', { name: /Елена Бухгалтер/ }).click();
        await form.getByRole('button', { name: 'Создать задачу', exact: true }).click();
        await form.waitFor({ state: 'hidden' });
        assert.deepEqual(createdBody.participantIds, [accountant.id]); assert(!('participants' in createdBody));
        outsideList = true;
        await p.goto(origin + '/crm/tasks?task=printer&tab=comments&notification=first', { waitUntil: 'networkidle' });
        await dialog.locator('.crm-detail-comment .crm-task-mention').waitFor();
        assert.equal(await dialog.getByRole('tab', { name: 'Комментарии', exact: true }).getAttribute('aria-selected'), 'true');
        await dialog.getByRole('button', { name: 'Закрыть задачу', exact: true }).click();
        await p.waitForURL(url => !url.searchParams.has('task'));
        await p.goto(origin + '/crm/tasks?task=printer&tab=comments&notification=second', { waitUntil: 'networkidle' });
        await dialog.locator('.crm-detail-comment .crm-task-mention').waitFor();
        assert.deepEqual(f.traffic.prohibitedWrites, []); assert.deepEqual(f.traffic.externalRequests, []); assert.deepEqual(f.traffic.unknownReads, []);
        assert.deepEqual(f.errors.filter(error => !error.includes('409')), []);
        console.log('PASS ' + width + ': participants, @mention, failed send/retry, drafts preserved, removal and creation');
      } catch (e) { await f.page.screenshot({ path: path.join(output, width + '-failure.png') }); throw e; }
      finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
