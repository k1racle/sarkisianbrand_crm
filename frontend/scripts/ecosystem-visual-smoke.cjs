const { chromium } = require('playwright-core');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');

const routes = [
  { path: '/workspace', root: '.hub', header: '.hub > header', name: 'workspace' },
  { path: '/admin-workspace?section=loyalty', root: '.site-admin-console', header: '.site-admin-header', name: 'admin' },
  { path: '/crm', root: '.crm-main', header: '.page-head', name: 'crm' },
  { path: '/crm-pipeline', root: '.pipeline-page', header: '.page-head', name: 'pipeline' },
  { path: '/crm-marketplaces?section=dashboard', root: '.marketplace-page', header: '.mp-header', name: 'marketplaces' },
  { path: '/leadership', root: '.leader-page', header: '.leader-header', name: 'leadership' },
  { path: '/helpdesk', root: '.helpdesk-page', header: '.hd-header', name: 'helpdesk' },
  { path: '/system-settings', root: '.system-console', header: '.system-header', name: 'system' },
];

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true } });
  if (!admin) throw new Error('Не найдена активная учётная запись администратора');
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, 'sarkisian-local-dev-secret', { expiresIn: '15m' });
  const user = { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role };
  const output = path.join(__dirname, '..', '.screenshots', 'ecosystem');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('console.time')) errors.push(message.text()); });
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sarkisian-workspace-token', token);
    localStorage.setItem('sarkisian-workspace-user', JSON.stringify(user));
  }, { token, user });

  const state = [];
  for (const route of routes) {
    await page.goto(`http://localhost:3001${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator(route.root).waitFor({ state: 'visible', timeout: 15000 });
    await page.locator(route.header).waitFor({ state: 'attached', timeout: 15000 });
    await page.waitForTimeout(450);
    const metrics = await page.locator(route.header).evaluate(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        radius: parseFloat(style.borderTopLeftRadius),
        width: Math.round(box.width),
        left: Math.round(box.left),
        viewport: window.innerWidth,
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        backdrop: style.backdropFilter || style.webkitBackdropFilter,
        display: style.display,
        visibility: style.visibility,
        url: location.pathname + location.search,
      };
    });
    if (metrics.width < 100) errors.push(`${route.name}: шапка скрыта (${metrics.display}, ${metrics.visibility}, ${metrics.url})`);
    if (metrics.radius < 20) errors.push(`${route.name}: скругление шапки ${metrics.radius}px`);
    if (metrics.bodyOverflow > 1) errors.push(`${route.name}: горизонтальное переполнение ${metrics.bodyOverflow}px`);
    if (!String(metrics.backdrop).includes('blur')) errors.push(`${route.name}: не применён стеклянный материал`);
    state.push({ name: route.name, ...metrics });
    await page.screenshot({ path: path.join(output, `${route.name}.png`), fullPage: route.name === 'admin' });
  }
  await browser.close();
  await prisma.$disconnect();
  console.log(JSON.stringify({ state, errors }, null, 2));
  if (errors.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exit(1); });
