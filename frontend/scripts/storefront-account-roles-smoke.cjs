/* Isolated browser regression. No real private API reads or mutations. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const output = path.resolve(__dirname, '../.screenshots/account-roles');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const checks = [];
  try {
    for (const width of [1536, 390]) for (const role of ['ADMIN', 'CUSTOMER_B2B', 'CUSTOMER_B2C']) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block' });
      const errors = [], blocked = [], apiCalls = [];
      const eligible = role === 'CUSTOMER_B2C';
      const profile = { id: 'isolated-role-user', role, firstName: 'Покупатель', lastName: 'Тестовый', email: 'role@example.test', phone: '+79990000000', city: 'Москва', birthday: '', avatarUrl: null, pendingChangeRequest: null, sessions: [], notificationPreferences: { email: true, push: false, chat: true, futureBot: false } };
      const cart = { items: [], total: 0 };
      const cards = [
        { id: 'isolated-gift-paid', orderNumber: 'ISOLATED-GIFT-PAID', maskedCode: '•••• 1234', faceValue: 5000, balance: 4000, reserved: 500, expiresAt: '2099-12-31T23:59:59Z', isActive: true },
        { id: 'isolated-gift-pending', orderNumber: 'ISOLATED-GIFT-PENDING', maskedCode: '•••• 5678', faceValue: 1000, balance: 1000, reserved: 0, expiresAt: null, isActive: false },
      ];
      const fullCode = 'ISOLATED-PRIVATE-GIFT-CODE';
      let giftFailure = true;
      let notificationFailure = true;
      const dashboard = { summary: { orders: 0, spent: 0, favoriteCount: 0 }, orders: [], addresses: [], loyalty: eligible ? { isEligible: true, isEnabled: true, programName: 'SARKISIAN CLUB', balance: 1250, levelLabel: 'Старт', earnPercent: 1, maxWriteOffPercent: 30, progress: 40, nextLevelLabel: 'Профи', toNextLevel: 1750, entries: [] } : { isEligible: false, isEnabled: false, programName: 'SARKISIAN CLUB', balance: 0, entries: [] } };
      await context.addCookies([{ name: 'sb-customer-token', value: 'isolated-role-token', url: base }]);
      dashboard.giftCards = cards;
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !url.pathname.startsWith('/api/v1/')) {
          blocked.push(request.method() + ' ' + url.pathname);
          return route.fulfill({ status: 501, json: { message: 'Реальные записи запрещены' } });
        }
        if (!url.pathname.startsWith('/api/v1/')) {
          if (url.origin !== new URL(base).origin) return route.abort('blockedbyclient');
          return route.continue();
        }
        const endpoint = url.pathname.replace('/api/v1', '');
        apiCalls.push({ endpoint, method: request.method(), authorization: request.headers().authorization || '', body: request.postData() ? request.postDataJSON() : null });
        const reply = json => route.fulfill({ json });
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
        if (request.method() === 'GET') {
          if (endpoint === '/products/storefront-content') return reply({ settings: { announcementText: 'SARKISIAN BRAND' }, banners: [], categories: [], socialLinks: [], menuItems: [] });
          if (endpoint === '/products') return reply({ items: [], total: 0 });
          if (['/auth/me', '/auth/profile'].includes(endpoint)) return reply(profile);
          if (endpoint === '/storefront/dashboard') return reply(dashboard);
          if (endpoint === '/storefront/favorites' || endpoint === '/storefront/addresses') return reply([]);
          if (endpoint === '/cart') return reply(cart);
          if (endpoint === '/storefront/orders/ISOLATED-GIFT-PAID') return giftFailure
            ? route.fulfill({ status: 503, json: { message: 'Изолированная ошибка загрузки' } })
            : reply({ orderNumber: cards[0].orderNumber, giftCards: [{ id: cards[0].id, code: fullCode }] });
          if (endpoint === '/storefront/orders/ISOLATED-GIFT-PENDING') return reply({ orderNumber: cards[1].orderNumber, giftCards: [] });
        }
        if (request.method() === 'POST' && endpoint === '/storefront/cart/bind') return reply(cart);
        if (request.method() === 'POST' && endpoint === '/auth/logout') return reply({ success: true });
        if (request.method() === 'PATCH' && endpoint === '/auth/profile') {
          const body = request.postDataJSON();
          assert.deepEqual(body, { notificationPreferences: { email: false } }, 'Notifications must PATCH ONLY email, never city or stale/future channels');
          if (notificationFailure) return route.fulfill({ status: 503, json: { message: 'Изолированная ошибка сохранения' } });
          profile.notificationPreferences = { ...profile.notificationPreferences, ...body.notificationPreferences };
          return reply(profile);
        }
        blocked.push(request.method() + ' ' + endpoint);
        return route.fulfill({ status: 501, json: { message: 'Непредусмотренный запрос в изолированной проверке' } });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/account', { waitUntil: 'networkidle' });
      await page.locator('.sa-ui h1').waitFor();
      assert.equal(await page.locator('.sa-ui [role="alert"]').count(), 0);
      const nav = page.locator('.sb-account-nav');
      assert.equal(await nav.getByRole('button', { name: 'Бонусы', exact: true }).count(), eligible ? 1 : 0);
      assert.equal(await nav.getByRole('button', { name: 'Подарочные карты', exact: true }).count(), 1);
      if (!eligible) assert(await page.locator('.sa-ui a[href="' + (role === 'CUSTOMER_B2B' ? '/b2b' : '/workspace') + '"]').count());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, role + '-' + width + '.png'), fullPage: true });
      await nav.getByRole('button', { name: 'Подарочные карты', exact: true }).click();
      assert.equal(await page.locator('.sa-gift-card').count(), 2);
      assert(!(await page.content()).includes(fullCode), 'Полный код раскрыт без запроса собственного заказа');
      assert(await page.locator('.sa-gift-values').first().innerText().then(text => text.includes('3') && text.includes('500')));
      await page.getByRole('button', { name: 'Показать карту', exact: true }).first().click();
      const drawer = page.locator('.sa-drawer');
      await drawer.getByRole('alert').waitFor();
      assert(!(await page.content()).includes(fullCode));
      giftFailure = false;
      await drawer.getByRole('button', { name: 'Повторить загрузку' }).click();
      const codeInput = drawer.getByLabel('Код подарочной карты', { exact: true });
      await codeInput.waitFor();
      assert.equal(await codeInput.inputValue(), fullCode);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, role + '-gift-' + width + '.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
      assert.equal(await page.getByLabel('Код подарочной карты', { exact: true }).count(), 0, 'Закрытая карта сохраняет код в DOM');
      await page.getByRole('button', { name: 'Показать карту', exact: true }).nth(1).click();
      await drawer.getByRole('alert').waitFor();
      assert.equal(await drawer.getByLabel('Код подарочной карты', { exact: true }).count(), 0, 'Код неоплаченной карты раскрыт');
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
      // A real client-side route change unmounts SiteAccountGiftCards while its code is visible.
      await page.getByRole('button', { name: 'Показать карту', exact: true }).first().click();
      await drawer.getByLabel('Код подарочной карты', { exact: true }).waitFor();
      await page.evaluate(() => document.getElementById('__nuxt').__vue_app__.config.globalProperties.$router.push('/'));
      await page.waitForURL(url => url.pathname === '/');
      await page.locator('.sb-hero').waitFor({ state: 'visible' });
      await page.locator('.sa-ui').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.sb-storefront .sb-state.is-error, .sb-storefront .sb-site-error').count(), 0, 'Главная открылась с ошибкой после размонтирования кабинета');
      assert.equal(await page.getByLabel('Код подарочной карты', { exact: true }).count(), 0, 'Размонтированный компонент сохраняет код в DOM');
      assert(!(await page.content()).includes(fullCode), 'Код попал в страницу после выхода из кабинета');
      await page.evaluate(() => document.getElementById('__nuxt').__vue_app__.config.globalProperties.$router.push('/account'));
      await page.locator('.sa-ui h1').waitFor();
      await nav.getByRole('button', { name: 'Мои данные', exact: true }).click();
      assert.equal(await page.locator('input[aria-label="Дата рождения"]').count(), eligible ? 1 : 0);
      assert.equal(await page.getByLabel('Город', { exact: true }).count(), 0, 'City remains in profile UI');
      assert.equal(await page.getByRole('checkbox', { name: 'Получать уведомления по электронной почте', exact: true }).count(), 0, 'Notifications remain in profile UI');
      const phoneRect = await page.getByLabel('Телефон', { exact: true }).boundingBox();
      const emailRect = await page.getByLabel('Электронная почта', { exact: true }).boundingBox();
      assert(phoneRect && emailRect);
      assert(Math.abs(phoneRect.height - emailRect.height) <= 1 && Math.abs(phoneRect.height - 48) <= 1, 'Phone/email input heights differ');
      if (width > 760) assert(Math.abs(phoneRect.y - emailRect.y) <= 1, 'Phone/email input tops differ');
      await page.getByLabel('Текущий пароль').waitFor();
      await nav.getByRole('button', { name: 'Уведомления', exact: true }).click();
      const emailToggle = page.getByRole('checkbox', { name: 'Получать уведомления по электронной почте', exact: true });
      await emailToggle.waitFor();
      assert(await emailToggle.isChecked());
      assert(await page.getByRole('checkbox', { name: 'SMS-уведомления — не подключено', exact: true }).isDisabled());
      assert(await page.getByRole('checkbox', { name: 'Уведомления через ботов — не подключено', exact: true }).isDisabled());
      await emailToggle.uncheck();
      await page.getByRole('button', { name: 'Сохранить настройки', exact: true }).click();
      await page.locator('.sa-notifications [role="alert"]').waitFor();
      assert.equal(profile.notificationPreferences.email, true, 'Failed save changed persisted preference');
      notificationFailure = false;
      await page.getByRole('button', { name: 'Сохранить настройки', exact: true }).click();
      await page.getByText('Настройки уведомлений сохранены.', { exact: true }).waitFor();
      assert.deepEqual(profile.notificationPreferences, { email: false, push: false, chat: true, futureBot: false });
      assert.equal(profile.city, 'Москва', 'Notification save erased stored city');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, role + '-notifications-' + width + '.png'), fullPage: true });
      await nav.getByRole('button', { name: 'Мои данные', exact: true }).click();
      await nav.getByRole('button', { name: 'Уведомления', exact: true }).click();
      await emailToggle.waitFor();
      assert(!(await emailToggle.isChecked()), 'Notification preference was not loaded after remount');
      assert.deepEqual(errors, []);
      assert.deepEqual(blocked, []);
      assert(!apiCalls.some(call => /(?:^|\/)admin(?:\/|$)|gift-cards/.test(call.endpoint)), 'Клиент обращается к приватному API подарочных карт');
      const reveals = apiCalls.filter(call => call.endpoint.startsWith('/storefront/orders/'));
      assert(reveals.length >= 4);
      assert(reveals.every(call => call.method === 'GET' && call.authorization === 'Bearer isolated-role-token' && cards.some(card => call.endpoint === '/storefront/orders/' + card.orderNumber)), 'Раскрытие обходит авторизацию собственного заказа');
      assert.equal(apiCalls.filter(call => call.method === 'PATCH').length, 2);
      checks.push({ width, role, passed: true, ownGiftCards: true, giftRetry: true, unpaidCodeHidden: true, codeClearedOnClose: true, codeClearedOnUnmount: true, privateAdminCalls: 0, mockedRevealCalls: reveals.length, notificationsPartialPatch: true, notificationRetry: true, futureChannelsDisabled: true, cityRetained: true, profileInputAlignment: true });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, realPrivateCalls: 0, realMutations: 0 }, null, 2));
  console.log(JSON.stringify({ checks, realPrivateCalls: 0, realMutations: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
