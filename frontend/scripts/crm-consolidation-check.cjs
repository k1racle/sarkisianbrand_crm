const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = file => stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8')).replace(/^import .*;\s*$/gm, '').replace(/^export /gm, '').replaceAll('import.meta.client', 'false');
const context = {};
vm.runInNewContext(source('shared/crm-workspace.ts') + '\n' + source('composables/useWorkspaceNavigation.ts') + '\nthis.h = { CRM_DESTINATIONS, crmLegacyPath, buildWorkspaceNavigation, flattenWorkspaceNavigation };', context);
const { CRM_DESTINATIONS, crmLegacyPath, buildWorkspaceNavigation, flattenWorkspaceNavigation } = context.h;
assert.equal(new Set(CRM_DESTINATIONS.map(item => item.icon)).size, CRM_DESTINATIONS.length, 'Each section has its own icon');
for (const item of CRM_DESTINATIONS) assert.ok(fs.existsSync(path.join(root, 'pages', item.path.slice(1).replace(/\/$/, '/index') + '.vue')), item.path);
for (const [old, next] of [
  ['/crm-marketplaces/orders', '/crm/marketplaces/orders'], ['/system-settings/staff', '/crm/settings/staff'],
  ['/system-settings/access', '/crm/settings/access'], ['/admin-workspace/orders', '/crm/orders'],
  ['/admin-workspace/bloggers-settings', '/crm/bloggers/settings'], ['/helpdesk/tickets', '/crm/support/tickets'],
]) assert.equal(crmLegacyPath(old), next);
assert.equal(crmLegacyPath('/crm-marketplaces', 'settings'), '/crm/marketplaces/integrations');
assert.equal(crmLegacyPath('/admin-workspace', 'orders'), '/crm/orders');
for (const path of ['/b2b/orders', '/b2b', '/admin-workspace/products', '/admin-workspace/pages', '/system-settings/unknown']) assert.equal(crmLegacyPath(path), undefined, path);
for (const role of ['ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'MARKETPLACE_MANAGER', 'CONTENT_MANAGER', 'WAREHOUSE', 'EXECUTIVE', 'IT_SUPPORT', 'SUPERVISOR']) {
  const allowed = flattenWorkspaceNavigation(buildWorkspaceNavigation(role));
  if (role !== 'ADMIN') assert.ok(!allowed.some(item => item.to.startsWith('/crm/settings/')), role + ' must not gain administration');
  if (role === 'CONTENT_MANAGER') assert.ok(!allowed.some(item => item.id === 'b2b-orders'), 'Content editor must not gain order access');
  if (role === 'MARKETPLACE_MANAGER') assert.ok(allowed.some(item => item.to === '/crm/marketplaces/orders'));
  if (role === 'MANAGER_B2B') assert.ok(allowed.some(item => item.to === '/crm/b2b-orders'));
}
const denied = flattenWorkspaceNavigation(buildWorkspaceNavigation('ADMIN', p => !['system.manage', 'oms.read', 'marketplace.read'].includes(p)));
assert.ok(!denied.some(item => item.id === 'b2b-orders' || item.to.startsWith('/crm/settings/') || item.to.startsWith('/crm/marketplaces/')));
console.log(`CRM consolidation PASS: ${CRM_DESTINATIONS.length} real routes, distinct icons, legacy links, 9 employee roles, explicit DENY, customer B2B and site editors unchanged.`);
