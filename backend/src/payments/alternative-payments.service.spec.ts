import { AlternativePaymentsService } from './alternative-payments.service';
jest.mock('../orders/orders.service', () => ({ OrdersService: class MockOrdersService {} }));

describe('Alternative payment orchestration without provider/network', () => {
  let svc: AlternativePaymentsService, db: any, order: any, payment: any, orders: any, robo: any, bank: any;
  const caps = (provider: string) => ({ provider, available: true, environment: 'PRODUCTION' });
  const verified = (req: any, id = '123', status = 'pending') => ({ id, status, paid: status === 'succeeded', test: false, amount: { value: req.amount, currency: 'RUB' }, metadata: { order_id: req.orderId, order_number: req.orderNumber, payment_id: req.localPaymentId }, confirmation: { type: 'redirect', confirmation_url: 'https://fixture.invalid/pay' } });
  beforeEach(() => {
    order = { id: 'order-1', orderNumber: 'SB-1', source: 'WEB', status: 'NEW', paymentStatus: 'PENDING', finalAmount: '1250.00', currency: 'RUB', reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + 600000), priceSnapshot: { deliveryConfirmed: true } };
    payment = null;
    orders = { getAccessible: jest.fn(async () => order), settleVerifiedPayment: jest.fn(async () => ({ accepted: true })) };
    const common = () => ({ assertAvailable: jest.fn(async () => {}), validateReturnUrl: jest.fn(() => 'https://site.example/orders/SB-1'), createPayment: jest.fn(async req => verified(req)) });
    robo = { ...common(), capabilities: jest.fn(async () => caps('ROBOKASSA')), verifyNotification: jest.fn(async () => ({ invoiceId: 123, amount: '1250.00', localPaymentId: 'local-1' })) };
    bank = { ...common(), capabilities: jest.fn(async () => caps('TBANK')), verifyNotification: jest.fn(async () => ({ id: '991', orderId: 'local-1' })), getPayment: jest.fn(async (_id, req) => verified(req, '991', 'succeeded')) };
    const tx: any = { $queryRaw: jest.fn(), order: { findUniqueOrThrow: jest.fn(async () => order), update: jest.fn(async ({ data }) => { Object.assign(order, data); }) }, orderFinanceEntry: { count: jest.fn(async () => 0) }, payment: {
      findFirst: jest.fn(async () => payment), create: jest.fn(async ({ data }) => (payment = { id: 'local-1', invoiceId: 123, transactionId: null, ...data, order })),
      findUniqueOrThrow: jest.fn(async () => payment), update: jest.fn(async ({ data }) => (payment = { ...payment, ...data })) } };
    let queue = Promise.resolve();
    db = { $transaction: jest.fn(fn => { const result = queue.then(() => fn(tx)); queue = result.then(() => undefined, () => undefined); return result; }), payment: {
      findUnique: jest.fn(async () => payment), updateMany: jest.fn(async ({ data }) => { if (payment.metadata.initStarted !== false) return { count: 0 }; payment.metadata = data.metadata; return { count: 1 }; }) } };
    svc = new AlternativePaymentsService(db, orders, { get: () => 'false' } as any, { capabilities: async () => caps('YOOKASSA') } as any, bank, robo);
  });
  it('создаёт одну попытку Робокассы и отклоняет другой провайдер для того же заказа', async () => {
    const result = await svc.create('robokassa', 'SB-1', {});
    expect(result).toMatchObject({ provider: 'ROBOKASSA', paymentId: '123', status: 'PENDING' });
    expect(payment.transactionId).toBe('ROBOKASSA:123');
    await expect(svc.create('tbank', 'SB-1', {})).rejects.toThrow(/активная попытка/);
    expect(bank.createPayment).not.toHaveBeenCalled();
  });
  it('сверяет подписанную сумму и не передаёт в заказ посторонний платёж', async () => {
    await svc.create('robokassa', 'SB-1', {}); orders.settleVerifiedPayment.mockClear();
    robo.verifyNotification.mockResolvedValueOnce({ invoiceId: 123, amount: '1.00', localPaymentId: 'local-1' });
    await expect(svc.roboResult({})).rejects.toThrow(/не совпадают/);
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
    robo.verifyNotification.mockResolvedValueOnce({ invoiceId: 123, amount: '1250.00', localPaymentId: 'another-payment' });
    await expect(svc.roboResult({})).rejects.toThrow(/не совпадают/);
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
    expect(await svc.roboResult({})).toBe('OK123');
    expect(orders.settleVerifiedPayment).toHaveBeenCalledWith('ROBOKASSA:123', 'SUCCEEDED', expect.objectContaining({ amount: '1250.00', orderId: 'order-1', paid: true }));
  });
  it('не повторяет неопределённый Init Т-Банка после ошибки сети', async () => {
    bank.createPayment.mockRejectedValueOnce(new Error('network'));
    await expect(svc.create('tbank', 'SB-1', {})).rejects.toThrow('network');
    await expect(svc.create('tbank', 'SB-1', {})).rejects.toThrow(/неизвестен/);
    expect(bank.createPayment).toHaveBeenCalledTimes(1);
  });
  it('при уведомлении Т-Банка перепроверяет статус в банке и связывает прежнюю попытку', async () => {
    bank.createPayment.mockRejectedValueOnce(new Error('network'));
    await expect(svc.create('tbank', 'SB-1', {})).rejects.toThrow();
    expect(await svc.tbankResult({})).toBe('OK');
    expect(bank.getPayment).toHaveBeenCalledWith('991', expect.objectContaining({ localPaymentId: 'local-1', amount: '1250.00' }));
    expect(orders.settleVerifiedPayment).toHaveBeenCalledWith('TBANK:991', 'SUCCEEDED', expect.objectContaining({ amount: '1250.00', paid: true }));
  });
  it('не засчитывает тестовую оплату в рабочем окружении', async () => {
    robo.capabilities.mockResolvedValue({ ...caps('ROBOKASSA'), environment: 'TEST' } as any);
    await expect(svc.create('robokassa', 'SB-1', {})).rejects.toThrow(/Тестовые платежи/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('не принимает результат другого окружения после создания попытки', async () => {
    robo.createPayment.mockImplementation(async req => ({ ...verified(req), test: true }));
    await expect(svc.create('robokassa', 'SB-1', {})).rejects.toThrow(/окружение/i);
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });
});
