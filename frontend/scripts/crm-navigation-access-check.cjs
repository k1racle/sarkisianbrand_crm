/* Isolated loading contract for initial routes. No real credentials or requests. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
function setup() {
  const state = new Map(), requests = [];
  const session = { user:vue.ref({ id:'fake-a' }), token:vue.ref('not-a-jwt-a') };
  const ctx = { computed:vue.computed, watch:vue.watch, useWorkspaceSession:() => session, useRuntimeConfig:() => ({ public:{ apiBase:'http://invalid.test' } }),
    useState:(key, init) => { if (!state.has(key)) state.set(key, vue.ref(init())); return state.get(key); },
    $fetch:() => new Promise((resolve, reject) => requests.push({ resolve, reject })),
  };
  const source = stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname, '../composables/useWorkspaceAccess.ts'), 'utf8')).replace(/^export /gm, '');
  vm.runInNewContext(source + '\nthis.create = useWorkspaceAccess;', ctx);
  return { access:ctx.create(), second:ctx.create(), requests, session };
}
async function main() {
  const f = setup();
  const protectedPermissions = ['crm.read','crm.write','customers.read','customers.write','partners.payouts','catalog.write','web_orders.write','payment_calendar.read','work_schedule.read'];
  for (const permission of protectedPermissions) assert.equal(f.access.can(permission),false,`Unverified access rejects ${permission}`);
  assert.equal(f.access.can(),true,'Role-only navigation remains available');
  assert.equal(f.access.can('payment_calendar.read'),false,'Finance never uses unverified role fallback');
  assert.equal(f.access.can('work_schedule.read'),false,'Schedules require verified permissions');
  let finished = 0;
  const first = f.access.ensure().then(() => finished++);
  const joined = f.second.ensure().then(() => finished++);
  assert.equal(f.requests.length, 1, 'Concurrent initial routes join access request');
  await vue.nextTick(); assert.equal(finished, 0);
  f.requests[0].resolve({ permissions:['crm.read'] });
  await Promise.all([first, joined]);
  assert.equal(finished, 2); assert.ok(f.access.ready.value); assert.ok(!f.access.can('partners.payouts'));
  await f.second.ensure(); assert.equal(f.requests.length, 1, 'Mount reuses route result');
  const refresh = f.access.refresh();
  for (const permission of protectedPermissions) assert.equal(f.access.can(permission),false,`Refresh never reuses stale ${permission}`);
  let joinedRefresh = false;
  const waiting = f.second.ensure().then(() => { joinedRefresh = true; });
  await vue.nextTick(); assert.ok(!joinedRefresh);
  f.requests[1].resolve({ permissions:['crm.read','partners.payouts','payment_calendar.read'] });
  await Promise.all([refresh, waiting]); assert.ok(f.access.can('partners.payouts'));
  assert.equal(f.access.can('payment_calendar.read'),true,'Verified financial grant is respected');
  f.session.user.value = { id:'fake-b' }; f.session.token.value = 'not-a-jwt-b';
  assert.ok(!f.access.ready.value, 'Old identity permissions do not become current');
  for (const permission of protectedPermissions) assert.equal(f.access.can(permission),false,`New identity never inherits ${permission}`);
  const changed = f.access.ensure(); f.requests[2].resolve({ permissions:[] }); await changed;
  assert.ok(!f.access.can('partners.payouts'));
  const failed = f.access.refresh(), failureWait = f.second.ensure();
  f.requests[3].reject(new Error('fixture unavailable')); await Promise.all([failed, failureWait]);
  assert.ok(f.access.error.value); assert.ok(!f.access.loading.value);
  for (const permission of protectedPermissions) assert.equal(f.access.can(permission),false,`Failure rejects ${permission}`);
  assert.equal(f.access.can('payment_calendar.read'),false,'Failed access check hides finance');
  assert.equal(f.access.can('work_schedule.read'),false,'Failed access check hides schedules');
  const retry = f.access.ensure(); f.requests[4].resolve({ permissions:[] }); await retry;
  assert.ok(f.access.ready.value); assert.equal(f.access.error.value, '');
  f.session.token.value = ''; await f.access.ensure(); assert.equal(f.requests.length, 5);
  for (const permission of protectedPermissions) assert.equal(f.access.can(permission),false,`Logout rejects ${permission}`);
  const race = setup();
  const old = race.access.ensure();
  race.session.user.value = { id:'replacement' }; race.session.token.value = 'replacement-token';
  const replacement = race.access.ensure();
  race.requests[1].resolve({permissions:[]}); await replacement;
  race.requests[0].resolve({permissions:['crm.write']}); await old;
  assert.equal(race.access.can('crm.write'),false,'Late response cannot grant access to another identity');
  const invalid = race.access.refresh(); race.requests[2].resolve({permissions:null}); await invalid;
  assert.ok(race.access.error.value); assert.equal(race.access.can('crm.read'),false,'Malformed response fails closed');
  console.log('CRM access PASS: all permissions fail closed, concurrent checks, cache, refresh, identity isolation, late/malformed response, retry and logout (no network).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
