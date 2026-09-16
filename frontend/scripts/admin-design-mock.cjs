/* Read-only admin design QA against an already-built local frontend.
 * Run ONLY when the parent authorizes the sequential browser check:
 *   node frontend/scripts/admin-design-mock.cjs
 * ADMIN_DESIGN_URL=http://127.0.0.1:3001 is optional; loopback hosts only.
 * No DB client, real JWT, credentials, API passthrough or form submission.
 * Every API read is a fixture. Every HTTP write/external request is blocked.
 * This is a visual mock smoke, NOT authentication/authorization/integration QA.
 */
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const base = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Only a loopback frontend is allowed');
assert.ok(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password, 'No URL credentials');
const origin = base.origin;
const output = path.resolve(__dirname, '../.screenshots/admin-design-mock');
const token = 'mock-admin-design-not-a-valid-jwt';
const user = { id: 'mock-admin', email: 'admin-design@example.invalid', firstName: 'Дизайн', lastName: 'Проверка', role: 'ADMIN', isActive: true, forcePasswordChange: false };
const now = '2026-09-16T10:00:00.000Z';
const future = '2099-01-01T00:00:00.000Z';
const categories = ['Гели', 'Инструменты', 'Уход', 'Фрезы'].map((nameRu, index) => ({
  id: `mock-category-${index}`, nameRu, slug: ['gels', 'tools', 'care', 'cutters'][index], parentId: null,
  isActive: true, sortOrder: index, imageUrl: '/storefront/hero.jpg', description: 'Материалы для профессиональной работы',
}));
const products = [
  { id: 'mock-product-1', sku: 'DESIGN-001', slug: 'design-gel', nameRu: 'Гель-мусс конструирующий камуфлирующий № 23, 15 гр', descriptionRu: 'Тестовое наполнение без реальных покупателей.', basePrice: '780', isActive: true,
    productType: 'PHYSICAL', purposes: ['Маникюр'], features: ['Камуфлирующий'], images: [{ id: 'mock-image', url: '/storefront/products/gel-mousse-23.jpg', sortOrder: 0 }],
    variants: [{ id: 'mock-variant', price: '780', stock: 12, reserved: 2, isActive: true, name: '15 гр' }], categories: [{ categoryId: categories[0].id, category: categories[0] }] },
  { id: 'mock-product-2', sku: 'DESIGN-002', slug: 'design-gift', nameRu: 'Электронная подарочная карта SARKISIAN BRAND', descriptionRu: '', basePrice: '1000', isActive: false,
    productType: 'GIFT_CARD', purposes: [], features: [], images: [], variants: [{ id: 'mock-gift-variant', price: '1000', stock: 0, reserved: 0, isActive: true }], categories: [] },
];
const customers = [{ id: 'mock-customer', firstName: 'Тестовый', lastName: 'Покупатель', role: 'CUSTOMER_B2C', email: 'customer-design@example.invalid', phone: '+70000000000', createdAt: now, _count: { orders: 1 } }];
const orders = [{ id: 'mock-order', orderNumber: 'SB-DESIGN-001', status: 'NEW', paymentStatus: 'PENDING', finalAmount: '1560', totalAmount: '1560', createdAt: now,
  user: customers[0], shippingProvider: 'CDEK', deliveryMethod: 'PVZ', shippingAddress: { city: 'Тестовый город', pickupPointAddress: 'Тестовая улица, 1', pickupPointCode: 'MOCK-PVZ' },
  isSynced1C: false, oneCSyncError: null, items: [{ id: 'mock-order-item', productName: products[0].nameRu, variantName: '15 гр', quantity: 2, price: '780', total: '1560' }],
  history: [{ id: 'mock-history', toStatus: 'NEW', comment: 'Изолированный mock-заказ', createdAt: now }] }];
const loyaltySettings = { programName: 'SARKISIAN CLUB', isEnabled: true, earnPercent: 1, maxWriteOffPercent: 30, signupBonus: 0, birthdayBonus: 0,
  bonusValidityDays: 365, proThreshold: 3000, premiumThreshold: 10000, proMultiplierPercent: 120, premiumMultiplierPercent: 150 };
const loyalty = { settings: loyaltySettings, summary: { participants: 1, activeBalances: 1250, earned: 1500, spent: 250, operations: 2 },
  accounts: [{ ...customers[0], userId: customers[0].id, balance: 1250, level: 'START', entries: [{ id: 'mock-ledger', amount: 1250, type: 'ACCRUAL', reason: 'Тестовое начисление', createdAt: now }] }] };
