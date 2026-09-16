import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

// Isolate the parent module entirely: unit tests exercise only payment-owned code.
// OrdersService's own financial atomicity and compilation belong to its tests/build.
jest.mock('../orders/orders.service', () => ({ OrdersService: class MockOrdersService {} }));

describe('Платежи: безопасность и идемпотентность без БД и сети', () => {
  let service: PaymentsService;
  let prisma: any;
  let gateway: any;
  let orders: any;
  let order: any;
  let payment: any;
  let saved: any;
  let verified: any;
  let settlementCalls: Set<string>;
  let financialChanges: number;
  let http: jest.SpyInstance;
  let externalCallsEnabled: boolean;
  const webhook = () => ({ type: 'notification' as const, event: 'payment.succeeded', object: { id: 'provider-1', status: 'succeeded', amount: { value: '0.01', currency: 'USD' }, metadata: { order_id: 'attacker' } } });

  beforeEach(() => {
    http = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden in pure tests'));
    order = { id: 'order-1', orderNumber: 'SB-TEST', source: 'WEB', status: 'NEW', paymentStatus: 'PENDING', finalAmount: '1250.00', currency: 'RUB', reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + 1800000), priceSnapshot: { deliveryConfirmed: true } };
    payment = { id: 'local-1', orderId: order.id, transactionId: 'provider-1', provider: 'YOOKASSA', amount: '1250.00', currency: 'RUB', status: 'PENDING', createdAt: new Date(), metadata: { idempotenceKey: 'key-1', returnUrl: 'https://shop.example/payment/return' }, order };
    verified = { id: 'provider-1', status: 'succeeded', paid: true, test: true, amount: { value: '1250.00', currency: 'RUB' }, metadata: { order_id: 'order-1', order_number: 'SB-TEST', payment_id: 'local-1' }, confirmation: { type: 'redirect', confirmation_url: 'https://yoomoney.ru/pay' } };
    saved = null;
    settlementCalls = new Set(); financialChanges = 0;
    orders = { getAccessible: jest.fn(async () => order), settleVerifiedPayment: jest.fn(async (id, status) => {
      const key = id + ':' + status;
      if (!settlementCalls.has(key) && status === 'SUCCEEDED') financialChanges++;
      settlementCalls.add(key);
      return { accepted: true, paymentId: id, status };
    }) };
    gateway = { assertAvailable: jest.fn(async () => {}), capabilities: jest.fn(async () => ({ available: false })), validateReturnUrl: jest.fn(() => 'https://shop.example/payment/return'), createPayment: jest.fn(async request => ({ ...verified, metadata: { ...verified.metadata, payment_id: request.localPaymentId } })), getPayment: jest.fn(async () => verified) };
    const tx: any = { $queryRaw: jest.fn(async () => [{ id: order.id }]), order: { findUniqueOrThrow: jest.fn(async () => order), update: jest.fn(async () => order) }, payment: { findFirst: jest.fn(async () => saved), create: jest.fn(async ({ data }) => (saved = { ...payment, ...data, transactionId: null })), findUniqueOrThrow: jest.fn(async () => saved || payment), update: jest.fn(async ({ data }) => { saved = { ...(saved || payment), ...data }; return saved; }) } };
    // Serialize mocked transactions just as the real PostgreSQL row lock does.
    let queue = Promise.resolve();
    prisma = { payment: { findUnique: jest.fn(async () => payment), findMany: jest.fn(async () => []) }, $transaction: jest.fn(fn => {
      const result = queue.then(() => fn(tx));
      queue = result.then(() => undefined, () => undefined);
      return result;
    }), tx };
    externalCallsEnabled = false;
    service = new PaymentsService(prisma, gateway, orders, { get: () => externalCallsEnabled ? 'true' : 'false' } as any);
  });
  afterEach(() => { service.onModuleDestroy(); expect(http).not.toHaveBeenCalled(); http.mockRestore(); });

  it('сначала проверяет доступ владельца/гостя, до payment lookup или gateway', async () => {
    orders.getAccessible.mockRejectedValue(new ForbiddenException());
    await expect(service.create('SB-TEST', {}, { sub: 'other-user' }, 'opaque-token')).rejects.toBeInstanceOf(ForbiddenException);
    expect(orders.getAccessible).toHaveBeenCalledWith('SB-TEST', { sub: 'other-user' }, 'opaque-token');
    expect(gateway.assertAvailable).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('отключённый gateway возвращает 503 до создания payment', async () => {
    gateway.assertAvailable.mockRejectedValue(new ServiceUnavailableException('Оплата отключена'));
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('полное покрытие сертификатом не создаёт ЮKassa payment даже при выключенном gateway', async () => {
    order.finalAmount = '0.00'; order.status = 'PAID'; order.paymentStatus = 'SUCCEEDED'; order.giftCardAmount = '1250.00';
    gateway.assertAvailable.mockRejectedValue(new ServiceUnavailableException('Оплата отключена'));
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(gateway.assertAvailable).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled(); expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('цифровой сертификат оплачивается без ShippingQuote, но требует действующего резерва заказа', async () => {
    order.priceSnapshot = { digitalDelivery: true, deliveryConfirmed: false };
    await service.create('SB-TEST', {});
    expect(gateway.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: '1250.00' }));
  });

  it('частичное покрытие сертификатом отправляет только остаток денежной суммы', async () => {
    order.giftCardAmount = '500.00'; order.finalAmount = '750.00';
    payment.amount = '750.00'; verified.amount.value = '750.00';
    await service.create('SB-TEST', {});
    expect(gateway.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: '750.00' }));
    expect(orders.settleVerifiedPayment).toHaveBeenCalledWith('provider-1', 'SUCCEEDED', expect.objectContaining({ amount: '750.00' }));
  });

  it('адрес чужого сайта отклоняется до записи intent', async () => {
    gateway.validateReturnUrl.mockImplementation(() => { throw new BadRequestException(); });
    await expect(service.create('SB-TEST', { returnUrl: 'https://evil.example' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['delivery', 'expired', 'legacy', 'cancelled', 'paid'])('не оплачивает недопустимый заказ: %s', async kind => {
    if (kind === 'delivery') order.priceSnapshot.deliveryConfirmed = false;
    if (kind === 'expired') order.reservationExpiresAt = new Date(0);
    if (kind === 'legacy') order.reservationState = 'LEGACY';
    if (kind === 'cancelled') order.status = 'CANCELLED';
    if (kind === 'paid') order.paymentStatus = 'PAID';
    await expect(service.create('SB-TEST', {})).rejects.toThrow();
    expect(prisma.tx.payment.create).not.toHaveBeenCalled();
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('одновременные попытки используют единственный intent и один provider key', async () => {
    verified.status = 'pending'; verified.paid = false;
    const results = await Promise.all([service.create('SB-TEST', {}), service.create('SB-TEST', {})]);
    expect(prisma.tx.payment.create).toHaveBeenCalledTimes(1);
    expect(results.map(x => x.paymentId)).toEqual(['provider-1', 'provider-1']);
    const keys = gateway.createPayment.mock.calls.map(([request]) => request.idempotenceKey);
    expect(new Set(keys).size).toBe(1);
    expect(gateway.createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: '1250.00', currency: 'RUB', orderId: 'order-1', localPaymentId: 'local-1' }));
  });

  it('существующий provider id проверяется GET, не создаётся повторно', async () => {
    saved = payment;
    await service.create('SB-TEST', {});
    expect(gateway.getPayment).toHaveBeenCalledWith('provider-1');
    expect(gateway.createPayment).not.toHaveBeenCalled();
    expect(prisma.tx.payment.create).not.toHaveBeenCalled();
  });

  it('неизвестный результат сети повторяется с сохранённым ключом и тем же телом', async () => {
    verified.status = 'pending'; verified.paid = false;
    gateway.createPayment.mockRejectedValueOnce(new ServiceUnavailableException('Сеть'));
    await expect(service.create('SB-TEST', {})).rejects.toThrow('Сеть');
    expect(saved.transactionId).toBeNull();
    await service.create('SB-TEST', { returnUrl: '/different' });
    expect(prisma.tx.payment.create).toHaveBeenCalledTimes(1);
    expect(gateway.createPayment.mock.calls[0][0]).toEqual(gateway.createPayment.mock.calls[1][0]);
  });

  it('после срока idempotence не делает новый POST для неизвестного результата', async () => {
    saved = { ...payment, transactionId: null, status: 'CREATING', createdAt: new Date(Date.now() - 24 * 3600000) };
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('запрещает старый fake provider и изменение суммы активного платежа', async () => {
    saved = { ...payment, provider: 'YOOKASSA_TEST' };
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(ConflictException);
    saved = { ...payment, amount: '1.00' };
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(ConflictException);
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('присланный succeeded не меняет статус, если GET возвращает pending', async () => {
    verified.status = 'pending'; verified.paid = false;
    expect(await service.webhook(webhook())).toMatchObject({ status: 'PENDING' });
    expect(orders.settleVerifiedPayment).toHaveBeenCalledWith('provider-1', 'PENDING', expect.objectContaining({ amount: '1250.00', currency: 'RUB', providerStatus: 'pending' }));
    expect(financialChanges).toBe(0);
  });

  it('повторные webhook передаются атомарному hook без собственного начисления', async () => {
    await Promise.all([service.webhook(webhook()), service.webhook(webhook())]);
    expect(financialChanges).toBe(1);
    expect(orders.settleVerifiedPayment).toHaveBeenCalledTimes(2);
    expect(orders.settleVerifiedPayment).toHaveBeenCalledWith('provider-1', 'SUCCEEDED', expect.objectContaining({ orderId: 'order-1', localPaymentId: 'local-1', paid: true, metadata: verified.metadata }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['id', 'amount', 'currency', 'order', 'number', 'local', 'paid'])('несоответствие server-side %s запрещает settlement', async kind => {
    if (kind === 'id') verified.id = 'other';
    if (kind === 'amount') verified.amount.value = '0.01';
    if (kind === 'currency') verified.amount.currency = 'USD';
    if (kind === 'order') verified.metadata.order_id = 'other';
    if (kind === 'number') verified.metadata.order_number = 'other';
    if (kind === 'local') verified.metadata.payment_id = 'other';
    if (kind === 'paid') verified.paid = false;
    await expect(service.webhook(webhook())).rejects.toBeInstanceOf(BadRequestException);
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('ошибка проверки провайдера не подтверждает webhook', async () => {
    gateway.getPayment.mockRejectedValue(new ServiceUnavailableException('Провайдер недоступен'));
    await expect(service.webhook(webhook())).rejects.toThrow('Провайдер недоступен');
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('неизвестный webhook не вызывает HTTP и возвращает повторяемый 503', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.webhook(webhook())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(gateway.getPayment).not.toHaveBeenCalled();
  });

  it('старый DTO, неподдержанный event и вредоносный id отклоняются до lookup', async () => {
    for (const dto of [{ paymentId: 'provider-1', status: 'SUCCEEDED' }, { ...webhook(), event: 'refund.succeeded' }, { ...webhook(), object: { id: '../payments' } }]) await expect(service.webhook(dto as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it('waiting_for_capture никогда не считается оплаченным', async () => {
    verified.status = 'waiting_for_capture'; verified.paid = true;
    expect(await service.webhook({ ...webhook(), event: 'payment.waiting_for_capture' })).toMatchObject({ status: 'PENDING' });
    expect(financialChanges).toBe(0);
  });

  it('устаревший canceled event не отменяет реально подтверждённую оплату', async () => {
    expect(await service.webhook({ ...webhook(), event: 'payment.canceled' })).toMatchObject({ status: 'SUCCEEDED' });
    expect(financialChanges).toBe(1);
  });

  it('не сохраняет непроверенный ответ create и не выполняет settlement', async () => {
    gateway.createPayment.mockImplementation(async () => ({ ...verified, amount: { value: '0.01', currency: 'RUB' } }));
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(BadRequestException);
    expect(saved.transactionId).toBeNull();
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('не возвращает ссылку для pending без redirect confirmation', async () => {
    gateway.createPayment.mockImplementation(async () => ({ ...verified, status: 'pending', paid: false, confirmation: undefined }));
    await expect(service.create('SB-TEST', {})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('таймер выключен по умолчанию: даже прямой poll не читает БД', async () => {
    const interval = jest.spyOn(globalThis, 'setInterval');
    try {
      service.onModuleInit(); await service.recoverPendingPayments();
      expect(interval).not.toHaveBeenCalled();
      expect(gateway.assertAvailable).not.toHaveBeenCalled();
      expect(prisma.payment.findMany).not.toHaveBeenCalled();
    } finally { interval.mockRestore(); }
  });

  it('таймер запускается единожды, unref и корректно удаляется', () => {
    externalCallsEnabled = true;
    const timer = { unref: jest.fn() };
    const interval = jest.spyOn(globalThis, 'setInterval').mockReturnValue(timer as any);
    const clear = jest.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    try {
      service.onModuleInit(); service.onModuleInit();
      expect(interval).toHaveBeenCalledTimes(1);
      expect(interval).toHaveBeenCalledWith(expect.any(Function), 60000);
      expect(timer.unref).toHaveBeenCalledTimes(1);
      service.onModuleDestroy(); expect(clear).toHaveBeenCalledWith(timer);
    } finally { interval.mockRestore(); clear.mockRestore(); }
  });

  it('включённый poll сначала проверяет capability; недоступный gateway не читает кандидатов', async () => {
    externalCallsEnabled = true;
    gateway.assertAvailable.mockRejectedValue(new ServiceUnavailableException());
    await service.recoverPendingPayments();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('пропущенный webhook восстанавливается GET с ограничением 20 и возрастом >1 минуты', async () => {
    externalCallsEnabled = true; saved = payment;
    prisma.payment.findMany.mockResolvedValue([payment]);
    await service.recoverPendingPayments();
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20, where: expect.objectContaining({ provider: 'YOOKASSA', status: { in: ['CREATING', 'PENDING'] }, createdAt: { lt: expect.any(Date) } }) }));
    expect(gateway.getPayment).toHaveBeenCalledTimes(1);
    expect(financialChanges).toBe(1);
    expect(orders.getAccessible).not.toHaveBeenCalled();
    expect(gateway.createPayment).not.toHaveBeenCalled();
  });

  it('CREATING восстанавливается тем же POST/body/key без нового intent', async () => {
    externalCallsEnabled = true;
    saved = { ...payment, transactionId: null, status: 'CREATING' };
    prisma.payment.findMany.mockResolvedValue([saved]);
    await service.recoverPendingPayments();
    expect(gateway.createPayment).toHaveBeenCalledWith(expect.objectContaining({ idempotenceKey: 'key-1', localPaymentId: 'local-1', amount: '1250.00', returnUrl: 'https://shop.example/payment/return' }));
    expect(prisma.tx.payment.create).not.toHaveBeenCalled();
    expect(saved.transactionId).toBe('provider-1');
    expect(financialChanges).toBe(1);
  });

  it('два одновременных poll выполняют только один HTTP на кандидата', async () => {
    externalCallsEnabled = true; saved = payment;
    prisma.payment.findMany.mockResolvedValue([payment]);
    await Promise.all([service.recoverPendingPayments(), service.recoverPendingPayments()]);
    expect(prisma.payment.findMany).toHaveBeenCalledTimes(1);
    expect(gateway.getPayment).toHaveBeenCalledTimes(1);
  });

  it('одновременные recovery и webhook разделяют один ещё выполняемый GET', async () => {
    externalCallsEnabled = true; saved = payment;
    prisma.payment.findMany.mockResolvedValue([payment]);
    let complete!: (value: any) => void;
    gateway.getPayment.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const first = service.recoverPendingPayments();
    // Advance only microtasks: no sleeps and no real timers/provider calls.
    for (let i = 0; i < 8; i++) await Promise.resolve();
    const second = service.webhook(webhook());
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(gateway.getPayment).toHaveBeenCalledTimes(1);
    complete(verified); await Promise.all([first, second]);
    expect(financialChanges).toBe(1);
  });

  it('ошибка recovery оставляет неопределённый CREATING и резерв; следующее poll снова разрешено', async () => {
    externalCallsEnabled = true;
    saved = { ...payment, transactionId: null, status: 'CREATING' };
    prisma.payment.findMany.mockResolvedValue([saved]);
    gateway.createPayment.mockRejectedValue(new Error('Provider unavailable'));
    await service.recoverPendingPayments(); await service.recoverPendingPayments();
    expect(saved.status).toBe('CREATING'); expect(saved.transactionId).toBeNull();
    expect(order.reservationState).toBe('ACTIVE');
    expect(orders.settleVerifiedPayment).not.toHaveBeenCalled();
    expect(gateway.createPayment).toHaveBeenCalledTimes(2);
  });
});
