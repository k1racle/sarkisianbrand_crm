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
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`page: ${error.message}`));
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sarkisian-workspace-token', token);
    localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
  }, { token, user });
  const output = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });

  await page.goto('http://localhost:3001/system-settings?section=integrations', { waitUntil: 'networkidle' });
  await page.locator('.integration-card').first().waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(output, 'ecosystem-integration-logos.png'), fullPage: true });
  const logos = await page.locator('.integration-card .brand-logo img').evaluateAll(images => images.map(image => ({ alt: image.alt, loaded: image.complete && image.naturalWidth > 0 })));

  await page.goto('http://localhost:3001/system-settings?section=bot-commands', { waitUntil: 'networkidle' });
  await page.getByText('События и привязки профилей').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(output, 'bot-webhook-activity.png'), fullPage: true });
  console.log(JSON.stringify({ integrations: logos.length, loadedLogos: logos.filter(item => item.loaded).length, logoStates: logos, problems }, null, 2));
  await browser.close();
  await prisma.$disconnect();
  if (problems.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
