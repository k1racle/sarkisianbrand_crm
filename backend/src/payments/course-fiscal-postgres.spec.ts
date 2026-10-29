import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { LmsPurchaseService } from '../lms/lms-purchase.service';
import { AlternativePaymentsService } from './alternative-payments.service';

const url = process.env.LMS_TEST_DATABASE_URL;
if (url) { const u = new URL(url); if (!['127.0.0.1', 'localhost'].includes(u.hostname) || !['55435','56432'].includes(u.port) || u.pathname !== '/lms_fixture') throw new Error('Course fiscal test requires a dedicated LMS fixture database'); }
const run = url ? describe : describe.skip;
run('course fiscal snapshots on isolated PostgreSQL', () => {
  const db = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined as unknown as PrismaClient;
  const nonce = randomUUID();
  let user: any, course: any, tariff: any, order: any, previous: any, integration: any;
  const fiscal = { courseFiscalMode: 'PROVIDER', courseFiscalConfirmed: 'YES', courseIssuerName: 'Иванова Анна Ивановна', courseIssuerInn: '500100732259', courseTaxation: 'usn_income', courseTax: 'none', coursePaymentMethod: 'full_payment', coursePaymentObject: 'service' };
  beforeAll(async () => {
    await db.$connect();
    previous = await db.ecosystemIntegration.findUnique({ where: { key: 'ROBOKASSA' } });
    integration = previous ? await db.ecosystemIntegration.update({ where: { id: previous.id }, data: { isEnabled: true, environment: 'PRODUCTION', config: { ...fiscal, courseTax: '' } } }) : await db.ecosystemIntegration.create({ data: { key: 'ROBOKASSA', provider: 'ROBOKASSA', name: 'Тест', category: 'PAYMENT', isEnabled: true, environment: 'PRODUCTION', config: { ...fiscal, courseTax: '' } } });
    user = await db.user.create({ data: { email: `fiscal-${nonce}@example.invalid`, password: 'fixture', role: 'CUSTOMER_B2C' } });
    course = await db.course.create({ data: { titleRu: 'Тест фискального курса', price: 1200, status: 'PUBLISHED', isActive: true } });
    tariff = await db.courseTariff.create({ data: { courseId: course.id, title: 'Тест', price: 1200 } });
    const purchase = await new LmsPurchaseService(db as any, { get: () => 'true' } as any).create(user.id, { courseId: course.id, tariffId: tariff.id, expectedPrice: 1200, acceptedTerms: true }, `fixture-fiscal-${nonce}`);
    order = await db.order.findUniqueOrThrow({ where: { orderNumber: purchase.orderNumber } });
  });
  afterAll(async () => {
    if (order) { await db.coursePurchase.deleteMany({ where: { orderId: order.id } }); await db.payment.deleteMany({ where: { orderId: order.id } }); await db.order.deleteMany({ where: { id: order.id } }); }
    if (tariff) await db.courseTariff.deleteMany({ where: { id: tariff.id } });
    if (course) await db.course.deleteMany({ where: { id: course.id } });
    if (user) await db.user.deleteMany({ where: { id: user.id } });
    if (integration) {
      if (previous) await db.ecosystemIntegration.update({ where: { id: previous.id }, data: { isEnabled: previous.isEnabled, environment: previous.environment, config: previous.config ?? {}, status: previous.status, encryptedSecrets: previous.encryptedSecrets, configuredSecretKeys: previous.configuredSecretKeys } });
      else await db.ecosystemIntegration.deleteMany({ where: { id: integration.id } });
    }
    await db.$disconnect();
  });
  it('does not start without fiscal policy, then preserves the first signed form after settings change', async () => {
    const gateway: any = { assertAvailable: jest.fn(async () => {}), capabilities: jest.fn(async () => ({ provider: 'ROBOKASSA', available: false, courseAvailable: true, environment: 'PRODUCTION' })), validateReturnUrl: jest.fn(() => 'https://shop.example/orders/test'), createPayment: jest.fn(async (req: any) => ({ id: String(req.invoiceId), status: 'pending', paid: false, test: false, amount: { value: req.amount, currency: req.currency }, metadata: { order_id: req.orderId, order_number: req.orderNumber, payment_id: req.localPaymentId }, confirmation: { type: 'form', form: { action: 'https://auth.robokassa.ru/Merchant/Index.aspx', method: 'POST', fields: { Receipt: JSON.stringify(req.courseFiscal.receipt), SignatureValue: 'fixture-signature' } } } })) };
    const orders: any = { getAccessible: () => db.order.findUniqueOrThrow({ where: { id: order.id } }), settleVerifiedPayment: async () => ({}) };
    const service = new AlternativePaymentsService(db as any, orders, { get: (key: string) => ['LMS_COURSE_SALES_ENABLED','STOREFRONT_EXTERNAL_CALLS_ENABLED'].includes(key) ? 'true' : 'false' } as any, {} as any, {} as any, gateway);
    await expect(service.create('ROBOKASSA', order.orderNumber, {})).rejects.toThrow(/настройки чека/);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(0);
    await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { config: fiscal } });
    const [first, second] = await Promise.all([service.create('ROBOKASSA', order.orderNumber, {}), service.create('ROBOKASSA', order.orderNumber, {})]);
    expect(first.confirmationForm).toEqual(second.confirmationForm);
    expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);
    const payment = await db.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(payment.metadata).toMatchObject({ courseOrder: true, courseFiscal: { issuerInn: '500100732259', receipt: { name: 'Тест фискального курса', amount: '1200.00', tax: 'none', email: user.email } } });
    const signaturesBeforeChange = gateway.createPayment.mock.calls.length;
    await db.ecosystemIntegration.update({ where: { id: integration.id }, data: { config: { ...fiscal, courseTax: 'vat22' } } });
    const afterChange = await service.create('ROBOKASSA', order.orderNumber, {});
    expect(afterChange.confirmationForm).toEqual(first.confirmationForm);
    expect(gateway.createPayment).toHaveBeenCalledTimes(signaturesBeforeChange);
  });
});
