/* Standalone compiled ProductCard; no application server, database or provider traffic. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parse, compileScript } = require('@vue/compiler-sfc');
const { compile } = require('@vue/compiler-dom');
const ts = require('../../backend/node_modules/typescript');
const { chromium } = require('playwright-core');
const frontend = path.resolve(__dirname, '..');
const origin = 'http://gift-product-mock.test';
const output = path.join(frontend, '.screenshots/gift-product-mock');

function compileCard() {
  const filename = path.join(frontend, 'components/storefront/ProductCard.vue');
  const parsed = parse(fs.readFileSync(filename, 'utf8'), { filename });
  assert.deepEqual(parsed.errors, []);
  const script = compileScript(parsed.descriptor, { id: 'isolated-gift-product' });
  return {
    js: ts.transpileModule(script.content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText,
    render: compile(parsed.descriptor.template.content, { mode: 'function', prefixIdentifiers: true, bindingMetadata: script.bindings }).code,
  };
}
const baseProduct = { id: 'isolated-product', slug: 'isolated-gift-card', nameRu: 'Электронная подарочная карта SARKISIAN BRAND', basePrice: 9000, images: [], categories: [{ isPrimary: true, category: { nameRu: 'Подарочные карты' } }] };
const cases = [
  { name: 'gift-zero-stock', product: { ...baseProduct, productType: 'GIFT_CARD', variants: [
    { id: 'gift-5000', price: 5000, stock: 0, reserved: 0, isActive: true },
    { id: 'gift-inactive-500', price: 500, stock: 0, reserved: 0, isActive: false },
    { id: 'gift-1000', price: 1000, stock: 0, reserved: 20, isActive: true },
  ] }, expectedPrice: 1000, enabled: true, gift: true },
  { name: 'gift-no-active-denomination', product: { ...baseProduct, productType: 'GIFT_CARD', variants: [{ id: 'inactive', price: 500, stock: 0, isActive: false }] }, expectedPrice: 9000, enabled: false, gift: true },
  { name: 'physical-cart-control', product: { ...baseProduct, productType: 'PHYSICAL', slug: 'isolated-gel', nameRu: 'Профессиональный гель для моделирования', variants: [{ id: 'physical-own', price: 780, stock: 3, reserved: 1, isActive: true }] }, expectedPrice: 780, enabled: true, gift: false },
];

async function main() {
  const compiled = compileCard();
  const cssFiles = ['main.css', 'design-system.css', 'storefront.css', 'storefront-glass.css', 'typography.css', 'storefront-system.css', 'storefront-gift-products.css'];
  const css = cssFiles.map(file => fs.readFileSync(path.join(frontend, 'assets/css', file), 'utf8')).join('\n');
  const fonts = new Map(['cyrillic-ext', 'cyrillic', 'latin-ext', 'latin'].map(suffix => {
    const name = 'montserrat-' + suffix + '.woff2';
    return ['/fonts/' + name, fs.readFileSync(path.join(frontend, 'public/fonts', name))];
  }));
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) for (const scenario of cases) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block', isMobile: width < 760, hasTouch: width < 760 });
      const blocked = [], errors = [];
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (request.method() === 'GET' && url.origin === origin) {
          if (url.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="app" class="sb-storefront"></main></body></html>' });
          if (fonts.has(url.pathname)) return route.fulfill({ contentType: 'font/woff2', body: fonts.get(url.pathname) });
        }
        blocked.push(request.method() + ' ' + request.url());
        return route.abort('blockedbyclient');
      });
      try {
        await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: css });
        // Fixture geometry only: the real ProductCard, typography and control CSS are unchanged.
        await page.addStyleTag({ content: '#app { padding: 24px; } .gift-mock-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 20px; } @media(max-width:760px) { #app { padding: 18px; } .gift-mock-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } }' });
        await page.addScriptTag({ content: fs.readFileSync(path.join(frontend, 'node_modules/vue/dist/vue.global.prod.js'), 'utf8') });
        await page.evaluate(({ js, render, product }) => {
          Object.assign(window, Vue);
          window.mockCalls = { cart: [], navigations: [], favorites: [], api: [] };
          window.fixtureProduct = Vue.reactive(product);
          window.navigateTo = async to => { window.mockCalls.navigations.push(to); };
          window.storefrontProductImage = () => '';
          const favorites = Vue.ref([]);
          window.useStorefront = () => ({
            favoriteIds: favorites,
            addToCart: async (item, quantity, variantId) => { window.mockCalls.cart.push({ id: item.id, quantity, variantId }); },
            toggleFavorite: id => { window.mockCalls.favorites.push(id); favorites.value = favorites.value.includes(id) ? favorites.value.filter(value => value !== id) : [...favorites.value, id]; },
          });
          window.$fetch = async (url, options) => { window.mockCalls.api.push({ url, method: options?.method || 'GET' }); throw new Error('Actual APIs forbidden in isolated ProductCard test'); };
          // Lucide stubs preserve inherited color/size; this test does not grade icon artwork.
          const icons = new Proxy({}, { get: () => Vue.defineComponent({ render() { return Vue.h('svg', { width: 18, height: 18, 'aria-hidden': 'true' }); } }) });
          const exports = {};
          new Function('exports', 'require', js)(exports, name => name === 'vue' ? Vue : icons);
          exports.default.render = new Function('Vue', render)(Vue);
          const app = Vue.createApp({ render() { return Vue.h('div', { class: 'gift-mock-grid' }, Array.from({ length: 4 }, (_, i) => Vue.h(exports.default, { key: i, product: window.fixtureProduct }))); } });
          app.component('NuxtLink', { props: ['to'], render() { return Vue.h('a', { href: this.to, onClick: event => { if (!event.defaultPrevented) { event.preventDefault(); window.navigateTo(this.to); } } }, this.$slots.default?.()); } });
          app.mount('#app');
        }, { ...compiled, product: scenario.product });
        await page.evaluate(async () => { await document.fonts.ready; });
        const card = page.locator('.sb-product-card').first();
        const button = card.locator(width < 760 ? '.sb-card-add-mobile' : '.sb-card-add-overlay');
        if (width >= 760) await card.locator('.sb-product-card__visual').hover();
        const price = (await card.locator('.sb-product-card__price-row strong').innerText()).replace(/\s/g, '');
        assert.equal(price, (scenario.gift && scenario.enabled ? 'от' : '') + scenario.expectedPrice + '₽', 'Price must use the lowest ACTIVE denomination');
        assert.equal(await button.isDisabled(), !scenario.enabled);
        if (scenario.gift && scenario.enabled) assert.equal((await button.innerText()).trim(), 'Подробнее');
        if (scenario.gift) assert.equal(await card.locator('.sb-product-card__price-row small').count(), 0);
        const grade = await button.evaluate(element => {
          const style = getComputedStyle(element), root = getComputedStyle(document.querySelector('#app'));
          return { font: style.fontFamily, size: parseFloat(style.fontSize), radius: parseFloat(style.borderRadius), expectedRadius: parseFloat(root.getPropertyValue('--sf-radius-compact')), height: element.getBoundingClientRect().height, expectedHeight: parseFloat(root.getPropertyValue('--sf-control-compact')), background: style.backgroundColor, color: style.color, width: element.getBoundingClientRect().width, cardWidth: element.closest('.sb-product-card').getBoundingClientRect().width };
        });
        assert(grade.font.startsWith('Montserrat'), JSON.stringify(grade));
        assert.equal(grade.size, 14, JSON.stringify(grade));
        assert.equal(grade.radius, grade.expectedRadius, JSON.stringify(grade));
        assert(grade.height >= grade.expectedHeight - 1, JSON.stringify(grade));
        assert.equal(grade.background, 'rgb(21, 21, 21)', JSON.stringify(grade));
        assert.equal(grade.color, 'rgb(255, 255, 255)', JSON.stringify(grade));
        assert(grade.width <= grade.cardWidth + 1, JSON.stringify(grade));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Horizontal overflow at ' + width);
        if (scenario.enabled) await button.click();
        const calls = await page.evaluate(() => window.mockCalls);
        assert.deepEqual(calls.api, [], 'Product card made an API/provider/admin request');
        if (scenario.gift) {
          assert.deepEqual(calls.cart, [], 'Gift product was added with a default denomination');
          assert.deepEqual(calls.navigations, scenario.enabled ? ['/products/' + scenario.product.slug] : []);
        } else {
          assert.deepEqual(calls.cart, [{ id: scenario.product.id, quantity: 1, variantId: 'physical-own' }]);
          assert.deepEqual(calls.navigations, []);
        }
        const afterVariants = await page.evaluate(() => window.fixtureProduct.variants);
        assert.deepEqual(afterVariants, scenario.product.variants, 'UI changed warehouse stock/reservations or reordered denomination inputs');
        assert.deepEqual(errors, []);
        assert.deepEqual(blocked, [], 'Unexpected network traffic');
        await page.screenshot({ path: path.join(output, scenario.name + '-' + width + '.png'), fullPage: true });
        results.push({ width, scenario: scenario.name, passed: true, grade, mockedCalls: calls, actualApiCalls: 0, stockUnchanged: true, iconArtwork: 'stubbed' });
      } catch (error) {
        await page.screenshot({ path: path.join(output, scenario.name + '-' + width + '-failure.png'), fullPage: true }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, actualApiCalls: 0, actualMutations: 0 }, null, 2));
  }
  console.log(JSON.stringify({ results, actualApiCalls: 0, actualMutations: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
