/* Actual source, isolated UI contracts. No server, network, credentials or DB. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const postcss = require('postcss');
const root = path.resolve(__dirname, '..');
for (const file of ['components/WorkspaceOrdersTable.vue', 'components/ConsoleRail.vue', 'components/AdminOrderDrawer.vue', 'components/storefront/SiteContentEditor.vue', 'pages/workspace.vue']) {
  const descriptor = parse(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  assert.deepEqual(descriptor.errors, []);
  const script = compileScript(descriptor.descriptor, { id: 'studio-check' });
  const template = compileTemplate({ source: descriptor.descriptor.template.content, filename: file, id: 'studio-check', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
}
postcss.parse(fs.readFileSync(path.join(root, 'assets/css/workspace-studio.css'), 'utf8'));
const source = parse(fs.readFileSync(path.join(root, 'components/AdminOrderDrawer.vue'), 'utf8')).descriptor.scriptSetup.content.replace(/^import .*;\s*$/gm, '');
function fixture(order, fetcher = async () => { throw new Error('simulated failure'); }, allowed = true) {
  const states = new Map([['admin-order-selected', vue.ref({ id: 'order', orderNumber: 'SB-001', status: 'NEW', paymentStatus: 'PENDING', ...order })]]);
  const token = vue.ref('isolated-not-a-jwt');
  const context = { exports: {}, ...vue, window: { addEventListener() {}, removeEventListener() {} }, document: { activeElement: null, querySelector: () => null }, HTMLElement: class {},
    useState: (key, initial) => { if (!states.has(key)) states.set(key, vue.ref(initial())); return states.get(key); },
    useRuntimeConfig: () => ({ public: { apiBase: 'http://isolated.invalid/api/v1' } }),
    useWorkspaceSession: () => ({ token, user: vue.ref({ id: 'actor', role: 'ADMIN' }) }), useWorkspaceAccess: () => ({ can: () => allowed }),
    $fetch: fetcher, confirm: () => true, onMounted() {}, onBeforeUnmount() {}, onBeforeRouteLeave() {},
  };
  vm.runInNewContext(stripTypeScriptTypes(source) + '\nexports = { selected, statusDraft, saving, actionError, nextStatuses, savedOrder, saveStatus, close };', context);
  return { ...context.exports, token };
}
async function main() {
  let f = fixture({}); assert.deepEqual(Array.from(f.nextStatuses.value), ['CONFIRMED', 'CANCELLED']);
  f = fixture({ status: 'CONFIRMED', paymentStatus: 'SUCCEEDED' }); assert.deepEqual(Array.from(f.nextStatuses.value), ['ASSEMBLING']);
  f = fixture({ status: 'PAID', paymentStatus: 'SUCCEEDED', reservationState: 'DIGITAL' }); assert.deepEqual(Array.from(f.nextStatuses.value), ['DELIVERED']);
  for (const status of ['DELIVERED', 'REFUNDED', 'CANCELLED']) assert.equal(fixture({ status }).nextStatuses.value.length, 0);
  assert.equal(fixture({}, undefined, false).nextStatuses.value.length, 0);
  f = fixture({}); f.statusDraft.value = 'CONFIRMED'; await f.saveStatus(); assert.equal(f.selected.value.status, 'NEW'); assert.equal(f.statusDraft.value, 'CONFIRMED'); assert.ok(f.actionError.value); assert.equal(f.savedOrder.value, null);
  let release, calls = 0;
  f = fixture({}, async (endpoint, options) => { calls++; assert.equal(endpoint, '/admin/orders/SB-001/status'); assert.equal(options.method, 'PATCH'); assert.equal(options.body.status, 'CONFIRMED'); return new Promise(resolve => release = resolve); });
  f.statusDraft.value = 'CONFIRMED'; const pending = f.saveStatus(); await f.saveStatus(); f.close(); assert.equal(calls, 1); assert.ok(f.selected.value); release({ id: 'order', status: 'CONFIRMED' }); await pending; assert.equal(f.selected.value.status, 'CONFIRMED'); assert.equal(f.statusDraft.value, ''); assert.equal(f.savedOrder.value.id, 'order');
  f = fixture({}, async () => new Promise(resolve => release = resolve)); f.statusDraft.value = 'CONFIRMED'; const stale = f.saveStatus(); f.token.value = 'another-identity'; release({ id: 'order', status: 'CONFIRMED' }); await stale; assert.equal(f.selected.value.status, 'NEW'); assert.equal(f.savedOrder.value, null);
  console.log('Studio: 5 SFCs + CSS compile PASS; permitted stages, digital orders, terminal/denied actions, failure draft, single-flight and identity guards PASS. Actual HTTP/DB writes: 0.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
