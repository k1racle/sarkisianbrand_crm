/* Pure Node/SFC/VM checks only. Every $fetch is a local fixture; no HTTP, browser, server or build. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const frontend = path.resolve(__dirname, '..');
const ts = require(path.join(frontend, '../backend/node_modules/typescript'));
const { parse, compileScript, compileTemplate } = require(path.join(frontend, 'node_modules/@vue/compiler-sfc'));
const postcss = require(path.join(frontend, 'node_modules/postcss'));
const checks = [];
const compile = content => ts.transpileModule(content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const shared = {};
new Function('exports', compile(fs.readFileSync(path.join(frontend, 'shared/site-content.ts'), 'utf8')))(shared);
const descriptors = {};
for (const name of ['SiteContentEditor', 'SiteCatalogMenuEditor', 'SitePagesEditor']) {
  const filename = path.join(frontend, 'components/storefront', name + '.vue');
  const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  assert.deepEqual(errors, []);
  const script = compileScript(descriptor, { id: name });
  const template = compileTemplate({ source: descriptor.template.content, filename, id: name, compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  descriptors[name] = descriptor;
  checks.push(name + ': SFC PASS');
}
postcss.parse(fs.readFileSync(path.join(frontend, 'assets/css/site-content-admin.css'), 'utf8'));
checks.push('Scoped CSS parse PASS');
const copy = value => JSON.parse(JSON.stringify(value));
const settle = () => new Promise(resolve => setImmediate(resolve));
function sandbox(name, exported) {
  const calls = [], mounts = [], unmounts = [], watches = [], leaves = [];
  let approve = true;
  const props = { apiBase: '/MOCK-ONLY', token: 'mock-token' };
  const source = descriptors[name].scriptSetup.content + '\nglobalThis.inspect = {' + exported.join(',') + '};';
  const context = {
    exports: {}, URL, TextEncoder, AbortController, setTimeout, clearTimeout, crypto,
    ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }),
    defineProps: () => props, watch: (getter, callback) => watches.push(callback),
    onMounted: callback => mounts.push(callback), onBeforeUnmount: callback => unmounts.push(callback),
    onBeforeRouteLeave: callback => leaves.push(callback), onBeforeRouteUpdate: callback => leaves.push(callback),
    useRuntimeConfig: () => ({ public: { apiBase: '/MOCK-ONLY', siteUrl: '/' } }),
    useWorkspaceSession: () => ({ token: { value: 'mock-token' } }),
    confirm: () => approve, prompt: () => '',
    window: { confirm: () => approve, addEventListener() {}, removeEventListener() {} },
    require: specifier => {
      if (specifier === '@lucide/vue') return {};
      if (specifier === '../../shared/site-content') return shared;
      throw new Error('Unexpected module: ' + specifier);
    },
    storefrontCategoryGroups: () => [], storefrontCatalogLink: () => '/catalog',
    $fetch: async (url, options) => {
      calls.push({ url, method: options.method || 'GET', body: copy(options.body || null), signal: options.signal });
      return context.handler(url, options);
    },
  };
  context.handler = () => { throw new Error('Unconfigured mock'); };
  vm.createContext(context); vm.runInContext(compile(source), context, { filename: name + '.setup.mock.js' });
  return { context, t: context.inspect, props, calls, mounts, unmounts, watches, leaves, approve: value => { approve = value; } };
}
function dragEvent() { return { prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, dataTransfer: { effectAllowed: '', setData() {} } }; }
async function contentChecks() {
  const s = sandbox('SiteContentEditor', ['draft', 'baseline', 'revision', 'loaded', 'loading', 'saving', 'dirty', 'conflict', 'forbidden', 'error', 'products', 'productsLoaded', 'productTotal', 'pages', 'history', 'historyTotal', 'load', 'save', 'cancel', 'restore', 'loadReferences', 'loadMoreProducts', 'moveProduct', 'loadHistory', 'selectTab', 'reorder', 'beginDrag', 'drop', 'toggleHidden', 'safeUrl', 'validate', 'pageChoice', 'setPage', 'setAction', 'beforeUnload']);
  let stored = { revision: 0, content: {} }, mode = 'ok', delayed;
  s.context.handler = (url, options) => {
    if (url === '/admin/storefront/pages') return [{ slug: 'about', title: 'About fixture', isActive: true }, { slug: 'hidden', title: 'Hidden fixture', isActive: false }];
    if (url === '/admin/products/list') return { items: options.query.page === 1 ? [{ id: 'p1', nameRu: 'Active fixture', isActive: true }, { id: 'p2', nameRu: 'Inactive fixture', isActive: false }] : [{ id: 'p3', nameRu: 'Next-page fixture', isActive: true }], total: 102 };
    if (url.endsWith('/revisions')) return { items: [{ revision: 0, createdAt: '2026-09-16T00:00:00Z', secret: 'not-retained' }], total: 101 };
    if (url.endsWith('/restore')) { assert.equal(options.body.revision, stored.revision); stored = { revision: stored.revision + 1, content: {} }; return copy(stored); }
    if (url !== '/admin/storefront/site-content') throw new Error('Unexpected fixture endpoint');
    if (mode === 'defer' && !options.method) return new Promise(resolve => { delayed = resolve; });
    if (mode === '403') throw { statusCode: 403 };
    if (options.method === 'PATCH') {
      if (mode === '409') throw { statusCode: 409 };
      if (mode === '503') throw { statusCode: 503 };
      assert.equal(options.body.revision, stored.revision);
      stored = { revision: stored.revision + 1, content: copy(options.body.content) }; return copy(stored);
    }
    return copy(stored);
  };
  s.mounts[0](); await settle(); await settle();
  assert(s.t.loaded.value); assert.equal(s.t.revision.value, 0); assert(!s.t.dirty.value);
  assert.equal(s.t.draft.value.home.order.length, 7); assert.equal(s.t.pages.value.length, 2);
  assert(s.calls.every(call => call.method === 'GET')); checks.push('Initial GET/default merge/references are readonly PASS');
  await s.t.loadMoreProducts(); assert.equal(s.t.products.value.length, 3); assert.equal(s.calls.at(-1).url, '/admin/products/list'); assert.equal(s.calls.at(-1).method, 'GET');
  s.t.draft.value.home.bestsellers.productIds = ['p1', 'p3']; s.t.moveProduct(0, 1); assert.equal(s.t.draft.value.home.bestsellers.productIds[0], 'p3'); s.t.cancel(); assert(!s.t.dirty.value);
  checks.push('Paginated product chooser + manual selection ordering PASS');
  for (const value of ['//evil.example/a', 'javascript:alert(1)', '/storefront/%252e%252e/private', 'https://127.0.0.1/a', 'https://name:pass@example.com/a']) assert(!s.t.safeUrl(value, true));
  assert(s.t.safeUrl('/api/v1/media/files/fixture.png', true)); assert(s.t.safeUrl('https://example.com/photo.png', true));
  const before = s.t.draft.value.home.order.slice();
  s.t.reorder('home', 0, 1); assert.equal(s.t.draft.value.home.order[1], before[0]); assert(s.t.dirty.value);
  s.t.beginDrag(dragEvent(), 'home', 1); s.t.drop(dragEvent(), 'home', 6); assert.equal(s.t.draft.value.home.order[6], before[0]);
  s.t.toggleHidden('club', false); assert(s.t.draft.value.home.hidden.includes('club')); s.t.toggleHidden('club', true); assert(!s.t.draft.value.home.hidden.includes('club'));
  const firstColumn = s.t.draft.value.footer.columns[0], oldItems = firstColumn.items.map(item => item.id);
  s.t.beginDrag(dragEvent(), 'items:' + firstColumn.id, 0); s.t.drop(dragEvent(), 'items:' + firstColumn.id, 2); assert.equal(firstColumn.items[2].id, oldItems[0]);
  const unchanged = JSON.stringify(s.t.draft.value.footer.columns);
  s.t.beginDrag(dragEvent(), 'items:' + firstColumn.id, 0); s.t.drop(dragEvent(), 'columns', 1); assert.equal(JSON.stringify(s.t.draft.value.footer.columns), unchanged);
  s.t.setPage(firstColumn.items[0], '/about'); assert.equal(firstColumn.items[0].url, '/about'); s.t.setPage(firstColumn.items[0], '/invented'); assert.equal(firstColumn.items[0].url, '/about');
  s.t.setAction(firstColumn.items[0], 'cart'); assert.equal(firstColumn.items[0].action, 'cart'); assert.equal(firstColumn.items[0].newTab, false);
  s.approve(false); const count = s.calls.length; await s.t.load(); assert.equal(s.calls.length, count); s.t.cancel(); assert(s.t.dirty.value);
  assert.equal(s.leaves[0](), false); s.approve(true); s.t.cancel(); assert(!s.t.dirty.value);
  checks.push('URL guards, home/footer DnD, cross-group rejection, keyboard moves, hidden flags, real page chooser, dirty guards PASS');
  const d = s.t.draft.value; d.contacts.email = 'invalid'; await s.t.save(); assert.equal(s.calls.length, count); // No dirty after cancel, so directly validate.
  assert.throws(() => s.t.validate()); d.contacts.email = 'info@example.com';
  d.home.order[0] = d.home.order[1]; assert.throws(() => s.t.validate()); d.home.order = [...shared.homeSectionKeys];
  d.home.club.previewBalance = 1.5; assert.throws(() => s.t.validate()); d.home.club.previewBalance = 1250;
  d.home.story.title = 'x'.repeat(201); assert.throws(() => s.t.validate()); d.home.story.title = shared.defaultSiteContent.home.story.title;
  d.home.bestsellers.productIds = ['unknown']; assert.throws(() => s.t.validate()); d.home.bestsellers.productIds = ['p2']; s.t.validate();
  d.home.club.benefits[1].id = ' ' + d.home.club.benefits[0].id + ' '; assert.throws(() => s.t.validate());
  s.t.draft.value = shared.mergeSiteContent({}); d.home.bestsellers.productIds = [];
  const normal = copy(s.t.draft.value);
  s.t.draft.value.footer.columns = Array.from({ length: 4 }, (_, column) => ({ id: 'column-' + column, title: 'Column', items: Array.from({ length: 12 }, (_, item) => ({ id: 'item-' + item, label: 'Link', url: '/catalog?x=' + 'a'.repeat(480), action: 'none', newTab: false })) }));
  s.t.draft.value.home.benefits = Array.from({ length: 8 }, (_, index) => ({ id: 'benefit-' + index, icon: 'package', eyebrow: '', title: 'Benefit', body: 'x'.repeat(1000) }));
  assert.throws(() => s.t.validate(), /32/); s.t.draft.value = normal;
  s.t.draft.value.brand.name = 'CAS fixture'; mode = '409'; await s.t.save(); assert(s.t.conflict.value); assert(s.t.dirty.value);
  const conflictedCalls = s.calls.length; await s.t.save(); assert.equal(s.calls.length, conflictedCalls);
  mode = 'ok'; await s.t.load(); assert(!s.t.conflict.value);
  s.t.draft.value.home.story.title = '503 fixture'; mode = '503'; await s.t.save(); assert(s.t.dirty.value); assert(!s.t.saving.value); assert(!s.t.conflict.value);
  mode = 'ok'; await s.t.save(); assert.equal(s.t.revision.value, 1); assert(!s.t.dirty.value);
  checks.push('Type/length/list validation, inactive-known IDs, CAS 409 preserves draft, 503 retry, explicit PATCH PASS');
  await s.t.loadHistory(); assert.equal(s.t.historyTotal.value, 101); assert(!('secret' in s.t.history.value[0]));
  s.approve(false); const restoreCount = s.calls.length; await s.t.restore(0); assert.equal(s.calls.length, restoreCount);
  s.approve(true); await s.t.restore(0); await settle(); assert.equal(s.t.revision.value, 2);
  const restoreCall = s.calls.find(call => call.url.endsWith('/restore')); assert.deepEqual(restoreCall.body, { revision: 1, targetRevision: 0 });
  checks.push('Metadata-only history, confirmation, restore expected revision/new version PASS');
  mode = 'defer'; const oldLoad = s.t.load(); const oldSignal = s.calls.at(-1).signal; mode = 'ok'; stored = { revision: 42, content: {} }; s.props.token = 'mock-new-identity'; s.watches[0](); await settle(); await settle(); assert(oldSignal.aborted);
  delayed({ revision: 0, content: {} }); await oldLoad; assert.equal(s.t.revision.value, 42);
  mode = '403'; await s.t.load(); assert(s.t.forbidden.value); assert(s.t.error.value.includes('прав'));
  mode = 'ok'; await s.t.load(); mode = 'defer'; const pending = s.t.load(), pendingSignal = s.calls.at(-1).signal; s.unmounts[0](); assert(pendingSignal.aborted); delayed({ revision: 1, content: {} }); await pending; assert.equal(s.t.revision.value, 42);
  checks.push('403 honest error, identity abort/stale response rejection, unmount abort PASS');
}
function catalogChecks() {
  const s = sandbox('SiteCatalogMenuEditor', ['entries', 'quickLinks', 'saving', 'loading', 'forbidden', 'move', 'startOrderDrag', 'dropOrder']);
  s.t.entries.value = [{ categoryId: 'a', label: 'A', isVisible: true }, { categoryId: 'b', label: 'B', isVisible: true }, { categoryId: 'c', label: 'C', isVisible: true }];
  s.t.quickLinks.value = [{ key: 'new', label: 'New', isVisible: true }, { key: 'popular', label: 'Popular', isVisible: true }];
  s.t.startOrderDrag(dragEvent(), 'categories', 0); s.t.dropOrder(dragEvent(), 'categories', 2); assert.equal(s.t.entries.value[2].categoryId, 'a');
  s.t.startOrderDrag(dragEvent(), 'categories', 0); s.t.dropOrder(dragEvent(), 'quick', 1); assert.equal(s.t.quickLinks.value[0].key, 'new');
  s.t.move(s.t.quickLinks.value, 0, 1); assert.equal(s.t.quickLinks.value[1].key, 'new');
  const order = JSON.stringify(s.t.entries.value); s.t.saving.value = true; s.t.startOrderDrag(dragEvent(), 'categories', 0); s.t.dropOrder(dragEvent(), 'categories', 1); assert.equal(JSON.stringify(s.t.entries.value), order);
  assert.equal(s.calls.length, 0); checks.push('Catalog DnD/groups/saving guards + keyboard moves, no implicit mutation PASS');
}
function pageChecks() {
  const s = sandbox('SitePagesEditor', ['editor', 'baseline', 'busy', 'select', 'moveBlock', 'startBlockDrag', 'dropBlock', 'beforeUnload']);
  s.t.select({ slug: 'about', title: 'Fixture', blocks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], revision: 7 });
  s.t.startBlockDrag(dragEvent(), 0); s.t.dropBlock(dragEvent(), 2); assert.equal(s.t.editor.value.blocks[2].id, 'a');
  s.t.moveBlock(2, -1); assert.equal(s.t.editor.value.blocks[1].id, 'a'); assert.equal(s.t.editor.value.revision, 7);
  s.approve(false); s.t.select({ slug: 'other', blocks: [] }); assert.equal(s.t.editor.value.slug, 'about'); assert.equal(s.leaves[0](), false);
  s.t.busy.value = true; const order = JSON.stringify(s.t.editor.value.blocks); s.t.startBlockDrag(dragEvent(), 0); s.t.dropBlock(dragEvent(), 2); assert.equal(JSON.stringify(s.t.editor.value.blocks), order); assert.equal(s.leaves[0](), false);
  let prevented = false; s.t.beforeUnload({ preventDefault() { prevented = true; } }); assert(prevented);
  assert(descriptors.SitePagesEditor.scriptSetup.content.includes('payload.revision = item.revision')); assert.equal(s.calls.length, 0);
  checks.push('Page block DnD/keyboard moves, dirty/in-flight guards, CAS preserved PASS');
}
(async () => {
  await contentChecks(); catalogChecks(); pageChecks();
  console.log(JSON.stringify({ checks, result: 'PASS', actualHttpRequests: 0, actualMutations: 0, browser: 'NOT_RUN', build: 'NOT_RUN' }, null, 2));
})().catch(caught => { console.error(caught); process.exitCode = 1; });
