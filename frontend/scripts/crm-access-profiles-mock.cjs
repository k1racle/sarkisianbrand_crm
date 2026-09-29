// Local browser UI contract. API reads AND writes are intercepted, never forwarded.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, person } = require('./crm-rich-fixtures.cjs');
const { workspaceRoleCatalog: roles } = require('../../backend/dist/src/auth/workspace-role-catalog.js');
const { accessScopes: scopes } = require('../../backend/dist/src/auth/access-scope-policy.js');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-access-profiles');
const id = 'afbe7279-8c62-4a67-b019-ec3be50b0382', department = 'dbd6a8e0-14da-4a72-9b3b-2527e4f31a20';
const permissions = [
  { key: 'crm.read', resource: 'crm', action: 'read', description: 'Просмотр задач и сделок', roles: ['ADMIN'] },
  { key: 'crm.write', resource: 'crm', action: 'write', description: 'Изменение задач и сделок', roles: ['ADMIN'] },
  { key: 'content_plan.read', resource: 'content_plan', action: 'read', description: 'Просмотр контент-плана', roles: ['ADMIN'] },
];
const templates = [{ id: 'SMM_SPECIALIST', name: 'SMM-специалист', description: 'Подготовка публикаций', permissionKeys: ['content_plan.read'] }];
const rollout = { assignmentReady: false, mode: 'DRAFT_ONLY' };
const checks = [];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const fixtures = new Map([...base, ['/system-settings/access', { roles: roles.map(role => role.id), roleDetails: roles, permissions }]]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const writes = [], unexpected = [];
      let row = null, conflict = false, failList = false;
      const detail = () => ({ ...rollout, ...row, grants: row.grants.map(grant => ({ ...grant, permission: permissions.find(permission => permission.key === grant.permissionKey), departments: grant.departmentIds.map(departmentId => ({ departmentId })) })) });
      await f.context.route('**/api/v1/system-settings/access-profiles**', async route => {
        const req = route.request(), url = new URL(req.url());
        assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
        const suffix = url.pathname.split('/system-settings/access-profiles')[1];
        const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Cache-Control': 'private, no-store' };
        const reply = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        assert.equal(req.headers().authorization, 'Bearer mock-admin-design-not-a-valid-jwt');
        if (req.method() === 'GET') {
          if (suffix === '/catalog') return reply({ ...rollout, permissions, scopes, templates, departments: [{ id: department, name: 'Продажи', parentId: null }] });
          if (suffix === '') {
            if (failList) return reply({ message: 'Проверочная ошибка загрузки' }, 503);
            const visible = row && !!row.archivedAt === (url.searchParams.get('status') === 'archived') && row.name.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase());
            return reply({ ...rollout, items: visible ? [{ ...row, _count: { grants: row.grants.length } }] : [], total: visible ? 1 : 0, page: 1, limit: 30 });
          }
          if (suffix === `/${id}` && row) return reply(detail());
        } else {
          const body = req.postDataJSON(); writes.push({ method: req.method(), suffix, body });
          if (suffix === '/preview' && req.method() === 'POST') return reply({ ...rollout, simulation: true, message: 'Текущий доступ не изменён.', departments: [], decisions: [
            { permissionKey: 'crm.read', description: 'Просмотр задач и сделок', allowed: false, grants: [{ profileId: id, reason: 'DEPARTMENT_NOT_ASSIGNED', resolvedDepartmentIds: [] }] },
            { permissionKey: 'crm.write', description: 'Изменение задач и сделок', allowed: false, grants: [{ profileId: id, reason: 'EXPLICIT_DENY', resolvedDepartmentIds: [] }] },
          ] });
          if (suffix === '' && req.method() === 'POST') { row = { ...body, id, version: 1, archivedAt: null }; return reply(detail()); }
          if (suffix === `/${id}` && req.method() === 'PATCH') {
            if (conflict) return reply({ message: 'Профиль уже изменён. Обновите данные; ваш черновик не сохранён.' }, 409);
            assert.equal(body.version, row.version); row = { ...row, ...body, version: row.version + 1 }; return reply(detail());
          }
          if ([`/${id}/archive`, `/${id}/restore`].includes(suffix) && req.method() === 'POST') {
            assert.equal(body.version, row.version); row.version++; row.archivedAt = suffix.endsWith('/archive') ? new Date().toISOString() : null; return reply(detail());
          }
        }
        unexpected.push({ suffix, method: req.method() }); return reply({ message: 'Unexpected isolated request' }, 400);
      });
      try {
        const p = f.page; p.setDefaultTimeout(15000); p.removeAllListeners('dialog');
        await p.goto(`${origin}/crm/settings/access`, { waitUntil: 'networkidle' });
        await p.getByRole('tab', { name: 'Действующие роли' }).focus(); await p.keyboard.press('ArrowRight');
        assert.equal(await p.getByRole('tab', { name: 'Проекты ролей' }).getAttribute('aria-selected'), 'true');
        await p.getByText('Создайте первый профиль', { exact: false }).waitFor();
        assert.ok(await p.getByText(/Проекты ролей пока не назначаются/).isVisible());
        assert.equal(await p.getByRole('button', { name: /Назначить|Активировать/ }).count(), 0);
        await p.getByRole('button', { name: 'Новый профиль', exact: true }).click();
        let drawer = p.getByRole('dialog', { name: 'Новый профиль', exact: true });
        await drawer.getByLabel('Полное название роли', { exact: true }).fill('Специалист продаж своего отдела');
        await drawer.getByRole('checkbox', { name: 'Разрешить: Просмотр задач и сделок', exact: true }).check();
        await drawer.getByRole('combobox', { name: 'Область: Просмотр задач и сделок', exact: true }).selectOption('SELECTED_DEPARTMENTS');
        await drawer.getByRole('checkbox', { name: 'Продажи', exact: true }).check();
        await drawer.getByRole('checkbox', { name: 'Разрешить: Изменение задач и сделок', exact: true }).check();
        await drawer.getByRole('textbox', { name: 'Поиск операций', exact: true }).fill('не существует');
        await drawer.getByText('Операции не найдены.', { exact: false }).waitFor();
        assert.ok(await drawer.getByRole('heading', { name: 'Разрешения · 2', exact: true }).isVisible());
        await drawer.getByRole('textbox', { name: 'Поиск операций', exact: true }).fill('');
        const readLabel = drawer.locator('label.crm-toggle-row').filter({ has: p.getByRole('checkbox', { name: 'Разрешить: Просмотр задач и сделок', exact: true }) });
        const titleBox = await readLabel.locator('strong').boundingBox(), codeBox = await readLabel.locator('small').boundingBox();
        assert.ok(codeBox.y >= titleBox.y + titleBox.height, 'Permission code is on a separate line');
        const size = await drawer.boundingBox();
        assert.ok(size.x >= -1 && Math.abs(size.x + size.width - width) <= 2, 'Drawer aligned to right edge');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No viewport overflow');
        const heights = await drawer.locator('footer button').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
        assert.ok(heights.every(height => height >= 40 && height <= 48), 'Shared compact footer');
        await p.screenshot({ path: path.join(output, `${width}-editor.png`) });
        await drawer.getByRole('button', { name: 'Сохранить проект', exact: true }).click();
        await drawer.waitFor({ state: 'hidden' });
        assert.deepEqual(writes[0].body.grants, [{ permissionKey: 'crm.read', scope: 'SELECTED_DEPARTMENTS', departmentIds: [department] }, { permissionKey: 'crm.write', scope: 'OWN', departmentIds: [] }]);
        await p.getByText('Проект роли сохранён.', { exact: false }).waitFor();
        checks.push(`${width}: keyboard tabs, empty state, create, independent scopes, selected departments, filter preservation, compact drawer`);

        await p.getByRole('button', { name: 'Изменить', exact: true }).click();
        drawer = p.getByRole('dialog', { name: 'Редактировать профиль', exact: true });
        await drawer.getByLabel('Полное название роли', { exact: true }).fill('Несохранённая редакция'); conflict = true;
        await drawer.getByRole('button', { name: 'Сохранить проект', exact: true }).click();
        await drawer.getByRole('alert').filter({ hasText: /уже изменён/ }).waitFor();
        assert.equal(await drawer.getByLabel('Полное название роли', { exact: true }).inputValue(), 'Несохранённая редакция');
        p.once('dialog', dialog => dialog.dismiss()); await drawer.getByRole('button', { name: 'Отмена', exact: true }).click();
        assert.ok(await drawer.isVisible(), 'Discard can be cancelled');
        p.once('dialog', dialog => dialog.accept()); await drawer.getByRole('button', { name: 'Отмена', exact: true }).click();
        await drawer.waitFor({ state: 'hidden' }); conflict = false;
        await p.getByRole('button', { name: 'Проверить проект', exact: true }).click();
        drawer = p.getByRole('dialog', { name: 'Предварительная проверка', exact: true });
        await drawer.getByRole('combobox', { name: /^Сотрудник для проверки/ }).selectOption(person.id);
        await drawer.getByRole('button', { name: 'Рассчитать доступ', exact: true }).click();
        await drawer.getByText('Действующий отдел не назначен', { exact: true }).waitFor();
        assert.ok(await drawer.getByText('Сохранённый личный запрет', { exact: true }).isVisible());
        assert.deepEqual(writes.find(write => write.suffix === '/preview').body.profiles, [{ id, version: 1 }]);
        await p.screenshot({ path: path.join(output, `${width}-preview.png`) });
        await drawer.getByRole('button', { name: 'Отмена', exact: true }).click();
        checks.push(`${width}: optimistic conflict keeps draft, discard confirmation, versioned preview and denial reasons`);

        await p.getByRole('button', { name: /^Создать копию:/ }).click();
        drawer = p.getByRole('dialog', { name: 'Новый профиль', exact: true });
        assert.match(await drawer.getByLabel('Полное название роли', { exact: true }).inputValue(), /— копия$/);
        await drawer.getByRole('combobox', { name: /^Шаблон операций/ }).selectOption('SMM_SPECIALIST');
        p.once('dialog', dialog => dialog.accept()); await drawer.getByRole('button', { name: 'Применить шаблон', exact: true }).click();
        assert.equal(await drawer.getByRole('checkbox', { name: 'Разрешить: Просмотр задач и сделок', exact: true }).isChecked(), false);
        assert.equal(await drawer.getByRole('checkbox', { name: 'Разрешить: Просмотр контент-плана', exact: true }).isChecked(), true);
        p.once('dialog', dialog => dialog.accept()); await drawer.getByRole('button', { name: 'Отмена', exact: true }).click();
        p.once('dialog', dialog => dialog.accept()); await p.getByRole('button', { name: 'В архив', exact: true }).click();
        await p.getByText('Проект перенесён в архив', { exact: true }).waitFor();
        await p.getByRole('checkbox', { name: 'Архив проектов', exact: true }).check();
        await p.getByRole('button', { name: 'Восстановить', exact: true }).waitFor();
        p.once('dialog', dialog => dialog.accept()); await p.getByRole('button', { name: 'Восстановить', exact: true }).click();
        await p.getByText('Проект восстановлен', { exact: true }).waitFor();
        await p.getByRole('checkbox', { name: 'Архив проектов', exact: true }).uncheck();
        await p.getByRole('button', { name: 'Изменить', exact: true }).waitFor();
        failList = true; await p.getByRole('button', { name: 'Обновить проекты', exact: true }).click();
        await p.getByRole('alert').filter({ hasText: 'Проверочная ошибка загрузки' }).waitFor();
        assert.equal(await p.getByRole('button', { name: 'Изменить', exact: true }).count(), 0, 'Stale actions hidden on failed load');
        failList = false; await p.getByRole('button', { name: 'Обновить проекты', exact: true }).click();
        await p.getByRole('button', { name: 'Изменить', exact: true }).waitFor();
        await p.screenshot({ path: path.join(output, `${width}-list.png`) });
        checks.push(`${width}: copy, SMM template, archive/restore, load error and recovery`);
        assert.deepEqual(unexpected, []);
        const expectedResourceErrors = /^console: Failed to load resource: the server responded with a status of (409|503) \(.*\)$/;
        assert.deepEqual(f.errors.filter(error => !expectedResourceErrors.test(error)), []);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: checks.length, checks, screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
