const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`page: ${error.message}`));
  page.on('response', response => {
    if (response.url().includes('/api/v1/') && response.status() >= 400) problems.push(`api: ${response.status()} ${response.url()}`);
  });
  const output = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });

  await page.goto('http://localhost:3001/b2b-login', { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill('b2b-demo@sarkisianbrand.ru');
  await page.locator('input[type="password"]').fill('SarkisianB2B!2026');
  await Promise.all([
    page.waitForURL(url => url.pathname === '/b2b', { timeout: 15000 }),
    page.getByRole('button', { name: /Войти в кабинет/ }).click(),
  ]);
  await page.getByRole('heading', { name: 'Обзор бизнеса' }).waitFor({ state: 'visible' });
  await page.locator('.hero').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(output, 'b2b-dashboard.png'), fullPage: true });

  await page.goto('http://localhost:3001/b2b?section=clients', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Мои клиенты' }).waitFor({ state: 'visible' });
  const clientRows = await page.locator('.table.clients .row:not(.labels)').count();
  await page.screenshot({ path: path.join(output, 'b2b-clients.png'), fullPage: true });

  await page.goto('http://localhost:3001/b2b?section=calendar', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Записи' }).waitFor({ state: 'visible' });
  const bookingRows = await page.locator('.booking-list .booking').count();
  await page.screenshot({ path: path.join(output, 'b2b-calendar.png'), fullPage: true });

  await page.goto('http://localhost:3001/b2b?section=catalog', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Закупить товары' }).waitFor({ state: 'visible' });
  const products = await page.locator('.product-grid .product').count();
  await page.screenshot({ path: path.join(output, 'b2b-catalog.png'), fullPage: true });

  console.log(JSON.stringify({ success: problems.length === 0, clientRows, bookingRows, products, problems }, null, 2));
  await browser.close();
  if (problems.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
