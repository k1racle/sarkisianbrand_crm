/* Isolated browser checks: public catalog, favorites and all writes are fixtures. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const origin = new URL(process.env.STOREFRONT_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname));
const products = Array.from({ length: 625 }, (_, i) => ({
  id: `favorite-${i}`, slug: `favorite-${i}`, nameRu: `Товар ${i}`, basePrice: 100, currency: 'RUB', isActive: true,
  images: [], categories: [], variants: [{ id: `variant-${i}`, sku: `SKU-${i}`, price: 100, stock: 5, reserved: 0, isActive: true }],
}));

async function setup(browser, width, loggedIn = false, options = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const state = { failProducts: false, failSync: false, delayProducts: 0, delaySync: 0, syncCalls: 0, activeSync: 0, delayWrites: 0, activeWrites: 0, maxWrites: 0, calls: [], writes: [], unknown: [], errors: [], remote: options.remote || (loggedIn ? ['favorite-124'] : []) };
  if (loggedIn) await context.addCookies([{ name: 'sb-customer-token', value: 'fixture-token', url: origin }]);
  await context.addInitScript(({ loggedIn, options }) => {
    if (localStorage.getItem('sb-favorites') === null) localStorage.setItem('sb-favorites', JSON.stringify(loggedIn ? ['favorite-3'] : ['favorite-0','favorite-1','favorite-2','favorite-4','favorite-5','favorite-6','favorite-7','favorite-8','favorite-124','inactive-product']));
    if (localStorage.getItem('sb-favorites:fixture-user') === null) localStorage.setItem('sb-favorites:fixture-user', JSON.stringify(options.accountFavorites || ['favorite-123']));
  }, { loggedIn, options });
  const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' };
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    const reply = (json, status = 200) => route.fulfill({ status, headers, json });
    if (url.pathname.startsWith('/api/v1/')) {
      const endpoint = url.pathname.slice('/api/v1'.length);
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
      if (endpoint === '/products/storefront-content') return reply({ settings: {}, categories: [], socialLinks: [], menuItems: [] });
      if (endpoint === '/cart') return reply({ items: [], total: 0 });
      if (endpoint === '/auth/me') return reply({ id: 'fixture-user', role: 'CUSTOMER_B2C', email: 'user@example.invalid', firstName: 'Анна' });
      if (endpoint === '/auth/login' && method === 'POST') return reply({ accessToken: 'fixture-token', refreshToken: 'fixture-refresh', user: { id: 'fixture-user', role: 'CUSTOMER_B2C', email: 'user@example.invalid', firstName: 'Анна' } });
      if (endpoint === '/storefront/cart/bind' && method === 'POST') return reply({ items: [], total: 0 });
      if (endpoint === '/storefront/favorites' && method === 'GET') {
        state.syncCalls++; state.activeSync++;
        const snapshot = state.remote.map(productId => ({ productId }));
        if (state.delaySync) await new Promise(resolve => setTimeout(resolve, state.delaySync));
        state.activeSync--;
        return state.failSync ? reply({ message: 'offline' }, 503) : reply(snapshot);
      }
      if (endpoint.startsWith('/storefront/favorites/') && ['POST','DELETE'].includes(method)) {
        const id = endpoint.split('/').pop(); state.writes.push({ method, id });
        state.activeWrites++; state.maxWrites = Math.max(state.maxWrites, state.activeWrites);
        if (state.delayWrites) await new Promise(resolve => setTimeout(resolve, state.delayWrites));
        if (method === 'POST' && !state.remote.includes(id)) state.remote.push(id);
        if (method === 'DELETE') state.remote = state.remote.filter(item => item !== id);
        state.activeWrites--;
        return reply({ productId: id });
      }
      if (endpoint === '/products/filters') return reply({ categories: [], purposes: [], features: [], volumes: [], price: { min: 0, max: 0 } });
      if (endpoint === '/products' && method === 'GET') {
        const ids = (url.searchParams.get('ids') || '').split(',').filter(Boolean);
        state.calls.push(ids);
        if (state.delayProducts) await new Promise(resolve => setTimeout(resolve, state.delayProducts));
        if (state.failProducts) return reply({ message: 'offline' }, 503);
        // The product at position 124 never appears in an unfiltered first page.
        return reply({ items: ids.length ? products.filter(item => ids.includes(item.id)) : products.slice(0, 100), total: products.length, pagination: { pages: 1, total: products.length } });
      }
      state.unknown.push(`${method} ${endpoint}`); return reply({ message: 'Unexpected API request' }, 404);
    }
    if (url.origin === origin && ['GET','HEAD'].includes(method)) return route.continue();
    state.unknown.push(`${method} external`); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => state.errors.push(error.message));
  page.setDefaultTimeout(15000);
  return { page, context, state };
}

async function main() {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const f = await setup(browser, width);
      try {
        await f.page.goto(`${origin}/favorites`);
        await f.page.getByRole('heading', { name: 'Товар 124', exact: true }).waitFor();
        await f.page.getByText('Некоторые сохранённые товары сейчас недоступны.').waitFor();
        assert.ok(f.state.calls.some(ids => ids.includes('favorite-124')));
        assert.ok(f.state.calls.every(ids => ids.length <= 8));
        const drawer = f.page.locator('.sb-favorites-drawer');
        await f.page.getByRole('button', { name: 'Избранное', exact: true }).first().click();
        await drawer.getByText('Товар 124', { exact: true }).waitFor();
        await drawer.getByText('Некоторые сохранённые товары сейчас недоступны.').waitFor();
        await drawer.getByRole('button', { name: 'Закрыть', exact: true }).click();
        await f.page.evaluate(() => localStorage.setItem('sb-favorites', JSON.stringify(['inactive-product'])));
        await f.page.reload();
        await f.page.getByRole('heading', { name: 'Сохранённые товары сейчас недоступны', exact: true }).waitFor();
        await f.page.getByRole('button', { name: 'Избранное', exact: true }).first().click();
        await drawer.getByRole('heading', { name: 'Сохранённые товары сейчас недоступны', exact: true }).waitFor();
        await drawer.getByRole('button', { name: 'Закрыть', exact: true }).click();
        await f.page.evaluate(() => localStorage.setItem('sb-favorites', JSON.stringify(['favorite-124'])));
        f.state.failProducts = true;
        await f.page.reload();
        await f.page.getByRole('alert').getByText(/Не удалось загрузить избранное/).waitFor();
        assert.equal(await f.page.getByRole('heading', { name: 'Здесь пока пусто' }).count(), 0);
        f.state.failProducts = false;
        await f.page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
        await f.page.getByRole('heading', { name: 'Товар 124', exact: true }).waitFor();
        assert.deepEqual(f.state.unknown, []); assert.deepEqual(f.state.errors, []);
        console.log(`${width}: guest, old catalog position, batching, inactive item and retry PASS`);
      } finally { await f.context.close(); }
    }
    const f = await setup(browser, 1440, true);
    try {
      await f.page.goto(`${origin}/favorites`);
      await f.page.getByRole('heading', { name: 'Товар 124', exact: true }).waitFor();
      await f.page.getByRole('heading', { name: 'Товар 123', exact: true }).waitFor();
      assert.equal(await f.page.getByRole('heading', { name: 'Товар 3', exact: true }).count(), 0, 'Guest favorites must not leak into the signed-in account');
      assert.ok(f.state.writes.every(write => write.id !== 'favorite-3'));
      f.state.failSync = true; f.state.remote = [];
      await f.page.evaluate(() => localStorage.setItem('sb-favorites:fixture-user', '[]'));
      await f.page.reload();
      await f.page.getByText(/Не удалось синхронизировать избранное с аккаунтом/).waitFor();
      assert.equal(await f.page.getByRole('heading', { name: 'Здесь пока пусто' }).count(), 0);
      assert.deepEqual(f.state.unknown, []); assert.deepEqual(f.state.errors, []);
      console.log('Signed-in: remote + account-local favorites, guest isolation and sync failure PASS');
    } finally { await f.context.close(); }
    const race = await setup(browser, 1440);
    try {
      race.state.delayProducts = 2500; race.state.remote = ['favorite-124'];
      await race.page.goto(`${origin}/favorites`);
      for (let i = 0; i < 100 && !race.state.calls.length; i++) await race.page.waitForTimeout(50);
      assert.ok(race.state.calls.length, 'Guest catalog request must start before sign-in');
      await race.page.locator('.sh-dock').getByRole('button', { name: 'Личный кабинет', exact: true }).click();
      const auth = race.page.locator('.sb-auth-drawer');
      await auth.locator('input[type=email]').fill('user@example.invalid');
      await auth.locator('input[type=password]').fill('fixture-password');
      await auth.getByRole('button', { name: 'Войти', exact: true }).click();
      await race.page.getByRole('heading', { name: 'Товар 123', exact: true }).waitFor();
      await race.page.waitForTimeout(2700);
      assert.equal(await race.page.getByRole('heading', { name: 'Товар 0', exact: true }).count(), 0, 'A late guest response must not appear in the signed-in account');
      assert.ok(race.state.writes.every(write => write.id !== 'favorite-0'), 'Guest favorites must not be added to the account');
      assert.deepEqual(race.state.unknown, []); assert.deepEqual(race.state.errors, []);
      console.log('Late guest catalog response is discarded after sign-in PASS');
    } finally { await race.context.close(); }
    const largeIds = Array.from({ length: 501 }, (_, i) => `favorite-${i}`);
    const large = await setup(browser, 1440, true, { accountFavorites: largeIds, remote: [] });
    try {
      large.state.delayWrites = 10;
      await large.page.goto(`${origin}/favorites`);
      await large.page.getByRole('heading', { name: 'Товар 500', exact: true }).waitFor({ timeout: 30000 });
      for (let i = 0; i < 300 && large.state.writes.length < 501; i++) await large.page.waitForTimeout(50);
      assert.equal(await large.page.evaluate(() => JSON.parse(localStorage.getItem('sb-favorites:fixture-user')).length), 501);
      assert.equal(large.state.writes.filter(write => write.method === 'POST').length, 501, 'Concurrent sync callers share one account operation');
      assert.ok(large.state.maxWrites <= 4, `At most four favorites writes in parallel; got ${large.state.maxWrites}`);
      assert.ok(large.state.calls.every(ids => ids.length <= 8));
      assert.deepEqual(large.state.unknown, []); assert.deepEqual(large.state.errors, []);
      console.log('501 account favorites retained and synced with at most four concurrent writes PASS');
    } finally { await large.context.close(); }
    for (const scenario of ['stale-read', 'pending-add']) {
      const f = await setup(browser, 1440, true, { accountFavorites: ['favorite-123'], remote: scenario === 'stale-read' ? ['favorite-123'] : [] });
      try {
        if (scenario === 'stale-read') f.state.delaySync = 1800;
        else f.state.delayWrites = 1800;
        await f.page.goto(`${origin}/favorites`);
        const card = f.page.locator('article').filter({ has: f.page.getByRole('heading', { name: 'Товар 123', exact: true }) });
        await card.waitFor();
        if (scenario === 'stale-read') assert.ok(f.state.syncCalls > 0);
        else {
          for (let i = 0; i < 100 && !f.state.writes.length; i++) await f.page.waitForTimeout(30);
          assert.equal(f.state.writes[0]?.method, 'POST');
        }
        await card.getByRole('button', { name: 'Убрать из избранного', exact: true }).click();
        for (let i = 0; i < 150 && (f.state.writes.at(-1)?.method !== 'DELETE' || f.state.activeWrites || f.state.remote.length); i++) await f.page.waitForTimeout(50);
        await f.page.waitForTimeout(2000);
        assert.deepEqual(f.state.remote, [], 'Remote favorite must stay removed after earlier sync finishes');
        assert.deepEqual(await f.page.evaluate(() => JSON.parse(localStorage.getItem('sb-favorites:fixture-user'))), [], 'Old sync must not restore the removed item locally');
        assert.equal(await f.page.getByRole('heading', { name: 'Товар 123', exact: true }).count(), 0);
        assert.deepEqual(f.state.unknown, []); assert.deepEqual(f.state.errors, []);
        console.log(`Favorite removal during ${scenario} synchronization PASS`);
      } finally { await f.context.close(); }
    }
    const addition = await setup(browser, 1440, true, { accountFavorites: ['favorite-123'], remote: ['favorite-123'] });
    try {
      addition.state.delaySync = 8000;
      await addition.page.goto(`${origin}/favorites`);
      await addition.page.getByRole('heading', { name: 'Товар 123', exact: true }).waitFor();
      await addition.page.locator('a[href="/catalog"]').first().click();
      const card = addition.page.locator('article').filter({ has: addition.page.getByRole('heading', { name: 'Товар 3', exact: true }) });
      await card.waitFor();
      assert.ok(addition.state.activeSync > 0, 'The original sync must still be in flight when the user clicks');
      await card.getByRole('button', { name: 'Добавить в избранное', exact: true }).click();
      for (let i = 0; i < 200 && addition.state.activeSync; i++) await addition.page.waitForTimeout(50);
      assert.equal(addition.state.activeSync, 0, 'Slow sync completed');
      assert.deepEqual(new Set(addition.state.remote), new Set(['favorite-123', 'favorite-3']));
      assert.deepEqual(new Set(await addition.page.evaluate(() => JSON.parse(localStorage.getItem('sb-favorites:fixture-user')))), new Set(['favorite-123', 'favorite-3']));
      assert.deepEqual(addition.state.unknown, []); assert.deepEqual(addition.state.errors, []);
      console.log('Favorite addition during synchronization is retained locally and remotely PASS');
    } finally { await addition.context.close(); }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
