/* All API calls are intercepted fixtures; no customer records or payments. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = new URL(process.env.STOREFRONT_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname));
const output = path.join(__dirname, '../.screenshots/lms-storefront'); fs.mkdirSync(output, { recursive: true });
const courseId = '10000000-0000-4000-8000-000000000001', lessonId = '20000000-0000-4000-8000-000000000001';
const assetId = '30000000-0000-4000-8000-000000000001';
const course = { id: courseId, titleRu: 'Практический курс', description: 'Материалы для мастеров.', tariffs: [{ id: 'tariff', title: 'Базовый', price: '1200.00', accessDays: 30 }], modules: [{ id: 'module', title: 'Первый модуль', sortOrder: 0, lessons: [{ id: lessonId, title: 'Введение', kind: 'TEXT', sortOrder: 0, isPreview: true }] }] };
const material = { ...course.modules[0].lessons[0], content: 'Содержание урока', videoUrl: null, presentationUrl: null };
async function purchaseRetry() {
  const browser = await chromium.launch(), context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage(), calls = [], bad = [], token = 'fixture-course-buyer';
  await context.addCookies([{ name: 'sb-customer-token', value: token, url: origin }]);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname.replace(/^\/api\/v1/, '');
    if (url.pathname.startsWith('/api/v1/')) {
      const reply = (json, status = 200) => route.fulfill({ json, status });
      if (endpoint === '/products/storefront-content') return reply({ settings: {}, categories: [], banners: [], socialLinks: [], menuItems: [] });
      if (endpoint === '/cart' || endpoint === '/storefront/cart/bind') return reply({ items: [], total: 0 });
      if (endpoint === '/auth/me') return reply({ id: 'buyer', role: 'CUSTOMER_B2C', firstName: 'Тест', email: 'buyer@example.invalid' });
      if (endpoint === '/storefront/favorites') return reply([]);
      if (endpoint === '/lms/certificates/my' && req.method() === 'GET') return reply([]);
      if (endpoint === '/payments/providers') return reply({ providers: [] });
      if (endpoint === '/orders/SB-C-8ED571E4-0F14-4FAC-A435-AC4F88754D80') return reply({ orderNumber: 'SB-C-8ED571E4-0F14-4FAC-A435-AC4F88754D80', sourceChannel: 'COURSE', status: 'NEW', paymentStatus: 'PENDING', finalAmount: 1200, items: [], reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now()+1800000).toISOString() });
      if (endpoint === `/lms/catalog/${courseId}`) return reply({ ...course, purchasingAvailable: true, liveAvailable: false });
      if (endpoint === '/lms/my/purchases' && req.method() === 'POST') {
        assert.equal(req.headers().authorization, `Bearer ${token}`);
        calls.push({ key: req.headers()['idempotency-key'], body: req.postDataJSON() });
        return calls.length === 1 ? reply({ message: 'Временная ошибка' }, 503) : reply({ orderNumber: 'SB-C-8ED571E4-0F14-4FAC-A435-AC4F88754D80' });
      }
      bad.push(`Unexpected ${req.method()} ${endpoint}`); return route.fulfill({ status: 403, json: {} });
    }
    if (url.origin === origin && url.pathname.startsWith('/orders/SB-C-')) return route.fulfill({ contentType: 'text/html', body: '<main>Тестовый заказ курса</main>' });
    if (url.origin !== origin || !['GET','HEAD'].includes(req.method())) { bad.push('Blocked external'); return route.abort(); }
    return route.continue();
  });
  try {
    await page.goto(`${origin}/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => ['Повторить', 'Оформить курс'].includes(button.textContent.trim())));
    if (await page.getByRole('button', { name:'Повторить', exact:true }).count()) await page.getByRole('button', { name:'Повторить', exact:true }).click();
    await page.getByRole('button', { name:'Оформить курс' }).click();
    await page.getByRole('alert').filter({ hasText:'Подтвердите условия' }).waitFor();
    assert.equal(calls.length, 0, 'No purchase without consent');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name:'Оформить курс' }).click();
    await page.getByRole('alert').filter({ hasText:'Временная ошибка' }).waitFor();
    await page.getByRole('button', { name:'Оформить курс' }).click();
    await page.waitForURL('**/orders/SB-C-8ED571E4-0F14-4FAC-A435-AC4F88754D80');
    assert.equal(calls.length, 2); assert.equal(calls[0].key, calls[1].key); assert.deepEqual(calls[0].body, calls[1].body);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('sb-course-purchase:buyer:10000000-0000-4000-8000-000000000001:tariff')), null, 'Successful order must not prevent a later renewal');
    assert.equal(calls[0].body.acceptedTerms, true); assert.equal(calls[0].body.expectedPrice, 1200);
    assert.deepEqual(bad, []); console.log('Course purchase consent, uncertain retry and stable idempotency key PASS');
  } finally { await context.close(); await browser.close(); }
}
async function test(width) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage(), bad = [], requests = [];
  const token = 'lms-fixture-token';
  page.on('pageerror', error => bad.push(error.message));
  await context.addCookies([{ name: 'sb-customer-token', value: token, url: origin }]);
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/v1/')) {
      const endpoint = url.pathname.slice('/api/v1'.length); requests.push(`${req.method()} ${endpoint}`);
      const reply = json => route.fulfill({ json });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (endpoint === '/products/storefront-content') return reply({ settings: {}, categories: [], banners: [], socialLinks: [], menuItems: [] });
      if (endpoint === '/cart') return reply({ items: [], total: 0 });
      if (endpoint === '/storefront/cart/bind' && req.method() === 'POST') return reply({ items: [], total: 0 });
      if (endpoint === '/auth/me') return reply({ id: 'student', role: 'CUSTOMER_B2C', firstName: 'Тест', email: 'student@example.invalid' });
      if (endpoint === '/storefront/favorites') return reply([]);
      if (endpoint === `/lms/media/${assetId}` && req.method() === 'GET') return route.fulfill({contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});
      if (endpoint === `/lms/certificates/course/${courseId}` && req.method() === 'GET') return reply(null);
      if (endpoint === '/lms/certificates/my' && req.method() === 'GET') return reply([]);
      if (endpoint === '/lms/catalog') { const page = Number(url.searchParams.get('page') || 1); return reply({ items: [page === 1 ? course : { ...course, titleRu: 'Второй курс' }], page, pages: 2, purchasingAvailable: false, liveAvailable: false }); }
      if (endpoint === `/lms/catalog/${courseId}`) return reply({ ...course, purchasingAvailable: false, liveAvailable: false });
      if (endpoint === `/lms/catalog/${courseId}/preview/${lessonId}`) return reply(material);
      if (endpoint.startsWith('/lms/my')) {
        assert.equal(req.headers().authorization, `Bearer ${token}`, 'Private materials need the student token');
        if (endpoint === '/lms/my') return reply([{ id: 'enrollment', courseId, progress: 0, isCompleted: false, accessExpiresAt: null, course }]);
        if (endpoint === `/lms/my/${courseId}`) return reply({ id: 'enrollment', courseId, progress: 0, isCompleted: false, accessExpiresAt: null, course, lessonsProgress: [] });
        if (endpoint === `/lms/my/${courseId}/lessons/${lessonId}/assets`) return reply([{id:assetId,lessonId,filename:'Материалы.pdf',mimeType:'application/pdf',size:12000,createdAt:new Date().toISOString()}]);
        if (endpoint === `/lms/my/${courseId}/lessons/${lessonId}/quiz`) return reply(null);
        if (endpoint === `/lms/my/${courseId}/lessons/${lessonId}/assets/${assetId}/session` && req.method()==='POST') return route.fulfill({json:{url:`/api/v1/lms/media/${assetId}`,expiresIn:300},headers:{'Set-Cookie':`fixture_asset=ok; HttpOnly; SameSite=Strict; Path=/api/v1/lms/media/${assetId}`}});
        if (endpoint === `/lms/my/${courseId}/lessons/${lessonId}` && req.method() === 'GET') return reply(material);
        if (endpoint === `/lms/my/${courseId}/lessons/${lessonId}/complete` && req.method() === 'POST') return reply({ progress: 100, isCompleted: true });
      }
      bad.push(`Unexpected ${req.method()} ${endpoint}`); return route.fulfill({ status: 403, json: {} });
    }
    if (url.origin !== origin || !['GET','HEAD'].includes(req.method())) { bad.push(`Blocked external ${req.method()}`); return route.abort(); }
    return route.continue();
  });
  try {
    await page.goto(`${origin}/courses`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.site-course-card h3 a') || [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Повторить'));
    if (await page.getByRole('button', { name:'Повторить', exact:true }).count()) await page.getByRole('button', { name:'Повторить', exact:true }).click();
    await page.getByRole('heading', { name: 'Практический курс' }).waitFor();
    await page.screenshot({ path: path.join(output, `${width}-catalog.png`), fullPage: true });
    await page.getByRole('button', { name:'Далее', exact:true }).click();
    await page.getByRole('heading', { name:'Второй курс' }).waitFor();
    await page.getByRole('button', { name:'Назад', exact:true }).click();
    await page.getByRole('heading', { name:'Практический курс' }).waitFor();
    await page.getByRole('link', { name:'Практический курс', exact:true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('h3')].some(node => node.textContent.trim() === 'Базовый') || [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Повторить'));
    if (await page.getByRole('button', { name:'Повторить', exact:true }).count()) await page.getByRole('button', { name:'Повторить', exact:true }).click();
    await page.getByText('Базовый', { exact:true }).waitFor();
    await page.getByText('Покупка пока недоступна').waitFor();
    await page.getByRole('button', { name:'Посмотреть' }).click();
    await page.getByText('Содержание урока').waitFor();
    await page.goto(`${origin}/courses/my/${courseId}`, { waitUntil:'domcontentloaded' });
    await page.getByRole('button', { name:'Введение' }).click();
    await page.getByText('Содержание урока').waitFor();
    await page.getByText('Материалы.pdf').waitFor(); await page.getByRole('button',{name:'Открыть',exact:true}).click();
    await page.getByRole('link',{name:'Скачать презентацию PDF'}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Скачать презентацию PDF'}).getAttribute('href'),`/api/v1/lms/media/${assetId}`);
    await page.screenshot({ path: path.join(output, `${width}-assets.png`), fullPage: true });
    await page.getByRole('button', { name:'Отметить пройденным' }).click();
    await page.getByRole('button', { name:'Урок пройден' }).waitFor();
    await page.screenshot({ path: path.join(output, `${width}-lesson.png`), fullPage: true });
    assert.ok(requests.some(item => item.endsWith('/complete')));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'No page overflow');
    assert.deepEqual(bad, []);
    console.log(`${width}px course catalog, preview, private lesson and progress PASS`);
  } finally { await context.close(); await browser.close(); }
}
(async () => { for (const width of [1440, 390]) await test(width); await purchaseRetry(); })().catch(error => { console.error(error); process.exitCode = 1; });
