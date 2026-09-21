const { test, expect } = require('@playwright/test');
const { isolatedContext } = require('../../scripts/admin-design-mock.cjs');

for (const width of [1440, 390]) test(`Contacts form and contact cutout ${width}`, async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const writes = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/api/v1/contact-messages' && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3001', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type' } });
    if (url.pathname === '/api/v1/contact-messages' && request.method() === 'POST') {
      writes.push(request.postDataJSON());
      return route.fulfill({ status: 202, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3001' }, json: { accepted: true } });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fulfill({ status: 405, json: {} });
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:3001/contacts', { waitUntil: 'networkidle' });
    await expect(page.locator('.sb-contact-form')).toBeVisible();
    await expect(page.locator('.sb-page-art--contacts,.is-contacts .sb-content-toc')).toHaveCount(0);
    await expect(page.locator('.is-contacts .sb-contact-cards a')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    await info.attach(`contacts-${width}`, { body: await page.locator('.is-contacts .sb-content-hero').screenshot(), contentType: 'image/png' });
    await page.getByPlaceholder('Как к вам обращаться').fill('Тестовый клиент');
    await page.getByPlaceholder('+7 (999) 000-00-00').fill('+7 999 123 45 67');
    await page.getByPlaceholder('name@example.ru').fill('person@example.invalid');
    await page.getByPlaceholder('Расскажите, чем мы можем помочь').fill('Тестовое сообщение о продукции.');
    await page.locator('.sb-contact-form__consent input').check();
    await page.getByRole('button', { name: 'Отправить сообщение' }).click();
    await expect(page.getByRole('heading', { name: 'Сообщение отправлено' })).toBeVisible();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ name: 'Тестовый клиент', email: 'person@example.invalid', consent: true, website: '' });
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('Marketing inbox renders only intercepted messages', async ({ browser }) => {
  const item = { id: 'fixture-message', name: 'Тестовый клиент', phone: '+7 999 123 45 67', email: 'person@example.invalid', message: 'Тестовое обращение через форму.', createdAt: '2026-09-21T08:00:00Z', readAt: '2026-09-21T08:01:00Z', notificationStatus: 'QUEUED' };
  const fixtures = new Map([
    ['/admin/contact-messages', { items: [item], total: 1, unread: 0, page: 1, pages: 1 }],
    ['/admin/contact-messages/settings', { recipientEmail: 'inbox@example.invalid', deliveryEnabled: false }],
  ]);
  const f = await isolatedContext(browser, 1440, false, false, { fixtures });
  try {
    await f.page.goto('/admin-workspace/contact-messages');
    await expect(f.page.getByRole('heading', { name: 'Сообщения с сайта' })).toBeVisible();
    await expect(f.page.getByLabel('Почта получателя')).toHaveValue('inbox@example.invalid');
    await f.page.locator('.contact-inbox__row').click();
    await expect(f.page.getByRole('dialog')).toContainText('Тестовое обращение через форму.');
    expect(f.traffic.prohibitedWrites).toEqual([]);
    expect(f.errors).toEqual([]);
  } finally { await f.context.close(); }
});
