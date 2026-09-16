const { chromium } = require('playwright-core');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const path = require('path');
const fs = require('fs');
async function main() {
  const prisma = new PrismaClient();
  let browser;
  const slug = `test-page-${Date.now()}`;
  let headers;
  const problems = [];
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
    const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, 'sarkisian-local-dev-secret', { expiresIn: '15m' });
    headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const api = 'http://localhost:3000/api/v1';
    const pages = await fetch(`${api}/admin/storefront/pages`, { headers }).then(r => r.json());
    const expected = ['about', 'delivery', 'contacts', 'privacy', 'oferta', 'returns'];
    if (!expected.every(slug => pages.some(page => page.slug === slug && page.blocks.length))) throw new Error('Не все страницы созданы и заполнены');
    const payload = { slug, title: 'Проверка страницы', eyebrow: 'Тест', lead: 'Вводный текст', seoDescription: 'Описание', isActive: true, reviewRequired: false, blocks: [{ id: 'test', title: 'Первый блок', body: 'Первый абзац\n<img src=x onerror="window.bad=1">' }] };
    const invalid = await fetch(`${api}/admin/storefront/pages`, { method: 'POST', headers, body: JSON.stringify({ ...payload, slug: 'catalog' }) });
    if (invalid.status !== 400) throw new Error('Создание страницы на системном адресе не отклонено');
    const invalidBlocks = await fetch(`${api}/admin/storefront/pages`, { method: 'POST', headers, body: JSON.stringify({ ...payload, blocks: [{ id: 'invalid id', title: 'Тест', body: 'Тест' }] }) });
    if (invalidBlocks.status !== 400) throw new Error('Валидация вложенных блоков не сработала');
    const created = await fetch(`${api}/admin/storefront/pages`, { method: 'POST', headers, body: JSON.stringify(payload) }).then(r => r.json());
    if (!created.revision) throw new Error(`Не удалось создать страницу: ${JSON.stringify(created)}`);
    const update = { ...payload, revision: created.revision }; delete update.slug;
    const savedResponse = await fetch(`${api}/admin/storefront/pages/${slug}`, { method: 'PATCH', headers, body: JSON.stringify(update) });
    if (!savedResponse.ok) throw new Error('Не удалось сохранить страницу');
    const stale = await fetch(`${api}/admin/storefront/pages/${slug}`, { method: 'PATCH', headers, body: JSON.stringify(update) });
    if (stale.status !== 409) throw new Error('Конкурентное редактирование не защищено');
    const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER_B2C', isActive: true } });
    const customerToken = jwt.sign({ sub: customer.id, email: customer.email, role: customer.role }, 'sarkisian-local-dev-secret', { expiresIn: '5m' });
    const forbidden = await fetch(`${api}/admin/storefront/pages`, { headers: { authorization: `Bearer ${customerToken}` } });
    if (forbidden.status !== 403) throw new Error('Клиент получил доступ к редактору');
    browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    const page = await browser.newPage({ viewport: { width: 1536, height: 960 } });
    page.on('pageerror', error => problems.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('console.time')) problems.push(message.text()); });
    const screenshots = path.join(__dirname, '..', '.screenshots'); fs.mkdirSync(screenshots, { recursive: true });
    const layouts = [];
    for (const item of expected) {
      const response = await page.goto(`http://localhost:3001/${item}`, { waitUntil: 'networkidle' });
      if (response.status() !== 200) problems.push(`${item}: ${response.status()}`);
      const h1 = await page.locator('.sb-content-hero h1').count();
      if (h1 !== 1 || !(await page.locator('.sb-content-block').count())) problems.push(`${item}: missing content`);
      if (['privacy', 'oferta', 'returns'].includes(item) && (await page.locator('meta[name="robots"]').getAttribute('content')) !== 'noindex, nofollow') problems.push(`${item}: draft is indexable`);
      if (item === 'about' || item === 'privacy') await page.screenshot({ path: path.join(screenshots, `storefront-${item}-desktop.png`), fullPage: true });
      for (const width of [360, 390, 760, 1024, 1536]) {
        await page.setViewportSize({ width, height: 960 });
        const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
        layouts.push({ page: item, ...layout });
        if (layout.documentWidth > width + 1) problems.push(`${item}: overflow ${width}`);
      }
    }
    await page.goto(`http://localhost:3001/${slug}`, { waitUntil: 'networkidle' });
    if (await page.locator('.sb-content-block img').count() || await page.evaluate(() => Boolean(window.bad))) problems.push('HTML из CMS исполнился');
    for (const url of ['/privacy', '/oferta', '/returns']) if (!(await page.locator(`.sb-footer__bottom a[href="${url}"]`).count())) problems.push(`Footer link missing: ${url}`);
    const menu = await fetch(`${api}/products/storefront-content`).then(r => r.json());
    if (!['/about', '/delivery', '/contacts'].every(url => menu.menuItems.some(item => item.url === url))) problems.push('Главное меню не переведено на страницы');
    const editorPage = await browser.newPage({ viewport: { width: 1536, height: 960 } });
    await editorPage.addInitScript(({ token, admin }) => { localStorage.setItem('sarkisian-workspace-token', token); localStorage.setItem('sarkisian-workspace-user', JSON.stringify(admin)); }, { token, admin: { id: admin.id, email: admin.email, role: admin.role, firstName: admin.firstName, lastName: admin.lastName } });
    editorPage.on('pageerror', error => problems.push(error.message));
    await editorPage.goto('http://localhost:3001/admin-workspace?section=pages', { waitUntil: 'networkidle' });
    await editorPage.locator('.sb-cms-list button').filter({ hasText: `/${slug}` }).click();
    await editorPage.getByLabel('Заголовок страницы', { exact: true }).fill('Проверка редактора');
    const saving = editorPage.waitForResponse(r => r.url().endsWith(`/admin/storefront/pages/${slug}`) && r.request().method() === 'PATCH');
    await editorPage.getByRole('button', { name: 'Сохранить страницу', exact: true }).click();
    const uiSaved = await (await saving).json();
    if (uiSaved.title !== 'Проверка редактора') problems.push('Редактор не сохранил заголовок');
    await editorPage.screenshot({ path: path.join(screenshots, 'storefront-pages-editor.png'), fullPage: true });
    const hiddenPayload = { ...update, revision: uiSaved.revision, title: uiSaved.title, isActive: false };
    await fetch(`${api}/admin/storefront/pages/${slug}`, { method: 'PATCH', headers, body: JSON.stringify(hiddenPayload) });
    if ((await fetch(`${api}/products/storefront-pages/${slug}`)).status !== 404) problems.push('Скрытая страница доступна публично');
    console.log(JSON.stringify({ pages: expected, staleRevisionStatus: stale.status, clientAccess: forbidden.status, layouts, problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally {
    if (headers) await fetch(`http://localhost:3000/api/v1/admin/storefront/pages/${slug}`, { method: 'DELETE', headers });
    if (browser) await browser.close();
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
