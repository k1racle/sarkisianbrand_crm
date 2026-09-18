/* No real credentials/sessions. The optional live CORS probe sends only {}:
 * LoginDto validation rejects it before AuthService and before success audit.
 * All other mutations, private API reads, websockets and external traffic blocked.
 */
const { test, expect } = require('@playwright/test');
const { auditTypography } = require('../../scripts/workspace-typography-audit.cjs');

async function loginContext(browser, width, liveCors = false) {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3001', viewport: { width, height: 960 }, serviceWorkers: 'block' });
  await context.addInitScript(() => {
    window.WebSocket = class { close() {} addEventListener() {} removeEventListener() {} };
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.abort('blockedbyclient');
    if (liveCors && url.pathname === '/api/v1/auth/login' && (request.method() === 'OPTIONS' || (request.method() === 'POST' && request.postData() === '{}'))) return route.continue();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fulfill({ status: 405, json: { message: 'QA writes blocked' } });
    if (url.pathname.startsWith('/api/v1/')) return route.fulfill({ status: 403, json: { message: 'QA private reads blocked' } });
    return route.continue();
  });
  return context;
}

function luminance(rgb) {
  const channels = rgb.map(value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(foreground, background) {
  const first = luminance(foreground), second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

for (const width of [1440, 390]) for (const route of ['/workspace-login', '/b2b-login']) {
  test(`Login theme ${route} ${width}`, async ({ browser }, testInfo) => {
    const context = await loginContext(browser, width);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('form input[type="email"]')).toBeVisible();
      await auditTypography(page, '.workspace-login,.b2b-login');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
      const styles = await page.locator('button.submit').evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
      const rgb = value => value.match(/\d+/g).slice(0, 3).map(Number);
      expect(contrast(rgb(styles.color), rgb(styles.background))).toBeGreaterThanOrEqual(4.5);
      expect(styles.background).not.toBe('rgba(0, 0, 0, 0)');
      if (width > 850) {
        for (const element of await page.locator('.login-brand h2,.login-brand h2 em,.login-brand-kicker,.login-brand-description,.login-brand-note,.login-brand footer').all()) {
          await expect(element).toBeVisible();
          const color = await element.evaluate(el => getComputedStyle(el).color);
          // Brightest dark gradient stop is approximately #35312f.
          expect(contrast(rgb(color), [53, 49, 47]), await element.textContent()).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(errors).toEqual([]);
      await testInfo.attach('visual', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    } finally { await context.close(); }
  });
}

// Explicit opt-in: default visual tests remain fixture-only for private API.
// This probe needs the local backend with exact loopback CORS configuration.
for (const origin of ['http://localhost:3001', 'http://127.0.0.1:3001']) {
  test(`Local login CORS ${origin}`, async ({ browser }) => {
    test.skip(process.env.PLAYWRIGHT_LOCAL_LOGIN_CORS !== 'true', 'Enable the empty-body, local-only API diagnostic explicitly.');
    const context = await loginContext(browser, 390, true);
    try {
      const page = await context.newPage();
      await page.goto(origin + '/workspace-login', { waitUntil: 'networkidle' });
      const response = await page.evaluate(async () => {
        const result = await fetch('http://localhost:3000/api/v1/auth/login', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) });
        return { status: result.status, body: await result.json() };
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(expect.any(Array));
    } finally { await context.close(); }
  });
}
