/* Three actual built screens; all private API data are fixtures, writes blocked. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../.screenshots/workspace-studio');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) for (const [name, url, selector] of [
      ['overview', '/workspace', '.wo-metrics'],
      ['orders', '/admin-workspace?section=orders&status=NEW', '.studio-orders'],
      ['content', '/admin-workspace?section=site-content', '.studio-content-fields'],
    ]) {
      const f = await isolatedContext(b, width, false);
      try {
        await f.page.goto('http://127.0.0.1:3001' + url, { waitUntil: 'domcontentloaded' });
        await f.page.locator(selector).waitFor(); await f.page.evaluate(() => document.fonts.ready);
        assert.equal(await f.page.locator('.studio-area-switch option').count(), 4);
        if (name === 'orders') assert.equal(await f.page.locator('.studio-order-filter select').inputValue(), 'NEW');
        if (name === 'content') {
          assert.equal(await f.page.locator('.studio-block-select').count(), 7);
          if (width < 800) await f.page.getByLabel('Выбрать блок главной', { exact: true }).selectOption('benefits');
          else await f.page.locator('.studio-block-select').last().click();
          assert.equal(await f.page.locator('.studio-content-fields').count(), 1);
        }
        const state = await f.page.evaluate(() => {
          const input = document.querySelector('.studio-order-search input');
          const s = input ? getComputedStyle(input) : null;
          return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, input: s ? { borderWidth: s.borderWidth, radius: s.borderRadius, height: s.height } : null };
        });
        assert.ok(state.pageWidth <= width + 2, 'Page must not overflow viewport');
        if (name === 'orders') { assert.equal(state.input.borderWidth, '0px'); assert.equal(state.input.radius, '0px'); }
        await f.page.evaluate(() => { window.scrollTo(0, 0); const nav = document.querySelector('.console-rail nav'); if (nav) nav.scrollTop = 0; });
        await f.page.screenshot({ path: path.join(output, `${width}-${name}.png`), fullPage: true });
        for (const key of ['unknownReads', 'externalRequests', 'prohibitedWrites', 'credentialLeaks']) assert.equal(f.traffic[key].length, 0, key);
        assert.deepEqual(f.errors, []);
        results.push({ name, width, passed: true, state });
      } catch (error) { results.push({ name, width, passed: false, message: error.message, errors: f.errors, traffic: f.traffic }); }
      finally { await f.context.close(); }
    }
  } finally { await b.close(); }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ actualApiWrites: 0, integrationTests: false, results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
  if (results.some(item => !item.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
