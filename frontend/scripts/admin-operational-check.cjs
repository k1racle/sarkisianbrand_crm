/* Actual SFC script/template checks + isolated Vue-reactivity mock tests.
 * Run: node frontend/scripts/admin-operational-check.cjs
 * No browser, server, Nuxt build, network, login, provider or DB access.
 * Every $fetch is an explicit in-memory fixture; unknown requests fail closed.
 * This checks behaviour, not production rendering/authentication/integrations.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const Vue = require('vue');
const esbuild = require('esbuild');
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc');
const frontend = path.resolve(__dirname, '..');
const files = ['pages/crm/tasks.vue', 'components/workspace/SupportWorkspacePage.vue', 'components/workspace/ChannelsWorkspacePage.vue', 'components/CrmPipelineSettings.vue', 'components/EcosystemIntegrations.vue', 'components/BotCommandsSettings.vue', 'components/workspace/SystemWorkspacePage.vue', 'components/AdminNewProduct.vue'];
const scripts = new Map();
for (const file of files) {
  const filename = path.join(frontend, file), source = fs.readFileSync(filename, 'utf8');
  const parsed = parse(source, { filename });
  assert.deepEqual(parsed.errors, [], `${file}: SFC parse`);
  const script = compileScript(parsed.descriptor, { id: 'operational-check', genDefaultAs: '__component__' });
  const template = compileTemplate({ source: parsed.descriptor.template.content, filename, id: 'operational-check', compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, [], `${file}: template compile`);
  for (const style of parsed.descriptor.styles) assert.deepEqual(compileStyle({ source: style.content, filename, id: 'data-v-operational-check', scoped: style.scoped }).errors, [], `${file}: scoped CSS compile`);
  scripts.set(file, esbuild.transformSync(script.content + '\nmodule.exports = __component__;', { loader: 'ts', format: 'cjs', target: 'es2022' }).code);
}
const clone = value => JSON.parse(JSON.stringify(value));
function harness(file, query = {}, props = {}) {
  const calls = [], navigations = [], menus = [], lifecycle = {}, events = [];
  const route = Vue.reactive({ path: '/' + path.basename(file, '.vue'), query: { ...query } });
  const state = { confirm: true, handler: () => { throw new Error('Unexpected mock request'); } };
  const module = { exports: {} };
  const context = {
    ...Vue,
    AbortController,
    module, exports: module.exports,
    require(name) {
      if (name === 'vue') return { ...Vue, onMounted: fn => { lifecycle.mounted = fn; }, onUnmounted: fn => { lifecycle.unmounted = fn; } };
      if (name === '@lucide/vue') return new Proxy({}, { get: () => () => null });
      throw new Error('Unmocked import: ' + name);
    },
    onMounted: fn => { lifecycle.mounted = fn; },
    onUnmounted: fn => { lifecycle.unmounted = fn; },
    onBeforeUnmount: fn => { lifecycle.beforeUnmount = fn; },
    onBeforeRouteLeave: fn => { lifecycle.leave = fn; },
    watch: (source, callback, options) => { if (options?.immediate) callback(source()); },
    useRoute: () => route,
    useRouter: () => ({ beforeEach: fn => { lifecycle.guard = fn; return () => {}; } }),
    useRuntimeConfig: () => ({ public: { apiBase: 'http://mock.invalid/api/v1' } }),
    useWorkspaceSession: () => ({ token: Vue.ref('mock-not-a-jwt'), user: Vue.ref({ id: 'qa-operator', role: 'ADMIN', email: 'operator@example.invalid' }) }),
    useContextMenu: () => ({ openContextMenu: (...args) => menus.push(args), copyText: () => {} }),
    navigateTo: async (target, options) => { navigations.push({ target: clone(target), options: options && clone(options) }); },
    window: { confirm: () => state.confirm },
    document: { querySelector: () => null, body: {} },
    MutationObserver: class { observe() {} disconnect() {} },
    location: { reload: () => events.push(['reload']) },
    confirm: () => state.confirm,
    setTimeout: () => 0, clearTimeout: () => {},
    fetch: () => { throw new Error('Network is forbidden'); },
    console,
    $fetch: async (endpoint, options = {}) => {
      const call = { endpoint, method: options.method || 'GET', body: options.body && clone(options.body), query: options.query && clone(options.query) };
      calls.push(call);
      return clone(await state.handler(endpoint, options));
    },
  };
  vm.runInNewContext(scripts.get(file), context, { filename: file, timeout: 5000 });
  const api = module.exports.setup(props, { expose() {}, emit: (...args) => events.push(args) });
  return { api, state, calls, navigations, menus, lifecycle, route, events };
}
const task = () => ({ id: 'qa-task', title: 'Synthetic task', description: '', status: 'TODO', priority: 'MEDIUM', progress: 0, startDate: '2026-09-16T00:00:00Z', dueDate: '2026-09-20T00:00:00Z', assignedToId: 'qa-operator', comments: [], _count: { comments: 0 } });
const ticket = () => ({ id: 'qa-ticket', number: 'QA-001', subject: 'Synthetic ticket', queue: 'Первая линия', source: 'EMPLOYEE', status: 'NEW', priority: 'MEDIUM', assignedToId: 'qa-operator', comments: [] });
const order = (status = 'NEW') => ({ id: 'qa-order', externalId: 'QA-001', orderNumber: 'QA-OMS-001', channel: 'OZON', status });
const rejected = () => { throw { data: { message: 'Synthetic denied request' } }; };
function defer() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function taskHarness() { const h = harness(files[0]); h.api.tasks.value = [task()]; h.api.openTask(h.api.tasks.value[0]); return h; }
function pipelineHarness() { const h = harness(files[3], {}, { modelValue: false }); h.api.pipelines.value = [{ id: 'qa-pipeline', stages: ['a', 'b', 'c'].map(id => ({ id, name: id })) }]; h.api.selectedId.value = 'qa-pipeline'; return h; }

test('task draft is detached; cancel respects dirty confirmation', () => {
  const h = taskHarness(); assert.equal(h.api.dirty.value, false);
  h.api.selected.value.title = 'Unsaved'; assert.equal(h.api.tasks.value[0].title, 'Synthetic task'); assert.equal(h.api.dirty.value, true);
  h.state.confirm = false; assert.equal(h.api.closeTask(), false); assert.equal(h.lifecycle.leave(), false);
  h.state.confirm = true; assert.equal(h.api.closeTask(), true); assert.equal(h.api.selected.value, null); assert.equal(h.api.tasks.value[0].title, 'Synthetic task');
});
test('failed task save preserves draft and list; retry commits detached success', async () => {
  const h = taskHarness(); h.api.selected.value.title = 'Saved task'; h.state.handler = rejected;
  await h.api.saveSelected(); assert.equal(h.api.tasks.value[0].title, 'Synthetic task'); assert.equal(h.api.selected.value.title, 'Saved task'); assert.ok(h.api.error.value); assert.equal(h.api.saving.value, false);
  h.state.handler = (endpoint, options) => ({ ...task(), ...options.body }); await h.api.saveSelected();
  assert.equal(h.api.tasks.value[0].title, 'Saved task'); assert.equal(h.api.dirty.value, false);
  h.api.selected.value.title = 'Another draft'; assert.equal(h.api.tasks.value[0].title, 'Saved task');
});
test('task save rejects duplicate calls and closing while pending', async () => {
  const h = taskHarness(), pending = defer(); h.state.handler = () => pending.promise;
  const first = h.api.saveSelected(); await h.api.saveSelected(); assert.equal(h.calls.length, 1); assert.equal(h.api.closeTask(), false);
  pending.resolve(task()); await first; assert.equal(h.api.saving.value, false);
});
test('task status change failure leaves basket of tasks unchanged', async () => {
  const h = taskHarness(); h.state.handler = rejected; await h.api.moveTask('qa-task', 'DONE');
  assert.equal(h.api.tasks.value[0].status, 'TODO'); assert.ok(h.api.error.value); assert.equal(h.api.dragged.value, '');
});
test('dirty task status change can be cancelled without any request', async () => {
  const h = taskHarness(); h.api.selected.value.title = 'Unsaved'; h.state.confirm = false;
  await h.api.moveTask('qa-task', 'DONE'); assert.equal(h.calls.length, 0);
});
test('comment failure preserves text; successful comment does not save task draft', async () => {
  const h = taskHarness(); h.api.selected.value.title = 'Unsaved'; h.api.comment.value = 'Synthetic comment'; h.state.handler = rejected;
  await h.api.addComment(); assert.equal(h.api.comment.value, 'Synthetic comment'); assert.equal(h.api.tasks.value[0].comments.length, 0);
  h.state.handler = () => ({ id: 'qa-comment', body: 'Synthetic comment', createdAt: '2026-09-16T10:00:00Z' }); await h.api.addComment();
  assert.equal(h.api.comment.value, ''); assert.equal(h.api.tasks.value[0].comments.length, 1); assert.equal(h.api.tasks.value[0].title, 'Synthetic task'); assert.equal(h.api.selected.value.title, 'Unsaved'); assert.equal(h.api.dirty.value, true);
});
test('task archive failure retains list; retry removes only on success', async () => {
  const h = taskHarness(); h.state.handler = rejected; await h.api.archiveTask(h.api.tasks.value[0]); assert.equal(h.api.tasks.value.length, 1);
  h.state.handler = () => ({}); await h.api.archiveTask(h.api.tasks.value[0]); assert.equal(h.api.tasks.value.length, 0); assert.equal(h.api.selected.value, null);
});
test('task comment is single-flight and draft remains detached', async () => {
  const h = taskHarness(), pending = defer(); h.api.comment.value = 'Synthetic comment'; h.state.handler = () => pending.promise;
  const first = h.api.addComment(); await h.api.addComment(); assert.equal(h.calls.length, 1);
  pending.resolve({ id: 'qa-comment', body: 'Synthetic comment' }); await first; assert.equal(h.api.tasks.value[0].comments.length, 1); assert.equal(h.api.dirty.value, false);
});
test('new task draft cannot close while dirty or request is pending', async () => {
  const h = harness(files[0]); h.api.openCreate(); h.api.draft.title = 'Synthetic new task'; h.state.confirm = false;
  assert.equal(h.api.closeCreate(), false); assert.equal(h.lifecycle.leave(), false);
  const pending = defer(); h.state.handler = endpoint => endpoint === '/crm/tasks' ? pending.promise : [];
  const first = h.api.createTask(); await h.api.createTask(); assert.equal(h.calls.length, 1); assert.equal(h.api.closeCreate(), false);
  pending.resolve(task()); await first; assert.equal(h.api.dialog.value, false);
});
test('failed task creation keeps all form fields for retry', async () => {
  const h = harness(files[0]); h.api.openCreate(); h.api.draft.title = 'Synthetic new task'; h.state.handler = rejected;
  await h.api.createTask(); assert.equal(h.api.dialog.value, true); assert.equal(h.api.draft.title, 'Synthetic new task'); assert.ok(h.api.error.value); assert.equal(h.api.saving.value, false);
});
test('helpdesk queue links preserve protected query and actually filter', async () => {
  const h = harness(files[1], { section: 'tickets', queue: 'Вторая линия', safe: 'preserved' });
  h.api.tickets.value = [ticket(), { ...ticket(), id: 'qa-second', queue: 'Вторая линия' }];
  assert.equal(h.api.filtered.value.length, 1); assert.equal(h.api.filtered.value[0].id, 'qa-second');
  await h.api.openQueue('Первая линия'); assert.equal(h.navigations[0].target.query.queue, 'Первая линия'); assert.equal(h.navigations[0].target.query.safe, 'preserved');
  await h.api.resetFilters(); assert.equal(h.navigations[1].target.query.queue, undefined); assert.equal(h.navigations[1].target.query.safe, 'preserved'); assert.equal(h.calls.length, 0);
});
test('helpdesk default queue includes nullable legacy queue', () => {
  const h = harness(files[1], { queue: 'Первая линия' }); h.api.tickets.value = [{ ...ticket(), queue: null }]; assert.equal(h.api.filtered.value.length, 1);
});
test('helpdesk assignee clear sends null, not invalid empty UUID', async () => {
  const h = harness(files[1]), t = ticket(); h.state.handler = (endpoint, options) => ({ ...t, ...options.body });
  await h.api.updateTicket(t, 'assignedToId', ''); assert.equal(h.calls[0].body.assignedToId, null); assert.equal(t.assignedToId, null);
});
test('helpdesk failed edit resets DOM control and retains actual status', async () => {
  const h = harness(files[1]), t = ticket(), input = { value: 'RESOLVED' }; h.state.handler = rejected;
  await h.api.changeTicket({ target: input }, t, 'status'); assert.equal(t.status, 'NEW'); assert.equal(input.value, 'NEW'); assert.ok(h.api.error.value);
});
test('helpdesk pending comment is single-flight and cannot be dismissed', async () => {
  const h = harness(files[1]), pending = defer(); h.api.openTicket(ticket()); h.api.comment.value = 'Synthetic reply'; h.state.handler = () => pending.promise;
  const first = h.api.addComment(); await h.api.addComment(); assert.equal(h.calls.length, 1); assert.equal(h.api.closeTicket(), false);
  pending.resolve({ id: 'qa-comment', body: 'Synthetic reply', isInternal: false }); await first;
  assert.equal(h.api.comment.value, ''); assert.equal(h.api.selected.value.comments.length, 1); assert.equal(h.api.actionBusy.value, false);
});
test('helpdesk failed comment retains reply and internal flag for retry', async () => {
  const h = harness(files[1]); h.api.openTicket(ticket()); h.api.comment.value = 'Synthetic reply'; h.api.internalComment.value = true; h.state.handler = rejected;
  await h.api.addComment(); assert.equal(h.api.comment.value, 'Synthetic reply'); assert.equal(h.api.internalComment.value, true); assert.ok(h.api.error.value);
});
test('helpdesk update is single-flight and only commits successful response', async () => {
  const h = harness(files[1]), t = ticket(), pending = defer(); h.state.handler = () => pending.promise;
  const first = h.api.updateTicket(t, 'status', 'OPEN'); await h.api.updateTicket(t, 'priority', 'HIGH'); assert.equal(h.calls.length, 1); assert.equal(t.status, 'NEW');
  pending.resolve({ ...t, status: 'OPEN' }); await first; assert.equal(t.status, 'OPEN'); assert.equal(t.priority, 'MEDIUM');
});
test('helpdesk create failure retains draft and duplicate create is blocked', async () => {
  const h = harness(files[1]); h.api.createOpen.value = true; h.api.form.subject = 'Synthetic request'; h.state.handler = rejected;
  await h.api.createTicket(); assert.equal(h.api.createOpen.value, true); assert.equal(h.api.form.subject, 'Synthetic request'); assert.ok(h.api.error.value);
  const pending = defer(); h.state.handler = endpoint => endpoint === '/helpdesk/tickets' ? pending.promise : [];
  const first = h.api.createTicket(); await h.api.createTicket(); assert.equal(h.calls.filter(call => call.method === 'POST').length, 2);
  pending.resolve(ticket()); await first; assert.equal(h.api.createOpen.value, false);
});
test('marketplace legacy settings redirects preserving all other query keys', () => {
  const h = harness(files[2], { section: 'settings', safe: 'preserved' }); assert.equal(h.api.section.value, 'integrations');
  assert.equal(h.navigations[0].target.query.section, 'integrations'); assert.equal(h.navigations[0].target.query.safe, 'preserved'); assert.equal(h.navigations[0].options.replace, true);
});
test('marketplace draft is persistent and reload never discards unsaved name', async () => {
  const h = harness(files[2]); h.state.handler = () => []; await h.api.load();
  const draft = h.api.integration('OZON'); draft.shopName = 'Unsaved QA cabinet'; assert.equal(h.api.integration('OZON'), draft);
  await h.api.load(); assert.equal(h.api.integration('OZON').shopName, 'Unsaved QA cabinet');
});
test('marketplace saves only cabinet name; credentials and activation untouched', async () => {
  const h = harness(files[2]); const draft = h.api.integration('OZON'); draft.shopName = ' QA cabinet ';
  h.state.handler = () => ({ id: 'qa-integration', channel: 'OZON', shopName: 'QA cabinet', isActive: true });
  await h.api.saveIntegration(draft); assert.deepEqual(h.calls[0].body, { channel: 'OZON', shopName: 'QA cabinet' }); assert.equal(h.api.integration('OZON').shopName, 'QA cabinet');
  assert.match(h.api.configurationLabel('OZON'), /не подтверждена/);
});
test('marketplace integration failure preserves retryable draft and busy resets', async () => {
  const h = harness(files[2]), draft = h.api.integration('OZON'); draft.shopName = 'QA cabinet'; h.state.handler = rejected;
  await h.api.saveIntegration(draft); assert.equal(draft.shopName, 'QA cabinet'); assert.ok(h.api.error.value); assert.equal(h.api.saving.value, false);
});
test('marketplace integration save is single-flight', async () => {
  const h = harness(files[2]), pending = defer(), draft = h.api.integration('OZON'); draft.shopName = 'QA cabinet'; h.state.handler = () => pending.promise;
  const first = h.api.saveIntegration(draft); await h.api.saveIntegration(draft); assert.equal(h.calls.length, 1);
  pending.resolve({ channel: 'OZON', shopName: 'QA cabinet' }); await first; assert.equal(h.api.saving.value, false);
});
test('marketplace delivered order never offers or submits cancellation', async () => {
  const h = harness(files[2]), o = order('DELIVERED'); assert.equal(h.api.allowedStatuses(o).some(item => item.id === 'CANCELLED'), false);
  h.api.orderMenu({}, o); assert.equal(h.menus[0][2].some(item => item.label === 'Статус: Отменены'), false);
  await h.api.updateStatus(o, 'CANCELLED'); assert.equal(h.calls.length, 0); assert.equal(o.status, 'DELIVERED');
});
test('marketplace terminal order has no forward status actions', () => {
  const h = harness(files[2]); assert.equal(h.api.allowedStatuses(order('CANCELLED')).length, 1); assert.equal(h.api.allowedStatuses(order('RETURNED')).length, 1);
});
test('marketplace failed status update restores control and permits retry', async () => {
  const h = harness(files[2]), o = order(), input = { value: 'CONFIRMED' }; h.state.handler = rejected;
  await h.api.changeStatus({ target: input }, o); assert.equal(o.status, 'NEW'); assert.equal(input.value, 'NEW'); assert.ok(h.api.error.value);
  h.state.handler = () => ({}); await h.api.updateStatus(o, 'CONFIRMED'); assert.equal(o.status, 'CONFIRMED');
});
test('marketplace cancellation requires confirmation and status update is single-flight', async () => {
  const h = harness(files[2]), o = order(), pending = defer(); h.state.confirm = false;
  await h.api.updateStatus(o, 'CANCELLED'); assert.equal(h.calls.length, 0);
  h.state.handler = () => pending.promise; const first = h.api.updateStatus(o, 'CONFIRMED'); await h.api.updateStatus(o, 'CONFIRMED'); assert.equal(h.calls.length, 1); assert.equal(o.status, 'NEW');
  pending.resolve({}); await first; assert.equal(o.status, 'CONFIRMED');
});
test('marketplace test adapter never claims verified provider connection', async () => {
  const h = harness(files[2]); h.api.integrations.value = [{ id: 'qa-integration', channel: 'OZON', isActive: true }]; h.state.handler = () => ({ success: true, message: 'Synthetic development adapter' });
  await h.api.testIntegration('OZON'); assert.match(h.api.notice.value, /не подтверждается/); assert.match(h.api.configurationLabel('OZON'), /не подтверждена/);
});
test('pipeline stage order uses one atomic endpoint for keyboard arrows', async () => {
  const h = pipelineHarness(); h.state.handler = () => ({}); await h.api.moveStage(0, 1);
  assert.deepEqual(clone(h.api.selected.value.stages.map(item => item.id)), ['b', 'a', 'c']); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].endpoint, '/crm/pipelines/qa-pipeline/stages/reorder'); assert.deepEqual(h.calls[0].body.stageIds, ['b', 'a', 'c']);
});
test('pipeline drag drop preserves unrelated stage field edits', async () => {
  const h = pipelineHarness(); h.api.selected.value.stages[0].name = 'Unsaved stage name'; h.api.draggedStage.value = 'a'; h.state.handler = () => ({});
  await h.api.dropStage('c'); assert.deepEqual(clone(h.api.selected.value.stages.map(item => item.id)), ['b', 'c', 'a']); assert.equal(h.api.selected.value.stages[2].name, 'Unsaved stage name');
});
test('pipeline failed atomic reorder rolls back all positions with visible error', async () => {
  const h = pipelineHarness(); h.state.handler = rejected; await h.api.moveStage(0, 1);
  assert.deepEqual(clone(h.api.selected.value.stages.map(item => item.id)), ['a', 'b', 'c']); assert.ok(h.api.error.value); assert.equal(h.api.saving.value, false); assert.equal(h.events.length, 0);
  h.state.handler = () => ({}); await h.api.moveStage(0, 1); assert.deepEqual(clone(h.api.selected.value.stages.map(item => item.id)), ['b', 'a', 'c']); assert.equal(h.events.length, 1);
});
test('pipeline reorder is single-flight; boundaries and foreign stage IDs do nothing', async () => {
  const h = pipelineHarness(), pending = defer(); h.state.handler = () => pending.promise;
  await h.api.moveStage(0, -1); await h.api.reorderStages(['a', 'b', 'foreign']); assert.equal(h.calls.length, 0);
  const first = h.api.moveStage(0, 1); await h.api.moveStage(1, 1); assert.equal(h.calls.length, 1);
  pending.resolve({}); await first; assert.equal(h.api.saving.value, false);
});

function integrationFixture() { return { key:'QA_OZON', provider:'OZON', category:'MARKETPLACE', audience:'B2C', isEnabled:false, environment:'TEST', fields:[{key:'shopName',type:'text',value:'QA cabinet'},{key:'apiKey',type:'secret',value:null}] }; }
test('channel pages fetch only their own source', async () => {
  for (const [section,endpoint] of [['orders','/marketplaces/orders'],['integrations','/marketplaces/integrations']]) {
    const h=harness(files[2],{}, {pageSection:section}); h.state.handler=()=>[]; await h.api.load();
    assert.deepEqual(h.calls.map(x=>x.endpoint),[endpoint]); assert.equal(h.api.loaded.value,true);
  }
});
test('system staff screen cannot depend on dashboard logs or audit', async () => {
  const h=harness(files[6],{}, {pageSection:'staff'}); h.state.handler=endpoint=>endpoint.endsWith('/access')?{roles:[],permissions:[]}:[];
  await h.api.load(); assert.deepEqual(h.calls.map(x=>x.endpoint),['/system-settings/staff','/system-settings/access']); assert.equal(h.api.pageLoaded.value,true);
});
test('system load rejection is visible and finishes loading', async () => {
  const h=harness(files[6],{}, {pageSection:'staff'}); h.state.handler=rejected; await h.api.load();
  assert.ok(h.api.loadError.value); assert.equal(h.api.busy.value,false); assert.equal(h.api.pageLoaded.value,false);
});
test('integration close click event cannot bypass dirty confirmation', () => {
  const h=harness(files[4]); h.api.edit(integrationFixture()); h.api.draft.config.shopName='Unsaved'; h.state.confirm=false;
  assert.equal(h.api.close({type:'click'}),false); assert.ok(h.api.selected.value); assert.equal(h.lifecycle.leave(),false);
});
test('integration failed save retains config and secret for retry', async () => {
  const h=harness(files[4]); h.api.edit(integrationFixture()); h.api.draft.config.shopName='Unsaved'; h.api.draft.secrets.apiKey='synthetic-not-a-secret'; h.state.handler=rejected;
  await h.api.save(); assert.equal(h.api.draft.config.shopName,'Unsaved'); assert.equal(h.api.draft.secrets.apiKey,'synthetic-not-a-secret'); assert.ok(h.api.selected.value); assert.ok(h.api.error.value); assert.equal(h.api.saving.value,false);
});
test('integration single-flight blocks close and duplicate save', async () => {
  const h=harness(files[4]), pending=defer(); h.api.edit(integrationFixture()); h.state.handler=()=>pending.promise;
  const first=h.api.save(); await h.api.save(); assert.equal(h.calls.length,1); assert.equal(h.api.close({type:'click'}),false); assert.equal(h.lifecycle.leave(),false);
  pending.resolve(integrationFixture()); await first; assert.equal(h.api.selected.value,null); assert.deepEqual(clone(h.api.draft.secrets),{});
});
test('bot command close respects dirty state and event arguments', () => {
  const h=harness(files[5]); h.api.edit(); h.api.draft.title='Unsaved'; h.state.confirm=false;
  assert.equal(h.api.close({type:'click'}),false); assert.ok(h.api.selected.value); assert.equal(h.lifecycle.leave(),false);
});
test('bot command failed save retains local draft', async () => {
  const h=harness(files[5]); h.api.edit(); h.api.draft.title='Unsaved'; h.state.handler=rejected; await h.api.save();
  assert.equal(h.api.draft.title,'Unsaved'); assert.ok(h.api.selected.value); assert.ok(h.api.error.value); assert.equal(h.api.saving.value,false);
});
test('bot command save is single-flight and cannot be dismissed', async () => {
  const h=harness(files[5]), pending=defer(); h.api.edit(); h.state.handler=endpoint=>endpoint==='/system-settings/bot-commands'?pending.promise:{items:[],identities:0,unlinked:0,statuses:{}};
  const first=h.api.save(); await h.api.save(); assert.equal(h.calls.length,1); assert.equal(h.api.close({type:'click'}),false);
  pending.resolve([]); await first; assert.equal(h.api.selected.value,null); assert.equal(h.api.saving.value,false);
});

test('new product category failure is visible rather than unhandled', async () => {
  const h=harness(files[7]); h.state.handler=rejected; await h.api.openForm();
  assert.equal(h.api.open.value,true); assert.ok(h.api.error.value);
});
test('new product preserves failed draft and blocks duplicate create/close', async () => {
  const h=harness(files[7]), pending=defer(); h.api.open.value=true; h.api.form.value.nameRu='Unsaved product'; h.state.handler=()=>pending.promise;
  const first=h.api.create(); await h.api.create(); assert.equal(h.calls.length,1); assert.equal(h.api.closeForm(),false);
  pending.resolve({}); await first; assert.equal(h.api.saving.value,false);
  h.api.open.value=true; h.state.handler=rejected; await h.api.create();
  assert.equal(h.api.form.value.nameRu,'Unsaved product'); assert.ok(h.api.error.value); assert.equal(h.api.open.value,true);
});
test('new product global route guard retains dirty draft if declined', () => {
  const h=harness(files[7]); h.lifecycle.mounted(); h.api.open.value=true; h.api.form.value.nameRu='Unsaved product'; h.state.confirm=false;
  assert.equal(h.lifecycle.guard(),false); assert.equal(h.api.open.value,true); assert.equal(h.api.form.value.nameRu,'Unsaved product');
  h.state.confirm=true; assert.equal(h.lifecycle.guard(),true); assert.equal(h.api.open.value,false); assert.equal(h.api.form.value.nameRu,'');
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    try { await fn(); passed++; console.log('PASS ' + name); }
    catch (error) { console.error('FAIL ' + name); throw error; }
  }
  console.log(`${files.length} actual SFCs parsed/template-compiled; ${passed}/${tests.length} mock-only operational tests PASS. No browser/network/DB/build.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