const storefront = { settings: { announcementText: 'SARKISIAN BRAND — официальный интернет-магазин Светланы Саркисян' }, categories,
  banners: [{ id: 'mock-banner', imageUrl: '/storefront/hero.jpg', title: 'От мастера — мастерам', subtitle: '', linkUrl: '/catalog', isActive: true, sortOrder: 0 }],
  socialLinks: [{ id: 'mock-social', name: 'ВКонтакте', iconKey: 'vk', url: 'https://example.invalid/vk', isActive: true, sortOrder: 0 }],
  menuItems: [{ id: 'mock-menu', label: 'О бренде', url: '/about', isActive: true, sortOrder: 0, newTab: false }] };
const pages = [{ slug: 'about', title: 'О бренде', eyebrow: 'SARKISIAN BRAND', lead: 'От мастера — мастерам.', seoDescription: 'Тестовый текст страницы', isActive: true,
  reviewRequired: false, revision: 1, blocks: [{ id: 'mock-block', title: 'Создано для мастеров', body: 'Профессиональные материалы для повседневной работы.' }] }];
const card = { id: '123e4567-e89b-42d3-a456-426614174000', maskedCode: '••••-••••-••••-CDEF', faceValue: '1000', balance: '750', reserved: '100', issuedAt: now, expiresAt: future, isActive: true, revision: 1, label: 'Тестовая карта' };
const mediaAsset = { id: '123e4567-e89b-42d3-a456-426614174001', url: '/api/v1/media/files/123e4567-e89b-42d3-a456-426614174001.png',
  originalName: 'qa-admin-media.png', mime: 'image/png', size: 68, createdAt: now };
const mediaPreview = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const fixtures = new Map([
  ['/auth/me', user], ['/auth/profile', { ...user, notificationPreferences: { email: true }, sessions: [] }],
  ['/admin/dashboard', { orders: 1, paidOrders: 0, customers: 1, products: 2 }],
  ['/admin/products', products], ['/admin/orders', orders], ['/crm/customers', customers], ['/admin/categories', categories],
  ['/media', { items: [mediaAsset], total: 1, page: 1, limit: 24 }],
  ['/admin/storefront', storefront], ['/admin/storefront/pages', pages], ['/loyalty/admin/overview', loyalty],
  ['/admin/storefront/catalog-menu', { revision: 1, categories, entries: categories.map(c => ({ categoryId: c.id, label: c.nameRu, isVisible: true })),
    quickLinks: [{ key: 'new', label: 'Новинки', isVisible: true }, { key: 'popular', label: 'Бестселлеры', isVisible: true }, { key: 'gift-card', label: 'Подарочная карта', isVisible: true }] }],
  ['/promotions', { items: [{ code: 'DESIGN10', title: 'Mock-промокод', discountType: 'PERCENT', amount: '10', minimumAmount: '1000', maximumDiscount: '500',
    usageLimit: 100, perCustomerLimit: 1, isActive: true, startsAt: null, endsAt: future, revision: 1, reservedCount: 1, appliedCount: 2, usageCount: 3 }], total: 1, page: 1, limit: 50 }],
  ['/gift-cards/product', { nameRu: 'Подарочная карта SARKISIAN BRAND', descriptionRu: 'Электронная карта для любимых материалов.', denominations: [1000, 3000, 5000], validityDays: 365, isActive: true, imageUrl: '' }],
  ['/gift-cards', { items: [card], total: 1, page: 1, limit: 30 }],
  [`/gift-cards/${card.id}/history`, { card, items: [{ id: 'mock-redemption', amount: '250', status: 'APPLIED', createdAt: now, appliedAt: now, releasedAt: null, orderNumber: 'SB-DESIGN-001' }], total: 1, page: 1, limit: 30 }],
  ['/platform-chat/unread', { total: 0 }], ['/platform-chat/channels', []], ['/platform-chat/team', []], ['/crm/reminders', []],
]);

