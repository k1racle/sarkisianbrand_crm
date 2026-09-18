/* Loopback public reads and intercepted account fixtures only. No live writes. */
const { test, expect } = require('@playwright/test');
const baseURL = 'http://127.0.0.1:3001';
async function isolated(browser, width, role, options = {}) {
  const context = await browser.newContext({ baseURL, viewport: { width, height: 960 }, serviceWorkers: 'block', ...options });
  const errors = [], writes = [], calls = [];
  let authenticated = !!role;
  const profile = { id: 'fixture-referral', role: role || 'CUSTOMER_B2C', firstName: 'Тест', lastName: '', email: 'fixture@example.test', phone: '', sessions: [], notificationPreferences: {} };
  const dashboard = { summary: { orders: 0, spent: 0 }, orders: [], addresses: [], giftCards: [], loyalty: { isEligible: profile.role === 'CUSTOMER_B2C', balance: 1250, levelLabel: 'Старт', entries: [] } };
  if (authenticated) await context.addCookies([{ name: 'sb-customer-token', value: 'isolated-referral-token', url: baseURL }]);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.replace('/api/v1', '');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.abort();
    const headers = { 'Access-Control-Allow-Origin': baseURL, 'Access-Control-Allow-Headers': 'authorization,content-type,x-cart-session', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    const reply = json => route.fulfill({ headers, json });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname.startsWith('/api/v1/')) calls.push({ endpoint, method: request.method(), query: url.search });
    if (request.method() === 'POST' && endpoint === '/auth/login') { authenticated = true; return reply({ accessToken: 'isolated-login-token', refreshToken: 'isolated-refresh-token', user: profile }); }
    if (request.method() === 'POST' && endpoint === '/storefront/cart/bind') return reply({ items: [], total: 0 });
    if (request.method() === 'POST' && endpoint === '/auth/logout') { authenticated = false; return reply({ success: true }); }
    if (!['GET', 'HEAD'].includes(request.method())) { writes.push(endpoint); return route.fulfill({ status: 405, headers, json: {} }); }
    if (['/auth/me', '/auth/profile'].includes(endpoint)) return authenticated ? reply(profile) : route.fulfill({ status: 401, headers, json: {} });
    if (endpoint === '/storefront/dashboard') return reply(dashboard);
    if (endpoint === '/partners/me/REFERRAL') return reply({ settings: { isEnabled: false }, participant: null });
    if (endpoint === '/auth/social/yandex/start') return reply({});
    if (endpoint === '/cart') return reply({ items: [], total: 0 });
    if (endpoint === '/storefront/favorites') return reply([]);
    if (url.pathname.startsWith('/api/v1/') && !/^\/(products(?:\/|$)|seo(?:\/|$)|gift-cards\/product$)/.test(endpoint)) return route.fulfill({ status: 403, headers, json: {} });
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  return { context, page, errors, writes, calls };
}
for (const width of [1440, 390, 320]) test(`Club editorial layout ${width}`, async ({ browser }, info) => {
  const f = await isolated(browser, width);
  try {
    const { page } = f;
    await page.goto('/club', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator('.is-club .sb-content-hero');
    expect(await hero.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    await expect(hero.locator('.sb-content-actions .sb-primary')).toHaveCount(1);
    const account = hero.getByRole('link', { name: 'Мой кабинет', exact: true });
    await expect(account.locator('svg')).toBeVisible();
    expect(await account.locator('span').evaluate(el => getComputedStyle(el).textDecorationLine)).toBe('underline');
    const preview = hero.locator('.sb-club-page-preview');
    expect(await preview.evaluate(el => getComputedStyle(el).overflow)).toBe('visible');
    if (width > 760) {
      const card = preview.locator('.sb-club-banner__card');
      await card.hover({ position: { x: 30, y: 30 } });
      await expect(card).toHaveClass(/is-card-tilting/);
      await expect.poll(() => card.evaluate(el => el.style.getPropertyValue('--sb-card-tilt-y'))).not.toBe('0deg');
      await page.mouse.move(5, 5);
      await expect(card).not.toHaveClass(/is-card-tilting/);
    }
    const blocks = await page.locator('.is-club .sb-content-block').evaluateAll(elements => elements.map(el => {
      const style = getComputedStyle(el);
      return { background: style.backgroundColor, radius: style.borderRadius, shadow: style.boxShadow, columns: style.gridTemplateColumns.split(' ').length };
    }));
    expect(blocks).toHaveLength(7);
    for (const style of blocks) expect(style).toMatchObject({ background: 'rgba(0, 0, 0, 0)', radius: '0px', shadow: 'none', columns: width > 760 ? 2 : 1 });
    await expect(page.locator('#referral-rules a')).toHaveCount(0);
    await expect(page.locator('#referral.sb-club-referral h2 em')).toHaveText('Получайте бонусы.');
    await expect(page.locator('.sb-club-referral__flow li')).toHaveCount(3);
    await expect(page.locator('#referral a')).toHaveAttribute('href', '/account?tab=referrals');
    const container = await page.locator('.is-club').boundingBox(), feature = await page.locator('.sb-club-referral').boundingBox();
    expect(Math.abs(container.width - feature.width)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
    await info.attach('club-hero', { body: await hero.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await info.attach('club', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  } finally { await f.context.close(); }
});
test('Referral deep-link selects the customer section, and tabs keep URL in sync', async ({ browser }) => {
  const f = await isolated(browser, 1440, 'CUSTOMER_B2C');
  try {
    await f.page.goto('/account?tab=referrals', { waitUntil: 'networkidle' });
    await expect(f.page.getByRole('heading', { name: 'Приглашайте друзей', exact: true })).toBeVisible();
    await expect(f.page.getByRole('button', { name: 'Пригласить друзей', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(f.page.getByText('Программа пока не открыта.', { exact: false })).toBeVisible();
    await f.page.getByRole('button', { name: 'Мои заказы', exact: true }).click();
    await expect(f.page).toHaveURL(/tab=orders/);
    await f.page.reload({ waitUntil: 'networkidle' });
    await expect(f.page.getByRole('button', { name: 'Мои заказы', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(f.calls.some(c => c.endpoint === '/partners/me/REFERRAL')).toBe(true);
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
test('Guest referral entry opens login and preserves the section after signing in', async ({ browser }) => {
  const f = await isolated(browser, 390);
  try {
    await f.page.goto('/account?tab=referrals', { waitUntil: 'networkidle' });
    const auth = f.page.locator('.sb-auth-drawer');
    await expect(auth).toBeVisible();
    await auth.locator('input[type="email"]').fill('fixture@example.test');
    await auth.locator('input[type="password"]').fill('fixture-password');
    await auth.locator('form button[type="submit"], form .sb-liquid-primary').click();
    await expect(f.page.getByRole('heading', { name: 'Приглашайте друзей', exact: true })).toBeVisible();
    await expect(auth).toHaveCount(0);
    await expect(f.page).toHaveURL(/account\?tab=referrals/);
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
for (const role of ['ADMIN', 'CUSTOMER_B2B']) test(`Referral entry explains customer-only eligibility for ${role}`, async ({ browser }) => {
  const f = await isolated(browser, 390, role);
  try {
    await f.page.goto('/account?tab=referrals', { waitUntil: 'networkidle' });
    await expect(f.page.getByRole('note')).toContainText('Этот раздел доступен частным покупателям.');
    await expect(f.page.getByRole('button', { name: 'Сменить аккаунт и войти как покупатель' })).toBeVisible();
    expect(f.calls.some(c => c.endpoint.startsWith('/partners/'))).toBe(false);
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
test('Phone Easter egg emits waves on hover and lets the last wave finish', async ({ browser }) => {
  const f = await isolated(browser, 1440);
  try {
    await f.page.goto('/', { waitUntil: 'networkidle' });
    const phone = f.page.locator('.sb-home-partnership--bloggers .sb-creator-phone'), particles = f.page.locator('.sb-creator-reaction');
    await phone.scrollIntoViewIfNeeded();
    await phone.hover();
    await expect.poll(() => particles.count()).toBeGreaterThan(3);
    await f.page.mouse.move(5, 5);
    const ids = await particles.evaluateAll(els => els.map(el => el.outerHTML));
    expect(ids.length).toBeGreaterThan(0);
    await f.page.waitForTimeout(850);
    const remaining = await particles.evaluateAll(els => els.map(el => el.outerHTML));
    for (const particle of remaining) expect(ids).toContain(particle);
    await expect(particles).toHaveCount(0, { timeout: 7000 });
    await phone.hover();
    await expect.poll(() => particles.count()).toBeGreaterThan(0);
    await f.page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(particles).toHaveCount(0);
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
test('Social sign-in keeps the referral query in its return URL', async ({ browser }) => {
  const f = await isolated(browser, 1440);
  try {
    await f.page.goto('/account?tab=referrals', { waitUntil: 'networkidle' });
    await f.page.locator('.sb-auth-drawer').getByRole('button', { name: /Яндекс/ }).click();
    await expect.poll(() => new URLSearchParams(f.calls.find(c => c.endpoint === '/auth/social/yandex/start')?.query || '').get('returnUrl')).toBe('/account?tab=referrals');
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
test('Phone clock uses device timezone and updates at the next minute', async ({ browser }) => {
  const f = await isolated(browser, 1440, undefined, { timezoneId: 'Europe/Moscow' });
  try {
    await f.page.clock.install({ time: new Date('2026-09-18T11:07:58Z') });
    await f.page.clock.pauseAt(new Date('2026-09-18T11:08:58Z'));
    await f.page.goto('/', { waitUntil: 'networkidle' });
    const time = f.page.locator('.sb-home-partnership--bloggers .sb-creator-phone__status > span').first();
    await expect(time).toHaveText('14:08');
    await f.page.clock.runFor(2100);
    await expect(time).toHaveText('14:09');
    await f.page.clock.setSystemTime(new Date('2026-09-18T12:21:00Z'));
    await f.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(time).toHaveText('15:21');
    expect(f.errors).toEqual([]); expect(f.writes).toEqual([]);
  } finally { await f.context.close(); }
});
