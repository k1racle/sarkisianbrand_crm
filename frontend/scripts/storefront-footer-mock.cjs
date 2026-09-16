/**
 * Isolated footer regression using actual production CSS.
 * Requires a fresh production build and the local server on 3001:
 *   node frontend/scripts/storefront-footer-mock.cjs
 * Safe preparation check (no browser/server/network): append --check.
 *
 * Mounts the actual SiteFooter with mocked Nuxt composables/links and Lucide
 * geometry stubs. Performs ONE anonymous GET of the local production homepage
 * and reads its SSR-inlined style blocks in document order. No cookies/auth,
 * redirects, private API calls or external requests are made by this test.
 * Server-internal SSR reads are not intercepted or assessed by this harness.
 * The isolated browser HTML/CSS is fulfilled in memory, with no further SSR.
 * Fonts/images are fulfilled from local public files. All browser API, external,
 * navigation, websocket and mutation traffic is mocked or blocked. No profile,
 * screenshots, cookies, shared fixture files or database writes are created.
 * This checks footer CSS/interaction, NOT full production Nuxt routing or artwork.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');
const { compile } = require('@vue/compiler-dom');
const { chromium } = require('playwright-core');
const frontend = path.resolve(__dirname, '..');
const ts = require(path.join(frontend, '../backend/node_modules/typescript'));
const footerFile = path.join(frontend, 'components/storefront/SiteFooter.vue');
const systemFile = path.join(frontend, 'assets/css/storefront-system.css');
const typographyFile = path.join(frontend, 'assets/css/typography.css');
const publicDir = path.join(frontend, 'public');
const source = fs.readFileSync(footerFile, 'utf8');
const parsed = parse(source, { filename: footerFile });
assert.deepEqual(parsed.errors, [], 'Footer SFC parse');
const script = compileScript(parsed.descriptor, { id: 'footer-readonly-mock' });
const template = compileTemplate({ source: parsed.descriptor.template.content, filename: footerFile, id: 'footer-readonly-mock', compilerOptions: { bindingMetadata: script.bindings } });
assert.deepEqual(template.errors, [], 'Footer template compile');
const js = ts.transpileModule(script.content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
const render = compile(parsed.descriptor.template.content, { mode: 'function', prefixIdentifiers: true, bindingMetadata: script.bindings }).code;
const renderFactory = ts.transpileModule(`function footerRenderFactory(Vue: any) { ${render} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
const fixture = { settings: { announcementText: 'Mock storefront' }, banners: [], categories: [], menuItems: [], socialLinks: [
  { id: 'mock-vk', name: 'VK', iconKey: 'vk', url: 'https://social.example.test/vk' },
  { id: 'mock-telegram', name: 'Telegram', iconKey: 'telegram', url: 'https://social.example.test/telegram' },
  { id: 'mock-max', name: 'MAX', iconKey: 'max', url: 'https://social.example.test/max' },
] };

function localOrigin() {
  const base = new URL(process.env.STOREFRONT_URL || 'http://localhost:3001');
  assert(['localhost', '127.0.0.1'].includes(base.hostname) && base.protocol === 'http:' && base.port === '3001' && !base.username && !base.password, 'Only private local HTTP production port 3001 is allowed');
  return base.origin;
}

async function productionStyles(origin) {
  const entry = path.join(frontend, '.output/server/index.mjs');
  assert(fs.existsSync(entry), 'Parent must build production before this test');
  const newestSource = Math.max(...[footerFile, systemFile, typographyFile].map(file => fs.statSync(file).mtimeMs));
  assert(fs.statSync(entry).mtimeMs >= newestSource, 'Stale production build: wait for parent next build, never start a build here');
  const response = await fetch(origin + '/', { method: 'GET', credentials: 'omit', redirect: 'error', headers: { accept: 'text/html', 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, 'Anonymous local homepage GET failed');
  assert(response.headers.get('content-type')?.includes('text/html'), 'Homepage response is not HTML');
  const html = await response.text();
  assert(Buffer.byteLength(html) < 5_000_000, 'Unexpectedly large homepage response');
  // Style contents are raw text, not HTML-entity decoded. Preserve every block
  // and its original order; never execute scripts or substitute source CSS.
  const documentHtml = html.replace(/<!--[^]*?-->/g, '').replace(/<script\b[^>]*>[^]*?<\/script\s*>/gi, '');
  const blocks = [...documentHtml.matchAll(/<style\b[^>]*>([^]*?)<\/style\s*>/gi)].map(match => match[1]);
  assert(blocks.length > 0, 'No SSR inline style blocks in actual homepage');
  const css = blocks.join('\n');
  assert(/\.sb-storefront\s+\.sb-footer\s+\.sb-footer-link\s*\{/.test(css), 'Actual homepage is missing the new unified footer selector; verify parent server uses the latest build');
  assert(css.includes('sb-footer-link') && css.includes('prefers-reduced-motion'), 'Footer motion rules missing from production CSS');
  assert(css.includes('--sb-font:') && css.includes('--sb-leading-body:') && css.includes('montserrat-'), 'Extracted CSS is not a complete global stylesheet; do not silently omit typography foundations');
  return { css, encoding: 'SSR_INLINE_STYLES', inlineStyleBlocks: blocks.length, homepageBytes: Buffer.byteLength(html), anonymousSsrReads: 1, buildFresh: true };
}

async function main() {
  if (process.argv.includes('--check')) {
    console.log(JSON.stringify({ preparation: 'PASS', sourceCompile: 'PASS', visualRun: 'NOT_RUN', requiresFreshParentBuild: true, actualNetworkRequests: 0 }));
    return;
  }
  if (process.argv.includes('--check-styles')) {
    const { css, ...metadata } = await productionStyles(localOrigin());
    console.log(JSON.stringify({ productionStylesCheck: 'PASS', ...metadata, cssBytes: Buffer.byteLength(css), visualRun: 'NOT_RUN', actualNetworkRequests: 1, actualDirectBackendOrExternalCalls: 0, actualMutations: 0, serverInternalSsrReads: 'NOT_ASSESSED' }));
    return;
  }
  const origin = localOrigin();
  const styles = await productionStyles(origin);
  const cssPath = '/__footer_mock__.css';
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 760, hasTouch: width < 760, reducedMotion, serviceWorkers: 'block' });
      const blocked = [], errors = [], servedCss = [], mockedApis = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === origin && request.method() === 'GET') {
          if (url.pathname === '/__footer_mock__') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${cssPath}"></head><body><main id="app" class="sb-storefront"></main></body></html>` });
          // Fulfill actual SSR inline CSS in memory: no further HTTP/SSR call.
          if (url.pathname === cssPath) { servedCss.push(url.pathname); return route.fulfill({ contentType: 'text/css; charset=utf-8', body: styles.css }); }
          const media = url.pathname === '/sarkisian-logo.png' || /^\/fonts\/[a-zA-Z0-9_-]+\.woff2$/.test(url.pathname) || /^\/storefront\/icons\/(?:vk|telegram|max)\.svg$/.test(url.pathname);
          if (media) {
            const file = path.resolve(publicDir, '.' + url.pathname);
            assert(file.startsWith(publicDir + path.sep), 'Media path outside public');
            return route.fulfill({ contentType: url.pathname.endsWith('.woff2') ? 'font/woff2' : url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'image/png', body: fs.readFileSync(file) });
          }
        }
        // Explicit mock public content route; never forward any API request.
        if (request.method() === 'GET' && url.pathname === '/api/v1/products/storefront-content') { mockedApis.push(url.pathname); return route.fulfill({ json: fixture, headers: { 'access-control-allow-origin': origin, 'cache-control': 'no-store' } }); }
        blocked.push(request.method() + ' ' + url.origin + url.pathname);
        return route.abort('blockedbyclient');
      });
      if (typeof context.routeWebSocket === 'function') await context.routeWebSocket('**/*', socket => { blocked.push('WEBSOCKET'); socket.close(); });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(origin + '/__footer_mock__', { waitUntil: 'load' });
        await page.addScriptTag({ content: fs.readFileSync(path.join(frontend, 'node_modules/vue/dist/vue.global.prod.js'), 'utf8') });
        await page.evaluate(({ js, renderFactory, fixture }) => {
          Object.assign(window, Vue);
          window.footerCalls = { auth: 0, favorites: 0, cart: 0, navigations: [], api: [] };
          window.footerUser = Vue.ref(null);
          window.useStorefrontContent = () => ({ content: Vue.ref(fixture), loadStorefrontContent: async () => fixture });
          window.useStorefrontPanels = () => ({ openAuth: () => window.footerCalls.auth++, openFavorites: () => window.footerCalls.favorites++, openCart: () => window.footerCalls.cart++ });
          window.useStorefront = () => ({ user: window.footerUser });
          window.navigateTo = to => { window.footerCalls.navigations.push(to); };
          window.$fetch = async url => { window.footerCalls.api.push(url); throw new Error('Actual API calls forbidden'); };
          const icons = new Proxy({}, { get: () => Vue.defineComponent({ render() { return Vue.h('svg', { class: 'lucide', width: 15, height: 15, 'aria-hidden': 'true', stroke: 'currentColor', fill: 'none' }); } }) });
          const exports = {};
          new Function('exports', 'require', js)(exports, name => name === 'vue' ? Vue : icons);
          exports.default.render = new Function(`${renderFactory}; return footerRenderFactory;`)()(Vue);
          const app = Vue.createApp({ render() { return Vue.h(Vue.Suspense, null, { default: () => Vue.h(exports.default) }); } });
          app.config.globalProperties.navigateTo = window.navigateTo;
          app.component('NuxtLink', { props: ['to'], render() { return Vue.h('a', { href: this.to, onClick: event => { event.preventDefault(); window.navigateTo(this.to); } }, this.$slots.default?.()); } });
          app.mount('#app');
        }, { js, renderFactory, fixture });
        await page.locator('.sb-footer-link').first().waitFor();
        await page.evaluate(async () => { await document.fonts.ready; });
        const links = page.locator('.sb-footer-link');
        assert.equal(await links.count(), 14, 'All menu, action, contact and legal links must use the unified class');
        const styles = await links.evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element), parent = getComputedStyle(element.parentElement);
          return { tag: element.tagName, text: element.textContent.trim(), font: style.fontFamily, size: parseFloat(style.fontSize), weight: style.fontWeight, line: parseFloat(style.lineHeight), spacing: style.letterSpacing, color: style.color, parentColor: parent.color, background: style.backgroundColor, underline: getComputedStyle(element.querySelector('span'), '::after').opacity };
        }));
        for (const style of styles) {
          assert(style.font.startsWith('Montserrat'), JSON.stringify(style));
          assert.equal(style.size, 14, JSON.stringify(style));
          assert.equal(style.weight, '500', JSON.stringify(style));
          assert(Math.abs(style.line - 22.4) < .1, JSON.stringify(style));
          assert.equal(style.spacing === 'normal' ? 0 : parseFloat(style.spacing), 0, JSON.stringify(style));
          assert.equal(style.color, style.parentColor, 'Links inherit white/intentional muted legal color');
          assert.equal(style.background, 'rgba(0, 0, 0, 0)', JSON.stringify(style));
          assert.equal(style.underline, '0', JSON.stringify(style));
        }
        assert(await page.evaluate(() => document.fonts.check('500 14px Montserrat')), 'Local Montserrat font did not load');
        const targets = [links.filter({ hasText: /^Каталог$/ }), page.getByRole('button', { name: 'Избранное', exact: true }), links.filter({ hasText: /^info@sarkisianbrand\.ru$/ }), links.filter({ hasText: /^Публичная оферта$/ })];
        for (const target of targets) {
          await page.mouse.move(1, 1);
          await page.keyboard.press('Tab');
          await target.focus();
          assert(await target.evaluate(element => element.matches(':focus-visible')), 'Keyboard focus not visible');
          await page.waitForFunction(() => { const element = document.activeElement?.querySelector('span'); return element && getComputedStyle(element, '::after').opacity === '1' && getComputedStyle(element, '::after').transform === 'matrix(1, 0, 0, 1, 0, 0)'; });
          await target.evaluate(element => element.blur());
          if (width >= 760) {
            await target.hover();
            await page.waitForFunction(() => { const element = document.querySelector('.sb-footer-link:hover > span'); return element && getComputedStyle(element, '::after').opacity === '1' && getComputedStyle(element, '::after').transform === 'matrix(1, 0, 0, 1, 0, 0)'; });
            const hoverColors = await target.evaluate(element => ({ link: getComputedStyle(element).color, parent: getComputedStyle(element.parentElement).color }));
            assert.equal(hoverColors.link, hoverColors.parent, 'Legacy coral/white hover overrides unified color');
          }
          await page.mouse.move(1, 1);
        }
        if (reducedMotion === 'reduce') assert(await links.evaluateAll(elements => elements.every(element => getComputedStyle(element.querySelector('span'), '::after').transitionDuration.split(',').every(value => parseFloat(value) <= .00001))), 'Reduced-motion underline still animates');
        await page.getByRole('button', { name: 'Личный кабинет', exact: true }).click();
        await page.getByRole('button', { name: 'Избранное', exact: true }).click();
        await page.getByRole('button', { name: 'Корзина', exact: true }).click();
        await page.evaluate(() => { window.footerUser.value = { id: 'mock-user' }; });
        await page.getByRole('button', { name: 'Личный кабинет', exact: true }).click();
        assert.deepEqual(await page.evaluate(() => window.footerCalls), { auth: 1, favorites: 1, cart: 1, navigations: ['/account'], api: [] });
        const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, footerOverflow: document.querySelector('.sb-footer').scrollWidth > document.querySelector('.sb-footer').clientWidth + 1, headingTops: [...document.querySelectorAll('.sb-footer h3')].map(element => element.getBoundingClientRect().top) }));
        assert(!geometry.overflow && !geometry.footerOverflow, JSON.stringify(geometry));
        if (width >= 1100) assert(Math.max(...geometry.headingTops) - Math.min(...geometry.headingTops) < 1, 'Footer column headings have inconsistent top alignment');
        assert.deepEqual(blocked, [], 'Unexpected traffic was blocked, not forwarded');
        assert.deepEqual(errors, [], 'Footer browser errors');
        assert.equal(servedCss.length, 1, 'Expected exactly one mocked stylesheet request');
        results.push({ width, reducedMotion, passed: true, styles, geometry, mockedApis, actualBackendOrExternalCalls: 0, productionAssetRequests: 0, mockedStylesheetRequests: servedCss.length, iconArtwork: 'stubbed', fullNuxtRouting: 'NOT_TESTED' });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ results, anonymousSsrReads: styles.anonymousSsrReads, inlineStyleBlocks: styles.inlineStyleBlocks, actualNetworkRequests: 1, actualDirectBackendOrExternalCalls: 0, actualMutations: 0, serverInternalSsrReads: 'NOT_ASSESSED' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
