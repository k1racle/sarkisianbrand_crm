const { chromium } = require('playwright-core');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const dotenv = require('../../backend/node_modules/dotenv');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN', isActive: true } });
  const b2bUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER_B2B', isActive: true } });
  const token = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const user = { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role, avatarUrl: admin.avatarStorageKey ? `/api/v1/auth/avatar/${admin.id}` : null };
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('response', (response) => { if (response.url().includes('/api/v1/') && response.status() >= 400 && !response.url().includes('/auth/avatar/')) problems.push(`api: ${response.status()} ${response.url()}`); });
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sarkisian-workspace-token', token);
    localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
  }, { token, user });
  const output = path.join(__dirname, '..', '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });

  await page.goto('http://localhost:3001/system-settings?section=accounts', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Учётные записи платформы' }).waitFor();
  const accountRows = await page.locator('.account-row:not(.head)').count();
  const bodyWidth = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  if (bodyWidth.scrollWidth > bodyWidth.clientWidth + 1) problems.push(`layout: горизонтальный скролл ${bodyWidth.scrollWidth}/${bodyWidth.clientWidth}`);
  await page.screenshot({ path: path.join(output, 'ecosystem-accounts.png'), fullPage: true });

  await page.locator('.rail-user').click();
  await page.getByRole('heading', { name: 'Мой профиль' }).waitFor();
  await page.waitForTimeout(300);
  const sessions = await page.locator('.sessions article').count();
  await page.screenshot({ path: path.join(output, 'user-profile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Уведомления' }).click();
  await page.getByRole('heading', { name: 'Каналы уведомлений' }).waitFor();

  let b2bProfile = false;
  if (b2bUser) {
    await page.getByRole('button', { name: 'Закрыть' }).click();
    const b2bToken = jwt.sign({ sub: b2bUser.id, role: b2bUser.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
    await page.evaluate(({ b2bToken, b2bUser }) => {
      localStorage.setItem('sarkisian-b2b-token', b2bToken);
      localStorage.setItem('sarkisian-b2b-user', JSON.stringify(b2bUser));
    }, { b2bToken, b2bUser: { id: b2bUser.id, email: b2bUser.email, firstName: b2bUser.firstName, lastName: b2bUser.lastName, role: b2bUser.role } });
    await page.goto('http://localhost:3001/b2b', { waitUntil: 'networkidle' });
    await page.locator('.person').click();
    await page.getByRole('heading', { name: 'Мой профиль' }).waitFor();
    b2bProfile = true;
  }

  console.log(JSON.stringify({ ok: problems.length === 0, accountRows, sessions, b2bProfile, bodyWidth, problems }, null, 2));
  await browser.close();
  await prisma.$disconnect();
  if (problems.length) process.exitCode = 1;
}
main().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exitCode = 1; });
