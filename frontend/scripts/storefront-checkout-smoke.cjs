const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
async function main() {
  const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
  const product = await fetch('http://localhost:3000/api/v1/products/gel-muss-kamufliruyushchiy-23').then(r => r.json());
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const problems = [];
  const results = [];
  const output = path.join(__dirname, '..', '.screenshots', 'checkout');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const width of [1536, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, isMobile: width < 760, hasTouch: width < 760 });
      const cart = { items: [{ id: 'visual-only', quantity: 1, variant: { ...product.variants[0], product } }], total: Number(product.variants[0].price) };
      await context.route('**/api/v1/cart', route => route.fulfill({ json: cart }));
      const recommendations = Array.from({ length: 9 }, (_, index) => ({ ...product, id: `recommendation-${index}`, nameRu: `Рекомендация ${index + 1}`, variants: [{ ...product.variants[0], id: `recommendation-variant-${index}` }] }));
      await context.route('**/api/v1/products/recommendations/cart?*', route => {
        const excluded = new URL(route.request().url()).searchParams.get('exclude').split(',');
        return route.fulfill({ json: { items: recommendations.filter(item => !excluded.includes(item.id)).slice(0, 8) } });
      });
      await context.route('**/api/v1/cart/items', route => {
        const variantId = route.request().postDataJSON().variantId;
        const item = recommendations.find(item => item.variants[0].id === variantId);
        cart.items.push({ id: 'added-only', quantity: 1, variant: { ...item.variants[0], product: item } });
        cart.total += Number(item.variants[0].price);
        return route.fulfill({ json: cart });
      });
      let submissions = 0;
      let payload;
      let paymentRequests = 0;
      await context.route('**/api/v1/orders/checkout', route => {
        submissions++; payload = route.request().postDataJSON();
        return submissions === 1
          ? route.fulfill({ status: 503, json: { message: 'Проверка повторной отправки' } })
          : route.fulfill({ json: { id: 'visual-order', orderNumber: 'ПРИМЕР-001', ...payload } });
      });
      context.on('request', request => { if (request.url().includes('/payments/')) paymentRequests++; });
      const page = await context.newPage();
      page.on('pageerror', error => problems.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && !message.text().includes('503') && !message.text().includes('console.time')) problems.push(message.text()); });
      await page.goto(base + '/cart', { waitUntil: 'networkidle' });
      const stage = page.locator('.sb-checkout-stage');
      const carousel = page.locator('.sb-cart-recommendations');
      await carousel.locator('.sb-product-card').nth(7).waitFor();
      const quickAdd = carousel.locator('.sb-card-add-overlay').first();
      if (width > 760) {
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);
        if (await quickAdd.evaluate(e => getComputedStyle(e).opacity) !== '0') problems.push('На ПК кнопка покупки видна без наведения');
        await carousel.locator('.sb-product-card__visual').first().hover();
        await page.waitForTimeout(300);
        if (await quickAdd.evaluate(e => getComputedStyle(e).opacity) !== '1') problems.push('На ПК покупка не появляется при наведении');
      }
      const icons = page.locator('.sb-checkout-steps button > svg');
      if (await icons.count() !== 4 || !(await icons.nth(3).getAttribute('class')).includes('check')) problems.push('Нет иконок справа у шагов');
      if (await carousel.locator('.sb-product-card').count() !== 8) problems.push('В карусели не 8 товаров');
      await carousel.getByRole('button', { name: 'Следующие товары', exact: true }).click();
      await page.waitForTimeout(700);
      if (await carousel.locator('.sb-cart-recommendations-track').evaluate(e => e.scrollLeft) <= 0) problems.push('Карусель не прокручивается');
      await carousel.getByRole('button', { name: 'Предыдущие товары', exact: true }).click();
      await page.waitForTimeout(700);
      if (width > 760) await carousel.locator('.sb-product-card__visual').first().hover();
      if (width < 760) {
        const layout = await carousel.locator('.sb-product-card').first().evaluate(e => ({ imageBottom: e.querySelector('.sb-product-card__visual').getBoundingClientRect().bottom, priceBottom: e.querySelector('.sb-product-card__meta strong').getBoundingClientRect().bottom, buttonTop: e.querySelector('.sb-card-add-mobile').getBoundingClientRect().top, overlay: getComputedStyle(e.querySelector('.sb-card-add-overlay')).display }));
        if (layout.overlay !== 'none' || layout.buttonTop < layout.priceBottom || layout.buttonTop < layout.imageBottom) problems.push('Мобильная покупка перекрывает фото или находится до цены');
      }
      await carousel.locator('.sb-product-card').first().getByRole('button', { name: 'В корзину', exact: false }).click();
      await stage.locator('.sb-cart-item').nth(1).waitFor();
      await carousel.getByRole('heading', { name: 'Рекомендация 9', exact: true }).waitFor();
      if (await carousel.getByRole('heading', { name: 'Рекомендация 1', exact: true }).count()) problems.push('Добавленный товар остался в рекомендациях');
      await page.screenshot({ path: path.join(output, `cart-carousel-${width}.png`), fullPage: true });
      if (await page.evaluate(() => document.documentElement.scrollWidth) > width + 1) problems.push('Карусель расширяет страницу');
      if (!(await page.locator('.sb-checkout-steps').getByRole('button', { name: '3 Доставка', exact: true }).isDisabled())) problems.push('Можно перескочить обязательные шаги');
      await page.getByRole('button', { name: 'К оформлению', exact: false }).click();
      if (await carousel.count()) problems.push('Карусель отображается после первого шага');
      await stage.getByRole('button', { name: 'Зарегистрироваться', exact: true }).click();
      await page.locator('.sb-auth-drawer').waitFor();
      if ((await page.locator('.sb-auth-drawer .sb-drawer-tabs button.active').innerText()) !== 'Регистрация') problems.push('Открывается не тот режим аккаунта');
      const brandIcons = await page.locator('.sb-auth-drawer .sb-social-buttons').evaluate(async e => {
        const images = [...e.querySelectorAll('img')];
        return images.length === 2 && (await Promise.all(images.map(async img => img.complete && img.naturalWidth > 0 && getComputedStyle(img).filter === 'none' && (await fetch(img.src).then(r => r.text())).toLowerCase().includes(img.src.includes('yandex') ? '#fc3f1d' : '#0077ff')))).every(Boolean);
      });
      if (!brandIcons) problems.push('Логотипы входа не загружены или потеряли фирменные цвета');
      await page.keyboard.press('Escape');
      await page.locator('.sb-auth-drawer').waitFor({ state: 'detached' });
      await stage.getByLabel('Имя', { exact: true }).fill('Анна');
      await stage.getByLabel('Фамилия', { exact: true }).fill('Петрова');
      await stage.getByLabel('Электронная почта', { exact: true }).fill('anna@example.test');
      await stage.getByLabel('Телефон', { exact: true }).fill('+79991234567');
      await stage.getByRole('button', { name: 'К доставке', exact: false }).click();
      if (await stage.getByLabel('Почтовый индекс', { exact: false }).count()) problems.push('Остался почтовый индекс');
      await stage.getByLabel('Город', { exact: true }).fill('Москва');
      if (width === 1536) {
        await stage.getByLabel('Улица', { exact: true }).fill('Центральная');
        await stage.getByLabel('Дом, корпус', { exact: true }).fill('1');
        await stage.getByLabel('Квартира или офис', { exact: true }).fill('15');
      } else {
      await stage.getByRole('button', { name: 'В пункт выдачи', exact: false }).click();
      await stage.getByLabel('Название желаемого ПВЗ', { exact: true }).fill('СДЭК на Центральной');
      await stage.getByLabel('Адрес желаемого ПВЗ', { exact: true }).fill('Центральная, 1');
      }
      await stage.getByRole('button', { name: 'Проверить заказ', exact: false }).click();
      await stage.getByText('Анна Петрова', { exact: true }).waitFor();
      await page.reload({ waitUntil: 'networkidle' });
      await stage.getByText('Анна Петрова', { exact: true }).waitFor();
      const submit = stage.getByRole('button', { name: 'Подтвердить заказ', exact: false });
      if (!(await submit.isDisabled())) problems.push('Нет обязательного подтверждения условий');
      await stage.locator('input[type="checkbox"]').check();
      await page.screenshot({ path: path.join(output, `review-${width}.png`), fullPage: true });
      const layout = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      if (layout.documentWidth > width + 1) problems.push('Переполнение оформления: ' + width);
      await submit.click();
      await page.getByRole('alert').getByText('Проверка повторной отправки', { exact: true }).waitFor();
      await submit.click();
      await page.getByText('Спасибо за заказ!', { exact: true }).waitFor();
      if (payload.contact.email !== 'anna@example.test' || payload.deliveryMethod !== (width === 1536 ? 'COURIER' : 'PICKUP_POINT') || (width === 1536 ? payload.shippingAddress.street !== 'Центральная' : payload.shippingAddress.pickupPointName !== 'СДЭК на Центральной')) problems.push('Данные заказа потерялись');
      if ('postalCode' in payload.shippingAddress) problems.push('Индекс отправляется в заказ');
      if (submissions !== 2 || paymentRequests !== 0) problems.push('Повторное создание или несогласованная оплата');
      await page.screenshot({ path: path.join(output, `confirmation-${width}.png`), fullPage: true });
      results.push({ width, carousel: 8, addedRecommendation: true, draftRestored: true, registrationDrawer: true, retry: true, deliveryMethod: payload.deliveryMethod, noPostalCode: true, paymentRequests });
      await context.close();
    }
    console.log(JSON.stringify({ results, problems }, null, 2));
    if (problems.length) process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
