const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

// Read-only visual contract: real public pages, isolated fixtures for personal/cart views.
async function main() {
  const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
  const api = 'http://localhost:3000/api/v1';
  const product = await fetch(`${api}/products/gel-muss-kamufliruyushchiy-23`).then(r => r.json());
  if (!product.id) throw new Error('Не получен контрольный товар');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const problems = [];
  const measurements = [];
  const output = path.join(__dirname, '..', '.screenshots', 'design-system');
  fs.mkdirSync(output, { recursive: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1536, height: 960 }, serviceWorkers: 'block' });
    const cart = { items: [{ id: 'visual-only', quantity: 2, variant: { ...product.variants[0], product } }], total: Number(product.variants[0].price) * 2 };
    await context.route('**/api/v1/cart', route => route.fulfill({ json: cart }));
    // Last-registered routing wins. Install again after the private GET fixtures below.
    async function installMutationGuard() {
      await context.route('**/api/v1/**', async route => {
        const request = route.request();
        if (['GET', 'HEAD'].includes(request.method())) return route.fallback();
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': base, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
        const endpoint = new URL(request.url()).pathname.replace('/api/v1', '');
        if (request.method() === 'POST' && endpoint === '/storefront/cart/bind') return route.fulfill({ json: cart });
        problems.push(`Заблокирована непредусмотренная операция: ${request.method()} ${endpoint}`);
        return route.fulfill({ status: 501, json: { message: 'Операция заблокирована визуальной проверкой.' } });
      });
    }
    await installMutationGuard();
    await context.addInitScript(id => localStorage.setItem('sb-favorites', JSON.stringify([id])), product.id);
    const page = await context.newPage();
    page.on('pageerror', error => problems.push(error.message));

    async function audit(target, name) {
      await target.evaluate(() => document.fonts.ready);
      const metrics = await target.evaluate(() => {
        const scope = document.querySelector('.sb-glass-layer') || document.querySelector('.sb-storefront');
        const visible = e => { const s = getComputedStyle(e); return e.getClientRects().length && s.visibility !== 'hidden' && s.display !== 'none'; };
        const style = e => { const s = getComputedStyle(e); return { text: e.textContent.trim().slice(0, 40), size: s.fontSize, family: s.fontFamily, color: s.color, background: s.backgroundColor, material: s.backgroundImage, club: e.classList.contains('sb-club-join'), white: e.classList.contains('sb-club-about') || e.classList.contains('sb-secondary') || e.classList.contains('sa-secondary'), radius: s.borderRadius, height: e.getBoundingClientRect().height }; };
        const textIssues = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const e = node.parentElement;
          if (!node.textContent.trim() || !visible(e) || e.closest('script, style, svg, .sb-visually-hidden')) continue;
          const s = getComputedStyle(e);
          const decorative = e.closest('.sb-brand-story h2 em, .sb-club-banner__copy h2 em');
          const badge = e.closest('.sb-product-badge, .sb-mobile-nav b, .sb-header-actions b');
          if ((!s.fontFamily.includes('Montserrat') && !decorative) || (parseFloat(s.fontSize) < 12 && !badge)) textIssues.push(style(e));
          if (!badge && s.color === 'rgb(255, 94, 73)') textIssues.push(style(e));
        }
        return {
          width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          containerIssues: (() => {
            const header = document.querySelector('.sb-header')?.getBoundingClientRect();
            if (!header || scope.classList.contains('sb-glass-layer')) return [];
            return [...document.querySelectorAll('.sb-storefront main > *, .sb-footer')].filter(e => visible(e) && !e.classList.contains('sb-breadcrumbs')).flatMap(e => {
              const r = e.getBoundingClientRect();
              return Math.abs(r.left - header.left) > 1 || Math.abs(r.right - header.right) > 1 ? [{ class: e.className, left: r.left, right: r.right, headerLeft: header.left, headerRight: header.right }] : [];
            });
          })(),
          textIssues,
          cartBadges: [...scope.querySelectorAll('.sb-header-actions > button[aria-label="Корзина"] > b, .sb-mobile-nav > button[aria-label="Корзина"] > b')].filter(visible).map(style),
          clubMaterial: scope.querySelector('.sb-club-banner__card') ? getComputedStyle(scope.querySelector('.sb-club-banner__card')).backgroundImage : null,
          socialIcons: [...scope.querySelectorAll('.sb-social-buttons i img')].filter(visible).map(e => ({ src: e.getAttribute('src'), loaded: e.complete && e.naturalWidth > 0, filter: getComputedStyle(e).filter })),
          primary: [...scope.querySelectorAll('.sb-primary, .sb-liquid-primary, .sb-section-head > a, .sb-brand-story a, .sa-ui .sa-button, .sa-drawer .sa-button')].filter(visible).map(style),
          fields: [...scope.querySelectorAll('.sb-auth-card input, .sb-drawer-form input, .sb-checkout input, .sb-profile-grid input, .sb-reset-card input, .sa-ui .sa-form input, .sa-drawer .sa-form input')].filter(e => visible(e) && !['checkbox', 'file'].includes(e.type)).map(style),
          quantities: [...scope.querySelectorAll('.sb-quantity')].filter(visible).map(style),
          compactHeight: getComputedStyle(scope).getPropertyValue('--sf-control-compact').trim(),
        };
      });
      if (metrics.documentWidth > metrics.width + 1) problems.push(`${name}: горизонтальное переполнение`);
      if (metrics.containerIssues.length) problems.push(`${name}: контейнер ${JSON.stringify(metrics.containerIssues)}`);
      if (metrics.textIssues.length) problems.push(`${name}: типографика ${JSON.stringify(metrics.textIssues)}`);
      for (const badge of metrics.cartBadges) if (badge.background !== 'rgb(21, 21, 21)' || badge.color !== 'rgb(255, 255, 255)') problems.push(`${name}: счётчик корзины ${JSON.stringify(badge)}`);
      for (const icon of metrics.socialIcons) if (!icon.loaded || icon.filter !== 'none' || !/\/(yandex|vk)-id\.svg$/.test(icon.src)) problems.push(`${name}: логотип входа ${JSON.stringify(icon)}`);
      for (const s of metrics.primary) if (s.size !== '14px' || s.radius !== '14px' || s.height < 47.5 || (s.club ? !s.material.includes('gradient') || s.material !== metrics.clubMaterial : s.background !== (s.white ? 'rgb(255, 255, 255)' : 'rgb(21, 21, 21)')) || s.color !== (s.white ? 'rgb(21, 21, 21)' : 'rgb(255, 255, 255)')) problems.push(`${name}: действие ${JSON.stringify(s)}`);
      for (const s of metrics.fields) if (s.size !== '16px' || s.radius !== '14px' || Math.abs(s.height - 48) > .5) problems.push(`${name}: поле ${JSON.stringify(s)}`);
      measurements.push({ name, width: metrics.width, actions: metrics.primary.length, fields: metrics.fields.length, quantities: metrics.quantities.length });
      return metrics;
    }
    const urls = ['/', '/catalog', `/products/${product.slug}`, '/about', '/delivery', '/club', '/contacts', '/privacy', '/oferta', '/returns', '/favorites', '/cart', '/login', '/password-reset?token=visual-only'];
    for (const width of [1536, 1024, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const url of urls) {
        const response = await page.goto(base + url, { waitUntil: 'networkidle' });
        if (response.status() !== 200) problems.push(`${url}: HTTP ${response.status()}`);
        await audit(page, `${url} @ ${width}`);
        if (width !== 1024 && ['/login', '/cart', '/contacts', '/password-reset?token=visual-only'].includes(url)) await page.screenshot({ path: path.join(output, `${url.split('?')[0].slice(1)}-${width}.png`), fullPage: true });
      }
      await page.goto(base, { waitUntil: 'networkidle' });
      for (const [label, selector] of [['Каталог', '.sb-catalog-drawer'], ['Личный кабинет', '.sb-auth-drawer'], ['Избранное', '.sb-favorites-drawer'], ['Корзина', '.sb-cart-drawer']]) {
        const nav = width <= 760 ? '.sb-mobile-nav' : '.sb-header';
        await page.locator(nav).getByRole('button', { name: label, exact: true }).click();
        await page.locator(selector).waitFor();
        await page.waitForTimeout(800);
        await audit(page, `${label} drawer @ ${width}`);
        if (selector === '.sb-auth-drawer') {
          await page.locator(selector).getByRole('button', { name: 'Регистрация', exact: true }).click();
          await audit(page, `Регистрация drawer @ ${width}`);
        }
        await page.locator(selector).getByRole('button', { name: /^Закрыть/ }).click();
        await page.locator(selector).waitFor({ state: 'detached' });
      }
      console.log(`Страницы и панели проверены: ${width}px`);
    }
    // UI fixtures do not grant an actual server session or modify customer data.
    await context.addCookies([{ name: 'sb-customer-token', value: 'visual-fixture-only', url: base }]);
    await context.route('**/api/v1/auth/me', route => route.fulfill({ json: { id: 'visual-user', firstName: 'Покупатель', lastName: 'Тестовый', email: 'visual@example.invalid', role: 'CUSTOMER_B2C' } }));
    await context.route('**/api/v1/auth/profile', route => route.fulfill({ json: { id: 'visual-user', firstName: 'Покупатель', lastName: 'Тестовый', email: 'visual@example.invalid', phone: '+79990000000', city: 'Москва', role: 'CUSTOMER_B2C', avatarUrl: null, pendingChangeRequest: null, sessions: [], notificationPreferences: { email: true, push: true, chat: true } } }));
    await context.route('**/api/v1/storefront/favorites', route => route.fulfill({ json: [{ productId: product.id }] }));
    await context.route('**/api/v1/storefront/dashboard', route => route.fulfill({ json: {
      summary: { orders: 42, spent: 198000 },
      orders: [{ id: 'visual-order', orderNumber: 'ПРИМЕР-001', createdAt: new Date().toISOString(), status: 'PAID', finalAmount: '1250', items: [] }],
      addresses: [{ id: 'visual-address', label: 'Салон', city: 'Москва', street: 'Пример', house: '1', apartment: '2', recipientName: 'Покупатель Тестовый', phone: '+79990000000', isDefault: true }],
      loyalty: { balance: 1250, levelLabel: 'Старт', programName: 'SARKISIAN CLUB', isEnabled: true, earnPercent: 2, maxWriteOffPercent: 25, nextLevelLabel: 'Профессионал', progress: 25, toNextLevel: 3750, entries: [{ id: 'visual-bonus', amount: 250, reason: 'Бонусы за покупку', createdAt: new Date().toISOString() }, { id: 'visual-bonus-minus', amount: -100, reason: 'Использовано в заказе', createdAt: new Date().toISOString() }] },
    } }));
    await installMutationGuard();
    for (const width of [1536, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`${base}/account`, { waitUntil: 'networkidle' });
      await page.locator('.sa-summary').waitFor();
      for (const label of ['Обзор', 'Мои заказы', 'Бонусы', 'Адреса', 'Мои данные']) {
        await page.locator('.sb-account-nav').getByRole('button', { name: label, exact: true }).click();
        await audit(page, `Кабинет: ${label} @ ${width}`);
      }
      await page.screenshot({ path: path.join(output, `account-${width}.png`), fullPage: true });
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ measurements, problems }, null, 2));
    console.log(JSON.stringify({ checks: measurements.length, problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ measurements, problems }, null, 2));
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
