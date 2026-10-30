/* Registry contract: no HTTP, database or business mutations. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = file => stripTypeScriptTypes(read(file)).replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '').replaceAll('import.meta.client', 'false');
const ctx = {};
vm.runInNewContext(source('shared/crm-workspace.ts') + '\n' + source('composables/useWorkspaceNavigation.ts') + '\nthis.h = { CRM_DESTINATIONS, CRM_GROUPS, CRM_MODULES, crmDestination, crmNavigationItems, crmNavigationGroups, crmPrimaryItems, searchCrmNavigation, buildWorkspaceNavigation, flattenWorkspaceNavigation, sanitizeWorkspacePreferences };', ctx);
const h = ctx.h, plain = value => JSON.parse(JSON.stringify(value));
const itemsFor = (role = 'ADMIN', can = () => true) => h.crmNavigationItems(h.flattenWorkspaceNavigation(h.buildWorkspaceNavigation(role, can)));
const all = itemsFor();
const checks = [];
function check(name, run) { run(); checks.push(name); }
check('approved-groups-including-training-and-finance', () => {
  assert.deepEqual(plain(h.crmNavigationGroups(all).map(g => g.label)), ['Мой день', 'Клиенты и продажи', 'Заказы и исполнение', 'Финансы', 'Команда', 'Обучение', 'Маркетинг и партнёры', 'Поддержка', 'Аналитика', 'Настройки CRM']);
  assert.deepEqual(plain(all.map(item=>item.id).sort()),plain(h.CRM_DESTINATIONS.map(item=>item.id).sort()));
  assert.equal(new Set(all.map(i => i.id)).size, all.length);
  assert.equal(new Set(all.map(i => i.to)).size, all.length);
});
check('learning-destinations-have-own-group-and-proper-permissions', () => {
  const learning = h.crmNavigationGroups(all).find(group => group.label === 'Обучение');
  assert.deepEqual(plain(learning.entries.map(entry => [entry.label, entry.item.to])), [
    ['Курсы','/crm/courses'], ['Ученики','/crm/course-students'], ['Настройки','/crm/course-settings'], ['Онлайн-трансляции','/crm/course-live'],
  ]);
  assert.ok(!h.crmNavigationGroups(all).find(group => group.label === 'Маркетинг и партнёры').entries.some(entry => entry.id === 'courses'));
  for (const id of ['courses','course-students','course-settings','course-live']) assert.equal(all.find(item => item.id === id).group, 'Обучение');
  for (const role of ['ADMIN','SUPERVISOR','CONTENT_MANAGER']) assert.ok(itemsFor(role, key => key === 'lms.read').some(item => item.id === 'course-students'));
  assert.ok(!itemsFor('ADMIN', key => key === 'lms.read').some(item => item.id === 'course-live'));
  assert.ok(itemsFor('ADMIN', key => ['lms.read','lms.write'].includes(key)).some(item => item.id === 'course-live'));
  assert.ok(!itemsFor('MANAGER_SALES').some(item => item.group === 'Обучение'));
  assert.ok(h.searchCrmNavigation(all,'обучение ученики').some(item => item.id === 'course-students'));
  assert.ok(h.searchCrmNavigation(all,'обучение эфир').some(item => item.id === 'course-live'));
});
check('each-primary-leaf-exactly-once-and-no-empty-folders', () => {
  const leaves = h.crmNavigationGroups(all).flatMap(g => g.entries.flatMap(e => {
    if (e.children) { assert.ok(e.children.length); assert.ok(e.children.every(i => i.parent === e.id && i.group === g.label)); }
    return e.children || [e.item];
  }));
  assert.equal(new Set(leaves.map(i => i.id)).size, leaves.length);
  // Group order is intentional; registry insertion order is not the sidebar order.
  assert.deepEqual(plain(leaves.map(i => i.id).sort()), plain(h.crmPrimaryItems(all).map(i => i.id).sort()));
});
check('program-settings-are-inside-programs-not-top-level', () => {
  for (const [id, parent] of [['loyalty-settings', 'loyalty'], ['referral-settings', 'referrals'], ['bloggers-settings', 'bloggers']]) {
    const item = all.find(i => i.id === id);
    assert.equal(item.parent, parent); assert.equal(item.group, 'Маркетинг и партнёры');
  }
  assert.equal(all.find(i => i.id === 'channel-integrations').group, 'Настройки CRM');
  assert.equal(all.find(i => i.id === 'channel-orders').group, 'Заказы и исполнение');
});
check('finance-is-permission-gated-and-searchable',()=>{
  assert.equal(all.find(item=>item.id==='payment-calendar').group,'Финансы');
  assert.ok(h.searchCrmNavigation(all,'сервер подписка').some(item=>item.id==='payment-calendar'));
  assert.ok(!h.crmNavigationGroups(itemsFor('ADMIN',p=>p!=='payment_calendar.read')).some(group=>group.label==='Финансы'));
});
check('inventory-needs-stock-and-order-read-permissions',()=>{
  for(const role of ['ADMIN','WAREHOUSE','MANAGER_B2B','MANAGER_SALES','MARKETPLACE_MANAGER','EXECUTIVE','SUPERVISOR']) assert.ok(itemsFor(role).some(item=>item.id==='inventory'));
  for(const denied of ['inventory.read','oms.read']) assert.ok(!itemsFor('MANAGER_B2B',p=>p!==denied).some(item=>item.id==='inventory'));
  assert.ok(!itemsFor('CONTENT_MANAGER').some(item=>item.id==='inventory'));
  assert.ok(h.searchCrmNavigation(all,'резервы').some(item=>item.id==='inventory'));
  assert.equal(all.find(item=>item.id==='inventory').to,'/crm/inventory');
});
check('roles-and-explicit-deny-are-not-expanded-by-grouping', () => {
  for (const role of ['ADMIN','CONTENT_MANAGER','MANAGER_B2B','MANAGER_SALES','MARKETPLACE_MANAGER','SUPERVISOR','EXECUTIVE','IT_SUPPORT','CURATOR','WAREHOUSE']) {
    const allowed = h.flattenWorkspaceNavigation(h.buildWorkspaceNavigation(role));
    assert.ok(itemsFor(role).every(i => allowed.some(a => a.id === i.id)));
    assert.ok(itemsFor(role).some(i => i.id === 'crm-chat'));
    if (role !== 'ADMIN') assert.ok(!itemsFor(role).some(i => i.to.startsWith('/crm/settings/')));
  }
  for (const role of ['B2C', 'B2B', 'CUSTOMER_B2B', 'UNKNOWN', null]) assert.equal(itemsFor(role).length, 0);
  const restricted = itemsFor('ADMIN', permission => !['partners.read','partners.write','partners.payouts','marketplace.read'].includes(permission));
  assert.ok(!h.crmNavigationGroups(restricted).flatMap(g => g.entries).some(e => ['referrals','bloggers','marketplaces'].includes(e.id)));
  assert.equal(h.searchCrmNavigation(restricted, 'блогеры').length, 0);
  const groups = h.buildWorkspaceNavigation('ADMIN', p => p !== 'partners.payouts');
  assert.equal(h.sanitizeWorkspacePreferences({ favorites:['bloggers-payouts'], recent:['bloggers-payouts'], start:'bloggers-payouts' }, groups).favorites.length, 0);
});
check('old-customer-screen-only-fallback-and-bookmark-still-valid', () => {
  assert.ok(!h.crmPrimaryItems(all).some(i => i.id === 'web-customers'));
  assert.ok(!h.searchCrmNavigation(all, 'клиенты').some(i => i.id === 'web-customers'));
  assert.equal(h.crmDestination('/crm/buyers/').id, 'web-customers');
  assert.ok(h.crmPrimaryItems(itemsFor('ADMIN', p => p !== 'customers.read')).some(i => i.id === 'web-customers'));
});
check('executive-read-navigation-does-not-imply-operational-grants', () => {
  const readOnly = itemsFor('EXECUTIVE', key => ['crm.read','customers.read'].includes(key));
  for (const id of ['crm-dashboard','pipeline','tasks','crm-files','customers','organizations']) assert.ok(readOnly.some(item => item.id === id), id);
  for (const id of ['content-plan','bloggers-payouts','access','web-orders']) assert.ok(!readOnly.some(item => item.id === id), id);
  const denied = itemsFor('EXECUTIVE', key => key === 'customers.read');
  for (const id of ['crm-dashboard','pipeline','tasks','crm-files']) assert.ok(!denied.some(item => item.id === id), id);
  const day = parse(read('pages/crm/index.vue')).descriptor.template.content;
  const creationLinks = [...day.matchAll(/<NuxtLink\b[^>]*\bto="\/crm\/(?:tasks|deals)\?create=1"[^>]*>/g)].map(match => match[0]);
  assert.ok(creationLinks.length >= 2, 'Day exposes task and deal creation');
  assert.ok(creationLinks.every(link => link.includes('v-if="can(\'crm.write\')"')), 'Every creation action requires crm.write');
});
check('search-by-program-operation-old-label-and-yo', () => {
  for (const [query, id] of [['блогеры настройки','bloggers-settings'],['рекомендации начисления','referral-rewards'],['ОТЧЕТ ПРОДАЖ','sales-report'],['Клиенты 360','customers'],['канал подключ','channel-integrations']]) {
    assert.ok(h.searchCrmNavigation(all, query).some(i => i.id === id), query);
  }
  assert.ok(!h.searchCrmNavigation(itemsFor('CONTENT_MANAGER'), 'заказы').length);
});
for (const file of ['components/crm/CrmShell.vue','components/crm/CrmAccessBoundary.vue','components/crm/CrmSectionNavigation.vue','components/workspace/PartnerWorkspacePage.vue','components/workspace/ChannelsWorkspacePage.vue','components/workspace/SystemWorkspacePage.vue','components/workspace/StoreWorkspacePage.vue','components/workspace/ReportsWorkspacePage.vue','pages/crm/tasks.vue']) check('compile:' + file, () => {
  const sfc = parse(read(file), { filename:file }); assert.deepEqual(sfc.errors, []);
  const script = compileScript(sfc.descriptor, { id:'crm-nav-contract' });
  const template = compileTemplate({ source:sfc.descriptor.template.content, filename:file, id:'crm-nav-contract', compilerOptions:{ bindingMetadata:script.bindings } });
  assert.deepEqual(template.errors, []);
});
check('shared-recipes-and-native-summary-keyboard', () => {
  postcss.parse(read('assets/css/crm-shell.css'));
  assert.ok(read('composables/useCatalogDialog.ts').includes('a[href],summary,'));
  assert.ok(!parse(read('components/crm/CrmSectionNavigation.vue')).descriptor.styles.length);
});
console.log(`CRM navigation contract PASS: ${checks.length} checks, 10 groups, ${all.length} destinations, roles/DENY, legacy fallback, program search, SFC/CSS compile.`);
