import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { GiftCardsService } from './gift-cards.service';
import { giftCodeHash, giftMoney, giftMoneyMinor, maskGiftCode } from './gift-cards.helpers';

const CODE = '01234567-89ABCDEF-01234567-89ABCDEF';
const KEY = 'test-only-persistent-gift-encryption-key-2026';
function fixture(key: string | undefined = KEY) {
  const config = { get: jest.fn((name: string) => name === 'INTEGRATION_ENCRYPTION_KEY' ? key : undefined) } as unknown as ConfigService;
  const secrets = new IntegrationSecretsService(config);
  const cards: any[] = [{ id: 'card-1', codeHash: giftCodeHash(CODE), encryptedCode: secrets.encrypt({ code: CODE }), maskedCode: maskGiftCode(CODE),
    faceValue: '1000.00', balance: '1000.00', reserved: '0.00', currency: 'RUB', validityDays: 365,
    issuedAt: new Date('2026-01-01T00:00:00Z'), expiresAt: new Date('2099-01-01T00:00:00Z'), isActive: true, revision: 1,
    sourceOrderId: null, sourceItemId: null, ordinal: null, purchaserUserId: 'private-user', label: null, reason: 'Выпуск', createdAt: new Date() }];
  let redemption: any = null;
  let product: any = null;
  const variants: any[] = [], images: any[] = [];
  const order: any = { id: 'order-1', paymentStatus: 'SUCCEEDED', currency: 'RUB', source: 'WEB', userId: 'buyer', priceSnapshot: { digitalDelivery: true },
    discountAmount: '0.00', bonusAmount: 0, giftCardAmount: '0.00', shippingCost: '0.00', promoCode: null, finalAmount: '1000.00', totalAmount: '1000.00',
    payments: [{ orderId: 'order-1', provider: 'YOOKASSA', status: 'SUCCEEDED', transactionId: 'verified-test-payment', amount: '1000.00', currency: 'RUB' }],
    items: [{ id: 'item-1', productType: 'GIFT_CARD', giftCardValidityDays: 90, price: '500.00', total: '1000.00', quantity: 2 }] };
  const productCopy = () => product && { ...product, variants: [...variants], images: [...images] };
  const tx: any = {
    $queryRaw: jest.fn(async () => [{ id: 'locked' }]),
    order: { findUnique: jest.fn(async () => order) },
    giftCard: {
      findUnique: jest.fn(async ({ where }: any) => {
        const found = cards.find(c => where.id ? c.id === where.id : where.codeHash ? c.codeHash === where.codeHash
          : c.sourceItemId === where.sourceItemId_ordinal.sourceItemId && c.ordinal === where.sourceItemId_ordinal.ordinal);
        return found ? { ...found } : null;
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => ({ ...cards.find(c => c.id === where.id) })),
      findMany: jest.fn(async ({ where }: any) => cards.filter(c => !where.sourceOrderId || c.sourceOrderId === where.sourceOrderId).map(c => ({ ...c }))),
      count: jest.fn(async () => cards.length),
      create: jest.fn(async ({ data }: any) => {
        if (cards.some(c => c.codeHash === data.codeHash)) throw Object.assign(new Error('conflict'), { code: 'P2002' });
        const card = { id: `card-${cards.length + 1}`, revision: 1, createdAt: new Date(), ...data };
        cards.push(card); return { ...card };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const card = cards.find(c => c.id === where.id);
        for (const field of ['balance', 'reserved']) if (data[field]) card[field] = giftMoney(giftMoneyMinor(card[field]) + (data[field].increment ? 1 : -1) * giftMoneyMinor(data[field].increment || data[field].decrement));
        if (data.revision) card.revision++; return { ...card };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const card = cards.find(c => c.id === where.id && c.revision === where.revision);
        if (!card) return { count: 0 };
        const { revision, ...patch } = data; Object.assign(card, patch); card.revision++; return { count: 1 };
      }),
    },
    giftCardRedemption: {
      findUnique: jest.fn(async () => redemption && { ...redemption }),
      create: jest.fn(async ({ data }: any) => { redemption = { id: 'redemption-1', ...data }; return { ...redemption }; }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (!redemption || redemption.id !== where.id || redemption.status !== where.status) return { count: 0 };
        Object.assign(redemption, data); return { count: 1 };
      }),
    },
    auditLog: { create: jest.fn(async ({ data }: any) => data) },
    product: {
      findUnique: jest.fn(async () => productCopy()), findUniqueOrThrow: jest.fn(async () => productCopy()),
      create: jest.fn(async ({ data }: any) => { product = { id: 'product-1', ...data }; return productCopy(); }),
      update: jest.fn(async ({ data }: any) => { Object.assign(product, data); return productCopy(); }),
    },
    productVariant: {
      create: jest.fn(async ({ data }: any) => { const variant = { id: `variant-${variants.length + 1}`, ...data }; variants.push(variant); return variant; }),
      update: jest.fn(async ({ where, data }: any) => { const variant = variants.find(v => v.id === where.id); Object.assign(variant, data); return variant; }),
      updateMany: jest.fn(async ({ where, data }: any) => { variants.filter(v => !where.id.notIn.includes(v.id)).forEach(v => Object.assign(v, data)); return { count: 1 }; }),
    },
    productImage: {
      findFirst: jest.fn(async () => images[0] || null),
      create: jest.fn(async ({ data }: any) => { const image = { id: 'image-1', ...data }; images.push(image); return image; }),
      update: jest.fn(async ({ data }: any) => Object.assign(images[0], data)),
      delete: jest.fn(async () => images.shift()),
    },
  };
  const prisma = { ...tx, $transaction: jest.fn(async (fn: any) => fn(tx)) };
  const service = new GiftCardsService(prisma as any, secrets, config);
  return { service, prisma, tx, secrets, cards, order, variants, images, config, setProduct: (value: any) => { product = value; } };
}

