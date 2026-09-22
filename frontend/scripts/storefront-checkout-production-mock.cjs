/* All API and provider requests are intercepted. No real customer/order writes. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc');

const base = process.env.STOREFRONT_URL || 'http://localhost:3001';
const origin = new URL(base).origin;
const output = path.join(__dirname, '..', '.screenshots', 'checkout-production-mock');
const results = [];

function checkVue() {
  for (const file of ['components/storefront/SiteCheckout.vue', 'pages/orders/[orderNumber].vue']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const parsed = parse(source, { filename: file });
    assert.equal(parsed.errors.length, 0, file + ': parse');
    const script = compileScript(parsed.descriptor, { id: file });
    const template = compileTemplate({ source: parsed.descriptor.template.content, filename: file, id: file, compilerOptions: { bindingMetadata: script.bindings } });
    assert.equal(template.errors.length, 0, file + ': template');
  }
}
const product = {
  id: 'mock-product', slug: 'mock-gel', nameRu: 'Профессиональный гель для моделирования', descriptionRu: 'Тестовый товар', basePrice: 1000, currency: 'RUB', images: [], categories: [],
  variants: [{ id: 'mock-variant', price: 1000, stock: 100, reserved: 0, sku: 'MOCK-001', name: '30 мл', isActive: true }],
};
function makeCart() { return { items: [{ id: 'mock-item', variantId: 'mock-variant', quantity: 2, variant: { ...product.variants[0], product } }], total: 2000 }; }
const fullGiftCode = '01234567-89ABCDEF-01234567-89ABCDEF';
const partialGiftCode = 'ABCDEF01-23456789-ABCDEF01-23456789';
function makeGiftCart() { const cart = makeCart(); cart.items[0].variant.product = { ...product, productType: 'GIFT_CARD', nameRu: 'Электронная подарочная карта', giftCardValidityDays: 365 }; cart.items[0].variant.options = { nominal: 1000, validityDays: 365, giftCardValidityDays: 365 }; cart.items[0].variant.stock = 0; return cart; }
function mockQuote(state, body, options) {
  const digitalDelivery = state.cart.items.length > 0 && state.cart.items.every(item => item.variant.product.productType === 'GIFT_CARD');
  if (digitalDelivery) {
    assert.equal(body.deliveryMethod, 'DIGITAL'); assert.deepEqual(body.shippingAddress, {});
    for (const field of ['shippingProvider', 'shippingQuoteId', 'promoCode', 'useBonuses', 'giftCardCode']) assert.equal(body[field], undefined, 'digital must omit ' + field);
  }
  const subtotal = state.cart.total, discount = body.promoCode === 'SAVE10' ? subtotal / 10 : 0;
  const bonusAmount = options.auth && body.useBonuses ? 300 : 0, deliveryConfirmed = digitalDelivery || body.shippingQuoteId === 'mock-shipping-quote';
  const shippingAmount = digitalDelivery ? 0 : deliveryConfirmed ? 300 : null;
  const beforeGift = subtotal - discount - bonusAmount + (shippingAmount ?? 0);
  const giftCardAmount = body.giftCardCode === fullGiftCode ? beforeGift : body.giftCardCode === partialGiftCode ? Math.min(500, beforeGift) : 0;
  const total = beforeGift - giftCardAmount;
  return { subtotal, discount, bonusAmount, giftCardAmount, digitalDelivery, shippingAmount, total, currency: 'RUB', deliveryConfirmed, maxBonusAmount: !digitalDelivery && options.auth ? 300 : 0, earnEstimate: !digitalDelivery && options.auth ? 18 : 0, messages: deliveryConfirmed ? [] : ['Стоимость доставки подтвердим до оплаты'], canPay: deliveryConfirmed && (total > 0 || giftCardAmount > 0) };
}
function checkGiftFixtures() {
  const digital = mockQuote({ cart: makeGiftCart() }, { deliveryMethod: 'DIGITAL', shippingAddress: {} }, {});
  assert.equal(digital.shippingAmount, 0); assert.equal(digital.deliveryConfirmed, true); assert.equal(digital.canPay, true); assert.equal(digital.digitalDelivery, true);
  const unconfirmed = mockQuote({ cart: makeCart() }, { giftCardCode: fullGiftCode }, {});
  assert.equal(unconfirmed.shippingAmount, null); assert.equal(unconfirmed.canPay, false);
  const partial = mockQuote({ cart: makeCart() }, { shippingQuoteId: 'mock-shipping-quote', giftCardCode: partialGiftCode }, {});
  assert.equal(partial.giftCardAmount, 500); assert.equal(partial.total, 1800);
  const full = mockQuote({ cart: makeCart() }, { shippingQuoteId: 'mock-shipping-quote', giftCardCode: fullGiftCode }, {});
  assert.equal(full.total, 0); assert.equal(full.giftCardAmount, 2300); assert.equal(full.canPay, true);
}
function makeOrder(confirmed, amount, paid = false, expired = false) {
  return {
    orderNumber: 'SB-MOCK-001', status: paid ? 'PAID' : 'NEW', paymentStatus: paid ? 'PAID' : 'UNPAID',
    reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + (expired ? -60000 : 1800000)).toISOString(),
    finalAmount: amount, totalAmount: 2000, shippingCost: confirmed ? 300 : 0,
    buyerName: 'Анна Петрова', buyerEmail: 'anna@example.test', buyerPhone: '+79991234567',
    shippingAddress: { city: 'Москва', address: 'Центральная, 1' },
    priceSnapshot: { subtotal: 2000, discount: 200, bonusAmount: 0, shippingAmount: confirmed ? 300 : null, deliveryConfirmed: confirmed },
    items: [{ id: 'mock-order-item', productName: product.nameRu, variantName: '30 мл', externalSku: 'MOCK-001', quantity: 2, price: 1000, total: 2000 }],
    requiresDeliveryConfirmation: !confirmed, canPay: confirmed && !paid && !expired,
  };
}

async function setup(browser, options = {}) {
  const width = options.width || 390;
  const context = await browser.newContext({ viewport: { width, height: 960 }, isMobile: width < 760, hasTouch: width < 760 });
  await context.addCookies([{ name: 'sb-cart-session', value: 'mock-cart-session-0000001', url: origin }, ...(options.auth ? [{ name: 'sb-customer-token', value: 'mock-bearer', url: origin }] : [])]);
  const state = { cart: makeCart(), requests: [], created: 0, checkoutCalls: 0, payments: 0, shipping: 0, points: 0, external: 0, unknown: [], order: options.order || null, lost: options.lost || false, priceChange: options.priceChange || false, paymentEnabled: options.paymentEnabled || false, paymentUrl: options.paymentUrl || 'https://yoomoney.ru/checkout/mock' };
  const pageErrors = [];
  if (options.digital) state.cart = makeGiftCart();
  if (options.mixed) { const gift = makeGiftCart().items[0]; gift.id = 'mock-gift-item'; gift.variantId = 'mock-gift-variant'; state.cart.items.push(gift); state.cart.total += 2000; }
  state.citiesAvailable = Boolean(options.shippingEnabled);
  const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,x-cart-session,x-order-access,x-idempotency-key,content-type,cache-control', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'cache-control': 'no-store' };
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/v1/')) {
      if (url.origin === origin) return route.continue();
      if (['yoomoney.ru', 'yookassa.ru'].includes(url.hostname)) { state.external++; return route.fulfill({ contentType: 'text/html', body: '<p>Mock official payment page, no external requests</p>' }); }
      state.unknown.push(url.origin + url.pathname); return route.abort();
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const endpoint = url.pathname.slice('/api/v1'.length);
    let body; try { body = request.postDataJSON(); } catch { body = null; }
    state.requests.push({ endpoint, method: request.method(), body, headers: request.headers() });
    const reply = (json, status = 200) => route.fulfill({ json, status, headers });
    if (endpoint === '/products/storefront-content') return reply({ settings: { announcementText: 'SARKISIAN BRAND' }, categories: [], banners: [], socialLinks: [], menuItems: [] });
    if (endpoint === '/auth/me') return reply({ id: 'mock-customer', role: 'CUSTOMER_B2C', email: 'anna@example.test', firstName: 'Анна', lastName: 'Петрова', phone: '+79991234567' });
    if (endpoint === '/storefront/favorites') return reply([]);
    if (endpoint === '/storefront/cart/bind' || endpoint === '/cart') return reply(state.cart);
    if (endpoint === '/cart/items/mock-item' && request.method() === 'PATCH') { state.cart.items[0].quantity = body.quantity; state.cart.total = body.quantity * 1000; return reply(state.cart); }
    if (endpoint === '/products/recommendations/cart') return reply({ items: Array.from({ length: 8 }, (_, i) => ({ ...product, id: 'rec-' + i, slug: 'rec-' + i, nameRu: 'Рекомендация ' + (i + 1), variants: [{ ...product.variants[0], id: 'rec-variant-' + i }] })) });
    if (endpoint === '/storefront/addresses') return reply([{ id: 'saved-1', label: 'Салон', recipientName: 'Анна Петрова', phone: '+79991234567', city: 'Москва', street: 'Центральная', house: '1', apartment: '15', cityCode: 44 }]);
    if (endpoint === '/shipping/capabilities') return reply({ providers: [{ provider: 'CDEK', available: Boolean(options.shippingEnabled), canEstimate: Boolean(options.shippingEnabled), canListPickupPoints: Boolean(options.shippingEnabled), message: 'Доставка подтверждается до оплаты' }, { provider: 'OZON_DELIVERY', available: false, canEstimate: false, canListPickupPoints: false, message: 'Доставка Ozon подтверждается до оплаты' }] });
    if (endpoint === '/payments/capabilities') return reply({ provider: 'YOOKASSA', available: state.paymentEnabled, reason: state.paymentEnabled ? null : 'Онлайн-оплата отключена до проверки на VPS' });
    if (endpoint === '/shipping/cities') { assert.ok(url.searchParams.get('search').trim().length >= 2); assert.equal(url.searchParams.get('provider'), 'CDEK'); return reply({ provider: 'CDEK', available: state.citiesAvailable, cities: state.citiesAvailable ? [{ code: 44, city: 'Москва', region: 'Москва', country: 'Россия', countryCode: 'RU' }] : [], message: 'Выберите город и регион' }); }
    if (endpoint === '/shipping/pickup-points') { state.points++; assert.equal(url.searchParams.get('cityCode'), '44'); return reply({ available: true, points: [{ code: 'PVZ-44', name: 'СДЭК Центральная', address: 'Центральная, 1', cityCode: 44 }] }); }
    if (endpoint === '/shipping/estimate') { state.shipping++; assert.equal(body.cityCode, 44); return reply({ provider: 'CDEK', available: true, amount: 300, currency: 'RUB', requiresConfirmation: false, quoteId: 'mock-shipping-quote', expiresAt: new Date(Date.now() + 900000).toISOString(), message: 'Стоимость рассчитана' }); }
    if (endpoint === '/orders/quote') {
      assert.ok(!('expectedTotal' in body), 'quote must not receive expectedTotal');
      if (options.mixed) return reply({ message: 'Подарочные сертификаты и физические товары оформляются отдельными заказами. Разделите корзину' }, 400);
      if (body.promoCode === 'BAD') return reply({ message: 'Промокод недействителен' }, 400);
      if (body.giftCardCode && ![fullGiftCode, partialGiftCode].includes(body.giftCardCode)) return reply({ message: 'Сертификат недействителен или срок его действия истёк' }, 400);
      return reply(mockQuote(state, body, options));
    }
    if (endpoint === '/orders/checkout') {
      state.checkoutCalls++;
      assert.equal(body.acceptedTerms, true); assert.match(request.headers()['x-idempotency-key'], /^[a-zA-Z0-9_-]{16,100}$/);
      assert.equal(typeof body.expectedTotal, 'number');
      assert.ok(!JSON.stringify(body).includes('postalCode'));
      if (state.priceChange) {
        state.priceChange = false; state.cart.items[0].variant.price = 1050; state.cart.total = 2100;
        return reply({ message: 'Цена или условия заказа изменились. Проверьте обновлённую сумму перед оформлением' }, 409);
      }
      if (!state.order) {
        const calculated = mockQuote(state, body, options);
        if (body.giftCardCode && !calculated.deliveryConfirmed) return reply({ message: 'Подтвердите сертификат и стоимость доставки' }, 400);
        state.created++;
        assert.equal(body.expectedTotal, calculated.total);
        const fullyCovered = calculated.total === 0 && calculated.giftCardAmount > 0;
        state.order = makeOrder(calculated.deliveryConfirmed, calculated.total, fullyCovered);
        state.order.items = state.cart.items.map(item => ({ id: item.id, productName: item.variant.product.nameRu, productType: item.variant.product.productType || 'PHYSICAL', variantName: item.variant.name, quantity: item.quantity, price: item.variant.price, total: item.quantity * item.variant.price }));
        state.order.shippingCost = calculated.shippingAmount ?? 0;
        state.order.giftCardAmount = calculated.giftCardAmount;
        if (fullyCovered) { state.order.paymentStatus = 'SUCCEEDED'; state.order.canPay = false; }
        state.order.shippingAddress = body.shippingAddress;
        state.order.totalAmount = calculated.subtotal;
        state.order.priceSnapshot = calculated;
        state.cart = { items: [], total: 0 };
      }
      if (state.lost) { state.lost = false; return reply({ message: 'Mock lost response' }, 503); }
      return reply({ ...state.order, ...(options.auth ? {} : { accessToken: 'mock-guest-secret' }) });
    }
    if (endpoint === '/orders/SB-MOCK-001') {
      assert.ok(options.auth ? request.headers().authorization === 'Bearer mock-bearer' : request.headers()['x-order-access'] === 'mock-guest-secret');
      return reply(state.order);
    }
    if (endpoint === '/payments/orders/SB-MOCK-001') {
      state.payments++; assert.equal(body.returnUrl, origin + '/orders/SB-MOCK-001');
      assert.ok(options.auth ? request.headers().authorization === 'Bearer mock-bearer' : request.headers()['x-order-access'] === 'mock-guest-secret');
      return reply({ provider: 'YOOKASSA', confirmationUrl: state.paymentUrl, paymentId: 'mock-payment', status: 'PENDING' });
    }
    state.unknown.push(endpoint); return reply({ message: 'Unexpected mock endpoint' }, 404);
  });
  const page = await context.newPage(); page.setDefaultNavigationTimeout(90000); page.setDefaultTimeout(20000); page.on('pageerror', e => pageErrors.push(e.message));
  return { context, page, state, pageErrors };
}
async function quoteSettled(page) {
  await page.waitForFunction(() => { const summary = document.querySelector('.sb-checkout-summary'); return summary && summary.getAttribute('aria-busy') === 'false' && !summary.textContent.includes('Обновляем расчёт'); });
  await page.waitForTimeout(400);
}
async function assertSummaryPromo(page) {
  const promo = page.locator('.sb-checkout-summary .sb-checkout-summary-promo');
  await promo.getByLabel('Промокод', { exact: true }).waitFor();
  assert.equal(await page.locator('.sb-checkout-stage #sb-checkout-promo-code').count(), 0, 'promo belongs to permanent summary, not a step panel');
  const bounds = await promo.boundingBox(), input = await promo.getByLabel('Промокод', { exact: true }).boundingBox(), button = await promo.getByRole('button', { name: 'Применить', exact: true }).boundingBox();
  assert.ok(bounds && input && button && input.width > 0 && button.width > 0);
  assert.ok(input.x + input.width <= bounds.x + bounds.width + 1 && button.x + button.width <= bounds.x + bounds.width + 1, 'compact summary controls must not overflow');
  assert.ok(button.x >= input.x && button.x + button.width <= input.x + input.width, 'apply check belongs inside the input');
  assert.equal(await promo.getByRole('button', { name: 'Применить', exact: true }).innerText(), '', 'apply is an icon, not a text button');
  assert.ok(['rgb(21, 21, 21)', 'rgb(41, 41, 41)'].includes(await promo.getByRole('button', { name: 'Применить', exact: true }).evaluate(element => getComputedStyle(element).backgroundColor)), 'apply check uses the black action palette, including hover');
  assert.ok(bounds.width <= 420);
  assert(await promo.evaluate(element => {
    const action = element.parentElement.querySelector(':scope > .sb-primary');
    return !action || Boolean(element.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING);
  }), 'summary promo must precede checkout action, including mobile');
}
async function contactStep(page, auth) {
  await page.getByRole('button', { name: 'К оформлению', exact: false }).click();
  await quoteSettled(page);
  const contactSummary = await page.locator('.sb-checkout-summary').innerText();
  for (const hidden of ['Доставка', 'Предварительная сумма', 'Списание бонусов', 'После подтверждения оплаты']) assert.ok(!contactSummary.includes(hidden), 'step 2 hides ' + hidden);
  assert.equal(await page.getByLabel('Использовать бонусы', { exact: false }).count(), 0);
  if (await page.getByLabel('Промокод', { exact: true }).count()) await assertSummaryPromo(page);
  const stage = page.locator('.sb-checkout-stage');
  if (!auth) {
    await stage.getByLabel('Имя', { exact: true }).fill('Анна'); await stage.getByLabel('Фамилия', { exact: true }).fill('Петрова');
    await stage.getByLabel('Электронная почта', { exact: true }).fill('anna@example.test'); await stage.getByLabel('Телефон', { exact: true }).fill('+79991234567');
  }
  await stage.getByRole('button', { name: /^(?:К доставке|К получению карты)/ }).click();
  if (await stage.locator('.sb-delivery-providers button').count()) await stage.locator('.sb-delivery-providers button').first().click();
  if (await page.getByLabel('Промокод', { exact: true }).count()) {
    await assertSummaryPromo(page);
    const promo = page.locator('.sb-checkout-summary-promo');
    if (await promo.getByLabel('Промокод', { exact: true }).inputValue()) {
      await promo.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
    }
  }
}
async function acceptAndSubmit(page, name, { useBonuses = false, state } = {}) {
  await page.locator('.sb-checkout-stage').getByRole('button', { name: 'Проверить заказ', exact: false }).click(); await quoteSettled(page);
  if (await page.getByLabel('Промокод', { exact: true }).count()) {
    await assertSummaryPromo(page);
    const promo = page.locator('.sb-checkout-summary-promo');
    if (await promo.getByLabel('Промокод', { exact: true }).inputValue()) {
      await promo.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
    }
  }
  if (useBonuses) {
    await page.getByLabel('Использовать бонусы', { exact: false }).check(); await quoteSettled(page);
    assert(await page.locator('.sb-checkout-stage').evaluate(stage => {
      const bonuses = stage.querySelector('.sb-checkout-final-bonuses');
      const consent = stage.querySelector('.sb-checkout-check:not(.sb-checkout-bonuses) input');
      return bonuses && consent && Boolean(bonuses.compareDocumentPosition(consent) & Node.DOCUMENT_POSITION_FOLLOWING);
    }), 'bonus selection must precede payment consent and submit, including mobile');
    assert.ok((await page.locator('.sb-checkout-summary').innerText()).includes('Списание бонусов'));
    await page.locator('.sb-checkout-steps button').nth(2).click(); await quoteSettled(page);
    assert.equal(await page.getByLabel('Использовать бонусы', { exact: false }).count(), 0);
    assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.useBonuses, false, 'back navigation must not preview bonus spending');
    await page.locator('.sb-checkout-stage').getByRole('button', { name: 'Проверить заказ', exact: false }).click(); await quoteSettled(page);
    assert.equal(await page.getByLabel('Использовать бонусы', { exact: false }).isChecked(), true, 'last-step bonus choice may be retained');
    assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.useBonuses, true);
  }
  if (useBonuses) await audit(page, page.viewportSize().width, 'mobile-final-rewards');
  await page.locator('.sb-checkout-stage .sb-checkout-check:not(.sb-checkout-bonuses) input').check();
  await page.getByRole('button', { name, exact: false }).click();
}
async function audit(page, width, name) {
  await page.waitForTimeout(200);
  assert.ok(await page.evaluate(w => document.documentElement.scrollWidth <= w + 1, width), name + ': horizontal overflow');
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
}

async function main() {
  checkVue();
  checkGiftFixtures();
  console.log('PASS: pure gift fixtures (digital / unconfirmed / partial / full), no server/provider.');
  if (process.argv.includes('--parse-only')) { console.log('PASS: owned checkout/order Vue scripts and templates compile (no browser/server/provider).'); return; }
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    {
      console.log('Mock: guest checkout / idempotency');
      const { context, page, state, pageErrors } = await setup(browser, { width: 1536, lost: true });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-checkout-cart-promo').waitFor();
      await page.getByLabel('Промокод', { exact: true }).fill('SAVE10'); await page.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
      assert.ok(state.requests.some(r => r.endpoint === '/orders/quote' && r.body.promoCode === 'SAVE10' && !r.body.contact));
      assert.match(await page.locator('.sb-checkout-summary').innerText(), /1\s?800/);
      await contactStep(page, false); const stage = page.locator('.sb-checkout-stage');
      await stage.getByLabel('Город', { exact: true }).fill('Москва'); await stage.getByLabel('Улица', { exact: true }).fill('Центральная'); await stage.getByLabel('Дом, корпус', { exact: true }).fill('1');
      await acceptAndSubmit(page, 'Подтвердить заказ'); await page.getByRole('button', { name: 'Повторить безопасно', exact: false }).waitFor();
      const first = state.requests.find(r => r.endpoint === '/orders/checkout');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Повторить безопасно', exact: false }).waitFor();
      await page.locator('.sb-checkout-stage .sb-checkout-check:not(.sb-checkout-bonuses) input').check(); await page.getByRole('button', { name: 'Повторить безопасно', exact: false }).click();
      await page.waitForURL('**/orders/SB-MOCK-001'); await page.locator('.sb-order-summary').waitFor();
      const attempts = state.requests.filter(r => r.endpoint === '/orders/checkout'); assert.equal(attempts.length, 2); assert.equal(attempts[1].headers['x-idempotency-key'], first.headers['x-idempotency-key']); assert.deepEqual(attempts[1].body, first.body);
      assert.equal(state.created, 1); assert.equal(state.payments, 0); assert.equal(state.shipping, 0); assert.equal(state.points, 0);
      assert.equal(await page.evaluate(() => sessionStorage.getItem('sb-order-access:SB-MOCK-001')), 'mock-guest-secret'); assert.ok(!page.url().includes('secret'));
      assert.match(await page.locator('.sb-order-summary').innerText(), /Требует подтверждения/); assert.equal(await page.getByRole('button', { name: 'Оплатить заказ' }).count(), 0);
      assert.deepEqual(pageErrors, []); assert.deepEqual(state.unknown, []); await audit(page, 1536, 'guest-idempotent-order');
      results.push('Guest: promo step1, uncertain reload/retry same body+key, one order, protected token, delivery null/no payment'); await context.close();
    }
    {
      console.log('Mock: expectedTotal / definitive price conflict');
      const { context, page, state } = await setup(browser, { priceChange: true, width: 390 });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-checkout-cart-promo').waitFor();
      await page.getByLabel('Промокод', { exact: true }).fill('SAVE10'); await page.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
      await contactStep(page, false);
      const stage = page.locator('.sb-checkout-stage'); await stage.getByLabel('Город', { exact: true }).fill('Москва'); await stage.getByLabel('Улица', { exact: true }).fill('Центральная'); await stage.getByLabel('Дом, корпус', { exact: true }).fill('1');
      await acceptAndSubmit(page, 'Подтвердить заказ'); await page.getByRole('alert').filter({ hasText: 'Цена или условия заказа изменились' }).waitFor(); await quoteSettled(page);
      assert.equal(state.checkoutCalls, 1); assert.equal(state.created, 0); assert.equal(state.payments, 0);
      assert.equal(await stage.locator('.sb-checkout-check:not(.sb-checkout-bonuses) input').isChecked(), false);
      assert.equal(await page.getByRole('button', { name: 'Подтвердить заказ', exact: false }).isDisabled(), true);
      assert.match(await page.locator('.sb-checkout-summary').innerText(), /1\s?890/);
      const first = state.requests.find(r => r.endpoint === '/orders/checkout'); assert.equal(first.body.expectedTotal, 1800);
      await stage.locator('.sb-checkout-check:not(.sb-checkout-bonuses) input').check(); await page.getByRole('button', { name: 'Подтвердить заказ', exact: false }).click(); await page.waitForURL('**/orders/SB-MOCK-001'); await page.locator('.sb-order-summary').waitFor();
      const attempts = state.requests.filter(r => r.endpoint === '/orders/checkout'); assert.equal(attempts[1].body.expectedTotal, 1890); assert.notEqual(attempts[1].headers['x-idempotency-key'], first.headers['x-idempotency-key']); assert.equal(state.created, 1);
      results.push('expectedTotal: stable retry payload, definitive 409 no order, reprice + renewed consent, new key only explicit resubmit'); await context.close();
    }
    {
      console.log('Mock: authenticated checkout / delivery');
      const { context, page, state, pageErrors } = await setup(browser, { auth: true, shippingEnabled: true });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-cart-item').waitFor();
      await page.getByRole('button', { name: 'Увеличить количество', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.sb-quantity b')?.textContent === '3');
      await page.getByRole('button', { name: 'Уменьшить количество', exact: true }).click(); await quoteSettled(page);
      await page.getByLabel('Промокод', { exact: true }).fill('BAD'); await page.getByRole('button', { name: 'Применить', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'Промокод недействителен' }).waitFor();
      await page.getByRole('button', { name: 'Убрать промокод BAD', exact: false }).click();
      await page.getByLabel('Промокод', { exact: true }).fill('SAVE10'); await page.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
      assert.equal(await page.getByLabel('Использовать бонусы', { exact: false }).count(), 0, 'bonus choice belongs only to the last step');
      const cartSummary = await page.locator('.sb-checkout-summary').innerText();
      for (const hidden of ['Доставка', 'Предварительная сумма', 'Списание бонусов', 'После подтверждения оплаты']) assert.ok(!cartSummary.includes(hidden), 'step 1 hides ' + hidden);
      assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.useBonuses, false);
      await assertSummaryPromo(page);
      await audit(page, 390, 'mobile-cart-promo'); await contactStep(page, true);
      // These wrapping labels include descendant option text in their accessible name.
      // Match the label prefix, while still selecting the exact fixture option value.
      const stage = page.locator('.sb-checkout-stage'); await stage.getByRole('combobox', { name: /^Сохранённый адрес/ }).selectOption('saved-1');
      assert.equal(await stage.getByLabel('Город', { exact: true }).inputValue(), 'Москва');
      await stage.getByRole('listbox', { name: 'Город и регион' }).getByRole('button', { name: 'Москва Москва', exact: true }).click();
      await stage.getByText('Стоимость рассчитана', { exact: true }).waitFor(); await quoteSettled(page);
      const cityRequestsBeforeEdit = state.requests.filter(request => request.endpoint === '/shipping/cities').length;
      const shippingBeforeEdit = state.shipping;
      await stage.getByLabel('Город', { exact: true }).fill('М');
      await quoteSettled(page); await page.waitForTimeout(400);
      assert.equal(state.requests.filter(request => request.endpoint === '/shipping/cities').length, cityRequestsBeforeEdit, 'one-letter query must not call cities');
      assert.equal(state.shipping, shippingBeforeEdit, 'manual city edit must clear carrier code and block tariff');
      state.citiesAvailable = false;
      await stage.getByLabel('Город', { exact: true }).fill('Моск');
      await stage.getByText('Поиск городов временно недоступен. Укажите адрес или желаемый ПВЗ — подтвердим доставку до оплаты.', { exact: true }).waitFor();
      await quoteSettled(page);
      assert.equal(await stage.getByRole('listbox').count(), 0, 'gated cities response must not offer invented cities');
      assert.equal(state.shipping, shippingBeforeEdit, 'gated lookup must not call tariff');
      const manualQuote = state.requests.filter(request => request.endpoint === '/orders/quote').at(-1);
      assert.equal(manualQuote.body.shippingAddress.cityCode, undefined); assert.equal(manualQuote.body.shippingQuoteId, undefined);
      state.citiesAvailable = true;
      await stage.getByLabel('Город', { exact: true }).fill('Москва');
      await stage.getByRole('listbox', { name: 'Город и регион' }).getByRole('button', { name: 'Москва Москва', exact: true }).click();
      await stage.getByRole('button', { name: 'В пункт выдачи', exact: false }).click(); await stage.getByRole('combobox', { name: /^Пункт выдачи/ }).selectOption('PVZ-44');
      await quoteSettled(page);
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.sb-checkout-summary > div')).some(row => row.querySelector('span')?.textContent === 'Доставка' && row.querySelector('b')?.textContent.includes('300')));
      await audit(page, 390, 'mobile-actual-pvz'); await acceptAndSubmit(page, 'Подтвердить заказ', { useBonuses: true, state });
      await page.waitForURL('**/orders/SB-MOCK-001'); await page.locator('.sb-order-summary').waitFor();
      const checkout = state.requests.find(r => r.endpoint === '/orders/checkout'); assert.equal(checkout.body.useBonuses, true); assert.equal(checkout.body.shippingQuoteId, 'mock-shipping-quote'); assert.equal(checkout.body.shippingAddress.pickupPointCode, 'PVZ-44');
      for (const r of state.requests.filter(r => ['/cart', '/cart/items/mock-item', '/orders/quote', '/orders/checkout', '/shipping/estimate'].includes(r.endpoint))) assert.equal(r.headers.authorization, 'Bearer mock-bearer', r.endpoint + ': bearer');
      assert.ok(state.points > 0 && state.shipping > 0); assert.equal(state.payments, 0); assert.equal(await page.evaluate(() => sessionStorage.getItem('sb-order-access:SB-MOCK-001')), null);
      assert.deepEqual(pageErrors, []); assert.deepEqual(state.unknown, []); results.push('Auth: bearer cart/quote/estimate/checkout, promo errors/clear, bonuses, saved address, real mock PVZ+quote'); await context.close();
    }
    {
      console.log('Mock: mixed basket guard');
      const { context, page, state } = await setup(browser, { mixed: true });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.getByRole('alert').filter({ hasText: 'Уберите из корзины один из типов товаров' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'К оформлению', exact: false }).isDisabled(), true); assert.equal(state.created, 0); assert.equal(state.payments, 0);
      results.push('Mixed basket: explicit separate-order notice, checkout blocked'); await context.close();
    }
    {
      console.log('Mock: digital gift purchase / protected issuance');
      const { context, page, state, pageErrors } = await setup(browser, { digital: true, paymentEnabled: true });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-cart-item').waitFor(); await quoteSettled(page);
      assert.equal(await page.getByLabel('Промокод', { exact: true }).count(), 0);
      await contactStep(page, false);
      const stage = page.locator('.sb-checkout-stage'); await stage.getByRole('heading', { name: 'Получение карты', exact: true }).waitFor();
      for (const field of ['Город', 'Улица', 'Служба доставки']) assert.equal(await stage.getByLabel(field, { exact: true }).count(), 0);
      await stage.getByRole('button', { name: 'Проверить заказ', exact: false }).click(); await quoteSettled(page);
      assert.equal(await page.getByLabel('Подарочная карта', { exact: true }).count(), 0); assert.equal(await page.getByLabel('Использовать бонусы', { exact: false }).count(), 0);
      await stage.locator('.sb-checkout-check input').check(); await page.getByRole('button', { name: 'Оформить и оплатить', exact: false }).click();
      await page.waitForURL('https://yoomoney.ru/checkout/mock');
      const checkout = state.requests.find(request => request.endpoint === '/orders/checkout'); assert.equal(checkout.body.deliveryMethod, 'DIGITAL'); assert.deepEqual(checkout.body.shippingAddress, {});
      assert.equal(state.requests.filter(request => request.endpoint.startsWith('/shipping/')).length, 0, 'digital order must make zero shipping network requests');
      assert.equal(state.payments, 1); assert.equal(state.external, 1); assert.equal(state.created, 1);
      const issued = { id: 'mock-issued-card', code: fullGiftCode, faceValue: '1000.00', balance: '1000.00', expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() };
      state.order.giftCards = [issued]; // An unpaid response must not reveal even an erroneously supplied code.
      await page.goto(base + '/orders/SB-MOCK-001', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-order-gift-cards').waitFor();
      assert.ok(!(await page.locator('.sb-order-gift-cards').innerText()).includes(fullGiftCode));
      state.order.status = 'PAID'; state.order.paymentStatus = 'SUCCEEDED'; state.order.canPay = false;
      await page.getByRole('button', { name: 'Обновить статус', exact: false }).click(); await page.locator('.sb-order-gift-card code').waitFor();
      assert.equal(await page.locator('.sb-order-gift-card code').innerText(), fullGiftCode);
      assert.equal(await page.getByRole('button', { name: 'Скопировать код', exact: false }).count(), 1);
      assert.equal(state.payments, 1);
      const stored = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage }, url: location.href })); assert.ok(!stored.includes(fullGiftCode));
      assert.deepEqual(pageErrors, []); assert.deepEqual(state.unknown, []); results.push('Digital: DIGITAL+empty address, no discounts/shipping calls, mock official payment, codes only protected paid GET'); await context.close();
    }
    {
      console.log('Mock: physical gift redemption / full coverage safe retry');
      const { context, page, state, pageErrors } = await setup(browser, { shippingEnabled: true, paymentEnabled: true, lost: true });
      await page.goto(base + '/cart', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-cart-item').waitFor(); await contactStep(page, false);
      const stage = page.locator('.sb-checkout-stage');
      await stage.getByLabel('Город', { exact: true }).fill('Москва');
      await stage.getByRole('listbox', { name: 'Город и регион' }).getByRole('button', { name: 'Москва Москва', exact: true }).click();
      await stage.getByRole('button', { name: 'В пункт выдачи', exact: false }).click(); await stage.getByRole('combobox', { name: /^Пункт выдачи/ }).selectOption('PVZ-44');
      await quoteSettled(page);
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.sb-checkout-summary > div')).some(row => row.querySelector('span')?.textContent === 'Доставка' && row.querySelector('b')?.textContent.includes('300')));
      await stage.getByRole('button', { name: 'Проверить заказ', exact: false }).click(); await quoteSettled(page);
      const giftForm = stage.locator('.sb-checkout-gift-code');
      await page.setViewportSize({ width: 1536, height: 960 });
      assert(await page.locator('.sb-checkout-rewards').evaluate(element => {
        const style = getComputedStyle(element.parentElement);
        const available = element.parentElement.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const cards = [...element.querySelectorAll('.sb-checkout-reward')].map(card => card.getBoundingClientRect());
        return Math.abs(element.getBoundingClientRect().width - available) < 2 && cards.length === 2 && Math.abs(cards[0].top - cards[1].top) < 1 && Math.abs(cards[0].width - cards[1].width) < 1;
      }), 'reward panels fill their container in two equal desktop columns');
      await audit(page, 1536, 'desktop-final-rewards');
      await page.setViewportSize({ width: 390, height: 844 });
      await giftForm.getByLabel('Подарочная карта', { exact: true }).fill('BAD'); await giftForm.getByRole('button', { name: 'Применить', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Сертификат недействителен' }).waitFor();
      await giftForm.getByRole('button', { name: 'Убрать подарочную карту', exact: false }).click(); await quoteSettled(page);
      await giftForm.getByLabel('Подарочная карта', { exact: true }).fill(partialGiftCode); await giftForm.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
      assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.giftCardCode, partialGiftCode);
      assert.ok((await page.locator('.sb-checkout-summary').innerText()).includes('−500'));
      await giftForm.getByRole('button', { name: 'Убрать подарочную карту', exact: false }).click(); await quoteSettled(page);
      assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.giftCardCode, undefined);
      await giftForm.getByLabel('Подарочная карта', { exact: true }).fill(fullGiftCode); await giftForm.getByRole('button', { name: 'Применить', exact: true }).click(); await quoteSettled(page);
      await page.locator('.sb-checkout-steps button').nth(2).click(); await quoteSettled(page);
      assert.equal(state.requests.filter(request => request.endpoint === '/orders/quote').at(-1).body.giftCardCode, undefined, 'gift code is sent only on last step');
      await stage.getByRole('button', { name: 'Проверить заказ', exact: false }).click(); await quoteSettled(page);
      await stage.locator('.sb-checkout-check input').check(); await page.getByRole('button', { name: 'Подтвердить заказ', exact: false }).click();
      await page.getByRole('button', { name: 'Повторить безопасно', exact: false }).waitFor();
      const original = state.requests.find(request => request.endpoint === '/orders/checkout'); assert.equal(original.body.expectedTotal, 0); assert.equal(state.order.paymentStatus, 'SUCCEEDED');
      let stored = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage }, url: location.href })); assert.ok(!stored.includes(fullGiftCode), 'uncertain draft must redact raw bearer code');
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByLabel('Код для повторной отправки', { exact: true }).waitFor();
      await page.getByLabel('Код для повторной отправки', { exact: true }).fill(partialGiftCode); await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'Введите тот же код' }).waitFor(); assert.equal(state.checkoutCalls, 1);
      await page.getByLabel('Код для повторной отправки', { exact: true }).fill(fullGiftCode); await page.getByRole('button', { name: 'Подтвердить', exact: true }).click();
      await page.locator('.sb-checkout-stage .sb-checkout-check input').check(); await page.getByRole('button', { name: 'Повторить безопасно', exact: false }).click();
      await page.waitForURL('**/orders/SB-MOCK-001'); await page.locator('.sb-order-summary').waitFor();
      const attempts = state.requests.filter(request => request.endpoint === '/orders/checkout'); assert.equal(attempts.length, 2); assert.deepEqual(attempts[0].body, attempts[1].body); assert.equal(attempts[0].headers['x-idempotency-key'], attempts[1].headers['x-idempotency-key']);
      assert.equal(state.created, 1); assert.equal(state.payments, 0); assert.equal(state.external, 0); assert.ok((await page.locator('.sb-order-summary').innerText()).includes('Оплачено'));
      stored = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage }, url: location.href })); assert.ok(!stored.includes(fullGiftCode));
      assert.deepEqual(pageErrors, []); assert.deepEqual(state.unknown, []); results.push('Physical gift: invalid/partial/full/remove, last-step only, no raw persisted code, same-body hashed-code recovery, fully paid without YooKassa'); await context.close();
    }
    {
      console.log('Mock: protected order / payment URL');
      const { context, page, state } = await setup(browser, { order: makeOrder(true, 2100), paymentEnabled: true });
      await page.goto(base + '/orders/SB-MOCK-001?paid=true&accessToken=injected', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-order-access').waitFor();
      assert.equal(state.requests.filter(r => r.endpoint === '/orders/SB-MOCK-001').length, 0); assert.equal(state.payments, 0);
      await page.evaluate(() => sessionStorage.setItem('sb-order-access:SB-MOCK-001', 'mock-guest-secret')); await page.getByRole('button', { name: 'Повторить', exact: false }).click(); await page.locator('.sb-order-summary').waitFor();
      assert.ok(!(await page.locator('.sb-order-summary').innerText()).includes('Оплачено'));
      state.paymentUrl = 'https://yookassa.ru.evil.example/steal'; await page.getByRole('button', { name: 'Оплатить заказ', exact: true }).click(); await page.getByRole('alert').filter({ hasText: 'некорректная ссылка' }).waitFor(); assert.equal(state.external, 0);
      state.paymentUrl = 'https://yoomoney.ru/checkout/mock'; await page.getByRole('button', { name: 'Оплатить заказ', exact: true }).click(); await page.waitForURL('https://yoomoney.ru/checkout/mock'); assert.equal(state.external, 1);
      results.push('Protected GET: URL token/paid ignored, official HTTPS allowlist, safe payment retry (all mock)'); await context.close();
    }
    for (const [name, paid, expired] of [['paid', true, false], ['expired', false, true]]) {
      const { context, page, state } = await setup(browser, { auth: true, order: makeOrder(true, 2100, paid, expired), paymentEnabled: true });
      await page.goto(base + '/orders/SB-MOCK-001', { waitUntil: 'domcontentloaded' }); await page.locator('.sb-order-summary').waitFor();
      assert.equal(await page.getByRole('button', { name: 'Оплатить заказ', exact: true }).count(), 0); assert.equal(state.payments, 0); await audit(page, 390, 'order-' + name);
      results.push('Payment disabled for ' + name); await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ checks: results, providersCalled: false }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
