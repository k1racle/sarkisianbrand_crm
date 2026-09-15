const { chromium } = require('playwright-core');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const dotenv = require('../../backend/node_modules/dotenv');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const prisma = new PrismaClient();
let product;
let trashEntry;

function sessionUser(user) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, avatarUrl: user.avatarStorageKey ? `/api/v1/auth/avatar/${user.id}` : null };
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN', isActive: true } });
  const b2bUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER_B2B', isActive: true } });
  product = await prisma.product.create({ data: { sku: `VISUAL-TRASH-${Date.now()}`, nameRu: 'Тест корзины интерфейса', slug: `visual-trash-${Date.now()}`, basePrice: 100, isActive: false } });
  trashEntry = await prisma.dataTrashEntry.create({ data: { entityType: 'PRODUCT', entityId: product.id, displayName: product.nameRu, snapshot: { id: product.id, nameRu: product.nameRu }, previousState: { isActive: true }, dependencySummary: [], actorId: admin.id, reason: 'Визуальная проверка интерфейса', purgeAfter: new Date(Date.now() + 30 * 86400000) } });

  const adminToken = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 620 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('response', (response) => { if (response.url().includes('/api/v1/') && response.status() >= 400 && !response.url().includes('/auth/avatar/')) problems.push(`api: ${response.status()} ${response.url()}`); });
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sarkisian-workspace-token', token);
    localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
  }, { token: adminToken, user: sessionUser(admin) });
  const output = path.join(__dirname, '..', '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });

  await page.goto('http://localhost:3001/system-settings?section=trash', { waitUntil: 'domcontentloaded' });
  await page.locator('.trash-workspace').waitFor();
  await page.locator('.trash-row:not(.head)').filter({ hasText: product.nameRu }).waitFor();
  const ecosystemRail = await page.evaluate(() => {
    const nav = document.querySelector('.console-rail nav');
    const bottom = document.querySelector('.console-rail .rail-bottom');
    const rail = document.querySelector('.console-rail');
    const box = bottom?.getBoundingClientRect();
    return { navScrollHeight: nav?.scrollHeight || 0, navClientHeight: nav?.clientHeight || 0, bottom: box?.bottom || 0, viewport: innerHeight, railHeight: rail?.getBoundingClientRect().height || 0 };
  });
  if (ecosystemRail.navScrollHeight <= ecosystemRail.navClientHeight) problems.push('layout: меню экосистемы не получило собственную прокрутку на малой высоте');
  if (ecosystemRail.bottom > ecosystemRail.viewport + 1) problems.push('layout: нижний блок боковой панели вышел за экран');
  const ecosystemScroll = await page.evaluate(() => { const nav = document.querySelector('.console-rail nav'); if (nav) nav.scrollTop = nav.scrollHeight; return nav?.scrollTop || 0; });
  if (ecosystemScroll <= 0) problems.push('layout: меню экосистемы не прокручивается');
  await page.screenshot({ path: path.join(output, 'ecosystem-trash-short-viewport.png'), fullPage: false });
  await page.locator('.trash-row:not(.head)').filter({ hasText: product.nameRu }).click();
  await page.locator('.trash-drawer').waitFor();
  await page.screenshot({ path: path.join(output, 'ecosystem-trash-drawer.png'), fullPage: false });

  let b2bRail = null;
  if (b2bUser) {
    const b2bToken = jwt.sign({ sub: b2bUser.id, role: b2bUser.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('sarkisian-b2b-token', token);
      localStorage.setItem('sarkisian-b2b-user', JSON.stringify(user));
    }, { token: b2bToken, user: sessionUser(b2bUser) });
    await page.goto('http://localhost:3001/b2b', { waitUntil: 'domcontentloaded' });
    await page.locator('.b2b-rail nav').waitFor();
    b2bRail = await page.evaluate(() => {
      const nav = document.querySelector('.b2b-rail nav');
      const bottom = document.querySelector('.b2b-rail .bottom');
      const box = bottom?.getBoundingClientRect();
      return { navScrollHeight: nav?.scrollHeight || 0, navClientHeight: nav?.clientHeight || 0, bottom: box?.bottom || 0, viewport: innerHeight };
    });
    if (b2bRail.navScrollHeight <= b2bRail.navClientHeight) problems.push('layout: меню B2B не получило собственную прокрутку на малой высоте');
    if (b2bRail.bottom > b2bRail.viewport + 1) problems.push('layout: профиль B2B вышел за экран');
    const b2bScroll = await page.evaluate(() => { const nav = document.querySelector('.b2b-rail nav'); if (nav) nav.scrollTop = nav.scrollHeight; return nav?.scrollTop || 0; });
    if (b2bScroll <= 0) problems.push('layout: меню B2B не прокручивается');
    b2bRail.scrollTop = b2bScroll;
    await page.screenshot({ path: path.join(output, 'b2b-short-sidebar.png'), fullPage: false });
  }

  console.log(JSON.stringify({ ok: problems.length === 0, ecosystemRail: { ...ecosystemRail, scrollTop: ecosystemScroll }, b2bRail, problems }, null, 2));
  await browser.close();
  if (problems.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (trashEntry) await prisma.dataTrashEntry.deleteMany({ where: { id: trashEntry.id } });
  if (product) await prisma.product.deleteMany({ where: { id: product.id } });
  await prisma.$disconnect();
});
