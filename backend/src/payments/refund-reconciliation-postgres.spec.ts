import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { recordVerifiedRefund } from './refund-reconciliation';

const url = process.env.LMS_TEST_DATABASE_URL;
if (url) {
  const value = new URL(url);
  if (!['127.0.0.1', 'localhost'].includes(value.hostname) || !['55435','56432'].includes(value.port) || value.pathname !== '/lms_fixture') throw new Error('Refund test requires the dedicated LMS fixture database');
}
const run = url ? describe : describe.skip;
run('refund reconciliation on isolated PostgreSQL', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined as unknown as PrismaClient;
  let user: any, course: any, tariff: any, order: any, payment: any, purchase: any, enrollment: any;
  beforeAll(async () => {
    await db.$connect();
    const nonce = randomUUID(), expiry = new Date(Date.now() + 86_400_000);
    user = await db.user.create({ data: { email: `refund-${nonce}@example.invalid`, password: 'fixture', role: 'CUSTOMER_B2C' } });
    course = await db.course.create({ data: { titleRu: 'Тестовый курс', price: 1200 } });
    tariff = await db.courseTariff.create({ data: { courseId: course.id, title: 'Тест', price: 1200 } });
    order = await db.order.create({ data: { orderNumber: `SB-R-${nonce}`, userId: user.id, source: 'WEB', sourceChannel: 'COURSE', status: 'DELIVERED', paymentStatus: 'SUCCEEDED', finalAmount: 1200, totalAmount: 1200, shippingAddress: {}, reservationState: 'CONSUMED' } });
    payment = await db.payment.create({ data: { orderId: order.id, transactionId: `refund-${nonce}`, provider: 'YOOKASSA', status: 'SUCCEEDED', amount: 1200, currency: 'RUB' } });
    purchase = await db.coursePurchase.create({ data: { userId: user.id, courseId: course.id, tariffId: tariff.id, orderId: order.id, requestKeyHash: nonce, requestHash: nonce, courseTitle: 'Тестовый курс', tariffTitle: 'Тест', amount: 1200, currency: 'RUB', status: 'PAID', paidAt: new Date(), accessExpiresAt: expiry } });
    enrollment = await db.enrollment.create({ data: { userId: user.id, courseId: course.id, accessStatus: 'ACTIVE', accessExpiresAt: expiry } });
  });
  afterAll(async () => {
    if (enrollment) await db.enrollment.deleteMany({ where: { id: enrollment.id } });
    if (purchase) await db.coursePurchase.deleteMany({ where: { id: purchase.id } });
    if (payment) await db.payment.deleteMany({ where: { id: payment.id } });
    if (order) await db.order.deleteMany({ where: { id: order.id } });
    if (tariff) await db.courseTariff.deleteMany({ where: { id: tariff.id } });
    if (course) await db.course.deleteMany({ where: { id: course.id } });
    if (user) await db.user.deleteMany({ where: { id: user.id } });
    await db.$disconnect();
  });
  it('serializes duplicate completed notifications and revokes access exactly once', async () => {
    const input = { paymentId: payment.id, provider: 'YOOKASSA' as const, externalId: payment.transactionId, state: 'FULL' as const, refundedAmount: '1200.00' };
    const results = await Promise.all(Array.from({ length: 8 }, () => recordVerifiedRefund(db as any, input)));
    expect(results.filter(row => !row.duplicate)).toHaveLength(1);
    expect(await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).toMatchObject({ accessStatus: 'REFUNDED' });
    expect(await db.coursePurchase.findUniqueOrThrow({ where: { id: purchase.id } })).toMatchObject({ status: 'REFUNDED', accountingStatus: 'NEEDS_REVIEW' });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { history: true } });
    expect(saved).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' }); expect(saved.history).toHaveLength(1);
  });
});
