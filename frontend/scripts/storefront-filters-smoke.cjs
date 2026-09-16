const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
async function main() {
  const base = process.env.STOREFRONT_URL || 'http://localhost:3001'; const api = 'http://localhost:3000/api/v1';
  const get = q => fetch(api + '/products?' + new URLSearchParams(q)).then(r => { if (!r.ok) throw Error('Catalog API: ' + r.status); return r.json(); });
  const problems = []; const results = [];
  const ordered = await get({ sort: 'price-asc', limit: 2, page: 1 }); const second = await get({ sort: 'price-asc', limit: 2, page: 2 });
  if (Number(ordered.items.at(-1).basePrice) > Number(second.items[0].basePrice)) problems.push('Sorting is only per-page');
  for (const q of [{ minPrice: '2000', maxPrice: '1000' }, { sort: 'bad' }, { page: '0' }, { inStock: 'bad' }]) if ((await fetch(api + '/products?' + new URLSearchParams(q))).status !== 400) problems.push('Invalid query not rejected');
  const stock = await get({ inStock: 'true' });
  if (stock.items.some(p => !p.variants.some(v => v.isActive && v.stock > v.reserved))) problems.push('Unavailable product passed stock filter');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const output = path.join(__dirname, '..', '.screenshots', 'catalog-filters'); fs.mkdirSync(output, { recursive: true });
  try {
    for (const width of [1536,390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width < 760, isMobile: width < 760 }); const page = await context.newPage();
      page.on('pageerror', e => problems.push(e.message));
      await page.goto(base + '/catalog', { waitUntil: 'networkidle' });
      if (await page.locator('.sb-catalog-title > p, .sb-catalog-title > span, .sb-catalog-toolbar').count()) problems.push('Old catalog labels retained');
      if (width < 760) {
        const mobileLayout = await page.evaluate(() => {
          const button = document.querySelector('.sb-filter-mobile').getBoundingClientRect();
          const label = document.querySelector('.sb-filter-mobile > span').getBoundingClientRect();
          const icon = document.querySelector('.sb-filter-mobile > svg').getBoundingClientRect();
          const catalog = document.querySelector('.sb-catalog-page').getBoundingClientRect();
          const buttons = [...document.querySelectorAll('.sb-mobile-nav button')];
          const menu = getComputedStyle(buttons[buttons.length - 1]);
          return { edges: Math.abs(button.left - catalog.left) + Math.abs(button.right - catalog.right), centered: Math.abs((label.left + label.right - button.left - button.right) / 2) < .5, iconLeft: icon.left - button.left, order: buttons.map(e => e.getAttribute('aria-label')).join('|'), background: menu.backgroundColor, color: menu.color };
        });
        if (mobileLayout.edges > 2 || !mobileLayout.centered || Math.abs(mobileLayout.iconLeft - 13) > 1 || mobileLayout.order !== 'Каталог|Личный кабинет|Избранное|Корзина|Меню' || mobileLayout.background !== 'rgb(21, 21, 21)' || mobileLayout.color !== 'rgb(255, 255, 255)') problems.push('Mobile catalog navigation mismatch: ' + JSON.stringify(mobileLayout));
        await page.locator('.sb-mobile-nav').getByRole('button', { name: 'Меню', exact: true }).click();
        await page.locator('.sb-menu-drawer').waitFor();
        await page.locator('.sb-menu-drawer').getByRole('button', { name: 'Закрыть меню', exact: true }).click();
        await page.locator('.sb-menu-drawer').waitFor({ state: 'detached' });
        await page.getByRole('button', { name: 'Фильтры и сортировка', exact: true }).click();
      }
      const panel = width < 760 ? page.getByRole('dialog', { name: 'Фильтры каталога', exact: true }) : page.locator('.sb-filters--catalog');
      const resetStyle = await panel.getByRole('button', { name: 'Сбросить фильтры', exact: true }).evaluate(e => { const s = getComputedStyle(e); return { background: s.backgroundColor, color: s.color, radius: s.borderRadius, size: s.fontSize, height: e.getBoundingClientRect().height, cross: Boolean(e.querySelector('svg.sb-filter-reset-cross')) }; });
      if (resetStyle.background !== 'rgb(255, 255, 255)' || resetStyle.color !== 'rgb(21, 21, 21)' || resetStyle.radius !== '14px' || resetStyle.size !== '14px' || resetStyle.height < 47.5 || !resetStyle.cross) problems.push('Filter reset design mismatch: ' + width);
      if (width < 760) {
        const gap = await panel.evaluate(e => e.querySelector('.sb-filter-show').getBoundingClientRect().top - e.querySelector('.sb-filter-reset').getBoundingClientRect().bottom);
        if (Math.abs(gap - 12) > .5) problems.push('Filter action gap mismatch: ' + gap);
        const close = panel.getByRole('button', { name: 'Закрыть фильтры', exact: true });
        if (await panel.getByRole('button', { name: 'Готово', exact: true }).count()) problems.push('Old close label retained');
        const closeStyle = await close.evaluate(e => { const s = getComputedStyle(e); return { height: e.getBoundingClientRect().height, width: e.getBoundingClientRect().width, radius: s.borderRadius, icon: Boolean(e.querySelector('svg')) }; });
        if (closeStyle.width !== 44 || closeStyle.height !== 44 || closeStyle.radius !== '12px' || !closeStyle.icon) problems.push('Filter close design mismatch');
        await close.click(); await panel.waitFor({ state: 'detached' });
        if (await page.evaluate(() => document.documentElement.style.overflow === 'hidden')) problems.push('Close button leaves scroll locked');
        await page.getByRole('button', { name: 'Фильтры и сортировка', exact: true }).click();
      }
      await panel.getByLabel('Гели', { exact: true }).check(); await page.waitForLoadState('networkidle');
      await page.waitForURL('**/*category=gels*');
      await panel.getByLabel('Сортировка', { exact: true }).selectOption('price-asc'); await page.waitForURL('**/*sort=price-asc*');
      await panel.getByLabel('От', { exact: true }).fill('1000'); await panel.getByLabel('До', { exact: true }).fill('1500'); await panel.getByRole('button', { name: 'Применить цену', exact: true }).click();
      await page.waitForURL('**/*maxPrice=1500*');
      await panel.getByLabel('Моделирование', { exact: true }).check(); await page.waitForURL('**/*purpose=*');
      if (width < 760) { await panel.getByRole('button', { name: 'Показать товары', exact: false }).click(); await panel.waitFor({ state: 'detached' }); }
      await page.waitForLoadState('networkidle');
      const expected = await get({ category: 'gels', purpose: 'Моделирование', minPrice: 1000, maxPrice: 1500, sort: 'price-asc' });
      const names = await page.locator('.sb-catalog-results .sb-product-card h3').allTextContents();
      if (JSON.stringify(names) !== JSON.stringify(expected.items.map(p => p.nameRu))) problems.push('Combined filters not applied: ' + width);
      await page.reload({ waitUntil: 'networkidle' });
      if (width < 760) await page.getByRole('button', { name: 'Фильтры и сортировка', exact: true }).click();
      if (!(await panel.getByLabel('Гели', { exact: true }).isChecked()) || !(await panel.getByLabel('Моделирование', { exact: true }).isChecked())) problems.push('Filters lost on reload');
      await panel.getByRole('button', { name: 'Сбросить фильтры', exact: true }).click(); await page.waitForURL('**/catalog');
      await panel.getByLabel('Шиммер', { exact: true }).check(); await page.waitForURL('**/*feature=*');
      await panel.getByLabel('Только в наличии', { exact: true }).check(); await page.waitForURL('**/*inStock=true*');
      await panel.getByLabel('От', { exact: true }).fill('2000'); await panel.getByLabel('До', { exact: true }).fill('1000'); await panel.getByRole('button', { name: 'Применить цену', exact: true }).click();
      await panel.getByRole('alert').waitFor();
      if (new URL(page.url()).searchParams.has('minPrice')) problems.push('Invalid price reached API');
      if (width < 760) { await page.keyboard.press('Escape'); await panel.waitFor({ state: 'detached' }); if (await page.evaluate(() => document.documentElement.style.overflow === 'hidden')) problems.push('Mobile scroll stays locked'); }
      await page.waitForLoadState('networkidle');
      const layout = await page.evaluate(() => { const h = document.querySelector('.sb-header').getBoundingClientRect(), c = document.querySelector('.sb-catalog-page').getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth > innerWidth + 1, edges: Math.abs(h.left-c.left) + Math.abs(h.right-c.right) }; });
      if (layout.overflow || layout.edges > 2) problems.push('Catalog layout mismatch: ' + width);
      await page.screenshot({ path: path.join(output, `catalog-${width}.png`), fullPage: true });
      results.push({ width, combined: true, sorting: true, features: true, stock: true, reload: true, priceValidation: true }); await context.close();
    }
    console.log(JSON.stringify({ results, problems }, null, 2)); if (problems.length) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
