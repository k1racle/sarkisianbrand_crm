/* Read-only real catalog + isolated cart mutations. Run on the local Docker
   network with NODE_PATH=/checks/node_modules and Chromium available. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const api = process.env.API_URL || 'http://backend:3000/api/v1';
const output = process.env.OUTPUT || '/evidence/home-figma';
const origin = 'http://127.0.0.1:3001';
fs.mkdirSync(output, { recursive: true });
const proxy = http.createServer((req, res) => {
  const upstream = http.request({ hostname: process.env.FRONTEND_HOST || 'frontend', port: 3000, path: req.url, method: req.method, headers: { ...req.headers, host: '127.0.0.1:3001' } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
  upstream.on('error', error => { res.writeHead(502); res.end(error.message); });
  req.pipe(upstream);
});
async function main() {
  await new Promise(resolve => proxy.listen(3001, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const reports = [];
  try {
    for (const width of (process.env.WIDTHS || '1512,1088,768,390,320').split(',').map(Number)) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      const errors = [], mutations = [];
      let cart = { items: [], total: 0, subtotal: 0 };
      let addedVariant;
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.pathname.startsWith('/api/v1/')) {
          const endpoint = url.pathname.slice('/api/v1'.length), headers = { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
          if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
          if (endpoint === '/cart' && request.method() === 'GET') return route.fulfill({ headers, json: cart });
          if (endpoint === '/cart/items' && request.method() === 'POST') {
            addedVariant = request.postDataJSON().variantId;
            const response = await fetch(api + '/products?limit=8&sort=popular');
            const { items } = await response.json();
            const product = items.find(p => p.variants.some(v => v.id === addedVariant));
            assert.ok(product, 'Cart must use a real catalog variant');
            const variant = product.variants.find(v => v.id === addedVariant);
            cart = { items: [{ id: 'home-visual-cart', quantity: 1, variant: { ...variant, product } }], subtotal: Number(variant.price), total: Number(variant.price) };
            return route.fulfill({ headers, json: cart });
          }
          if (!['GET', 'HEAD'].includes(request.method())) { mutations.push(endpoint); return route.fulfill({ status: 405, headers, json: { message: 'Read-only audit' } }); }
          const response = await fetch(api + endpoint + url.search);
          return route.fulfill({ status: response.status, headers: { ...headers, 'content-type': response.headers.get('content-type') || 'application/json' }, body: Buffer.from(await response.arrayBuffer()) });
        }
        if (url.origin !== origin) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (/hydration.*mismatch/i.test(message.text())) errors.push(message.text()); });
      await page.goto(origin, { waitUntil: 'networkidle' });
      if (process.env.PREVIEW_CSS) await page.addStyleTag({ content: fs.readFileSync('/workspace/assets/css/site-home.css', 'utf8') });
      await page.evaluate(() => document.fonts.ready);
      for (const section of await page.locator('.sb-home main > section,.sh-footer').all()) { await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(80); }
      await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.complete ? null : new Promise(resolve => { img.onload = img.onerror = resolve; }))); window.scrollTo(0, 0); });
      await page.waitForTimeout(900);
      const audit = await page.evaluate(() => ({
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        h1: document.querySelectorAll('h1').length,
        sections: [...document.querySelectorAll('.sb-home main > section')].map(el => ({ class: el.className, height: Math.round(el.getBoundingClientRect().height) })),
        images: [...document.querySelectorAll('.sb-home img')].map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, width: parseFloat(getComputedStyle(img).width), height: parseFloat(getComputedStyle(img).height), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })),
        products: [...document.querySelectorAll('.sh-product')].map(el => ({ name: el.querySelector('h3').textContent.trim(), href: el.querySelector('a').getAttribute('href'), price: el.querySelector('.sh-product-price').textContent.trim() })),
      }));
      assert.ok(audit.scrollWidth <= width + 1, `Overflow ${width}: ${audit.scrollWidth}`);
      assert.equal(audit.h1, 1);
      assert.ok(audit.products.length, 'Real products render');
      assert.ok(audit.images.every(img => img.loaded), 'All assets load');
      for (const img of audit.images.filter(img => /home\/(?:hero-wordmark|footer-wordmark|club-wordmark|referral-title|svetlana-)/.test(img.src))) assert.ok(Math.abs((img.width / img.height) / (img.naturalWidth / img.naturalHeight) - 1) < .02, `Asset aspect ratio: ${JSON.stringify(img)}`);
      await page.screenshot({ path: path.join(output, `${width}-home.png`), fullPage: true });
      await page.locator('.sh-navigation').screenshot({ path: path.join(output, `${width}-navigation.png`) });
      for (const selector of ['.sh-hero', '.sh-products', '.sh-bloggers', '.sh-footer']) await page.locator(selector).screenshot({ path: path.join(output, `${width}-${selector.slice(1)}.png`) });
      if (width < 761) await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
      assert.equal(await page.locator('#home-navigation').getByRole('link', { name: 'Онлайн запись' }).getAttribute('href'), '/business');
      await page.locator('#home-navigation').getByRole('button', { name: 'Курсы', exact: true }).click();
      await page.getByText('Обучающие программы появятся здесь позже.').waitFor();
      await page.getByRole('button', { name: 'Закрыть информацию о курсах' }).click();
      await page.locator('#home-navigation').getByRole('button', { name: 'Личный кабинет', exact: true }).click();
      await page.locator('.sb-auth-drawer').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.sb-auth-drawer').waitFor({ state: 'hidden' });
      if (width < 761) await page.getByRole('button', { name: 'Закрыть меню', exact: true }).click();
      await page.getByRole('button', { name: 'Вступить в клуб', exact: true }).click();
      await page.locator('.sb-auth-drawer input[autocomplete="given-name"]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.sb-auth-drawer').waitFor({ state: 'hidden' });
      await page.locator('.sh-product-buy:not([disabled])').first().click();
      await page.getByRole('button', { name: 'Добавлено', exact: true }).waitFor();
      assert.ok(addedVariant, 'Add to cart is wired');
      await page.locator('.sh-dock').getByRole('button', { name: 'Корзина', exact: true }).click();
      await page.locator('.sb-cart-drawer').waitFor();
      await page.locator('.sb-cart-drawer').getByText(audit.products[0].name, { exact: true }).first().waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.sb-cart-drawer').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '', 'Scroll restored');
      // Footer geometry: second logo and contacts share the same vertical axis.
      if (width > 760) {
        const geometry = await page.evaluate(() => {
          const x = selector => document.querySelector(selector).getBoundingClientRect().x;
          const top = el => el.getBoundingClientRect().top;
          const items = [...document.querySelectorAll('.sh-navigation-links > *')];
          const textTop = el => { const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node; while (node = walker.nextNode()) { if (node.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().top; } } };
          return { logo: x('.sh-footer-wordmark'), contacts: x('.sh-footer-contacts'), nav: items.map(top), text: items.map(textTop) };
        });
        assert.ok(Math.abs(geometry.logo - geometry.contacts) < 2, 'Footer contact/logo alignment');
        assert.ok(Math.max(...geometry.nav) - Math.min(...geometry.nav) < 2, 'Navigation items align at top');
        assert.ok(Math.max(...geometry.text) - Math.min(...geometry.text) < 2, 'Navigation text aligns at top, including buttons');
        const positions = await page.evaluate(() => {
          const box = document.querySelector('.sh-navigation').getBoundingClientRect();
          return [...document.querySelectorAll('.sh-navigation-links > *')].map(el => (el.getBoundingClientRect().left - box.left) / box.width);
        });
        [0,.172,.3005,.4285,.547,.7045,.834].forEach((expected, index) => assert.ok(Math.abs(expected - positions[index]) < .002, `Figma navigation column ${index}`));
      }
      const rubPrice = await page.locator('.sh-product-price').first().evaluate(el => Number([...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').replace(/[^\d,.-]/g, '').replace(',', '.')));
      // All regions use the real RUB price; only the indicative display changes.
      await page.route('**/api/storefront/exchange-rates', route => route.fulfill({ json: { date: '2026-10-10', rates: { RUB: 1, USD: 80, EUR: 100, AED: 20 } } }));
      for (const [label, currency] of [['English · $', '$'], ['UAE · AED', 'AED'], ['Europe · €', '€']]) {
        await page.locator('.sh-language').click();
        await page.getByRole('menuitemradio', { name: label, exact: true }).click();
        await page.locator('.sh-product-buy:not([disabled])').first().getByText('Add to cart', { exact: true }).waitFor();
        await page.waitForFunction(symbol => document.querySelector('.sh-product-price').textContent.includes(symbol), currency);
        const rate = currency === '$' ? 80 : currency === 'AED' ? 20 : 100;
        assert.ok((await page.locator('.sh-product-price').first().textContent()).includes((rubPrice / rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })), 'Indicative conversion uses the product price');
        assert.ok(await page.locator('.sh-products-currency').textContent().then(text => text.includes('Checkout is in RUB')));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Translated layout fits');
      }
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('.sh-product-price').textContent.includes('€'));
      assert.ok((await page.locator('.sh-language').getAttribute('aria-label')).includes('Europe'));
      await page.locator('.sh-language').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.sh-language').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('.sh-language').evaluate(el => el === document.activeElement), true);
      await page.locator('.sh-language').click();
      await page.getByRole('menuitemradio', { name: 'Россия · ₽', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.sh-product-price').textContent.includes('₽'));
      // Reduced-motion users keep all content visible with no decorative movement.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      assert.ok(await page.locator('.sh-lava span').evaluateAll(items => items.every(el => getComputedStyle(el).animationName === 'none')));
      assert.ok(await page.locator('.sh-reveal').evaluateAll(items => items.every(el => getComputedStyle(el).opacity === '1')));
      if (width === 1512) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const productImage = page.locator('.sh-product-image').filter({ has: page.locator('img') }).first();
        await productImage.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        await page.waitForTimeout(800);
        const before = await productImage.boundingBox();
        await productImage.hover();
        await page.waitForTimeout(750);
        const after = await productImage.boundingBox();
        for (const key of ['width', 'height', 'x', 'y']) assert.ok(Math.abs(before[key] - after[key]) < 1, 'Product frame stays still');
        assert.notEqual(await productImage.locator('img').evaluate(el => getComputedStyle(el).transform), 'none', 'Only the product rotates');
        assert.equal(await productImage.evaluate(el => getComputedStyle(el).cursor), 'none', 'Native cursor hidden');
        assert.equal(await page.locator('.sh-cursor-dot').evaluate(el => getComputedStyle(el).opacity), '1', 'Custom cursor visible');
        await productImage.screenshot({ path: path.join(output, 'product-hover.png') });
        const button = page.locator('.sh-products-outro .sh-pill');
        await button.hover();
        await page.waitForTimeout(750);
        const fill = await button.evaluate(el => ({ transform: getComputedStyle(el, '::before').transform, shadow: getComputedStyle(el).boxShadow }));
        assert.equal(fill.transform, 'matrix(1, 0, 0, 1, 0, 0)', 'Liquid fill completes from below');
        assert.equal(fill.shadow, 'none', 'Buttons have no orange outline glow');
        await button.screenshot({ path: path.join(output, 'button-hover.png') });
        const chip = page.locator('.sh-orbit-payment');
        await chip.hover(); await page.waitForTimeout(500);
        assert.ok(Number(await chip.evaluate(el => getComputedStyle(el).scale)) > 1, 'Blogger chip zooms');
        await page.locator('.sh-orbit').screenshot({ path: path.join(output, 'blogger-hover.png') });
        const first = await page.locator('.sh-lava span').first().evaluate(el => getComputedStyle(el).transform);
        await page.waitForTimeout(400);
        assert.notEqual(await page.locator('.sh-lava span').first().evaluate(el => getComputedStyle(el).transform), first, 'Lava background moves');
        await page.locator('.sh-dock').getByRole('button', { name: 'Личный кабинет', exact: true }).click();
        await page.locator('.sb-auth-drawer').waitFor();
        await page.locator('.sb-auth-drawer input').first().hover();
        assert.equal(await page.locator('.sb-auth-drawer input').first().evaluate(el => getComputedStyle(el).cursor), 'none');
        assert.equal(await page.locator('.sh-cursor-dot').evaluate(el => el.parentElement === document.body), true, 'Cursor appears above teleported panels');
        await page.keyboard.press('Escape');
        await page.locator('.sb-auth-drawer').waitFor({ state: 'hidden' });
        await page.locator('.sh-products-outro .sh-pill').click();
        await page.waitForURL('**/catalog');
        assert.equal(await page.locator('body').evaluate(el => el.classList.contains('sh-custom-cursor')), false, 'Normal cursor returns outside homepage');
        assert.equal(await page.locator('.sh-cursor-dot').count(), 0);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      reports.push({ ...audit, errors, mutations, interactions: 'navigation, courses, account, registration, cart, locale/currency persistence, Escape, reduced motion PASS' });
      fs.writeFileSync(path.join(output, 'audit.json'), JSON.stringify(reports, null, 2));
      console.log(`${width}: assets, responsive layout, real products and isolated shopping interactions PASS`);
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => proxy.close(resolve)); }
}
main().catch(error => { console.error(error); proxy.close(); process.exitCode = 1; });
