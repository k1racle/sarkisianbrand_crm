// Pure contracts + compilation only. No HTTP, database or application writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const root = path.join(__dirname, '..');
const findings = [];
function check(name, fn) { fn(); findings.push(name); }
function helper(file, exports) {
  const source = stripTypeScriptTypes(fs.readFileSync(path.join(root, file), 'utf8')).replace(/^export /gm, '');
  const context = {};
  vm.runInNewContext(`${source}\nresult = { ${exports.join(',')} };`, context);
  return context.result;
}
const h = helper('shared/web-order-actions.ts', ['webOrderNextStatuses', 'WEB_ORDER_OPERATOR_ROLES']);
const { marketplaceWorkspaceSection } = helper('shared/marketplace-workspace.ts', ['marketplaceWorkspaceSection']);
const order = { source: 'WEB', status: 'NEW', paymentStatus: 'PENDING', reservationState: 'ACTIVE' };
const next = patch => Array.from(h.webOrderNextStatuses({ ...order, ...patch }));
check('marketplace overview and legacy dashboard render the same section', () => {
  for (const section of ['overview', 'dashboard', undefined, 'unknown']) assert.equal(marketplaceWorkspaceSection(section), 'dashboard');
  for (const section of ['settings', 'integrations']) assert.equal(marketplaceWorkspaceSection(section), 'integrations');
  assert.equal(marketplaceWorkspaceSection('orders'), 'orders');
});
check('no cross-channel actions', () => {
  for (const source of ['B2B', 'OZON', 'WILDBERRIES', 'YANDEX_MARKET', 'MEGAMARKET', undefined]) assert.deepEqual(next({ source }), []);
  assert.deepEqual(Array.from(h.webOrderNextStatuses(null)), []);
});
check('terminal and released orders have no direct status actions', () => {
  for (const status of ['DELIVERED', 'CANCELLED', 'REFUNDED']) assert.deepEqual(next({ status }), []);
  assert.deepEqual(next({ reservationState: 'RELEASED' }), []);
});
check('unpaid orders cannot be marked paid or shipped by list position', () => {
  assert.deepEqual(next({}), ['CONFIRMED', 'CANCELLED']);
  assert.deepEqual(next({ status: 'CONFIRMED' }), ['CANCELLED']);
  assert.deepEqual(next({ status: 'PAYMENT_WAITING' }), ['CANCELLED']);
  assert.deepEqual(next({ status: 'ASSEMBLING' }), []);
});
check('verified physical payment enables fulfillment in order', () => {
  for (const [status, target] of [['PAID', 'ASSEMBLING'], ['ASSEMBLING', 'SHIPPED'], ['SHIPPED', 'DELIVERED']]) {
    assert.deepEqual(next({ status, paymentStatus: 'SUCCEEDED' }), [target]);
  }
});
check('digital paid orders bypass physical shipping', () => {
  assert.deepEqual(next({ status: 'PAID', paymentStatus: 'SUCCEEDED', reservationState: 'DIGITAL' }), ['DELIVERED']);
  assert.deepEqual(next({ status: 'CONFIRMED', paymentStatus: 'SUCCEEDED', priceSnapshot: { digitalDelivery: true } }), ['DELIVERED']);
  assert.deepEqual(next({ status: 'PAID', reservationState: 'DIGITAL' }), []);
});
check('financial operations are never offered as direct status changes', () => {
  for (const paymentStatus of ['PENDING', 'SUCCEEDED', 'PAID', 'REFUNDING', 'REFUNDED']) {
    for (const status of ['NEW', 'CONFIRMED', 'PAYMENT_WAITING', 'PAID', 'ASSEMBLING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']) {
      const actions = next({ status, paymentStatus });
      assert.ok(!actions.includes('PAID') && !actions.includes('REFUNDED'));
      if (paymentStatus !== 'PENDING') assert.ok(!actions.includes('CANCELLED'));
    }
  }
});
for (const file of ['components/AdminOrderDrawer.vue', 'components/workspace/StoreWorkspacePage.vue', 'components/workspace/ChannelsWorkspacePage.vue']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  check(`${file}: script and template compile`, () => {
    const { descriptor, errors } = parse(source, { filename: file });
    assert.deepEqual(errors, []);
    const script = compileScript(descriptor, { id: 'launch-check' });
    const template = compileTemplate({ source: descriptor.template.content, filename: file, id: 'launch-check', compilerOptions: { bindingMetadata: script.bindings } });
    assert.deepEqual(template.errors, []);
  });
  if (!file.includes('ChannelsWorkspace')) check(`${file}: shared rules, actual permission and fail-closed readiness`, () => {
    assert.ok(source.includes("from '~/shared/web-order-actions'"));
    assert.match(source, /(?:access|productAccess)\.ready\.value/);
    assert.ok(source.includes("can('web_orders.write')"));
    assert.ok(!source.includes('web_orders.manage'));
    assert.ok(!source.includes('orderStatuses[index + 1]'));
  });
  else check('marketplace component actually uses normalized routing', () => {
    assert.ok(source.includes('marketplaceWorkspaceSection(props.pageSection || route.query.section)'));
  });
}
console.log(JSON.stringify({ passed: findings.length, checks: findings }, null, 2));
