/*
 * Local storefront acceptance. Run: node scripts/storefront-completion-smoke.cjs
 * --ui-only skips the separately reported, real GET-only SSR checks.
 * STOREFRONT_URL / STOREFRONT_API_URL / STOREFRONT_BROWSER_PATH override local defaults.
 * No Prisma, credentials, live tokens, provider navigation or real mutation requests.
 * Browser JSON APIs are mocked; public product media may use safe local GETs.
 * Unknown mutations fail closed with HTTP 501.
 */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE = new URL(process.env.STOREFRONT_URL || 'http://localhost:3001').origin;
const API = (process.env.STOREFRONT_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const API_URL = new URL(API);
const UI_ONLY = process.argv.includes('--ui-only');
const WIDTHS = [1536, 820, 390, 320];
const OUTPUT = path.resolve(__dirname, '../.screenshots/storefront-completion');
const CMS = ['about', 'club', 'privacy', 'oferta', 'returns', 'delivery', 'contacts'];
const TITLES = { about: 'О бренде', club: 'О клубе', privacy: 'Политика конфиденциальности', oferta: 'Публичная оферта', returns: 'Правила возврата', delivery: 'Доставка и оплата', contacts: 'Контакты' };
const RESET_MESSAGE = 'Если аккаунт с этим email существует, мы отправим письмо со ссылкой для смены пароля.';
const safety = { mockedMutations: 0, dispatchedApiMutations: 0, unexpectedMutations: [], blockedExternal: [], publicReads: [] };
const results = [], failures = [], warnings = [];
let activePage = null;

async function check(name, fn) {
  try { const data = await fn(); results.push({ name, ok: true, ...(data || {}) }); console.log(`ГОТОВО: ${name}`); }
  catch (error) {
    const message = error.message || String(error); failures.push({ name, message }); results.push({ name, ok: false, message }); console.error(`ОШИБКА: ${name}: ${message}`);
    if (activePage && !activePage.isClosed()) { await activePage.screenshot({path:path.join(OUTPUT,'failure-'+results.length+'.png'),fullPage:true}).catch(()=>undefined);await activePage.keyboard.press('Escape').catch(()=>undefined);await activePage.waitForTimeout(850).catch(()=>undefined); }
  }
}

// Only explicit public GET allowlists are admitted outside the browser mock firewall.
async function publicRead(endpoint) {
  assert(/^\/products(?:\?(?:limit=\d+)|\/filters|\/storefront-content|\/storefront-pages\/[a-z-]+|\/[a-z0-9-]+)?$/.test(endpoint), 'Непубличный endpoint не разрешён');
  const url = API + endpoint; safety.publicReads.push(url);
  const response = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000) });
  assert.equal(response.status, 200, `${endpoint}: HTTP ${response.status}`);
  return response.json();
}

