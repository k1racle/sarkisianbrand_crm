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
const customerWarehouse = helper('shared/customer-warehouse-status.ts', ['customerWarehouseLabel', 'customerWarehouseAsOf', 'customerWarehouseApplies']);
const availability = helper('shared/confirmed-availability.ts', ['confirmedOneCAvailable', 'confirmedAvailabilityLabel', 'cartAvailabilityProblem']);
const { marketplaceWorkspaceSection } = helper('shared/marketplace-workspace.ts', ['marketplaceWorkspaceSection']);
const order = { source: 'WEB', status: 'NEW', paymentStatus: 'PENDING', reservationState: 'ACTIVE' };
const next = patch => Array.from(h.webOrderNextStatuses({ ...order, ...patch }));
check('customer progress uses only current safe warehouse projection', () => {
  assert.equal(customerWarehouse.customerWarehouseLabel({stage:'SHIPPED',asOf:'2026-10-28T09:00:00Z',isCurrent:true}), 'Отгружен');
  assert.equal(customerWarehouse.customerWarehouseLabel({stage:'NEEDS_ATTENTION',isCurrent:true}), 'Уточняем заказ');
  for (const value of [null,{stage:'SHIPPED',isCurrent:false},{stage:'PRIVATE_INTERNAL_ERROR',isCurrent:true}]) assert.equal(customerWarehouse.customerWarehouseLabel(value), 'Статус склада уточняется');
  assert.equal(customerWarehouse.customerWarehouseAsOf({stage:null,asOf:'2026-10-28T09:00:00Z',isCurrent:false}), '');
  assert.equal(customerWarehouse.customerWarehouseApplies({requiresWarehouse:false,items:[{}]}),false);
});
check('unknown 1C availability is distinct from confirmed zero and blocks existing carts', () => {
  for (const variant of [{available:999},{availabilityStatus:'UNAVAILABLE',available:999}]) { assert.equal(availability.confirmedOneCAvailable(variant),null);assert.equal(availability.confirmedAvailabilityLabel(variant),'Остатки 1С уточняются');assert.ok(availability.cartAvailabilityProblem([{variant,quantity:1}])); }
  assert.equal(availability.confirmedAvailabilityLabel({availabilityStatus:'CURRENT',available:0}),'Нет в наличии');
  assert.equal(availability.cartAvailabilityProblem([{variant:{availabilityStatus:'CURRENT',available:2},quantity:2}]),'');
  assert.ok(availability.cartAvailabilityProblem([{variant:{availabilityStatus:'CURRENT',available:2},quantity:3}]));
});
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
  assert.deepEqual(next({}), ['CONFIRMED']);
  assert.deepEqual(next({ status: 'CONFIRMED' }), []);
  assert.deepEqual(next({ status: 'PAYMENT_WAITING' }), []);
  assert.deepEqual(next({ status: 'ASSEMBLING' }), []);
  assert.deepEqual(next({ reservationState: 'LEGACY' }), ['CONFIRMED', 'CANCELLED']);
  for (const state of [{ execution: {} }, { warehouseExecution: {} }, { isSynced1C: true }, { items: [{ productType: 'PHYSICAL' }] }]) assert.deepEqual(next({ reservationState: 'LEGACY', ...state }), ['CONFIRMED']);
});
check('physical warehouse operations are never offered as manual statuses', () => {
  for (const status of ['PAID', 'ASSEMBLING', 'SHIPPED']) assert.deepEqual(next({ status, paymentStatus: 'SUCCEEDED' }), []);
  assert.deepEqual(next({ status: 'SHIPPED', paymentStatus: 'SUCCEEDED', reservationState: 'CONSUMED' }), [], 'Shipment alone is not delivery');
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
