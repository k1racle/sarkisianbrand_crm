/* Local PostgreSQL acceptance only. No Nest bootstrap, network providers, SMTP or queues.
 * Run: node scripts/storefront-commerce-local-smoke.cjs (from backend).
 * Only UUID-owned fixtures are mutated/removed. Logical singleton loyalty settings and
 * expireReservations selection are scoped to this run; transaction/SQL locks stay real.
 */
'use strict';
const path = require('path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'false';
process.env.SMTP_ENABLED = 'false';
require('reflect-metadata');
require('ts-node').register({ transpileOnly: true, project: path.resolve(__dirname, '../tsconfig.json') });
const { PrismaClient, Prisma } = require('@prisma/client');
const { OrdersService } = require('../src/orders/orders.service');
const { StorefrontPricingService } = require('../src/orders/storefront-pricing.service');
const { StorefrontService } = require('../src/storefront/storefront.service');
const { GiftCardsService } = require('../src/gift-cards/gift-cards.service');
const { giftCodeHash } = require('../src/gift-cards/gift-cards.helpers');
const { IntegrationSecretsService } = require('../src/system-settings/integration-secrets.service');
const { hashCartSession, hashShippingDestination } = require('../src/common/storefront-utils');

const runId = randomUUID();
const report = { success: false, checks: [], findings: [], cleanup: null, externalCalls: 0, queueCalls: 0 };
const owned = Object.fromEntries(['User', 'Customer', 'StorefrontAddress', 'Product', 'ProductVariant', 'Cart', 'CartItem', 'Order', 'OrderItem', 'OrderStatusHistory', 'Payment', 'PromoCode', 'PromoRedemption', 'GiftCard', 'GiftCardRedemption', 'AuditLog', 'ShippingQuote', 'MailOutbox', 'LoyaltyAccount', 'LoyaltyTransaction', 'LoyaltyProgramSetting'].map(model => [model, new Set()]));
const allocate = model => { const id = randomUUID(); owned[model].add(id); return id; };
const sha = value => createHash('sha256').update(value).digest('hex');
const rows = model => [...owned[model]];
const settingsId = allocate('LoyaltyProgramSetting');
const dummySecret = sha('commerce-isolated-fixture:' + runId);
const config = { get: (key, fallback) => ({ JWT_SECRET: dummySecret, INTEGRATION_ENCRYPTION_KEY: dummySecret, STOREFRONT_EXTERNAL_CALLS_ENABLED: 'false', PUBLIC_APP_URL: 'http://localhost:3001' })[key] ?? fallback };
const secrets = new IntegrationSecretsService(config);
let prisma;
let orders;
let networkCalls = 0;
let queueCalls = 0;
let interrupted = false;
// Graceful interruption still reaches the UUID-only cleanup after the current transaction.
process.once('SIGINT', () => { interrupted = true; });
process.once('SIGTERM', () => { interrupted = true; });
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { networkCalls++; throw new Error('EXTERNAL_HTTP_FORBIDDEN'); };

// Fail closed on accidental broad writes, including writes inside interactive transactions.
function ownershipMiddleware(params, next) {
  const { model, action, args } = params;
  if (!owned[model] || !['create', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(action)) return next(params);
  const primary = model === 'PromoCode' ? 'code' : 'id';
  if (action === 'create') {
    if (!args.data[primary]) args.data[primary] = allocate(model);
    assert(owned[model].has(args.data[primary]), 'WRITE_OUTSIDE_FIXTURE:' + model + ':' + action);
    if (model === 'AuditLog') assert(args.data.resource === 'gift-card' && owned.GiftCard.has(args.data.resourceId), 'WRITE_OUTSIDE_FIXTURE:AuditLog:create');
  } else {
    const where = args.where || {};
    const direct = typeof where[primary] === 'string' ? [where[primary]] : where[primary]?.in;
    const relation = typeof where.orderId === 'string' ? [where.orderId] : where.orderId?.in;
    const account = typeof where.accountId === 'string' ? [where.accountId] : where.accountId?.in;
    const user = typeof where.userId === 'string' ? [where.userId] : where.userId?.in;
    const cart = typeof where.cartId === 'string' ? [where.cartId] : where.cartId?.in;
    const valid = (direct && direct.every(id => owned[model].has(id)))
      || (relation && relation.every(id => owned.Order.has(id)))
      || (account && account.every(id => owned.LoyaltyAccount.has(id)))
      || (user && user.every(id => owned.User.has(id)))
      || (cart && cart.every(id => owned.Cart.has(id)));
    assert(valid, 'WRITE_OUTSIDE_FIXTURE:' + model + ':' + action);
    // Only this known helper upsert may create an account implicitly. Seed its UUID
    // before PostgreSQL can create it; never adopt an arbitrary returned/existing ID.
    if (model === 'LoyaltyAccount' && action === 'upsert') {
      assert(typeof where.userId === 'string' && owned.User.has(where.userId) && args.create?.userId === where.userId,
        'WRITE_OUTSIDE_FIXTURE:LoyaltyAccount:upsert');
      if (!args.create.id) args.create.id = allocate('LoyaltyAccount');
      assert(owned.LoyaltyAccount.has(args.create.id), 'WRITE_OUTSIDE_FIXTURE:LoyaltyAccount:upsert');
    }
  }
  return next(params);
}

function scopedClient(db, isRoot = false) {
  return new Proxy(db, { get(target, key) {
    if (key === '$transaction' && isRoot) return (callback, options) => target.$transaction(tx => callback(scopedClient(tx)), options);
    if (key === 'loyaltyProgramSetting') return new Proxy(target[key], { get(delegate, method) {
      if (['findUnique', 'upsert'].includes(method)) return args => delegate[method]({ ...args, where: { id: settingsId }, ...(args.create ? { create: { ...args.create, id: settingsId } } : {}) });
      return typeof delegate[method] === 'function' ? delegate[method].bind(delegate) : delegate[method];
    } });
    if (key === 'order' && isRoot) return new Proxy(target[key], { get(delegate, method) {
      if (method === 'findMany') return args => delegate.findMany({ ...args, where: { AND: [args?.where || {}, { id: { in: rows('Order') } }] } });
      return typeof delegate[method] === 'function' ? delegate[method].bind(delegate) : delegate[method];
    } });
    return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
  } });
}

const mail = { prepare(input) {
  const encryptedPayload = secrets.encrypt({ subject: input.subject, text: input.text });
  assert.equal(secrets.decrypt(encryptedPayload).subject, input.subject);
  return { id: allocate('MailOutbox'), dedupeKey: sha(input.dedupeKey), kind: input.kind, recipient: input.recipient,
    encryptedPayload, status: 'QUEUED', attempts: 0, nextAttemptAt: new Date() };
} };
const oneC = { enqueueOrder: async () => { queueCalls++; throw new Error('ONE_C_FORBIDDEN'); } };

async function check(name, action) {
  try {
    if (interrupted) throw new Error('LOCAL_ACCEPTANCE_INTERRUPTED');
    await action();
    if (interrupted) throw new Error('LOCAL_ACCEPTANCE_INTERRUPTED');
    report.checks.push({ name, passed: true });
  }
  catch (error) { report.checks.push({ name, passed: false, failure: sanitizedFailure(error) }); throw error; }
}
function safeAssertValue(value) {
  if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (typeof value === 'string' && /^(?:P\d{4}|ERR_[A-Z_]+|NEW|PAID|PENDING|CREATING|SUCCEEDED|CANCELED|CANCELLED|RELEASED|ACTIVE|RUB)$/.test(value)) return value;
  return '[скрыто]';
}
function sanitizedFailure(error, depth = 0) {
  if (!error || depth > 2) return { code: 'LOCAL_ACCEPTANCE_FAILED' };
  const rawCode = error.code || error.name || 'LOCAL_ACCEPTANCE_FAILED';
  const detail = String(error.meta?.message || '');
  const line = /storefront-commerce-local-smoke\.cjs:\d+:\d+/.exec(String(error.stack || ''))?.[0];
  const status = typeof error.getStatus === 'function' ? error.getStatus() : undefined;
  const writeGuard = /^WRITE_OUTSIDE_FIXTURE:([A-Za-z]+):(create|update|updateMany|upsert|delete|deleteMany)$/.exec(String(error.message || ''));
  const output = { code: /^[A-Za-z0-9_]{1,80}$/.test(String(rawCode)) ? String(rawCode) : 'LOCAL_ACCEPTANCE_FAILED',
    ...(Number.isInteger(status) ? { status } : {}), ...(line ? { location: line } : {}),
    ...(error.meta?.code && /^[A-Za-z0-9/]{1,10}$/.test(String(error.meta.code)) ? { databaseCode: String(error.meta.code) } : {}),
    ...(/void/i.test(detail) ? { reason: 'POSTGRES_VOID_DESERIALIZATION' } : {}),
    ...(/updatedAt/i.test(detail) ? { reason: 'PRODUCT_VARIANT_UPDATED_AT_COLUMN' } : {}),
    ...(/WRITE_OUTSIDE_FIXTURE/.test(String(error.message)) ? { reason: 'WRITE_OUTSIDE_FIXTURE' } : {}),
    ...(writeGuard && owned[writeGuard[1]] ? { model: writeGuard[1], action: writeGuard[2] } : {}),
  };
  if (error.code === 'ERR_ASSERTION') {
    output.message = 'Ожидание проверки не совпало с результатом.';
    output.expected = safeAssertValue(error.expected); output.actual = safeAssertValue(error.actual);
    if (['strictEqual', 'deepStrictEqual', '==', 'rejects', 'HTTP status'].includes(error.operator)) output.operator = error.operator;
  }
  const cause = error.cause || (error.actual instanceof Error ? error.actual : undefined);
  if (cause) output.cause = sanitizedFailure(cause, depth + 1);
  return output;
}
async function rejectsStatus(action, status) {
  let original;
  try { await action(); } catch (error) { original = error; }
  const actual = original ? (typeof original.getStatus === 'function' ? original.getStatus() : original.code || original.name) : 200;
  if (actual !== status) {
    const failure = new assert.AssertionError({ message: 'Ожидаемый HTTP-отказ не получен.', expected: status, actual, operator: 'HTTP status' });
    if (original) failure.cause = original;
    throw failure;
  }
}
const session = () => 'smoke_' + randomUUID().replaceAll('-', '');
const key = () => 'checkout_' + randomUUID().replaceAll('-', '');
const contact = label => ({ firstName: 'Проверка', lastName: 'Приёмки', email: `smoke-${label}-${runId}@example.invalid`, phone: '+79990000000' });
const destination = { city: 'Тестовый город', cityCode: 44, street: 'Тестовая улица', house: '1', address: 'Тестовая улица, 1' };
const dto = label => ({ contact: contact(label), shippingAddress: { ...destination }, shippingProvider: 'CDEK', deliveryMethod: 'COURIER', acceptedTerms: true });

async function addItem(cart, variant, quantity) {
  return prisma.cartItem.create({ data: { id: allocate('CartItem'), cartId: cart.id, variantId: variant.id, quantity } });
}
async function cartFor(variant, quantity, userId) {
  const cart = await prisma.cart.create({ data: { id: allocate('Cart'), sessionId: session(), ...(userId ? { userId } : {}) } });
  await addItem(cart, variant, quantity); return cart;
}
async function fixtureProduct(label, stock) {
  const product = await prisma.product.create({ data: { id: allocate('Product'), sku: 'SMOKE-' + randomUUID(), slug: 'smoke-' + randomUUID(), nameRu: 'Локальная приёмка ' + label, basePrice: '1000.00', isActive: true } });
  const variant = await prisma.productVariant.create({ data: { id: allocate('ProductVariant'), productId: product.id, sku: 'SMOKE-V-' + randomUUID(), name: 'Тест', options: { weightGrams: 100 }, price: '1000.00', stock, reserved: 0 } });
  return { product, variant };
}
function shippingSnapshot(variant, quantity, input) {
  return { ...input.shippingAddress, provider: input.shippingProvider, deliveryMethod: input.deliveryMethod,
    cartItems: [{ variantId: variant.id, quantity }], weightGrams: quantity * 100 };
}
async function shippingQuote(cart, variant, quantity, input) {
  return prisma.shippingQuote.create({ data: { id: allocate('ShippingQuote'), sessionHash: hashCartSession(cart.sessionId), provider: input.shippingProvider,
    deliveryMethod: input.deliveryMethod, amount: '120.50', currency: 'RUB', destinationHash: hashShippingDestination({ ...input.shippingAddress, provider: input.shippingProvider, deliveryMethod: input.deliveryMethod }),
    requestSnapshot: shippingSnapshot(variant, quantity, input), expiresAt: new Date(Date.now() + 600000) } });
}
function verifiedMetadata(payment, order, paid = true) {
  return { provider: 'YOOKASSA', localPaymentId: payment.id, orderId: order.id, amount: String(payment.amount), currency: 'RUB', paid, test: true,
    providerStatus: paid ? 'succeeded' : 'canceled', metadata: { order_id: order.id, order_number: order.orderNumber, payment_id: payment.id } };
}

async function cleanup() {
  if (!prisma) return;
  // Explicit IDs/relation IDs only. No prefixes, globs, broad predicates or global deletes.
  await prisma.$transaction(async tx => {
    await tx.mailOutbox.deleteMany({ where: { id: { in: rows('MailOutbox') } } });
    await tx.promoRedemption.deleteMany({ where: { orderId: { in: rows('Order') } } });
    await tx.payment.deleteMany({ where: { orderId: { in: rows('Order') } } });
    await tx.orderItem.deleteMany({ where: { orderId: { in: rows('Order') } } });
    await tx.orderStatusHistory.deleteMany({ where: { orderId: { in: rows('Order') } } });
    await tx.loyaltyTransaction.deleteMany({ where: { accountId: { in: rows('LoyaltyAccount') } } });
    await tx.auditLog.deleteMany({ where: { id: { in: rows('AuditLog') } } });
    await tx.giftCardRedemption.deleteMany({ where: { orderId: { in: rows('Order') } } });
    await tx.giftCard.deleteMany({ where: { id: { in: rows('GiftCard') } } });
    await tx.order.deleteMany({ where: { id: { in: rows('Order') } } });
    await tx.cartItem.deleteMany({ where: { cartId: { in: rows('Cart') } } });
    await tx.cart.deleteMany({ where: { id: { in: rows('Cart') } } });
    await tx.productVariant.deleteMany({ where: { id: { in: rows('ProductVariant') } } });
    await tx.product.deleteMany({ where: { id: { in: rows('Product') } } });
    await tx.loyaltyAccount.deleteMany({ where: { id: { in: rows('LoyaltyAccount') } } });
    await tx.customer.deleteMany({ where: { id: { in: rows('Customer') } } });
    await tx.storefrontAddress.deleteMany({ where: { id: { in: rows('StorefrontAddress') } } });
    await tx.user.deleteMany({ where: { id: { in: rows('User') } } });
    await tx.promoCode.deleteMany({ where: { code: { in: rows('PromoCode') } } });
    await tx.shippingQuote.deleteMany({ where: { id: { in: rows('ShippingQuote') } } });
    await tx.loyaltyProgramSetting.deleteMany({ where: { id: { in: rows('LoyaltyProgramSetting') } } });
  }, { timeout: 30000 });
  const delegates = { User: 'user', Customer: 'customer', StorefrontAddress: 'storefrontAddress', Product: 'product', ProductVariant: 'productVariant', Cart: 'cart', CartItem: 'cartItem', Order: 'order', Payment: 'payment', GiftCard: 'giftCard', GiftCardRedemption: 'giftCardRedemption', AuditLog: 'auditLog', ShippingQuote: 'shippingQuote', MailOutbox: 'mailOutbox', LoyaltyAccount: 'loyaltyAccount', LoyaltyTransaction: 'loyaltyTransaction', LoyaltyProgramSetting: 'loyaltyProgramSetting', PromoCode: 'promoCode', PromoRedemption: 'promoRedemption', OrderItem: 'orderItem', OrderStatusHistory: 'orderStatusHistory' };
  const remaining = await Promise.all(Object.entries(delegates).map(([model, delegate]) => prisma[delegate].count({ where: { [model === 'PromoCode' ? 'code' : 'id']: { in: rows(model) } } })));
  assert.equal(remaining.reduce((a, b) => a + b, 0), 0);
  report.cleanup = { passed: true, remainingFixtures: 0 };
}

async function main() {
  const database = new URL(process.env.DATABASE_URL || '');
  assert(['postgres:', 'postgresql:'].includes(database.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'LOCAL_POSTGRES_REQUIRED');
  prisma = new PrismaClient(); prisma.$use(ownershipMiddleware);
  const scoped = scopedClient(prisma, true);
  const giftCards = new GiftCardsService(scoped, secrets, config);
  orders = new OrdersService(scoped, oneC, new StorefrontPricingService(scoped), mail, config, giftCards);
  // Do not call onModuleInit: no background global reservation scanner is started.
  const variantColumns = await prisma.$queryRaw`SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'ProductVariant'`;
  if (!variantColumns.some(column => column.name === 'updatedAt')) {
    // Absence itself is valid; flag only when the current owning service writes that column.
    const source = require('node:fs').readFileSync(path.resolve(__dirname, '../src/orders/orders.service.ts'), 'utf8');
    if (/UPDATE\s+"ProductVariant"\s+SET[^;`]*"updatedAt"/m.test(source)) report.findings.push({ code: 'RESERVATION_SQL_COLUMN_MISMATCH', severity: 'critical', description: 'SQL резерва обновляет ProductVariant.updatedAt, которого нет в локальном PostgreSQL.' });
  }
  await prisma.loyaltyProgramSetting.create({ data: { id: settingsId, isEnabled: true, earnPercent: 5, maxWriteOffPercent: 30, signupBonus: 0, birthdayBonus: 0, proThreshold: 3000, premiumThreshold: 10000 } });
  const owner = await prisma.user.create({ data: { id: allocate('User'), email: contact('owner').email, password: 'SMOKE-NOT-A-VALID-PASSWORD-HASH', role: 'CUSTOMER_B2C', isActive: true, firstName: 'Проверка' } });
  const outsider = await prisma.user.create({ data: { id: allocate('User'), email: contact('outsider').email, password: 'SMOKE-NOT-A-VALID-PASSWORD-HASH', role: 'CUSTOMER_B2C', isActive: true } });
  const hasCustomerBirthday = Prisma.dmmf.datamodel.models.find(model => model.name === 'Customer')?.fields.some(field => field.name === 'birthday');
  await prisma.customer.create({ data: { id: allocate('Customer'), userId: owner.id, email: owner.email, source: 'WEB', status: 'ACTIVE', ...(hasCustomerBirthday ? { birthday: null } : {}) } });
  const account = await prisma.loyaltyAccount.create({ data: { id: allocate('LoyaltyAccount'), userId: owner.id, balance: 200 } });
  const openingCredit = await prisma.loyaltyTransaction.create({ data: { id: allocate('LoyaltyTransaction'), accountId: account.id, amount: 200, type: 'ACCRUAL', reason: 'Собственное начальное начисление приёмки', metadata: { ledgerVersion: 1, expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() } } });
  const promoCode = 'SMOKE' + randomUUID().replaceAll('-', '').slice(0, 25).toUpperCase(); owned.PromoCode.add(promoCode);
  await prisma.promoCode.create({ data: { code: promoCode, title: 'Изолированная приёмка', discountType: 'PERCENT', amount: '10.00', perCustomerLimit: 5, usageLimit: 100 } });
  const { variant } = await fixtureProduct('основной', 100);
  const cart = await cartFor(variant, 2, owner.id);
  const actor = { sub: owner.id, role: 'CUSTOMER_B2C' };
  const input = { ...dto('owner'), promoCode, useBonuses: true, expectedTotal: 1600 };
  let initial;
  await check('Расчёт товаров, скидки и бонусов; неизвестная доставка не бесплатная', async () => {
    const quote = await orders.quote(cart.sessionId, input, actor);
    assert.equal(quote.subtotal, 2000); assert.equal(quote.discount, 200); assert.equal(quote.bonusAmount, 200);
    assert.equal(quote.total, 1600); assert.equal(quote.shippingAmount, null); assert.equal(quote.canPay, false);
    assert.equal((await prisma.loyaltyAccount.findUnique({ where: { id: account.id } })).balance, 200);
    assert.equal((await prisma.productVariant.findUnique({ where: { id: variant.id } })).reserved, 0);
  });
  const initialKey = key();
  await check('Оформление и одновременный replay ключа после очистки корзины', async () => {
    await rejectsStatus(() => orders.checkout(cart.sessionId, { ...input, expectedTotal: 1599.99 }, actor, key()), 409);
    initial = await orders.checkout(cart.sessionId, input, actor, initialKey);
    const repeated = await Promise.all([orders.checkout(cart.sessionId, input, actor, initialKey), orders.checkout(cart.sessionId, input, actor, initialKey)]);
    assert(repeated.every(result => result.id === initial.id)); assert.equal(initial.canPay, false);
    assert.equal(await prisma.order.count({ where: { checkoutKey: sha(cart.sessionId + ':' + initialKey) } }), 1);
    assert.equal((await prisma.productVariant.findUnique({ where: { id: variant.id } })).reserved, 2);
    assert.equal((await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock, 100);
    assert.equal(await prisma.loyaltyTransaction.count({ where: { orderId: initial.id, type: 'WRITE_OFF' } }), 1);
    const debit = await prisma.loyaltyTransaction.findFirst({ where: { orderId: initial.id, type: 'WRITE_OFF' } });
    assert.equal(debit.metadata.ledgerVersion, 1);
    assert.deepEqual(debit.metadata.consumedEntries, [{ entryId: openingCredit.id, amount: 200 }]);
    assert.equal(await prisma.mailOutbox.count({ where: { id: { in: rows('MailOutbox') }, kind: 'ORDER_CREATED' } }), 1);
    await rejectsStatus(() => orders.checkout(cart.sessionId, { ...input, comments: 'Другой запрос' }, actor, initialKey), 409);
  });
  await check('Защита владельца заказа и отсутствие служебных хешей в ответе', async () => {
    await rejectsStatus(() => orders.getAccessible(initial.orderNumber), 404);
    await rejectsStatus(() => orders.getAccessible(initial.orderNumber, { sub: outsider.id, role: 'CUSTOMER_B2C' }), 404);
    const safe = await orders.findOne(initial.orderNumber, actor);
    for (const field of ['checkoutKey', 'checkoutRequestHash', 'guestAccessHash']) assert(!Object.hasOwn(safe, field));
  });
  await check('Повторная отмена: один возврат бонусов и резерва; физический остаток неизменен', async () => {
    await Promise.all([orders.cancel(initial.orderNumber, actor), orders.cancel(initial.orderNumber, actor)]);
    assert.equal((await prisma.loyaltyAccount.findUnique({ where: { id: account.id } })).balance, 200);
    assert.equal(await prisma.loyaltyTransaction.count({ where: { orderId: initial.id, type: 'REVERSAL' } }), 1);
    const refund = await prisma.loyaltyTransaction.findFirst({ where: { orderId: initial.id, type: 'REVERSAL' } });
    assert.equal(refund.metadata.ledgerVersion, 1); assert(new Date(refund.metadata.expiresAt).getTime() > Date.now());
    const stock = await prisma.productVariant.findUnique({ where: { id: variant.id } }); assert.equal(stock.reserved, 0); assert.equal(stock.stock, 100);
    assert.equal((await prisma.promoRedemption.findUnique({ where: { orderId: initial.id } })).status, 'RELEASED');
  });
  await addItem(cart, variant, 1);
  const shipping = await shippingQuote(cart, variant, 1, input);
  const payableInput = { ...input, shippingQuoteId: shipping.id, expectedTotal: 820.5 };
  await check('Подтверждённая локальная доставка входит в итог; чужой snapshot отклоняется', async () => {
    const quote = await orders.quote(cart.sessionId, payableInput, actor);
    assert.equal(quote.total, 820.5); assert.equal(quote.shippingAmount, 120.5); assert.equal(quote.canPay, true);
    await rejectsStatus(() => orders.quote(cart.sessionId, { ...payableInput, shippingAddress: { ...destination, house: '2' } }, actor), 400);
    for (const changedAddress of [{ ...destination, house: '2' }, { ...destination, street: 'Другая улица' }]) {
      await rejectsStatus(() => orders.checkout(cart.sessionId, { ...payableInput, shippingAddress: changedAddress }, actor, key()), 400);
    }
    await prisma.shippingQuote.update({ where: { id: shipping.id }, data: { requestSnapshot: shippingSnapshot(variant, 2, input) } });
    await rejectsStatus(() => orders.quote(cart.sessionId, payableInput, actor), 400);
    const legacySnapshot = shippingSnapshot(variant, 1, input);
    delete legacySnapshot.cityCode;
    await prisma.shippingQuote.update({ where: { id: shipping.id }, data: { requestSnapshot: legacySnapshot } });
    await rejectsStatus(() => orders.checkout(cart.sessionId, payableInput, actor, key()), 409);
    await prisma.shippingQuote.update({ where: { id: shipping.id }, data: { requestSnapshot: shippingSnapshot(variant, 1, input) } });
  });
  let paidOrder;
  await check('Адрес заказа канонический из ShippingQuote, а не из изменённого текстового address', async () => {
    const changedInput = { ...payableInput, shippingAddress: { ...input.shippingAddress, address: 'Совсем другой текстовый адрес' } };
    paidOrder = await orders.checkout(cart.sessionId, changedInput, actor, key());
    const stored = await prisma.order.findUnique({ where: { id: paidOrder.id } });
    const snapshot = shipping.requestSnapshot;
    const expectedAddress = [snapshot.street, snapshot.house].join(', ');
    assert.deepEqual(stored.shippingAddress, {
      city: snapshot.city, cityCode: snapshot.cityCode, country: snapshot.country || 'Россия', region: snapshot.region || '',
      provider: snapshot.provider, deliveryMethod: snapshot.deliveryMethod,
      street: snapshot.street, house: snapshot.house, apartment: '', address: expectedAddress,
    });
    assert.equal(stored.priceSnapshot.deliveryConfirmed, true);
    assert.equal(stored.priceSnapshot.shippingQuoteId, shipping.id);
    assert.equal(stored.shippingAddress.address === changedInput.shippingAddress.address, false);
  });
  await check('Два подтверждения одной оплаты: один бонус, одно письмо, одна смена статуса', async () => {
    assert.equal(paidOrder.canPay, true); assert.equal(Number(paidOrder.finalAmount), 820.5);
    const payment = await prisma.payment.create({ data: { id: allocate('Payment'), orderId: paidOrder.id, provider: 'YOOKASSA', transactionId: randomUUID(), status: 'PENDING', amount: paidOrder.finalAmount, currency: 'RUB' } });
    const metadata = verifiedMetadata(payment, paidOrder);
    const settlements = await Promise.all([orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata), orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata)]);
    assert.equal(settlements.filter(result => !result.duplicate).length, 1);
    assert.equal(await prisma.loyaltyTransaction.count({ where: { orderId: paidOrder.id, type: 'ACCRUAL' } }), 1);
    const accrual = await prisma.loyaltyTransaction.findFirst({ where: { orderId: paidOrder.id, type: 'ACCRUAL' } }); assert.equal(accrual.amount, 35);
    assert.equal(accrual.metadata.ledgerVersion, 1); assert(new Date(accrual.metadata.expiresAt).getTime() > Date.now());
    assert.equal((await prisma.loyaltyAccount.findUnique({ where: { id: account.id } })).balance, 35);
    assert.equal(await prisma.mailOutbox.count({ where: { id: { in: rows('MailOutbox') }, kind: 'ORDER_PAID' } }), 1);
    assert.equal((await prisma.order.findUnique({ where: { id: paidOrder.id } })).status, 'PAID');
    const stock = await prisma.productVariant.findUnique({ where: { id: variant.id } }); assert.equal(stock.stock, 100); assert.equal(stock.reserved, 1);
  });
  await check('Истечение гостевого резерва, возврат промокода и непрозрачный доступ', async () => {
    const guest = await cartFor(variant, 3); const guestInput = { ...dto('guest'), promoCode };
    const guestKey = key(); const order = await orders.checkout(guest.sessionId, guestInput, undefined, guestKey);
    assert.equal(typeof order.accessToken, 'string'); assert(order.accessToken.length >= 32);
    await rejectsStatus(() => orders.getAccessible(order.orderNumber), 404);
    await rejectsStatus(() => orders.getAccessible(order.orderNumber, undefined, 'wrong-token'), 404);
    assert.equal((await orders.getAccessible(order.orderNumber, undefined, order.accessToken)).id, order.id);
    const replay = await orders.checkout(guest.sessionId, guestInput, undefined, guestKey); assert.equal(replay.id, order.id); assert.equal(replay.accessToken, order.accessToken);
    await prisma.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    await orders.expireReservations();
    assert.equal((await prisma.order.findUnique({ where: { id: order.id } })).reservationState, 'RELEASED');
    assert.equal((await prisma.promoRedemption.findUnique({ where: { orderId: order.id } })).status, 'RELEASED');
    const stock = await prisma.productVariant.findUnique({ where: { id: variant.id } }); assert.equal(stock.stock, 100); assert.equal(stock.reserved, 1);
    await prisma.order.update({ where: { id: order.id }, data: { guestAccessExpiresAt: new Date(0) } });
    await rejectsStatus(() => orders.getAccessible(order.orderNumber, undefined, order.accessToken), 404);
  });
  await check('Реальная PostgreSQL-гонка двух корзин за последнюю единицу: один заказ', async () => {
    const scarce = await fixtureProduct('последняя единица', 1);
    const carts = await Promise.all([cartFor(scarce.variant, 1), cartFor(scarce.variant, 1)]);
    const results = await Promise.allSettled(carts.map((item, index) => orders.checkout(item.sessionId, dto('race-' + index), undefined, key())));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failure = results.find(result => result.status === 'rejected'); assert([400, 409].includes(failure.reason.getStatus?.()));
    const winner = results.find(result => result.status === 'fulfilled').value;
    assert.equal(await prisma.orderItem.count({ where: { variantId: scarce.variant.id } }), 1);
    const stock = await prisma.productVariant.findUnique({ where: { id: scarce.variant.id } }); assert.equal(stock.stock, 1); assert.equal(stock.reserved, 1);
    await prisma.order.update({ where: { id: winner.id }, data: { reservationExpiresAt: new Date(0) } }); await orders.expireReservations();
    assert.equal((await prisma.productVariant.findUnique({ where: { id: scarce.variant.id } })).reserved, 0);
  });
  await check('Неопределённый CREATING защищает резерв; подтверждённая отмена снимает его', async () => {
    const uncertainCart = await cartFor(variant, 1);
    const uncertain = await orders.checkout(uncertainCart.sessionId, dto('uncertain'), undefined, key());
    const payment = await prisma.payment.create({ data: { id: allocate('Payment'), orderId: uncertain.id, provider: 'YOOKASSA', amount: uncertain.finalAmount, currency: 'RUB', status: 'CREATING' } });
    await prisma.order.update({ where: { id: uncertain.id }, data: { reservationExpiresAt: new Date(0) } }); await orders.expireReservations();
    assert.equal((await prisma.order.findUnique({ where: { id: uncertain.id } })).reservationState, 'ACTIVE');
    assert.equal((await prisma.productVariant.findUnique({ where: { id: variant.id } })).reserved, 2);
    const known = await prisma.payment.update({ where: { id: payment.id }, data: { transactionId: randomUUID() } });
    await orders.settleVerifiedPayment(known.transactionId, 'CANCELED', verifiedMetadata(known, uncertain, false));
    assert.equal((await prisma.order.findUnique({ where: { id: uncertain.id } })).reservationState, 'RELEASED');
    assert.equal((await prisma.productVariant.findUnique({ where: { id: variant.id } })).reserved, 1);
  });
  await check('Удалённый вариант в истории не ломает повтор заказа', async () => {
    await prisma.productVariant.delete({ where: { id: variant.id } });
    const result = await orders.repeat(paidOrder.orderNumber, actor, cart.sessionId);
    assert.equal(result.added, 0); assert.equal(result.unavailable.length, 1);
    assert.equal((await orders.findOne(paidOrder.orderNumber, actor)).items[0].variantId, null);
  });
  await check('Без внешних HTTP/SMTP/1С/серверов; письма только в собственной outbox', async () => {
    assert.equal(networkCalls, 0); assert.equal(queueCalls, 0);
    const queued = await prisma.mailOutbox.findMany({ where: { id: { in: rows('MailOutbox') } } });
    assert(queued.length > 0 && queued.every(item => item.status === 'QUEUED' && item.attempts === 0 && item.encryptedPayload.startsWith('v1.')));
  });
  await check('Dashboard ADMIN/B2B: свои заказы и адреса, без бонусного аккаунта и ledger', async () => {
    let forbiddenLoyaltyCalls = 0;
    const forbidLoyalty = () => { forbiddenLoyaltyCalls++; throw new Error('STAFF_LOYALTY_FORBIDDEN'); };
    // Keep dashboard reads genuinely unscoped: its own userId predicates must isolate fixtures.
    // Only the logical settings singleton is redirected; direct ledger access also fails closed.
    const dashboardDb = new Proxy(scopedClient(prisma), { get(target, property) {
      if (['loyaltyAccount', 'loyaltyTransaction'].includes(property)) return new Proxy({}, { get: () => forbidLoyalty });
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const storefront = new StorefrontService(dashboardDb, { account: forbidLoyalty });
    const fixtures = [];
    for (const [index, role] of ['ADMIN', 'CUSTOMER_B2B'].entries()) {
      const user = await prisma.user.create({ data: { id: allocate('User'), email: contact('dashboard-' + index).email,
        password: 'SMOKE-NOT-A-VALID-PASSWORD-HASH', role, isActive: true } });
      const amount = (index + 1) * 101;
      const order = await prisma.order.create({ data: { id: allocate('Order'), orderNumber: 'SMOKE-DASH-' + randomUUID(),
        userId: user.id, status: 'PAID', totalAmount: amount, finalAmount: amount, shippingAddress: { ...destination },
        items: { create: { id: allocate('OrderItem'), productName: 'Собственная позиция dashboard', variantName: 'Тест',
          quantity: 1, price: amount, total: amount } } } });
      const address = await prisma.storefrontAddress.create({ data: { id: allocate('StorefrontAddress'), userId: user.id,
        recipientName: 'Проверка', phone: contact('dashboard-' + index).phone, city: destination.city,
        street: destination.street, house: destination.house, isDefault: true } });
      fixtures.push({ user, order, address, amount });
    }
    await prisma.storefrontAddress.create({ data: { id: allocate('StorefrontAddress'), userId: owner.id,
      recipientName: 'Проверка', phone: contact('owner').phone, city: destination.city,
      street: destination.street, house: destination.house, isDefault: true } });
    const staffIds = fixtures.map(fixture => fixture.user.id);
    const accountCount = () => prisma.loyaltyAccount.count({ where: { userId: { in: staffIds } } });
    const ledgerCount = () => prisma.loyaltyTransaction.count({ where: { account: { userId: { in: staffIds } } } });
    assert.equal(await accountCount(), 0); assert.equal(await ledgerCount(), 0);
    for (const fixture of fixtures) {
      const dashboard = await storefront.dashboard(fixture.user.id);
      assert.equal(dashboard.loyalty.isEligible, false); assert.equal(dashboard.loyalty.isEnabled, false);
      assert.equal(dashboard.loyalty.balance, 0); assert.equal(dashboard.loyalty.entries.length, 0);
      assert.equal(dashboard.summary.orders, 1); assert.equal(dashboard.summary.spent, fixture.amount);
      assert.equal(dashboard.summary.favoriteCount, 0);
      assert.equal(dashboard.orders.length, 1); assert.equal(dashboard.orders[0].id === fixture.order.id, true);
      assert.equal(dashboard.orders[0].items.length, 1);
      assert.equal(dashboard.addresses.length, 1); assert.equal(dashboard.addresses[0].id === fixture.address.id, true);
      assert.equal(dashboard.addresses.every(address => address.userId === fixture.user.id), true);
    }
    assert.equal(forbiddenLoyaltyCalls, 0);
    assert.equal(await accountCount(), 0); assert.equal(await ledgerCount(), 0);
    assert.equal(networkCalls, 0); assert.equal(queueCalls, 0);
  });
  const giftBuyer = await prisma.user.create({ data: { id: allocate('User'), email: contact('gift-buyer').email,
    password: 'SMOKE-NOT-A-VALID-PASSWORD-HASH', role: 'CUSTOMER_B2C', isActive: true } });
  await prisma.customer.create({ data: { id: allocate('Customer'), userId: giftBuyer.id, email: giftBuyer.email,
    source: 'WEB', status: 'ACTIVE', ...(hasCustomerBirthday ? { birthday: null } : {}) } });
  const giftActor = { sub: giftBuyer.id, role: 'CUSTOMER_B2C' };
  const giftProduct = await prisma.product.create({ data: { id: allocate('Product'), sku: 'SMOKE-GIFT-' + randomUUID(),
    slug: 'smoke-gift-' + randomUUID(), nameRu: 'Собственный электронный сертификат приёмки', productType: 'GIFT_CARD',
    giftCardValidityDays: 365, basePrice: '1000.00', isActive: true } });
  const giftVariant = await prisma.productVariant.create({ data: { id: allocate('ProductVariant'), productId: giftProduct.id,
    sku: 'SMOKE-GIFT-V-' + randomUUID(), name: '1000 ₽', options: { nominal: 1000, validityDays: 180 },
    price: '1000.00', stock: 0, reserved: 0, isActive: true } });
  const giftCart = await cartFor(giftVariant, 2, giftBuyer.id);
  let digitalOrder, issuedCards, customerCards;
  await check('Два цифровых сертификата: без доставки/склада/бонусов; выпуск только по verified SUCCEEDED', async () => {
    const digitalInput = { contact: contact('gift-buyer'), acceptedTerms: true, expectedTotal: 2000 };
    const quote = await orders.quote(giftCart.sessionId, digitalInput, giftActor);
    assert.equal(quote.digitalDelivery, true); assert.equal(quote.shippingAmount, 0);
    assert.equal(quote.total, 2000); assert.equal(quote.canPay, true); assert.equal(quote.earnEstimate, 0);
    assert.equal(await prisma.loyaltyAccount.count({ where: { userId: giftBuyer.id } }), 0);
    digitalOrder = await orders.checkout(giftCart.sessionId, digitalInput, giftActor, key());
    assert.equal(digitalOrder.canPay, true); assert.equal(digitalOrder.requiresDeliveryConfirmation, false);
    assert.equal(digitalOrder.shippingAddress.deliveryMethod, 'DIGITAL');
    assert.equal(digitalOrder.items[0].productType, 'GIFT_CARD'); assert.equal(digitalOrder.items[0].giftCardValidityDays, 180);
    assert.equal(await prisma.giftCard.count({ where: { sourceOrderId: digitalOrder.id } }), 0);
    // Change only our catalog after checkout: issuance must use immutable order-item snapshots.
    await prisma.productVariant.update({ where: { id: giftVariant.id }, data: { options: { nominal: 3000, validityDays: 3650 }, price: '3000.00' } });
    const payment = await prisma.payment.create({ data: { id: allocate('Payment'), orderId: digitalOrder.id, provider: 'YOOKASSA',
      transactionId: randomUUID(), status: 'PENDING', amount: digitalOrder.finalAmount, currency: 'RUB' } });
    const metadata = verifiedMetadata(payment, digitalOrder);
    const outcomes = await Promise.all([orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata),
      orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata)]);
    assert.equal(outcomes.filter(outcome => !outcome.duplicate).length, 1);
    const stored = await prisma.order.findUnique({ where: { id: digitalOrder.id } });
    assert.equal(stored.status, 'DELIVERED'); assert.equal(stored.paymentStatus, 'SUCCEEDED'); assert.equal(stored.reservationState, 'CONSUMED');
    assert.equal((await prisma.payment.findUnique({ where: { id: payment.id } })).status, 'SUCCEEDED');
    issuedCards = await prisma.giftCard.findMany({ where: { sourceOrderId: digitalOrder.id }, orderBy: { ordinal: 'asc' } });
    assert.equal(issuedCards.length, 2);
    assert.equal(issuedCards.every(card => Number(card.faceValue) === 1000 && Number(card.balance) === 1000 && Number(card.reserved) === 0 && card.validityDays === 180), true);
    assert.equal(issuedCards.every(card => card.encryptedCode.startsWith('v1.') && card.expiresAt.getTime() - card.issuedAt.getTime() === 180 * 86400000), true);
    assert.equal(await prisma.loyaltyTransaction.count({ where: { orderId: digitalOrder.id } }), 0);
    assert.equal(await prisma.loyaltyAccount.count({ where: { userId: giftBuyer.id } }), 0);
    const virtualStock = await prisma.productVariant.findUnique({ where: { id: giftVariant.id } });
    assert.equal(virtualStock.stock, 0); assert.equal(virtualStock.reserved, 0);
    assert.equal(await prisma.mailOutbox.count({ where: { id: { in: rows('MailOutbox') }, kind: 'ORDER_PAID', dedupeKey: sha('ORDER_PAID:' + digitalOrder.id) } }), 1);
    await rejectsStatus(() => orders.findOne(digitalOrder.orderNumber, { sub: outsider.id, role: outsider.role }), 404);
    const staffRead = await orders.findOne(digitalOrder.orderNumber, { sub: outsider.id, role: 'ADMIN' });
    assert.equal(Object.hasOwn(staffRead, 'giftCards'), false);
    customerCards = (await orders.findOne(digitalOrder.orderNumber, giftActor)).giftCards;
    assert.equal(customerCards.length, 2);
    assert.equal(customerCards.every(card => issuedCards.some(issued => issued.id === card.id && giftCodeHash(card.code) === issued.codeHash)), true);
    const delivery = await prisma.mailOutbox.findMany({ where: { id: { in: rows('MailOutbox') }, kind: 'GIFT_CARDS_ISSUED', dedupeKey: sha('GIFT_CARDS_ISSUED:' + digitalOrder.id) } });
    assert.equal(delivery.length, 1); assert.equal(delivery[0].recipient === digitalOrder.buyerEmail, true);
    const privatePayload = secrets.decrypt(delivery[0].encryptedPayload);
    assert.equal(customerCards.every(card => privatePayload.text.includes(card.code) && privatePayload.text.includes(String(card.faceValue))), true);
    assert.equal(customerCards.every(card => privatePayload.text.includes(new Date(card.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }))), true);
    assert.equal(privatePayload.text.includes('передавайте код только получателю подарка'), true);
    assert.equal(customerCards.some(card => JSON.stringify(delivery).includes(card.code)), false);
    assert.equal(Object.hasOwn(delivery[0], 'text'), false); assert.equal(Object.hasOwn(delivery[0], 'subject'), false);
    const snapshotText = JSON.stringify(stored.priceSnapshot);
    assert.equal(customerCards.some(card => snapshotText.includes(card.code)), false);
    assert.equal(customerCards.some(card => JSON.stringify(payment.metadata || {}).includes(card.code)), false);
  });
  const giftPhysical = await fixtureProduct('сертификатная оплата физических товаров', 100);
  await prisma.productVariant.update({ where: { id: giftPhysical.variant.id }, data: { price: '500.00' } });
  let physicalGiftCart = await cartFor(giftPhysical.variant, 1);
  const codeOne = customerCards[0].code, codeTwo = customerCards[1].code;
  const cardOneId = customerCards[0].id, cardTwoId = customerCards[1].id;
  await check('Полное покрытие 620.50 ₽: настоящий GIFT_CARD ledger payment, replay без повторного списания', async () => {
    const input = { ...dto('gift-full'), giftCardCode: codeOne };
    const shipping = await shippingQuote(physicalGiftCart, giftPhysical.variant, 1, input);
    const checkoutInput = { ...input, shippingQuoteId: shipping.id, expectedTotal: 0 };
    const quote = await orders.quote(physicalGiftCart.sessionId, checkoutInput);
    assert.equal(quote.total, 0); assert.equal(quote.giftCardAmount, 620.5); assert.equal(quote.canPay, true);
    const checkoutKey = key();
    const paid = await orders.checkout(physicalGiftCart.sessionId, checkoutInput, undefined, checkoutKey);
    const replay = await orders.checkout(physicalGiftCart.sessionId, checkoutInput, undefined, checkoutKey);
    assert.equal(paid.id === replay.id, true); assert.equal(paid.status, 'PAID'); assert.equal(paid.canPay, false);
    const redemption = await prisma.giftCardRedemption.findUnique({ where: { orderId: paid.id } });
    assert.equal(redemption.status, 'APPLIED'); assert.equal(Number(redemption.amount), 620.5);
    const payments = await prisma.payment.findMany({ where: { orderId: paid.id } });
    assert.equal(payments.length, 1); assert.equal(payments[0].provider, 'GIFT_CARD'); assert.equal(payments[0].status, 'SUCCEEDED');
    assert.equal(Number(payments[0].amount), 0); assert.equal(payments[0].metadata.redemptionId === redemption.id, true);
    assert.equal(Object.hasOwn(paid.payments[0], 'metadata'), false);
    const card = await prisma.giftCard.findUnique({ where: { id: cardOneId } });
    assert.equal(Number(card.balance), 379.5); assert.equal(Number(card.reserved), 0);
    assert.equal(await prisma.loyaltyTransaction.count({ where: { orderId: paid.id } }), 0);
    const stock = await prisma.productVariant.findUnique({ where: { id: giftPhysical.variant.id } });
    assert.equal(stock.stock, 100); assert.equal(stock.reserved, 1);
  });
  physicalGiftCart = giftCart;
  await addItem(physicalGiftCart, giftPhysical.variant, 1);
  await check('Частичный сертификат: hold до verified cash, одно списание и бонусы только на денежную часть', async () => {
    const input = { ...dto('gift-partial'), giftCardCode: codeOne };
    const shipping = await shippingQuote(physicalGiftCart, giftPhysical.variant, 1, input);
    const checkoutInput = { ...input, shippingQuoteId: shipping.id, expectedTotal: 241 };
    const quote = await orders.quote(physicalGiftCart.sessionId, checkoutInput, giftActor);
    assert.equal(quote.giftCardAmount, 379.5); assert.equal(quote.total, 241); assert.equal(quote.earnEstimate, 6);
    const paid = await orders.checkout(physicalGiftCart.sessionId, checkoutInput, giftActor, key());
    let card = await prisma.giftCard.findUnique({ where: { id: cardOneId } });
    assert.equal(Number(card.balance), 379.5); assert.equal(Number(card.reserved), 379.5);
    const payment = await prisma.payment.create({ data: { id: allocate('Payment'), orderId: paid.id, provider: 'YOOKASSA',
      transactionId: randomUUID(), status: 'PENDING', amount: paid.finalAmount, currency: 'RUB' } });
    const metadata = verifiedMetadata(payment, paid);
    await Promise.all([orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata), orders.settleVerifiedPayment(payment.transactionId, 'SUCCEEDED', metadata)]);
    card = await prisma.giftCard.findUnique({ where: { id: cardOneId } });
    assert.equal(Number(card.balance), 0); assert.equal(Number(card.reserved), 0);
    const accruals = await prisma.loyaltyTransaction.findMany({ where: { orderId: paid.id, type: 'ACCRUAL' } });
    assert.equal(accruals.length, 1); assert.equal(accruals[0].amount, 6);
    assert.equal((await prisma.giftCardRedemption.findUnique({ where: { orderId: paid.id } })).status, 'APPLIED');
  });
  await check('Истёкший неоплаченный hold сертификата освобождает reserved, но не увеличивает balance', async () => {
    const cart = await cartFor(giftPhysical.variant, 2);
    const input = { ...dto('gift-expired'), giftCardCode: codeTwo };
    const shipping = await shippingQuote(cart, giftPhysical.variant, 2, input);
    const order = await orders.checkout(cart.sessionId, { ...input, shippingQuoteId: shipping.id, expectedTotal: 120.5 }, undefined, key());
    let card = await prisma.giftCard.findUnique({ where: { id: cardTwoId } });
    assert.equal(Number(card.balance), 1000); assert.equal(Number(card.reserved), 1000);
    await prisma.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(0) } });
    await orders.expireReservations(); await orders.expireReservations();
    card = await prisma.giftCard.findUnique({ where: { id: cardTwoId } });
    assert.equal(Number(card.balance), 1000); assert.equal(Number(card.reserved), 0);
    assert.equal((await prisma.giftCardRedemption.findUnique({ where: { orderId: order.id } })).status, 'RELEASED');
  });
  await check('PostgreSQL-гонка за баланс сертификата: один согласованный нулевой заказ, второй 409', async () => {
    const carts = await Promise.all([cartFor(giftPhysical.variant, 1), cartFor(giftPhysical.variant, 1)]);
    const inputs = await Promise.all(carts.map(async (cart, index) => {
      const input = { ...dto('gift-race-' + index), giftCardCode: codeTwo };
      const shipping = await shippingQuote(cart, giftPhysical.variant, 1, input);
      return { ...input, shippingQuoteId: shipping.id, expectedTotal: 0 };
    }));
    const results = await Promise.allSettled(carts.map((cart, index) => orders.checkout(cart.sessionId, inputs[index], undefined, key())));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failed = results.find(result => result.status === 'rejected');
    assert.equal(failed.reason.getStatus?.(), 409);
    const card = await prisma.giftCard.findUnique({ where: { id: cardTwoId } });
    assert.equal(Number(card.balance), 379.5); assert.equal(Number(card.reserved), 0);
    assert.equal(await prisma.giftCardRedemption.count({ where: { cardId: cardTwoId, status: 'APPLIED' } }), 1);
  });
  await check('Смешанная корзина отклоняется; удалённый gift variant не уничтожает авторизованные коды', async () => {
    const mixed = await cartFor(giftVariant, 1); await addItem(mixed, giftPhysical.variant, 1);
    await rejectsStatus(() => orders.quote(mixed.sessionId, dto('gift-mixed')), 400);
    await prisma.cartItem.deleteMany({ where: { cartId: mixed.id } });
    await prisma.productVariant.delete({ where: { id: giftVariant.id } });
    const visible = await orders.findOne(digitalOrder.orderNumber, giftActor);
    assert.equal(visible.giftCards.length, 2);
    assert.equal(visible.giftCards.every(card => customerCards.some(previous => previous.id === card.id && previous.code === card.code)), true);
    assert.equal(visible.items[0].variantId, null); assert.equal(visible.items[0].productType, 'GIFT_CARD');
    assert.equal(networkCalls, 0); assert.equal(queueCalls, 0);
  });
  report.success = true;
}

(async () => {
  try { await main(); }
  catch (error) {
    report.success = false;
    report.error = sanitizedFailure(error);
  }
  finally {
    try { await cleanup(); }
    catch { report.success = false; report.cleanup = { passed: false, message: 'Очистка не завершена: ниже только собственные ID для точечного восстановления.', ownedIds: Object.fromEntries(Object.entries(owned).map(([model, ids]) => [model, [...ids]])) }; }
    if (orders) orders.onModuleDestroy();
    if (prisma) await prisma.$disconnect();
    globalThis.fetch = originalFetch;
    report.externalCalls = networkCalls; report.queueCalls = queueCalls;
    console.log(JSON.stringify(report, null, 2));
    if (!report.success) process.exitCode = 1;
  }
})();
