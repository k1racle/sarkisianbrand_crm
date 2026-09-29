// No browser or network: execute the production composable with reactive Vue state.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
function fixture(role = 'MANAGER_SALES') {
  const user = vue.ref({ id: 'employee', role }), token = vue.ref('fixture-token');
  const permissions = vue.ref(['crm.read', 'crm.write']), requests = [], disposers = [];
  const scope = vue.effectScope();
  const context = { ref: vue.ref, computed: vue.computed, watch: vue.watch,
    onBeforeUnmount: fn => disposers.push(fn), useRuntimeConfig: () => ({ public: { apiBase: 'http://invalid.test' } }),
    useWorkspaceSession: () => ({ user, token }), useWorkspaceAccess: () => ({ can: key => permissions.value.includes(key) }),
    $fetch: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })),
  };
  const source = stripTypeScriptTypes(fs.readFileSync(path.join(__dirname, '../composables/useCrmReminders.ts'), 'utf8')).replace(/^export /gm, '');
  vm.runInNewContext(source + '\nthis.create = useCrmReminders;', context);
  const app = scope.run(() => context.create());
  return { app, user, token, permissions, requests, close: () => { disposers.forEach(fn => fn()); scope.stop(); } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function main() {
  const row = { id: 'reminder', task: { id: 'task', title: 'Allowed' } };
  const f = fixture();
  try {
    const initial = f.app.load(); f.requests[0].resolve([row]); await initial;
    assert.equal(f.app.reminders.value.length, 1);
    const pending = f.app.load(); f.permissions.value = [];
    assert.equal(f.app.reminders.value.length, 0, 'Revocation clears already-rendered data synchronously');
    f.requests[1].resolve([row]); await pending;
    assert.equal(f.app.reminders.value.length, 0, 'A late response cannot restore revoked data');
    await f.app.load(); assert.equal(f.requests.length, 2);
    f.permissions.value = ['crm.read']; await tick();
    f.requests.at(-1).resolve([row]); await tick();
    assert.equal(f.app.canDismiss.value, false);
    const count = f.requests.length; await f.app.dismiss(row.id); assert.equal(f.requests.length, count, 'Read-only roles cannot send a write');
    f.permissions.value = ['crm.read', 'crm.write'];
    const stalePoll = f.app.load(), staleRequest = f.requests.at(-1);
    const dismiss = f.app.dismiss(row.id), write = f.requests.at(-1);
    assert.equal(write.options.method, 'POST');
    await f.app.load(); assert.equal(f.requests.at(-1), write, 'Do not race a poll against dismissal');
    write.resolve({ success: true }); await dismiss;
    staleRequest.resolve([row]); await stalePoll;
    assert.equal(f.app.reminders.value.length, 0, 'A late poll cannot resurrect a dismissed reminder');
    const accountRequest = f.app.load(), response = f.requests.at(-1);
    f.user.value = { id: 'new-employee', role: 'MANAGER_SALES' }; await tick();
    response.resolve([row]); await accountRequest;
    assert.equal(f.app.reminders.value.length, 0, 'Previous employee data never appears in the new session');
    f.requests.at(-1).resolve([]); await tick();
    const failed = f.app.load(); f.requests.at(-1).reject(new Error('403')); await failed;
    assert.equal(f.app.reminders.value.length, 0);
    f.token.value = ''; await f.app.load(); assert.equal(f.app.allowed.value, false);
  } finally { f.close(); }
  const executive = fixture('EXECUTIVE');
  try { executive.permissions.value = ['crm.read']; assert.equal(executive.app.allowed.value, true); assert.equal(executive.app.canDismiss.value, false); } finally { executive.close(); }
  const outsider = fixture('CUSTOMER_B2B');
  try { await outsider.app.load(); assert.equal(outsider.requests.length, 0, 'Permissions alone cannot turn a customer into CRM staff'); } finally { outsider.close(); }
  console.log('CRM reminder access PASS: revoke, stale responses, user change, read-only actions, dismiss/poll race, API failure and logout; no network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
