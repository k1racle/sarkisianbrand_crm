import { BadGatewayException, BadRequestException, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { YooKassaGateway } from './yookassa.gateway';
import { PaymentRequest } from './payment-gateway';
import { PaymentWebhookDto } from './dto/payment.dto';

describe('ЮKassa: только подменённый HTTP', () => {
  let gateway: YooKassaGateway;
  let values: Record<string, string>;
  let integration: any;
  let prisma: any;
  let secrets: any;
  let http: jest.SpyInstance;
  const request: PaymentRequest = { orderNumber: 'SB-TEST', orderId: 'order-1', localPaymentId: 'local-1', idempotenceKey: 'key-1', amount: '1250.00', currency: 'RUB' };
  const response = () => ({ id: 'provider-1', status: 'pending', paid: false, test: true, amount: { value: '1250.00', currency: 'RUB' }, metadata: { order_id: 'order-1', order_number: 'SB-TEST', payment_id: 'local-1' }, confirmation: { type: 'redirect', confirmation_url: 'https://yoomoney.ru/checkout/payments/v2/contract' } });

  beforeEach(() => {
    values = { PUBLIC_APP_URL: 'https://shop.example', STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true' };
    integration = { isEnabled: true, environment: 'TEST', config: { shopId: '123' }, encryptedSecrets: 'encrypted-fixture' };
    prisma = { ecosystemIntegration: { findUnique: jest.fn(async () => integration) } };
    secrets = { decrypt: jest.fn(() => ({ secretKey: 'mock-secret' })) };
    gateway = new YooKassaGateway(prisma, secrets, { get: (key: string, fallback?: string) => values[key] ?? fallback } as any);
    // Fail closed: no test can fall back to a network request.
    http = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected mocked HTTP'));
  });
  afterEach(() => http.mockRestore());

  it.each([undefined, 'false', '0', 'yes', 'TRUE'])('отключён по умолчанию (%s), не читает секреты и не вызывает HTTP', async flag => {
    if (flag === undefined) delete values.STOREFRONT_EXTERNAL_CALLS_ENABLED;
    else values.STOREFRONT_EXTERNAL_CALLS_ENABLED = flag;
    expect(await gateway.capabilities()).toMatchObject({ available: false, externalCallsEnabled: false });
    await expect(gateway.createPayment(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(gateway.getPayment('provider-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(http).not.toHaveBeenCalled();
    expect(prisma.ecosystemIntegration.findUnique).not.toHaveBeenCalled();
    expect(secrets.decrypt).not.toHaveBeenCalled();
  });

  it('использует официальный фиксированный endpoint, Basic Auth, capture и сохранённый ключ', async () => {
    http.mockResolvedValue({ ok: true, json: async () => response() } as Response);
    await expect(gateway.createPayment(request)).resolves.toEqual(response());
    const [url, options] = http.mock.calls[0];
    expect(url).toBe('https://api.yookassa.ru/v3/payments');
    expect(options).toMatchObject({ method: 'POST', redirect: 'error', headers: { Authorization: 'Basic ' + Buffer.from('123:mock-secret').toString('base64'), 'Idempotence-Key': 'key-1' } });
    expect(JSON.parse(options.body)).toEqual({ amount: { value: '1250.00', currency: 'RUB' }, capture: true, confirmation: { type: 'redirect', return_url: 'https://shop.example/orders/SB-TEST' }, description: 'Заказ SB-TEST', metadata: { order_id: 'order-1', order_number: 'SB-TEST', payment_id: 'local-1' } });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('проверяет текущий платёж серверным GET без Idempotence-Key', async () => {
    http.mockResolvedValue({ ok: true, json: async () => response() } as Response);
    await gateway.getPayment('provider-1');
    expect(http).toHaveBeenCalledWith('https://api.yookassa.ru/v3/payments/provider-1', expect.objectContaining({ method: 'GET' }));
    expect(http.mock.calls[0][1].headers).not.toHaveProperty('Idempotence-Key');
  });

  it.each(['https://evil.example/', '//evil.example/', 'https://shop.example@evil.example/', 'javascript:alert(1)', 'https://shop.example/#unsafe'])('отклоняет адрес возврата %s до HTTP', async returnUrl => {
    await expect(gateway.createPayment({ ...request, returnUrl })).rejects.toBeInstanceOf(BadRequestException);
    expect(http).not.toHaveBeenCalled();
  });

  it('разрешает относительный или абсолютный адрес только своего origin', () => {
    expect(gateway.validateReturnUrl('/payment/return?source=shop')).toBe('https://shop.example/payment/return?source=shop');
    expect(gateway.validateReturnUrl('https://shop.example/payment/return')).toBe('https://shop.example/payment/return');
  });

  it.each(['', 'https://admin:secret@shop.example', 'http://shop.example', 'https://shop.example/?redirect=evil'])('не настроенный PUBLIC_APP_URL %s блокирует оплату', async value => {
    values.PUBLIC_APP_URL = value;
    expect((await gateway.capabilities()).available).toBe(false);
    await expect(gateway.createPayment(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(http).not.toHaveBeenCalled();
  });

  it('не выдаёт capability с секретами', async () => {
    const capability = await gateway.capabilities();
    expect(capability).toMatchObject({ available: true, configured: true, environment: 'TEST' });
    expect(JSON.stringify(capability)).not.toMatch(/mock-secret|encrypted-fixture|shopId|secretKey/);
    expect(http).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'missing-secret'])('выключенная/не настроенная интеграция %s блокирует HTTP', async mode => {
    if (mode === 'disabled') integration.isEnabled = false;
    else secrets.decrypt.mockReturnValue({});
    await expect(gateway.createPayment(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(http).not.toHaveBeenCalled();
  });

  it.each([400, 401, 429, 500])('ошибка провайдера %i не превращается в фиктивный платёж и не раскрывает ответ', async status => {
    http.mockResolvedValue({ ok: false, status, json: async () => ({ secret: 'mock-secret' }) } as Response);
    let error: any;
    try { await gateway.createPayment(request); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(BadGatewayException);
    expect(error.message).not.toContain('mock-secret');
    expect(http).toHaveBeenCalledTimes(1);
  });

  it.each(['amount', 'environment', 'url', 'status'])('некорректный ответ %s отклоняется', async kind => {
    const data: any = response();
    if (kind === 'amount') data.amount.value = 'NaN';
    if (kind === 'environment') data.test = false;
    if (kind === 'url') data.confirmation.confirmation_url = 'https://yoomoney.ru.evil.example/phish';
    if (kind === 'status') data.status = 'paid';
    http.mockResolvedValue({ ok: true, json: async () => data } as Response);
    await expect(gateway.createPayment(request)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('таймаут/ошибка сети возвращает 502 без автоматического повтора', async () => {
    await expect(gateway.createPayment(request)).rejects.toBeInstanceOf(BadGatewayException);
    expect(http).toHaveBeenCalledTimes(1);
  });

  it('официальный webhook с дополнительными полями проходит whitelist, старый произвольный статус — нет', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const official = { type: 'notification', event: 'payment.succeeded', object: { ...response(), recipient: { account_id: '123' }, created_at: '2026-09-16T00:00:00Z', new_provider_field: 'ignored' } };
    await expect(pipe.transform(official, { type: 'body', metatype: PaymentWebhookDto })).resolves.toMatchObject(official);
    await expect(pipe.transform({ paymentId: 'provider-1', orderNumber: 'SB-TEST', status: 'SUCCEEDED', idempotencyKey: 'attacker' }, { type: 'body', metatype: PaymentWebhookDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
