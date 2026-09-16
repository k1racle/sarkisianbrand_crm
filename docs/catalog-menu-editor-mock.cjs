/**
 * Prepared isolated editor QA, not run against a shared browser/server.
 * Preparation only: node docs/catalog-menu-editor-mock.cjs --check
 * Parent may run normally AFTER fresh production build on localhost:3001.
 * Normal mode makes one anonymous local homepage GET for SSR inline CSS,
 * preserving style-block order; server-internal SSR reads are not assessed.
 * Browser document, CSS, fonts and ALL admin API calls are mocked in memory.
 * No real category/menu writes, external calls, cookies or artifact files.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const localRequire = createRequire(path.join(frontend, 'package.json'));
const { parse, compileScript, compileTemplate } = localRequire('@vue/compiler-sfc');
const { compile } = localRequire('@vue/compiler-dom');
const { chromium } = localRequire('playwright-core');
const ts = require(path.join(root, 'backend/node_modules/typescript'));
const componentFile = path.join(frontend, 'components/storefront/SiteCatalogMenuEditor.vue');
const cssFile = path.join(frontend, 'assets/css/storefront-catalog-menu-admin.css');
const transpile = content => ts.transpileModule(content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const { descriptor, errors } = parse(fs.readFileSync(componentFile, 'utf8'), { filename: componentFile });
assert.deepEqual(errors, []);
const script = compileScript(descriptor, { id: 'catalog-menu-mock' });
assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: componentFile, id: 'catalog-menu-mock', compilerOptions: { bindingMetadata: script.bindings } }).errors, []);
const js = transpile(script.content);
const render = compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true, bindingMetadata: script.bindings }).code;
const renderFactory = transpile(`function catalogRenderFactory(Vue: any) { ${render} }`);
const helperJs = transpile(fs.readFileSync(path.join(frontend, 'composables/useStorefrontCatalog.ts'), 'utf8'));
const fixture = { revision: 7, categories: [
  { id: 'mock-gels', nameRu: 'Гели', slug: 'gels', parentId: null, isActive: true },
  { id: 'mock-mousse', nameRu: 'Гель-муссы', slug: 'gel-mousse', parentId: 'mock-gels', isActive: true },
  { id: 'mock-tools', nameRu: 'Инструменты', slug: 'instruments', parentId: null, isActive: true },
  { id: 'mock-inactive', nameRu: 'Архив', slug: 'archive', parentId: null, isActive: false },
], entries: [
  { categoryId: 'mock-gels', label: 'Гели', isVisible: true },
  { categoryId: 'mock-mousse', label: 'Гель-муссы', isVisible: true },
  { categoryId: 'mock-tools', label: 'Инструменты', isVisible: true },
  { categoryId: 'mock-inactive', label: 'Архив', isVisible: true },
], quickLinks: [
  { key: 'new', label: 'Новинки', isVisible: true },
  { key: 'popular', label: 'Бестселлеры', isVisible: true },
  { key: 'gift-card', label: 'Подарочная карта', isVisible: true },
] };

// Pure checks in preparation mode execute no Vue setup, browser or network.
const helperExports = {};
vm.runInNewContext(helperJs, { exports: helperExports });
assert.equal(helperExports.storefrontCatalogLink('x&bad=https://external.test'), '/catalog?category=x%26bad%3Dhttps%3A%2F%2Fexternal.test');
assert.deepEqual(JSON.parse(JSON.stringify(helperExports.storefrontCategoryGroups(fixture.categories).map(group => ({ id: group.id, children: group.items.map(item => item.id) })))), [{ id: 'mock-gels', children: ['mock-mousse'] }, { id: 'mock-tools', children: [] }]);

async function productionCss(origin) {
  const entry = path.join(frontend, '.output/server/index.mjs');
  const newest = Math.max(...[componentFile, cssFile, path.join(frontend, 'assets/css/typography.css')].map(file => fs.statSync(file).mtimeMs));
  assert(fs.existsSync(entry) && fs.statSync(entry).mtimeMs >= newest, 'Wait for parent fresh production build; do not build from this script');
  const response = await fetch(origin + '/', { method: 'GET', credentials: 'omit', redirect: 'error', headers: { accept: 'text/html' }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200); assert(response.headers.get('content-type')?.includes('text/html'));
  const html = await response.text(); assert(Buffer.byteLength(html) < 5_000_000);
  const documentHtml = html.replace(/<!--[^]*?-->/g, '').replace(/<script\b[^>]*>[^]*?<\/script\s*>/gi, '');
  const blocks = [...documentHtml.matchAll(/<style\b[^>]*>([^]*?)<\/style\s*>/gi)].map(match => match[1]);
  const css = blocks.join('\n');
  assert(css.includes('.sb-catalog-menu-admin') && css.includes('--sb-font:') && css.includes('montserrat-'), 'Actual SSR inline CSS lacks editor/foundations; confirm parent CSS registration and fresh server');
  return { css, blocks: blocks.length };
}

async function main() {
  if (process.argv.includes('--check')) { console.log(JSON.stringify({ preparation: 'PASS', sourceCompile: 'PASS', actualCatalogHelperChecks: 'PASS', visualRun: 'NOT_RUN', actualNetworkRequests: 0 })); return; }
  const base = new URL(process.env.STOREFRONT_URL || 'http://localhost:3001');
  assert(['localhost', '127.0.0.1'].includes(base.hostname) && base.protocol === 'http:' && base.port === '3001' && !base.username && !base.password);
  const origin = base.origin, styles = await productionCss(origin);
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 760, hasTouch: width < 760, serviceWorkers: 'block' });
      const blocked = [], problems = [];
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (request.method() === 'GET' && url.origin === origin) {
          if (url.pathname === '/__catalog_menu_mock__') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app"></main></body></html>' });
          if (/^\/fonts\/[a-zA-Z0-9_-]+\.woff2$/.test(url.pathname)) return route.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(frontend, 'public', url.pathname.slice(1))) });
        }
        blocked.push(request.method() + ' ' + url.origin + url.pathname); return route.abort('blockedbyclient');
      });
      if (typeof context.routeWebSocket === 'function') await context.routeWebSocket('**/*', socket => { blocked.push('WEBSOCKET'); socket.close(); });
      const page = await context.newPage(); page.on('pageerror', caught => problems.push(caught.message));
      let approveConfirm = true; page.on('dialog', dialog => approveConfirm ? dialog.accept() : dialog.dismiss());
      try {
        await page.goto(origin + '/__catalog_menu_mock__', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: styles.css });
        await page.addScriptTag({ content: fs.readFileSync(path.join(frontend, 'node_modules/vue/dist/vue.global.prod.js'), 'utf8') });
        await page.evaluate(({ js, renderFactory, helperJs, fixture }) => {
          Object.assign(window, Vue);
          window.catalogCalls = []; window.catalogVueProblems = []; window.catalogServer = structuredClone(fixture); window.catalogMode = 'ok';
          window.onBeforeRouteLeave = callback => { window.catalogLeave = callback; };
          window.onBeforeRouteUpdate = callback => { window.catalogUpdate = callback; };
          window.$fetch = async (url, options) => {
            if (url !== '/admin/storefront/catalog-menu') throw new Error('Unexpected mock endpoint');
            window.catalogCalls.push({ url, method: options.method || 'GET', body: options.body, bearer: options.headers.Authorization });
            const isSave = options.method === 'PATCH';
            if ((!isSave && window.catalogMode === 'get403') || (isSave && window.catalogMode === 'save409') || (isSave && window.catalogMode === 'save503')) throw { statusCode: window.catalogMode === 'get403' ? 403 : window.catalogMode === 'save409' ? 409 : 503 };
            if (!isSave && window.catalogMode === 'deferGet') return new Promise(resolve => { window.pendingCatalogGet = { resolve, signal: options.signal }; });
            if (isSave) { window.catalogServer = { ...window.catalogServer, ...structuredClone(options.body), revision: options.body.revision + 1 }; }
            return structuredClone(window.catalogServer);
          };
          const helpers = {}; new Function('exports', helperJs)(helpers);
          Object.assign(window, helpers);
          const exports = {}; new Function('exports', 'require', js)(exports, name => { if (name === 'vue') return Vue; throw new Error('Unexpected module'); });
          exports.default.render = new Function(`${renderFactory}; return catalogRenderFactory;`)()(Vue);
          window.catalogProps = Vue.reactive({ apiBase: '/mock-api', token: 'mock-only-token' });
          window.catalogApp = Vue.createApp({ render() { return Vue.h(exports.default, { ...window.catalogProps }); } });
          // Plain SFC compilation does not perform Nuxt template auto-imports:
          // the generated render calls _ctx.storefrontCatalogLink, not window.
          // Use the real helper on both setup globals and the render instance.
          window.catalogApp.config.globalProperties.storefrontCatalogLink = helpers.storefrontCatalogLink;
          window.catalogApp.config.errorHandler = (caught, instance, info) => window.catalogVueProblems.push({ message: String(caught?.message || caught), info: String(info) });
          window.catalogApp.mount('#app');
        }, { js, renderFactory, helperJs, fixture });
        await page.waitForFunction(() => Boolean(document.querySelector('[data-category-id="mock-gels"]') || document.querySelector('[role="alert"]') || window.catalogVueProblems?.length));
        assert.deepEqual(await page.evaluate(() => window.catalogVueProblems), [], 'Vue mount/render failed');
        await page.locator('[data-category-id="mock-gels"]').waitFor();
        assert.equal(await page.locator('[data-category-id]').count(), 4);
        assert.equal(await page.locator('[data-quick-key]').count(), 3);
        assert(await page.evaluate(() => window.catalogCalls.length === 1 && window.catalogCalls[0].method === 'GET'));
        assert(!(await page.locator('.sb-cma-preview-groups').innerText()).includes('Архив'), 'Inactive category appears publicly');
        const rootRow = page.locator('[data-category-id="mock-gels"]');
        const childRow = page.locator('[data-category-id="mock-mousse"]');
        await rootRow.locator('input:not([type="checkbox"])').fill('Гели для мастеров');
        assert((await page.locator('.sb-cma-preview-groups h4').allTextContents()).includes('Гели для мастеров'), 'Root preview must use the configured label, not the original category name');
        await childRow.locator('input:not([type="checkbox"])').fill('Гель-муссы мастера');
        assert((await page.locator('.sb-cma-preview-groups').innerText()).includes('Гель-муссы мастера'), 'Visible child preview must use its configured label');
        await rootRow.locator('input[type="checkbox"]').uncheck();
        const hiddenParentPreview = await page.locator('.sb-cma-preview-groups').innerText();
        assert(!hiddenParentPreview.includes('Гели для мастеров'), 'Hidden parent appears publicly');
        assert(!hiddenParentPreview.includes('Гель-муссы мастера'), 'Hidden parent must hide all descendants; children must not be promoted to roots');
        const tools = page.locator('[data-category-id="mock-tools"]');
        await tools.getByRole('button', { name: 'Поднять Инструменты выше', exact: true }).click();
        await tools.getByRole('button', { name: 'Поднять Инструменты выше', exact: true }).click();
        const gift = page.locator('[data-quick-key="gift-card"]');
        await gift.locator('input:not([type="checkbox"])').fill('Подарочные карты');
        await gift.getByRole('button', { name: 'Поднять быструю ссылку gift-card выше', exact: true }).click();
        await gift.getByRole('button', { name: 'Поднять быструю ссылку gift-card выше', exact: true }).click();
        await page.locator('[data-quick-key="popular"] input[type="checkbox"]').uncheck();
        await childRow.locator('input:not([type="checkbox"])').fill('');
        const save = page.getByRole('button', { name: 'Сохранить меню', exact: true });
        await save.click(); await page.getByRole('alert').waitFor();
        assert(await page.evaluate(() => window.catalogCalls.every(call => call.method === 'GET')), 'Empty label posted');
        await childRow.locator('input:not([type="checkbox"])').fill('Гель-муссы мастера');
        await page.evaluate(() => { window.catalogMode = 'save409'; }); await save.click();
        await page.getByRole('alert').filter({ hasText: 'другим сотрудником' }).waitFor(); assert(await save.isDisabled());
        const failedBody = await page.evaluate(() => window.catalogCalls.find(call => call.method === 'PATCH').body);
        assert.equal(failedBody.revision, 7); assert.equal(failedBody.entries[0].categoryId, 'mock-tools');
        assert.deepEqual(failedBody.quickLinks.map(item => item.key), ['gift-card', 'new', 'popular']);
        assert.equal(failedBody.quickLinks[2].isVisible, false); assert(!('categories' in failedBody));
        for (const item of [...failedBody.entries, ...failedBody.quickLinks]) assert(!('url' in item) && typeof item.isVisible === 'boolean');
        const countBefore = await page.evaluate(() => window.catalogCalls.length);
        approveConfirm = false; await page.getByRole('button', { name: 'Обновить меню', exact: true }).click();
        assert.equal(await page.evaluate(() => window.catalogCalls.length), countBefore, 'Dismissed dirty refresh made a request');
        approveConfirm = true; await page.evaluate(() => { window.catalogMode = 'ok'; });
        await page.getByRole('button', { name: 'Обновить меню', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-category-id="mock-mousse"] input').value === 'Гель-муссы');
        await childRow.locator('input:not([type="checkbox"])').fill('Обновлённое название');
        await page.evaluate(() => { window.catalogMode = 'save503'; }); await save.click();
        await page.getByRole('alert').filter({ hasText: 'временно недоступен' }).waitFor(); assert(!await save.isDisabled());
        assert.equal(await childRow.locator('input:not([type="checkbox"])').inputValue(), 'Обновлённое название');
        await page.evaluate(() => { window.catalogMode = 'ok'; }); await save.click();
        await page.getByRole('status').filter({ hasText: 'Меню каталога сохранено.' }).waitFor(); assert(await save.isDisabled());
        await childRow.locator('input:not([type="checkbox"])').fill('Черновик для отмены');
        await page.getByRole('button', { name: 'Отменить изменения', exact: true }).click();
        assert.equal(await childRow.locator('input:not([type="checkbox"])').inputValue(), 'Обновлённое название');
        await page.evaluate(() => { window.catalogMode = 'get403'; window.catalogProps.token = 'mock-denied'; });
        await page.getByRole('alert').filter({ hasText: 'Недостаточно прав' }).waitFor(); assert.equal(await page.locator('[data-category-id]').count(), 0);
        await page.evaluate(() => { window.catalogMode = 'ok'; }); await page.getByRole('button', { name: 'Повторить загрузку', exact: true }).click();
        await rootRow.waitFor();
        const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, font: getComputedStyle(document.querySelector('.sb-cma-button')).fontFamily, fontSize: getComputedStyle(document.querySelector('.sb-cma-button')).fontSize, radius: getComputedStyle(document.querySelector('.sb-cma-button')).borderRadius }));
        assert(!geometry.overflow); assert(geometry.font.startsWith('Montserrat')); assert.equal(geometry.fontSize, '14px'); assert.equal(geometry.radius, '14px');
        await page.evaluate(() => { window.catalogMode = 'deferGet'; }); await page.getByRole('button', { name: 'Обновить меню', exact: true }).click();
        await page.waitForFunction(() => Boolean(window.pendingCatalogGet));
        await page.evaluate(() => { window.catalogMode = 'ok'; window.catalogServer.revision = 42; window.catalogProps.token = 'mock-new-identity'; });
        await page.waitForFunction(() => document.querySelector('.sb-cma-actions')?.textContent.includes('Версия 42'));
        assert(await page.evaluate(() => window.pendingCatalogGet.signal.aborted), 'Identity change did not abort old request');
        await page.evaluate(async () => { window.pendingCatalogGet.resolve({ ...window.catalogServer, revision: 1 }); await Vue.nextTick(); await Vue.nextTick(); });
        assert((await page.locator('.sb-cma-actions').innerText()).includes('Версия 42'), 'Stale response overwrote new identity');
        await page.evaluate(() => { window.pendingCatalogGet = null; window.catalogMode = 'deferGet'; }); await page.getByRole('button', { name: 'Обновить меню', exact: true }).click();
        await page.waitForFunction(() => Boolean(window.pendingCatalogGet)); await page.evaluate(() => window.catalogApp.unmount());
        assert(await page.evaluate(() => window.pendingCatalogGet.signal.aborted), 'Unmount did not abort pending request');
        assert.deepEqual(await page.evaluate(() => window.catalogVueProblems), [], 'Vue render/watch errors');
        assert.deepEqual(problems, []); assert.deepEqual(blocked, []);
        results.push({ width, mockChecks: 'PASS', geometry, conflict503And403: true, revisionAndIdentityGuards: true, actualAdminOrExternalCalls: 0, actualMutations: 0 });
      } catch (caught) {
        const diagnostics = await page.evaluate(() => ({ bodyText: (document.body?.innerText || '').slice(0, 16000), vueProblems: window.catalogVueProblems || [], mockCalls: (window.catalogCalls || []).map(call => ({ method: call.method, url: call.url })), mode: window.catalogMode })).catch(() => ({ pageUnavailable: true }));
        // Only synthetic widget/fixture diagnostics; no homepage HTML, cookies,
        // Authorization values, payloads or real customer/admin data are logged.
        console.error(JSON.stringify({ width, failure: String(caught?.message || caught), problems, blocked, diagnostics }, null, 2));
        throw caught;
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ results, anonymousLocalSsrReads: 1, inlineStyleBlocks: styles.blocks, serverInternalSsrReads: 'NOT_ASSESSED', actualMutations: 0 }, null, 2));
}
main().catch(caught => { console.error(caught); process.exitCode = 1; });
