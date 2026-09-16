import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import { hashCartSession, hashShippingDestination } from '../common/storefront-utils';
import { StorefrontPricingService } from './storefront-pricing.service';
import { giftCodeHash } from '../gift-cards/gift-cards.helpers';

describe('StorefrontPricingService (mock database only)', () => {
  const session = 'isolated-mock-session';
  let db: any;
  let cart: any;
  let service: StorefrontPricingService;
  const actor = { sub: 'buyer', role: 'CUSTOMER_B2C' };
  const dto = () => ({ contact: { email: ' Buyer@Example.test ' }, shippingAddress: { city: 'Москва', street: 'Тестовая', house: '1' }, deliveryMethod: 'COURIER', shippingProvider: 'CDEK' });
  const promo = (overrides: any = {}) => ({ code: 'TEST', isActive: true, startsAt: null, endsAt: null, minimumAmount: '0.00', amount: '10.00', discountType: 'PERCENT', maximumDiscount: null, usageLimit: null, perCustomerLimit: 1, ...overrides });
  const owned = () => {
    cart.userId = actor.sub;
    cart.user = { id: actor.sub, role: 'CUSTOMER_B2C', isActive: true, email: 'buyer@example.test' };
  };
  const shipping = (input = dto(), overrides: any = {}) => ({
    id: 'quote', sessionHash: hashCartSession(session), provider: input.shippingProvider, deliveryMethod: input.deliveryMethod,
    destinationHash: hashShippingDestination({ ...input.shippingAddress, provider: input.shippingProvider, deliveryMethod: input.deliveryMethod }),
    currency: 'RUB', amount: '250.50', expiresAt: new Date(Date.now() + 60000),
    requestSnapshot: {
      ...input,
      weightGrams: cart.items.reduce((sum: number, item: any) => sum + item.quantity * item.variant.options.weightGrams, 0),
      cartItems: cart.items.map((item: any) => ({ variantId: item.variantId, quantity: item.quantity })).sort((a: any, b: any) => a.variantId.localeCompare(b.variantId)),
    }, ...overrides,
  });

  beforeEach(() => {
    cart = {
      id: 'cart', userId: null, user: null, currency: 'RUB',
      items: [{ variantId: 'variant', quantity: 2, variant: { isActive: true, price: '780.25', stock: 10, reserved: 2, options: { weightGrams: 200 }, product: { isActive: true, currency: 'RUB', nameRu: 'Тестовый товар' } } }],
    };
    db = {
      cart: { findUnique: jest.fn().mockImplementation(async () => cart) },
      loyaltyProgramSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      loyaltyAccount: { findUnique: jest.fn().mockResolvedValue({ id: 'loyalty', balance: 2000 }) },
      promoCode: { findUnique: jest.fn().mockResolvedValue(promo()) },
      promoRedemption: { count: jest.fn().mockResolvedValue(0) },
      shippingQuote: { findUnique: jest.fn().mockResolvedValue(shipping()) },
      giftCard: { findUnique: jest.fn().mockResolvedValue({ id: 'gift-card', currency: 'RUB', balance: '1500.00', reserved: '250.00', expiresAt: new Date(Date.now() + 60000), isActive: true }) },
    };
    service = new StorefrontPricingService(db);
  });

  it('calculates server prices in minor units and never calls a provider', async () => {
    const result = await service.quote(session, dto());
    expect(result.subtotalMinor).toBe(156050);
    expect(result.finalMinor).toBe(156050);
    expect(result.cart).toBe(cart);
    expect(result.publicQuote).toMatchObject({ subtotal: 1560.5, shippingAmount: null, total: 1560.5, canPay: false, currency: 'RUB' });
    expect(result.publicQuote.messages[0]).toContain('не бесплатная доставка');
    expect(db.shippingQuote.findUnique).not.toHaveBeenCalled();
    expect(db.loyaltyAccount.findUnique).not.toHaveBeenCalled();
    expect(result.publicQuote).not.toHaveProperty('cart');
    expect(result.publicQuote).not.toHaveProperty('customerHash');
  });

  it.each([undefined, { sub: 'stranger' }])('rejects a private cart for %p', async (identity) => {
    owned();
    await expect(service.quote(session, dto(), identity)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects inactive owners', async () => {
    owned(); cart.user.isActive = false;
    await expect(service.quote(session, dto(), actor)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['missing', 'empty', 'currency', 'productCurrency', 'variant', 'product', 'reserved', 'quantity', 'fraction', 'price'])('rejects invalid cart: %s', async (kind) => {
    if (kind === 'missing') cart = null;
    if (kind === 'empty') cart.items = [];
    if (kind === 'currency') cart.currency = 'USD';
    if (kind === 'productCurrency') cart.items[0].variant.product.currency = 'USD';
    if (kind === 'variant') cart.items[0].variant.isActive = false;
    if (kind === 'product') cart.items[0].variant.product.isActive = false;
    if (kind === 'reserved') cart.items[0].variant.reserved = 9;
    if (kind === 'quantity') cart.items[0].quantity = 0;
    if (kind === 'fraction') cart.items[0].quantity = 1.5;
    if (kind === 'price') cart.items[0].variant.price = 'NaN';
    await expect(service.quote(session, dto())).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects a missing session before reading the database', async () => {
    await expect(service.quote('', dto())).rejects.toBeInstanceOf(BadRequestException);
    expect(db.cart.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a line total exceeding safe integer precision', async () => {
    cart.items[0].variant.price = '9000000000000.00';
    cart.items[0].quantity = 20; cart.items[0].variant.stock = 30;
    await expect(service.quote(session, dto())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes code and guest email; counts only reserved/applied redemptions', async () => {
    const result = await service.quote(session, { ...dto(), promoCode: ' test ' });
    expect(result.promoDiscountMinor).toBe(15605);
    expect(result.customerHash).toBe(createHash('sha256').update('buyer@example.test').digest('hex'));
    expect(db.promoCode.findUnique).toHaveBeenCalledWith({ where: { code: 'TEST' } });
    expect(db.promoRedemption.count).toHaveBeenCalledWith({ where: { code: 'TEST', status: { in: ['RESERVED', 'APPLIED'] }, customerHash: result.customerHash } });
  });
  it('uses stable account identity instead of an editable email', async () => {
    owned();
    const result = await service.quote(session, { ...dto(), promoCode: 'TEST' }, actor);
    expect(result.customerHash).toBe(createHash('sha256').update(actor.sub).digest('hex'));
  });
  it('floors fractional percentage discounts to a complete kopeck', async () => {
    db.promoCode.findUnique.mockResolvedValue(promo({ amount: '12.55' }));
    expect((await service.quote(session, { ...dto(), promoCode: 'TEST' })).promoDiscountMinor).toBe(19584);
  });
  it.each([
    [{ discountType: 'FIXED', amount: '2000.00' }, 156050],
    [{ maximumDiscount: '50.00' }, 5000],
    [{ discountType: 'FIXED', amount: '100.00', maximumDiscount: '80.00' }, 8000],
  ])('caps discount at maximum and subtotal: %p', async (overrides, expected) => {
    db.promoCode.findUnique.mockResolvedValue(promo(overrides));
    expect((await service.quote(session, { ...dto(), promoCode: 'TEST' })).promoDiscountMinor).toBe(expected);
  });
  it.each([
    null, { isActive: false }, { startsAt: new Date(Date.now() + 60000) },
    { endsAt: new Date(Date.now() - 60000) }, { minimumAmount: '2000.00' },
    { usageLimit: 0 }, { perCustomerLimit: 0 }, { amount: '101.00' },
    { discountType: 'UNKNOWN' }, { amount: '-1.00' },
  ])('rejects invalid promotion %p', async (overrides) => {
    db.promoCode.findUnique.mockResolvedValue(overrides === null ? null : promo(overrides));
    await expect(service.quote(session, { ...dto(), promoCode: 'TEST' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects the per-customer limit even when the global limit is not reached', async () => {
    db.promoCode.findUnique.mockResolvedValue(promo({ usageLimit: 10 }));
    db.promoRedemption.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    await expect(service.quote(session, { ...dto(), promoCode: 'TEST' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('allows first-step guest promo preview without email, then rechecks the claimed email on final quote', async () => {
    const input = { ...dto(), contact: {}, promoCode: 'TEST' };
    const preview = await service.quote(session, input);
    expect(preview.promoDiscountMinor).toBe(15605);
    expect(preview.customerHash).toBe(hashCartSession(session));
    expect(preview.publicQuote.messages).toContain('Окончательно проверим лимит промокода после заполнения контактных данных');
    db.promoRedemption.count.mockClear();
    const final = await service.quote(session, { ...input, contact: dto().contact });
    expect(final.customerHash).toBe(createHash('sha256').update('buyer@example.test').digest('hex'));
    expect(final.customerHash).not.toBe(preview.customerHash);
    expect(final.publicQuote.messages).not.toContain('Окончательно проверим лимит промокода после заполнения контактных данных');
    expect(db.promoRedemption.count).toHaveBeenCalledWith({ where: { code: 'TEST', status: { in: ['RESERVED', 'APPLIED'] }, customerHash: final.customerHash } });
  });
  it('can reject the final claimed-email limit even though anonymous preview succeeded', async () => {
    await service.quote(session, { ...dto(), contact: {}, promoCode: 'TEST' });
    db.promoRedemption.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    await expect(service.quote(session, { ...dto(), promoCode: 'TEST' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('guest limit follows the claimed email, not a verified person identity', async () => {
    const first = await service.quote(session, { ...dto(), promoCode: 'TEST' });
    const second = await service.quote(session, { ...dto(), contact: { email: 'other@example.test' }, promoCode: 'TEST' });
    expect(first.customerHash).not.toBe(second.customerHash);
    expect(second.customerHash).toBe(createHash('sha256').update('other@example.test').digest('hex'));
  });

  it('applies bonuses after discounts, excluding shipping, and estimates earnings after write-off', async () => {
    owned();
    const result = await service.quote(session, { ...dto(), promoCode: 'TEST', useBonuses: true, shippingQuoteId: 'quote' }, actor);
    expect(result.bonusAmount).toBe(421);
    expect(result.finalMinor).toBe(123395);
    expect(result.publicQuote).toMatchObject({ discount: 156.05, bonusAmount: 421, shippingAmount: 250.5, maxBonusAmount: 421, earnEstimate: 9, canPay: true });
  });
  it('caps write-off at available balance', async () => {
    owned(); db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 10 });
    expect((await service.quote(session, { ...dto(), useBonuses: true }, actor)).bonusAmount).toBe(10);
  });
  it('projects ledger expiry read-only, never displaying expired credits as spendable', async () => {
    owned();
    const now = Date.now();
    const account = Object.freeze({ balance: 1000, entries: Object.freeze([
      Object.freeze({ id: 'expired', amount: 900, type: 'ACCRUAL', createdAt: new Date(now - 2000), metadata: { expiresAt: new Date(now - 1).toISOString() } }),
      Object.freeze({ id: 'live', amount: 100, type: 'ACCRUAL', createdAt: new Date(now - 1000), metadata: { expiresAt: new Date(now + 60000).toISOString() } }),
    ]) });
    db.loyaltyAccount.findUnique.mockResolvedValue(account);
    const result = await service.quote(session, { ...dto(), useBonuses: true }, actor);
    expect(result.publicQuote.maxBonusAmount).toBe(100);
    expect(result.bonusAmount).toBe(100);
    expect(result.finalMinor).toBe(146050);
    expect(result.loyaltyAccount).toBe(account); expect(account.balance).toBe(1000);
    expect(account.entries[0].amount).toBe(900);
    expect(db.loyaltyAccount.findUnique).toHaveBeenCalledWith({ where: { userId: actor.sub }, include: { entries: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } });
  });
  it('offers no write-off when all nominal credits expired', async () => {
    owned();
    db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 1000, entries: [
      { id: 'expired', amount: 1000, type: 'ACCRUAL', createdAt: new Date(0), metadata: { expiresAt: new Date(1).toISOString() } },
    ] });
    const result = await service.quote(session, { ...dto(), useBonuses: true }, actor);
    expect(result.publicQuote.maxBonusAmount).toBe(0); expect(result.bonusAmount).toBe(0);
    expect(result.finalMinor).toBe(156050);
  });
  it('preserves historical credits without expiry metadata and unrecorded opening balance', async () => {
    owned();
    db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 200, entries: [
      { id: 'legacy-credit', amount: 100, type: 'ACCRUAL', createdAt: new Date(0), metadata: null },
    ] });
    expect((await service.quote(session, { ...dto(), useBonuses: true }, actor)).bonusAmount).toBe(200);
  });
  it('expires only the unspent remainder of historic credits', async () => {
    owned();
    db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 110, entries: [
      { id: 'old', amount: 100, type: 'ACCRUAL', createdAt: new Date(0), metadata: { expiresAt: new Date(100).toISOString() } },
      { id: 'new', amount: 50, type: 'ACCRUAL', createdAt: new Date(1) },
      { id: 'debit', amount: -40, type: 'WRITE_OFF', createdAt: new Date(2) },
    ] });
    expect((await service.quote(session, { ...dto(), useBonuses: true }, actor)).bonusAmount).toBe(50);
  });
  it('does not expire already reconciled credits a second time', async () => {
    owned();
    db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 100, entries: [
      { id: 'old', amount: 200, type: 'ACCRUAL', createdAt: new Date(0), metadata: { expiresAt: new Date(100).toISOString() } },
      { id: 'new', amount: 100, type: 'ACCRUAL', createdAt: new Date(1) },
      { id: 'expiry', amount: -200, type: 'EXPIRY', createdAt: new Date(2), metadata: { expiredEntries: [{ entryId: 'old', amount: 200 }] } },
    ] });
    expect((await service.quote(session, { ...dto(), useBonuses: true }, actor)).bonusAmount).toBe(100);
  });
  it('estimates the participation multiplier on the same non-expired balance checkout will see', async () => {
    owned();
    db.loyaltyProgramSetting.findUnique.mockResolvedValue({ isEnabled: true, maxWriteOffPercent: 30, earnPercent: 10, proThreshold: 100, premiumThreshold: 1000, proMultiplierPercent: 120, premiumMultiplierPercent: 150 });
    db.loyaltyAccount.findUnique.mockResolvedValue({ balance: 2000, entries: [
      { id: 'old', amount: 1950, type: 'ACCRUAL', createdAt: new Date(0), metadata: { expiresAt: new Date(100).toISOString() } },
      { id: 'new', amount: 50, type: 'ACCRUAL', createdAt: new Date(1) },
    ] });
    const result = await service.quote(session, dto(), actor);
    expect(result.publicQuote.maxBonusAmount).toBe(50);
    expect(result.publicQuote.earnEstimate).toBe(156);
  });
  it('does not spend bonuses until explicitly requested', async () => {
    owned();
    const result = await service.quote(session, dto(), actor);
    expect(result.bonusAmount).toBe(0); expect(result.publicQuote.maxBonusAmount).toBe(468);
  });
  it('uses configured percentages, thresholds and level multipliers', async () => {
    owned();
    db.loyaltyProgramSetting.findUnique.mockResolvedValue({ isEnabled: true, maxWriteOffPercent: 10, earnPercent: 5, proThreshold: 100, premiumThreshold: 1000, proMultiplierPercent: 120, premiumMultiplierPercent: 150 });
    const result = await service.quote(session, { ...dto(), useBonuses: true }, actor);
    expect(result.bonusAmount).toBe(156);
    expect(result.publicQuote.earnEstimate).toBe(105);
  });
  it.each(['guest', 'b2b', 'disabled'])('never spends or earns B2C bonuses for %s', async (kind) => {
    if (kind !== 'guest') owned();
    if (kind === 'b2b') cart.user.role = 'CUSTOMER_B2B';
    if (kind === 'disabled') db.loyaltyProgramSetting.findUnique.mockResolvedValue({ isEnabled: false });
    const result = await service.quote(session, { ...dto(), useBonuses: true }, kind === 'guest' ? undefined : actor);
    expect(result.bonusAmount).toBe(0); expect(result.publicQuote.earnEstimate).toBe(0);
    expect(db.loyaltyAccount.findUnique).not.toHaveBeenCalled();
  });
  it('does not create missing settings or loyalty accounts', async () => {
    owned(); db.loyaltyAccount.findUnique.mockResolvedValue(null);
    const result = await service.quote(session, { ...dto(), useBonuses: true }, actor);
    expect(result.bonusAmount).toBe(0); expect(result.settings.maxWriteOffPercent).toBe(30);
  });

  it.each([
    null, { expiresAt: new Date(Date.now() - 1) }, { sessionHash: 'other' },
    { currency: 'USD' }, { provider: 'OZON_DELIVERY' }, { deliveryMethod: 'PICKUP_POINT' },
    { destinationHash: 'other' }, { amount: '-1.00' },
  ])('rejects stale or mismatched shipping %p', async (overrides) => {
    db.shippingQuote.findUnique.mockResolvedValue(overrides === null ? null : shipping(dto(), overrides));
    await expect(service.quote(session, { ...dto(), shippingQuoteId: 'quote' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('accepts a confirmed zero delivery price without conflating it with missing quote', async () => {
    db.shippingQuote.findUnique.mockResolvedValue(shipping(dto(), { amount: '0.00' }));
    expect((await service.quote(session, { ...dto(), shippingQuoteId: 'quote' })).publicQuote).toMatchObject({ deliveryConfirmed: true, shippingAmount: 0, canPay: true });
  });
  it.each(['quantity', 'variant', 'added', 'removed', 'weight', 'missingWeight', 'fractionalWeight'])('rejects changed shipping basket: %s', async (change) => {
    const saved = shipping();
    db.shippingQuote.findUnique.mockResolvedValue(saved);
    if (change === 'quantity') cart.items[0].quantity = 3;
    if (change === 'variant') cart.items[0].variantId = 'different-variant';
    if (change === 'added') cart.items.push({ ...cart.items[0], variantId: 'additional-variant' });
    if (change === 'removed') {
      saved.requestSnapshot.cartItems.push({ variantId: 'removed-variant', quantity: 1 });
      saved.requestSnapshot.weightGrams += 200;
    }
    if (change === 'weight') cart.items[0].variant.options.weightGrams = 201;
    if (change === 'missingWeight') cart.items[0].variant.options = {};
    if (change === 'fractionalWeight') cart.items[0].variant.options.weightGrams = 200.5;
    await expect(service.quote(session, { ...dto(), shippingQuoteId: 'quote' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([null, {}, { weightGrams: 400 }, { weightGrams: 400, cartItems: [null] }, { weightGrams: 400, cartItems: [{ variantId: 'variant', quantity: '2' }] }])('rejects missing or malformed shipping snapshot %p', async (snapshot) => {
    db.shippingQuote.findUnique.mockResolvedValue(shipping(dto(), { requestSnapshot: snapshot }));
    await expect(service.quote(session, { ...dto(), shippingQuoteId: 'quote' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('compares basket pairs independently of their stored order without mutating the snapshot', async () => {
    cart.items.unshift({ ...cart.items[0], variantId: 'a-variant', quantity: 1 });
    const saved = shipping();
    saved.requestSnapshot.cartItems.reverse();
    const original = JSON.stringify(saved.requestSnapshot);
    db.shippingQuote.findUnique.mockResolvedValue(saved);
    expect((await service.quote(session, { ...dto(), shippingQuoteId: 'quote' })).deliveryConfirmed).toBe(true);
    expect(JSON.stringify(saved.requestSnapshot)).toBe(original);
  });
  it('prevents destination payload from overriding provider and method', async () => {
    const input = { ...dto(), shippingQuoteId: 'quote', shippingProvider: 'OZON_DELIVERY', shippingAddress: { ...dto().shippingAddress, provider: 'CDEK', deliveryMethod: 'COURIER' } };
    await expect(service.quote(session, input)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not offer a payment session for a zero-value order', async () => {
    db.promoCode.findUnique.mockResolvedValue(promo({ discountType: 'FIXED', amount: '9999.00' }));
    db.shippingQuote.findUnique.mockResolvedValue(shipping(dto(), { amount: '0.00' }));
    const result = await service.quote(session, { ...dto(), promoCode: 'TEST', shippingQuoteId: 'quote' });
    expect(result.publicQuote.total).toBe(0); expect(result.publicQuote.canPay).toBe(false);
  });
  it('uses the supplied transaction for every database read', async () => {
    owned();
    const tx: any = Object.fromEntries(Object.entries(db).map(([key, model]: [string, any]) => [key, Object.fromEntries(Object.entries(model).map(([method, mock]: [string, any]) => [method, jest.fn(mock.getMockImplementation())]))]));
    tx.loyaltyAccount.findUnique.mockResolvedValue({ balance: 5 });
    tx.loyaltyProgramSetting.findUnique.mockResolvedValue(null);
    tx.promoCode.findUnique.mockResolvedValue(promo());
    tx.promoRedemption.count.mockResolvedValue(0);
    tx.shippingQuote.findUnique.mockResolvedValue(shipping());
    await service.quote(session, { ...dto(), promoCode: 'TEST', useBonuses: true, shippingQuoteId: 'quote' }, actor, tx as any);
    for (const model of Object.values(db) as any[]) for (const mock of Object.values(model) as any[]) expect(mock).not.toHaveBeenCalled();
    expect(tx.cart.findUnique).toHaveBeenCalled(); expect(tx.promoRedemption.count).toHaveBeenCalledTimes(2);
  });

  const giftCode = '01234567-89ABCDEF-01234567-89ABCDEF';
  function giftCart() {
    const item = cart.items[0];
    item.quantity = 1;
    item.variant.price = '1250.00'; item.variant.stock = 0; item.variant.reserved = 0;
    item.variant.options = { nominal: 1250, validityDays: 365 };
    item.variant.product.productType = 'GIFT_CARD';
  }
  it('prices a digital gift cart without physical stock, delivery, bonus write-off or earnings', async () => {
    owned(); giftCart();
    const result = await service.quote(session, { ...dto(), shippingQuoteId: 'stale-physical-quote' }, actor);
    expect(result).toMatchObject({ digitalDelivery: true, subtotalMinor: 125000, shippingMinor: 0, finalMinor: 125000, deliveryConfirmed: true, giftCardMinor: 0 });
    expect(result.publicQuote).toMatchObject({ digitalDelivery: true, shippingAmount: 0, giftCardAmount: 0, total: 1250, deliveryConfirmed: true, canPay: true, maxBonusAmount: 0, earnEstimate: 0 });
    expect(result.publicQuote.messages[0]).toContain('email');
    expect(db.loyaltyAccount.findUnique).not.toHaveBeenCalled();
    expect(db.shippingQuote.findUnique).not.toHaveBeenCalled(); expect(db.giftCard.findUnique).not.toHaveBeenCalled();
  });
  it('rejects mixed gift and physical items with a separate-orders message', async () => {
    const physical = structuredClone(cart.items[0]); giftCart();
    cart.items.push({ ...physical, variantId: 'physical' });
    await expect(service.quote(session, dto())).rejects.toThrow('отдельными заказами');
  });
  it.each([{ promoCode: 'TEST' }, { useBonuses: true }, { giftCardCode: giftCode }])('prohibits financing a gift purchase with %p', async (input) => {
    giftCart();
    await expect(service.quote(session, { ...dto(), ...input })).rejects.toThrow('нельзя покупать');
    expect(db.promoCode.findUnique).not.toHaveBeenCalled(); expect(db.giftCard.findUnique).not.toHaveBeenCalled();
  });
  it.each(['zeroPrice', 'wrongPrice', 'fractionalNominal', 'zeroNominal', 'stringNominal', 'missingDays', 'zeroDays', 'tooManyDays', 'fractionalDays'])('rejects malformed gift options %s', async (invalid) => {
    giftCart(); const variant = cart.items[0].variant;
    if (invalid === 'zeroPrice') variant.price = '0.00';
    if (invalid === 'wrongPrice') variant.price = '1249.99';
    if (invalid === 'fractionalNominal') variant.options.nominal = 1250.5;
    if (invalid === 'zeroNominal') variant.options.nominal = 0;
    if (invalid === 'stringNominal') variant.options.nominal = '1250';
    if (invalid === 'missingDays') delete variant.options.validityDays;
    if (invalid === 'zeroDays') variant.options.validityDays = 0;
    if (invalid === 'tooManyDays') variant.options.validityDays = 3651;
    if (invalid === 'fractionalDays') variant.options.validityDays = 365.5;
    await expect(service.quote(session, dto())).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([1, 3650])('accepts configured gift validity boundary %s', async (days) => {
    giftCart(); cart.items[0].variant.options.validityDays = days;
    expect((await service.quote(session, dto())).publicQuote.canPay).toBe(true);
  });
  it('applies available gift balance after promo, bonuses and delivery, leaving only cash due', async () => {
    owned();
    const result = await service.quote(session, { ...dto(), shippingQuoteId: 'quote', promoCode: 'TEST', useBonuses: true, giftCardCode: giftCode.toLowerCase() }, actor);
    expect(result).toMatchObject({ promoDiscountMinor: 15605, bonusAmount: 421, shippingMinor: 25050, giftCardMinor: 123395, giftCardId: 'gift-card', finalMinor: 0 });
    expect(result.publicQuote).toMatchObject({ digitalDelivery: false, giftCardAmount: 1233.95, total: 0, canPay: true, earnEstimate: 0 });
    expect(result.publicQuote.messages.join(' ')).not.toContain('менеджером');
    expect(db.giftCard.findUnique).toHaveBeenCalledWith({ where: { codeHash: giftCodeHash(giftCode) },
      select: { id: true, balance: true, reserved: true, expiresAt: true, isActive: true, currency: true } });
    expect(result.publicQuote).not.toHaveProperty('giftCardId'); expect(result.publicQuote).not.toHaveProperty('giftCardCode');
  });
  it('subtracts reserved gift funds and keeps a partial cash payment', async () => {
    const result = await service.quote(session, { ...dto(), shippingQuoteId: 'quote', giftCardCode: giftCode });
    expect(result.giftCardMinor).toBe(125000); expect(result.finalMinor).toBe(56100);
    expect(result.publicQuote).toMatchObject({ giftCardAmount: 1250, total: 561, canPay: true });
  });
  it('earns bonuses only on cash after gift deduction minus shipping', async () => {
    owned();
    const result = await service.quote(session, { ...dto(), shippingQuoteId: 'quote', giftCardCode: giftCode }, actor);
    expect(result.publicQuote).toMatchObject({ total: 561, shippingAmount: 250.5, giftCardAmount: 1250, earnEstimate: 3 });
  });
  it('does not earn negative or gift-funded bonuses when remaining cash is below shipping', async () => {
    owned();
    db.giftCard.findUnique.mockResolvedValue({ id: 'gift-card', currency: 'RUB', balance: '1700.00', reserved: 0, expiresAt: new Date(Date.now() + 60000), isActive: true });
    const result = await service.quote(session, { ...dto(), shippingQuoteId: 'quote', giftCardCode: giftCode }, actor);
    expect(result.publicQuote).toMatchObject({ total: 111, earnEstimate: 0 });
  });
  it.each(['NOT-A-CODE', giftCode.replace('-', ' ')])('rejects invalid gift code with the shared strict normalization: %s', async (code) => {
    await expect(service.quote(session, { ...dto(), giftCardCode: code })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.giftCard.findUnique).not.toHaveBeenCalled();
  });
  it('normalizes copied gift code outer whitespace through the same shared helper used by reserve', async () => {
    const copied = ` ${giftCode.toLowerCase()} `;
    const result = await service.quote(session, { ...dto(), giftCardCode: copied });
    expect(result.giftCardMinor).toBe(125000);
    expect(db.giftCard.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { codeHash: giftCodeHash(copied) } }));
    expect(giftCodeHash(copied)).toBe(giftCodeHash(giftCode));
  });
  it('never permits even fully gift-covered checkout before delivery is confirmed', async () => {
    db.giftCard.findUnique.mockResolvedValue({ id: 'gift-card', currency: 'RUB', balance: '9999.00', reserved: 0, expiresAt: new Date(Date.now() + 60000), isActive: true });
    const result = await service.quote(session, { ...dto(), giftCardCode: giftCode });
    expect(result.publicQuote).toMatchObject({ giftCardAmount: 1560.5, total: 0, deliveryConfirmed: false, canPay: false });
    expect(result.publicQuote.messages.join(' ')).toContain('Стоимость доставки пока не рассчитана');
  });
  it.each([null, { isActive: false }, { expiresAt: new Date(0) }, { balance: 0 }, { reserved: '1500.00' }, { reserved: '2000.00' }])('rejects unavailable gift card %p', async (override) => {
    db.giftCard.findUnique.mockResolvedValue(override === null ? null : { id: 'gift-card', currency: 'RUB', balance: '1500.00', reserved: '250.00', expiresAt: new Date(Date.now() + 60000), isActive: true, ...override });
    await expect(service.quote(session, { ...dto(), giftCardCode: giftCode })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('uses the transaction client for gift lookups and does not mutate the certificate', async () => {
    const card = Object.freeze({ id: 'gift-card', currency: 'RUB', balance: '500.00', reserved: '0.00', expiresAt: new Date(Date.now() + 60000), isActive: true });
    const tx: any = { ...db, giftCard: { findUnique: jest.fn().mockResolvedValue(card) } };
    expect((await service.quote(session, { ...dto(), giftCardCode: giftCode }, undefined, tx)).giftCardMinor).toBe(50000);
    expect(db.giftCard.findUnique).not.toHaveBeenCalled(); expect(card.balance).toBe('500.00'); expect(card.reserved).toBe('0.00');
  });
});