function fixtureProduct(index = 0) {
  return { id: `completion-product-${index}`, slug: `completion-product-${index}`, nameRu: index ? 'Материал для маникюра' : 'Гель для моделирования и профессиональной работы, 15 г', sku: `FIXTURE-${index}`, basePrice: 780 + index * 100, descriptionRu: 'Изолированный товар для проверки интерфейса.', isActive: true,
    images: index === 1 ? [] : [{ id: `image-${index}`, url: '/storefront/products/gel-mousse-23.jpg', sortOrder: 0 }],
    variants: [{ id: `completion-variant-${index}`, sku: `FIXTURE-${index}`, name: '15 г', price: 780 + index * 100, stock: 10, reserved: 1, isActive: true, options: {} }],
    categories: [{ isPrimary: true, categoryId: 'completion-gels', category: { id: 'completion-gels', slug: 'gels', nameRu: 'Гели' } }], purposes: ['Моделирование'], features: ['Густой'] };
}
function fixtureContent() {
  return { settings: { announcementText: 'SARKISIAN BRAND — официальный интернет-магазин' }, banners: [{ id: 'completion-banner', imageUrl: '/storefront/hero.jpg', linkUrl: '/catalog' }], categories: [{ id: 'gels', nameRu: 'Гели', imageUrl: '/storefront/categories/gels.jpg' }, { id: 'tools', nameRu: 'Инструменты', imageUrl: '/storefront/categories/instruments.jpg' }, { id: 'care', nameRu: 'Уход', imageUrl: '/storefront/brand-strip.jpg' }, { id: 'cutters', nameRu: 'Фрезы', imageUrl: '/storefront/categories/cutters.jpg' }], socialLinks: [{ id: 'vk', name: 'ВКонтакте', iconKey: 'vk', url: 'https://vk.com/' }, { id: 'telegram', name: 'Телеграм', iconKey: 'telegram', url: 'https://t.me/' }, { id: 'max', name: 'MAX', iconKey: 'max', url: 'https://max.ru/' }], menuItems: ['about', 'club', 'delivery', 'contacts'].map(slug => ({ id: slug, label: TITLES[slug], url: '/' + slug, newTab: false })) };
}
function fixturePage(slug) {
  return { slug, title: TITLES[slug], eyebrow: TITLES[slug], lead: 'Материалы, забота о мастерах и понятные условия покупки.', seoDescription: 'Информация для покупателей SARKISIAN BRAND.', reviewRequired: ['privacy', 'oferta', 'returns'].includes(slug), blocks: [{ id: slug === 'club' ? 'rewards' : 'information', title: 'Всё необходимое', body: slug === 'contacts' ? 'Телефон: 8 (918) 449-63-94\nEmail: info@sarkisianbrand.ru' : 'Понятная информация для покупателей и профессиональных мастеров.' }, { id: 'support', title: 'Мы рядом', body: 'Обратитесь к нам, если нужна помощь.' }] };
}
function accountFixture() {
  return { id: 'completion-user', email: 'completion@example.test', firstName: 'Анна', lastName: 'Тестовая', phone: '+79990000000', city: 'Москва', role: 'CUSTOMER_B2C', notificationPreferences: { email: true, push: true, chat: true }, avatarUrl: null, pendingChangeRequest: null, sessions: [] };
}
function orderFixture(product) {
  return { id: 'completion-order', orderNumber: 'COMPLETION-ORDER-1', status: 'NEW', reservationState: 'ACTIVE', createdAt: '2026-09-16T10:00:00Z', finalAmount: 780, shippingAddress: { city: 'Москва', street: 'Тестовая', house: '1' }, items: [{ id: 'completion-item', variantId: product.variants[0].id, productName: product.nameRu, variantName: '15 г', quantity: 1, price: 780, total: 780, variant: { ...product.variants[0], product } }], history: [{ id: 'completion-history', toStatus: 'NEW', createdAt: '2026-09-16T10:00:00Z' }], payments: [] };
}

