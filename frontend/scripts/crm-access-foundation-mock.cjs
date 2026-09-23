// Requires a local built frontend/backend. All API data is isolated and no real mutations are sent.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, person } = require('./crm-rich-fixtures.cjs');
const { workspaceRoleCatalog: roles } = require('../../backend/dist/src/auth/workspace-role-catalog.js');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
const output = path.resolve(__dirname, '../.screenshots/crm-access-foundation');
const checks = [];
const permissions = [
  { key: 'crm.read', resource: 'crm', action: 'read', description: 'Просмотр задач и сделок', roles: ['ADMIN', 'MANAGER_SALES'] },
  { key: 'crm.write', resource: 'crm', action: 'write', description: 'Изменение задач и сделок', roles: ['ADMIN', 'MANAGER_SALES'] },
  { key: 'media.read', resource: 'media', action: 'read', description: 'Просмотр файлов', roles: ['ADMIN'] },
];
const review = {
  employee: { ...person, role: 'MANAGER_SALES', isActive: true, department: { id: 'department', name: 'Продажи' } },
  role: roles.find(item => item.id === 'MANAGER_SALES'),
  permissions: permissions.map((item, i) => ({ ...item, allowed: i !== 1, source: ['ROLE', 'DENY', 'ALLOW'][i] })),
  dataVisibility: { departmentEnforced: false, message: 'Отдел пока не ограничивает видимость записей. Показаны разрешения на операции.' },
};
const fixtures = new Map([...base,
  ['/system-settings/access', { roles: roles.map(item => item.id), roleDetails: roles, permissions }],
  [`/system-settings/staff/${person.id}/access-review`, review],
]);
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    for (const width of [390, 1440]) {
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      try {
        const p = f.page;
        await p.goto(`${origin}/crm/settings/access`, { waitUntil: 'networkidle' });
        await p.getByRole('table', { name: 'Матрица ролей', exact: true }).waitFor();
        const labels = await p.locator('.crm-matrix-table thead th').allTextContents();
        assert.deepEqual(labels.map(x => x.trim()), ['Разрешение', ...roles.map(role => role.label)]);
        assert.equal(new Set(labels.map(x => x.trim())).size, labels.length, 'Distinct role headings');
        assert.equal(await p.getByRole('heading', { name: 'Индивидуальные права' }).count(), 0);
        assert.equal(await p.locator('.permission-list, .overrides').count(), 0);
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Access screen does not overflow');
        const geometry = await p.locator('.crm-matrix-scroll').evaluate(element => {
          const panel = element.closest('article').getBoundingClientRect();
          return { width: element.getBoundingClientRect().width, panelWidth: panel.width, scrollWidth: element.scrollWidth };
        });
        assert.ok(geometry.width >= geometry.panelWidth - 4, 'Matrix spans the entire panel');
        assert.ok(geometry.scrollWidth > geometry.width, 'Role columns retain readable widths');
        const headings = await p.locator('.crm-matrix-table thead th').evaluateAll(elements => elements.map(el => ({
          wrapping: getComputedStyle(el).whiteSpace, overflow: el.scrollHeight > el.clientHeight + 1,
        })));
        assert.ok(headings.every(heading => heading.wrapping === 'normal' && !heading.overflow), 'Full names wrap without clipping');
        const scroll = p.getByRole('region', { name: 'Матрица разрешений ролей — горизонтальная прокрутка' });
        const anchored = await p.locator('.crm-matrix-table thead th').first().boundingBox();
        await scroll.focus(); await scroll.press('End');
        await scroll.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        const lastColumn = await p.locator('.crm-matrix-table thead th').last().boundingBox();
        const firstColumn = await p.locator('.crm-matrix-table thead th').first().boundingBox();
        assert.ok(lastColumn.x + lastColumn.width <= width && lastColumn.x >= firstColumn.x + firstColumn.width, 'Last role can be read after scrolling');
        assert.ok(Math.abs(firstColumn.x - anchored.x) <= 1, 'Permission column stays anchored');
        await scroll.evaluate(el => { el.scrollLeft = 0; });
        await p.screenshot({ path: path.join(output, `${width}-role-matrix.png`) });
        await p.getByRole('link', { name: 'Сотрудники', exact: true }).last().click();
        await p.getByRole('button', { name: 'Проверить права сотрудника', exact: true }).waitFor();
        await p.getByRole('button', { name: 'Проверить права сотрудника', exact: true }).click();
        const drawer = p.getByRole('dialog', { name: 'Права сотрудника', exact: true });
        await drawer.getByText('Специалист интернет-магазина', { exact: true }).waitFor();
        assert.ok(await drawer.getByText(/Отдел пока не ограничивает/).isVisible());
        assert.ok((await drawer.innerText()).includes('Недоступно · Личный запрет'));
        await drawer.getByRole('combobox', { name: /^Показать/ }).selectOption('denied');
        assert.equal(await drawer.locator('[aria-label="Результат проверки прав"] article').count(), 1);
        assert.ok((await drawer.locator('[aria-label="Результат проверки прав"]').innerText()).includes('crm.write'));
        const rect = await drawer.boundingBox(); assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1);
        const heights = await drawer.locator('footer button').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
        assert.ok(heights.every(height => height >= 40 && height <= 48), 'Standard compact footer controls');
        await p.screenshot({ path: path.join(output, `${width}-access-review.png`) });
        await drawer.getByRole('button', { name: 'Закрыть проверку прав' }).click();
        if (width >= 1000) {
          await p.locator('.staff-row.crm-data-row').first().click({ button: 'right' });
          await p.getByRole('menuitem', { name: 'Проверить права сотрудника', exact: true }).click();
          await drawer.getByText('Специалист интернет-магазина', { exact: true }).waitFor();
          await drawer.getByRole('button', { name: 'Закрыть проверку прав' }).click();
        }
        checks.push(`${width}: full-width matrix, complete role names, staff access review, filtering and drawer geometry`);
        await p.goto(`${origin}/crm/settings/departments`, { waitUntil: 'networkidle' });
        const toggle = p.getByRole('checkbox', { name: 'Архив отделов' });
        await toggle.waitFor(); await toggle.check();
        await p.getByRole('button', { name: 'Восстановить', exact: true }).waitFor();
        assert.equal(await p.getByRole('button', { name: 'Изменить', exact: true }).count(), 0);
        assert.ok(await p.getByRole('button', { name: 'Новый отдел', exact: true }).isDisabled());
        const dimensions = await toggle.boundingBox(); assert.equal(dimensions.width, 44); assert.equal(dimensions.height, 44);
        await p.screenshot({ path: path.join(output, `${width}-departments-archive.png`) });
        checks.push(`${width}: archived department view and standard toggle`);
        assert.deepEqual(f.errors, []);
        for (const key of ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], [], key);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ passed: checks.length, checks, screenshots: output }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
