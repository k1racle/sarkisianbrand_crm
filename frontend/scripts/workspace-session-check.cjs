// Execute real composables against Nuxt-like state: each useState returns a new
// toRef wrapper over the same reactive payload, as Nuxt does in the browser.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { reactive, toRef, computed, ref, watch } = require('vue');
const { parse, compileTemplate } = require('@vue/compiler-sfc');
const root = path.resolve(__dirname, '..');
const compile = file => stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8')).replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '').replaceAll('import.meta.client', 'true');
const failure = status => Object.assign(new Error(`HTTP ${status}`), { statusCode: status });
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function lockManager() { const queues = new Map(); return { request(name, action) { const work = (queues.get(name) || Promise.resolve()).catch(() => undefined).then(action); queues.set(name, work.catch(() => undefined)); return work; } }; }
function setup(handler, initial = {}, environment = {}) {
  const state = reactive({}), storage = environment.storage || new Map(), calls = [], timers = new Map(), windowEvents = new Map(), documentEvents = new Map();
  const clock = { now: 1800000000000 }, route = reactive({ fullPath: '/crm/deals', path: '/crm/deals' });
  let plugin, cleanup, nextTimer = 0;
  const app = { vueApp: { onUnmount: fn => { cleanup = fn; } } };
  const context = {
    Headers, computed, watch,
    window: { location: { pathname: '/crm/deals' }, addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) },
    document: { visibilityState: 'visible', addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) },
    atob: value => Buffer.from(value, 'base64').toString('binary'), Date: { now: () => clock.now },
    navigator: { locks: environment.locks },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: clock.now + delay, delay }); return id; }, clearTimeout: id => timers.delete(id),
    useRoute: () => route,
    useNuxtApp: () => app,
    useRuntimeConfig: () => ({ public: { apiBase: 'http://invalid.test/api/v1' } }),
    useState: (key, init) => { if (!(key in state)) state[key] = init(); return toRef(state, key); },
    defineNuxtPlugin: handler => { plugin = handler; },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { const changed = storage.get(key) !== value; storage.set(key, value); if (changed) environment.onWrite?.(key); }, removeItem: key => { if (storage.delete(key)) environment.onWrite?.(key); } },
    $fetch: async (url, options) => { calls.push({ url, options }); return handler(url, options); },
  };
  vm.runInNewContext(compile('shared/browser-session.ts') + '\n' + compile('composables/useWorkspaceSession.ts') + '\n' + compile('composables/useWorkspaceAccess.ts') + '\nthis.session = useWorkspaceSession(); this.second = useWorkspaceSession(); this.access = useWorkspaceAccess(); this.secondAccess = useWorkspaceAccess();', context);
  Object.entries({ token: 'expired', refreshToken: 'refresh-1', user: { id: 'employee', role: 'ADMIN' }, ...initial }).forEach(([key, value]) => { context.session[key].value = value; });
  context.session.persist();
  vm.runInNewContext(compile('plugins/workspace-session.client.ts').replace('default defineNuxtPlugin', 'defineNuxtPlugin'), context);
  return { ...context, calls, storage, state, timers, clock, route, windowEvents, documentEvents, runPlugin: () => plugin(app), cleanup: () => cleanup?.() };
}
const authHeader = options => new Headers(options.headers).get('Authorization');
function boundary(session, access) {
  const file = 'components/crm/CrmAccessBoundary.vue', { descriptor } = parse(fs.readFileSync(path.join(root, file), 'utf8'));
  assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: file, id: 'session-boundary' }).errors, []);
  const route = reactive({ path: '/crm/deals', fullPath: '/crm/deals?pipeline=one#card' });
  const context = { computed, ref, watch, useRoute: () => route, useWorkspaceSession: () => session, useWorkspaceAccess: () => access, useCrmNavigation: () => ({ active: ref({ id: 'pipeline' }), home: ref('/crm/') }) };
  vm.runInNewContext(stripTypeScriptTypes(descriptor.scriptSetup.content) + '\nthis.boundary={hasSession,loginDestination,permitted,mountedIdentity};', context);
  return context.boundary;
}
async function main() {
  let refreshes = 0, accesses = 0;
  const parallel = setup(async (url, options) => {
    if (url === '/auth/refresh') { refreshes++; await tick(); return { accessToken: 'fresh', refreshToken: 'refresh-2' }; }
    if (authHeader(options) === 'Bearer expired') throw failure(401);
    if (url === '/auth/access') { accesses++; return { permissions: ['crm.read'] }; }
    return { id: 'employee', role: 'ADMIN' };
  });
  assert.notEqual(parallel.session.token, parallel.second.token, 'Fixture must model Nuxt wrapper identity');
  await Promise.all([parallel.session.restoreUser(), parallel.second.restoreUser(), parallel.access.ensure(), parallel.secondAccess.ensure()]);
  assert.equal(refreshes, 1, 'All components/profile/permission checks share one rotating refresh request');
  assert.equal(parallel.storage.get('sarkisian-workspace-refresh'), 'refresh-2');
  assert.equal(parallel.access.ready.value, true); assert.equal(parallel.access.can('crm.read'), true);
  assert.equal(parallel.state['workspace-access'].identity, 'employee:fresh');
  assert.ok(accesses >= 2, 'Permissions must be checked again under the rotated identity');
  const draftAccess = { ready: ref(true), error: ref('') }, draftBoundary = boundary(parallel.session, draftAccess);
  const mountedBeforeRotation = draftBoundary.mountedIdentity.value;
  draftAccess.ready.value = false; parallel.session.token.value = 'rotated-again';
  assert.equal(draftBoundary.permitted.value, false, 'Pending permission check keeps the draft hidden');
  assert.equal(draftBoundary.mountedIdentity.value, mountedBeforeRotation, 'Same employee token rotation must not destroy their draft');
  draftAccess.ready.value = true; assert.equal(draftBoundary.mountedIdentity.value, mountedBeforeRotation);
  parallel.session.logout(); assert.equal(draftBoundary.mountedIdentity.value, '', 'A real signout discards the old view');

  const offline = setup(async () => { throw failure(503); });
  await assert.rejects(offline.session.restoreUser());
  assert.equal(offline.session.token.value, 'expired'); assert.equal(offline.session.refreshToken.value, 'refresh-1');
  assert.equal(offline.calls.length, 1, 'Network/5xx must not initiate rotation');
  await offline.access.ensure(); assert.equal(offline.access.ready.value, false); assert.equal(offline.access.can('crm.read'), false); assert.ok(offline.access.error.value);
  const offlineBoundary = boundary(offline.session, offline.access); assert.equal(offlineBoundary.hasSession.value, true); assert.equal(offlineBoundary.permitted.value, false);
  await offline.runPlugin(); assert.equal(offline.session.token.value, 'expired', 'Startup plugin handles outage without an unhandled rejection or logout');
  const forbidden = setup(async () => { throw failure(403); });
  await assert.rejects(forbidden.session.request('/crm/tasks')); assert.equal(forbidden.calls.length, 1, 'Forbidden mutation must not be replayed or rotate the session');

  const denied = setup(async () => { throw failure(401); });
  assert.equal(await denied.session.restoreUser(), null); assert.equal(denied.session.token.value, ''); assert.equal(denied.session.refreshToken.value, '');
  await denied.access.ensure(); assert.equal(denied.access.can('crm.read'), false);
  const endedBoundary = boundary(denied.session, denied.access); assert.equal(endedBoundary.hasSession.value, false); assert.equal(endedBoundary.permitted.value, false);
  assert.deepEqual(JSON.parse(JSON.stringify(endedBoundary.loginDestination.value)), { path: '/crm/login', query: { redirect: '/crm/deals?pipeline=one#card' } });
  const wrongRole = setup(async () => ({ id: 'client', role: 'CUSTOMER_B2B' }));
  assert.equal(await wrongRole.session.restoreUser(), null); assert.equal(wrongRole.session.user.value, null);

  const rotatedOffline = setup(async (url, options) => {
    if (url === '/auth/refresh') return { accessToken: 'fresh', refreshToken: 'refresh-2' };
    if (authHeader(options) === 'Bearer expired') throw failure(401);
    throw failure(503);
  });
  await assert.rejects(rotatedOffline.session.restoreUser()); assert.equal(rotatedOffline.storage.get('sarkisian-workspace-refresh'), 'refresh-2');
  assert.equal(rotatedOffline.session.token.value, 'fresh');
  const refreshOnly = setup(async url => url === '/auth/refresh' ? { accessToken: 'fresh', refreshToken: 'refresh-2' } : { id: 'employee', role: 'ADMIN' }, { token: '' });
  await refreshOnly.runPlugin(); assert.equal(refreshOnly.session.token.value, 'fresh');

  const late = deferred(), stale = setup(async url => { if (url === '/auth/refresh') return late.promise; throw failure(401); });
  const restoring = stale.session.restoreUser(); await tick(); stale.session.logout(); late.resolve({ accessToken: 'late', refreshToken: 'late-refresh' }); await restoring;
  assert.equal(stale.session.token.value, '', 'Late refresh cannot resurrect a logged-out session');
  const profile = deferred(), changed = setup(async () => profile.promise, { token: 'old-valid' });
  const oldProfile = changed.session.restoreUser(); changed.session.logout();
  changed.session.token.value = 'another'; changed.session.user.value = { id: 'another', role: 'MANAGER_B2B' };
  profile.resolve({ id: 'old-employee', role: 'ADMIN' }); await oldProfile;
  assert.equal(changed.session.user.value.id, 'another', 'Stale profile cannot overwrite the new identity');

  const accessResponse = deferred(), revoke = setup(async url => url === '/auth/access' ? accessResponse.promise : { id: 'employee', role: 'ADMIN' }, { token: 'valid' });
  const permissionCheck = revoke.access.ensure(); revoke.session.logout(); accessResponse.resolve({ permissions: ['system.manage'] }); await permissionCheck;
  assert.equal(revoke.access.ready.value, false); assert.equal(revoke.access.can('system.manage'), false);
  let available = false;
  const retry = setup(async () => { if (!available) throw failure(503); return { permissions: [] }; }, { token: 'valid' });
  await retry.access.ensure(); assert.equal(retry.access.ready.value, false); available = true; await retry.secondAccess.refresh();
  assert.equal(retry.access.ready.value, true); assert.equal(retry.access.can('crm.read'), false, 'Empty confirmed grants remain empty');

  const logout = setup(async (url, options) => {
    if (url === '/auth/refresh') return { accessToken: 'fresh', refreshToken: 'refresh-2' };
    if (authHeader(options) === 'Bearer expired') throw failure(401);
    return { loggedOut: true };
  });
  assert.equal((await logout.session.endSession()).revoked, true); assert.equal(logout.session.token.value, '');
  assert.equal(logout.calls.filter(call => call.url === '/auth/logout').length, 2, 'Expired access is refreshed before confirmed server signout');
  const guest = setup(async () => { throw new Error('Guest page must not restore staff credentials'); }); guest.window.location.pathname = '/meeting-guest'; await guest.runPlugin(); assert.equal(guest.calls.length, 0); assert.equal(guest.timers.size, 0);
  guest.session.token.value = ''; guest.session.refreshToken.value = ''; guest.session.user.value = null;
  guest.storage.set(guest.session.storageKey, JSON.stringify({ version: 1, token: 'other-tab-staff', refreshToken: 'other-tab-refresh', user: { id: 'other', role: 'ADMIN' } }));
  guest.windowEvents.get('storage')({ key: guest.session.storageKey }); await tick(); assert.equal(guest.session.token.value, '', 'Guest storage events must not hydrate a staff login'); assert.equal(guest.calls.length, 0);
  const jwt = expires => 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(expires / 1000) })).toString('base64url') + '.signature';
  let proactiveRefreshes = 0, timerOffline = false;
  const proactive = setup(async url => {
    if (timerOffline) throw failure(503);
    if (url === '/auth/refresh') { proactiveRefreshes++; return { accessToken: jwt(proactive.clock.now + 900000), refreshToken: 'next-refresh' }; }
    if (url === '/auth/access') return { permissions: ['crm.read'] };
    return { id: 'employee', role: 'ADMIN' };
  });
  proactive.session.token.value = jwt(proactive.clock.now + 90000); proactive.session.persist(); await proactive.runPlugin();
  assert.equal(proactiveRefreshes, 0); assert.equal([...proactive.timers.values()][0].delay, 30000, 'Refresh is scheduled one minute before expiry');
  proactive.clock.now += 31000; const due = [...proactive.timers.entries()].find(([, timer]) => timer.at <= proactive.clock.now); proactive.timers.delete(due[0]); due[1].fn(); await tick();
  assert.equal(proactiveRefreshes, 1, 'A valid near-expiry token refreshes before raw mutations can expire'); assert.equal(proactive.access.ready.value, true);
  timerOffline = true; await proactive.windowEvents.get('online')(); await tick();
  assert.ok(proactive.session.token.value); assert.ok([...proactive.timers.values()].some(timer => timer.delay === 30000), 'Outage retry is bounded to 30 seconds');
  assert.equal(proactive.access.ready.value, false);
  proactive.document.visibilityState = 'hidden'; proactive.documentEvents.get('visibilitychange')(); assert.equal(proactive.timers.size, 0);
  proactive.document.visibilityState = 'visible'; timerOffline = false; proactive.documentEvents.get('visibilitychange')(); await tick(); assert.equal(proactive.access.ready.value, true);
  proactive.window.location.pathname = '/catalog'; proactive.route.fullPath = '/catalog'; await tick(); assert.equal(proactive.timers.size, 0, 'Staff timer stops outside internal routes');
  const callsOutside = proactive.calls.length; proactive.windowEvents.get('online')(); await tick(); assert.equal(proactive.calls.length, callsOutside);
  proactive.cleanup(); assert.equal(proactive.windowEvents.size, 0); assert.equal(proactive.documentEvents.size, 0);
  const shared = new Map(), locks = lockManager(); let sharedRefreshes = 0;
  const sharedHandler = async (url, options) => {
    if (url === '/auth/refresh') { sharedRefreshes++; assert.equal(options.body.refreshToken, 'refresh-1'); await tick(); return { accessToken: 'shared-fresh', refreshToken: 'shared-refresh' }; }
    if (authHeader(options) !== 'Bearer shared-fresh') throw failure(401);
    return url === '/auth/access' ? { permissions: ['crm.read'] } : { id: 'employee', role: 'ADMIN' };
  };
  const tabA = setup(sharedHandler, {}, { storage: shared, locks }), tabB = setup(sharedHandler, {}, { storage: shared, locks });
  tabA.session.hydrated.value = true; tabB.session.hydrated.value = true;
  await Promise.all([tabA.session.restoreUser(), tabB.session.restoreUser()]);
  assert.equal(sharedRefreshes, 1, 'Independent Nuxt apps serialize rotation across real tab-like contexts');
  assert.equal(tabB.session.token.value, 'shared-fresh'); assert.equal(tabB.session.generation.value, 0, 'Same-user rotation preserves the draft identity');
  assert.equal(JSON.parse(shared.get('sarkisian-workspace-session')).refreshToken, 'shared-refresh');
  const fallbackStorage = new Map(); let fallbackRefreshes = 0;
  const fallbackHandler = async (url, options) => {
    if (url === '/auth/refresh') { fallbackRefreshes++; return { accessToken: 'fallback-fresh', refreshToken: 'fallback-refresh' }; }
    if (!['Bearer valid-before', 'Bearer fallback-fresh'].includes(authHeader(options))) throw failure(401);
    return url === '/auth/access' ? { permissions: ['crm.read'] } : { id: 'employee', role: 'ADMIN' };
  };
  const visible = setup(fallbackHandler, { token: 'valid-before' }, { storage: fallbackStorage });
  const hidden = setup(fallbackHandler, { token: 'valid-before' }, { storage: fallbackStorage });
  visible.session.hydrated.value = true; hidden.session.hydrated.value = true; await hidden.runPlugin();
  await visible.session.refresh(); hidden.documentEvents.get('visibilitychange')(); await tick();
  assert.equal(fallbackRefreshes, 1, 'Plain HTTP fallback adopts a sequential rotation before using an expired refresh');
  assert.equal(hidden.session.token.value, 'fallback-fresh'); assert.equal(hidden.access.ready.value, true);
  const hiddenGeneration = hidden.session.generation.value;
  visible.session.logout(); hidden.windowEvents.get('storage')({ key: hidden.session.storageKey }); await tick();
  assert.equal(hidden.session.token.value, ''); assert.ok(hidden.session.generation.value > hiddenGeneration, 'Cross-tab logout fences old responses');
  assert.equal(hidden.access.ready.value, false);
  const other = setup(async () => ({}), { token: 'different-user-token', refreshToken: 'different-user-refresh', user: { id: 'replacement', role: 'MANAGER_B2B' } });
  fallbackStorage.set('sarkisian-workspace-session', other.storage.get('sarkisian-workspace-session'));
  hidden.session.syncStoredSession(); assert.equal(hidden.session.user.value.id, 'replacement'); assert.equal(hidden.access.can('crm.read'), false);
  hidden.cleanup();
  const explicitStorage = new Map(), explicitA = setup(fallbackHandler, {}, { storage: explicitStorage }), explicitB = setup(fallbackHandler, {}, { storage: explicitStorage });
  await explicitA.session.refresh(); explicitB.session.logout(); explicitA.session.syncStoredSession();
  assert.equal(explicitA.session.token.value, '', 'Explicit signout wins over an unobserved same-employee rotation');
  assert.equal(JSON.parse(explicitStorage.get(explicitA.session.storageKey)).token, '');
  const softStorage = new Map(), softA = setup(fallbackHandler, {}, { storage: softStorage }), softB = setup(fallbackHandler, {}, { storage: softStorage });
  await softA.session.refresh(); softB.session.logout(false);
  assert.equal(softB.session.token.value, 'fallback-fresh', 'Stale terminal auth failure must adopt a newer stored pair');
  const switchedResponse = deferred(), switched = setup(async () => switchedResponse.promise, {}, { storage: softStorage });
  const previousEmployee = switched.session.request('/crm/tasks');
  softStorage.set(switched.session.storageKey, JSON.stringify({ version: 1, token: 'new-employee', refreshToken: 'new-employee-refresh', user: { id: 'new-employee', role: 'ADMIN' } }));
  switchedResponse.resolve({ private: 'previous employee data' });
  await assert.rejects(previousEmployee, /Сессия изменилась/); assert.equal(switched.session.user.value.id, 'new-employee');
  for (const replacementUser of [null, { id: 'different-login', role: 'MANAGER_B2B' }]) {
    const pendingResponse = deferred(), loginStorage = new Map();
    const loginTab = setup(async () => pendingResponse.promise, {}, { storage: loginStorage });
    const pendingLogin = loginTab.session.login('employee@example.invalid', 'FixtureOnly1');
    loginStorage.set(loginTab.session.storageKey, JSON.stringify({ version: 1, token: replacementUser ? 'different-login' : '', refreshToken: replacementUser ? 'different-refresh' : '', user: replacementUser }));
    pendingResponse.resolve({ accessToken: 'late-login', refreshToken: 'late-login-refresh', user: { id: 'employee', role: 'ADMIN' } });
    await assert.rejects(pendingLogin, /Сессия изменилась/);
    assert.equal(loginTab.session.user.value?.id || null, replacementUser?.id || null, 'Storage sync fences a late login before its storage event is delivered');
    assert.notEqual(JSON.parse(loginStorage.get(loginTab.session.storageKey)).token, 'late-login');
  }
  const emptyStorage = new Map(), pendingEmptyResponse = deferred();
  const emptyPending = setup(async () => pendingEmptyResponse.promise, { token: '', refreshToken: '', user: null }, { storage: emptyStorage });
  const emptyPeer = setup(async () => ({ accessToken: 'peer-login', refreshToken: 'peer-refresh', user: { id: 'peer-employee', role: 'ADMIN' } }), { token: '', refreshToken: '', user: null }, { storage: emptyStorage });
  const emptyLogin = emptyPending.session.login('employee@example.invalid', 'FixtureOnly1');
  const beforeEmptyRoundTrip = emptyStorage.get(emptyPending.session.storageKey);
  await emptyPeer.session.login('peer@example.invalid', 'FixtureOnly1'); emptyPeer.session.logout();
  assert.notEqual(emptyStorage.get(emptyPending.session.storageKey), beforeEmptyRoundTrip, 'An empty→login→logout round trip must publish a distinct revision');
  pendingEmptyResponse.resolve({ accessToken: 'late-empty-login', refreshToken: 'late-refresh', user: { id: 'employee', role: 'ADMIN' } });
  await assert.rejects(emptyLogin, /Сессия изменилась/);
  assert.equal(emptyPending.session.token.value, ''); assert.ok(emptyPending.session.generation.value > 0, 'A new empty tombstone fences pending login even while locally empty');
  const eventStorage = new Map(), pendingStorageEvents = [];
  const eventHandler = async url => url === '/auth/access' ? { permissions: ['crm.read'] } : { id: 'employee', role: 'ADMIN' };
  let eventA, eventB;
  eventA = setup(eventHandler, { token: 'event-valid' }, { storage: eventStorage, onWrite: key => { if (eventB) pendingStorageEvents.push({ target: eventB, key }); } });
  eventB = setup(eventHandler, { token: 'event-valid' }, { storage: eventStorage, onWrite: key => pendingStorageEvents.push({ target: eventA, key }) });
  await Promise.all([eventA.runPlugin(), eventB.runPlugin()]);
  const settledCalls = eventA.calls.length + eventB.calls.length;
  eventB.session.syncStoredSession(); eventB.session.user.value.firstName = 'Updated profile'; eventB.session.persist();
  for (let attempt = 0; attempt < 12 && pendingStorageEvents.length; attempt++) {
    const { target, key } = pendingStorageEvents.shift(); target.windowEvents.get('storage')?.({ key }); await tick();
  }
  assert.equal(pendingStorageEvents.length, 0, 'Automatic cross-tab events must settle rather than continually emit profile revisions');
  assert.equal(eventA.session.user.value.firstName, 'Updated profile');
  for (const target of [eventA, eventB, eventA, eventB]) { target.windowEvents.get('storage')({ key: target.session.storageKey }); await tick(); }
  assert.equal(eventA.calls.length + eventB.calls.length, settledCalls, 'Same-pair profile revisions must not make visible CRM tabs ping-pong auth checks');
  const settledRow = eventStorage.get(eventA.session.storageKey); eventA.session.persist();
  assert.equal(eventStorage.get(eventA.session.storageKey), settledRow, 'Identical profile persistence is a no-op after storage synchronization');
  eventA.cleanup(); eventB.cleanup();
  console.log('CRM session/access PASS: Nuxt-like refs, shared rotation, outage retry, stored rotation, role rejection, stale/logout fences, identity-bound fail-closed permissions, proactive expiry/resume timer, draft preservation and guest/storefront isolation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
