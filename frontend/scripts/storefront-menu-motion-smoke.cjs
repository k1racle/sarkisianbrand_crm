const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const screenshots = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(screenshots, { recursive: true });
  const issues = [];
  const metrics = element => {
    const rect = element.getBoundingClientRect();
    const glass = getComputedStyle(element, '::before');
    const underline = getComputedStyle(element.querySelector('span'), '::after');
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, glass: glass.content === 'none' ? 0 : Number(glass.opacity), underline: Number(underline.opacity), scale: underline.transform, duration: underline.transitionDuration };
  };
  try {
    const desktop = await browser.newPage({ viewport: { width: 1536, height: 960 } });
    desktop.on('pageerror', error => issues.push(error.message));
    await desktop.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    const item = desktop.locator('.sb-page-menu .sb-menu-link').first();
    const idle = await item.evaluate(metrics);
    await item.hover();
    await desktop.waitForTimeout(450);
    const hover = await item.evaluate(metrics);
    if (idle.glass !== 0 || hover.glass !== 0 || hover.underline !== 1) issues.push('Desktop underline is missing or a capsule is present');
    if (['x', 'y', 'width', 'height'].some(key => Math.abs(idle[key] - hover[key]) > .5)) issues.push('Hover changes menu geometry');
    const separator = await item.evaluate(element => getComputedStyle(element, '::after').width);
    if (separator !== '1px') issues.push('Desktop separator is missing');
    await desktop.locator('.sb-header').screenshot({ path: path.join(screenshots, 'storefront-menu-desktop-hover.png') });
    for (const action of await desktop.locator('.sb-header-actions > button').all()) {
      await action.hover();
      await desktop.waitForTimeout(450);
      const style = await action.evaluate(element => ({ underline: getComputedStyle(element.querySelector('span'), '::after').opacity, background: getComputedStyle(element).backgroundColor, transform: getComputedStyle(element).transform }));
      if (style.underline !== '1' || style.background !== 'rgba(0, 0, 0, 0)' || style.transform !== 'none') issues.push(`Header action feedback: ${JSON.stringify(style)}`);
    }
    await desktop.mouse.move(0, 900);
    await desktop.waitForTimeout(450);
    if ((await item.evaluate(metrics)).glass !== 0) issues.push('Hover material remains visible after mouse leave');
    await item.focus();
    await desktop.waitForTimeout(450);
    if (!(await item.evaluate(element => element.matches(':focus-visible')))) issues.push('Keyboard focus is not visible');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on('pageerror', error => issues.push(error.message));
    await mobile.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
    await mobile.locator('.sb-mobile-nav').getByRole('button', { name: 'Меню', exact: true }).tap();
    await mobile.locator('.sb-menu-drawer').waitFor();
    await mobile.waitForTimeout(800);
    const mobileItem = mobile.locator('.sb-menu-links .sb-menu-link').first();
    const mobileIdle = await mobileItem.evaluate(metrics);
    const rect = await mobileItem.boundingBox();
    const cdp = await mobile.context().newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
    await mobile.waitForTimeout(200);
    const pressed = await mobileItem.evaluate(metrics);
    if (pressed.glass !== 0 || pressed.underline !== 1) issues.push('Touch underline is missing or a capsule is present');
    if (mobileIdle.width !== pressed.width || mobileIdle.height !== pressed.height) issues.push('Touch feedback changes menu geometry');
    await mobile.screenshot({ path: path.join(screenshots, 'storefront-menu-mobile-pressed.png') });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await mobile.waitForTimeout(450);
    if ((await mobileItem.evaluate(metrics)).glass !== 0) issues.push('Touch feedback is stuck after release');
    const links = mobile.locator('.sb-menu-links .sb-menu-link');
    if (await mobile.locator('.sb-menu-links svg.sb-menu-link__arrow').count() !== await links.count()) issues.push('У пунктов меню отсутствуют стрелки');
    const layout = await links.evaluateAll(elements => elements.map(element => {
      const r = element.getBoundingClientRect(), arrow = element.querySelector('.sb-menu-link__arrow').getBoundingClientRect();
      return { height: r.height, right: r.right - arrow.right, arrows: element.querySelectorAll('svg').length };
    }));
    if (layout.some(row => Math.abs(row.height - 56) > .5 || Math.abs(row.right - 12) > .5 || row.arrows !== 1)) issues.push('Плотность меню или расположение стрелок не соответствует стилю');
    if (await desktop.locator('.sb-page-menu svg').count()) issues.push('В верхнем меню появились лишние иконки');
    if ((await mobile.locator('.sb-drawer-head').innerText()).trim() !== 'Меню') issues.push('Mobile menu contains removed brand or slogan');
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await mobileItem.evaluate(metrics);
    if (parseFloat(reduced.duration) > .01) issues.push('Reduced motion is not respected');
    await mobile.getByRole('button', { name: 'Закрыть меню' }).tap();
    await mobile.locator('.sb-menu-drawer').waitFor({ state: 'detached' });
    console.log(JSON.stringify({ idle, hover, mobileIdle, pressed, reduced, issues }, null, 2));
    if (issues.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