const sections = [
  ['dashboard', '.kpi-grid'], ['appearance', '.appearance-workspace'], ['catalog-menu', '.sb-catalog-menu-admin'], ['pages', '.sb-pages-editor'],
  ['orders', '.order-table'], ['products', '.admin-body > .panel'], ['customers', '.admin-body > .panel'], ['loyalty', '.loyalty-settings-panel'],
  ['promotions', '.sb-promotions-admin'], ['gift-cards', '.sb-gift-form'],
];
// Refresh and appearance-add are white secondary actions, not primary saves.
const primarySelector = '.submit,.appearance-save,.loyalty-save,.sb-cms-primary,.sb-promo-button:not(.sb-promo-button--white),.sb-gift-button:not(.sb-gift-button--white),.sb-cma-button:not(.sb-cma-button--white),.aml-button:not(.aml-button--white),.save-product,.create-product,.editor-drawer .save,.new-drawer .save,.new-product,.admin-load-error button';

async function isolatedContext(browser, width, anonymous, catalogOnly = false) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1, isMobile: width < 800, hasTouch: width < 800, serviceWorkers: 'block' });
  const traffic = { mockedReads: [], mockedPreflights: [], prohibitedWrites: [], unknownReads: [], externalRequests: [], credentialLeaks: [] };
  const actor = catalogOnly ? { ...user, role: 'CONTENT_MANAGER' } : user;
  await context.addInitScript(({ anonymous, token, user }) => {
    localStorage.clear(); sessionStorage.clear();
    if (!anonymous) {
      localStorage.setItem('sarkisian-workspace-token', token);
      localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
    }
    // Socket.io stays pending in this short-lived isolated context, with no network
    // handshake, real auth, polling fallback or server-side connection side effects.
    window.__adminMockRealtime = [];
    class InertWebSocket extends EventTarget {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
      constructor(url) { super(); this.url = String(url); this.readyState = 0; this.bufferedAmount = 0; this.extensions = ''; this.protocol = ''; this.binaryType = 'blob'; window.__adminMockRealtime.push(this.url); }
      send() { /* Never transmitted. */ }
      close() { this.readyState = 3; }
    }
    window.WebSocket = InertWebSocket;
    // Native and Vue form submission are both forbidden, including accidental Enter.
    window.__adminMockSubmitAttempts = 0;
    document.addEventListener('submit', event => { window.__adminMockSubmitAttempts++; event.preventDefault(); event.stopImmediatePropagation(); }, true);
    HTMLFormElement.prototype.submit = function () { window.__adminMockSubmitAttempts++; };
    HTMLFormElement.prototype.requestSubmit = function () { window.__adminMockSubmitAttempts++; };
    navigator.sendBeacon = () => false;
  }, { anonymous, token, user: actor });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    // Mock CORS preflights locally too; never forward OPTIONS to a backend.
    if (request.method() === 'OPTIONS' && url.pathname.includes('/api/v1/')
      && ['GET', 'HEAD'].includes(request.headers()['access-control-request-method'])) {
      traffic.mockedPreflights.push(url.pathname);
      return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' } });
    }
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      traffic.prohibitedWrites.push({ method: request.method(), path: url.pathname });
      return route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ message: 'All writes prohibited in admin design mock' }) });
    }
    // Raster preview is a public mock file, not an authenticated/private API read.
    if (url.pathname === mediaAsset.url) return route.fulfill({ status: 200, contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': origin }, body: mediaPreview });
    const index = url.pathname.indexOf('/api/v1/');
    if (index >= 0) {
      const endpoint = url.pathname.slice(index + '/api/v1'.length);
      if (!anonymous && request.headers().authorization !== `Bearer ${token}`) {
        traffic.credentialLeaks.push(endpoint);
        return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
      }
      const unrelated = ['/admin/dashboard', '/admin/products', '/admin/orders', '/crm/customers', '/admin/categories', '/admin/storefront', '/loyalty/admin/overview'];
      if (catalogOnly && unrelated.includes(endpoint)) {
        traffic.unknownReads.push(endpoint);
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Unrelated admin/CRM access is forbidden in narrow-role catalogue scenario' }) });
      }
      if (fixtures.has(endpoint) && !anonymous) {
        traffic.mockedReads.push(endpoint);
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Cache-Control': 'private, no-store', 'Access-Control-Allow-Origin': origin }, body: JSON.stringify(endpoint === '/auth/me' ? actor : fixtures.get(endpoint)) });
      }
      traffic.unknownReads.push(endpoint);
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Unexpected mock-only API read' }) });
    }
    // Only the actual local page document and compiled static resources pass through.
    const localAsset = url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/storefront/')
      || ['/sarkisian-logo.png', '/favicon.ico'].includes(url.pathname);
    const allowedDocument = request.resourceType() === 'document' && ['/workspace-login', '/b2b-login', '/admin-workspace', '/media-library'].includes(url.pathname);
    if (url.origin === origin && (localAsset || allowedDocument) && !request.headers().authorization) return route.continue();
    traffic.externalRequests.push({ path: url.pathname, type: request.resourceType() });
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(45000);
  const errors = [], consoleWarnings = [];
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('dialog', dialog => dialog.dismiss());
  return { context, page, traffic, errors, consoleWarnings };
}

async function measurements(page, rootSelector = '.site-admin-console,.admin-media-page,.login-page,.console-rail') {
  return page.evaluate(({ primarySelector, rootSelector }) => {
    const rendered = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'; };
    const describe = el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), class: String(el.className || '').slice(0, 140), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80),
        font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, radius: s.borderTopLeftRadius,
        height: Math.round(r.height * 10) / 10, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10,
        color: s.color, background: s.backgroundColor, backgroundImage: s.backgroundImage,
        outline: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow };
    };
    const roots = [...document.querySelectorAll(rootSelector)];
    const root = roots.find(el => !el.matches('.console-rail')) || roots[0];
    const elements = [...new Set(roots.flatMap(el => [...el.querySelectorAll('button,input,select,textarea,h1,h2,h3,label,small,svg')]))].filter(rendered);
    const controls = elements.filter(el => el.matches('button,input:not([type=checkbox]),select,textarea')).map(describe);
    const primary = [...new Set(roots.flatMap(el => [...el.querySelectorAll(primarySelector)]))].filter(el => rendered(el) && !el.matches(':disabled,[aria-disabled="true"]')).map(describe);
    const intentionalScroller = el => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p); if (['auto', 'scroll'].includes(s.overflowX) && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const overflow = [...new Set(roots.flatMap(el => [...el.querySelectorAll('*')]))].filter(rendered).filter(el => {
      const r = el.getBoundingClientRect(); return (r.right > innerWidth + 2 || r.left < -2) && !intentionalScroller(el);
    }).slice(0, 20).map(describe);
    const redDecorative = elements.filter(el => {
      if (el.closest('[class*="badge"],.red,.green,[role="alert"],.login-error,[class*="status-"]')) return false;
      const rgb = getComputedStyle(el).color.match(/\d+(?:\.\d+)?/g)?.map(Number);
      return rgb && rgb[0] > 150 && rgb[0] > rgb[1] * 1.35 && rgb[0] > rgb[2] * 1.35;
    }).slice(0, 20).map(describe);
    const rail = document.querySelector('.console-rail');
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, heading: root.querySelector('h1,h2')?.textContent.trim(),
      fontsLoaded: document.fonts.check('16px Montserrat'), controls, primary, headings: elements.filter(el => el.matches('h1,h2,h3')).map(describe),
      smallCopy: elements.filter(el => el.matches('label,small') && parseFloat(getComputedStyle(el).fontSize) < 12).slice(0, 20).map(describe),
      overflow, redDecorative, rail: rail ? { width: rail.getBoundingClientRect().width, links: rail.querySelectorAll('nav a').length } : null };
  }, { primarySelector, rootSelector });
}