describe('GiftCardsService lifecycle and locking', () => {
  it('preview is read-only and excludes reserved funds', async () => {
    const f = fixture(); f.cards[0].reserved = '300.00';
    expect(await f.service.preview(CODE)).toMatchObject({ cardId: 'card-1', availableMinor: 70000 });
    expect(f.tx.$queryRaw).not.toHaveBeenCalled(); expect(f.tx.giftCard.update).not.toHaveBeenCalled();
  });
  it.each(['inactive', 'expired', 'future', 'missing'])('rejects %s card preview', async state => {
    const f = fixture();
    if (state === 'inactive') f.cards[0].isActive = false;
    if (state === 'expired') f.cards[0].expiresAt = new Date(0);
    if (state === 'future') f.cards[0].issuedAt = new Date('2098-01-01');
    await expect(f.service.preview(state === 'missing' ? 'F'.repeat(32) : CODE)).rejects.toThrow();
  });
  it('reserves and applies exactly once, locking Order before GiftCard', async () => {
    const f = fixture();
    expect(await f.service.reserve(f.tx, 'order-1', CODE, 25000)).toEqual({ cardId: 'card-1', amountMinor: 25000, status: 'RESERVED' });
    expect(f.cards[0].reserved).toBe('250.00');
    await f.service.reserve(f.tx, 'order-1', CODE, 25000);
    expect(f.tx.giftCardRedemption.create).toHaveBeenCalledTimes(1);
    await f.service.apply(f.tx, 'order-1'); await f.service.apply(f.tx, 'order-1');
    expect(f.cards[0].balance).toBe('750.00'); expect(f.cards[0].reserved).toBe('0.00');
    expect(f.tx.giftCardRedemption.updateMany).toHaveBeenCalledTimes(1);
    const sql = f.tx.$queryRaw.mock.calls.map((call: any) => call[0].join('?'));
    expect(sql[0]).toContain('"Order"'); expect(sql[1]).toContain('"GiftCard"');
    await expect(f.service.release(f.tx, 'order-1')).rejects.toThrow();
  });
  it('release is idempotent and does not spend balance or permit reuse of released order', async () => {
    const f = fixture(); await f.service.reserve(f.tx, 'order-1', CODE, 25000);
    await f.service.release(f.tx, 'order-1'); await f.service.release(f.tx, 'order-1');
    expect(f.cards[0].balance).toBe('1000.00'); expect(f.cards[0].reserved).toBe('0.00');
    await expect(f.service.apply(f.tx, 'order-1')).rejects.toThrow();
    await expect(f.service.reserve(f.tx, 'order-1', CODE, 25000)).rejects.toThrow();
  });
  it('rechecks current available after acquiring card lock, preventing stale-read overspend', async () => {
    const f = fixture();
    f.tx.$queryRaw.mockImplementation(async (parts: any) => { if (parts.join('').includes('"GiftCard"')) f.cards[0].reserved = '900.00'; return [{ id: 'locked' }]; });
    await expect(f.service.reserve(f.tx, 'order-1', CODE, 20000)).rejects.toThrow('Недостаточно');
    expect(f.tx.giftCard.update).not.toHaveBeenCalled(); expect(f.tx.giftCardRedemption.create).not.toHaveBeenCalled();
  });
  it('rejects a changed reservation amount without further writes', async () => {
    const f = fixture(); await f.service.reserve(f.tx, 'order-1', CODE, 10000);
    await expect(f.service.reserve(f.tx, 'order-1', CODE, 20000)).rejects.toThrow();
    expect(f.tx.giftCard.update).toHaveBeenCalledTimes(1);
  });
  it('status CAS failure never decrements balance', async () => {
    const f = fixture(); await f.service.reserve(f.tx, 'order-1', CODE, 10000);
    f.tx.giftCard.update.mockClear(); f.tx.giftCardRedemption.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.apply(f.tx, 'order-1')).rejects.toThrow();
    expect(f.tx.giftCard.update).not.toHaveBeenCalled();
  });
  it('allows trusted settlement/release of an existing reservation after expiry', async () => {
    const f = fixture(); await f.service.reserve(f.tx, 'order-1', CODE, 10000);
    f.cards[0].expiresAt = new Date(0); f.cards[0].isActive = false;
    expect(await f.service.apply(f.tx, 'order-1')).toMatchObject({ status: 'APPLIED' });
  });
  it('missing redemption is harmless and missing order is rejected', async () => {
    const f = fixture(); expect(await f.service.apply(f.tx, 'order-1')).toBeNull();
    f.tx.$queryRaw.mockResolvedValue([]);
    await expect(f.service.reserve(f.tx, 'unknown', CODE, 100)).rejects.toThrow('Заказ не найден');
  });
  it('rejects noninteger minor amounts before any DB reads', async () => {
    const f = fixture(); await expect(f.service.reserve(f.tx, 'order-1', CODE, 0.5)).rejects.toThrow();
    expect(f.tx.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('GiftCardsService secure issuance and reveal', () => {
  it('issues encrypted paid snapshots by quantity and repeats without duplicates', async () => {
    const f = fixture();
    const result = await f.service.issueForPaidOrder(f.tx, f.order);
    expect(result).toHaveLength(2); expect(result[0].faceValue).toBe('500.00');
    expect(f.cards[1].expiresAt.getTime() - f.cards[1].issuedAt.getTime()).toBe(90 * 86_400_000);
    expect(f.cards[1].ordinal).toBe(1); expect(f.cards[2].ordinal).toBe(2);
    await f.service.issueForPaidOrder(f.tx, f.order);
    expect(f.tx.giftCard.create).toHaveBeenCalledTimes(2);
    expect(result[0]).not.toHaveProperty('encryptedCode'); expect(result[0]).not.toHaveProperty('code');
    expect(f.secrets.decrypt(f.cards[1].encryptedCode).code).toMatch(/^[0-9A-F-]{35}$/);
  });
  it('ignores caller-mutated prices and live variant options', async () => {
    const f = fixture(); const caller = { ...f.order, items: [{ ...f.order.items[0], price: '999.00', giftCardValidityDays: 3650, variant: { options: { nominal: 999 } } }] };
    expect((await f.service.issueForPaidOrder(f.tx, caller))[0].faceValue).toBe('500.00');
  });
  it.each(['unpaid', 'quantity', 'ttl', 'total', 'fractional', 'overcap'])('rejects invalid issuance snapshot %s', async issue => {
    const f = fixture();
    if (issue === 'unpaid') f.order.paymentStatus = 'PENDING';
    if (issue === 'quantity') f.order.items[0].quantity = 100;
    if (issue === 'ttl') f.order.items[0].giftCardValidityDays = null;
    if (issue === 'total') f.order.items[0].total = '1.00';
    if (issue === 'fractional') { f.order.items[0].price = '500.01'; f.order.items[0].total = '1000.02'; }
    if (issue === 'overcap') { f.order.items[0].price = '1000001.00'; f.order.items[0].total = '2000002.00'; }
    await expect(f.service.issueForPaidOrder(f.tx, f.order)).rejects.toThrow(); expect(f.tx.giftCard.create).not.toHaveBeenCalled();
  });
  it('requires persisted payment confirmation even if caller says SUCCEEDED', async () => {
    const f = fixture(); const caller = { ...f.order }; f.order.paymentStatus = 'PENDING';
    await expect(f.service.issueForPaidOrder(f.tx, caller)).rejects.toThrow('Оплата');
  });
  it.each(['missing', 'provider', 'status', 'amount', 'currency', 'order', 'transaction', 'source', 'snapshot', 'mixed', 'discount', 'bonus', 'gift', 'shipping', 'final', 'total', 'promo'])('rejects unverified/diluted gift payment evidence %s', async defect => {
    const f = fixture();
    if (defect === 'missing') f.order.payments = [];
    if (defect === 'provider') f.order.payments[0].provider = 'MANUAL';
    if (defect === 'status') f.order.payments[0].status = 'PENDING';
    if (defect === 'amount') f.order.payments[0].amount = '999.00';
    if (defect === 'currency') f.order.payments[0].currency = 'USD';
    if (defect === 'order') f.order.payments[0].orderId = 'other-order';
    if (defect === 'transaction') f.order.payments[0].transactionId = null;
    if (defect === 'source') f.order.source = 'MANUAL';
    if (defect === 'snapshot') f.order.priceSnapshot.digitalDelivery = false;
    if (defect === 'mixed') f.order.items.push({ ...f.order.items[0], id: 'physical', productType: 'PHYSICAL' });
    if (defect === 'discount') f.order.discountAmount = '1.00';
    if (defect === 'bonus') f.order.bonusAmount = 1;
    if (defect === 'gift') f.order.giftCardAmount = '1.00';
    if (defect === 'shipping') f.order.shippingCost = '1.00';
    if (defect === 'final') f.order.finalAmount = '999.00';
    if (defect === 'total') f.order.totalAmount = '999.00';
    if (defect === 'promo') f.order.promoCode = 'TEST';
    await expect(f.service.issueForPaidOrder(f.tx, f.order)).rejects.toThrow();
    expect(f.tx.giftCard.create).not.toHaveBeenCalled();
  });
  it('physical-only order is rejected without issuing any cards', async () => {
    const f = fixture(); f.order.items[0].productType = 'PHYSICAL';
    await expect(f.service.issueForPaidOrder(f.tx, f.order)).rejects.toThrow();
    expect(f.tx.giftCard.create).not.toHaveBeenCalled();
  });
  it('manual issuance returns masked data and stores safe actor audit, not raw code', async () => {
    const f = fixture(); const issued = await f.service.issue({ nominal: 1, code: CODE.replace(/0/g, 'A'), reason: 'Корректировка' }, 'actor');
    expect(issued.faceValue).toBe('1.00'); expect(issued.validityDays).toBe(365); expect(issued).not.toHaveProperty('code');
    const audit = f.tx.auditLog.create.mock.calls[0][0].data;
    expect(audit.actorId).toBe('actor'); expect(JSON.stringify(audit)).not.toContain(CODE.replace(/0/g, 'A'));
    expect(audit.payload).toEqual({ nominal: 1, validityDays: 365 });
  });
  it('rejects duplicate normalized manual code and empty reason', async () => {
    const f = fixture();
    await expect(f.service.issue({ nominal: 1000, code: CODE.toLowerCase(), reason: 'Выпуск' }, 'actor')).rejects.toThrow('уже существует');
    await expect(f.service.issue({ nominal: 1000, reason: ' ' }, 'actor')).rejects.toThrow();
  });
  it('authorized admin reveal audits before returning actual code', async () => {
    const f = fixture(); expect(await f.service.reveal('card-1', 'actor')).toEqual({ id: 'card-1', code: CODE, maskedCode: maskGiftCode(CODE) });
    expect(f.tx.auditLog.create.mock.calls[0][0].data).toMatchObject({ actorId: 'actor', action: 'gift_card.reveal', payload: { revealed: true } });
    f.tx.auditLog.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(f.service.reveal('card-1', 'actor')).rejects.toThrow('audit unavailable');
  });
  it('order reveal is scoped to exact source order and returns two-decimal money', async () => {
    const f = fixture(); await f.service.issueForPaidOrder(f.tx, f.order);
    const shown = await f.service.revealForOrder(f.tx, 'order-1');
    expect(shown).toHaveLength(2); expect(shown[0].faceValue).toBe('500.00'); expect(shown[0]).toHaveProperty('code');
    expect(await f.service.revealForOrder(f.tx, 'other-order')).toHaveLength(0);
  });
  it.each([undefined, 'short', 'a'.repeat(32)])('fails closed with unavailable/weak key %s', async key => {
    // undefined as argument uses JS default, explicitly clear config instead.
    const f = fixture(key); if (key === undefined) (f.config.get as jest.Mock).mockReturnValue(undefined);
    await expect(f.service.issue({ nominal: 1000, reason: 'Выпуск' }, 'actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(f.service.reveal('card-1', 'actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f.tx.giftCard.create).not.toHaveBeenCalled();
  });
  it('does not silently reveal empty code on wrong encryption key or corrupt ciphertext', async () => {
    const f = fixture(); f.cards[0].encryptedCode = 'v1.invalid';
    await expect(f.service.reveal('card-1', 'actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(f.tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('stateless generation has no DB reads/writes', () => {
    const f = fixture(); expect(f.service.generate().code).toMatch(/^[A-F0-9-]{35}$/);
    expect(f.prisma.$transaction).not.toHaveBeenCalled(); expect(f.tx.giftCard.create).not.toHaveBeenCalled();
  });
});

describe('GiftCardsService admin editing and product settings', () => {
  const dto = { nameRu: 'Подарочный сертификат', descriptionRu: 'Описание', denominations: [1000, 3000], validityDays: 365, isActive: true };
  it('default product GET is draft and never creates a real product', async () => {
    const f = fixture(); expect(await f.service.getProduct()).toMatchObject({ id: null, isActive: false, validityDays: 365 });
    expect(f.tx.product.create).not.toHaveBeenCalled(); expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('saves one digital product with denomination snapshots; removing variant only deactivates it', async () => {
    const f = fixture(); const first = await f.service.saveProduct(dto, 'actor');
    expect(first.denominations).toEqual([1000, 3000]); expect(f.variants[0].options).toEqual({ giftCard: true, nominal: 1000, validityDays: 365 });
    const oldId = f.variants[0].id;
    await f.service.saveProduct({ ...dto, denominations: [3000, 5000], validityDays: 90 }, 'actor');
    expect(f.tx.product.create).toHaveBeenCalledTimes(1); expect(f.variants.find(v => v.id === oldId).isActive).toBe(false);
    expect(f.variants[1].options.validityDays).toBe(90); expect(f.variants[0].options.validityDays).toBe(365);
    expect(f.variants).toHaveLength(3); expect(f.variants[0].stock).toBe(0);
  });
  it('does not overwrite physical product at reserved slug', async () => {
    const f = fixture(); f.setProduct({ id: 'existing', productType: 'PHYSICAL' });
    await expect(f.service.saveProduct(dto, 'actor')).rejects.toThrow('занят'); expect(f.tx.product.update).not.toHaveBeenCalled();
  });
  it('preserves omitted image and accepts explicit clear', async () => {
    const f = fixture(); await f.service.saveProduct({ ...dto, imageUrl: '/uploads/gift.png' }, 'actor');
    await f.service.saveProduct(dto, 'actor'); expect(f.images).toHaveLength(1);
    await f.service.saveProduct({ ...dto, imageUrl: null }, 'actor'); expect(f.images).toHaveLength(0);
    await expect(f.service.saveProduct({ ...dto, imageUrl: 'javascript:alert(1)' }, 'actor')).rejects.toThrow();
  });
  it('optimistic admin revision rejects stale edits and never updates faceValue/balance', async () => {
    const f = fixture(); const updated = await f.service.update('card-1', { revision: 1, label: 'Тест', isActive: false }, 'actor');
    expect(updated.revision).toBe(2); expect(updated.isActive).toBe(false);
    await expect(f.service.update('card-1', { revision: 1, label: 'Потерянное' }, 'actor')).rejects.toThrow('уже изменён');
    const data = f.tx.giftCard.updateMany.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('balance'); expect(data).not.toHaveProperty('faceValue'); expect(f.cards[0].label).toBe('Тест');
  });
  it('revision CAS race failure returns conflict and emits no successful audit', async () => {
    const f = fixture(); f.tx.giftCard.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.service.update('card-1', { revision: 1, isActive: false }, 'actor')).rejects.toThrow();
    expect(f.tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('expired card can be deactivated but cannot be re-enabled without extending expiry', async () => {
    const f = fixture(); f.cards[0].expiresAt = new Date('2026-02-01');
    await f.service.update('card-1', { revision: 1, isActive: false }, 'actor');
    await expect(f.service.update('card-1', { revision: 2, isActive: true }, 'actor')).rejects.toThrow('истёкшим');
  });
  it('list is masked and search touches only label/maskedCode, no customer PII', async () => {
    const f = fixture(); const response = await f.service.list({ page: 1, limit: 10, search: 'CDEF', status: 'active' });
    expect(response.items[0]).not.toHaveProperty('codeHash'); expect(response.items[0]).not.toHaveProperty('encryptedCode'); expect(response.items[0]).not.toHaveProperty('purchaserUserId');
    expect(f.tx.giftCard.findMany.mock.calls[0][0].where.OR).toEqual([{ maskedCode: { contains: 'CDEF', mode: 'insensitive' } }, { label: { contains: 'CDEF', mode: 'insensitive' } }]);
  });
  it('admin detail includes safe financial history without buyer or code secrets', async () => {
    const f = fixture();
    f.cards[0].redemptions = [{ id: 'redemption', orderId: 'order-1', amount: '50.00', status: 'APPLIED', createdAt: new Date(), appliedAt: new Date(), releasedAt: null,
      order: { orderNumber: 'SB-123', buyerEmail: 'private@example.invalid' } }];
    const detail = await f.service.detail('card-1');
    expect(detail.redemptions[0]).toMatchObject({ orderNumber: 'SB-123', amount: '50.00', status: 'APPLIED' });
    expect(detail).not.toHaveProperty('encryptedCode'); expect(detail).not.toHaveProperty('codeHash');
    expect(JSON.stringify(detail)).not.toContain('private@example.invalid');
  });
});