async function firewall(context, snapshots) {
  const state = { profile: accountFixture(), addresses: [], order: orderFixture(snapshots.products[0]), cart: { items: [], total: 0 }, calls: [], resetReplies: [], catalogFailure: false, profileFailure: false, brokenImage: false };
  const respond = (route, value, status = 200) => route.fulfill({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(value) });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    const isApi = url.origin === API_URL.origin && url.pathname.startsWith(API_URL.pathname + '/') || url.pathname.startsWith('/api/');
    if (!isApi) {
      // Fail closed on ALL non-GET/HEAD requests, even if an app uses a new proxy path.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) { safety.unexpectedMutations.push(`${method} ${url.origin}${url.pathname}`); return respond(route, { message: 'Запрос заблокирован проверкой безопасности.' }, 501); }
      if (![new URL(BASE).origin, API_URL.origin].includes(url.origin)) { safety.blockedExternal.push(`${req.resourceType()}: ${url.origin}${url.pathname}`); return route.abort('blockedbyclient'); }
      if (url.pathname === '/storefront/completion-broken.jpg') return route.abort('failed');
      return route.continue();
    }
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': BASE, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const endpoint = url.pathname.startsWith(API_URL.pathname + '/') ? url.pathname.slice(API_URL.pathname.length) : url.pathname.replace(/^\/api\/v1/, '');
    const call = { method, endpoint, body: req.postData() }; state.calls.push(call);
    if (!['GET', 'HEAD'].includes(method)) safety.mockedMutations++;
    let body;
    if (['POST', 'PATCH'].includes(method) && req.headers()['content-type']?.includes('application/json')) { try { body = req.postDataJSON(); } catch { return respond(route, { message: 'Некорректный тестовый запрос.' }, 400); } }
    if (['GET', 'HEAD'].includes(method)) {
      // Product photos are public assets, not customer/avatar/admin JSON endpoints.
      if (url.origin === API_URL.origin && /^\/admin\/media\//.test(endpoint) && req.resourceType() === 'image') return route.continue();
      if (endpoint === '/products/storefront-content') return respond(route, snapshots.content);
      if (endpoint === '/products/filters') return respond(route, snapshots.facets);
      if (endpoint === '/products') {
        if (state.catalogFailure) return respond(route, { message: 'Каталог временно недоступен.' }, 503);
        const products = state.brokenImage ? [{ ...fixtureProduct(9), images: [{ url: '/storefront/completion-broken.jpg', sortOrder: 0 }] }] : snapshots.products;
        return respond(route, { items: products, pagination: { total: products.length, page: 1, limit: 24, pages: 1 } });
      }
      if (endpoint.startsWith('/products/storefront-pages/')) { const slug = endpoint.split('/').pop(); return respond(route, snapshots.pages[slug] || { message: 'Страница не найдена' }, snapshots.pages[slug] ? 200 : 404); }
      if (endpoint === '/products/cart-recommendations') return respond(route, snapshots.products);
      if (endpoint.startsWith('/products/')) { const product = snapshots.products.find(item => item.slug === endpoint.slice(10)); return respond(route, product || { message: 'Товар не найден' }, product ? 200 : 404); }
      if (endpoint === '/cart') return respond(route, state.cart);
      if (endpoint === '/auth/me') return respond(route, state.profile);
      if (endpoint === '/auth/profile') return respond(route, state.profileFailure ? { message: 'Профиль временно недоступен.' } : state.profile, state.profileFailure ? 503 : 200);
      if (endpoint === '/storefront/favorites') return respond(route, []);
      if (endpoint === '/storefront/addresses') return respond(route, state.addresses);
      if (endpoint === '/storefront/dashboard') return respond(route, { summary: { orders: 42, spent: 198000, favoriteCount: 0 }, orders: [state.order], addresses: state.addresses, loyalty: { balance: 1250, levelLabel: 'Старт', programName: 'SARKISIAN CLUB', isEnabled: true, earnPercent: 2, maxWriteOffPercent: 25, progress: 40, nextLevelLabel: 'Профессионал', toNextLevel: 750, entries: [] } });
      if (endpoint === '/storefront/orders/COMPLETION-ORDER-1') return respond(route, state.order);
      if (/^\/auth\/social\/(vk|yandex)\/start$/.test(endpoint)) return respond(route, { message: 'Социальный вход отключён в изолированной проверке.' }, 503);
      return respond(route, { message: 'Непредусмотренный API чтения в тесте.' }, 404);
    }
    // No API request below may continue/fallback/fetch through to the application server.
    if (method === 'POST' && endpoint === '/auth/password-reset/request') { const reply = { message: RESET_MESSAGE }; state.resetReplies.push({ email: body.email, reply }); return respond(route, reply); }
    if (method === 'POST' && ['/auth/login', '/auth/register'].includes(endpoint)) return respond(route, { accessToken: 'isolated-completion-token', refreshToken: 'isolated-completion-refresh', user: state.profile });
    if (method === 'POST' && endpoint === '/storefront/cart/bind') return respond(route, state.cart);
    if (method === 'PATCH' && endpoint === '/auth/profile') { state.profile = { ...state.profile, ...body }; return respond(route, state.profile); }
    if (method === 'POST' && endpoint === '/auth/profile/change-request') { state.profile.pendingChangeRequest = { id: 'completion-change', requestedData: body }; return respond(route, state.profile.pendingChangeRequest); }
    if (method === 'POST' && endpoint === '/auth/profile/password') return respond(route, { changed: true, sessionsRevoked: true });
    if (endpoint === '/auth/profile/avatar' && ['POST', 'DELETE'].includes(method)) { state.profile.avatarUrl = method === 'DELETE' ? null : '/sarkisian-logo.png'; return respond(route, { avatarUrl: state.profile.avatarUrl }); }
    if (endpoint === '/storefront/addresses' && method === 'POST') { const address = { id: 'completion-address', ...body }; state.addresses.push(address); return respond(route, address); }
    if (endpoint === '/storefront/addresses/completion-address' && method === 'PATCH') { state.addresses[0] = { ...state.addresses[0], ...body }; return respond(route, state.addresses[0]); }
    if (endpoint === '/storefront/addresses/completion-address' && method === 'DELETE') { state.addresses = []; return respond(route, { deleted: true }); }
    if (endpoint === '/storefront/orders/COMPLETION-ORDER-1/repeat' && method === 'POST') { state.cart = { items: [{ quantity: 1, variant: { ...snapshots.products[0].variants[0], product: snapshots.products[0] } }], total: 780 }; return respond(route, { cart: state.cart, added: 1, unavailable: [{ productName: 'Недоступная позиция', reason: 'OUT_OF_STOCK' }] }); }
    if (endpoint === '/storefront/orders/COMPLETION-ORDER-1/cancel' && method === 'POST') { state.order = { ...state.order, status: 'CANCELLED' }; return respond(route, state.order); }
    if (/^\/storefront\/favorites\//.test(endpoint) && ['POST', 'DELETE'].includes(method)) return respond(route, { removed: method === 'DELETE' });
    if (endpoint === '/auth/logout' && method === 'POST') return respond(route, { success: true });
    safety.unexpectedMutations.push(`${method} ${endpoint}`);
    return respond(route, { message: 'Непредусмотренная операция заблокирована тестом.' }, 501);
  });
  // Routing disables HTTP cache; serviceWorkers are explicitly disabled at context creation.
  return state;
}

