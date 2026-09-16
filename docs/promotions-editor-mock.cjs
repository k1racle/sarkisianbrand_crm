/** Standalone Vue/browser test. Mock fetch ONLY; never calls the application API. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const localRequire = createRequire(path.join(frontend, 'package.json'));
const { parse, compileScript } = localRequire('@vue/compiler-sfc');
const { compile } = localRequire('@vue/compiler-dom');
const ts = require(path.join(root, 'backend/node_modules/typescript'));
const { chromium } = localRequire('playwright-core');

async function main() {
  const source = fs.readFileSync(path.join(frontend, 'components/storefront/SitePromoCodesEditor.vue'), 'utf8');
  const { descriptor, errors } = parse(source);
  if (errors.length) throw errors[0];
  const script = compileScript(descriptor, { id: 'mock-promotions' });
  const js = ts.transpileModule(script.content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  // Script-setup bindings are not public _ctx properties; use the same prefixing as SFC compilation.
  const render = compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true, bindingMetadata: script.bindings }).code;
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      // All request traffic is blocked even if future component changes attempt a real URL.
      await page.route('**/*', route => route.abort());
      const problems = [];
      page.on('pageerror', caught => problems.push(caught.message));
      await page.setContent('<div id="app"></div>');
      await page.addStyleTag({ content: fs.readFileSync(path.join(frontend, 'assets/css/typography.css'), 'utf8') + fs.readFileSync(path.join(frontend, 'assets/css/storefront-promotions-admin.css'), 'utf8') });
      await page.addScriptTag({ content: fs.readFileSync(path.join(frontend, 'node_modules/vue/dist/vue.global.prod.js'), 'utf8') });
      await page.evaluate(({ js, render }) => {
        Object.assign(window, Vue);
        window.onBeforeRouteLeave = () => {};
        window.onBeforeRouteUpdate = () => {};
        window.calls = [];
        window.rows = [
          { code: 'TEST500', title: 'Mock unused', type: 'FIXED', amount: '500.00', minimumAmount: '2000.00', perCustomerLimit: 1, isActive: false, revision: 2, usage: { total: 0, reserved: 0, applied: 0, history: 0 } },
          { code: 'WELCOME10', title: 'Mock used', type: 'PERCENT', amount: '10.00', minimumAmount: '1500.00', perCustomerLimit: 1, isActive: true, revision: 1, usage: { total: 2, reserved: 1, applied: 1, history: 2 } },
        ];
        window.$fetch = async (url, options) => {
          window.calls.push({ path: url, method: options.method || 'GET', body: options.body });
          if (url === '/promotions/generate') return { code: 'SB-MOCK1234' };
          if (!options.method) return { items: window.rows, total: window.rows.length };
          if (options.method === 'POST') {
            window.rows.push({ ...options.body, code: options.body.code, revision: 1 });
            return {};
          }
          const code = decodeURIComponent(url.split('/').pop());
          if (options.method === 'DELETE') {
            if (code === 'WELCOME10') throw { statusCode: 409 };
            window.rows = window.rows.filter(row => row.code !== code);
          }
          if (options.method === 'PATCH') window.rows = window.rows.map(row => row.code === code ? { ...row, ...options.body, revision: row.revision + 1 } : row);
          return {};
        };
        // Icons are stubs: this test verifies component behaviour, not Lucide artwork.
        const icons = new Proxy({}, { get: () => Vue.defineComponent({ render() { return Vue.h('svg', { width: 18, height: 18 }); } }) });
        const exports = {};
        new Function('exports', 'require', js)(exports, name => name === 'vue' ? Vue : icons);
        exports.default.render = new Function('Vue', render)(Vue);
        Vue.createApp(exports.default, { apiBase: '/mock', token: 'mock' }).mount('#app');
      }, { js, render });

      await page.locator('.sb-promo-hero button').last().click();
      await page.locator('.sb-promo-code-input button').click();
      await page.locator('.sb-promo-form input[maxlength="160"]').fill('Mock new');
      await page.locator('.sb-promo-form input[inputmode="decimal"]').first().fill('101');
      await page.locator('button[type="submit"]').click();
      await page.getByRole('alert').waitFor();
      await page.locator('.sb-promo-form input[inputmode="decimal"]').first().fill('12,50');
      await page.locator('button[type="submit"]').click();
      await page.locator('.sb-promo-form').waitFor({ state: 'hidden' });
      const create = await page.evaluate(() => window.calls.find(call => call.path === '/promotions' && call.method === 'POST'));
      if (create.body.type !== 'PERCENT' || create.body.amount !== 12.5 || create.body.perCustomerLimit !== 1) throw new Error('Invalid create payload');

      let row = page.locator('tbody tr').filter({ hasText: 'TEST500' });
      await row.locator('button').first().click();
      await page.locator('button[type="submit"]').click();
      await page.locator('.sb-promo-form').waitFor({ state: 'hidden' });
      if (!await page.evaluate(() => window.calls.some(call => call.method === 'PATCH' && call.body.revision === 2))) throw new Error('Missing edit revision');
      await row.locator('button').last().click();
      const dialog = page.getByRole('dialog');
      if (!await dialog.locator('footer button').first().isDisabled()) throw new Error('Deletion without confirmation');
      await dialog.locator('input').fill('TEST500');
      await dialog.locator('footer button').first().click();
      await dialog.waitFor({ state: 'hidden' });

      row = page.locator('tbody tr').filter({ hasText: 'WELCOME10' });
      await row.locator('button').last().click();
      await dialog.locator('input').fill('WELCOME10');
      await dialog.locator('footer button').first().click();
      await dialog.getByRole('alert').waitFor();
      await dialog.locator('footer button').nth(1).click();
      await dialog.locator('footer button').first().click();
      await dialog.waitFor({ state: 'hidden' });

      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, lock: document.documentElement.style.overflow, primary: getComputedStyle(document.querySelector('.sb-promo-button:not(.sb-promo-button--white)')).backgroundColor, whiteText: getComputedStyle(document.querySelector('.sb-promo-button--white')).color }));
      if (layout.overflow || layout.lock || problems.length || layout.primary !== 'rgb(21, 21, 21)' || layout.whiteText !== 'rgb(21, 21, 21)') throw new Error(JSON.stringify({ width, layout, problems }));
      console.log(JSON.stringify({ width, mockTests: 'PASS', layout, problems }));
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(caught => { console.error(caught); process.exitCode = 1; });
