/* Read-only, isolated checks. Never starts a browser/server or calls an API. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const vue = require('vue');
const imageUtilities = stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname, '../shared/product-images.ts'), 'utf8'), { mode: 'strip' }).replace(/^export /gm, '');
const imageHelpers = vm.runInNewContext(imageUtilities + '\n({ normalizeMediaImageUrl, resolveProductImageUrl });', { URL });
const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc');

const filename = path.resolve(__dirname, '../components/AdminProductEditor.vue');
const source = fs.readFileSync(filename, 'utf8');
const parsed = parse(source, { filename });
assert.deepEqual(parsed.errors, []);
const compiled = compileScript(parsed.descriptor, { id: 'admin-product-editor-check' });
assert.deepEqual(compileTemplate({ source: parsed.descriptor.template.content, filename, id: 'admin-product-editor-check', compilerOptions: { bindingMetadata: compiled.bindings } }).errors, []);
for (const style of parsed.descriptor.styles) assert.deepEqual(compileStyle({ source: style.content, filename, id: 'data-v-check', scoped: true }).errors, []);
assert.match(source, /role="dialog"/);
assert.match(source, /aria-modal="true"/);
assert.match(source, /role="tablist"/);
assert.match(source, /aria-describedby="product-editor-gallery-help"/);
assert.match(source, /<AdminMediaPicker/);
assert.match(require('./component-css.cjs')('components/AdminProductEditor.vue'), /prefers-reduced-motion/);
assert.doesNotMatch(source, /v-model="productEditor\./);
assert.doesNotMatch(source, /FormData|\/media\/upload|setTimeout/);

function harness(initial = null) {
  const states = new Map();
  const token = vue.ref('mock-only-token');
  const calls = [], mounted = [], unmounted = [], navigations = [];
  let confirmResult = true, confirmationCount = 0, guard;
  let fetchMock = async (url, options) => url === '/admin/categories' ? [{ id: 'category-a', nameRu: 'Гели' }] : { id: decodeURIComponent(url.split('/').pop()), nameRu: options.body.nameRu, images: options.body.images };
  const context = {
    ...imageHelpers,
    ref: vue.ref, computed: vue.computed, watch: vue.watch, nextTick: vue.nextTick,
    useState(key, factory) { if (!states.has(key)) states.set(key, vue.ref(key === 'admin-product-editor' ? initial : factory())); return states.get(key); },
    useRuntimeConfig: () => ({ public: { apiBase: 'https://mock.invalid/api/v1', siteUrl: 'https://mock.invalid' } }),
    useWorkspaceSession: () => ({ token }),
    useRouter: () => ({ beforeEach(callback) { guard = callback; return () => { guard = undefined; }; } }),
    onMounted: callback => mounted.push(callback), onBeforeUnmount: callback => unmounted.push(callback),
    navigateTo: async url => navigations.push(url),
    $fetch: async (url, options) => { calls.push({ url, options }); return fetchMock(url, options); },
    window: { confirm: () => { ++confirmationCount; return confirmResult; }, addEventListener() {}, removeEventListener() {} },
    document: { activeElement: { isConnected: true, focus() {} } }, URL,
  };
  const script = parsed.descriptor.scriptSetup.content.replace(/^import .*;\s*$/gm, '');
  const javascript = stripTypeScriptTypes(script, { mode: 'strip' });
  vm.runInNewContext(javascript + '\n globalThis.editorCheck = { draft, dirty, tab, saving, message, galleryStatus, productEditor, savedProduct, categories, categoriesError, categoriesLoading, buildPayload, validationError, normalizeError, previewImage, save, closeEditor, giftSettings, addImage, removeImage, moveImage, dragImage, dropImage, beforeUnload, loadCategories };', context, { filename });
  return {
    ...context.editorCheck, token, calls, navigations,
    setConfirm(value) { confirmResult = value; }, confirmations: () => confirmationCount,
    setFetch(callback) { fetchMock = callback; },
    async mount() { mounted.forEach(callback => callback()); await vue.nextTick(); await new Promise(setImmediate); },
    unmount() { unmounted.forEach(callback => callback()); }, guard: () => guard,
  };
}
const product = () => ({ id: 'p-1', productType: 'PHYSICAL', nameRu: 'Гель', descriptionRu: '', price: 780, stock: 4, isActive: true, categoryIds: ['category-a'], images: [{ url: '/gel.webp', alt: 'Гель' }, { url: '/tool.webp', alt: 'Инструмент' }], metaTitle: null, metaDesc: null, canonical: null });
let groups = 0;
async function check(label, run) { await run(); ++groups; console.log('PASS ' + label); }
async function main() {
  await check('SFC, styles, accessible controls and shared media contract', async () => {});
  await check('isolated draft, snapshots, nullable SEO, close/identity confirmation', async () => {
    const original = product(), h = harness(original), before = JSON.stringify(original);
    assert.equal(h.dirty.value, false); assert.equal(h.draft.value.metaTitle, '');
    h.draft.value.nameRu = 'Новое имя'; h.draft.value.images[0].alt = 'Другой alt'; h.draft.value.categoryIds.push('category-b');
    assert.equal(JSON.stringify(original), before); assert.equal(h.dirty.value, true);
    h.setConfirm(false); assert.equal(h.closeEditor(), false); assert.equal(h.productEditor.value.id, 'p-1');
    h.productEditor.value = { ...product(), id: 'p-2' }; assert.equal(h.productEditor.value.id, 'p-1'); assert.equal(h.draft.value.nameRu, 'Новое имя');
    h.productEditor.value = null; assert.equal(h.productEditor.value.id, 'p-1');
    h.setConfirm(true); h.productEditor.value = { ...product(), id: 'p-2' }; assert.equal(h.draft.value.id, 'p-2'); assert.equal(h.dirty.value, false);
    h.draft.value.nameRu = 'Ещё одно'; const count = h.confirmations(); assert.equal(h.closeEditor(), true); assert.equal(h.confirmations(), count + 1); assert.equal(h.draft.value, null);
    h.productEditor.value = { ...product(), id: 'p-2', nameRu: 'Повторно открыт' }; assert.equal(h.draft.value.nameRu, 'Повторно открыт');
  });
  await check('image handles, drag/drop, keyboard-equivalent order and payload', async () => {
    const h = harness(product()), keys = h.draft.value.images.map(image => image.key);
    h.moveImage(1, 0); assert.equal(h.draft.value.images[0].key, keys[1]);
    assert.equal(h.buildPayload(h.draft.value).images[0].url, '/tool.webp');
    assert.equal('key' in h.buildPayload(h.draft.value).images[0], false);
    const dataTransfer = { effectAllowed: '', files: [], setData() {} };
    h.dragImage({ dataTransfer, preventDefault() {} }, keys[1]); h.dropImage({ dataTransfer, preventDefault() {} }, 1);
    assert.equal(h.draft.value.images[0].key, keys[0]);
    h.moveImage(-1, 0); assert.equal(h.draft.value.images[0].key, keys[0]);
    h.addImage(); assert.equal(h.draft.value.images.length, 3); assert.equal(h.buildPayload(h.draft.value).images.length, 2);
    h.removeImage(2); assert.equal(h.draft.value.images.length, 2);
    h.dropImage({ dataTransfer: { files: [{}] }, preventDefault() {} }, 0); assert.match(h.galleryStatus.value, /Загрузить файл/);
    assert.equal(h.previewImage('javascript:alert(1)'), ''); assert.equal(h.previewImage('//bad.invalid/a'), ''); assert.equal(h.previewImage('https://user:pass@bad.invalid/a'), '');
    assert.equal(h.previewImage('/api/v1/media/files/a.webp'), 'https://mock.invalid/api/v1/media/files/a.webp');
  });
  await check('physical and gift PATCH contracts, normalized errors/validation', async () => {
    const h = harness(product());
    const body = h.buildPayload(h.draft.value); assert.equal(body.price, 780); assert.equal(body.stock, 4);
    h.draft.value.stock = 1.2; assert.match(h.validationError(h.draft.value), /целым/);
    h.draft.value.productType = 'GIFT_CARD'; h.draft.value.price = ''; h.draft.value.stock = '';
    assert.equal(h.validationError(h.draft.value), ''); assert.equal('price' in h.buildPayload(h.draft.value), false); assert.equal('stock' in h.buildPayload(h.draft.value), false);
    h.draft.value.purposesText = 'Укрепление, Укрепление, Ремонт'; assert.equal(h.buildPayload(h.draft.value).purposes.join('|'), 'Укрепление|Ремонт');
    assert.equal(h.normalizeError({ data: { message: ['Ошибка 1', 'Ошибка 2'] } }), 'Ошибка 1. Ошибка 2');
    h.draft.value.canonical = 'https://u:p@bad.invalid/a'; assert.match(h.validationError(h.draft.value), /Canonical/);
    h.draft.value.canonical = ''; h.draft.value.nameRu = ''; assert.match(h.validationError(h.draft.value), /название/);
  });
  await check('busy suppresses repeated saves, switching, close and gallery mutations', async () => {
    const h = harness(product()); let resolve;
    h.setFetch(() => new Promise(done => { resolve = done; })); h.draft.value.nameRu = 'Сохранённое имя';
    const first = h.save(); await h.save(); assert.equal(h.calls.length, 1); assert.equal(h.saving.value, true);
    assert.equal(h.closeEditor(), false); h.productEditor.value = { ...product(), id: 'p-2' }; assert.equal(h.productEditor.value.id, 'p-1');
    h.addImage(); h.removeImage(0); h.moveImage(1, 0); assert.equal(h.draft.value.images.length, 2); assert.equal(h.draft.value.images[0].url, '/gel.webp');
    assert.equal(h.calls[0].options.headers.Authorization, 'Bearer mock-only-token');
    resolve({ id: 'p-1', nameRu: 'Сохранённое имя', variants: [] }); await first;
    assert.equal(h.saving.value, false); assert.equal(h.productEditor.value, null); assert.equal(h.draft.value, null);
    assert.equal(h.savedProduct.value.id, 'p-1'); assert.equal(h.savedProduct.value.product.nameRu, 'Сохранённое имя');
  });
  await check('save failure keeps draft; missing auth/invalid response cannot emit saved', async () => {
    const h = harness(product()); h.draft.value.nameRu = 'Черновик';
    h.setFetch(async () => { throw { data: { message: ['Недоступно', 'Повторите позже'] } }; }); await h.save();
    assert.equal(h.message.value, 'Недоступно. Повторите позже'); assert.equal(h.dirty.value, true); assert.equal(h.savedProduct.value, null); assert.equal(h.saving.value, false);
    h.setFetch(async () => ({ id: 'wrong-product' })); await h.save(); assert.equal(h.savedProduct.value, null); assert.equal(h.productEditor.value.id, 'p-1');
    h.token.value = ''; const count = h.calls.length; await h.save(); assert.equal(h.calls.length, count); assert.match(h.message.value, /Сессия/);
  });
  await check('global router guard/beforeunload, categories errors, gift settings link', async () => {
    const h = harness(product()); await h.mount(); assert.equal(h.categories.value.length, 1); assert.equal(h.guard()(), true);
    h.draft.value.nameRu = 'Черновик'; h.setConfirm(false); assert.equal(h.guard()(), false);
    let prevented = false; h.beforeUnload({ preventDefault() { prevented = true; }, returnValue: undefined }); assert.equal(prevented, true);
    h.setFetch(async () => { throw { data: { message: ['Категории недоступны'] } }; }); await h.loadCategories(); assert.equal(h.categoriesError.value, 'Категории недоступны'); assert.equal(h.draft.value.categoryIds[0], 'category-a');
    h.setConfirm(true); await h.giftSettings(); assert.equal(h.navigations[0], '/admin-workspace?section=gift-cards'); assert.equal(h.draft.value, null);
    h.unmount(); assert.equal(h.guard(), undefined);
  });
  await check('gift save omits price/stock in actual isolated request', async () => {
    const h = harness({ ...product(), productType: 'GIFT_CARD', price: '', stock: '' }); await h.save();
    assert.equal(h.calls.length, 1); assert.equal('price' in h.calls[0].options.body, false); assert.equal('stock' in h.calls[0].options.body, false); assert.equal(h.savedProduct.value.id, 'p-1');
  });
  await check('sale price/dates/badges persist in the actual payload; invalid sales keep the draft',async()=>{
    const h=harness(product());h.draft.value.salePrice='500.25';h.draft.value.saleStartsAt='2026-09-17T12:00';h.draft.value.saleEndsAt='2026-09-18T12:00';h.draft.value.badgeIds=['popular'];await h.save();
    assert.equal(h.calls[0].options.body.salePrice,500.25);assert.equal(h.calls[0].options.body.saleStartsAt,new Date('2026-09-17T12:00').toISOString());assert.deepEqual([...h.calls[0].options.body.badgeIds],['popular']);
    const invalid=harness(product());invalid.draft.value.salePrice=Number(invalid.draft.value.price)+1;await invalid.save();assert.equal(invalid.calls.length,0);assert.match(invalid.message.value,/Акционная цена/);assert.ok(invalid.draft.value);
  });
  console.log(`AdminProductEditor: ${groups} groups PASS. No browser/server/API calls.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
