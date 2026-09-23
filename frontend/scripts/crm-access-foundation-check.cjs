// Pure Vue/composable contracts. No network, database, storage outside this in-memory fixture or auth tokens.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const root = path.resolve(__dirname, '..');
const findings = [];
function sessionHarness(handler) {
  const states = new Map(), storage = new Map(), calls = [];
  const context = {
    useRuntimeConfig: () => ({ public: { apiBase: 'http://mock.invalid/api/v1' } }),
    useState: (key, initial) => { if (!states.has(key)) states.set(key, vue.ref(initial())); return states.get(key); },
    localStorage: { setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key), getItem: key => storage.get(key) || null },
    $fetch: async (url, options) => { calls.push({ url, options }); return handler(url, options); },
  };
  const source = stripTypeScriptTypes(fs.readFileSync(path.join(root, 'composables/useWorkspaceSession.ts'), 'utf8')).replaceAll('import.meta.client', 'true').replace(/^export /gm, '');
  vm.runInNewContext(source + '\nthis.api = useWorkspaceSession();', context);
  const api = context.api;
  api.token.value = 'mock-token'; api.refreshToken.value = 'mock-refresh'; api.user.value = { id: 'mock-user', role: 'ADMIN' }; api.persist();
  return { api, calls, storage };
}
async function check(name, fn) { await fn(); findings.push(name); }
async function main() {
  await check('server logout uses current bearer token before clearing local credentials', async () => {
    const f = sessionHarness(() => ({ loggedOut: true }));
    assert.equal((await f.api.endSession()).revoked, true);
    assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, '/auth/logout');
    assert.equal(f.calls[0].options.method, 'POST'); assert.equal(f.calls[0].options.headers.Authorization, 'Bearer mock-token');
    assert.equal(f.api.token.value, ''); assert.equal(f.api.refreshToken.value, ''); assert.equal(f.api.user.value, null);
    assert.equal(f.storage.size, 0); assert.equal(f.api.logoutWarning.value, '');
  });
  await check('offline sign-out clears this device but does not claim server revocation', async () => {
    const f = sessionHarness(() => { throw new Error('Offline'); });
    assert.equal((await f.api.endSession()).revoked, false);
    assert.equal(f.api.token.value, ''); assert.equal(f.storage.size, 0); assert.ok(f.api.logoutWarning.value.includes('не подтвердил'));
  });
  await check('malformed response is not a successful server logout', async () => {
    const f = sessionHarness(() => ({}));
    assert.equal((await f.api.endSession()).revoked, false); assert.ok(f.api.logoutWarning.value);
  });
  await check('a delayed logout response cannot clear a newer login', async () => {
    let resolve; const pending = new Promise(done => { resolve = done; });
    const f = sessionHarness(() => pending), result = f.api.endSession();
    f.api.token.value = 'new-login'; f.api.user.value = { id: 'another-user', role: 'ADMIN' }; f.api.persist();
    resolve({ loggedOut: true }); await result;
    assert.equal(f.api.token.value, 'new-login'); assert.equal(f.api.user.value.id, 'another-user');
  });
  await check('local cleanup after authentication failure does not send a new logout request', async () => {
    const f = sessionHarness(() => { throw new Error('No requests allowed'); });
    f.api.logout(); assert.equal(f.calls.length, 0); assert.equal(f.storage.size, 0);
  });
  await check('late profile response cannot restore an account after logout', async () => {
    let resolve; const pending = new Promise(done => { resolve = done; });
    const f = sessionHarness(() => pending), request = f.api.restoreUser();
    f.api.logout(); resolve({ id: 'old-user', role: 'ADMIN' }); await request;
    assert.equal(f.api.user.value, null); assert.equal(f.api.token.value, '');
  });
  await check('late refresh response cannot replace a different login', async () => {
    let resolve, requested; const pending = new Promise(done => { resolve = done; });
    const refreshing = new Promise(done => { requested = done; });
    const f = sessionHarness(url => { if (url === '/auth/me') throw new Error('Expired'); requested(); return pending; });
    const request = f.api.restoreUser(); await refreshing;
    f.api.token.value = 'new-login'; f.api.user.value = { id: 'new-user', role: 'ADMIN' };
    resolve({ accessToken: 'old-refreshed', refreshToken: 'old-refresh' }); await request;
    assert.equal(f.api.token.value, 'new-login'); assert.equal(f.api.user.value.id, 'new-user');
  });
  for (const file of ['components/crm/CrmEmployeeAccessReview.vue', 'components/crm/CrmShell.vue', 'components/workspace/SystemWorkspacePage.vue', 'pages/crm/settings/departments.vue', 'pages/crm/login.vue']) {
    await check(`${file}: script/template compile`, () => {
      const { descriptor, errors } = parse(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
      assert.deepEqual(errors, []);
      const script = compileScript(descriptor, { id: 'access-check' });
      const template = compileTemplate({ source: descriptor.template.content, filename: file, id: 'access-check', compilerOptions: { bindingMetadata: script.bindings } });
      assert.deepEqual(template.errors, []);
    });
  }
  await check('CRM sign-out respects the route guard before revoking the session', () => {
    const shell = fs.readFileSync(path.join(root, 'components/crm/CrmShell.vue'), 'utf8');
    assert.ok(shell.indexOf("router.push('/crm/login')") < shell.indexOf('await endSession()'));
    assert.ok(shell.includes('if (!failure) { disconnectRealtime(); await endSession(); }'));
  });
  console.log(JSON.stringify({ passed: findings.length, checks: findings }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