async function keyboardFocus(page, rootSelector) {
  const roots = rootSelector || '.login-area,.site-admin-console,.admin-media-page';
  let state;
  // Walk the real tab order (including rail links and the body wraparound).
  // Never programmatically focus a target or add an artificial focus style.
  for (let step = 1; step <= 80; step++) {
    await page.keyboard.press('Tab');
    state = await page.evaluate(roots => {
      const el = document.activeElement, s = getComputedStyle(el), r = el.getBoundingClientRect();
      const expectedControl = el.matches('button,a[href],input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')
        && !el.matches(':disabled,[aria-disabled="true"]') && r.width > 0 && r.height > 0
        && s.visibility !== 'hidden' && Boolean(el.closest(roots));
      const shadowDimensions = s.boxShadow.replace(/rgba?\([^)]*\)/g, '').match(/-?\d*\.?\d+px/g) || [];
      const nonzeroShadow = shadowDimensions.some(value => Math.abs(parseFloat(value)) > 0);
      return { tag: el.tagName, class: String(el.className || ''), expectedControl,
        outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow,
        focusVisible: el.matches(':focus-visible'),
        indicated: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || nonzeroShadow };
    }, roots);
    if (state.expectedControl) return { ...state, tabSteps: step };
  }
  return { ...state, tabSteps: 80, indicated: false, focusVisible: false };
}

