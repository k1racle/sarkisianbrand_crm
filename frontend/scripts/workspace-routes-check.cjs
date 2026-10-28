const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const root = path.resolve(__dirname, '..');
const rolePermissions = {
  ADMIN: ['*'], CONTENT_MANAGER: ['admin.read', 'catalog.read', 'content_plan.read'],
  MANAGER_B2B: ['crm.read', 'customers.read', 'oms.read', 'inventory.read', 'meetings.read'],
  MARKETPLACE_MANAGER: ['marketplace.read', 'oms.read', 'inventory.read', 'meetings.read'],
};
function middleware(file, session = {}) {
  let handler, releaseAccess; const navigations = [], permissions = new Set(session.permissions || rolePermissions[session.role] || []);
  const ready = { value: session.accessReady !== false && !session.deferAccess };
  const access = {
    ready, calls: 0, can: permission => !permission || permissions.has('*') || permissions.has(permission),
    async ensure() {
      this.calls++;
      if (session.deferAccess) { await new Promise(resolve => { releaseAccess = resolve; }); ready.value = true; }
    },
  };
  const compile = source => stripTypeScriptTypes(source).replace(/^import .*;\s*$/gm, '').replaceAll('import.meta.server', 'false').replaceAll('import.meta.client', 'true').replace('export default', 'const definition =').replace(/^export /gm, '');
  const helpers = ['shared/crm-workspace.ts', 'shared/internal-redirect.ts', 'composables/useWorkspaceNavigation.ts'].map(name => compile(fs.readFileSync(path.join(root, name), 'utf8'))).join('\n');
  vm.runInNewContext(helpers + '\n' + compile(fs.readFileSync(path.join(root, file), 'utf8')), {
    URLSearchParams,
    defineNuxtRouteMiddleware: fn => { handler = fn; return fn; },
    useWorkspaceSession: () => ({ hydrate() {}, token: { value: session.token || '' }, user: { value: session.role ? { role: session.role } : null } }),
    useB2BSession: () => ({ hydrate() {}, token: { value: session.b2bToken || '' }, refreshToken: { value: session.b2bRefresh || '' } }),
    useState: key => ({ value: key === 'workspace-signing-out' ? !!session.signingOut : key === 'b2b-signing-out' ? !!session.b2bSigningOut : false }),
    useWorkspaceAccess: () => access,
    navigateTo: (to, options) => { navigations.push(JSON.parse(JSON.stringify({ to, options }))); return to; },
  });
  return { handler, navigations, access, releaseAccess: () => releaseAccess() };
}
const route = (path, query = {}, hash = '') => ({ path, query, hash, fullPath: path + (Object.keys(query).length ? '?' + new URLSearchParams(query) : '') + hash });
async function main() {
  const routes = middleware('middleware/workspace-pages.global.ts');
  await routes.handler(route('/crm-marketplaces', { section: 'settings', q: 'номер' }, '#details'));
  assert.deepEqual(routes.navigations.pop().to, { path: '/crm-marketplaces/integrations', query: { q: 'номер' }, hash: '#details' });
  await routes.handler(route('/helpdesk', { section: 'tickets', queue: 'Первая линия' }));
  assert.deepEqual(routes.navigations.pop().to, { path: '/helpdesk/tickets', query: { queue: 'Первая линия' }, hash: '' });
  await routes.handler(route('/admin-workspace/orders', { section: 'products', status: 'NEW' }));
  assert.deepEqual(routes.navigations.pop().to, { path: '/admin-workspace/orders', query: { status: 'NEW' }, hash: '' });
  const denied = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'CONTENT_MANAGER' });
  for (const path of ['/crm-marketplaces/orders', '/system-settings/staff']) {
    await denied.handler(route(path)); assert.equal(denied.navigations.pop().to, '/crm/');
  }
  const guest = middleware('middleware/workspace-auth.global.ts');
  await guest.handler(route('/admin-workspace/orders', { status: 'NEW' }));
  assert.deepEqual(guest.navigations.pop().to, { path: '/workspace-login', query: { redirect: '/admin-workspace/orders?status=NEW' } });
  const allowed = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'MARKETPLACE_MANAGER' });
  await allowed.handler(route('/crm-marketplaces/orders')); assert.equal(allowed.navigations.length, 0);
  await allowed.handler(route('/workspace-login')); assert.equal(allowed.navigations.pop().to, '/admin-workspace/dashboard');
  const signingOut = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'ADMIN', signingOut: true });
  for (const path of ['/workspace-login', '/crm/login']) { await signingOut.handler(route(path)); assert.equal(signingOut.navigations.length, 0); }
  const crmRoutes = middleware('middleware/crm-routes.global.ts');
  await crmRoutes.handler(route('/crm-pipeline', { pipeline: 'one' }, '#card'));
  assert.deepEqual(crmRoutes.navigations.pop().to, { path: '/crm/deals', query: { pipeline: 'one' }, hash: '#card' });
  await guest.handler(route('/crm/tasks', { task: 'one' }));
  assert.deepEqual(guest.navigations.pop().to, { path: '/crm/login', query: { redirect: '/crm/tasks?task=one' } });
  const manager = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'MANAGER_B2B' });
  await manager.handler(route('/crm/bloggers/payouts')); assert.equal(manager.navigations.pop().to, '/crm/');
  await manager.handler(route('/crm/deals')); assert.equal(manager.navigations.length, 0);
  assert.equal(manager.access.calls, 2, 'Route checks must await the authoritative access check');
  const revoked = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'MANAGER_B2B', permissions: ['customers.read'] });
  await revoked.handler(route('/crm/deals')); assert.equal(revoked.navigations.pop().to, '/crm/customers');
  const pending = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'MANAGER_B2B', deferAccess: true });
  const checking = pending.handler(route('/crm/deals')); assert.equal(pending.navigations.length, 0);
  assert.equal(pending.access.calls, 1); pending.releaseAccess(); await checking; assert.equal(pending.navigations.length, 0);
  const unavailable = middleware('middleware/workspace-auth.global.ts', { token: 'fixture', role: 'MANAGER_B2B', permissions: [], accessReady: false });
  await unavailable.handler(route('/crm/deals')); assert.equal(unavailable.navigations.length, 0, 'Network failures retain the URL for retry');
  const refreshedB2B = middleware('middleware/workspace-auth.global.ts', { b2bRefresh: 'fixture-refresh' });
  await refreshedB2B.handler(route('/b2b')); assert.equal(refreshedB2B.navigations.length, 0);
  await refreshedB2B.handler(route('/b2b-login')); assert.equal(refreshedB2B.navigations.pop().to, '/b2b');
  const b2bSignout = middleware('middleware/workspace-auth.global.ts', { b2bRefresh: 'fixture-refresh', b2bSigningOut: true });
  await b2bSignout.handler(route('/b2b-login')); assert.equal(b2bSignout.navigations.length, 0);
  await guest.handler(route('/b2b', { section: 'calendar' }));
  assert.deepEqual(guest.navigations.pop().to, { path: '/b2b-login', query: { redirect: '/b2b?section=calendar' } });
  let count = 0;
  for (const family of ['admin-workspace', 'crm-marketplaces', 'helpdesk', 'leadership', 'system-settings']) for (const file of fs.readdirSync(path.join(root, 'pages', family)).filter(x => x.endsWith('.vue'))) {
    const filename = path.join(root, 'pages', family, file), { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename }); assert.deepEqual(errors, []);
    const bindings = descriptor.scriptSetup ? compileScript(descriptor, { id: 'route-check' }).bindings : {};
    if (descriptor.template) assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename, id: 'route-check', compilerOptions: { bindingMetadata: bindings } }).errors, []);
    count++;
  }
  console.log(`${count} route SFCs PASS; awaited permission checks, retained filters/hash, canonical CRM redirects, role/guest/B2B refresh/signout guards PASS. No HTTP/DB.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
