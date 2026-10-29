/* Test the account-switch race without a real network or customer session. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { transformSync } = require('esbuild');
const { setTimeout: delay } = require('node:timers/promises');

async function main() {
  const source = fs.readFileSync(path.join(__dirname, '../composables/useStorefront.ts'), 'utf8').replaceAll('import.meta.client', 'true');
  const compiled = transformSync(source, { loader: 'ts', format: 'cjs', target: 'node22' }).code;
  const app = {}, cookies = new Map(), states = new Map(), storage = new Map();
  const writes = [], releases = [], remote = { a: new Set(), b: new Set() };
  const fixture = { block: (method, token) => method === 'POST' && token === 'fixture-a-token', failDelete: false };
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const $fetch = async (url, options = {}) => {
    const token = options.headers?.Authorization?.replace(/^Bearer /, ''), owner = token?.startsWith('fixture-a') ? 'a' : 'b';
    if (url === '/storefront/favorites') return [...remote[owner]].map(productId => ({ productId }));
    if (url.startsWith('/storefront/favorites/') && ['POST', 'DELETE'].includes(options.method)) {
      writes.push({ url, method: options.method, authorization: options.headers.Authorization });
      if (fixture.block(options.method, token)) await new Promise(resolve => releases.push(resolve));
      if (fixture.failDelete && options.method === 'DELETE') { fixture.failDelete = false; throw new Error('fixture offline'); }
      const productId = decodeURIComponent(url.split('/').pop());
      if (options.method === 'POST') remote[owner].add(productId); else remote[owner].delete(productId);
      return {};
    }
    throw new Error('Unexpected fixture call');
  };
  const ctx = { module: { exports: {} }, require, crypto, localStorage, $fetch, Promise, Map, WeakMap, Set,
    useRuntimeConfig: () => ({ public: { apiBase: '/api/v1' } }), useNuxtApp: () => app,
    useCookie: (key, options) => { if (!cookies.has(key)) cookies.set(key, { value: options.default() }); return cookies.get(key); },
    useState: (key, init) => { if (!states.has(key)) states.set(key, { value: init() }); return states.get(key); },
    computed: fn => ({ get value() { return fn(); } }),
  };
  vm.runInNewContext(compiled, ctx);
  const store = ctx.module.exports.useStorefront();
  store.accessToken.value = 'fixture-a-token'; store.user.value = { id: 'account-a' };
  storage.set('sb-favorites:account-a', JSON.stringify(Array.from({ length: 12 }, (_, i) => `product-${i}`)));
  storage.set('sb-favorites:account-b', JSON.stringify(['product-b']));
  const oldSync = store.syncFavorites();
  for (let i = 0; i < 100 && writes.length < 4; i++) await delay(10);
  assert.equal(writes.length, 4, 'The first account starts only one bounded batch');
  // A DELETE is queued behind account A's unresolved POST for the same id.
  store.toggleFavorite('product-0');
  store.accessToken.value = 'fixture-b-token'; store.user.value = { id: 'account-b' };
  await store.syncFavorites();
  releases.forEach(resolve => resolve());
  await oldSync; await delay(0);
  assert.equal(writes.filter(write => write.authorization === 'Bearer fixture-a-token').length, 4, 'No later requests from account A are sent after the switch');
  assert.deepEqual(writes.filter(write => write.authorization === 'Bearer fixture-b-token').map(write => write.url), ['/storefront/favorites/product-b']);
  assert.ok(!writes.some(write => write.method === 'DELETE'), 'Queued account A deletion is not sent after the switch');
  assert.deepEqual(Array.from(store.favoriteIds.value), ['product-b'], 'Old account response must not overwrite the current account');
  console.log('Account switch during pending favorites batch: no later A requests, no A data or token in B PASS');

  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-0'].method, 'DELETE', 'Removal survives account switch without storing a token');
  assert.ok(!storage.get('sb-favorites-pending:account-a').includes('fixture-a-token'));
  fixture.block = () => false;
  store.accessToken.value = 'fixture-a-new-token'; store.user.value = { id: 'account-a' };
  await store.syncFavorites();
  assert.ok(!remote.a.has('product-0'), 'Pending deletion is replayed after returning to account A');
  assert.ok(!store.favoriteIds.value.includes('product-0'), 'Server stale value cannot re-add the deleted favorite');
  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-0'], undefined);
  console.log('Pending removal survives sign-out and is replayed on return PASS');

  remote.a.add('product-50'); store.favoriteIds.value = ['product-50'];
  storage.set('sb-favorites:account-a', JSON.stringify(['product-50']));
  fixture.failDelete = true;
  store.toggleFavorite('product-50');
  for (let i = 0; i < 100 && !store.favoriteSyncError.value; i++) await delay(10);
  assert.equal(store.favoriteSyncError.value, true);
  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-50'].method, 'DELETE');
  await store.syncFavorites();
  assert.ok(!remote.a.has('product-50'));
  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-50'], undefined);
  console.log('Failed removal stays pending and retries successfully PASS');

  remote.a.add('product-55'); store.favoriteIds.value = ['product-55'];
  storage.set('sb-favorites:account-a', JSON.stringify(['product-55']));
  fixture.block = (method, token) => method === 'DELETE' && token === 'fixture-a-new-token';
  const previousReleaseCount = releases.length;
  store.toggleFavorite('product-55');
  for (let i = 0; i < 100 && releases.length === previousReleaseCount; i++) await delay(10);
  assert.equal(releases.length, previousReleaseCount + 1, 'The old delete is in flight');
  store.toggleFavorite('product-55');
  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-55'].method, 'POST');
  store.accessToken.value = null; store.user.value = null;
  releases.at(-1)(); await delay(0);
  fixture.block = () => false;
  store.accessToken.value = 'fixture-a-return-token'; store.user.value = { id: 'account-a' };
  await store.syncFavorites();
  assert.ok(remote.a.has('product-55'), 'Latest add is replayed after the earlier delete');
  assert.ok(store.favoriteIds.value.includes('product-55'));
  assert.equal(JSON.parse(storage.get('sb-favorites-pending:account-a'))['product-55'], undefined);
  console.log('Re-addition survives an in-flight deletion and sign-out PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
