/* Actual local homepage interaction, with private reads and all writes blocked. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const site = 'http://localhost:3001';
const state = element => ({ x: parseFloat(element.style.getPropertyValue('--sb-card-tilt-x')) || 0, y: parseFloat(element.style.getPropertyValue('--sb-card-tilt-y')) || 0, active: element.classList.contains('is-card-tilting'), transform: getComputedStyle(element).transform, duration: getComputedStyle(element).transitionDuration });

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const checks = [];
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, isMobile: width < 761, hasTouch: width < 761, serviceWorkers: 'block', reducedMotion: 'no-preference' });
      const errors = [], mutations = [];
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { mutations.push(url.pathname); return route.fulfill({ status: 501, json: { message: 'Read only' } }); }
        if (url.pathname.startsWith('/api/v1/')) {
          if (['/api/v1/products', '/api/v1/products/storefront-content'].includes(url.pathname)) return route.continue();
          if (url.pathname === '/api/v1/cart') return route.fulfill({ json: { items: [], total: 0 } });
          return route.fulfill({ status: 401, json: { message: 'No private reads' } });
        }
        if (url.origin !== site) return route.abort('blockedbyclient');
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(site + '/', { waitUntil: 'networkidle' });
      const card = page.locator('.sb-club-banner__card.sb-card-tilt');
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      if (width > 760) {
        const bounds = await card.boundingBox();
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.move(bounds.x + bounds.width * .85, bounds.y + bounds.height * .2);
        await page.waitForTimeout(300);
        const moved = await card.evaluate(state);
        assert(moved.active && Math.abs(moved.x) > .5 && Math.abs(moved.y) > .5);
        assert(Math.abs(moved.x) <= 3 && Math.abs(moved.y) <= 3);
        assert(moved.transform.startsWith('matrix3d('));
        await page.mouse.move(1, 1); await page.waitForTimeout(750);
        const neutral = await card.evaluate(state);
        assert.equal(neutral.x, 0); assert.equal(neutral.y, 0); assert.equal(neutral.active, false);
        assert.equal(neutral.duration, '0.65s');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await card.hover(); await page.waitForTimeout(100);
        const reduced = await card.evaluate(state);
        assert.equal(reduced.x, 0); assert.equal(reduced.y, 0); assert.equal(reduced.active, false);
        checks.push({ width, passed: true, maxDegrees: 3, mouseFollow: true, smoothReset: true, reducedDisabled: true });
      } else {
        await card.tap();
        const touch = await card.evaluate(state);
        assert.equal(touch.x, 0); assert.equal(touch.y, 0); assert.equal(touch.active, false);
        checks.push({ width, passed: true, touchDisabled: true });
      }
      assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ checks, actualPrivateReads: 0, actualMutations: 0, actualProviderCalls: 0 }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
