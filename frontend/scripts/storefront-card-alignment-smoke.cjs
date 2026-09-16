const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
  const output = path.join(__dirname, '..', '.screenshots', 'card-alignment');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const problems = [], checks = [];
  try {
    for (const width of [360, 390, 430, 760, 1024, 1536]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      page.on('pageerror', error => problems.push(error.message));
      for (const url of ['/catalog', '/', '/products/gel-muss-kamufliruyushchiy-23']) {
        await page.goto(base + url, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const rows = await page.evaluate(() => {
          const groups = new Map();
          document.querySelectorAll('.sb-product-grid').forEach((grid, gridIndex) => {
            grid.querySelectorAll('.sb-product-card').forEach(card => {
              const visual = card.querySelector('.sb-product-card__visual').getBoundingClientRect();
              const price = card.querySelector('.sb-product-card__price-row strong').getBoundingClientRect();
              const button = card.querySelector('.sb-card-add-mobile').getBoundingClientRect();
              const title = card.querySelector('h3');
              const key = `${gridIndex}:${Math.round(visual.top)}`;
              const group = groups.get(key) || [];
              group.push({ price: price.top, button: button.height ? button.top : null, title: title.getBoundingClientRect().height, overflow: title.scrollHeight > title.clientHeight + 1 });
              groups.set(key, group);
            });
          });
          return [...groups.values()];
        });
        for (const row of rows) {
          if (row.some(card => card.overflow)) problems.push(`Название обрезано: ${url} ${width}`);
          if (Math.max(...row.map(card => card.price)) - Math.min(...row.map(card => card.price)) > 1) problems.push(`Цены не выровнены: ${url} ${width}`);
          const buttons = row.map(card => card.button).filter(top => top !== null);
          if (buttons.length && Math.max(...buttons) - Math.min(...buttons) > 1) problems.push(`Кнопки не выровнены: ${url} ${width}`);
        }
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) problems.push(`Переполнение: ${url} ${width}`);
        if (url === '/catalog' && [390,1536].includes(width)) await page.locator('.sb-product-grid').screenshot({ path: path.join(output, `catalog-${width}.png`) });
        checks.push({ url, width, rows: rows.length });
      }
      await page.close();
      console.log(`Выравнивание карточек проверено: ${width}px`);
    }
    console.log(JSON.stringify({ checks: checks.length, problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
