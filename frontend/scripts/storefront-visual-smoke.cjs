const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const output = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });
  const problems = [];
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes("console.time")) problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`page: ${error.message}`));

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await page.locator('.sb-hero img').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  const hero = await page.locator('.sb-hero img').evaluate(image => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 }));
  if (!hero.loaded || !hero.src.startsWith('/storefront/')) problems.push(`hero: ${JSON.stringify(hero)}`);
  await page.screenshot({ path: path.join(output, 'storefront-home-desktop.png') });

  await page.locator('.sb-catalog-button').click();
  await page.locator('.sb-catalog-drawer').waitFor({ state: 'visible' });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(output, 'storefront-catalog-drawer.png') });
  await page.locator('.sb-catalog-all').click();
  await page.waitForURL('**/catalog');
  await page.locator('.sb-catalog-results').waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(output, 'storefront-catalog-desktop.png') });

  await page.goto('http://localhost:3001/products/gel-muss-kamufliruyushchiy-23', { waitUntil: 'domcontentloaded' });
  await page.locator('.sb-product-gallery').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  const gallery = await page.locator('.sb-product-gallery').evaluate(element => {
    const image = element.querySelector('img');
    return { galleryWidth: element.clientWidth, imageWidth: image?.clientWidth || 0 };
  });
  if (gallery.imageWidth < gallery.galleryWidth * .98) problems.push(`product gallery: ${JSON.stringify(gallery)}`);
  if (await page.getByText('С этим товаром покупают', { exact: true }).count() !== 1) problems.push('product: missing bought together section');
  if (await page.getByText('Похожие товары', { exact: true }).count() !== 1) problems.push('product: missing similar products section');
  await page.screenshot({ path: path.join(output, 'storefront-product-desktop.png') });

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await page.locator('.sb-hero img').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Личный кабинет' }).click();
  await page.locator('.sb-auth-drawer').waitFor({ state: 'visible' });
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(output, 'storefront-auth-drawer.png') });
  await page.locator('.sb-auth-drawer .sb-drawer-head > button').click();
  await page.waitForTimeout(550);

  await page.getByRole('button', { name: 'Избранное', exact: true }).click();
  await page.locator('.sb-favorites-drawer').waitFor({ state: 'visible' });
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(output, 'storefront-favorites-drawer.png') });
  await page.locator('.sb-favorites-drawer .sb-drawer-head > button').click();
  await page.waitForTimeout(550);

  await page.getByRole('button', { name: 'Корзина' }).click();
  await page.locator('.sb-cart-drawer').waitFor({ state: 'visible' });
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(output, 'storefront-cart-drawer.png') });
  await page.locator('.sb-cart-drawer .sb-drawer-head > button').click();
  await page.waitForTimeout(550);

  const announcement = (await page.locator('.sb-announcement').innerText()).trim();
  if (!announcement.startsWith('SARKISIAN BRAND')) problems.push(`announcement: ${announcement}`);
  if (await page.locator('.sb-announcement a').count()) problems.push('announcement: unexpected link');
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);
  const stickyTop = await page.locator('.sb-site-head').evaluate(element => element.getBoundingClientRect().top);
  if (Math.abs(stickyTop) > 2) problems.push(`header: not sticky (${stickyTop})`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on('console', message => { if (message.type() === 'error' && !message.text().includes("console.time")) problems.push(`mobile console: ${message.text()}`); });
  mobile.on('pageerror', error => problems.push(`mobile page: ${error.message}`));
  await mobile.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await mobile.locator('.sb-hero img').waitFor({ state: 'visible' });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: path.join(output, 'storefront-home-mobile.png') });
  await mobile.locator('.sb-mobile-menu').click();
  await mobile.locator('.sb-catalog-drawer').waitFor({ state: 'visible' });
  await mobile.waitForTimeout(350);
  await mobile.screenshot({ path: path.join(output, 'storefront-catalog-mobile.png') });

  console.log(JSON.stringify({ hero, announcement, gallery, stickyTop, problems }, null, 2));
  await browser.close();
  if (problems.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