async function navigate(page, target) {
  await page.evaluate(async target => {
    const app = document.querySelector('#__nuxt')?.__vue_app__;
    const router = app?.config.globalProperties.$router;
    if (!router) throw Error('Маршрутизатор Nuxt ещё не готов');
    await router.push(target);
  }, target);
  await page.waitForFunction(target => location.pathname === target.split('?')[0], target);
  await page.waitForTimeout(150);
}
async function closed(page, drawer, trigger) {
  await page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' }); await page.waitForTimeout(850);
  assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), 'hidden', 'Не восстановлена прокрутка');
  if (trigger) assert(await trigger.evaluate(el => document.activeElement === el), 'Фокус не вернулся к кнопке открытия');
}
async function focusTrap(page, drawer) {
  const selector = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
  const boundary = async last => drawer.evaluate((root, { selector, last }) => { const items = [...root.querySelectorAll(selector)].filter(el => el.getClientRects().length); (last ? items.at(-1) : items[0]).focus(); }, { selector, last });
  const assertInside = async () => assert(await drawer.evaluate(el => el.contains(document.activeElement)), 'Фокус вышел за пределы открытой панели');
  await boundary(false); await page.keyboard.press('Shift+Tab'); await assertInside();
  await boundary(true); await page.keyboard.press('Tab'); await assertInside();
  for (let i = 0; i < 12; i++) { await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab'); await assertInside(); }
}

async function audit(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const visible = el => { const s = getComputedStyle(el); return !!el.getClientRects().length && s.display !== 'none' && s.visibility !== 'hidden'; };
    const scope = document.querySelector('.sb-glass-layer') || document.querySelector('.sb-storefront');
    if (!scope) throw Error('Не отрисована витрина');
    const text = [], icons = [], actions = [], fields = [], brokenImages = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const el = node.parentElement; if (!node.textContent.trim() || !visible(el) || el.closest('script,style,svg,.sb-visually-hidden')) continue;
      const s = getComputedStyle(el), editorial = el.closest('.sb-brand-story h2 em,.sb-club-banner__copy h2 em'), badge = el.closest('.sb-product-badge,.sb-mobile-nav b,.sb-header-actions b');
      if (!editorial && !s.fontFamily.includes('Montserrat') || !badge && parseFloat(s.fontSize) < 12) text.push({ text: node.textContent.trim().slice(0,60), font: s.fontFamily, size: s.fontSize });
      const rgb = s.color.match(/[\d.]+/g)?.slice(0,3).map(Number) || [];
      if (!badge && rgb.length === 3 && Math.max(...rgb) - Math.min(...rgb) > 30) text.push({ text: node.textContent.trim().slice(0,60), color: s.color });
    }
    for (const el of [...scope.querySelectorAll('button svg,.sb-primary svg,.sb-club-block-icon')].filter(visible)) { const s = getComputedStyle(el), rgb = s.color.match(/[\d.]+/g)?.slice(0,3).map(Number) || []; if (rgb.length === 3 && Math.max(...rgb)-Math.min(...rgb)>30) icons.push({ color:s.color, class:el.getAttribute('class') }); }
    for (const el of [...scope.querySelectorAll('.sb-primary,.sb-liquid-primary,.sb-section-head>a,.sb-brand-story a,.sa-button')].filter(visible)) { const s = getComputedStyle(el); const white = el.matches('.sb-club-about,.sb-secondary,.sa-secondary'); const club = el.matches('.sb-club-join'); if (s.fontSize!=='14px'||s.borderRadius!=='14px'||el.getBoundingClientRect().height<47.5||s.color!==(white?'rgb(21, 21, 21)':'rgb(255, 255, 255)')||(club?!s.backgroundImage.includes('gradient'):s.backgroundColor!==(white?'rgb(255, 255, 255)':'rgb(21, 21, 21)'))) actions.push({ text:el.textContent.trim().slice(0,50),color:s.color,background:s.backgroundColor,radius:s.borderRadius,size:s.fontSize,height:el.getBoundingClientRect().height }); }
    for (const el of [...scope.querySelectorAll('.sb-drawer-form input,.sa-form input')].filter(el=>visible(el)&&!['checkbox','file'].includes(el.type))) { const s=getComputedStyle(el);if(s.fontSize!=='16px'||s.borderRadius!=='14px'||Math.abs(el.getBoundingClientRect().height-48)>.5) fields.push({size:s.fontSize,radius:s.borderRadius,height:el.getBoundingClientRect().height}); }
    for (const img of [...scope.querySelectorAll('img')].filter(visible)) if (img.complete && !img.naturalWidth) brokenImages.push(img.getAttribute('src'));
    const header=document.querySelector('.sb-header')?.getBoundingClientRect(); const bounds=scope.matches('.sb-glass-layer')?[]:[...document.querySelectorAll('.sb-storefront main>*,.sb-footer')].filter(visible).flatMap(el=>{const r=el.getBoundingClientRect();return header&&(Math.abs(r.left-header.left)>1||Math.abs(r.right-header.right)>1)?[{class:el.className,left:r.left,right:r.right,headerLeft:header.left,headerRight:header.right}]:[]});
    return { width:innerWidth,documentWidth:document.documentElement.scrollWidth,text,icons,actions,fields,brokenImages,bounds };
  });
  await page.screenshot({ path: path.join(OUTPUT, label.replace(/[^a-z0-9-]/gi,'-')+'.png'), fullPage: true });
  assert(metrics.documentWidth<=metrics.width+1, `Переполнение: ${metrics.documentWidth}/${metrics.width}`);
  assert.deepEqual(metrics.text, [], 'Типографика/цвет текста: '+JSON.stringify(metrics.text));
  assert.deepEqual(metrics.icons, [], 'Цвет иконок: '+JSON.stringify(metrics.icons));
  assert.deepEqual(metrics.actions, [], 'Кнопки: '+JSON.stringify(metrics.actions));
  assert.deepEqual(metrics.fields, [], 'Текстовые поля: '+JSON.stringify(metrics.fields));
  assert.deepEqual(metrics.brokenImages, [], 'Не загрузились изображения: '+JSON.stringify(metrics.brokenImages));
  assert.deepEqual(metrics.bounds, [], 'Ширина блоков: '+JSON.stringify(metrics.bounds));
  return { width:metrics.width };
}

