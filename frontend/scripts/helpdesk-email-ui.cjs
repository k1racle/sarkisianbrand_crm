// All reads and writes are intercepted fixtures; no real SMTP or CRM records.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3005').origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
process.env.ADMIN_DESIGN_URL = origin;
const { isolatedContext } = require('./admin-design-mock.cjs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, theme] of [[1440, 'light'], [390, 'dark']]) {
      const ticket = { id: 'ticket-fixture', number: 'HD-TEST', subject: 'Тестовый вопрос', description: 'Пример обращения', source: 'B2C', priority: 'MEDIUM', status: 'OPEN', requesterName: 'Клиент', requesterEmail: 'client@example.invalid', queue: 'Первая линия', createdAt: '2026-10-01T10:00:00Z', canWrite: true, comments: [] };
      const access = { role: 'ADMIN', permissions: ['crm.read', 'helpdesk.read', 'helpdesk.write', 'customers.read', 'customers.write'], denied: [] };
      const fixtures = new Map([['/auth/access', access], ['/helpdesk/tickets', [ticket]], ['/helpdesk/agents', []]]);
      const f = await isolatedContext(browser, width, false, false, { fixtures, allowFixtureForms: true });
      const attempts = [];
      try {
        await f.context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
        await f.context.route('**/api/v1/helpdesk/tickets/ticket-fixture/comments', async route => {
          const request = route.request();
          assert.equal(request.method(), 'POST');
          attempts.push(request.postDataJSON());
          if (attempts.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Повторите попытку' }) });
          return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'comment-fixture', body: attempts[1].body, isInternal: false, createdAt: new Date().toISOString(), emailDelivery: { status: 'QUEUED', sentAt: null } }) });
        });
        await f.page.goto(origin + '/crm/support/tickets', { waitUntil: 'networkidle' });
        await f.page.locator('.ticket-row[role=button]').first().click();
        const dialog = f.page.getByRole('dialog');
        await dialog.getByRole('heading', { name: 'Тестовый вопрос' }).waitFor();
        const email = dialog.getByRole('checkbox', { name: /Отправить на email/ });
        await dialog.getByLabel('Комментарий к заявке').fill('Здравствуйте! Вопрос решён.');
        await email.check();
        await dialog.getByRole('button', { name: 'Сохранить комментарий' }).click();
        await dialog.getByRole('alert').filter({ hasText: 'Повторите попытку' }).waitFor();
        await dialog.getByRole('button', { name: 'Сохранить комментарий' }).click();
        await dialog.getByText('Email ожидает отправки').waitFor();
        assert.equal(attempts.length, 2);
        assert.deepEqual(attempts[0], attempts[1], 'An uncertain result keeps the same idempotency key');
        assert.equal(attempts[0].sendEmail, true); assert.equal(attempts[0].isInternal, false);
        await dialog.getByLabel('Комментарий к заявке').fill('Внутренняя заметка');
        await dialog.getByRole('checkbox', { name: 'Только для сотрудников' }).check();
        assert.equal(await email.isDisabled(), true);
        assert.equal(await email.isChecked(), false);
        assert.equal(f.traffic.prohibitedWrites.length, 0); assert.equal(f.traffic.externalRequests.length, 0);
        assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        console.log(`${width}px ${theme}: queued email, stable retry and internal-only guard PASS`);
      } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
