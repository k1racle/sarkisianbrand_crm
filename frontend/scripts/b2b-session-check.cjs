const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { reactive, toRef } = require('vue');
const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../composables/useB2BSession.ts'), 'utf8'))
  .replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '').replaceAll('import.meta.client', 'true');
const storageSource = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../shared/browser-session.ts'), 'utf8')).replace(/^export /gm, '');
const pluginSource = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../plugins/b2b-session.client.ts'), 'utf8')).replace('export default', 'this.plugin =');
const failure = status => Object.assign(new Error(`HTTP ${status}`), { statusCode: status });
function setup(handler, initial = {}, environment = {}) {
  const states = reactive({}), storage = environment.storage || new Map(), calls = [], events = new Map(), documentEvents = new Map();
  let cleanup = () => {};
  const nuxtApp = { vueApp: { onUnmount: fn => { cleanup = fn; } } };
  const context = {
    Headers,
    navigator: { locks: environment.locks },
    defineNuxtPlugin: fn => fn,
    window: { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name) },
    document: { visibilityState: 'visible', addEventListener: (name, fn) => documentEvents.set(name, fn), removeEventListener: name => documentEvents.delete(name) },
    useNuxtApp: () => nuxtApp,
    useRuntimeConfig: () => ({ public: { apiBase: 'http://invalid.test/api/v1' } }),
    useState: (key, init) => { if (!(key in states)) states[key] = init(); return toRef(states, key); },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    $fetch: async (url, options) => { calls.push({url, options}); return handler(url, options); },
  };
  vm.runInNewContext(storageSource + '\n' + source + '\n' + pluginSource + '\nthis.app = useB2BSession(); this.second = useB2BSession();', context);
  Object.entries({ token:'expired', refreshToken:'refresh-1', user:{id:'owner',role:'CUSTOMER_B2B'}, ...initial }).forEach(([key,value]) => context.app[key].value = value);
  context.app.persist();
  return {...context, calls, storage, events, documentEvents, runPlugin: () => context.plugin(nuxtApp), cleanup: () => cleanup()};
}
const deferred = () => { let resolve,reject; const promise = new Promise((a,b) => {resolve=a;reject=b});return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function lockManager() {
  const queues = new Map();
  return { request(name, action) {
    const next = (queues.get(name) || Promise.resolve()).catch(() => {}).then(action);
    queues.set(name, next); return next;
  } };
}
async function main() {
  let count = 0;
  const concurrent = setup(async (url, options) => {
    if (url === '/auth/refresh') { count++; await new Promise(resolve => setImmediate(resolve)); return {accessToken:'fresh',refreshToken:'refresh-2'}; }
    if (options.headers.get('Authorization') === 'Bearer expired') throw failure(401);
    return {id:'owner',role:'CUSTOMER_B2B'};
  });
  await Promise.all([concurrent.app.restore(), concurrent.second.restore(), concurrent.app.request('/b2b/profile'), concurrent.second.request('/b2b/clients')]);
  assert.equal(count,1,'Concurrent components must rotate refresh token once');
  assert.equal(concurrent.storage.get('sarkisian-b2b-refresh'),'refresh-2');
  assert.equal(concurrent.app.token.value,'fresh');
  const offline = setup(async () => { throw failure(503); });
  await assert.rejects(offline.app.restore());
  assert.equal(offline.app.token.value,'expired','Outage is not logout');
  assert.equal(offline.calls.length,1,'Do not rotate token on server/network error');
  const forbidden = setup(async () => { throw failure(403); });
  await assert.rejects(forbidden.app.request('/b2b/profile'));
  assert.equal(forbidden.calls.length,1,'Forbidden operation must not trigger refresh/retry');
  const denied = setup(async () => { throw failure(401); });
  assert.equal(await denied.app.restore(),null);
  assert.equal(denied.app.token.value,'');
  assert.equal(denied.app.refreshToken.value,'');
  const rotation = setup(async (url,options) => {
    if (url === '/auth/refresh') return {accessToken:'fresh',refreshToken:'refresh-2'};
    if (options.headers.get('Authorization') === 'Bearer expired') throw failure(401);
    throw failure(503);
  });
  await assert.rejects(rotation.app.restore());
  assert.equal(rotation.storage.get('sarkisian-b2b-refresh'),'refresh-2','Keep new token if next profile request fails');
  const wrong = setup(async () => ({id:'staff',role:'ADMIN'}));
  assert.equal(await wrong.app.restore(),null);
  assert.equal(wrong.app.token.value,'');
  const waiting = deferred();
  const stale = setup(async url => { if(url==='/auth/refresh')return waiting.promise; throw failure(401); });
  const old = stale.app.restore();
  await new Promise(resolve=>setImmediate(resolve));
  stale.app.logout();
  waiting.resolve({accessToken:'late',refreshToken:'late-refresh'});
  await old;
  assert.equal(stale.app.token.value,'','Late refresh must not resurrect logged out session');
  const response = deferred(), replaced = setup(async()=>response.promise);
  const oldRequest = replaced.app.request('/b2b/profile');
  replaced.app.logout(); response.resolve({name:'Other company'});
  await assert.rejects(oldRequest,/Сессия изменилась/);
  const registration = setup(async()=>null),registrationActor=registration.app.generation.value;
  registration.app.logout();
  assert.throws(()=>registration.app.adoptSession({accessToken:'late',refreshToken:'late-refresh',user:{id:'created-owner',role:'CUSTOMER_B2B'}},registrationActor),/Сессия изменилась/);
  assert.equal(registration.app.token.value,'','A late public registration cannot replace a later session decision');
  const logout = setup(async()=>({loggedOut:true}),{token:'fresh'});
  const loginResponse=deferred(),lateLogin=setup(async()=>loginResponse.promise);
  const pendingLogin=lateLogin.app.login('owner@example.invalid','FixtureOnly1');lateLogin.app.logout();
  loginResponse.resolve({accessToken:'late',refreshToken:'late-refresh',user:{id:'owner',role:'CUSTOMER_B2B'}});
  await assert.rejects(pendingLogin,/Сессия изменилась/);assert.equal(lateLogin.app.token.value,'','Late login must not undo sign-out');
  assert.equal((await logout.app.endSession()).revoked,true);
  assert.equal(logout.calls[0].url,'/auth/logout');
  assert.equal(logout.app.token.value,'');
  const companies = [{id:'company-a',name:'A'},{id:'company-b',name:'B'}];
  const scope = setup(async(url,options)=>url==='/b2b/organizations'?companies:{organization:options.headers.get('X-B2B-Organization-Id')});
  await scope.app.loadOrganizations();
  assert.equal(scope.app.selectedOrganizationId.value,'','Multiple companies require an explicit selection');
  scope.app.selectOrganization('company-a');
  assert.equal((await scope.app.request('/b2b/profile')).organization,'company-a');
  assert.equal(scope.storage.get('sarkisian-b2b-organization:owner'),'company-a');
  assert.equal(scope.calls.filter(call=>call.url==='/b2b/organizations')[0].options.headers.has('X-B2B-Organization-Id'),false);
  assert.throws(()=>scope.app.selectOrganization('foreign-company'),/Нет доступа/);
  let available = companies;
  const revokedCompany = setup(async url=>url==='/b2b/organizations'?available:{});
  await revokedCompany.app.loadOrganizations();revokedCompany.app.selectOrganization('company-a');available=[companies[1]];
  await revokedCompany.app.loadOrganizations(true);assert.equal(revokedCompany.app.selectedOrganizationId.value,'','A revoked company never silently becomes another company');
  await revokedCompany.app.loadOrganizations(true);assert.equal(revokedCompany.app.selectedOrganizationId.value,'','Repeated refresh still requires explicit choice');
  await assert.rejects(revokedCompany.app.request('/b2b/company-settings',{method:'PATCH',body:{name:'Draft for company A'}}),/Выберите организацию/);
  revokedCompany.app.selectOrganization('company-b');await revokedCompany.app.request('/b2b/profile');
  const oldCompanyResponse=deferred(),lateCompany=setup(async url=>url==='/b2b/organizations'?companies:oldCompanyResponse.promise);
  await lateCompany.app.loadOrganizations();lateCompany.app.selectOrganization('company-a');
  const oldCompanyRequest=lateCompany.app.request('/b2b/clients');lateCompany.app.selectOrganization('company-b');oldCompanyResponse.resolve({secret:'Company A'});
  await assert.rejects(oldCompanyRequest,/Организация изменилась/);
  lateCompany.app.logout();assert.equal(lateCompany.app.selectedOrganizationId.value,'');assert.equal(lateCompany.app.organizations.value.length,0);
  const shared = new Map(), locks = lockManager(); let crossTabRefreshes = 0;
  const crossHandler = async (url, options) => {
    if (url === '/auth/refresh') { crossTabRefreshes++; assert.equal(options.body.refreshToken, 'refresh-1'); await tick(); return {accessToken:'cross-fresh',refreshToken:'cross-refresh'}; }
    if (options.headers.get('Authorization') !== 'Bearer cross-fresh') throw failure(401);
    return url === '/b2b/organizations' ? companies : {id:'owner',role:'CUSTOMER_B2B'};
  };
  const tabA = setup(crossHandler, {}, {storage:shared,locks}), tabB = setup(crossHandler, {}, {storage:shared,locks});
  tabB.app.organizations.value = companies; tabB.app.selectOrganization('company-a');
  const organizationRevision = tabB.app.organizationRevision.value;
  await Promise.all([tabA.app.restore(),tabB.app.restore()]);
  assert.equal(crossTabRefreshes,1,'Separate browser contexts must share a Web Lock for one-use refresh rotation');
  assert.equal(tabB.app.token.value,'cross-fresh'); assert.equal(tabB.app.generation.value,0);
  assert.equal(tabB.app.selectedOrganizationId.value,'company-a','Same-owner rotation keeps organization and draft scope');
  assert.equal(tabB.app.organizationRevision.value,organizationRevision);
  const fallbackStorage = new Map(); let fallbackRotations = 0;
  const fallbackHandler = async url => {
    if(url==='/auth/refresh'){fallbackRotations++;return {accessToken:'lan-fresh',refreshToken:'lan-refresh'};}
    return {id:'owner',role:'CUSTOMER_B2B'};
  };
  const visible = setup(fallbackHandler,{}, {storage:fallbackStorage}), hidden = setup(fallbackHandler,{}, {storage:fallbackStorage});
  hidden.app.hydrated.value = true; hidden.runPlugin();
  hidden.app.organizations.value = companies; hidden.app.selectOrganization('company-b');
  await visible.app.refresh(); hidden.documentEvents.get('visibilitychange')();
  await hidden.app.restore(); assert.equal(fallbackRotations,1,'LAN resume adopts the pair before any expired refresh is reused');
  assert.equal(hidden.app.token.value,'lan-fresh');assert.equal(hidden.app.selectedOrganizationId.value,'company-b');
  const previousGeneration=hidden.app.generation.value;
  visible.app.logout();hidden.events.get('storage')({key:hidden.app.storageKey});
  assert.equal(hidden.app.token.value,'');assert.ok(hidden.app.generation.value>previousGeneration);assert.equal(hidden.app.organizations.value.length,0);
  const inactive=setup(async()=>{throw new Error('Inactive storefront must not call B2B API');});inactive.runPlugin();
  inactive.app.token.value='';inactive.app.refreshToken.value='';inactive.app.user.value=null;
  inactive.storage.set(inactive.app.storageKey,JSON.stringify({version:1,token:'other',refreshToken:'other-refresh',user:{id:'other-owner',role:'CUSTOMER_B2B'}}));
  inactive.events.get('storage')({key:inactive.app.storageKey});inactive.events.get('online')();
  assert.equal(inactive.app.token.value,'','Ordinary storefront events must not hydrate business credentials');assert.equal(inactive.calls.length,0);
  const beforeNamespace=hidden.app.token.value;
  fallbackStorage.set('sarkisian-workspace-session',JSON.stringify({version:1,token:'staff',refreshToken:'staff-refresh',user:{id:'staff',role:'ADMIN'}}));
  hidden.events.get('storage')({key:'sarkisian-workspace-session'});assert.equal(hidden.app.token.value,beforeNamespace,'CRM storage does not enter the business namespace');
  // Explicit logout wins over an unobserved same-user rotation; terminal failures do not.
  const explicitStorage=new Map(), explicitA=setup(fallbackHandler,{}, {storage:explicitStorage}), explicitB=setup(fallbackHandler,{}, {storage:explicitStorage});
  await explicitA.app.refresh();explicitB.app.logout();explicitA.app.syncStoredSession();assert.equal(explicitA.app.token.value,'');
  assert.equal(JSON.parse(explicitStorage.get(explicitA.app.storageKey)).token,'','Sign-out publishes a canonical tombstone');
  const softStorage=new Map(),softA=setup(fallbackHandler,{}, {storage:softStorage}),softB=setup(fallbackHandler,{}, {storage:softStorage});
  await softA.app.refresh();softB.app.logout(false);assert.equal(softB.app.token.value,'lan-fresh','Stale auth failure keeps a newer valid pair');
  const oldResult=deferred(), switched=setup(async()=>oldResult.promise,{}, {storage:softStorage});
  const pendingOld=switched.app.request('/b2b/profile');
  softStorage.set(switched.app.storageKey,JSON.stringify({version:1,token:'new-owner-token',refreshToken:'new-owner-refresh',user:{id:'new-owner',role:'CUSTOMER_B2B'}}));
  oldResult.resolve({private:'old owner'});await assert.rejects(pendingOld,/Сессия изменилась/);assert.equal(switched.app.user.value.id,'new-owner');
  for(const replacementUser of [null,{id:'different-owner',role:'CUSTOMER_B2B'}]){
    const pendingResponse=deferred(),loginStorage=new Map(),loginTab=setup(async()=>pendingResponse.promise,{}, {storage:loginStorage});
    const pendingLogin=loginTab.app.login('owner@example.invalid','FixtureOnly1');
    loginStorage.set(loginTab.app.storageKey,JSON.stringify({version:1,token:replacementUser?'different-login':'',refreshToken:replacementUser?'different-refresh':'',user:replacementUser}));
    pendingResponse.resolve({accessToken:'late-login',refreshToken:'late-login-refresh',user:{id:'owner',role:'CUSTOMER_B2B'}});
    await assert.rejects(pendingLogin,/Сессия изменилась/);
    assert.equal(loginTab.app.user.value?.id||null,replacementUser?.id||null,'A pending login cannot overtake another tab before storage-event delivery');
    assert.notEqual(JSON.parse(loginStorage.get(loginTab.app.storageKey)).token,'late-login');
  }
  for(const operation of ['login','registration']){
    const emptyStorage=new Map(),pendingEmptyResponse=deferred();
    const emptyPending=setup(async()=>pendingEmptyResponse.promise,{token:'',refreshToken:'',user:null},{storage:emptyStorage});
    const emptyPeer=setup(async()=>({accessToken:'peer-login',refreshToken:'peer-refresh',user:{id:'peer-owner',role:'CUSTOMER_B2B'}}),{token:'',refreshToken:'',user:null},{storage:emptyStorage});
    emptyPending.app.hydrate();const actor=emptyPending.app.generation.value;
    const pending=operation==='login'?emptyPending.app.login('owner@example.invalid','FixtureOnly1'):null;
    const initialEmpty=emptyStorage.get(emptyPending.app.storageKey);
    await emptyPeer.app.login('peer@example.invalid','FixtureOnly1');emptyPeer.app.logout();
    assert.notEqual(emptyStorage.get(emptyPending.app.storageKey),initialEmpty,'Repeated empty state has an independent event revision');
    const result={accessToken:'late-empty-login',refreshToken:'late-refresh',user:{id:'owner',role:'CUSTOMER_B2B'}};
    if(pending){pendingEmptyResponse.resolve(result);await assert.rejects(pending,/Сессия изменилась/);}
    else assert.throws(()=>emptyPending.app.adoptSession(result,actor),/Сессия изменилась/);
    assert.equal(emptyPending.app.token.value,'');assert.ok(emptyPending.app.generation.value>actor,'A distinct empty tombstone fences pending public auth');
  }
  hidden.cleanup();inactive.cleanup();assert.equal(hidden.events.size,0);
  console.log('B2B session PASS: Nuxt-like refs, cross-tab single rotation/Web Locks, LAN resume, namespace isolation, explicit logout, stale identity fences, recoverable outages and organization draft scope.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