async function ssrChecks(snapshots) {
  if (UI_ONLY) { warnings.push('SSR-проверки явно пропущены (--ui-only). Это не полная приёмка.'); return; }
  const routes=['/','/catalog','/products/'+snapshots.products[0].slug,...CMS.map(slug=>'/'+slug),'/account','/catalog?category=gels&page=2&sort=price-asc&minPrice=1&utm_source=test'];
  for (const target of routes) await check('SSR '+target, async()=> {
    const response=await fetch(BASE+target,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,'HTTP '+response.status); const html=await response.text();
    const links=[...html.matchAll(/<link\b[^>]*>/gi)].filter(match=>/\brel=["']canonical["']/i.test(match[0]));
    const robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0]?.match(/content=["']([^"']*)/i)?.[1];
    assert(robots,'Robots отсутствует в исходном HTML');
    if (target==='/account') { assert(robots.includes('noindex'),'Личный кабинет индексируется');return {robots}; }
    assert.equal(links.length,1,'Canonical отсутствует или дублируется в исходном HTML');const canonical=links[0][0].match(/href=["']([^"']*)/i)?.[1]?.replace(/&amp;/g,'&');const url=new URL(canonical);assert(['http:','https:'].includes(url.protocol));
    assert.equal(url.pathname,target.split('?')[0]);assert(!url.hash);if(target.includes('?')){assert.equal(url.search,'?category=gels&page=2');assert(robots.includes('noindex'));}else assert.equal(url.search,'');
    if(snapshots.pages[target.slice(1)]?.reviewRequired)assert(robots.includes('noindex'),'Неутверждённый документ индексируется');return {canonical,robots};
  });
  for(const target of ['/completion-missing-page-acceptance','/products/completion-missing-product-acceptance'])await check('Настоящий SSR 404 '+target,async()=>{const response=await fetch(BASE+target,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(15000)});assert.equal(response.status,404,'Отсутствующая страница вернула HTTP '+response.status);});
}

async function authChecks(page,width,state) {
  const trigger=page.locator(width<=760?'.sb-mobile-nav button[aria-label="Личный кабинет"]':'.sb-header-actions button[aria-label="Личный кабинет"]');
  await check('Фокус входа и официальные логотипы '+width,async()=>{await trigger.click();const drawer=page.locator('.sb-auth-drawer');await drawer.waitFor();await focusTrap(page,drawer);const icons=await drawer.locator('.sb-social-buttons img').evaluateAll(items=>items.map(img=>({src:img.getAttribute('src'),loaded:img.complete&&img.naturalWidth>0,filter:getComputedStyle(img).filter})));assert.equal(icons.length,2);for(const icon of icons){assert(icon.loaded,'Не загружен логотип социального входа');assert.equal(icon.filter,'none','Цвет официального логотипа изменён фильтром');assert(/\/(vk|yandex)-id\.svg$/.test(icon.src));}await audit(page,'auth-'+width);await closed(page,drawer,trigger);});
  await check('Восстановление пароля '+width,async()=>{
    await trigger.click();const drawer=page.locator('.sb-auth-drawer');await drawer.getByRole('button',{name:'Забыли пароль?'}).click();
    for(const email of ['completion@example.test','missing@example.test']){await drawer.getByLabel('Email',{exact:true}).fill(email);await drawer.getByRole('button',{name:'Отправить ссылку',exact:true}).click();await drawer.getByRole('status').waitFor();assert.equal(await drawer.getByRole('status').innerText(),RESET_MESSAGE);assert(!/token=|https?:\/\/|isolated-completion-token/i.test(await drawer.innerText()));}
    assert.deepEqual(state.resetReplies.at(-1).reply,state.resetReplies.at(-2).reply);assert.deepEqual(Object.keys(state.resetReplies.at(-1).reply),['message']);await focusTrap(page,drawer);await drawer.getByRole('button',{name:'Вернуться ко входу'}).click();await closed(page,drawer,trigger);
  });
  await check('Регистрация с согласием '+width,async()=>{
    await trigger.click();const drawer=page.locator('.sb-auth-drawer');await drawer.getByRole('button',{name:'Регистрация',exact:true}).click();await drawer.getByLabel('Имя',{exact:true}).fill('Анна');await drawer.getByLabel('Фамилия',{exact:true}).fill('Тестовая');await drawer.getByLabel('Email',{exact:true}).fill('completion@example.test');await drawer.getByLabel('Телефон',{exact:true}).fill('+79990000000');await drawer.locator('input[autocomplete="new-password"]').fill('CompletionPass123');
    const count=state.calls.filter(call=>call.endpoint==='/auth/register').length;await drawer.getByRole('button',{name:'Создать аккаунт',exact:true}).click();await page.waitForTimeout(150);assert.equal(state.calls.filter(call=>call.endpoint==='/auth/register').length,count,'Регистрация отправлена без согласия');
    assert.equal(await drawer.locator('.sb-auth-consent a[href="/privacy"]').count(),1);assert.equal(await drawer.locator('.sb-auth-consent a[href="/oferta"]').count(),1);await drawer.locator('.sb-auth-consent input').check();await drawer.getByRole('button',{name:'Создать аккаунт',exact:true}).click();await drawer.waitFor({state:'hidden'});assert.equal(state.calls.filter(call=>call.endpoint==='/auth/register').length,count+1);
  });
}

async function drawerChecks(page,width) {
  const nav=page.locator(width<=760?'.sb-mobile-nav':'.sb-header');
  const panels=[['Каталог','.sb-catalog-drawer'],['Избранное','.sb-favorites-drawer'],...(width<=760?[['Меню','.sb-menu-drawer']]:[])];
  for(const[label,selector]of panels)await check('Клавиатура и закрытие: '+label+' '+width,async()=>{const trigger=nav.getByRole('button',{name:label,exact:true});await trigger.click();const drawer=page.locator(selector);await drawer.waitFor();assert.equal(await drawer.getAttribute('role'),'dialog');assert.equal(await drawer.getAttribute('aria-modal'),'true');await focusTrap(page,drawer);await audit(page,selector.slice(1)+'-'+width);await closed(page,drawer,trigger);});
}

async function accountChecks(page,width,state) {
  await navigate(page,'/account');await page.locator('.sa-ui h1').waitFor();
  const tab=name=>page.locator('.sb-account-nav').getByRole('button',{name,exact:true});const dialog=page.locator('.sa-drawer');
  await check('Кабинет обзор '+width,async()=>{assert(await page.locator('.sa-summary').innerText().then(text=>text.includes('42')));return audit(page,'account-overview-'+width);});
  await check('Адреса CRUD и подтверждение '+width,async()=>{
    await tab('Адреса').click();await page.getByRole('button',{name:'Добавить адрес'}).click();for(const[name,value]of [['Название адреса','Дом'],['Имя получателя','Анна Тестовая'],['Телефон получателя','+79990000000'],['Город','Москва'],['Улица','Тестовая'],['Дом','1'],['Квартира или офис','2']])await dialog.getByLabel(name,{exact:true}).fill(value);assert.equal(await dialog.getByText(/индекс/i).count(),0);await focusTrap(page,dialog);await dialog.getByRole('button',{name:'Сохранить адрес'}).click();await page.locator('.sa-address').waitFor();assert.equal(state.addresses.length,1);
    await page.locator('.sa-address').getByRole('button',{name:'Изменить'}).click();await dialog.getByLabel('Дом',{exact:true}).fill('3');await dialog.getByRole('button',{name:'Сохранить адрес'}).click();await page.locator('.sa-address').getByText('Москва, Тестовая, 3, кв. 2').waitFor();
    const deleted=state.calls.filter(call=>call.method==='DELETE').length;await page.locator('.sa-address').getByRole('button',{name:'Удалить',exact:true}).click();assert.equal(state.calls.filter(call=>call.method==='DELETE').length,deleted);await dialog.getByRole('button',{name:'Отмена',exact:true}).click();await page.locator('.sa-address').getByRole('button',{name:'Удалить',exact:true}).click();await dialog.getByRole('button',{name:'Удалить адрес',exact:true}).click();await page.getByText('Адрес удалён.',{exact:true}).waitFor();assert.equal(state.addresses.length,0);
  });
  await check('Детали, повтор и отмена заказа '+width,async()=>{
    await tab('Мои заказы').click();await page.locator('.sa-order').click();await dialog.locator('.sa-order-items').waitFor();await dialog.getByRole('button',{name:'Повторить заказ',exact:true}).click();await dialog.getByText('Доступные товары добавлены в корзину.').waitFor();await dialog.getByText('Недоступная позиция — Нет в наличии').waitFor();await dialog.getByRole('button',{name:'Отменить заказ',exact:true}).click();assert.equal(state.order.status,'NEW');await dialog.getByRole('button',{name:'Подтвердить отмену',exact:true}).click();await dialog.getByText('16.09.2026 · Отменён').waitFor();await closed(page,dialog);assert(state.calls.filter(call=>call.endpoint.includes('/storefront/orders/')).every(call=>call.endpoint.includes('COMPLETION-ORDER-1')));
  });
  await check('Профиль, фото, пароль '+width,async()=>{
    await tab('Мои данные').click();await page.getByLabel('Город',{exact:true}).fill('Казань');await page.getByRole('button',{name:'Сохранить настройки'}).click();await page.getByText('Настройки сохранены.').waitFor();assert.equal(state.profile.city,'Казань');await page.getByLabel('Имя',{exact:true}).fill('Мария');await page.getByRole('button',{name:'Запросить изменение'}).click();await page.getByText('Запрос на изменение данных ожидает подтверждения.').waitFor();assert.equal(state.profile.firstName,'Анна');
    await page.locator('input[type="file"]').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])});await page.getByText('Фото обновлено.').waitFor();await page.getByRole('button',{name:'Удалить фото',exact:true}).click();await dialog.getByRole('button',{name:'Удалить фото',exact:true}).click();await page.getByText('Фото удалено.',{exact:true}).waitFor();
    await page.getByLabel('Текущий пароль').fill('OldCompletion123');await page.getByLabel('Новый пароль',{exact:true}).fill('NewCompletion123');await page.getByLabel('Повторите новый пароль').fill('Different123');await page.getByRole('button',{name:'Изменить пароль'}).click();await page.getByText('Новые пароли не совпадают.').waitFor();assert.equal(state.calls.filter(call=>call.endpoint==='/auth/profile/password').length,0);await page.getByLabel('Повторите новый пароль').fill('NewCompletion123');await page.getByRole('button',{name:'Изменить пароль'}).click();await page.getByRole('heading',{name:'Личный кабинет',exact:true}).waitFor();assert(!(await page.context().cookies()).some(cookie=>cookie.name==='sb-customer-token'&&cookie.value));
  });
  assert(state.calls.filter(call=>!['GET','HEAD'].includes(call.method)).every(call=>!call.body||!call.body.includes('postalCode')));
}

