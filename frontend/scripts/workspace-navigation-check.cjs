/* Isolated helper + SFC/CSS compile checks. No server, browser, HTTP or API writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');
const root = path.join(__dirname, '..');
const findings = [];
function check(name, fn) { fn(); findings.push({ name, passed: true }); }
const source = fs.readFileSync(path.join(root, 'composables/useWorkspaceNavigation.ts'), 'utf8');
const storage = new Map();
const states = new Map();
const mounted = [];
const identity = vue.ref({ id: 'fixture-a', role: 'ADMIN' });
const route = vue.reactive({ path: '/workspace', query: {}, fullPath: '/workspace' });
const access = { can: () => true };
const context = { exports: {}, URLSearchParams, computed: vue.computed, watch: vue.watch,
  useRoute: () => route, useWorkspaceSession: () => ({ user: identity }), useWorkspaceAccess: () => access,
  useState: (key, init) => { if (!states.has(key)) states.set(key, vue.ref(init())); return states.get(key); },
  onMounted: fn => mounted.push(fn),
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
};
const crmSource = stripTypeScriptTypes(fs.readFileSync(path.join(root, 'shared/crm-workspace.ts'), 'utf8')).replace(/^export /gm, '');
const compiled = crmSource + '\n' + stripTypeScriptTypes(source.replaceAll('import.meta.client', 'true')).replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '')
  + '\nexports = { crmLegacyPath, CRM_DESTINATIONS, WORKSPACE_NAVIGATION, WORKSPACE_AREAS, buildWorkspaceNavigation, flattenWorkspaceNavigation, findWorkspaceLeaf, searchWorkspaceLeaves, sanitizeWorkspacePreferences, useWorkspaceNavigation };';
vm.runInNewContext(compiled, context, { filename: 'workspace-navigation-isolated.js' });
const h = context.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const all = h.buildWorkspaceNavigation('ADMIN');
const leaves = h.flattenWorkspaceNavigation(all);
check('unique-registry-ids-and-destinations', () => {
  assert.equal(new Set(leaves.map(x => x.id)).size, leaves.length);
  assert.equal(new Set(leaves.map(x => x.to)).size, leaves.length);
  assert.equal(new Set(all.map(x => x.id)).size, all.length);
});
check('only-real-page-routes-and-coordinated-site-content', () => {
  for (const leaf of leaves) {
    const routePath = leaf.to.split('?')[0].slice(1);
    assert.ok(fs.existsSync(path.join(root, 'pages', routePath + '.vue')) || fs.existsSync(path.join(root, 'pages', routePath, 'index.vue')), leaf.id);
    assert.ok(!/warehouse|refund/.test(leaf.to), leaf.id);
  }
  assert.equal(leaves.filter(x => x.id === 'site-content').length, 1);
});
check('settings-include-salon-subscription', () => { const items=all.find(x => x.id === 'settings').items;assert.equal(items.length,11);assert.ok(items.some(item=>item.id==='salon-subscription'&&item.permission==='system.manage')); });
check('human-group-order-and-no-duplicate-channel-settings', () => {
  assert.deepEqual(plain(all.map(group => group.id)), ['dashboard', 'sales', 'catalog', 'site', 'loyalty', 'referral', 'bloggers', 'marketing', 'crm', 'support', 'channels', 'reports', 'media', 'settings']);
  assert.deepEqual(plain(all.find(group => group.id === 'loyalty').items.map(item => item.id)), ['loyalty-settings', 'loyalty-members']);
  assert.ok(!all.find(group => group.id === 'marketing').items.some(item => item.id.startsWith('loyalty')));
  assert.ok(!leaves.some(item => item.id === 'channel-settings'));
});
check('two-spaces-and-consolidated-marketplace-sales', () => {
  assert.deepEqual(plain(h.WORKSPACE_AREAS.map(area => area.label)), ['CRM','Админка сайта']);
  assert.ok(h.WORKSPACE_AREAS.find(area => area.id === 'crm').groupIds.includes('channels'));
  assert.deepEqual(plain(all.find(group => group.id === 'channels').items.map(item => item.id)), ['channel-dashboard','channel-orders','channel-integrations']);
  assert.ok(!all.find(group => group.id === 'sales').items.some(item => item.id === 'channel-orders'));
  assert.ok(!leaves.some(item => item.id === 'crm-chat'));
  const rail = fs.readFileSync(path.join(root,'components/ConsoleRail.vue'),'utf8');
  const toolbar = fs.readFileSync(path.join(root,'components/WorkspaceToolbar.vue'),'utf8');
  assert.ok(rail.includes('useWorkspaceAreaSelection') && !rail.includes('platform-chat-button'));
  const areaSelection = fs.readFileSync(path.join(root, 'composables/useWorkspaceAreaSelection.ts'), 'utf8');
  assert.ok(areaSelection.includes('WORKSPACE_AREAS'));
  assert.ok(toolbar.includes('workspace-area-switch') && toolbar.includes('switchArea'));
  assert.ok(toolbar.includes('wn-chat-trigger') && toolbar.includes('wn-signout'));
});
check('unknown-and-client-roles-fail-closed', () => {
  for (const role of [null, undefined, '', 'B2C', 'B2B', 'UNKNOWN']) assert.equal(h.buildWorkspaceNavigation(role).length, 0);
});
check('content-manager-no-crm-sales-marketing', () => {
  const groups = h.buildWorkspaceNavigation('CONTENT_MANAGER');
  assert.ok(groups.some(x => x.id === 'site'));
  assert.ok(groups.some(x => x.id === 'catalog'));
  assert.ok(!groups.some(x => ['sales', 'marketing', 'settings'].includes(x.id)));
  assert.deepEqual(plain(groups.find(x => x.id === 'crm').items.map(x => x.id)), ['content-plan']);
});
check('warehouse-no-site-or-marketing', () => {
  const groups = h.buildWorkspaceNavigation('WAREHOUSE');
  assert.ok(groups.some(x => x.id === 'sales'));
  assert.ok(groups.some(x => x.id === 'catalog'));
  assert.ok(!groups.some(x => ['site', 'marketing', 'settings'].includes(x.id)));
});
check('supervisor-admin-backend-intended-navigation', () => {
  const visible = h.flattenWorkspaceNavigation(h.buildWorkspaceNavigation('SUPERVISOR'));
  assert.ok(visible.some(x => x.id === 'web-orders'));
  assert.ok(visible.some(x => x.id === 'products'));
  assert.ok(!visible.some(x => x.to.startsWith('/crm/settings')));
});
check('effective-deny-hides-leaf-from-all-consumers', () => {
  const groups = h.buildWorkspaceNavigation('ADMIN', permission => permission !== 'web_orders.read');
  assert.ok(!h.searchWorkspaceLeaves(groups, 'web').some(x => x.id === 'web-orders'));
  assert.equal(h.findWorkspaceLeaf(groups, '/admin-workspace', 'orders'), null);
  assert.ok(!h.sanitizeWorkspacePreferences({ favorites: ['web-orders'], recent: ['web-orders'], start: 'web-orders' }, groups).favorites.length);
});
check('effective-allow-does-not-bypass-role-leaf-policy', () => {
  const groups = h.buildWorkspaceNavigation('CONTENT_MANAGER', () => true);
  assert.ok(!h.flattenWorkspaceNavigation(groups).some(x => x.id === 'web-orders'));
});
check('access-unavailable-role-fallback-is-usable', () => { assert.ok(h.buildWorkspaceNavigation('MANAGER_SALES').length > 0); });
check('canonical-permission-keys', () => {
  assert.equal(leaves.find(x => x.id === 'web-orders').permission, 'web_orders.read');
  assert.equal(leaves.find(x => x.id === 'products').permission, 'catalog.read');
  assert.equal(leaves.find(x => x.id === 'loyalty-settings').permission, 'loyalty.read');
  assert.equal(leaves.find(x => x.id === 'loyalty-members').permission, 'loyalty.read');
  assert.equal(leaves.find(x => x.id === 'system-overview').permission, 'system.manage');
});
check('default-query-sections-and-no-prefix-misclassification', () => {
  assert.equal(h.findWorkspaceLeaf(all, '/admin-workspace').id, 'web-dashboard');
  assert.equal(h.findWorkspaceLeaf(all, '/crm-marketplaces').id, 'channel-dashboard');
  assert.equal(h.findWorkspaceLeaf(all, '/system-settings', 'overview').id, 'system-overview');
  assert.equal(h.findWorkspaceLeaf(all, '/crm/customers').id, 'customers');
  assert.equal(h.findWorkspaceLeaf(all, '/crm-unknown'), null);
  assert.equal(h.findWorkspaceLeaf(all, '/admin-workspace', ['orders', 'products']), null);
});
check('search-role-scoped-multiword-and-yo-normalized', () => {
  assert.ok(h.searchWorkspaceLeaves(all, 'ОТЧЕТ ПРОДАЖ').some(x => x.id === 'sales-report'));
  assert.ok(h.searchWorkspaceLeaves(all, 'sku').some(x => x.id === 'products'));
  assert.ok(!h.searchWorkspaceLeaves(h.buildWorkspaceNavigation('CONTENT_MANAGER'), 'заказы').length);
});
check('preference-poisoning-and-duplicates-rejected', () => {
  assert.deepEqual(plain(h.sanitizeWorkspacePreferences({ favorites: ['products', 'products', 'https://bad.test', 7], recent: ['pages'], start: '/unknown' }, all)), { favorites: ['products'], recent: ['pages'], start: null });
  assert.deepEqual(plain(h.sanitizeWorkspacePreferences(null, all)), { favorites: [], recent: [], start: null });
});
check('preference-limits-and-role-revocation', () => {
  const p = h.sanitizeWorkspacePreferences({ favorites: leaves.map(x => x.id), recent: leaves.map(x => x.id), start: 'web-orders' }, all);
  assert.equal(p.favorites.length, 12); assert.equal(p.recent.length, 8);
  assert.equal(h.sanitizeWorkspacePreferences(p, h.buildWorkspaceNavigation('CONTENT_MANAGER')).start, null);
});
for (const filename of ['components/ConsoleRail.vue', 'components/WorkspaceToolbar.vue', 'components/WorkspaceSectionIcon.vue', 'components/WorkspaceOverview.vue', 'components/WorkspaceOrdersTable.vue', 'pages/workspace.vue', 'components/workspace/StoreWorkspacePage.vue', 'components/AdminMediaBrowser.vue']) check('sfc-compile:' + filename, () => {
  const file = path.join(root, filename);
  const parsed = parse(fs.readFileSync(file, 'utf8'), { filename: file });
  assert.deepEqual(parsed.errors, []);
  const script = compileScript(parsed.descriptor, { id: 'workspace-navigation-check' });
  const template = compileTemplate({ source: parsed.descriptor.template.content, filename: file, id: 'workspace-navigation-check', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
});
check('css-parse-and-internal-root-scope', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/workspace-navigation.css'), 'utf8');
  postcss.parse(css).walkRules(rule => { selectorParser().astSync(rule.selector); assert.ok(rule.selector.includes('wn-'), rule.selector); });
  assert.ok(!css.includes('.sb-storefront'));
});
check('toolbar-does-not-fetch-access-and-hub-no-fictional-health', () => {
  const toolbar = fs.readFileSync(path.join(root, 'components/WorkspaceToolbar.vue'), 'utf8');
  const hub = fs.readFileSync(path.join(root, 'pages/workspace.vue'), 'utf8');
  assert.ok(!/\$fetch|access\.refresh|fetch\(/.test(toolbar));
  assert.ok(!/Системы работают|Последняя проверка только что/.test(hub));
});
async function main() {
  const navigation = h.useWorkspaceNavigation();
  mounted.forEach(fn => fn());
  check('favorites-and-start-local-only', () => {
    navigation.toggleFavorite('products'); navigation.setStart('products');
    assert.equal(navigation.favorites.value[0].id, 'products');
    assert.equal(navigation.start.value.id, 'products');
    assert.ok(storage.has('sarkisian-workspace-navigation:v1:fixture-a'));
    assert.ok(![...storage.values()].some(value => value.includes('token') || value.includes('email')));
  });
  route.path = '/admin-workspace'; route.query.section = 'products'; route.fullPath = '/admin-workspace?section=products';
  await vue.nextTick();
  check('recent-and-breadcrumbs-derived-from-registry', () => {
    assert.equal(navigation.recent.value[0].id, 'products');
    assert.deepEqual(plain(navigation.breadcrumbs.value.map(x => x.label)), ['Рабочий стол', 'Каталог', 'Товары']);
  });
  identity.value = { id: 'fixture-b', role: 'CONTENT_MANAGER' };
  await vue.nextTick();
  check('preferences-isolated-by-user', () => {
    assert.equal(navigation.favorites.value.length, 0);
    assert.equal(navigation.start.value, null);
    navigation.toggleFavorite('pages');
    assert.ok(storage.has('sarkisian-workspace-navigation:v1:fixture-b'));
    assert.ok(JSON.parse(storage.get('sarkisian-workspace-navigation:v1:fixture-a')).favorites.includes('products'));
  });
  check('unknown-destination-cannot-be-persisted', () => {
    navigation.toggleFavorite('web-orders'); navigation.setStart('https://bad.test');
    assert.ok(!navigation.favorites.value.some(item => item.id === 'web-orders'));
    assert.equal(navigation.start.value, null);
  });
  console.log(JSON.stringify({ isolatedOnly: true, browser: false, networkCalls: 0, apiWrites: 0, checks: findings.length, findings }, null, 2));
}
main().catch(() => { console.error(JSON.stringify({ isolatedOnly: true, passed: false, message: 'Workspace navigation isolated check failed; no external calls made.' })); process.exitCode = 1; });
