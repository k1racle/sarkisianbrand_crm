// Read-only visual inventory. All private/API reads use synthetic fixtures; no API writes are allowed.
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const origin = new URL(process.env.WORKSPACE_DESIGN_URL || process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3001').origin;
process.env.ADMIN_DESIGN_URL = origin;
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: base, person } = require('./crm-rich-fixtures.cjs');
const after = process.argv.includes('--after');
const allCrm = process.argv.includes('--crm-all');
const responsive = process.argv.includes('--responsive');
const batch = process.env.WORKSPACE_DESIGN_BATCH || '';
if (batch && !/^[a-z0-9-]{1,40}$/.test(batch)) throw new Error('WORKSPACE_DESIGN_BATCH must be a short alphanumeric label');
if (allCrm && responsive) throw new Error('Use separate all-route and responsive batches');
const widths = (process.env.WORKSPACE_DESIGN_WIDTHS || (responsive ? '320,768,1920' : '1440,390')).split(',').map(Number);
if (!widths.length || widths.some(w => !Number.isInteger(w) || w < 320 || w > 2560)) throw new Error('WORKSPACE_DESIGN_WIDTHS must be comma-separated viewport widths from 320 to 2560');
const output = path.resolve(__dirname, '../.screenshots/workspace-design-' + (batch ? batch + '-' : '') + (allCrm ? 'all-' : responsive ? 'responsive-' : '') + (after ? 'after' : 'before'));
const company = '10000000-0000-4000-8000-000000000001', masterId = '20000000-0000-4000-8000-000000000001';
const service = { id: 'service', name: 'Маникюр с покрытием', price: 2200, duration: 90, color: '#77709e', isActive: true };
const customer = { id: 'customer', firstName: 'Елена', lastName: 'Волкова', phone: '+79990000000', email: 'qa@example.invalid', tags: ['Постоянный клиент'], visitsCount: 4, totalSpent: 8800, lastVisitAt: '2026-10-20T08:00:00Z' };
const member = { id: masterId, role: 'OWNER', isActive: true, user: { id: 'qa-owner', firstName: 'Анна', lastName: 'Мастер', role: 'CUSTOMER_B2B', isActive: true } };
const profile = { id: company, name: 'Студия маникюра «Форма»', legalName: 'ООО «Форма»', legalAddress: 'Москва, Большая Дмитровка, 12', inn: '7707083893', kpp: '770701001', phone: '+79990000000', email: 'studio@example.invalid', status: 'ACTIVE', discountTier: 15, creditLimit: 0, members: [member], membership: { id: masterId, role: 'OWNER', canOrder: true, canSeeFinance: true }, capabilities: { salon: true, purchasing: true }, presentation: null };
const today = new Date(); today.setHours(13, 0, 0, 0);
const visit = { id: 'visit', version: 1, startTime: today.toISOString(), endTime: new Date(+today + 90 * 60000).toISOString(), clientId: customer.id, client: customer, serviceId: service.id, service, masterMemberId: masterId, masterMember: member, status: 'CONFIRMED', priceSnapshot: 2200, comments: 'Нюдовое покрытие, миндаль' };
const order = { id: 'order', orderNumber: 'B2B-2026-001', status: 'CONFIRMED', paymentStatus: 'PAID', createdAt: '2026-10-25T11:00:00Z', finalAmount: 3740, totalAmount: 4400, isSynced1C: false, items: [{ id: 'line', productName: 'Гель скоростной № 011', variantName: '30 мл', quantity: 2, price: 1870, total: 3740, externalSku: 'GEL-011-30' }], history: [] };
const products = [{ id: 'gel', nameRu: 'Гель скоростной № 011', sku: 'GEL-011', images: [{ url: '/storefront/products/gel-mousse-23.jpg' }], categories: [{ category: { id: 'gels', nameRu: 'Гели' } }], variants: [{ id: 'gel-30', sku: 'GEL-011-30', name: '30 мл', b2bPrice: 1870, retailPrice: 2200, available: 16 }] }, { id: 'tools', nameRu: 'Ножницы профессиональные', sku: 'TOOLS-002', images: [], categories: [{ category: { id: 'tools', nameRu: 'Инструменты' } }], variants: [{ id: 'scissors', sku: 'TOOLS-002', name: '1 шт.', b2bPrice: 1695, retailPrice: 1995, available: 0 }] }];
const presentation = { displayName: profile.name, description: 'Бережный маникюр и педикюр. Выберите удобное время — мы будем ждать вас в студии.', phone: profile.phone, email: profile.email, address: profile.legalAddress, city: 'Москва', logoUrl: '', accentColor: '#77709e', links: [] };
const bookingSettings = { organizationId: company, enabled: true, timeZone: 'Europe/Moscow', startMinute: 540, endMinute: 1200, slotStep: 15, horizonDays: 30, workingDays: [1, 2, 3, 4, 5, 6], masterIds: [masterId], canEdit: true, weeklySchedule: [] };
const fixtures = new Map(base);
if (allCrm) {
  // The all-route visual inventory uses a synthetic full-access administrator.
  // It does not test real authorization; narrow-role acceptance lives in other scripts.
  const nav = fs.readFileSync(path.resolve(__dirname, '../composables/useWorkspaceNavigation.ts'), 'utf8');
  const permissions = [...new Set([...(fixtures.get('/auth/access')?.permissions || []), ...[...nav.matchAll(/['"]([a-z_]+\.[a-z_]+)['"]/g)].map(m => m[1])])];
  fixtures.set('/auth/access', { role: 'ADMIN', permissions, denied: [] });
}
const common = { status: 'ACTIVE', canWrite: true, createdAt: '2026-10-01T10:00:00Z', accountManager: person, accountManagerId: person.id, relatedAccess: { orders: true, helpdesk: true, leads: true }, orders: [], leads: [], interactions: [], helpdeskTickets: [], organizationMemberships: [], members: [], _count: { orders: 1, leads: 0, tasks: 0, interactions: 0, helpdeskTickets: 0, members: 1 } };
fixtures.set('/customer-360/customers', [{ ...common, ...customer, segment: 'B2C' }]);
fixtures.set('/customer-360/customers/customer', { ...common, ...customer, segment: 'B2C', _count: { ...common._count, orders: 0 } });
fixtures.set('/customer-360/organizations', [{ ...common, ...profile }]);
fixtures.set('/customer-360/team', [person]);
fixtures.set('/customer-360/dashboard', { totalCustomers: 1, activeCustomers: 1, b2cCustomers: 1, b2bCustomers: 0, organizations: 1, newCustomers: 1 });
fixtures.set('/crm/task-pipelines', { pipelines: [{ id: 'pipeline', name: 'Общая', labels: { BACKLOG: 'Бэклог', TODO: 'К выполнению', IN_PROGRESS: 'В работе', REVIEW: 'Проверка', OVERDUE: 'Просрочено', DONE: 'Готово' } }], departments: [], canManage: false });
fixtures.set('/staff-notifications', { items: [], fresh: [], unreadCount: 0, nextCursor: null, through: new Date().toISOString(), popupsEnabled: false });
fixtures.set('/partners/admin/documents/workspace', { settings: { pepEnabled: false, providerKey: 'SMS_AERO', codeTtlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 60, consentRequired: true, eligibleDocumentTypes: ['SERVICE_AGREEMENT'] }, templates: [{ id: 'template', templateKey: 'agreement', title: 'Договор оказания информационных услуг', documentType: 'SERVICE_AGREEMENT', version: 2, audience: 'ALL', taxStatus: 'ALL', entityType: 'ALL', isActive: true, bodyHtml: '<p>Договор с {{partner_name}}</p>' }], entities: [], smsProvider: { configured: false, enabled: false } });
fixtures.set('/partners/admin/documents/participants', []);
fixtures.set('/studio/admin', { settings: { enabled: true, dailyRunLimit: 3, minimumRunSeconds: 90 }, offers: [5, 10, 15].map((discountPercent, i) => ({ id: 'offer-' + i, discountPercent, coinPrice: [15000, 35000, 60000][i], validDays: 30, minimumAmount: 0, maximumDiscount: null, isActive: true })), issued: 0, accounts: 0, recent: [] });
fixtures.set('/oms/inventory', { items: [], categories: [], total: 0, page: 1, pages: 1, asOf: new Date().toISOString(), allOrdersVisible: true, summary: { positions: 0, stock: 0, reserved: 0, toShip: 0 } });
fixtures.set('/partners/admin/gifts', { participants: [], products: [], shipments: [] });
fixtures.set('/helpdesk/knowledge', { items: [], categories: [], total: 0, page: 1, pages: 1, canWrite: true });
const businessFixtures = new Map([
  ['/b2b/organizations', [{ id: company, name: profile.name, status: 'ACTIVE', role: 'OWNER', canOrder: true, canSeeFinance: true, canUseSalon: true }]],
  ['/b2b/profile', profile], ['/b2b/dashboard', { timeZone: 'Europe/Moscow', clients: 43, bookingsToday: 6, upcoming: 18, serviceRevenueMonth: 114000, purchaseOrdersMonth: 3, purchasesMonth: 25400, lowStock: 2, nextBookings: [visit], recentOrders: [order] }],
  ['/b2b/clients', [customer]], ['/b2b/services', [service]], ['/b2b/bookings', [visit]], ['/b2b/catalog', products], ['/b2b/orders', [order]], ['/b2b/support', []], ['/b2b/booking-settings', bookingSettings], ['/b2b/salon-presentation', presentation], ['/b2b/team', { members: [member], invitations: [], canManage: true, currentMemberId: masterId }]
]);
const routes = [
  ['crm-day', '/crm/'], ['crm-orders', '/crm/b2b-orders'], ['crm-customers', '/crm/customers'], ['crm-tasks', '/crm/tasks'], ['crm-settings', '/crm/settings/overview'], ['crm-documents', '/crm/partners/documents'],
  ['salon-day', '/b2b?section=dashboard'], ['salon-calendar', '/b2b?section=calendar'], ['business-day', '/b2b?section=purchases'], ['business-catalog', '/b2b?section=catalog'], ['business-settings', '/b2b?section=settings&area=salon'], ['public-booking', '/booking/' + company]
];
async function measures(page) {
  return page.evaluate(() => {
    const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width && r.height && s.display !== 'none' && s.visibility !== 'hidden'; };
    const interactive = [...document.querySelectorAll('main button,main a,main input,main select,main textarea,.crm-frame button,.crm-frame input,.business-page button,.body button,.admin-dialog button,.admin-dialog a,.admin-dialog input,.admin-dialog select,.admin-dialog textarea,.crm-search-dialog button,.crm-search-dialog input,.crm-notifications-panel button')].filter(visible);
    const outside = interactive.flatMap(e => {
      const box = e.getBoundingClientRect().toJSON(); if (box.left >= -1 && box.right <= innerWidth + 1) return [];
      let scrollContainer = null; for (let node = e.parentElement; node; node = node.parentElement) { const s = getComputedStyle(node); if (['auto', 'scroll'].includes(s.overflowX) && node.scrollWidth > node.clientWidth + 1) { scrollContainer = String(node.className); break; } }
      return [{ text: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 60), cls: String(e.className), box, scrollContainer }];
    });
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true }), cache = new Map();
    const rgba = color => { if (cache.has(color)) return cache.get(color); ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); const p = [...ctx.getImageData(0, 0, 1, 1).data], result = [...p.slice(0, 3), p[3] / 255]; cache.set(color, result); return result; };
    const blend = (front, back) => front.slice(0, 3).map((v, i) => v * front[3] + back[i] * (1 - front[3]));
    const lum = rgb => rgb.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
    const contrast = [...document.querySelectorAll('main *, .crm-frame *, .pds-doc-checks *, .business-page *, .body *, .admin-dialog *, .crm-search-dialog *, .crm-notifications-panel *, .crm-install-dialog *, .workspace-context *')].filter(e => visible(e) && !e.closest('svg,[disabled],[aria-disabled="true"]') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).flatMap(e => {
      const layers = []; let hasImage = false;
      for (let node = e; node; node = node.parentElement) { const s = getComputedStyle(node); layers.push(rgba(s.backgroundColor)); if (s.backgroundImage !== 'none') hasImage = true; if (rgba(s.backgroundColor)[3] === 1) break; }
      const bg = layers.reverse().reduce((back, front) => blend(front, back), [255, 255, 255]), s = getComputedStyle(e), a = lum(blend(rgba(s.color), bg)), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(s.fontSize) >= 24 || parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700;
      return ratio + .01 >= (large ? 3 : 4.5) ? [] : [{ text: e.textContent.trim().slice(0, 70), cls: String(e.className), ratio: Math.round(ratio * 100) / 100, color: s.color, background: bg, hasImage }];
    });
    const metricOverflow = [...document.querySelectorAll('.kpis strong,.business-overview-metrics strong,.hero-kpis strong,.crm-inventory-summary strong')].filter(visible).flatMap(e => {
      const card = e.closest('article,.kpi'); if (!card) return []; const r = document.createRange(); r.selectNodeContents(e);
      const text = r.getBoundingClientRect(), container = card.getBoundingClientRect();
      return text.left >= container.left + 3 && text.right <= container.right - 3 ? [] : [{ text: e.textContent.trim(), cls: String(e.className), left: text.left, right: text.right, containerLeft: container.left, containerRight: container.right }];
    });
    const unifiedControls = [], typographyFindings = [];
    if (document.documentElement.hasAttribute('data-crm-ui')) {
      const controlHeight=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--crm-control-height'));
      for (const el of document.querySelectorAll('.crm-button:not(.crm-card-action):not(.crm-button--row):not(.crm-month-day)')) {
        if (!visible(el) || el.matches('[role="tab"],.crm-tab') || el.closest('.crm-tabs,.crm-card-tabs,.crm-section-links')) continue;
        const css=getComputedStyle(el),box=el.getBoundingClientRect();
        if (css.fontSize!=='13px'||parseFloat(css.borderRadius)!==8||box.height<controlHeight-.5) unifiedControls.push({kind:'button',text:(el.getAttribute('aria-label')||el.textContent).trim().slice(0,70),class:el.className,font:css.fontSize,radius:css.borderRadius,height:box.height});
      }
      for (const el of document.querySelectorAll('input.crm-input,select.crm-input,textarea.crm-input')) {
        if (!visible(el)||el.matches('[type="checkbox"],[type="radio"],[type="file"],[type="range"],[type="color"],[type="hidden"]'))continue;
        const css=getComputedStyle(el),box=el.getBoundingClientRect(),group=el.closest('.crm-input-group');
        if (css.fontSize!==(innerWidth<1024?'16px':'14px')||box.height<controlHeight-(group?2.5:.5)||parseFloat(css.borderRadius)!==(group?0:7)) unifiedControls.push({kind:'field',text:el.getAttribute('aria-label')||el.id||el.name,class:el.className,font:css.fontSize,radius:css.borderRadius,height:box.height});
      }
      for (const el of document.querySelectorAll('.crm-app *,.crm-app-login *,.admin-dialog *,.crm-search-dialog *,.crm-notifications-panel *,.crm-install-dialog *,.workspace-context *')) {
        if (!visible(el)||el.closest('svg')||(!el.matches('input,select,textarea')&&![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))) continue;
        const css=getComputedStyle(el),chrome=!!el.closest('.crm-app-sidebar,.crm-topbar,.crm-mobile-tabs');
        if (!(chrome?[10,11,12,13,14,18]:[12,13,14,16,18,20,24,28]).includes(parseFloat(css.fontSize))||!['400','500','600'].includes(css.fontWeight)||!css.fontFamily.includes('Montserrat')) typographyFindings.push({text:(el.getAttribute('aria-label')||el.textContent).trim().slice(0,65),class:String(el.className),font:css.fontSize,weight:css.fontWeight,family:css.fontFamily});
      }
    }
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, headings: [...document.querySelectorAll('h1,h2')].filter(visible).map(e => ({ text: e.textContent.trim(), size: getComputedStyle(e).fontSize })), outside, contrast, metricOverflow, unifiedControls, typographyFindings, controls: interactive.length };
  });
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(require('./crm-test-browser.cjs')), report = [];
  let reviewRoutes = routes;
  if (responsive) reviewRoutes = routes.filter(([name]) => ['crm-day', 'crm-orders', 'crm-documents', 'business-catalog'].includes(name));
  if (allCrm) {
    const { stripTypeScriptTypes } = require('node:module');
    const source = fs.readFileSync(path.resolve(__dirname, '../shared/crm-workspace.ts'), 'utf8');
    const { CRM_DESTINATIONS } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
    reviewRoutes = [...CRM_DESTINATIONS.map(item => ['crm-' + item.id, item.path]), ...routes.filter(([name]) => !name.startsWith('crm-'))];
  }
  try {
    for (const width of widths) for (const theme of ['light', 'dark']) {
      const f = await isolatedContext(browser, width, false, false, { fixtures }), p = f.page;
      await f.context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
      try {
        for (const [name, route] of reviewRoutes.filter(([name]) => name.startsWith('crm-'))) {
          await p.goto(origin + route, { waitUntil: 'networkidle' });
          await p.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' });
          let headingReady = true;
          try { await p.locator('.crm-app h1').first().waitFor({ timeout: allCrm ? 5000 : 15000 }); }
          catch (error) { headingReady = false; if (!allCrm) throw error; }
          await p.evaluate(() => document.fonts.ready);
          await p.screenshot({ path: path.join(output, `${width}-${theme}-${name}.png`), fullPage: true });
          report.push({ width, theme, name, headingReady, ...await measures(p) });
        }
        report.push({ width, theme, scope: 'crm', traffic: f.traffic, errors: f.errors });
      } finally { await f.context.close(); }
      const b = await isolatedContext(browser, width, false, false, { fixtures: businessFixtures, b2b: true, actor: { id: 'qa-owner', firstName: 'Анна', lastName: 'Мастер', email: 'owner@example.invalid', role: 'CUSTOMER_B2B', isActive: true } }), bp = b.page;
      await b.context.addCookies([{ name: 'sarkisian-crm-theme', value: theme, url: origin }]);
      // Anonymous page is still fixture-only; allow only its local document + exact synthetic public API.
      await b.context.route('**/booking/**', route => route.request().resourceType() === 'document' ? route.continue() : route.fallback());
      await b.context.route('**/api/v1/salon-booking/**', route => {
        if (route.request().method() !== 'GET') return route.fulfill({ status: 405, json: { message: 'Read-only design fixture' } });
        return route.fulfill({ json: { name: profile.name, presentation, workingDays: bookingSettings.workingDays, weeklySchedule: [], startMinute: 540, endMinute: 1200, timeZone: 'Europe/Moscow', today: new Date().toISOString().slice(0, 10), horizonDays: 30, services: [service], masters: [{ id: masterId, name: 'Анна Мастер' }] } });
      });
      try {
        for (const [name, route] of reviewRoutes.filter(([name]) => !name.startsWith('crm-'))) {
          await bp.goto(origin + route, { waitUntil: 'networkidle' });
          await bp.addStyleTag({ content: '#nuxt-devtools-container{display:none!important}' });
          await bp.locator(name === 'public-booking' ? '.public-salon-booking h1' : '.portal h1').first().waitFor(); await bp.evaluate(() => document.fonts.ready);
          await bp.screenshot({ path: path.join(output, `${width}-${theme}-${name}.png`), fullPage: true });
          report.push({ width, theme, name, ...await measures(bp) });
        }
        report.push({ width, theme, scope: 'business', traffic: b.traffic, errors: b.errors });
      } finally { await b.context.close(); }
      console.log(`Captured ${width} ${theme}`);
    }
  } finally { await browser.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
  const screens = report.filter(r => r.name), traffic = report.filter(r => r.traffic);
  const summary = { output, screens: screens.length,
    missingHeadings: screens.filter(r=>r.headingReady===false).map(r=>({width:r.width,theme:r.theme,name:r.name})),
    viewportOverflow: screens.filter(r => r.scrollWidth > r.width + 1).map(r => ({ width: r.width, theme: r.theme, name: r.name })),
    clippedWithoutScroll: screens.filter(r => r.outside.some(c => !c.scrollContainer)).map(r => ({ width: r.width, theme: r.theme, name: r.name, controls: r.outside.filter(c => !c.scrollContainer).map(c => c.text) })),
    lowContrastOnSolidSurface: screens.flatMap(r => r.contrast.filter(c => !c.hasImage).map(c => ({ width: r.width, theme: r.theme, name: r.name, text: c.text, ratio: c.ratio }))),
    metricTextOutsideCard: screens.flatMap(r => r.metricOverflow.map(c => ({ width: r.width, theme: r.theme, name: r.name, ...c }))),
    inconsistentControls: screens.flatMap(r => (r.unifiedControls||[]).map(c => ({ width:r.width,theme:r.theme,name:r.name,...c }))),
    typographyFindings: screens.flatMap(r => (r.typographyFindings||[]).map(c => ({ width:r.width,theme:r.theme,name:r.name,...c }))),
    unknownReads: [...new Set(traffic.flatMap(r => r.traffic.unknownReads))], errors: [...new Set(traffic.flatMap(r => r.errors))],
    prohibitedWrites: traffic.flatMap(r => r.traffic.prohibitedWrites), externalRequests: traffic.flatMap(r => r.traffic.externalRequests)
  };
  console.log(JSON.stringify(summary));
  if(after){const failures=Object.entries(summary).filter(([key,value])=>Array.isArray(value)&&value.length);if(failures.length)throw new Error('Workspace interface findings: '+failures.map(([key,value])=>`${key}=${value.length}`).join(', '));}
}
module.exports = { fixtures, businessFixtures, routes, profile, origin, measures, widths, batch };
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