async function main() {
  fs.mkdirSync(OUTPUT,{recursive:true});
  let snapshots={products:Array.from({length:8},(_,index)=>fixtureProduct(index)),content:fixtureContent(),facets:{categories:[{slug:'gels',nameRu:'Гели'}],purposes:['Моделирование'],features:['Густой'],price:{min:780,max:1995}},pages:Object.fromEntries(CMS.map(slug=>[slug,fixturePage(slug)]))};
  if(!UI_ONLY) await check('Публичный GET-снимок каталога',async()=>{const catalog=await publicRead('/products?limit=24');assert(catalog.items?.length,'Каталог пуст');snapshots.products=catalog.items; snapshots.products[0]=await publicRead('/products/'+catalog.items[0].slug);snapshots.content=await publicRead('/products/storefront-content');snapshots.facets=await publicRead('/products/filters');for(const slug of CMS)snapshots.pages[slug]=await publicRead('/products/storefront-pages/'+slug);return{products:catalog.items.length};});
  await ssrChecks(snapshots);
  const browser=await chromium.launch({executablePath:process.env.STOREFRONT_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    for(const width of WIDTHS){
      const context=await browser.newContext({viewport:{width,height:960},hasTouch:width<=760,isMobile:width<=760,serviceWorkers:'block'});const state=await firewall(context,snapshots);const page=await context.newPage();activePage=page;page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(30000);page.on('pageerror',error=>failures.push({name:'Ошибка браузера '+width,message:error.message}));
      await check('Загрузка витрины '+width,async()=>{await page.goto(BASE+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$router);});
      for(const target of ['/','/catalog','/products/'+snapshots.products[0].slug,...CMS.map(slug=>'/'+slug)])await check('Дизайн '+target+' '+width,async()=>{await navigate(page,target);await page.locator('.sb-storefront').waitFor();if(CMS.includes(target.slice(1)))await page.locator('.sb-content-hero h1').waitFor();return audit(page,(target==='/'?'home':target.slice(1))+'-'+width);});
      await navigate(page,'/catalog');
      if(width<=760)await check('Нижнее меню и фильтры '+width,async()=>{
        const nav=page.locator('.sb-mobile-nav');assert.deepEqual(await nav.locator(':scope>button').evaluateAll(items=>items.map(el=>el.getAttribute('aria-label'))),['Каталог','Личный кабинет','Избранное','Корзина','Меню']);const menuStyle=await nav.locator('button').last().evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));assert.equal(menuStyle.background,'rgb(21, 21, 21)');assert.equal(menuStyle.color,'rgb(255, 255, 255)');
        const button=page.locator('.sb-filter-mobile');assert(await button.evaluate(el=>Math.abs(el.getBoundingClientRect().width-el.parentElement.getBoundingClientRect().width)<=1),'Кнопка фильтров не на всю ширину');await button.click();const drawer=page.locator('.sb-catalog-filter-drawer');await focusTrap(page,drawer);const reset=drawer.locator('.sb-filter-reset');assert.equal(await reset.locator('.sb-filter-reset-cross').count(),1,'У сброса должен быть крестик');const resetStyle=await reset.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));assert.equal(resetStyle.background,'rgb(255, 255, 255)');assert.equal(resetStyle.color,'rgb(21, 21, 21)');await closed(page,drawer,button);
      });
      await check('Каталог: ошибка сети и повтор '+width,async()=>{state.catalogFailure=true;await navigate(page,'/catalog?search=completion-network-failure');const alert=page.locator('.sb-catalog-results [role="alert"]');await alert.waitFor();state.catalogFailure=false;await alert.getByRole('button',{name:'Повторить',exact:true}).click();await page.locator('.sb-product-card').first().waitFor();});
      await drawerChecks(page,width);
      await authChecks(page,width,state);
      if(width!==320){await check('Кабинет: повтор загрузки после ошибки '+width,async()=>{state.profileFailure=true;await navigate(page,'/account');await page.locator('.sa-ui [role="alert"]').waitFor();state.profileFailure=false;await page.locator('.sa-ui').getByRole('button',{name:'Повторить загрузку'}).click();await page.locator('.sa-ui h1').waitFor();});await accountChecks(page,width,state);}
      await check('Нет фото: аккуратная заглушка '+width,async()=>{await navigate(page,'/catalog');if(!snapshots.products.some(product=>!product.images?.length&&product.slug.startsWith('completion-')))return{skipped:'Публичный снимок не содержит контрольной заглушки; проверяется в --ui-only.'};await page.locator('.sb-product-placeholder').first().waitFor();});
      await check('Не загрузилось фото: резервное изображение '+width,async()=>{state.brokenImage=true;await navigate(page,'/catalog?search=completion-broken-image');await page.locator('.sb-product-card').first().waitFor();await page.waitForTimeout(250);const broken=await page.locator('.sb-product-card').first().evaluate(el=>[...el.querySelectorAll('img')].some(img=>img.complete&&!img.naturalWidth));assert(!broken,'Карточка показывает сломанное изображение: нужен обработчик ошибки фото');state.brokenImage=false;});
      await context.close();activePage=null;
    }
  }finally{await browser.close();}
  assert.equal(safety.dispatchedApiMutations,0);await check('Сетевой предохранитель',async()=>{assert.deepEqual(safety.unexpectedMutations,[],'Непредусмотренные операции: '+JSON.stringify(safety.unexpectedMutations));assert(!safety.blockedExternal.some(entry=>entry.startsWith('document:')),'Попытка перехода к внешнему провайдеру');return{mockedMutations:safety.mockedMutations,dispatchedApiMutations:0};});
  if(safety.blockedExternal.length)warnings.push('Заблокированы внешние зависимости: '+JSON.stringify([...new Set(safety.blockedExternal)]));
  const report={completeAcceptance:!UI_ONLY,results,failures,warnings,safety};fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:results.length,passed:results.filter(item=>item.ok).length,failures,warnings,mockedMutations:safety.mockedMutations,dispatchedApiMutations:0,report:path.join(OUTPUT,'report.json')},null,2));if(failures.length)process.exitCode=1;
}
main().catch(error=>{console.error('Проверка прервана:',error);failures.push({name:'Прерывание проверки',message:error.message||String(error)});fs.mkdirSync(OUTPUT,{recursive:true});fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify({completeAcceptance:!UI_ONLY,results,failures,warnings,safety},null,2));process.exitCode=1;});
