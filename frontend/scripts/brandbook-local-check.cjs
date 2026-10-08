// Read-only visual acceptance against the local Docker stack. Only login creates a session.
// Run with .env.local, playwright-core and BRAND_EVIDENCE pointing to an ignored output folder.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LOCAL_SITE_URL, out = process.env.BRAND_EVIDENCE || '/evidence';
assert.ok(base && /^(localhost|127\.0\.0\.1|192\.168\.[\d.]+|10\.[\d.]+)$/.test(new URL(base).hostname), 'Use a local stack');
const routes = ['/crm', '/crm/customers', '/crm/organizations', '/crm/tasks', '/crm/inventory', '/crm/b2b-orders', '/crm/content-plan', '/crm/gift-cards', '/crm/loyalty/settings', '/crm/settings/integrations', '/crm/reports/overview', '/crm/support/knowledge', '/', '/catalog', '/admin-workspace'];
const captures = new Set(['/crm', '/crm/loyalty/settings', '/', '/catalog']);
function luminance(rgb) { return rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CRM_BROWSER || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const errors = [], report = [], fontResponses = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().includes('/fonts/')) fontResponses.push({ file: new URL(r.url()).pathname, status: r.status() }); });
    async function ready() { await page.waitForTimeout(350); await page.evaluate(() => document.fonts.ready); }
    async function capture(name) { await page.screenshot({ path: path.join(out, `brand-${name}-${page.viewportSize().width}.png`) }); }
    async function inspect(route, root = 'body') {
      await ready();
      const state = await page.locator(root).evaluate(container => {
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        const describe = e => { const s = getComputedStyle(e); return { font: s.fontFamily, weight: s.fontWeight, color: s.color, bg: s.backgroundColor }; };
        const h = [...container.querySelectorAll('h1,h2')].find(visible);
        const controls = [...container.querySelectorAll('button,input,select,textarea')].filter(visible).map(describe);
        const primary = [...container.querySelectorAll('.crm-button--primary:not(:disabled),.crm-primary-button:not(:disabled),.sb-primary,.submit:not(:disabled)')].filter(visible).map(describe);
        const s = getComputedStyle(document.documentElement);
        return { overflow: document.documentElement.scrollWidth - innerWidth, heading: h && describe(h), controls, primary, graphite: s.getPropertyValue('--brand-graphite').trim(), success: s.getPropertyValue('--crm-success').trim(), danger: s.getPropertyValue('--crm-danger').trim() };
      });
      assert.ok(state.overflow <= 1, `${route}: page overflow ${state.overflow}`);
      assert.equal(state.graphite, '#3c3c3b');
      if (state.heading) { assert.match(state.heading.font, /^Mont,/); assert.equal(state.heading.weight, '700'); }
      for (const control of state.controls) assert.match(control.font, /^Montserrat,/, route + ': control font');
      for (const control of state.primary) if (control.bg !== 'rgba(0, 0, 0, 0)') assert.ok(contrast(control.color, control.bg) >= 4.5, route + ': button contrast');
      if (route.startsWith('/crm')) { assert.equal(state.success, '#237450'); assert.equal(state.danger, '#ac324e'); }
      report.push({ route, width: page.viewportSize().width, ...state });
    }
    async function login(b2b = false) {
      await page.goto(base + (b2b ? '/b2b-login' : '/crm/login'));
      await page.locator('input[type=email]').fill(process.env[b2b ? 'LOCAL_B2B_EMAIL' : 'LOCAL_ADMIN_EMAIL']);
      await page.locator('input[type=password]').fill(process.env[b2b ? 'LOCAL_B2B_PASSWORD' : 'LOCAL_ADMIN_PASSWORD']);
      await page.locator('button[type=submit]').click();
      await page.waitForURL(u => u.pathname.replace(/\/$/, '') === (b2b ? '/b2b' : '/crm'));
    }
    await login();
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        await page.goto(base + route); await page.locator('h1').first().waitFor(); await inspect(route);
        if (captures.has(route)) await capture(route.replaceAll('/', '-') || 'home');
      }
      await page.goto(base + '/crm');
      await page.getByRole('button', { name: 'Открыть чат команды', exact: true }).click();
      await page.getByRole('dialog', { name: 'Сообщения', exact: true }).waitFor(); await inspect('/crm/chat', '.crm-messenger'); await capture('chat');
      await page.locator('button[aria-label="Закрыть чат"]:visible').first().click();
      await page.getByRole('button', { name: 'Уведомления', exact: true }).click();
      await page.locator('.crm-notifications-panel').waitFor(); await inspect('/crm/notifications', '.crm-notifications-panel'); await capture('notifications');
      await page.getByRole('button', { name: 'Закрыть уведомления' }).click();
    }
    // The rendered Cyrillic title must actually use the downloaded Bold, not a fallback.
    const cdp = await context.newCDPSession(page); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument'); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    assert.ok(fonts.some(f => f.isCustomFont && /Mont-Bold/.test(f.postScriptName) && f.glyphCount > 0), JSON.stringify(fonts));
    await login(true);
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ['purchases', 'catalog', 'orders']) {
        await page.goto(base + '/b2b?section=' + section); await page.locator('.b2b-frame').waitFor(); await inspect('/b2b/' + section); await capture('b2b-' + section);
      }
    }
    assert.ok(fontResponses.some(f => f.file.endsWith('Mont-Regular.woff2') && f.status === 200));
    assert.ok(fontResponses.some(f => f.file.endsWith('Mont-Bold.woff2') && f.status === 200));
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'brandbook-acceptance.json'), JSON.stringify({ report, errors, fonts, fontResponses }, null, 2));
    console.log(`PASS: ${report.length} desktop/mobile screens incl. chat, notifications and B2B; no overflow; Mont/Montserrat roles; Cyrillic Mont Bold rendered; primary contrast >= 4.5; status colours preserved; no browser errors`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
