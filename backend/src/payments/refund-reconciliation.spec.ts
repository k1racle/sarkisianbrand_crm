import { Prisma } from '@prisma/client';
import { recordVerifiedRefund } from './refund-reconciliation';

describe('Сверка подтверждённых возвратов без внешних операций', () => {
  let db: any, tx: any, payment: any, order: any, purchase: any, enrollment: any, latest: any;
  const request = { paymentId: 'local', provider: 'YOOKASSA' as const, externalId: 'external', state: 'FULL' as const, refundedAmount: '1200.00' };
  beforeEach(() => {
    const expiry = new Date('2030-01-01T00:00:00.000Z');
    payment = { id: 'local', orderId: 'order', transactionId: 'external', provider: 'YOOKASSA', status: 'SUCCEEDED', amount: new Prisma.Decimal('1200.00'), currency: 'RUB', metadata: {} };
    order = { id: 'order', userId: 'buyer', sourceChannel: 'COURSE', status: 'DELIVERED', paymentStatus: 'SUCCEEDED', finalAmount: new Prisma.Decimal('1200.00'), currency: 'RUB', history: [] };
    purchase = { id: 'purchase', orderId: 'order', userId: 'buyer', courseId: 'course', status: 'PAID', amount: new Prisma.Decimal('1200.00'), currency: 'RUB', accessExpiresAt: expiry };
    latest = purchase;
    enrollment = { id: 'enrollment', userId: 'buyer', courseId: 'course', accessStatus: 'ACTIVE', accessExpiresAt: expiry };
    tx = { $queryRaw: jest.fn(), payment: { findUnique: jest.fn(async () => ({ orderId: order.id })), findUniqueOrThrow: jest.fn(async () => payment), update: jest.fn(async ({ data }) => Object.assign(payment, data)) },
      order: { findUniqueOrThrow: jest.fn(async () => order), update: jest.fn(async ({ data }) => { if (data.history) order.history.push(data.history.create); Object.assign(order, { ...data, history: order.history }); return order; }) },
      coursePurchase: { findUnique: jest.fn(async () => purchase), findFirst: jest.fn(async () => latest), update: jest.fn(async ({ data }) => Object.assign(purchase, data)) },
      enrollment: { findUnique: jest.fn(async () => enrollment), update: jest.fn(async ({ data }) => Object.assign(enrollment, data)) } };
    let queue = Promise.resolve();
    db = { $transaction: jest.fn(fn => { const result = queue.then(() => fn(tx)); queue = result.then(() => undefined, () => undefined); return result; }) };
  });
  it('один раз закрывает именно текущий доступ при полном возврате', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => recordVerifiedRefund(db, request)));
    expect(results.filter(result => !result.duplicate)).toHaveLength(1);
    expect(order).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
    expect(purchase).toMatchObject({ status: 'REFUNDED', accountingStatus: 'NEEDS_REVIEW' });
    expect(enrollment.accessStatus).toBe('REFUNDED'); expect(order.history).toHaveLength(1);
    expect(payment.status).toBe('SUCCEEDED'); // A repeated success callback cannot grant access again.
  });
  it('не отзывает новое продление при позднем возврате старой покупки', async () => {
    latest = { ...purchase, id: 'newer' };
    await expect(recordVerifiedRefund(db, request)).resolves.toMatchObject({ completed: true, access: 'NEWER_PURCHASE' });
    expect(enrollment.accessStatus).toBe('ACTIVE'); expect(order.paymentStatus).toBe('REFUNDED');
  });
  it('не отзывает доступ с несовпадающим сроком без проверки', async () => {
    enrollment.accessExpiresAt = new Date('2031-01-01T00:00:00.000Z');
    await expect(recordVerifiedRefund(db, request)).resolves.toMatchObject({ access: 'REVIEW' });
    expect(enrollment.accessStatus).toBe('ACTIVE');
  });
  it('фиксирует частичный возврат для ручной сверки, не меняя оплату и доступ', async () => {
    const partial = { ...request, state: 'PARTIAL' as const, refundedAmount: '300.00' };
    await recordVerifiedRefund(db, partial); await recordVerifiedRefund(db, partial);
    expect(order.paymentStatus).toBe('SUCCEEDED'); expect(purchase.status).toBe('PAID');
    expect(enrollment.accessStatus).toBe('ACTIVE'); expect(order.history).toHaveLength(1);
    await expect(recordVerifiedRefund(db, { ...partial, refundedAmount: '200.00' })).rejects.toThrow(/уменьшилась/);
  });
  it('не меняет физический заказ автоматически даже при полном возврате', async () => {
    order.sourceChannel = 'WEB';
    await expect(recordVerifiedRefund(db, request)).resolves.toMatchObject({ completed: false });
    expect(order.paymentStatus).toBe('SUCCEEDED'); expect(tx.coursePurchase.update).not.toHaveBeenCalled();
  });
  it('не изменяет чужой платёж, неподтверждённую оплату или неполную сумму', async () => {
    await expect(recordVerifiedRefund(db, { ...request, externalId: 'other' })).rejects.toThrow();
    payment.status = 'PENDING'; await expect(recordVerifiedRefund(db, request)).rejects.toThrow();
    payment.status = 'SUCCEEDED'; await expect(recordVerifiedRefund(db, { ...request, refundedAmount: '1199.99' })).rejects.toThrow();
    expect(tx.payment.update).not.toHaveBeenCalled(); expect(enrollment.accessStatus).toBe('ACTIVE');
  });
});
