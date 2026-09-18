const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
  const api = 'http://localhost:3000/api/v1';
  const content = await fetch(`${api}/products/storefront-content`).then(r => r.json());
  const club = await fetch(`${api}/products/storefront-pages/club`).then(r => r.json());
  if (!content.menuItems.some(item => item.url === '/club') || club.slug !== 'club' || club.blocks.length < 6 || !club.blocks.some(block => block.id === 'referral') || !club.blocks.some(block => block.id === 'referral-rules')) throw new Error('Страница клуба, реферальные условия или пункт меню не опубликованы');
  const output = path.join(__dirname, '..', '.screenshots', 'club');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const problems = [];
  try {
    for (const width of [1536, 1024, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      page.on('pageerror', error => problems.push(error.message));
      // No real registration, CMS writes, or orders are performed by this test.
      await page.goto(base, { waitUntil: 'networkidle' });
      const banner = page.locator('main > .sb-club-banner, .sb-club-referral-stack > .sb-club-banner');
      await banner.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      const metrics = await banner.evaluate(e => {
        const join = getComputedStyle(e.querySelector('.sb-club-join'));
        const about = getComputedStyle(e.querySelector('.sb-club-about'));
        return { material: join.backgroundImage, card: getComputedStyle(e.querySelector('.sb-club-banner__card')).backgroundImage, white: about.backgroundColor, ink: about.color, heading: parseFloat(getComputedStyle(e.querySelector('h2')).fontSize), label: getComputedStyle(e.querySelector('.sb-club-banner__label')).color, perks: e.querySelectorAll('.sb-club-perks li svg').length };
      });
      if (metrics.material !== metrics.card || !metrics.material.includes('gradient') || metrics.white !== 'rgb(255, 255, 255)' || metrics.ink !== 'rgb(21, 21, 21)' || metrics.heading > 40 || metrics.label !== 'rgb(255, 255, 255)' || metrics.perks !== 3) problems.push(`Блок клуба ${width}: ${JSON.stringify(metrics)}`);
      if (await banner.locator('.sb-club-banner__label svg').count()) problems.push(`Иконка в подписи клуба ${width}`);
      await banner.locator('.sb-club-banner__card.is-visible').waitFor();
      const animation = await banner.locator('.sb-club-banner__card').evaluate(e => {
        const s = getComputedStyle(e, '::after');
        return { name: s.animationName, duration: s.animationDuration, state: s.animationPlayState, events: s.pointerEvents };
      });
      if (animation.name !== 'sb-club-iridescence' || animation.duration !== '20s' || animation.state !== 'running' || animation.events !== 'none') problems.push(`Переливание ${width}: ${JSON.stringify(animation)}`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      if (await banner.locator('.sb-club-banner__card').evaluate(e => getComputedStyle(e, '::after').animationName) !== 'none') problems.push(`Уменьшение движения ${width}`);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await banner.locator('.sb-club-join').hover();
      if (await banner.locator('.sb-club-join').evaluate(e => getComputedStyle(e).backgroundImage) !== metrics.card) problems.push(`Цвет при наведении ${width}`);
      await banner.screenshot({ path: path.join(output, `home-${width}.png`) });
      await banner.getByRole('button', { name: 'Вступить в клуб' }).click();
      const drawer = page.locator('.sb-auth-drawer');
      await drawer.waitFor();
      if (!await drawer.getByRole('button', { name: 'Регистрация', exact: true }).evaluate(e => e.classList.contains('active')) || !await drawer.getByLabel('Телефон', { exact: true }).isVisible()) problems.push(`Не открылась регистрация ${width}`);
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'detached' });
      await banner.getByRole('link', { name: 'О клубе' }).click();
      await page.waitForURL('**/club');
      await page.getByRole('heading', { name: club.title, exact: true }).waitFor();
      if (await page.locator('.is-club .sb-content-sections > section').count() !== club.blocks.length) problems.push(`Не отображается содержимое CMS ${width}`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) problems.push(`Переполнение страницы ${width}`);
      await page.screenshot({ path: path.join(output, `page-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Вступить в клуб' }).click();
      await drawer.waitFor();
      if (!await drawer.getByRole('button', { name: 'Регистрация', exact: true }).evaluate(e => e.classList.contains('active'))) problems.push(`Регистрация со страницы ${width}`);
      console.log(`Клуб и регистрация проверены: ${width}px`);
      await page.close();
    }
    console.log(JSON.stringify({ problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
