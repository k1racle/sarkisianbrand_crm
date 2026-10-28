/* Browser test with synthetic reads only; real APIs and writes remain blocked. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3003').origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const company = '10000000-0000-4000-8000-000000000001';
const actor = { id: 'fixture-b2b', role: 'CUSTOMER_B2B', isActive: true, firstName: 'Тест', email: 'fixture@example.invalid' };
const organizations = [{ id: company, name: 'Тестовый салон', role: 'OWNER', status: 'ACTIVE', canOrder: true, canSeeFinance: true, canUseSalon: true }];
const profile = { id: company, name: 'Тестовый салон', membership: { role: 'OWNER', canOrder: true, canSeeFinance: true }, capabilities: { salon: true, purchasing: true }, members: [] };
const data = Array.from({ length: 125 }, (_, n) => ({ id: `order-${n}`, orderNumber: `SB-${String(n + 1).padStart(3, '0')}`, status: n === 0 ? 'SHIPPED' : 'NEW', createdAt: new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString(), finalAmount: 120, items: [{ id: `line-${n}`, productName: n === 0 ? 'Особый товар' : 'База', quantity: 1, total: 120 }] }));

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [width, theme] of [[1440, 'light'], [390, 'dark']]) {
      const fixture = await isolatedContext(browser, width, false, false, { b2b: true, actor, fixtures: new Map([['/b2b/organizations', organizations], ['/b2b/profile', profile]]) });
      const { page, context, traffic, errors } = fixture;
      const requests = [];
      const records = [...data];
      let failOnce = false;
      await context.route('**/api/v1/b2b/orders**', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === origin && request.method() === 'POST' && url.pathname === '/api/v1/b2b/orders/order-124/repeat') {
          records.push({ ...records[124], id: 'order-repeat', orderNumber: 'SB-126', createdAt: '2028-01-01T00:00:00.000Z' });
          return route.fulfill({ json: { id: 'order-repeat', orderNumber: 'SB-126' } });
        }
        if (url.origin !== origin || request.method() !== 'GET' || url.pathname !== '/api/v1/b2b/orders') throw new Error('Unexpected request');
        requests.push(url.searchParams.toString());
        if (failOnce) { failOnce = false; return route.fulfill({ status: 503, json: { message: 'Проверка ошибки' } }); }
        const search = (url.searchParams.get('search') || '').toLocaleLowerCase('ru'), status = url.searchParams.get('status'), sort = url.searchParams.get('sort'), pageNumber = Number(url.searchParams.get('page') || 1);
        const all = records.filter(o => (!status || o.status === status) && (!search || `${o.orderNumber} ${o.items[0].productName}`.toLocaleLowerCase('ru').includes(search))).sort((a, b) => (Date.parse(b.createdAt) - Date.parse(a.createdAt)) * (sort === 'oldest' ? -1 : 1));
        const pages = Math.max(1, Math.ceil(all.length / 20)), current = Math.min(pageNumber, pages);
        return route.fulfill({ json: { items: all.slice((current - 1) * 20, current * 20), total: all.length, page: current, pages, limit: 20 } });
      });
      try {
        await context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
        await page.goto(`${origin}/b2b?section=orders`);
        await page.getByRole('button', { name: 'Состав заказа SB-125' }).waitFor();
        assert.match(await page.locator('.business-results-summary').innerText(), /Всего заказов: 125/);
        for (let pageNo = 2; pageNo <= 7; pageNo++) {
          await page.getByRole('button', { name: 'Следующая страница заказов' }).click();
          await page.getByText(`${pageNo} из 7`, { exact: true }).waitFor();
        }
        await page.getByRole('button', { name: 'Состав заказа SB-001' }).waitFor();
        await page.getByLabel('Поиск закупочных заказов').fill('Особый товар');
        await page.getByText('Найдено заказов: 1', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Состав заказа SB-001' }).click();
        assert.match(await page.locator('.business-order-details').innerText(), /Особый товар/);
        await page.getByLabel('Статус закупочного заказа').selectOption('NEW');
        await page.getByRole('heading', { name: 'Заказы не найдены' }).waitFor();
        failOnce = true;
        await page.getByRole('button', { name: 'Показать все заказы' }).click();
        await page.getByText('Проверка ошибки', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Повторить', exact: true }).click();
        await page.getByRole('button', { name: 'Состав заказа SB-125' }).waitFor();
        page.removeAllListeners('dialog');
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Повторить заказ SB-125' }).click();
        await page.getByRole('button', { name: 'Состав заказа SB-126' }).waitFor();
        assert.match(await page.locator('.business-results-summary').innerText(), /Всего заказов: 126/);
        assert.ok(requests.some(s => new URLSearchParams(s).get('page') === '7'));
        assert.ok(requests.some(s => new URLSearchParams(s).get('search') === 'Особый товар'));
        assert.deepEqual(traffic.prohibitedWrites, []); assert.deepEqual(traffic.unknownReads, []); assert.deepEqual(traffic.externalRequests, []);
        assert.deepEqual(errors.filter(error => !String(error).includes('server responded with a status of 503')), []);
        console.log(`${width}px ${theme}: pagination, search, retry and new order after repeat PASS`);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
