import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/order.dto';
import * as loyaltyCore from '../loyalty/loyalty-core.helpers';
import { hashCartSession, hashShippingDestination } from '../common/storefront-utils';
import { HEADERS_METADATA } from '@nestjs/common/constants';
import { OrdersController } from './orders.controller';
import { StorefrontController } from '../storefront/storefront.controller';
import { NotificationsService } from '../notifications/notifications.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';

// Gift-card persistence/cryptography has its own suite. These tests validate only Orders' orchestration.
jest.mock('../gift-cards/gift-cards.service', () => ({ GiftCardsService: class MockGiftCardsService {} }));

/** Mock-only contracts; PostgreSQL locking/constraints require separate acceptance tests. */
describe('OrdersService atomic storefront contract (mock only)', () => {
  it.each(['false', 'true', 0, 1])('rejects non-boolean consent and bonus flags even with implicit conversion: %s', async value => {
    const input = plainToInstance(CheckoutDto, { shippingAddress: {}, acceptedTerms: value, useBonuses: value }, { enableImplicitConversion: true });
    const errors = await validate(input);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['acceptedTerms', 'useBonuses']));
  });
  const session = 'mock-cart-session-000001', key = 'mock-checkout-key-000001';
  const actor = { sub: 'mock-buyer', role: 'CUSTOMER_B2C' };
  const contact = { firstName: ' Анна ', lastName: ' Петрова ', email: 'ANNA@example.test', phone: '+79991234567' };
  const dto = (): CheckoutDto & { shippingAddress: Record<string, unknown> } => ({ contact, acceptedTerms: true, deliveryMethod: 'PICKUP_POINT', shippingProvider: 'CDEK', shippingQuoteId: 'mock-quote', promoCode: 'TEST',
    shippingAddress: { city: 'Москва', cityCode: 44, address: 'Тестовая, 1', pickupPointAddress: 'Тестовая, 1', pickupPointName: 'Тестовый ПВЗ', pickupPointCode: 'MOCK', pickupPointRequested: true } });
  const settings = { isEnabled: true, earnPercent: 5, proThreshold: 3000, premiumThreshold: 10000, proMultiplierPercent: 120, premiumMultiplierPercent: 150, bonusValidityDays: 365 };
  let externalFlag: string | undefined;
  beforeEach(() => { externalFlag = process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED; process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'false'; });
  afterEach(() => { jest.restoreAllMocks(); if (externalFlag === undefined) delete process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED; else process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED = externalFlag; });

  function setup(owned = false) {
    const cart: any = { id: 'mock-cart', userId: owned ? actor.sub : null, user: owned ? { id: actor.sub, role: actor.role, customer: { id: 'mock-customer' } } : null,
      items: [{ variantId: 'mock-variant', quantity: 2, variant: { sku: 'MOCK', name: 'Тест', price: 780.25, options: { weightGrams: 200 }, product: { nameRu: 'Тестовый товар' } } }] };
    const destination = dto();
    const snapshot = {
      provider: destination.shippingProvider, deliveryMethod: destination.deliveryMethod,
      city: destination.shippingAddress.city, cityCode: destination.shippingAddress.cityCode, country: 'Россия', region: 'Москва', countryCode: 'RU',
      pickupPointCode: destination.shippingAddress.pickupPointCode, pickupPointName: destination.shippingAddress.pickupPointName,
      pickupPointAddress: destination.shippingAddress.pickupPointAddress,
      weightGrams: 400, cartItems: cart.items.map((item: any) => ({ variantId: item.variantId, quantity: item.quantity })),
    };
    const shippingQuoteFixture = {
      id: destination.shippingQuoteId, sessionHash: hashCartSession(session), destinationHash: hashShippingDestination(snapshot),
      provider: destination.shippingProvider, deliveryMethod: destination.deliveryMethod, amount: 250.50, currency: 'RUB',
      requestSnapshot: snapshot, expiresAt: new Date(Date.now() + 15 * 60000),
    };
    let state: any = { order: null, payments: [], stock: 10, reserved: 2, account: { id: 'mock-loyalty', userId: actor.sub, balance: 1000, level: 'START' }, entries: [], mails: [], redemptions: [], giftHolds: [], issuedCards: [], cleared: false };
    // Ledger maintenance has its own unit suite. Preserve this suite's opening
    // balance fixture while exercising the real write-off/positive-credit metadata.
    jest.spyOn(loyaltyCore, 'maintainAccount').mockImplementation(async () => ({ account: { ...state.account }, entries: [], expiredAmount: 0 }));
    const readOrder = async ({ where }: any) => {
      const order = state.order;
      if (!order || (where.id && where.id !== order.id) || (where.orderNumber && where.orderNumber !== order.orderNumber) || (where.checkoutKey && where.checkoutKey !== order.checkoutKey)) return null;
      return { ...order, payments: state.payments, user: order.userId ? { id: order.userId, role: actor.role } : null };
    };
    const tx: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ notificationPreferences: { email: true } }) },
      $queryRaw: jest.fn(async (strings: TemplateStringsArray, ...values: any[]) => {
        if (strings.join('?').includes('UPDATE "ProductVariant"')) {
          if (state.stock - state.reserved < values[0]) return [];
          state.reserved += values[0]; return [{ id: values[1] }];
        }
        return [];
      }),
      order: {
        findUnique: jest.fn(readOrder),
        findUniqueOrThrow: jest.fn(async (args: any) => { const order = await readOrder(args); if (!order) throw new Error('Mock order missing'); return order; }),
        findMany: jest.fn(async () => state.order ? [{ id: state.order.id }] : []),
        create: jest.fn(async ({ data }: any) => { state.order = { id: 'mock-order', ...data, items: data.items.create, history: [data.history.create], loyaltyAccruedAt: null }; return readOrder({ where: { id: state.order.id } }); }),
        update: jest.fn(async ({ data }: any) => { const { history, ...fields } = data; Object.assign(state.order, fields); if (history) state.order.history.push(history.create); return readOrder({ where: { id: state.order.id } }); }),
      },
      productVariant: { updateMany: jest.fn(async ({ data, where }: any) => { if (state.reserved < where.reserved.gte) return { count: 0 }; state.reserved -= data.reserved.decrement; return { count: 1 }; }) },
      loyaltyAccount: {
        upsert: jest.fn(async () => ({ ...state.account })), findUnique: jest.fn(async () => ({ ...state.account })), findUniqueOrThrow: jest.fn(async () => ({ ...state.account })),
        update: jest.fn(async ({ data }: any) => { state.account.balance += (data.balance?.increment || 0) - (data.balance?.decrement || 0); if (data.level) state.account.level = data.level; return { ...state.account }; }),
      },
      loyaltyProgramSetting: { upsert: jest.fn().mockResolvedValue(settings), findUnique: jest.fn().mockResolvedValue(settings) },
      loyaltyTransaction: { create: jest.fn(async ({ data }: any) => { state.entries.push(data); return data; }) },
      shippingQuote: { findUnique: jest.fn().mockResolvedValue(shippingQuoteFixture) },
      promoRedemption: {
        create: jest.fn(async ({ data }: any) => { state.redemptions.push({ ...data, status: 'RESERVED' }); return data; }),
        updateMany: jest.fn(async ({ where, data }: any) => { for (const item of state.redemptions) if (item.orderId === where.orderId && item.status === where.status) Object.assign(item, data); return { count: 1 }; }),
      },
      giftCardRedemption: { findUnique: jest.fn(async ({ where }: any) => state.giftHolds.find((hold: any) => hold.orderId === where.orderId) || null) },
      mailOutbox: { create: jest.fn(async ({ data }: any) => { state.mails.push(data); return data; }) },
      cartItem: { deleteMany: jest.fn(async () => { state.cleared = true; return { count: 1 }; }) }, cart: { update: jest.fn().mockResolvedValue({ id: cart.id }), findUnique: jest.fn().mockResolvedValue(cart) },
      payment: {
        create: jest.fn(async ({ data }: any) => { const payment = { id: 'mock-internal-payment', ...data }; state.payments.push(payment); return payment; }),
        findUnique: jest.fn(async ({ where }: any) => state.payments.find((p: any) => where.transactionId ? p.transactionId === where.transactionId : p.id === where.id) || null),
        findUniqueOrThrow: jest.fn(async ({ where }: any) => ({ ...state.payments.find((p: any) => p.id === where.id) })),
        update: jest.fn(async ({ where, data }: any) => { const payment = state.payments.find((p: any) => p.id === where.id); Object.assign(payment, data); return { ...payment }; }),
      },
    };
    const prisma: any = { order: tx.order, payment: tx.payment, $transaction: jest.fn(async (callback: any) => {
      const before = structuredClone(state); try { return await callback(tx); } catch (error) { state = before; throw error; }
    }) };
    const pricing: any = { quote: jest.fn(async () => ({ cart, subtotalMinor: 156050, promoDiscountMinor: 0, bonusAmount: owned ? 50 : 0, shippingMinor: 25050,
      finalMinor: owned ? 176100 : 181100, deliveryConfirmed: true, promoCode: 'TEST', customerHash: 'mock-hash', settings, loyaltyAccount: owned ? { ...state.account } : undefined,
      publicQuote: { subtotal: 1560.5, total: owned ? 1761 : 1811, deliveryConfirmed: true, canPay: true, messages: [] } })) };
    const oneC: any = { enqueueOrder: jest.fn().mockResolvedValue(undefined) };
    const config: any = { get: jest.fn(() => 'mock-jwt-security-key-at-least-32-characters') };
    const mailSecrets = new IntegrationSecretsService(config);
    // Real encrypted payload preparation only; lifecycle/SMTP/queue are never started.
    const preparation = new NotificationsService(prisma, mailSecrets, {} as any, config);
    const notifications: any = { prepare: jest.fn((data: any) => preparation.prepare(data)) };
    const giftCards: any = {
      reserve: jest.fn(async (_tx: any, orderId: string, code: string, amountMinor: number) => { const hold = { id: 'mock-gift-redemption', cardId: 'mock-card', orderId, code, amountMinor, status: 'RESERVED' }; state.giftHolds.push(hold); return hold; }),
      apply: jest.fn(async (_tx: any, orderId: string) => { const hold = state.giftHolds.find((item: any) => item.orderId === orderId); if (hold) hold.status = 'APPLIED'; return hold; }),
      release: jest.fn(async (_tx: any, orderId: string) => { const hold = state.giftHolds.find((item: any) => item.orderId === orderId); if (hold) hold.status = 'RELEASED'; return hold || null; }),
      issueForPaidOrder: jest.fn(async (_tx: any, order: any) => {
        for (const item of order.items) for (let ordinal = 0; ordinal < item.quantity; ordinal++) state.issuedCards.push({ orderId: order.id,
          code: 'MOCK-ONLY-CODE-' + ordinal, faceValue: item.price, balance: item.price, validityDays: item.giftCardValidityDays, expiresAt: new Date('2027-03-01T12:00:00.000Z') });
      }),
      revealForOrder: jest.fn(async (_tx: any, orderId: string) => state.issuedCards.filter((card: any) => card.orderId === orderId)),
    };
    const service = new OrdersService(prisma, oneC, pricing, notifications, config, giftCards);
    function payment(status = 'PENDING') {
      const p = { id: 'mock-payment', transactionId: 'mock-provider-payment', orderId: state.order.id, provider: 'YOOKASSA', status, amount: state.order.finalAmount, metadata: { private: 'mock-secret' } };
      state.payments.push(p);
      return { provider: 'YOOKASSA', localPaymentId: p.id, orderId: p.orderId, amount: p.amount, currency: 'RUB', paid: true };
    }
    return { service, prisma, tx, pricing, oneC, notifications, mailSecrets, config, cart, giftCards, payment, shippingQuoteFixture, get state() { return state; } };
  }

  it('preserves guest contact/PVZ/terms and reserves only reserved with stock-reserved SQL condition', async () => {
    const ctx = setup(); const result = await ctx.service.checkout(session, dto(), undefined, key);
    const data = ctx.tx.order.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ buyerName: 'Анна Петрова', buyerEmail: 'anna@example.test', buyerPhone: contact.phone, source: 'WEB', currency: 'RUB', shippingCost: 250.5,
      shippingAddress: expect.objectContaining({ deliveryMethod: 'PICKUP_POINT', pickupPointName: 'Тестовый ПВЗ', pickupPointCode: 'MOCK' }),
      priceSnapshot: expect.objectContaining({ acceptedTermsAt: expect.any(String) }), reservationState: 'ACTIVE', reservationExpiresAt: expect.any(Date), guestAccessHash: expect.any(String) });
    expect(data).not.toHaveProperty('shippingAmount'); expect(data).not.toHaveProperty('paidAt');
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(4);
    const reserve = ctx.tx.$queryRaw.mock.calls.find(([strings]: any[]) => strings.join('?').includes('UPDATE "ProductVariant"'));
    expect(reserve[0].join('?')).toContain('SET reserved = reserved +'); expect(reserve[0].join('?')).toContain('stock - reserved >='); expect(reserve[0].join('?')).not.toMatch(/SET\s+stock\s*=/);
    expect(ctx.pricing.quote).toHaveBeenCalledWith(session, dto(), undefined, ctx.tx);
    expect(ctx.state.cleared).toBe(true); expect(ctx.state.mails).toHaveLength(1); expect(ctx.oneC.enqueueOrder).not.toHaveBeenCalled();
    expect(ctx.notifications.prepare).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'anna@example.test', dedupeKey: 'ORDER_CREATED:mock-order' }));
    expect(result.accessToken).toEqual(expect.any(String));
    for (const field of ['checkoutKey', 'checkoutRequestHash', 'guestAccessHash', 'guestAccessExpiresAt']) expect(result).not.toHaveProperty(field);
  });
  it('atomically replays without a second reserve/order/mail/bonus debit', async () => {
    const ctx = setup(true); const first = await ctx.service.checkout(session, dto(), actor, key); const second = await ctx.service.checkout(session, dto(), actor, key);
    expect(second.orderNumber).toBe(first.orderNumber); expect(ctx.tx.order.create).toHaveBeenCalledTimes(1); expect(ctx.pricing.quote).toHaveBeenCalledTimes(1);
    expect(ctx.state.reserved).toBe(4); expect(ctx.state.account.balance).toBe(950); expect(ctx.state.entries.filter((e: any) => e.type === 'WRITE_OFF')).toHaveLength(1);
    expect(ctx.state.mails).toHaveLength(1); expect(second).not.toHaveProperty('accessToken'); expect(ctx.tx.$queryRaw.mock.calls[0][0].join('?')).toContain('pg_advisory_xact_lock');
  });
  it('honors disabled email notifications without preventing checkout or cancellation', async () => {
    const ctx = setup(true);
    ctx.tx.user.findUnique.mockResolvedValue({ notificationPreferences: { email: false } });
    const order = await ctx.service.checkout(session, dto(), actor, key);
    await ctx.service.cancel(order.orderNumber, actor);
    expect(ctx.state.order.status).toBe('CANCELLED');
    expect(ctx.state.mails).toHaveLength(0);
    expect(ctx.notifications.prepare).not.toHaveBeenCalled();
  });
  it('pins verified pickup city/code/address/name instead of trusting raw display fields', async () => {
    const ctx = setup();
    const input = { ...dto(), shippingAddress: { ...dto().shippingAddress,
      country: 'Поддельная страна', region: 'Поддельный регион',
      address: 'Поддельный адрес', pickupPointAddress: 'Поддельный адрес ПВЗ', pickupPointName: 'Поддельное имя ПВЗ',
    } };
    // Pricing's own suite validates the destination hash. Here its stub isolates
    // the additional order-address pin against a confirmed, stored provider snapshot.
    const result = await ctx.service.checkout(session, input, undefined, key);
    expect(result.shippingAddress).toEqual({ city: 'Москва', cityCode: 44, country: 'Россия', region: 'Москва', deliveryMethod: 'PICKUP_POINT', provider: 'CDEK',
      pickupPointCode: 'MOCK', pickupPointName: 'Тестовый ПВЗ', pickupPointAddress: 'Тестовая, 1', address: 'Тестовая, 1' });
    expect(ctx.tx.shippingQuote.findUnique).toHaveBeenCalledWith({ where: { id: 'mock-quote' } });
  });
  it('pins verified courier street/house while preserving the customer apartment', async () => {
    const ctx = setup();
    const courierSnapshot = { provider: 'CDEK', deliveryMethod: 'COURIER', city: 'Москва', cityCode: 44, country: 'Россия', region: 'Москва',
      street: 'Проверенная улица', house: '12', weightGrams: 400, cartItems: ctx.shippingQuoteFixture.requestSnapshot.cartItems };
    ctx.tx.shippingQuote.findUnique.mockResolvedValue({ ...ctx.shippingQuoteFixture, deliveryMethod: 'COURIER',
      destinationHash: hashShippingDestination(courierSnapshot), requestSnapshot: courierSnapshot });
    const input: CheckoutDto = { ...dto(), deliveryMethod: 'COURIER', shippingAddress: { city: 'Москва', cityCode: 44, address: 'Поддельный адрес', street: 'Проверенная улица', house: '12', apartment: ' 5 ' } };
    const result = await ctx.service.checkout(session, input, undefined, key);
    expect(result.shippingAddress).toEqual({ city: 'Москва', cityCode: 44, country: 'Россия', region: 'Москва', deliveryMethod: 'COURIER', provider: 'CDEK',
      street: 'Проверенная улица', house: '12', apartment: '5', address: 'Проверенная улица, 12, кв. 5' });
  });
  it.each(['missingQuote', 'missingSnapshot', 'city', 'cityCode', 'pickupPointCode', 'pickupPointAddress', 'courierStreet', 'courierHouse'])('rejects malformed confirmed quote %s with 409 before reserve', async (invalid) => {
    const ctx = setup(); const input = dto();
    const saved: any = { ...ctx.shippingQuoteFixture, requestSnapshot: { ...ctx.shippingQuoteFixture.requestSnapshot } };
    if (invalid === 'missingQuote') ctx.tx.shippingQuote.findUnique.mockResolvedValue(null);
    else {
      if (invalid === 'missingSnapshot') saved.requestSnapshot = null;
      else if (invalid === 'courierStreet' || invalid === 'courierHouse') {
        input.deliveryMethod = 'COURIER'; saved.deliveryMethod = 'COURIER';
        saved.requestSnapshot.deliveryMethod = 'COURIER'; saved.requestSnapshot.street = 'Проверенная улица'; saved.requestSnapshot.house = '12';
        saved.requestSnapshot[invalid === 'courierStreet' ? 'street' : 'house'] = '';
      } else saved.requestSnapshot[invalid] = '';
      ctx.tx.shippingQuote.findUnique.mockResolvedValue(saved);
    }
    const error = await ctx.service.checkout(session, input, undefined, key).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getStatus()).toBe(409);
    expect(ctx.tx.$queryRaw.mock.calls.some(([strings]: any[]) => strings.join('?').includes('UPDATE "ProductVariant"'))).toBe(false);
    expect(ctx.tx.order.create).not.toHaveBeenCalled();
    expect(ctx.state).toMatchObject({ stock: 10, reserved: 2, order: null, cleared: false });
  });
  it('canonicalizes key ordering and returns the same guest token on replay', async () => {
    const ctx = setup(); const first = await ctx.service.checkout(session, dto(), undefined, key);
    const reordered = Object.fromEntries(Object.entries(dto()).reverse()) as unknown as CheckoutDto;
    expect((await ctx.service.checkout(session, reordered, undefined, key)).accessToken).toBe(first.accessToken); expect(ctx.tx.order.create).toHaveBeenCalledTimes(1);
  });
  it('rejects replay hash mismatch without changing the original order', async () => {
    const ctx = setup(); await ctx.service.checkout(session, dto(), undefined, key);
    await expect(ctx.service.checkout(session, { ...dto(), comments: 'Changed' }, undefined, key)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.tx.order.create).toHaveBeenCalledTimes(1); expect(ctx.state.reserved).toBe(4);
  });
  it('rejects a replay whose stored owner differs even with a matching request hash', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); ctx.state.order.userId = 'someone-else';
    await expect(ctx.service.checkout(session, dto(), actor, key)).rejects.toBeInstanceOf(NotFoundException);
  });
  it.each(['key', 'terms', 'contact', 'delivery', 'city', 'address', 'session', 'security'])('rejects incomplete checkout before writes: %s', async (kind) => {
    const ctx = setup(); const input = dto();
    if (kind === 'terms') input.acceptedTerms = false; if (kind === 'contact') input.contact = undefined; if (kind === 'delivery') input.deliveryMethod = undefined;
    if (kind === 'city') input.shippingAddress.city = ''; if (kind === 'address') input.shippingAddress.address = ''; if (kind === 'security') ctx.config.get.mockReturnValue('short');
    await expect(ctx.service.checkout(kind === 'session' ? 'short' : session, input, undefined, kind === 'key' ? undefined : key)).rejects.toThrow();
    if (['delivery', 'city', 'address'].includes(kind)) {
      expect(ctx.tx.order.create).not.toHaveBeenCalled();
      expect(ctx.tx.$queryRaw.mock.calls.some(([strings]: any[]) => strings.join('?').includes('UPDATE "ProductVariant"'))).toBe(false);
    } else expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rolls back reserve, bonus debit and cart clear if the outbox insert fails', async () => {
    const ctx = setup(true); ctx.tx.mailOutbox.create.mockRejectedValueOnce(new Error('mock DB failure'));
    await expect(ctx.service.checkout(session, dto(), actor, key)).rejects.toThrow('mock DB failure');
    expect(ctx.state).toMatchObject({ stock: 10, reserved: 2, order: null, cleared: false, account: { balance: 1000 } }); expect(ctx.state.entries).toHaveLength(0); expect(ctx.state.redemptions).toHaveLength(0);
  });
  it('rolls back if atomic stock reservation loses a race', async () => {
    const ctx = setup(); ctx.state.reserved = 9; await expect(ctx.service.checkout(session, dto(), undefined, key)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.state.order).toBeNull(); expect(ctx.state.reserved).toBe(9); expect(ctx.state.stock).toBe(10);
  });
  it('requires a valid unexpired bearer token for guest order access', async () => {
    const ctx = setup(); const order = await ctx.service.checkout(session, dto(), undefined, key);
    await expect(ctx.service.getAccessible(order.orderNumber)).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.getAccessible(order.orderNumber, { sub: 'random' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(ctx.service.getAccessible(order.orderNumber, undefined, 'wrong')).rejects.toBeInstanceOf(NotFoundException);
    expect((await ctx.service.getAccessible(order.orderNumber, undefined, order.accessToken)).id).toBe('mock-order');
    ctx.state.order.guestAccessExpiresAt = new Date(0); await expect(ctx.service.getAccessible(order.orderNumber, undefined, order.accessToken)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('protects customer ownership; staff read does not authorize customer cancellation', async () => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key);
    await expect(ctx.service.findOne(order.orderNumber, { sub: 'stranger', role: 'CUSTOMER_B2C' })).rejects.toBeInstanceOf(NotFoundException);
    expect((await ctx.service.findOne(order.orderNumber, actor)).id).toBe('mock-order'); expect((await ctx.service.getAccessible(order.orderNumber, { sub: 'staff', role: 'ADMIN' })).id).toBe('mock-order');
    await expect(ctx.service.cancel(order.orderNumber, { sub: 'staff', role: 'ADMIN' })).rejects.toBeInstanceOf(NotFoundException);
  });
  it('redacts private payment metadata in public order responses', async () => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key); ctx.payment();
    expect((await ctx.service.findOne(order.orderNumber, actor)).payments[0]).not.toHaveProperty('metadata');
  });
  it('cancels and releases only reserved stock, reversing bonuses exactly once', async () => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key); await ctx.service.cancel(order.orderNumber, actor); await ctx.service.cancel(order.orderNumber, actor);
    expect(ctx.state.order).toMatchObject({ status: 'CANCELLED', reservationState: 'RELEASED', reservationExpiresAt: null });
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(2); expect(ctx.state.account.balance).toBe(1000); expect(ctx.state.entries.filter((e: any) => e.type === 'REVERSAL')).toHaveLength(1);
    expect(ctx.state.redemptions[0].status).toBe('RELEASED'); expect(ctx.state.mails.filter((m: any) => m.kind === 'ORDER_CANCELLED')).toHaveLength(1);
    expect(ctx.tx.productVariant.updateMany).toHaveBeenCalledWith({ where: { id: 'mock-variant', reserved: { gte: 2 } }, data: { reserved: { decrement: 2 } } });
  });
  it.each(['CREATING', 'PENDING', 'SUCCEEDED'])('does not cancel with a %s payment', async (status) => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key); ctx.payment(status);
    await expect(ctx.service.cancel(order.orderNumber, actor)).rejects.toBeInstanceOf(ConflictException); expect(ctx.state.reserved).toBe(4); expect(ctx.state.account.balance).toBe(950);
  });
  it('rolls back cancellation if a reserve cannot be released', async () => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key); ctx.tx.productVariant.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(ctx.service.cancel(order.orderNumber, actor)).rejects.toBeInstanceOf(ConflictException); expect(ctx.state.order.status).toBe('NEW'); expect(ctx.state.account.balance).toBe(950);
  });
  it('expires an unpaid reserve and restores bonuses only once', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); ctx.state.order.reservationExpiresAt = new Date(0);
    await ctx.service.expireReservations(); await ctx.service.expireReservations(); expect(ctx.state.reserved).toBe(2); expect(ctx.state.account.balance).toBe(1000); expect(ctx.state.entries.filter((e: any) => e.type === 'REVERSAL')).toHaveLength(1);
    expect(ctx.tx.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ payments: { none: { status: { in: ['CREATING', 'PENDING', 'SUCCEEDED'] } } } }) }));
  });
  it.each(['CREATING', 'PENDING', 'SUCCEEDED'])('rechecks active %s payment under the expiry lock', async (status) => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); ctx.state.order.reservationExpiresAt = new Date(0); ctx.payment(status);
    await ctx.service.expireReservations(); expect(ctx.state.order.status).toBe('NEW'); expect(ctx.state.reserved).toBe(4); expect(ctx.state.account.balance).toBe(950);
  });
  it('does not expire a reservation extended after candidate selection', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); ctx.state.order.reservationExpiresAt = new Date(Date.now() + 60000);
    await ctx.service.expireReservations(); expect(ctx.state.reserved).toBe(4);
  });
  it('settles verified payment once; duplicates never accrue twice or regress paid status', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); const metadata = ctx.payment();
    expect((await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).duplicate).toBe(false);
    expect((await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).duplicate).toBe(true);
    expect((await ctx.service.settleVerifiedPayment('mock-provider-payment', 'CANCELED', metadata)).duplicate).toBe(true);
    expect(ctx.state.order).toMatchObject({ status: 'PAID', paymentStatus: 'SUCCEEDED', reservationExpiresAt: null, loyaltyAccruedAt: expect.any(Date) });
    expect(ctx.state.entries.filter((e: any) => e.type === 'ACCRUAL')).toHaveLength(1); expect(ctx.state.entries.find((e: any) => e.type === 'ACCRUAL').amount).toBe(75);
    expect(ctx.state.account.balance).toBe(1025); expect(ctx.state.redemptions[0].status).toBe('APPLIED'); expect(ctx.state.reserved).toBe(4); expect(ctx.state.stock).toBe(10);
    expect(ctx.state.mails.filter((m: any) => m.kind === 'ORDER_PAID')).toHaveLength(1);
  });
  it.each(['provider', 'localPaymentId', 'orderId', 'currency', 'amount', 'paid'])('atomically rejects invalid verified evidence %s', async (field) => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); const metadata: any = ctx.payment(); metadata[field] = field === 'paid' ? false : field === 'amount' ? 1 : 'wrong';
    await expect(ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).rejects.toThrow(); expect(ctx.state.payments[0].status).toBe('PENDING'); expect(ctx.state.order.status).toBe('NEW'); expect(ctx.state.entries.filter((e: any) => e.type === 'ACCRUAL')).toHaveLength(0);
  });
  it('does not accrue again when the order already has an accrual timestamp', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); const metadata = ctx.payment(); ctx.state.order.loyaltyAccruedAt = new Date();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata); expect(ctx.state.entries.filter((e: any) => e.type === 'ACCRUAL')).toHaveLength(0);
  });
  it('canceled payment reverses reserve/bonuses once and cannot later succeed', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); const metadata = ctx.payment();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'CANCELED', metadata); expect((await ctx.service.settleVerifiedPayment('mock-provider-payment', 'CANCELED', metadata)).duplicate).toBe(true);
    await expect(ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.state.reserved).toBe(2); expect(ctx.state.account.balance).toBe(1000); expect(ctx.state.entries.filter((e: any) => e.type === 'REVERSAL')).toHaveLength(1);
  });
  it('pending callback does not change financial state', async () => {
    const ctx = setup(true); await ctx.service.checkout(session, dto(), actor, key); const metadata = ctx.payment();
    expect((await ctx.service.settleVerifiedPayment('mock-provider-payment', 'PENDING', metadata)).duplicate).toBe(true); expect(ctx.tx.payment.update).not.toHaveBeenCalled(); expect(ctx.state.account.balance).toBe(950);
  });
  it('quote exposes only publicQuote', async () => { const result = await setup().service.quote(session, dto()); expect(result).not.toHaveProperty('cart'); expect(result).not.toHaveProperty('customerHash'); });
  it('validates nested contacts and rejects checkout without contact, not the obsolete two-argument contract', async () => {
    for (const invalid of [{ ...contact, email: 'invalid' }, { ...contact, firstName: '   ' }, { ...contact, phone: '       ' }]) {
      const errors = await validate(plainToInstance(CheckoutDto, { ...dto(), contact: invalid })); expect(errors.some(error => error.property === 'contact')).toBe(true);
    }
    expect(await validate(plainToInstance(CheckoutDto, dto()))).toEqual([]);
    await expect(setup().service.checkout(session, { ...dto(), contact: undefined }, undefined, key)).rejects.toBeInstanceOf(BadRequestException);
  });

  function digitalSetup(owned = false) {
    const ctx = setup(owned);
    Object.assign(ctx.cart.items[0].variant, { price: 1000, options: { nominal: 1000, validityDays: 180 },
      product: { nameRu: 'Электронный сертификат', productType: 'GIFT_CARD', giftCardValidityDays: 365 } });
    const base = ctx.pricing.quote.getMockImplementation()!;
    ctx.pricing.quote.mockImplementation(async () => ({ ...(await base()), digitalDelivery: true, giftCardMinor: 0,
      subtotalMinor: 200000, promoDiscountMinor: 0, bonusAmount: 0, shippingMinor: 0, finalMinor: 200000, deliveryConfirmed: true,
      promoCode: undefined, loyaltyAccount: undefined,
      publicQuote: { digitalDelivery: true, giftCardAmount: 0, total: 2000, deliveryConfirmed: true, canPay: true, messages: [] } }));
    return ctx;
  }
  function coveredSetup(amountMinor: number, owned = false) {
    const ctx = setup(owned); const base = ctx.pricing.quote.getMockImplementation()!;
    ctx.pricing.quote.mockImplementation(async () => {
      const price = await base();
      return { ...price, giftCardMinor: amountMinor, giftCardId: 'mock-card', finalMinor: price.finalMinor - amountMinor,
        publicQuote: { ...price.publicQuote, digitalDelivery: false, giftCardAmount: amountMinor / 100, total: (price.finalMinor - amountMinor) / 100 } };
    });
    return ctx;
  }
  const digitalDto = (): CheckoutDto => ({ contact, acceptedTerms: true, expectedTotal: 2000 });
  const coveredDto = (): CheckoutDto => ({ ...dto(), giftCardCode: '00112233-44556677-8899AABB-CCDDEEFF' });

  it('accepts digital DTO without address/method and validates the optional bearer code', async () => {
    expect(await validate(plainToInstance(CheckoutDto, digitalDto()))).toEqual([]);
    const invalid = plainToInstance(CheckoutDto, { ...digitalDto(), giftCardCode: 'x'.repeat(101) });
    expect((await validate(invalid)).some(error => error.property === 'giftCardCode')).toBe(true);
  });
  it('both authorized order GET handlers prohibit private code caching', () => {
    for (const handler of [OrdersController.prototype.findOne, StorefrontController.prototype.order]) {
      expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toContainEqual({ name: 'Cache-Control', value: 'private, no-store' });
    }
  });
  it('digital checkout snapshots nominal/validity, never reserves stock, touches shipping or accrues loyalty', async () => {
    const ctx = digitalSetup(true); const order = await ctx.service.checkout(session, digitalDto(), actor, key);
    expect(order.shippingAddress).toEqual({ deliveryMethod: 'DIGITAL', email: 'anna@example.test' });
    expect(order.items[0]).toMatchObject({ productType: 'GIFT_CARD', giftCardValidityDays: 180, price: 1000, quantity: 2 });
    expect(order).toMatchObject({ canPay: true, requiresDeliveryConfirmation: false, giftCardAmount: 0, shippingCost: 0, shippingProvider: null });
    expect(order.priceSnapshot).toMatchObject({ digitalDelivery: true, shippingQuoteId: null });
    expect(order).not.toHaveProperty('giftCards');
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(2);
    expect(ctx.tx.shippingQuote.findUnique).not.toHaveBeenCalled(); expect(loyaltyCore.maintainAccount).not.toHaveBeenCalled();
    expect(ctx.giftCards.issueForPaidOrder).not.toHaveBeenCalled(); expect(ctx.state.entries).toHaveLength(0);
  });
  it('verified cash issues digital cards once and completes delivery without stock/loyalty changes', async () => {
    const ctx = digitalSetup(true); const order = await ctx.service.checkout(session, digitalDto(), actor, key);
    const metadata = ctx.payment();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.state.order).toMatchObject({ status: 'DELIVERED', reservationState: 'CONSUMED', paymentStatus: 'SUCCEEDED', reservationExpiresAt: null });
    expect(ctx.giftCards.issueForPaidOrder).toHaveBeenCalledTimes(1);
    expect(ctx.state.issuedCards).toHaveLength(2); expect(ctx.state.entries).toHaveLength(0); expect(loyaltyCore.maintainAccount).not.toHaveBeenCalled();
    const delivery = ctx.state.mails.filter((mail: any) => mail.kind === 'GIFT_CARDS_ISSUED');
    expect(delivery).toHaveLength(1); expect(delivery[0].recipient).toBe('anna@example.test');
    const contents = ctx.mailSecrets.decrypt(delivery[0].encryptedPayload);
    for (const card of ctx.state.issuedCards) {
      expect(contents.text).toContain(card.code);
      expect(contents.text).toContain('Номинал: 1000 ₽'); expect(contents.text).toContain('01.03.2027');
      expect(JSON.stringify(delivery)).not.toContain(card.code);
      expect(JSON.stringify(ctx.state.order.priceSnapshot)).not.toContain(card.code);
      expect(JSON.stringify(ctx.state.payments)).not.toContain(card.code);
    }
    expect(delivery[0].encryptedPayload).toMatch(/^v1\./); expect(delivery[0]).not.toHaveProperty('text'); expect(delivery[0]).not.toHaveProperty('subject');
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(2);
    const visible = await ctx.service.findOne(order.orderNumber, actor); expect(visible.giftCards).toHaveLength(2);
    ctx.giftCards.revealForOrder.mockClear();
    expect(await ctx.service.findOne(order.orderNumber, { sub: 'staff', role: 'ADMIN' })).not.toHaveProperty('giftCards');
    await expect(ctx.service.findOne(order.orderNumber, { sub: 'other' })).rejects.toBeInstanceOf(NotFoundException);
    expect(ctx.giftCards.revealForOrder).not.toHaveBeenCalled();
  });
  it('marketing opt-out suppresses ordinary mail but never essential purchased-card delivery', async () => {
    const ctx = digitalSetup(true); ctx.tx.user.findUnique.mockResolvedValue({ notificationPreferences: { email: false } });
    await ctx.service.checkout(session, digitalDto(), actor, key); const metadata = ctx.payment();
    expect(ctx.state.mails).toHaveLength(0);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.state.mails).toHaveLength(1); expect(ctx.state.mails[0].kind).toBe('GIFT_CARDS_ISSUED');
    expect(ctx.notifications.prepare).toHaveBeenCalledTimes(1);
    expect(ctx.notifications.prepare).toHaveBeenCalledWith(expect.objectContaining({ kind: 'GIFT_CARDS_ISSUED', recipient: 'anna@example.test', dedupeKey: 'GIFT_CARDS_ISSUED:mock-order' }));
    expect(ctx.mailSecrets.decrypt(ctx.state.mails[0].encryptedPayload).text).toContain('передавайте код только получателю подарка');
  });
  it('guest product delivery survives loss/expiry of order-access token in encrypted outbox', async () => {
    const ctx = digitalSetup(); const order = await ctx.service.checkout(session, digitalDto(), undefined, key); const metadata = ctx.payment();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    ctx.state.order.guestAccessExpiresAt = new Date(0);
    await expect(ctx.service.findOne(order.orderNumber, undefined, order.accessToken)).rejects.toBeInstanceOf(NotFoundException);
    const delivery = ctx.state.mails.find((mail: any) => mail.kind === 'GIFT_CARDS_ISSUED');
    expect(delivery.recipient).toBe('anna@example.test');
    expect(ctx.state.issuedCards.every((card: any) => ctx.mailSecrets.decrypt(delivery.encryptedPayload).text.includes(card.code))).toBe(true);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.state.mails.filter((mail: any) => mail.kind === 'GIFT_CARDS_ISSUED')).toHaveLength(1);
    expect(ctx.giftCards.revealForOrder).toHaveBeenCalledTimes(1);
  });
  it.each(['prepare', 'insert', 'missing-recipient', 'missing-cards'])('essential gift delivery %s failure rolls back payment/issuance; safe retry', async (failure) => {
    const ctx = digitalSetup(true); await ctx.service.checkout(session, digitalDto(), actor, key); const metadata = ctx.payment();
    const prepare = ctx.notifications.prepare.getMockImplementation()!;
    const insert = ctx.tx.mailOutbox.create.getMockImplementation()!;
    if (failure === 'prepare') ctx.notifications.prepare.mockImplementation((data: any) => { if (data.kind === 'GIFT_CARDS_ISSUED') throw new Error('MOCK_MAIL_PREPARE_FAILURE'); return prepare(data); });
    if (failure === 'insert') ctx.tx.mailOutbox.create.mockImplementation((args: any) => { if (args.data.kind === 'GIFT_CARDS_ISSUED') throw new Error('MOCK_MAIL_INSERT_FAILURE'); return insert(args); });
    if (failure === 'missing-recipient') ctx.state.order.buyerEmail = null;
    if (failure === 'missing-cards') ctx.giftCards.revealForOrder.mockResolvedValueOnce([]);
    await expect(ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).rejects.toThrow();
    expect(ctx.state.order.status).toBe('NEW'); expect(ctx.state.payments[0].status).toBe('PENDING');
    expect(ctx.state.issuedCards).toHaveLength(0); expect(ctx.state.entries).toHaveLength(0);
    expect(ctx.state.mails.filter((mail: any) => mail.kind === 'GIFT_CARDS_ISSUED')).toHaveLength(0);
    ctx.notifications.prepare.mockImplementation(prepare); ctx.tx.mailOutbox.create.mockImplementation(insert); ctx.state.order.buyerEmail = 'anna@example.test';
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.state.order.status).toBe('DELIVERED'); expect(ctx.state.mails.filter((mail: any) => mail.kind === 'GIFT_CARDS_ISSUED')).toHaveLength(1);
  });
  it('only a valid guest order token reveals paid digital codes, never staff access alone', async () => {
    const ctx = digitalSetup(); const order = await ctx.service.checkout(session, digitalDto(), undefined, key); const metadata = ctx.payment();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    await expect(ctx.service.findOne(order.orderNumber, undefined, 'wrong')).rejects.toBeInstanceOf(NotFoundException);
    expect(await ctx.service.findOne(order.orderNumber, { sub: 'staff', role: 'ADMIN' }, 'wrong')).not.toHaveProperty('giftCards');
    expect((await ctx.service.findOne(order.orderNumber, undefined, order.accessToken)).giftCards).toHaveLength(2);
    ctx.state.order.guestAccessExpiresAt = new Date(0);
    await expect(ctx.service.findOne(order.orderNumber, undefined, order.accessToken)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rolls back successful payment state when issuance fails; no partial delivery/payment/award', async () => {
    const ctx = digitalSetup(true); await ctx.service.checkout(session, digitalDto(), actor, key); const metadata = ctx.payment();
    ctx.giftCards.issueForPaidOrder.mockRejectedValueOnce(new Error('mock issuance failure'));
    await expect(ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata)).rejects.toThrow('mock issuance failure');
    expect(ctx.state.order.status).toBe('NEW'); expect(ctx.state.payments[0].status).toBe('PENDING');
    expect(ctx.state.issuedCards).toHaveLength(0); expect(ctx.state.entries).toHaveLength(0);
  });
  it('expired digital checkout cancels without attempting physical reserve release', async () => {
    const ctx = digitalSetup(true); await ctx.service.checkout(session, digitalDto(), actor, key);
    ctx.state.order.reservationExpiresAt = new Date(0); await ctx.service.expireReservations();
    expect(ctx.state.order.status).toBe('CANCELLED'); expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(ctx.giftCards.issueForPaidOrder).not.toHaveBeenCalled(); expect(ctx.state.reserved).toBe(2);
  });
  it('locks the normalized code before pricing, reserves once and applies only after verified cash', async () => {
    const ctx = coveredSetup(100000); const input = { ...coveredDto(), giftCardCode: coveredDto().giftCardCode!.toLowerCase() };
    const order = await ctx.service.checkout(session, input, undefined, key);
    const lock = ctx.tx.$queryRaw.mock.calls.findIndex(([strings]: any[]) => strings.join('?').includes('FROM "GiftCard"'));
    expect(lock).toBeGreaterThan(-1); expect(ctx.tx.$queryRaw.mock.invocationCallOrder[lock]).toBeLessThan(ctx.pricing.quote.mock.invocationCallOrder[0]);
    expect(order.giftCardAmount).toBe(1000); expect(Number(order.finalAmount)).toBe(811);
    expect(ctx.giftCards.reserve).toHaveBeenCalledWith(ctx.tx, order.id, input.giftCardCode, 100000);
    expect(ctx.giftCards.apply).not.toHaveBeenCalled();
    await ctx.service.checkout(session, input, undefined, key); expect(ctx.giftCards.reserve).toHaveBeenCalledTimes(1);
    const metadata = ctx.payment(); await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.giftCards.apply).toHaveBeenCalledTimes(1); expect(ctx.state.giftHolds[0].status).toBe('APPLIED');
    expect(ctx.giftCards.issueForPaidOrder).not.toHaveBeenCalled();
  });
  it('full certificate cover is an atomic real internal payment, idempotent and not warehouse-consumed', async () => {
    const ctx = coveredSetup(181100); const input = { ...coveredDto(), expectedTotal: 0 };
    const order = await ctx.service.checkout(session, input, undefined, key); await ctx.service.checkout(session, input, undefined, key);
    expect(order).toMatchObject({ status: 'PAID', paymentStatus: 'SUCCEEDED', finalAmount: 0, canPay: false, paymentMethod: 'GIFT_CARD', reservationState: 'ACTIVE' });
    expect(ctx.tx.payment.create).toHaveBeenCalledTimes(1);
    expect(ctx.state.payments[0]).toMatchObject({ provider: 'GIFT_CARD', amount: 0, status: 'SUCCEEDED', transactionId: expect.any(String), metadata: { giftCardAmount: '1811.00', redemptionId: 'mock-gift-redemption' } });
    expect(order.payments[0]).not.toHaveProperty('metadata'); expect(ctx.giftCards.apply).toHaveBeenCalledTimes(1); expect(ctx.giftCards.reserve).toHaveBeenCalledTimes(1);
    expect(ctx.state.giftHolds[0].status).toBe('APPLIED'); expect(ctx.state.reserved).toBe(4); expect(ctx.state.stock).toBe(10);
    expect(ctx.state.mails.filter((mail: any) => mail.kind === 'ORDER_PAID')).toHaveLength(1); expect(ctx.oneC.enqueueOrder).not.toHaveBeenCalled();
  });
  it('full-cover apply failure rolls back card hold/order/reserve/payment/cart atomically', async () => {
    const ctx = coveredSetup(181100); ctx.giftCards.apply.mockRejectedValueOnce(new Error('mock apply failure'));
    await expect(ctx.service.checkout(session, coveredDto(), undefined, key)).rejects.toThrow('mock apply failure');
    expect(ctx.state.order).toBeNull(); expect(ctx.state.payments).toHaveLength(0); expect(ctx.state.giftHolds).toHaveLength(0);
    expect(ctx.state.reserved).toBe(2); expect(ctx.state.stock).toBe(10); expect(ctx.state.cleared).toBe(false);
  });
  it('cancel/expiry/provider-cancel releases the card hold exactly once, not its balance', async () => {
    const ctx = coveredSetup(100000, true); const order = await ctx.service.checkout(session, coveredDto(), actor, key);
    const metadata = ctx.payment(); await ctx.service.settleVerifiedPayment('mock-provider-payment', 'CANCELED', metadata);
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'CANCELED', metadata);
    expect(ctx.giftCards.release).toHaveBeenCalledTimes(1); expect(ctx.giftCards.apply).not.toHaveBeenCalled(); expect(ctx.state.giftHolds[0].status).toBe('RELEASED');
    expect(ctx.state.order.status).toBe('CANCELLED'); expect(ctx.state.reserved).toBe(2);
    const cardLock = ctx.giftCards.release.mock.invocationCallOrder[0];
    const refund = ctx.tx.loyaltyAccount.update.mock.calls.findIndex(([args]: any[]) => args.data.balance?.increment);
    expect(cardLock).toBeLessThan(ctx.tx.loyaltyAccount.update.mock.invocationCallOrder[refund]);
    expect(ctx.tx.loyaltyAccount.update.mock.invocationCallOrder[refund]).toBeLessThan(ctx.tx.productVariant.updateMany.mock.invocationCallOrder[0]);
  });
  it('gift-funded merchandise does not earn bonuses; only cash minus shipping earns', async () => {
    const ctx = coveredSetup(100000, true); await ctx.service.checkout(session, coveredDto(), actor, key); const metadata = ctx.payment();
    await ctx.service.settleVerifiedPayment('mock-provider-payment', 'SUCCEEDED', metadata);
    expect(ctx.state.entries.find((entry: any) => entry.type === 'ACCRUAL').amount).toBe(25);
  });
  it('does not accept a missing/mismatched applied certificate hold as financial evidence', async () => {
    const ctx = coveredSetup(181100); ctx.giftCards.apply.mockResolvedValueOnce(null);
    await expect(ctx.service.checkout(session, coveredDto(), undefined, key)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.state.order).toBeNull(); expect(ctx.state.payments).toHaveLength(0); expect(ctx.state.reserved).toBe(2);
  });
  it('repeat uses virtual gift availability, but refuses mixing digital and physical items', async () => {
    const ctx = digitalSetup(true); const order = await ctx.service.checkout(session, digitalDto(), actor, key);
    const variant = { ...ctx.cart.items[0].variant, stock: 0, reserved: 0, isActive: true,
      product: { ...ctx.cart.items[0].variant.product, isActive: true } };
    ctx.cart.items = [];
    ctx.tx.cart.findUniqueOrThrow = jest.fn(async () => ctx.cart);
    ctx.tx.productVariant.findUnique = jest.fn(async () => variant);
    ctx.tx.cartItem.findUnique = jest.fn(async () => null);
    ctx.tx.cartItem.upsert = jest.fn(async ({ create }: any) => {
      ctx.cart.items.push({ ...create, variant }); return create;
    });
    const repeated = await ctx.service.repeat(order.orderNumber, actor, session);
    expect(repeated.added).toBe(2); expect(repeated.unavailable).toHaveLength(0);
    expect(ctx.state.reserved).toBe(2); expect(ctx.state.stock).toBe(10);
    ctx.cart.items = [{ variantId: 'physical', quantity: 1, variant: { price: 100, product: { productType: 'PHYSICAL' } } }];
    await expect(ctx.service.repeat(order.orderNumber, actor, session)).rejects.toBeInstanceOf(ConflictException);
  });
  it('redacts untrusted gift relations/hash/encrypted code from public order data', async () => {
    const ctx = setup(true); const order = await ctx.service.checkout(session, dto(), actor, key);
    Object.assign(ctx.state.order, { giftCards: [{ encryptedCode: 'private', codeHash: 'private' }], giftCardRedemptions: [{ card: { codeHash: 'private' } }], giftRedemption: { card: { encryptedCode: 'private' } }, encryptedCode: 'private', codeHash: 'private' });
    const result = await ctx.service.findOne(order.orderNumber, actor);
    for (const field of ['giftCards', 'giftCardRedemptions', 'giftRedemption', 'encryptedCode', 'codeHash']) expect(result).not.toHaveProperty(field);
  });
});
