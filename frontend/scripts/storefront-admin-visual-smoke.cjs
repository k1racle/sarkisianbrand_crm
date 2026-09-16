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
  let testMenuId;
  try {
    for (const url of ['javascript:alert(1)', '//evil.example', '/\\evil.example']) {
      const rejected = await fetch('http://localhost:3000/api/v1/admin/storefront/menu-items', { method: 'POST', headers, body: JSON.stringify({ label: 'Проверка', url }) });
      if (rejected.status !== 400) throw new Error(`Небезопасная ссылка меню не отклонена: ${url} ${rejected.status}`);
    }
    const created = await fetch('http://localhost:3000/api/v1/admin/storefront/menu-items', { method: 'POST', headers, body: JSON.stringify({ label: 'Проверка меню', url: '/#contacts', sortOrder: 9999, newTab: false, isActive: true }) }).then(response => response.json());
    if (!created.id) throw new Error(`Не удалось создать пункт меню: ${JSON.stringify(created)}`);
    testMenuId = created.id;
    const visible = await fetch('http://localhost:3000/api/v1/products/storefront-content').then(response => response.json());
    if (!visible.menuItems.some(item => item.id === testMenuId)) throw new Error('Пункт меню не появился в публичной витрине');
    const edited = await fetch(`http://localhost:3000/api/v1/admin/storefront/menu-items/${testMenuId}`, { method: 'PATCH', headers, body: JSON.stringify({ label: 'Проверка скрытого меню', url: '/catalog', sortOrder: 9999, newTab: true, isActive: false }) }).then(response => response.json());
    if (edited.label !== 'Проверка скрытого меню' || !edited.newTab) throw new Error('Редактирование пункта меню не сохранилось');
    const hidden = await fetch('http://localhost:3000/api/v1/products/storefront-content').then(response => response.json());
    if (hidden.menuItems.some(item => item.id === testMenuId)) throw new Error('Скрытый пункт меню остался в публичной витрине');
  } finally {
    if (testMenuId) await fetch(`http://localhost:3000/api/v1/admin/storefront/menu-items/${testMenuId}`, { method: 'DELETE', headers });
  }
  const initialLoyalty = await fetch('http://localhost:3000/api/v1/loyalty/admin/overview', { headers }).then(response => response.json());
  if (!initialLoyalty.settings?.programName) throw new Error(`Не загрузились настройки бонусной программы: ${JSON.stringify(initialLoyalty)}`);
  const savedLoyaltySettings = await fetch('http://localhost:3000/api/v1/loyalty/admin/settings', {
    method: 'PATCH', headers, body: JSON.stringify({
      programName: initialLoyalty.settings.programName,
      isEnabled: initialLoyalty.settings.isEnabled,
      earnPercent: initialLoyalty.settings.earnPercent,
      maxWriteOffPercent: initialLoyalty.settings.maxWriteOffPercent,
      signupBonus: initialLoyalty.settings.signupBonus,
      birthdayBonus: initialLoyalty.settings.birthdayBonus,
      bonusValidityDays: initialLoyalty.settings.bonusValidityDays,
      proThreshold: initialLoyalty.settings.proThreshold,
      premiumThreshold: initialLoyalty.settings.premiumThreshold,
      proMultiplierPercent: initialLoyalty.settings.proMultiplierPercent,
      premiumMultiplierPercent: initialLoyalty.settings.premiumMultiplierPercent,
    }),
  }).then(response => response.json());
  if (savedLoyaltySettings.programName !== initialLoyalty.settings.programName) throw new Error('Не удалось сохранить настройки бонусной программы');
  const customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER_B2C', isActive: true } });
  let customerLoyaltyAdminStatus = 0;
  if (customer) {
    const customerToken = jwt.sign({ sub: customer.id, email: customer.email, role: customer.role }, 'sarkisian-local-dev-secret', { expiresIn: '5m' });
    customerLoyaltyAdminStatus = await fetch('http://localhost:3000/api/v1/loyalty/admin/overview', { headers: { authorization: `Bearer ${customerToken}` } }).then(response => response.status);
    if (customerLoyaltyAdminStatus !== 403) throw new Error(`B2C-клиент получил доступ к управлению бонусами: ${customerLoyaltyAdminStatus}`);
  }
  const testBanner = await fetch('http://localhost:3000/api/v1/admin/storefront/banners', {
    method: 'POST', headers,
    body: JSON.stringify({ imageUrl: '/storefront/hero.jpg', title: 'Проверка витрины', isActive: false, sortOrder: 999 }),
  }).then(response => response.json());
  if (!testBanner.id) throw new Error(`Не удалось создать тестовый баннер: ${JSON.stringify(testBanner)}`);
  await fetch(`http://localhost:3000/api/v1/admin/storefront/banners/${testBanner.id}`, { method: 'DELETE', headers });
  const testSocial = await fetch('http://localhost:3000/api/v1/admin/storefront/social-links', {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'Проверка ссылки', iconKey: 'link', url: 'https://example.com', isActive: false, sortOrder: 999 }),
  }).then(response => response.json());
  if (!testSocial.id) throw new Error(`Не удалось создать тестовую социальную ссылку: ${JSON.stringify(testSocial)}`);
  const updatedSocial = await fetch(`http://localhost:3000/api/v1/admin/storefront/social-links/${testSocial.id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ name: 'Проверка ссылки 2', iconKey: 'link', url: 'https://example.com/social', isActive: false, sortOrder: 999 }),
  }).then(response => response.json());
  if (updatedSocial.name !== 'Проверка ссылки 2') throw new Error(`Не удалось изменить тестовую социальную ссылку: ${JSON.stringify(updatedSocial)}`);
  await fetch(`http://localhost:3000/api/v1/admin/storefront/social-links/${testSocial.id}`, { method: 'DELETE', headers });

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
    socialLinks: await page.locator('.social-admin-row').count(),
    menuItems: await page.locator('.menu-admin-row').count(),
  };
  if (!state.announcement.startsWith('SARKISIAN BRAND')) problems.push('Не загрузился текст верхней строки');
  if (!state.banners) problems.push('Не загрузился список баннеров');
  if (!state.categories) problems.push('Не загрузился список категорий');
  if (!state.socialLinks) problems.push('Не загрузился список социальных сетей');
  await page.screenshot({ path: path.join(output, 'storefront-admin-appearance.png') });
  await page.locator('.menu-settings-panel').screenshot({ path: path.join(output, 'storefront-admin-menu.png') });
  let uiMenuId;
  try {
    await page.locator('.menu-settings-panel').getByRole('button', { name: 'Добавить пункт' }).click();
    const row = page.locator('.menu-admin-row').last();
    await row.getByLabel('Название', { exact: true }).fill('Проверка интерфейса меню');
    await row.getByLabel('Ссылка', { exact: true }).fill('/#contacts');
    await row.getByLabel('Показывать', { exact: true }).uncheck();
    const creation = page.waitForResponse(response => response.url().endsWith('/admin/storefront/menu-items') && response.request().method() === 'POST');
    await row.getByRole('button', { name: 'Сохранить пункт меню' }).click();
    const saved = await (await creation).json();
    if (!saved.id || saved.isActive !== false) throw new Error('Добавление пункта через интерфейс не сохранилось');
    uiMenuId = saved.id;
    await row.getByRole('button', { name: 'Сохранить пункт меню' }).waitFor({ state: 'visible' });
    page.once('dialog', dialog => dialog.dismiss());
    await row.getByRole('button', { name: 'Удалить пункт меню' }).click();
    if (await page.locator('.menu-admin-row').count() !== state.menuItems + 1) throw new Error('Отмена удаления не сохранила пункт меню');
    page.once('dialog', dialog => dialog.accept());
    const deletion = page.waitForResponse(response => response.url().endsWith(`/admin/storefront/menu-items/${uiMenuId}`) && response.request().method() === 'DELETE');
    await row.getByRole('button', { name: 'Удалить пункт меню' }).click();
    if (!(await deletion).ok()) throw new Error('Удаление пункта через интерфейс завершилось ошибкой');
    await page.waitForFunction(count => document.querySelectorAll('.menu-admin-row').length === count, state.menuItems);
  } finally {
    if (uiMenuId) await fetch(`http://localhost:3000/api/v1/admin/storefront/menu-items/${uiMenuId}`, { method: 'DELETE', headers });
  }
  await page.getByRole('heading', { name: 'Социальные сети' }).scrollIntoViewIfNeeded();
  await page.locator('.social-admin-list').screenshot({ path: path.join(output, 'storefront-admin-socials.png') });
  await page.goto('http://localhost:3001/admin-workspace?section=loyalty', { waitUntil: 'domcontentloaded' });
  await page.locator('.loyalty-settings-panel').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  const loyaltyState = {
    programName: await page.locator('.loyalty-form-grid input').first().inputValue(),
    kpis: await page.locator('.loyalty-kpis article').count(),
    accounts: await page.locator('.loyalty-row:not(.head)').count(),
    previewBackground: await page.locator('.loyalty-program-preview').evaluate(element => getComputedStyle(element).backgroundImage),
  };
  if (loyaltyState.programName !== initialLoyalty.settings.programName || loyaltyState.kpis !== 4) problems.push(`Не загрузился интерфейс бонусной программы: ${JSON.stringify(loyaltyState)}`);
  await page.screenshot({ path: path.join(output, 'storefront-admin-loyalty.png'), fullPage: true });
  if (loyaltyState.accounts) {
    await page.locator('.loyalty-row:not(.head)').first().click();
    await page.locator('.loyalty-drawer').waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, 'storefront-admin-loyalty-drawer.png') });
  }
  await browser.close();
  await prisma.$disconnect();
  console.log(JSON.stringify({ apiBanners: initial.banners?.length || 0, apiSocialLinks: initial.socialLinks?.length || 0, testBannerCrud: true, testSocialCrud: true, testMenuCrud: true, unsafeMenuLinksRejected: true, loyaltySettingsCrud: true, customerLoyaltyAdminStatus, state, loyaltyState, problems }, null, 2));
  if (problems.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
