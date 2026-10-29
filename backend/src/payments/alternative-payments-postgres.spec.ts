import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AlternativePaymentsService } from './alternative-payments.service';

// Only explicit dedicated test databases; never use DATABASE_URL.
const dbUrl = process.env.PAYMENT_TEST_DATABASE_URL || process.env.WAREHOUSE_TEST_DATABASE_URL;
if (dbUrl) {
  const value = new URL(dbUrl);
  const allowed = (value.port === '56433' && value.pathname === '/payment_fixture') || (value.port === '55432' && value.pathname === '/warehouse_test');
  if (!['127.0.0.1', 'localhost'].includes(value.hostname) || !allowed) throw new Error('Payment integration tests require a dedicated loopback test database');
}
const run = dbUrl ? describe : describe.skip;

run('alternative payment concurrency on isolated PostgreSQL', () => {
  let db: PrismaClient, service: AlternativePaymentsService, orderId: string;
  const orderIds: string[] = [];
  const cap = (provider: string) => ({ provider, available: true, environment: 'PRODUCTION' });
  const createMock = jest.fn(async (r: any) => ({ id: String(r.invoiceId || '991'), status: 'pending', paid: false, test: false, amount: { value: r.amount, currency: r.currency }, metadata: { order_id: r.orderId, order_number: r.orderNumber, payment_id: r.localPaymentId }, confirmation: { type: 'redirect', confirmation_url: 'https://fixture.invalid/pay' } }));
  const provider = (name: string) => ({ capabilities: async () => cap(name), assertAvailable: async () => {}, validateReturnUrl: () => 'https://site.example/orders/test', createPayment: createMock });
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: dbUrl } } }); await db.$connect();
    const number = `SB-PAYMENT-${randomUUID()}`;
    const order = await db.order.create({ data: { orderNumber: number, totalAmount: '1250.00', finalAmount: '1250.00', shippingAddress: {}, reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + 3600000), priceSnapshot: { deliveryConfirmed: true } } });
    orderId = order.id; orderIds.push(orderId);
    const orders = { getAccessible: () => db.order.findUniqueOrThrow({ where: { id: orderId } }), settleVerifiedPayment: async () => ({}) };
    service = new AlternativePaymentsService(db as any, orders as any, { get: () => 'false' } as any, { capabilities: async () => cap('YOOKASSA') } as any, provider('TBANK') as any, provider('ROBOKASSA') as any);
  });
  afterAll(async () => { if (db) { if (orderIds.length) { await db.payment.deleteMany({ where: { orderId: { in: orderIds } } }); await db.order.deleteMany({ where: { id: { in: orderIds } } }); } await db.$disconnect(); } });
  it('concurrent retries use one Robokassa invoice and block a different provider', async () => {
    const values = await Promise.all(Array.from({ length: 8 }, () => service.create('robokassa', 'SB-TEST', {})));
    expect(new Set(values.map(value => value.paymentId)).size).toBe(1);
    expect(await db.payment.count({ where: { orderId } })).toBe(1);
    const saved = await db.payment.findFirstOrThrow({ where: { orderId } });
    expect(saved.invoiceId).toBeGreaterThan(0); expect(saved.transactionId).toBe(`ROBOKASSA:${saved.invoiceId}`);
    await expect(service.create('tbank', 'SB-TEST', {})).rejects.toThrow(/активная попытка/);
  });
  it('separate processes cannot both initiate an uncertain T-Bank payment', async () => {
    const order = await db.order.create({ data: { orderNumber: `SB-TB-${randomUUID()}`, totalAmount: '900.00', finalAmount: '900.00', shippingAddress: {}, reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + 3600000), priceSnapshot: { deliveryConfirmed: true } } });
    orderIds.push(order.id);
    let unblock!: () => void, started!: () => void; const start = new Promise<void>(resolve => { started = resolve; }), hold = new Promise<void>(resolve => { unblock = resolve; });
    let calls = 0;
    const bank = { ...provider('TBANK'), createPayment: async (request: any) => { calls++; started(); await hold; return { id: '991', status: 'pending', paid: false, test: false, amount: { value: request.amount, currency: 'RUB' }, metadata: { order_id: request.orderId, order_number: request.orderNumber, payment_id: request.localPaymentId }, confirmation: { type: 'redirect', confirmation_url: 'https://fixture.invalid/pay' } }; } };
    const orders = { getAccessible: () => db.order.findUniqueOrThrow({ where: { id: order.id } }), settleVerifiedPayment: async () => ({}) };
    const make = () => new AlternativePaymentsService(db as any, orders as any, { get: () => 'false' } as any, { capabilities: async () => cap('YOOKASSA') } as any, bank as any, provider('ROBOKASSA') as any);
    const first = make().create('tbank', order.orderNumber, {});
    await start;
    await expect(make().create('tbank', order.orderNumber, {})).rejects.toThrow(/неизвестен|выполняется/);
    unblock(); await first;
    expect(calls).toBe(1); expect(await db.payment.count({ where: { orderId: order.id } })).toBe(1);
  });
});
