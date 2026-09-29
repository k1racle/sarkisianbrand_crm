// Supplied-vector pixel checks + isolated menu UI + guest-only real PWA/offline test.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures } = require('./crm-rich-fixtures.cjs');
const origin = 'http://127.0.0.1:3001', folder = path.resolve(__dirname, '../public/crm/pwa');
const output = path.resolve(__dirname, '../.screenshots/crm-brand');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs'));
  try {
    const page = await browser.newPage();
    for (const [name, size, opaque] of [['icon-180.png', 180, true], ['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
      const pixels = await page.evaluate(async ({ data, size }) => {
        const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        const values = ctx.getImageData(0, 0, size, size).data;
        let whiteCount = 0, whiteRadius = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          if (values[i] > 245 && values[i + 1] > 245 && values[i + 2] > 245 && values[i + 3] > 245) { whiteCount++; whiteRadius = Math.max(whiteRadius, Math.hypot(x + .5 - size / 2, y + .5 - size / 2)); }
        }
        const at = (x, y) => [...values.slice((y * size + x) * 4, (y * size + x) * 4 + 4)];
        return { width: image.naturalWidth, height: image.naturalHeight, corners: [at(0, 0), at(size - 1, 0), at(0, size - 1), at(size - 1, size - 1)], edge: at(2, size / 2), whiteCount, whiteRadius };
      }, { data: fs.readFileSync(path.join(folder, name)).toString('base64'), size });
      assert.equal(pixels.width, size); assert.equal(pixels.height, size);
      for (const corner of pixels.corners) assert.deepEqual(corner, opaque ? [0, 0, 0, 255] : [0, 0, 0, 0], `${name}: no white outer canvas`);
      assert.deepEqual(pixels.edge, [0, 0, 0, 255], `${name}: no padded outer margin`);
      assert.ok(pixels.whiteCount > 500, 'White logo details remain');
      if (name.includes('maskable')) assert.ok(pixels.whiteRadius <= size * .4, 'Logo is inside the maskable safe circle');
    }
    await page.close();
    if (process.argv.includes('--pixels-only')) { console.log('PASS: four icon dimensions, transparency and maskable safe zone'); return; }
    for (const width of [390, 1440]) {
      const f = await isolatedContext(browser, width, false, false, { fixtures });
      try {
        await f.page.goto(`${origin}/crm`, { waitUntil: 'networkidle' });
        const logo = f.page.locator(width === 390 ? '.crm-mobile-brand img' : '.crm-brand-mark');
        assert.equal(await logo.getAttribute('src'), '/crm/pwa/icon.svg?v=brand2');
        assert.ok(await logo.evaluate(img => img.complete && img.naturalWidth > 0));
        assert.equal(await f.page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href'), '/crm/pwa/icon.svg?v=brand2');
        await f.page.screenshot({ path: path.join(output, `${width}-menu.png`) });
        assert.deepEqual(f.errors, []); for (const key of ['unknownReads', 'prohibitedWrites', 'externalRequests', 'credentialLeaks']) assert.deepEqual(f.traffic[key], []);
      } finally { await f.context.close(); }
    }
    await browser.close();
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sarkisian-crm-brand-'));
    const pwa = await chromium.launchPersistentContext(profile, { ...require('./crm-test-browser.cjs'), viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    try {
      const unexpected = [];
      await pwa.route('**/*', route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin !== origin || url.pathname.includes('/api/') || req.method() !== 'GET') { unexpected.push(url.pathname); return route.abort(); }
        return route.continue();
      });
      const p = await pwa.newPage();
      await p.goto(`${origin}/crm/tasks`); await p.waitForURL(url => url.pathname === '/crm/login');
      await p.evaluate(() => navigator.serviceWorker.ready);
      const manifest = await (await pwa.request.get(`${origin}/crm/manifest.webmanifest`)).json();
      assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable' && icon.src.includes('icon-maskable-512')));
      for (const icon of manifest.icons) assert.equal((await pwa.request.get(origin + icon.src)).status(), 200);
      const cdp = await pwa.newCDPSession(p); await cdp.send('Page.enable');
      assert.deepEqual((await cdp.send('Page.getAppManifest')).errors, []);
      assert.deepEqual((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors, []);
      await p.screenshot({ path: path.join(output, 'pwa-login.png') });
      await pwa.setOffline(true); await p.goto(`${origin}/crm/tasks`);
      await p.getByRole('heading', { name: 'Вы временно не в сети' }).waitFor();
      assert.ok(await p.locator('main img').evaluate(img => img.complete && img.naturalWidth > 0));
      const cache = await p.evaluate(async () => ({ keys: await caches.keys(), urls: (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(req => new URL(req.url).pathname)))).flat() }));
      assert.ok(cache.keys.includes('sarkisian-crm-public-v4-brand2')); assert.ok(cache.urls.every(url => url.startsWith('/crm/pwa/')));
      await p.screenshot({ path: path.join(output, 'pwa-offline.png') });
      assert.deepEqual(unexpected, []);
    } finally {
      await pwa.close();
      assert.equal(path.dirname(path.resolve(profile)), path.resolve(os.tmpdir()));
      assert.ok(path.basename(profile).startsWith('sarkisian-crm-brand-'));
      fs.rmSync(profile, { recursive: true, force: true });
    }
    console.log('PASS: 4 icon exports/transparency/safe zone; desktop/mobile menu + favicon; installability, real public-only service worker and offline icon');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
