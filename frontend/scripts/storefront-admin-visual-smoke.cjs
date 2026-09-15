const { chromium } = require('playwright-core');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) throw new Error('Не найдена активная учётная запись администратора');
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, 'sarkisian-local-dev-secret', { expiresIn: '15m' });
  const user = { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role };
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const output = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });

  const initial = await fetch('http://localhost:3000/api/v1/admin/storefront', { headers }).then(response => response.json());
  const testBanner = await fetch('http://localhost:3000/api/v1/admin/storefront/banners', {
    method: 'POST', headers,
    body: JSON.stringify({ imageUrl: '/storefront/hero.jpg', title: 'Проверка витрины', isActive: false, sortOrder: 999 }),
  }).then(response => response.json());
  if (!testBanner.id) throw new Error(`Не удалось создать тестовый баннер: ${JSON.stringify(testBanner)}`);
  await fetch(`http://localhost:3000/api/v1/admin/storefront/banners/${testBanner.id}`, { method: 'DELETE', headers });

  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('console.time')) problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`page: ${error.message}`));
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sarkisian-workspace-token', token);
    localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
  }, { token, user });

  await page.goto('http://localhost:3001/admin-workspace?section=appearance', { waitUntil: 'domcontentloaded' });
  await page.locator('.appearance-workspace').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  const state = {
    announcement: await page.locator('.appearance-form textarea').inputValue(),
    banners: await page.locator('.banner-admin-card').count(),
    categories: await page.locator('.category-admin-grid > section').count(),
  };
  if (!state.announcement.startsWith('SARKISIAN BRAND')) problems.push('Не загрузился текст верхней строки');
  if (!state.banners) problems.push('Не загрузился список баннеров');
  if (!state.categories) problems.push('Не загрузился список категорий');
  await page.screenshot({ path: path.join(output, 'storefront-admin-appearance.png') });
  await browser.close();
  await prisma.$disconnect();
  console.log(JSON.stringify({ apiBanners: initial.banners?.length || 0, testBannerCrud: true, state, problems }, null, 2));
  if (problems.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
