const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  try {
  const output = path.join(__dirname, '..', '.screenshots');
  fs.mkdirSync(output, { recursive: true });
  const problems = [];
  const page = await browser.newPage({ viewport: { width: 1536, height: 960 }, deviceScaleFactor: 1 });
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes("console.time")) problems.push(`console: ${message.text()}`); });
  page.on('pageerror', error => problems.push(`page: ${error.message}`));

  await page.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await page.locator('.sb-hero img').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);
  const desktopMenu = await page.locator('.sb-page-menu').evaluate(element => ({ links: element.querySelectorAll('a').length, searchForms: document.querySelectorAll('.sb-header form').length }));
  if (!desktopMenu.links || desktopMenu.searchForms) problems.push(`desktop page menu: ${JSON.stringify(desktopMenu)}`);
  async function checkTypography(target, scope, name) {
    const result = await target.evaluate(scope => {
      const root = document.querySelector(scope);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const issues = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const element = node.parentElement;
        if (!node.textContent.trim() || !element || element.closest('svg, script, style, .sb-visually-hidden, .sb-product-badge, .sb-mobile-nav b, .sb-header-actions b')) continue;
        if (!element.getBoundingClientRect().height || !element.getBoundingClientRect().width) continue;
        const style = getComputedStyle(element);
        if (parseFloat(style.fontSize) < 12) issues.push({ text: node.textContent.trim().slice(0, 40), size: style.fontSize });
        if (!style.fontFamily.includes('Montserrat') && !element.closest('.sb-brand-story h2 em, .sb-club-banner__copy h2 em')) issues.push({ text: node.textContent.trim().slice(0, 40), family: style.fontFamily });
      }
      return { issues, localFontLoaded: document.fonts.check('500 16px Montserrat', 'Материалы SARKISIAN'), remoteFontRequests: performance.getEntriesByType('resource').filter(entry => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(entry.name)).length };
    }, scope);
    if (result.issues.length || !result.localFontLoaded || result.remoteFontRequests) problems.push(`typography ${name}: ${JSON.stringify(result)}`);
    return result;
  }
  const desktopTypography = await checkTypography(page, '.sb-storefront', 'desktop');
  const hero = await page.locator('.sb-hero img').evaluate(image => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 }));
  if (!hero.loaded || !hero.src.startsWith('/storefront/')) problems.push(`hero: ${JSON.stringify(hero)}`);
  async function checkFullBanner(target, name) {
    const layout = await target.locator('.sb-hero picture img').evaluate(image => ({
      originalRatio: image.naturalWidth / image.naturalHeight,
      renderedRatio: image.clientWidth / image.clientHeight,
      fit: getComputedStyle(image).objectFit,
      overlays: document.querySelectorAll('.sb-hero__glass-note, .sb-hero__mobile-copy, .sb-hero__admin-copy').length,
    }));
    if (Math.abs(layout.originalRatio - layout.renderedRatio) > .02 || layout.fit !== 'contain' || layout.overlays) problems.push(`full banner ${name}: ${JSON.stringify(layout)}`);
    return layout;
  }
  const desktopBanner = await checkFullBanner(page, 'desktop');
  await page.screenshot({ path: path.join(output, 'storefront-home-desktop.png') });

  const manifesto = page.locator('.sb-brand-manifesto');
  await manifesto.scrollIntoViewIfNeeded();
  const manifestoLayout = await manifesto.locator('h2').evaluate(element => ({
    rows: element.children.length,
    overflowingRows: Array.from(element.children).filter(row => row.scrollWidth > row.clientWidth + 1).length,
  }));
  if (manifestoLayout.rows !== 3 || manifestoLayout.overflowingRows) problems.push(`manifesto: ${JSON.stringify(manifestoLayout)}`);
  await manifesto.screenshot({ path: path.join(output, 'storefront-manifesto-desktop.png') });

  const loyaltyCard = page.locator('.sb-club-banner__card');
  const balanceLabel = await loyaltyCard.locator(':scope > small').evaluate(e => ({ color: getComputedStyle(e).color, size: getComputedStyle(e).fontSize }));
  if (balanceLabel.color !== 'rgb(255, 255, 255)' || balanceLabel.size !== '16px') problems.push('loyalty card: balance label not white/body size');
  if ((await loyaltyCard.locator(':scope > b').innerText()).trim() !== '1250') problems.push('loyalty card: malformed balance');
  await loyaltyCard.screenshot({ path: path.join(output, 'storefront-loyalty-card.png') });

  const brandStory = page.locator('.sb-brand-story');
  async function checkBrandPortrait(target, name) {
    const section = target.locator('.sb-brand-story');
    await section.scrollIntoViewIfNeeded();
    await section.locator('.sb-brand-story__portrait img').evaluate(image => image.decode());
    const layout = await section.evaluate(element => {
      const copy = element.querySelector(':scope > div').getBoundingClientRect();
      const figure = element.querySelector('figure').getBoundingClientRect();
      const image = element.querySelector('figure img');
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return {
        local: new URL(image.currentSrc).pathname === '/storefront/svetlana-portrait.png',
        transparent: context.getImageData(0, 0, 1, 1).data[3] === 0,
        rightOfCopy: figure.left >= copy.right - 2,
        belowCopy: figure.top >= copy.bottom - 2,
        headingOverflow: element.querySelector('h2').scrollWidth > element.querySelector('h2').clientWidth + 1,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    if (!layout.local || !layout.transparent || layout.headingOverflow || layout.pageOverflow || !(name === 'desktop' ? layout.rightOfCopy : layout.belowCopy)) problems.push(`brand portrait ${name}: ${JSON.stringify(layout)}`);
    return layout;
  }
  await checkBrandPortrait(page, 'desktop');
  const storyAccent = await brandStory.locator('h2 em').evaluate(element => ({
    text: element.textContent.trim(),
    nowrap: getComputedStyle(element).whiteSpace,
    display: getComputedStyle(element).display,
    forcedBreaks: element.parentElement.querySelectorAll('br').length,
  }));
  if (storyAccent.text !== 'быстрее и увереннее' || storyAccent.nowrap !== 'normal' || storyAccent.display !== 'inline' || storyAccent.forcedBreaks) problems.push(`brand story: ${JSON.stringify(storyAccent)}`);
  await brandStory.screenshot({ path: path.join(output, 'storefront-brand-story.png') });

  const benefits = page.locator('.sb-benefits');
  await benefits.scrollIntoViewIfNeeded();
  const benefitsLayout = await benefits.evaluate(element => ({
    cards: element.children.length,
    columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    iconColors: Array.from(element.querySelectorAll('article > i')).map(icon => getComputedStyle(icon).color),
    textTops: Array.from(element.querySelectorAll('article > div')).map(e => e.getBoundingClientRect().top),
    textGaps: Array.from(element.querySelectorAll('article')).map(e => e.querySelector(':scope > div').getBoundingClientRect().top - e.querySelector(':scope > i').getBoundingClientRect().bottom),
  }));
  if (benefitsLayout.cards !== 4 || benefitsLayout.columns !== 4) problems.push(`benefits: ${JSON.stringify(benefitsLayout)}`);
  if (Math.max(...benefitsLayout.textTops) - Math.min(...benefitsLayout.textTops) > 1 || benefitsLayout.textGaps.some(gap => Math.abs(gap - 24) > 1)) problems.push('benefits: text not aligned directly below icons');
  await benefits.screenshot({ path: path.join(output, 'storefront-benefits-desktop.png') });
  const footer = page.locator('.sb-footer');
  await footer.scrollIntoViewIfNeeded();
  const footerLayout = await footer.evaluate(e => ({ headingTops: [...e.querySelectorAll('h3')].map(h => h.getBoundingClientRect().top), padding: getComputedStyle(e).paddingLeft, columns: getComputedStyle(e).gridTemplateColumns.split(' ').length }));
  if (Math.max(...footerLayout.headingTops) - Math.min(...footerLayout.headingTops) > 1 || footerLayout.padding !== '32px' || footerLayout.columns !== 4) problems.push(`footer: ${JSON.stringify(footerLayout)}`);
  await footer.screenshot({ path: path.join(output, 'storefront-footer-desktop.png') });

  const homeActions = await page.locator('.sb-section-head > a, .sb-brand-story a').evaluateAll(elements => elements.map(element => ({
    text: element.textContent.trim(),
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  })));
  if (homeActions.some(action => action.background !== 'rgb(21, 21, 21)' || action.color !== 'rgb(255, 255, 255)')) problems.push(`home actions: ${JSON.stringify(homeActions)}`);

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
  await page.getByText('С этим товаром покупают', { exact: true }).scrollIntoViewIfNeeded();
  const recommendationActions = await page.locator('.sb-product-recommendations .sb-section-head > a').evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
  if (recommendationActions.some(color => color !== 'rgb(21, 21, 21)')) problems.push(`recommendation actions: ${JSON.stringify(recommendationActions)}`);
  await page.locator('.sb-product-recommendations').first().screenshot({ path: path.join(output, 'storefront-recommendations-desktop.png') });

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
  await page.evaluate(() => window.scrollTo(0, 60));
  await page.waitForTimeout(450);
  const headerCollapsedAtThreshold = await page.locator('.sb-site-head').evaluate(element => element.classList.contains('is-scrolled'));
  await page.evaluate(() => window.scrollTo(0, 24));
  await page.waitForTimeout(150);
  const headerStableNearThreshold = await page.locator('.sb-site-head').evaluate(element => element.classList.contains('is-scrolled'));
  if (!headerCollapsedAtThreshold || !headerStableNearThreshold) problems.push(`header hysteresis: ${headerCollapsedAtThreshold}/${headerStableNearThreshold}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(420);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(500);
  const stickyTop = await page.locator('.sb-site-head').evaluate(element => element.getBoundingClientRect().top);
  if (Math.abs(stickyTop) > 2) problems.push(`header: not sticky (${stickyTop})`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  mobile.on('console', message => { if (message.type() === 'error' && !message.text().includes("console.time")) problems.push(`mobile console: ${message.text()}`); });
  mobile.on('pageerror', error => problems.push(`mobile page: ${error.message}`));
  await mobile.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
  await mobile.locator('.sb-hero img').waitFor({ state: 'visible' });
  await mobile.waitForTimeout(1200);
  await mobile.evaluate(() => document.fonts.ready);
  const mobileBanner = await checkFullBanner(mobile, 'mobile');
  const mobileTypography = await checkTypography(mobile, '.sb-storefront', 'mobile');
  await mobile.screenshot({ path: path.join(output, 'storefront-home-mobile.png') });
  await checkBrandPortrait(mobile, 'mobile');
  await mobile.locator('.sb-brand-story').screenshot({ path: path.join(output, 'storefront-brand-story-mobile.png') });
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.waitForTimeout(450);
  const mobileNavigation = await mobile.locator('.sb-mobile-nav').evaluate(element => ({
    icons: Array.from(element.querySelectorAll('button')).map(button => button.getAttribute('aria-label')),
    position: getComputedStyle(element).position,
    textLabels: Array.from(element.querySelectorAll('button')).some(button => button.querySelector('span')),
    height: element.clientHeight,
  }));
  if (mobileNavigation.icons.join('|') !== 'Каталог|Личный кабинет|Избранное|Корзина|Меню' || mobileNavigation.position !== 'fixed' || mobileNavigation.textLabels) problems.push(`mobile navigation: ${JSON.stringify(mobileNavigation)}`);
  const mobileHeader = await mobile.locator('.sb-site-head').evaluate(element => ({
    position: getComputedStyle(element).position,
    visibleControls: Array.from(element.querySelectorAll('button, input, .sb-announcement')).filter(control => control.getBoundingClientRect().height > 0).length,
  }));
  if (mobileHeader.position !== 'relative' || mobileHeader.visibleControls !== 0) problems.push(`mobile header: ${JSON.stringify(mobileHeader)}`);
  await mobile.evaluate(() => window.scrollTo(0, 900));
  await mobile.waitForTimeout(250);
  const mobileScroll = await mobile.evaluate(() => ({
    headerTop: document.querySelector('.sb-site-head').getBoundingClientRect().top,
    navBottom: document.querySelector('.sb-mobile-nav').getBoundingClientRect().bottom,
    viewport: window.innerHeight,
  }));
  if (mobileScroll.headerTop >= 0 || Math.abs(mobileScroll.viewport - mobileScroll.navBottom - 10) > 2) problems.push(`mobile sticky navigation: ${JSON.stringify(mobileScroll)}`);
  await mobile.locator('.sb-mobile-nav button[aria-label="Каталог"]').click();
  await mobile.locator('.sb-catalog-drawer').waitFor({ state: 'visible' });
  await mobile.waitForTimeout(800);
  await mobile.screenshot({ path: path.join(output, 'storefront-catalog-mobile.png') });

  async function closeMobilePanel(selector) {
    await mobile.locator(`${selector} header > button, ${selector} .sb-catalog-drawer__head > button`).click();
    await mobile.waitForTimeout(160);
    const closing = await mobile.evaluate(selector => ({
      mounted: Boolean(document.querySelector(selector)),
      locked: document.documentElement.style.overflow === 'hidden',
    }), selector);
    if (!closing.mounted || !closing.locked) problems.push(`mobile premature drawer teardown: ${selector} ${JSON.stringify(closing)}`);
    await mobile.locator(selector).waitFor({ state: 'detached' });
    if (await mobile.evaluate(() => document.documentElement.style.overflow === 'hidden')) problems.push(`mobile scroll remained locked: ${selector}`);
  }

  await closeMobilePanel('.sb-catalog-drawer');
  for (const [name, selector] of [['Личный кабинет', '.sb-auth-drawer'], ['Избранное', '.sb-favorites-drawer'], ['Меню', '.sb-menu-drawer'], ['Корзина', '.sb-cart-drawer']]) {
    await mobile.locator(`.sb-mobile-nav button[aria-label="${name}"]`).click();
    await mobile.locator(selector).waitFor({ state: 'visible' });
    await mobile.waitForTimeout(800);
    await checkTypography(mobile, selector, selector);
    if (selector === '.sb-menu-drawer') {
      if (!(await mobile.locator('.sb-menu-links a[href="/b2b-login"]').count())) problems.push('mobile menu: missing B2B entry');
      await mobile.screenshot({ path: path.join(output, 'storefront-menu-mobile.png') });
    }
    await closeMobilePanel(selector);
  }

  await mobile.locator('.sb-mobile-nav button[aria-label="Каталог"]').click();
  await mobile.locator('.sb-catalog-search input').fill('гель');
  await mobile.locator('.sb-catalog-search button').click();
  await mobile.waitForURL(url => url.pathname === '/catalog' && url.searchParams.get('search') === 'гель');
  await mobile.locator('.sb-catalog-drawer').waitFor({ state: 'detached' });

  const mobileWidths = [];
  for (const width of [360, 390, 430, 760]) {
    await mobile.setViewportSize({ width, height: 844 });
    const layout = await mobile.evaluate(() => ({ width: window.innerWidth, documentWidth: document.documentElement.scrollWidth, navWidth: document.querySelector('.sb-mobile-nav').getBoundingClientRect().width, navVisible: getComputedStyle(document.querySelector('.sb-mobile-nav')).display !== 'none' }));
    mobileWidths.push(layout);
    if (layout.documentWidth > layout.width + 1 || !layout.navVisible || layout.navWidth > layout.width) problems.push(`mobile overflow: ${JSON.stringify(layout)}`);
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.waitForTimeout(100);
  await mobile.locator('.sb-mobile-nav button[aria-label="Меню"]').click();
  await mobile.locator('.sb-menu-drawer').waitFor({ state: 'visible' });
  await mobile.locator('.sb-menu-drawer .sb-drawer-head > button').click();
  await mobile.locator('.sb-menu-drawer').waitFor({ state: 'detached', timeout: 500 });
  if (await mobile.evaluate(() => document.documentElement.style.overflow === 'hidden')) problems.push('reduced motion: scroll remained locked');

  console.log(JSON.stringify({ hero, desktopMenu, desktopBanner, mobileBanner, desktopTypography, mobileTypography, announcement, manifestoLayout, benefitsLayout, homeActions, recommendationActions, gallery, headerCollapsedAtThreshold, headerStableNearThreshold, stickyTop, mobileNavigation, mobileHeader, mobileScroll, mobileWidths, problems }, null, 2));
  await browser.close();
  if (problems.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
