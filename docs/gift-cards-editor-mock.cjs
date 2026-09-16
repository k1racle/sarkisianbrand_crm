/** Isolated gift-card editor test: in-memory API and all real network blocked. */
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
  const source = fs.readFileSync(path.join(frontend, 'components/storefront/SiteGiftCardsEditor.vue'), 'utf8');
  const { descriptor, errors } = parse(source);
  if (errors.length) throw errors[0];
  const script = compileScript(descriptor, { id: 'gift-mock' });
  const js = ts.transpileModule(script.content, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  const render = compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true, bindingMetadata: script.bindings }).code;
  const renderFactory = ts.transpileModule(`function giftRenderFactory(Vue: any) { ${render} }`, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None } }).outputText;
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/*', route => route.abort());
      const problems = [];
      page.on('pageerror', caught => problems.push(caught.message));
      await page.setContent('<div id="app"></div>');
      await page.addStyleTag({ content: fs.readFileSync(path.join(frontend, 'assets/css/typography.css'), 'utf8') + fs.readFileSync(path.join(frontend, 'assets/css/storefront-gift-cards-admin.css'), 'utf8') });
      await page.addScriptTag({ content: fs.readFileSync(path.join(frontend, 'node_modules/vue/dist/vue.global.prod.js'), 'utf8') });
      await page.evaluate(({ js, renderFactory }) => {
        Object.assign(window, Vue);
        window.onBeforeRouteLeave = () => {};
        window.onBeforeRouteUpdate = () => {};
        window.calls = [];
        window.product = { nameRu: 'Mock gift card', descriptionRu: 'Mock description', denominations: [1000, 3000], validityDays: 365, isActive: false, imageUrl: '/images/gift.webp' };
        window.rows = [{ id: 'mock-card', maskedCode: 'GC-****1234', code: 'MUST-NEVER-AUTO-DISPLAY', faceValue: '3000.00', balance: '2500.00', reserved: '500.00', issuedAt: '2026-01-01T10:00:00Z', expiresAt: '2090-01-01T10:00:00Z', isActive: true, revision: 4, label: 'Mock card' }];
        window.$fetch = async (url, options) => {
          window.calls.push({ path: url, method: options.method || 'GET', body: options.body, query: options.query });
          if (url === '/gift-cards/product' && !options.method) return window.product;
          if (url === '/gift-cards/product' && options.method === 'PUT') { window.product = options.body; return window.product; }
          if (url === '/gift-cards/generate') return { code: '0123456789ABCDEF0123456789ABCDEF' };
          if (url.endsWith('/reveal')) return { code: 'GC-SECRET1234' };
          if (url.endsWith('/history')) {
            const id = url.split('/')[2];
            const history = id === 'mock-card' ? Array.from({ length: 31 }, (_, index) => ({ id: `mock-operation-${index}`, amount: '100.00', status: ['RESERVED', 'APPLIED', 'RELEASED'][index % 3], createdAt: '2026-01-01T10:00:00Z', appliedAt: index % 3 === 1 ? '2026-01-01T11:00:00Z' : null, releasedAt: index % 3 === 2 ? '2026-01-01T12:00:00Z' : null, orderNumber: `SB-MOCK-${index + 1}`, customerEmail: 'HISTORY-PII-DO-NOT-DISPLAY' })) : [];
            const { page, limit } = options.query;
            return { card: window.rows.find(row => row.id === id), items: history.slice((page - 1) * limit, page * limit), total: history.length, page, limit, code: 'HISTORY-SECRET-DO-NOT-DISPLAY' };
          }
          if (url === '/gift-cards' && !options.method) return { items: window.rows, total: window.rows.length };
          if (url === '/gift-cards' && options.method === 'POST') { window.rows.push({ id: 'mock-new', codeMasked: 'GC-****5678', faceValue: options.body.nominal, balance: options.body.nominal, reserved: 0, issuedAt: '2026-09-16T00:00:00Z', expiresAt: '2090-01-01T00:00:00Z', isActive: true, revision: 1, label: options.body.label }); return { code: 'ISSUANCE-RESPONSE-SECRET' }; }
          if (options.method === 'PATCH') { window.rows = window.rows.map(row => url.endsWith(row.id) ? { ...row, ...options.body, revision: row.revision + 1 } : row); return {}; }
          throw new Error('Unexpected mock request');
        };
        const icons = new Proxy({}, { get: () => Vue.defineComponent({ render() { return Vue.h('svg', { width: 18, height: 18 }); } }) });
        const exports = {};
        new Function('exports', 'require', js)(exports, name => name === 'vue' ? Vue : icons);
        exports.default.render = new Function(`${renderFactory}; return giftRenderFactory;`)()(Vue);
        window.hostProps = Vue.reactive({ apiBase: '/mock-api', token: 'mock-only-token', role: 'ADMIN' });
        Vue.createApp({ render() { return Vue.h(exports.default, { ...window.hostProps }); } }).mount('#app');
      }, { js, renderFactory });

      await page.locator('.sb-gift-form').waitFor();
      if (!await page.evaluate(() => window.calls.length === 1 && window.calls[0].method === 'GET')) throw new Error('Read performed a mutation');
      const nominalInputs = page.locator('.sb-gift-denomination input');
      for (const invalid of ['0', '1000001', '1000.5']) {
        await nominalInputs.nth(1).fill(invalid);
        await page.locator('.sb-gift-form button[type="submit"]').click();
        await page.getByRole('alert').waitFor();
        if (!(await page.getByRole('alert').innerText()).includes('целое число рублей от 1 до 1 000 000')) throw new Error('Unclear nominal range message');
        if (!await page.evaluate(() => window.calls.every(call => call.method === 'GET'))) throw new Error('Invalid nominal saved');
      }
      await nominalInputs.nth(1).fill('1000');
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.getByRole('alert').waitFor();
      if (!await page.evaluate(() => window.calls.every(call => call.method === 'GET'))) throw new Error('Duplicate nominal saved');
      await nominalInputs.nth(1).fill('5000');
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.waitForFunction(() => window.calls.some(call => call.method === 'PUT'));
      const settings = await page.evaluate(() => window.calls.find(call => call.method === 'PUT').body);
      if (settings.denominations.join(',') !== '1000,5000' || settings.validityDays !== 365) throw new Error('Incorrect product parameters');

      await page.locator('.sb-gift-tabs button').nth(1).click();
      await page.locator('.sb-gift-table').waitFor();
      if (await page.evaluate(() => window.calls.some(call => call.path.endsWith('/reveal')))) throw new Error('Automatic secret request');
      if ((await page.locator('body').innerText()).includes('MUST-NEVER-AUTO-DISPLAY')) throw new Error('Raw list code leaked');
      let row = page.locator('tbody tr').filter({ hasText: 'GC-****1234' });
      await row.locator('button').nth(1).click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      if (await page.evaluate(() => window.calls.some(call => call.path.endsWith('/reveal')))) throw new Error('Opening dialog reveals without consent');
      await dialog.locator('footer button').first().click();
      await dialog.locator('code').waitFor();
      if ((await dialog.locator('code').innerText()) !== 'GC-SECRET1234') throw new Error('Reveal failed');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      if ((await page.locator('body').innerText()).includes('GC-SECRET1234')) throw new Error('Secret retained after close');

      const mutationsBeforeHistory = await page.evaluate(() => window.calls.filter(call => call.method !== 'GET').length);
      if (await page.evaluate(() => window.calls.some(call => call.path.endsWith('/history')))) throw new Error('History fetched automatically');
      await row.getByRole('button', { name: 'История карты GC-****1234', exact: true }).click();
      await dialog.locator('.sb-gift-history-list').waitFor();
      if (await dialog.locator('.sb-gift-history-list li').count() !== 30) throw new Error('Incorrect history page size');
      const historyText = await dialog.innerText();
      for (const label of ['История карты', 'SB-MOCK-1', 'Зарезервировано', 'Списано', 'Резерв снят', 'Создано']) if (!historyText.includes(label)) throw new Error(`History field missing: ${label}`);
      if (/HISTORY-PII|HISTORY-SECRET|MUST-NEVER-AUTO-DISPLAY/.test(historyText)) throw new Error('History leaked private fields');
      await dialog.getByRole('button', { name: 'Далее', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.sb-gift-history-list')?.textContent.includes('SB-MOCK-31'));
      if (await dialog.locator('.sb-gift-history-list li').count() !== 1) throw new Error('Incorrect history second page');
      await dialog.getByRole('button', { name: 'Назад', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('.sb-gift-history-list li').length === 30);
      const historyLayout = await dialog.evaluate(element => ({ overflow: element.scrollWidth > element.clientWidth }));
      if (historyLayout.overflow) throw new Error('History dialog horizontal overflow');
      if (await page.evaluate(() => window.calls.filter(call => call.method !== 'GET').length) !== mutationsBeforeHistory) throw new Error('History mutated financial state');
      await dialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });

      await page.locator('.sb-gift-list-head > button').click();
      await page.locator('.sb-gift-form input[type="number"]').fill('1500');
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.getByRole('alert').waitFor();
      if (await page.evaluate(() => window.calls.some(call => call.path === '/gift-cards' && call.method === 'POST'))) throw new Error('Missing reason accepted');
      await page.locator('.sb-gift-form textarea').fill('Mock-only approval reason');
      await page.locator('.sb-gift-form input[type="number"]').fill('1500.5');
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.getByRole('alert').waitFor();
      if (await page.evaluate(() => window.calls.some(call => call.path === '/gift-cards' && call.method === 'POST'))) throw new Error('Fractional nominal accepted');
      await page.locator('.sb-gift-form input[type="number"]').fill('1500');
      await page.locator('.sb-gift-code-input button').click();
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.locator('.sb-gift-form').waitFor({ state: 'hidden' });
      const issuance = await page.evaluate(() => window.calls.find(call => call.path === '/gift-cards' && call.method === 'POST').body);
      if (issuance.nominal !== 1500 || !issuance.reason || issuance.code !== '0123456789ABCDEF0123456789ABCDEF') throw new Error('Incorrect issuance');
      if ((await page.locator('body').innerText()).includes('ISSUANCE-RESPONSE-SECRET')) throw new Error('Issuance response secret leaked');
      await page.getByRole('button', { name: 'История карты GC-****5678', exact: true }).click();
      await dialog.getByText('Операций по карте пока нет.', { exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });

      row = page.locator('tbody tr').filter({ hasText: 'GC-****1234' });
      await row.locator('button').first().click();
      await page.locator('.sb-gift-form input[maxlength="160"]').fill('Mock updated label');
      await page.locator('.sb-gift-form button[type="submit"]').click();
      await page.locator('.sb-gift-form').waitFor({ state: 'hidden' });
      if (!await page.evaluate(() => window.calls.some(call => call.method === 'PATCH' && call.body.revision === 4))) throw new Error('Missing optimistic revision');
      await row.locator('button').last().click();
      await dialog.locator('footer button').first().click();
      await dialog.waitFor({ state: 'hidden' });
      if (await page.evaluate(() => window.calls.some(call => call.method === 'DELETE'))) throw new Error('Financial deletion attempted');
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, lock: document.documentElement.style.overflow, primary: getComputedStyle(document.querySelector('.sb-gift-button:not(.sb-gift-button--white)')).backgroundColor }));
      if (layout.overflow || layout.lock || layout.primary !== 'rgb(21, 21, 21)' || problems.length) throw new Error(JSON.stringify({ width, layout, problems }));
      await row.getByRole('button', { name: 'История карты GC-****1234', exact: true }).click();
      await dialog.locator('.sb-gift-history-list').waitFor();
      for (const role of ['CONTENT_MANAGER', undefined]) {
        await page.evaluate(role => { window.calls = []; window.hostProps.role = role; }, role);
        await page.locator('.sb-gift-denomination').first().waitFor();
        await dialog.waitFor({ state: 'hidden' });
        if (await page.locator('.sb-gift-tabs button').count() !== 1 || await page.locator('.sb-gift-list').count() || await page.getByRole('dialog').count()) throw new Error('Financial UI exposed to non-financial role');
        if (!await page.evaluate(() => window.calls.every(call => call.path === '/gift-cards/product' && call.method === 'GET'))) throw new Error('Financial request by non-financial role');
      }
      console.log(JSON.stringify({ width, mockTests: 'PASS', layout, problems }));
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(caught => { console.error(caught); process.exitCode = 1; });
