const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function clickFirst(page, patterns) {
  for (const pattern of patterns) {
    const item = page.getByText(pattern, { exact: true }).first();
    if (await item.count() && await item.isVisible().catch(() => false)) { await item.click(); return pattern; }
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const output = path.join(__dirname, '..', '.screenshots', 'reference');
  fs.mkdirSync(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 } });
  await page.goto('https://sarkisianbrand.ru/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(output, 'home.png'), fullPage: true });
  const catalogTrigger = await clickFirst(page, ['Каталог']);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(output, 'catalog-open.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  if (await page.getByText('Каталог', { exact: true }).count()) { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000); }
  const loginTrigger = await clickFirst(page, ['Войти', 'Вход']);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(output, 'login-open.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000);
  const cartTrigger = await clickFirst(page, ['Корзина']);
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(output, 'cart-open.png') });
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(output, 'footer.png') });
  const bodyText = (await page.locator('body').innerText()).slice(-6000);
  fs.writeFileSync(path.join(output, 'footer-text.txt'), bodyText);
  console.log(JSON.stringify({ catalogTrigger, loginTrigger, cartTrigger, url: page.url() }, null, 2));
  await browser.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