function darkActionSurface(control) {
  const darkOpaque = values => values.length >= 3 && values.slice(0, 3).every(value => value <= 65)
    && (values.length === 3 || values[3] >= .9);
  if (control.backgroundImage && control.backgroundImage !== 'none') {
    // Computed CSS serializes the worker's black gradient stops as rgb/rgba.
    // Transparent backgroundColor is normal when an opaque gradient paints it.
    if (!/gradient\(/.test(control.backgroundImage) || /url\(/.test(control.backgroundImage)) return false;
    const stops = [...control.backgroundImage.matchAll(/rgba?\(([^)]*)\)/g)]
      .map(match => match[1].match(/\d+(?:\.\d+)?/g)?.map(Number) || []);
    return stops.length >= 2 && stops.every(darkOpaque);
  }
  return darkOpaque(control.background.match(/\d+(?:\.\d+)?/g)?.map(Number) || []);
}

function findings(state) {
  const gaps = [];
  if (!state.fontsLoaded) gaps.push('Montserrat font not loaded');
  if (state.documentWidth > state.viewport + 2 || state.overflow.length) gaps.push('Horizontal element overflow (including clipping-hidden overflow)');
  if (state.controls.some(c => !c.font.includes('Montserrat'))) gaps.push('Control font differs from Montserrat');
  if (state.smallCopy.length) gaps.push('Body labels/metadata below 12px');
  if (state.redDecorative.length) gaps.push('Red decorative text/icons outside semantic statuses');
  for (const control of state.primary) {
    if (!darkActionSurface(control)) gaps.push(`Primary action not black: ${control.class}`);
    if (parseFloat(control.radius) < 12) gaps.push(`Primary radius below 12px: ${control.class}`);
    if (control.height < 40) gaps.push(`Primary height below 40px: ${control.class}`);
  }
  return [...new Set(gaps)];
}

async function capture(f, name, width, rootSelector) {
  await f.page.evaluate(() => document.fonts.ready);
  const state = await measurements(f.page, rootSelector), focus = await keyboardFocus(f.page, rootSelector);
  const gaps = findings(state);
  if (!focus.focusVisible || !focus.indicated) gaps.push('Keyboard focus has no visible indicator');
  await f.page.screenshot({ path: path.join(output, `${width}-${name}.png`), fullPage: true });
  return { name, width, state, focus, gaps };
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const results = [];
  try {
    for (const width of [1536, 390]) {
      for (const [section, selector] of [['workspace-login', '.login-area form'], ['b2b-login', '.login-area form'], ['media-library', '.admin-media-page'], ...sections]) {
        const anonymous = ['workspace-login', 'b2b-login'].includes(section);
        const f = await isolatedContext(browser, width, anonymous, section === 'catalog-menu');
        let result = { name: section, width, gaps: [] };
        try {
          const route = anonymous || section === 'media-library' ? section : `admin-workspace?section=${section}`;
          await f.page.goto(`${origin}/${route}`, { waitUntil: 'domcontentloaded' });
          await f.page.locator(selector).first().waitFor({ state: 'visible' });
          if (!anonymous) await f.page.locator('.console-rail').waitFor({ state: 'visible' });
          // Wait for essential fixture rendering, without networkidle (realtime is inert).
          if (section === 'pages') await f.page.locator('.sb-cms-form').waitFor();
          if (section === 'promotions') await f.page.locator('.sb-promo-table').waitFor();
          if (section === 'catalog-menu') await f.page.getByRole('heading', { name: 'Меню каталога', exact: true }).last().waitFor();
          if (section === 'media-library') await f.page.getByRole('button', { name: `Выбрать ${mediaAsset.originalName}`, exact: true }).waitFor();
          await f.page.waitForTimeout(200);
          result = await capture(f, section, width);
          result.details = [];
          const detail = async (name, selector) => {
            await f.page.locator(selector).first().waitFor();
            const audit = await capture(f, name, width, selector);
            result.details.push(audit);
            result.gaps.push(...audit.gaps.map(gap => `${name}: ${gap}`));
          };
          if (anonymous) {
            assert.equal(await f.page.locator('.console-rail').count(), 0, 'Anonymous login must not expose workspace chrome');
            assert.equal(await f.page.evaluate(() => localStorage.getItem('sarkisian-workspace-token')), null);
          }
          if (section === 'media-library') {
            assert.ok(f.traffic.mockedReads.includes('/media'), 'Actual shared media page must load the mock list');
            assert.equal(f.traffic.prohibitedWrites.length, 0, 'Opening media library cannot upload/import automatically');
            result.mediaReadOnly = true;
          }
          if (section === 'orders') {
            await f.page.locator('.order-table .row.clickable').first().click();
            await f.page.locator('.order-drawer').waitFor();
            await detail('order-drawer', '.order-drawer');
          }
          if (section === 'loyalty') {
            await f.page.locator('.loyalty-row:not(.head)').first().click();
            await f.page.locator('.loyalty-drawer').waitFor();
            await detail('loyalty-drawer', '.loyalty-drawer');
          }
          if (section === 'products') {
            // The actual table's delegated dblclick handler opens a local draft.
            // Target the name, never the archive button inside this same row.
            await f.page.locator('.admin-body .table .row:not(.head) strong').first().dblclick();
            await detail('product-editor', '.editor-drawer');
            await f.page.locator('.editor-drawer .close').click();
            await f.page.locator('.new-product').click();
            await detail('new-product-drawer', '.new-drawer');
          }
          if (section === 'promotions') {
            // Opens an unchanged local draft only. Never click save/generate/deactivate.
            await f.page.getByRole('button', { name: 'Новый промокод', exact: true }).click();
            await f.page.locator('.sb-promo-form').waitFor();
            await detail('promo-form', '.sb-promo-form');
          }
          if (section === 'gift-cards') {
            await f.page.getByRole('button', { name: 'Выданные карты', exact: true }).click();
            await f.page.locator('.sb-gift-table').waitFor();
            await detail('gift-cards-list', '.sb-gift-admin:not(.sb-gift-dialog)');
            await f.page.getByRole('button', { name: /История/ }).first().click();
            await f.page.locator('.sb-gift-history-list').waitFor();
            await detail('gift-history', '.sb-gift-dialog');
          }
          if (section === 'catalog-menu') {
            assert.ok(f.traffic.mockedReads.includes('/admin/storefront/catalog-menu'), 'Catalogue fixtures must actually load');
            assert.ok(!f.traffic.mockedReads.some(endpoint => /^\/admin\/(dashboard|products|orders|categories)$|^\/crm\/customers$|^\/admin\/storefront$|^\/loyalty\/admin\/overview$/.test(endpoint)), 'Catalogue cannot depend on unrelated admin/CRM reads');
            assert.equal(await f.page.locator('.header-actions button').count(), 0, 'Catalogue uses only its own refresh');
            result.role = 'CONTENT_MANAGER';
          }
          assert.equal(await f.page.evaluate(() => window.__adminMockSubmitAttempts), 0, 'Never submit forms, including login');
        } catch (error) { result.failure = error.message; }
        finally {
          result.errors = f.errors; result.consoleWarnings = f.consoleWarnings; result.traffic = f.traffic;
          result.passed = !result.failure && !result.gaps.length && !f.errors.length
            && ['prohibitedWrites', 'unknownReads', 'externalRequests', 'credentialLeaks'].every(key => !f.traffic[key].length);
          results.push(result);
          await f.context.close();
        }
      }
    }
  } finally {
    await browser.close();
    const controls = results.flatMap(r => [...(r.state?.controls || []), ...(r.details || []).flatMap(detail => detail.state.controls)]);
    const sharedControlInventory = Object.fromEntries(['font', 'size', 'radius', 'height'].map(key => [key, [...new Set(controls.map(c => c[key]))]]));
    const report = { mockedOnly: true, actualApiCalls: 0, actualApiWrites: 0, loginSubmitted: false, sharedControlInventory, results };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ report: path.join(output, 'report.json'), cases: results.length, failed: results.filter(r => !r.passed).map(r => ({ name: r.name, width: r.width, failure: r.failure, gaps: r.gaps, traffic: r.traffic })) }, null, 2));
    if (results.some(r => !r.passed)) process.exitCode = 1;
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
