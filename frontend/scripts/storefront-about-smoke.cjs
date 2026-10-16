/* About-page visual/interaction checks. Public reads and isolated CMS fixtures only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

async function checkAbout(browser, width, options = {}) {
  const base = options.base || process.env.STOREFRONT_URL || 'http://localhost:3001';
  const api = options.api || process.env.API_URL || 'http://backend:3000/api/v1';
  const output = options.output || process.env.OUTPUT || path.join(__dirname, '../.screenshots/about');
  fs.mkdirSync(output, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height: 980 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = [], writes = [], hydration = [];
  let fixture;
  await context.route('**/api/v1/**', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.slice(7);
    const headers = { 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (req.method() !== 'GET') { writes.push(`${req.method()} ${endpoint}`); return route.fulfill({ status: 405, headers, json: {} }); }
    if (endpoint === '/cart') return route.fulfill({ headers, json: { items: [], total: 0 } });
    if (endpoint === '/storefront/favorites') return route.fulfill({ headers, json: [] });
    if (endpoint === '/products/storefront-pages/about' && fixture) return route.fulfill({ headers, json: fixture });
    const response = await fetch(api + endpoint + url.search);
    return route.fulfill({ status: response.status, headers, body: Buffer.from(await response.arrayBuffer()) });
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (/hydration.*mismatch/i.test(msg.text())) hydration.push(msg.text()); });
  page.setDefaultTimeout(15000);
  const ready = async () => {
    await page.locator('.sa-page').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.sa-page img,.sh-footer img').evaluateAll(imgs => Promise.all(imgs.map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
  };
  const layout = async () => {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: no horizontal overflow`);
    const badImages = await page.locator('.sb-about img').evaluateAll(imgs => imgs.filter(img => !img.complete || !img.naturalWidth).map(img => img.src));
    assert.deepEqual(badImages, [], 'Every visible asset loads');
    const title = await page.locator('.sa-founder-stage h2').boundingBox();
    const stage = await page.locator('.sa-founder-stage').boundingBox();
    assert.ok(Math.abs(title.y - stage.y) < 1, 'Founder name stays anchored to its section');
    const portrait = await page.locator('.sa-founder-portrait').boundingBox();
    assert.ok(Math.abs(portrait.width / portrait.height - 853 / 1280) < .001, 'Portrait keeps its original aspect ratio');
  };
  try {
    const response = await page.goto(`${base}/about`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await ready();
    await layout();
    assert.equal(await page.locator('main h1').count(), 1);
    assert.equal(await page.locator('.sa-values .sa-value').count(), 4);
    assert.equal(await page.locator('.sa-founder-portrait').getAttribute('src'), '/storefront/home/svetlana-hero.png');
    assert.equal(await page.locator('.sa-founder-socials a').count(), 3);
    assert.equal(await page.locator('.sa-founder-socials a').filter({ hasText: 'Telegram' }).getAttribute('href'), 'https://t.me/sarkisian_sv');
    assert.equal(await page.locator('.sa-founder-footer .sb-design-button').getAttribute('href'), '/catalog');
    assert.ok(await page.locator('.sh-navigation a[href="/about"]').count());
    assert.ok(await page.locator('.sh-footer a[href="/about"]').count());
    if (width === 1512) {
      const intro = await page.locator('.sa-intro-media').boundingBox();
      assert.ok(Math.abs(intro.x - 50) < 2 && Math.abs(intro.y - 974) < 2, 'Intro matches the SVG layout');
      assert.ok(Math.abs(intro.width - 433) < 2 && Math.abs(intro.height - 501) < 2, 'Grey media slot matches the SVG');
      const founder = await page.locator('.sa-founder-stage').boundingBox();
      assert.ok(Math.abs(founder.y - 1635) < 2, 'Vertical label does not push the founder section down');
    }
    await page.screenshot({ path: path.join(output, `${width}-about.png`), fullPage: true });
    await page.locator('.sa-founder').screenshot({ path: path.join(output, `${width}-founder.png`) });
    const action = page.locator('.sa-founder-footer .sb-design-button');
    await action.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    const rest = await action.evaluate(el => {
      const s = getComputedStyle(el, '::before');
      return { top: parseFloat(s.top) + new DOMMatrix(s.transform).f, height: el.clientHeight, color: getComputedStyle(el).color };
    });
    assert.ok(rest.top >= rest.height, 'No fill protrudes when the button is at rest');
    assert.equal(rest.color, 'rgb(255, 255, 255)');
    await action.hover();
    assert.equal(await action.evaluate(el => getComputedStyle(el, '::before').transform), 'matrix(1, 0, 0, 1, 0, 0)');
    assert.equal(await action.evaluate(el => getComputedStyle(el).color), 'rgb(52, 52, 51)');

    for (const label of ['Корзина', 'Личный кабинет']) {
      const trigger = page.locator('.sh-dock').getByRole('button', { name: label, exact: true });
      await trigger.click();
      await page.locator('.sd-drawer').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.sd-drawer').waitFor({ state: 'hidden' });
      assert.equal(await trigger.evaluate(el => document.activeElement === el), true, 'Focus returns after closing a panel');
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
    }
    if (width === 1512 || width === 390) {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.locator('.sa-founder-summary').scrollIntoViewIfNeeded();
        await page.reload({ waitUntil: 'networkidle' });
        await ready();
        await layout();
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
    }
    if (width === 1512) {
      // Client navigation proves existing CMS content remains editable without database writes.
      fixture = await (await fetch(`${api}/products/storefront-pages/about`)).json();
      fixture.title = 'Материалы с характером. Для ежедневной работы.';
      fixture.lead = 'Редактируемый текст о бренде из CMS.';
      const bio = fixture.blocks.find(block => block.kind === 'biography');
      bio.body = 'Первый абзац из редактора.\nНовый текст об опыте основательницы.\nТретий абзац из редактора.';
      bio.images = ['/storefront/home/svetlana-founder.png'];
      fixture.blocks.find(block => block.id === 'philosophy').title = 'Новый заголовок из CMS';
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.sh-navigation a[href="/about"]').click();
      await ready();
      assert.match(await page.locator('.sa-intro-copy').textContent(), /Редактируемый текст/);
      assert.match(await page.locator('.sa-founder-copy-left').textContent(), /Первый абзац из редактора/);
      assert.equal(await page.locator('.sa-founder-portrait').getAttribute('src'), bio.images[0]);
      assert.equal(await page.locator('#philosophy h2').textContent(), 'Новый заголовок из CMS');
      assert.equal(await page.locator('.sa-page').count(), 1);
      fixture = undefined;
      await context.addCookies([{ name: 'sb-home-region', value: 'en', url: base }]);
      await page.goto(`${base}/about`, { waitUntil: 'networkidle' });
      await ready();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.match(await page.locator('.sa-intro-copy h2').textContent(), /Created by a professional/);
      assert.equal(await page.locator('.sa-values h2').first().textContent(), 'We know the craft from the inside');
      await layout();
    }
    assert.deepEqual(errors, [], 'No browser errors');
    assert.deepEqual(hydration, [], 'No hydration mismatch');
    assert.deepEqual(writes, [], 'No live data changed');
    console.log(`${width}: about assets/layout, links, buttons, panels, reload and CMS checks PASS`);
  } finally { await context.close(); }
}
module.exports = { checkAbout };
if (require.main === module) (async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try { for (const width of (process.env.WIDTHS || '1512,1024,768,390,320').split(',').map(Number)) await checkAbout(browser, width); }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
