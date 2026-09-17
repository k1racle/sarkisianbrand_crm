/* ISOLATED SOURCE-COMPONENT media UI/API smoke, not production auth/integration QA.
 * Preparation only until parent authorizes a sequential visual run:
 *   node frontend/scripts/admin-media-mock.cjs
 * No server is started or visited, no DB/client/JWT/real credentials are loaded.
 * Actual AdminMediaPicker + media-library SFCs and source CSS are compiled in memory.
 * All HTTP, including the one simulated multipart upload, is fulfilled locally.
 * This does not validate production SSR/CSS packaging; parent checks that separately.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const { parse, compileScript, compileStyle } = require('@vue/compiler-sfc');
const { chromium } = require('playwright-core');
const frontend = path.resolve(__dirname, '..');
const origin = 'http://admin-media-mock.test';
const output = path.join(frontend, '.screenshots/admin-media-mock');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const originalUrl = '/api/v1/media/files/123e4567-e89b-42d3-a456-426614174000.png';
const existing = { id: '123e4567-e89b-42d3-a456-426614174001', url: '/api/v1/media/files/123e4567-e89b-42d3-a456-426614174001.png', originalName: 'qa-existing-image.png', mime: 'image/png', size: png.length, createdAt: '2026-09-16T10:00:00Z' };
const uploaded = { id: '123e4567-e89b-42d3-a456-426614174002', url: '/api/v1/media/files/123e4567-e89b-42d3-a456-426614174002.png', originalName: 'qa-upload.png', mime: 'image/png', size: png.length, createdAt: '2026-09-16T10:01:00Z' };

async function compileActualUI() {
  for (const file of ['components/AdminMediaPicker.vue', 'components/AdminMediaBrowser.vue', 'pages/media-library.vue']) {
    assert(fs.existsSync(path.join(frontend, file)), `${file} not ready: wait for owning worker, do not substitute a mock component`);
  }
  const styles = [];
  const config = fs.readFileSync(path.join(frontend, 'nuxt.config.ts'), 'utf8');
  for (const match of config.matchAll(/~\/assets\/css\/([^'"\s]+)/g)) {
    styles.push(fs.readFileSync(path.join(frontend, 'assets/css', match[1]), 'utf8'));
  }
  const result = await esbuild.build({
    absWorkingDir: frontend, bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022',
    define: { 'import.meta.client': 'true', 'import.meta.server': 'false', 'process.env.NODE_ENV': '"production"' },
    stdin: { resolveDir: frontend, loader: 'js', contents: `
      import * as Vue from 'vue';
      import Picker from './components/AdminMediaPicker.vue';
      import Browser from './components/AdminMediaBrowser.vue';
      import Library from './pages/media-library.vue';
      Object.assign(window, Vue);
      const states = new Map();
      window.useState = (key, initial) => { if (!states.has(key)) states.set(key, Vue.ref(initial?.())); return states.get(key); };
      window.useRuntimeConfig = () => ({ public: { apiBase: '${origin}/api/v1', siteUrl: '${origin}' } });
      const token = Vue.ref('mock-media-token-not-a-jwt');
      const user = Vue.ref({ id: 'mock-media-admin', role: 'ADMIN', email: 'media-design@example.invalid', isActive: true });
      window.useWorkspaceSession = () => ({ token, user, hydrate() {} });
      window.useRoute = () => ({ path: '/media-library', query: {}, params: {} });
      window.useRouter = () => ({ push: window.navigateTo, replace: window.navigateTo });
      window.navigateTo = async to => { window.__mediaMock.navigations.push(to); };
      window.definePageMeta = () => {}; window.useHead = () => {}; window.useSeoMeta = () => {};
      window.__mediaMock = { url: Vue.ref('${originalUrl}'), aborts: 0, navigations: [], calls: [], submitted: 0 };
      window.__mediaMock.changeIdentity = () => { token.value = ''; user.value = null; };
      window.$fetch = async (endpoint, options = {}) => {
        const baseURL = options.baseURL || '${origin}/api/v1';
        const endpointPath = String(endpoint);
        // ofetch baseURL appends /media rather than replacing /api/v1.
        const url = new URL(endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath, baseURL.endsWith('/') ? baseURL : baseURL + '/');
        for (const [key, value] of Object.entries(options.query || options.params || {})) if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        const method = options.method || 'GET', headers = new Headers(options.headers || {});
        const body = options.body;
        if (options.signal) options.signal.addEventListener('abort', () => window.__mediaMock.aborts++, { once: true });
        window.__mediaMock.calls.push({ path: url.pathname, method });
        const response = await fetch(url, { method, headers, body, signal: options.signal });
        const data = await response.json();
        if (!response.ok) throw Object.assign(new Error(data.message || 'Mock HTTP error'), { statusCode: response.status, response, data });
        return data;
      };
      document.addEventListener('submit', event => { event.preventDefault(); window.__mediaMock.submitted++; }, true);
      const Harness = { setup() { return () => Vue.h('main', { class: 'workspace-frame', style: 'padding-left:0' }, [
        Vue.h('section', { id: 'picker-harness', class: 'panel', style: 'margin:24px;padding:24px;min-width:0' }, [
          Vue.h(Picker, { modelValue: window.__mediaMock.url.value, 'onUpdate:modelValue': value => window.__mediaMock.url.value = value, label: 'Изображение QA' }),
          Vue.h('output', { id: 'picked-url', style: 'display:block;overflow-wrap:anywhere' }, window.__mediaMock.url.value),
        ]),
      ]); } };
      const App = window.__mediaScenario === 'library' ? Library : Harness;
      const app = Vue.createApp({ render() { return Vue.h(Vue.Suspense, null, { default: () => window.__mediaScenario === 'library'
        ? Vue.h('div', { class: 'workspace-frame', style: 'padding-left:0' }, [Vue.h(App)]) : Vue.h(App) }); } });
      app.component('AdminMediaPicker', Picker);
      app.component('AdminMediaBrowser', Browser);
      app.component('NuxtLink', { props: ['to'], render() { return Vue.h('a', { href: this.to, onClick: event => { event.preventDefault(); window.navigateTo(this.to); } }, this.$slots.default?.()); } });
      app.component('WorkspaceLoading', { props: ['label'], render() { return Vue.h('p', { role: 'status' }, this.label || 'Загрузка…'); } });
      app.mount('#app');
    ` },
    plugins: [{ name: 'actual-media-sfc', setup(build) {
      build.onLoad({ filter: /\.vue$/ }, async args => {
        const source = fs.readFileSync(args.path, 'utf8');
        const parsed = parse(source, { filename: args.path });
        assert.deepEqual(parsed.errors, [], args.path);
        const id = `data-v-media-${path.basename(args.path).replace(/\W/g, '')}`;
        const script = compileScript(parsed.descriptor, { id, inlineTemplate: true, genDefaultAs: '__default__' });
        for (const style of parsed.descriptor.styles) {
          const compiled = compileStyle({ source: style.content, filename: args.path, id, scoped: style.scoped });
          assert.deepEqual(compiled.errors, [], args.path + ': CSS');
          styles.push(compiled.code);
        }
        return { contents: script.content + (parsed.descriptor.styles.some(s => s.scoped) ? `\n__default__.__scopeId = '${id}';` : '') + '\nexport default __default__;', loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  return { js: result.outputFiles[0].text, css: styles.join('\n') };
}

async function fixturePage(browser, compiled, width, scenario) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1, serviceWorkers: 'block', isMobile: width === 390, hasTouch: width === 390 });
  const traffic = { list: [], uploads: [], blocked: [], expectedErrors: [], held: [], aborted: 0 };
  const state = { mode: 'normal', uploadMode: 'normal', release: null };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.origin !== origin) { traffic.blocked.push({ method: request.method(), path: url.pathname }); return route.abort(); }
    if (request.method() === 'GET' && url.pathname === '/fixture') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div></body></html>' });
    if (request.method() === 'GET' && url.pathname === '/api/v1/media') {
      assert.equal(request.headers().authorization, 'Bearer mock-media-token-not-a-jwt', 'Only the synthetic identity is accepted');
      const q = url.searchParams.get('q') || '';
      traffic.list.push({ q, page: Number(url.searchParams.get('page') || 1), limit: Number(url.searchParams.get('limit') || 24) });
      if (state.mode === 'hold') {
        traffic.held.push(url.pathname);
        await new Promise(resolve => { state.release = resolve; });
      }
      if (state.mode === 'forbidden') { traffic.expectedErrors.push(403); return reply({ message: 'Недостаточно прав для медиатеки' }, 403); }
      if (state.mode === 'error') { traffic.expectedErrors.push(503); return reply({ message: 'Не удалось загрузить медиатеку. Повторите попытку.' }, 503); }
      const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 24);
      const second = { ...existing, id: 'mock-page-2', originalName: 'qa-second-page.png' };
      return reply({ items: state.mode === 'empty' ? [] : [page === 1 ? existing : second], total: state.mode === 'empty' ? 0 : limit + 1, page, limit });
    }
    if (request.method() === 'POST' && url.pathname === '/api/v1/media/upload') {
      assert.equal(request.headers().authorization, 'Bearer mock-media-token-not-a-jwt');
      const body = request.postDataBuffer();
      assert.match(request.headers()['content-type'], /^multipart\/form-data; boundary=/);
      assert.ok(body && body.includes(Buffer.from('name="file"')) && body.includes(Buffer.from('qa-upload.png')) && body.includes(png), 'Exactly the mock File must be sent as multipart file');
      traffic.uploads.push({ filename: 'qa-upload.png', bytes: png.length });
      if (state.uploadMode === 'forbidden') { traffic.expectedErrors.push(403); return reply({ message: 'Недостаточно прав для загрузки файла' }, 403); }
      return reply(uploaded);
    }
    if (request.method() === 'GET' && [existing.url, uploaded.url, originalUrl].includes(url.pathname)) return route.fulfill({ contentType: 'image/png', body: png });
    if (request.method() === 'GET' && /^\/fonts\/[\w-]+\.woff2$/.test(url.pathname)) {
      const font = path.join(frontend, 'public', url.pathname);
      if (fs.existsSync(font)) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(font) });
    }
    // import-existing/backfill, delete, auth and every unexpected endpoint forbidden.
    traffic.blocked.push({ method: request.method(), path: url.pathname });
    return reply({ message: 'Unexpected endpoint: all actual traffic forbidden' }, 405);
  });
  const page = await context.newPage(), errors = [], consoleErrors = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => { if (request.url().includes('/api/v1/media') && /ABORTED|CANCELLED/i.test(request.failure()?.errorText || '')) traffic.aborted++; });
  await page.goto(origin + '/fixture');
  await page.evaluate(scenario => window.__mediaScenario = scenario, scenario);
  await page.addStyleTag({ content: compiled.css });
  await page.addScriptTag({ content: compiled.js });
  return { context, page, state, traffic, errors, consoleErrors };
}

async function openPicker(f) {
  await f.page.locator('#picker-harness').getByRole('button', { name: 'Выбрать из библиотеки', exact: true }).click();
  await f.page.getByRole('dialog').waitFor();
}
const dialog = f => f.page.getByRole('dialog');
const search = f => f.page.locator('input[type=search]').first();
async function selectExisting(f) {
  await dialog(f).getByRole('button', { name: /qa-existing-image/i }).first().click();
  assert.equal(await f.page.locator('#picked-url').textContent(), originalUrl, 'Picking a card alone does not commit the URL');
  await dialog(f).getByRole('button', { name: 'Использовать изображение', exact: true }).click();
}
async function uploadFile(f, file) {
  const chooser = f.page.waitForEvent('filechooser');
  await f.page.getByRole('button', { name: 'Загрузить файл', exact: true }).first().click();
  await (await chooser).setFiles(file);
}
async function dropFiles(f, files) {
  await dialog(f).locator('.aml-dropzone').evaluate((zone, files) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(new File([new Uint8Array(file.bytes)], file.name, { type: file.type }));
    zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, files);
}
async function waitList(f, count = 1) { await f.page.waitForFunction(count => window.__mediaMock.calls.filter(c => c.path === '/api/v1/media').length >= count, count); await f.page.waitForTimeout(250); }
async function audit(f) {
  await f.page.evaluate(() => document.fonts.ready);
  // Only real Tab navigation; no programmatic focus or injected focus CSS.
  let focused;
  for (let step = 0; step < 40; step++) {
    await f.page.keyboard.press('Tab');
    focused = await f.page.evaluate(() => { const el = document.activeElement, s = getComputedStyle(el); return { control: el.matches('button,input,select,a[href]'), visible: el.matches(':focus-visible'), indicated: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 }; });
    if (focused.control) break;
  }
  assert.ok(focused.control && focused.visible && focused.indicated, 'Visible keyboard focus on real control');
  const design = await f.page.evaluate(() => {
    const rendered = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const controls = [...document.querySelectorAll('button,input:not([type=file]),select')].filter(rendered).map(el => { const s = getComputedStyle(el); return { font: s.fontFamily, size: s.fontSize, radius: s.borderRadius }; });
    const overflow = [...document.querySelectorAll('#app *,[role=dialog] *')].filter(rendered).filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > innerWidth + 2 || r.left < -2;
    }).slice(0, 10).map(el => ({ tag: el.tagName, class: String(el.className), right: el.getBoundingClientRect().right }));
    return { controls, overflow, fontLoaded: document.fonts.check('16px Montserrat') };
  });
  assert.ok(design.fontLoaded && design.controls.every(c => c.font.includes('Montserrat')), 'Unified local Montserrat');
  assert.deepEqual(design.overflow, [], 'No clipped horizontal overflow');
  return { focused, design };
}

async function runCase(browser, compiled, width, name, body, scenario = 'picker') {
  const f = await fixturePage(browser, compiled, width, scenario);
  const result = { name, width, scenario };
  try {
    result.check = await body(f);
    assert.deepEqual(f.traffic.blocked, [], 'No unexpected reads/writes/backfill/provider requests');
    assert.deepEqual(f.errors, [], 'No component runtime errors');
    // Expected mock 403/503 resource messages are retained as evidence, not hidden.
    const unexpectedConsole = f.consoleErrors.filter(text => !f.traffic.expectedErrors.some(status => text.includes(String(status))) && !text.includes('ERR_ABORTED'));
    assert.deepEqual(unexpectedConsole, [], 'No unexpected console errors');
    await f.page.screenshot({ path: path.join(output, `${width}-${name}.png`), fullPage: true });
    result.passed = true;
  } catch (error) { result.passed = false; result.failure = error.message; }
  finally {
    f.state.release?.();
    result.traffic = f.traffic; result.errors = f.errors; result.consoleErrors = f.consoleErrors;
    await f.context.close();
  }
  return result;
}

async function main() {
  const compiled = await compileActualUI();
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) {
      const run = (name, body, scenario) => runCase(browser, compiled, width, name, body, scenario).then(result => results.push(result));
      await run('choose-existing', async f => {
        await openPicker(f); await selectExisting(f);
        await f.page.waitForFunction(url => document.querySelector('#picked-url').textContent === url, existing.url);
        assert.equal(f.traffic.uploads.length, 0, 'Existing selection must not reupload');
        assert.equal(f.traffic.blocked.length, 0, 'Existing selection must not POST anything');
        return audit(f);
      });
      await run('single-upload', async f => {
        await uploadFile(f, { name: 'qa-upload.png', mimeType: 'image/png', buffer: png });
        await f.page.waitForFunction(url => document.querySelector('#picked-url').textContent === url, uploaded.url);
        assert.equal(f.traffic.uploads.length, 1, 'One File, exactly one mocked upload POST');
        return audit(f);
      });
      await run('drag-drop-upload', async f => {
        await openPicker(f); await waitList(f);
        await dropFiles(f, [{ name: 'qa-upload.png', type: 'image/png', bytes: [...png] }]);
        await f.page.waitForFunction(url => document.querySelector('#picked-url').textContent === url, uploaded.url);
        assert.equal(f.traffic.uploads.length, 1, 'Drop uses the same validated multipart upload exactly once');
        return audit(f);
      });
      for (const [name, files] of [
        ['drag-drop-multiple-rejected', [{ name: 'a.png', type: 'image/png', bytes: [...png] }, { name: 'b.png', type: 'image/png', bytes: [...png] }]],
        ['drag-drop-invalid-rejected', [{ name: 'bad.svg', type: 'image/svg+xml', bytes: [60, 115, 118, 103, 62] }]],
      ]) await run(name, async f => {
        await openPicker(f); await waitList(f); await dropFiles(f, files);
        await dialog(f).getByRole('alert').first().waitFor();
        assert.equal(f.traffic.uploads.length, 0, 'Invalid drop cannot submit any file');
        assert.equal(await f.page.locator('#picked-url').textContent(), originalUrl);
        return audit(f);
      });
      await run('upload-permission-403', async f => {
        f.state.uploadMode = 'forbidden';
        await uploadFile(f, { name: 'qa-upload.png', mimeType: 'image/png', buffer: png });
        await f.page.getByRole('alert').first().waitFor();
        assert.equal(f.traffic.uploads.length, 1, 'One mocked attempt; no automatic retry on 403');
        assert.equal(await f.page.locator('#picked-url').textContent(), originalUrl, 'Denied upload cannot replace editor URL');
        return audit(f);
      });
      for (const [name, file] of [
        ['invalid-type', { name: 'qa-invalid.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('Not an image') }],
        ['oversized', { name: 'qa-oversized.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) }],
      ]) await run(name, async f => {
        await uploadFile(f, file);
        await f.page.getByRole('alert').first().waitFor();
        assert.equal(f.traffic.uploads.length, 0, 'Invalid file must fail before upload');
        assert.equal(await f.page.locator('#picked-url').textContent(), originalUrl);
        return audit(f);
      });
      for (const [name, mode] of [['permission-403', 'forbidden'], ['load-error', 'error'], ['empty', 'empty']]) await run(name, async f => {
        f.state.mode = mode; await openPicker(f); await waitList(f);
        if (mode === 'empty') {
          assert.equal(await dialog(f).getByRole('alert').count(), 0, 'Empty results are not a request error');
          await dialog(f).getByText(/Нет файлов|пока нет файлов|Ничего не найдено|Медиатека пуста|Изображений пока нет/i).first().waitFor();
        } else {
          await dialog(f).getByRole('alert').first().waitFor();
          assert.ok(!/Медиатека пуста|Нет файлов/.test(await dialog(f).getByRole('alert').first().innerText()), '403/server error must not be shown as empty');
        }
        assert.equal(f.traffic.uploads.length, 0);
        return audit(f);
      });
      await run('search-pagination', async f => {
        await openPicker(f); await waitList(f);
        await search(f).fill('   '); await f.page.waitForTimeout(500);
        assert.ok(f.traffic.list.every(q => q.q.trim() === q.q), 'Whitespace q is trimmed/omitted');
        await search(f).fill('  qa  '); await f.page.waitForTimeout(600);
        assert.ok(f.traffic.list.some(q => q.q === 'qa'), 'Search uses trimmed q');
        await dialog(f).getByRole('button', { name: /Следующ|Далее/i }).first().click();
        await f.page.waitForTimeout(400);
        assert.ok(f.traffic.list.some(q => q.page === 2), 'Pagination makes a real mocked page=2 query');
        assert.equal(f.traffic.uploads.length, 0);
        return audit(f);
      });
      await run('identity-abort', async f => {
        f.state.mode = 'hold'; await openPicker(f);
        for (let i = 0; i < 40 && !f.state.release; i++) await f.page.waitForTimeout(25);
        assert.ok(f.state.release, 'Pending media request actually started');
        await f.page.evaluate(() => window.__mediaMock.changeIdentity());
        await f.page.waitForTimeout(100);
        assert.ok(await f.page.evaluate(() => window.__mediaMock.aborts > 0), 'Identity change aborts pending request');
        f.state.mode = 'normal'; f.state.release(); await f.page.waitForTimeout(150);
        assert.equal(await f.page.locator('#picked-url').textContent(), originalUrl, 'Stale identity response cannot overwrite URL');
        assert.equal(await dialog(f).getByRole('button', { name: /qa-existing-image/i }).count(), 0, 'Stale assets cannot leak into new identity');
        assert.equal(f.traffic.uploads.length, 0);
        return { aborts: await f.page.evaluate(() => window.__mediaMock.aborts) };
      });
      await run('media-library', async f => {
        await waitList(f);
        await f.page.getByText(existing.originalName, { exact: true }).first().waitFor();
        assert.equal(f.traffic.uploads.length, 0);
        // Do not trigger explicit import-existing/backfill or upload on root-page read.
        return audit(f);
      }, 'library');
    }
  } finally {
    await browser.close();
    const report = { isolation: 'ACTUAL_SOURCE_SFC_AND_SOURCE_CSS', productionAuthTested: false, actualNetworkPassthrough: 0, actualApiWrites: 0, simulatedUploadPosts: results.reduce((sum, r) => sum + r.traffic.uploads.length, 0), results };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ report: path.join(output, 'report.json'), cases: results.length, failures: results.filter(r => !r.passed).map(r => ({ name: r.name, width: r.width, failure: r.failure })) }, null, 2));
    if (results.some(r => !r.passed)) process.exitCode = 1;
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
