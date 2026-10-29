import { createHash } from 'crypto';
import { TBankGateway, tbankToken } from './tbank.gateway';
import { makeCourseFiscalSnapshot } from './course-fiscal-receipt';

describe('T-Банк: подписи и платежи без внешних запросов', () => {
  let gateway: TBankGateway, fetchMock: jest.SpyInstance;
  const config = { terminalKey: 'terminal-test', fiscalMode: 'EXTERNAL' };
  const integration = { isEnabled: true, environment: 'TEST', config, encryptedSecrets: 'fixture' };
  const request = { orderId: 'order-1', orderNumber: 'SB-1', localPaymentId: 'payment-1', idempotenceKey: 'key-1', amount: '1250.00', currency: 'RUB', returnUrl: 'https://site.example/orders/SB-1' };
  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden'));
    gateway = new TBankGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(integration) } } as any, { decrypt: () => ({ password: 'test-pass' }) } as any, { get: (key: string) => ({ STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true', PUBLIC_APP_URL: 'https://site.example' } as any)[key] } as any);
  });
  afterEach(() => fetchMock.mockRestore());
  it('подписывает только корневые скалярные поля и не включает существующий Token', () => {
    const data = { TerminalKey: 'terminal-test', Amount: 125000, OrderId: 'payment-1', Token: 'ignored', Success: true, DATA: { private: 'ignored' } };
    const expected = createHash('sha256').update('125000payment-1test-passtrue' + 'terminal-test').digest('hex');
    expect(tbankToken(data, 'test-pass')).toBe(expected);
  });
  it('создаёт одну тестовую попытку с суммой в копейках и официальной ссылкой', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '123', Amount: 125000, Status: 'NEW', PaymentURL: 'https://securepayments.tinkoff.ru/abc' }) } as any);
    const response = await gateway.createPayment(request);
    expect(response).toMatchObject({ id: '123', status: 'pending', paid: false, test: true, amount: { value: '1250.00', currency: 'RUB' } });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://rest-api-test.tinkoff.ru/v2/Init');
    const payload = JSON.parse(options.body); expect(payload.Amount).toBe(125000); expect(payload.OrderId).toBe('payment-1'); expect(payload.DATA).toEqual({ OperationInitiatorType: '0' }); expect(payload.Token).toBe(tbankToken(payload, 'test-pass'));
  });
  it('отклоняет подменённую сумму и посторонний адрес оплаты', async () => {
    for (const changes of [{ Amount: 1 }, { PaymentURL: 'https://securepayments.tinkoff.ru.attacker.test/pay' }]) {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '123', Amount: 125000, Status: 'NEW', PaymentURL: 'https://securepayments.tinkoff.ru/pay', ...changes }) } as any);
      await expect(gateway.createPayment(request)).rejects.toThrow();
    }
  });
  it('проверяет подписанное уведомление и не доверяет изменённому идентификатору', async () => {
    const payload: any = { TerminalKey: 'terminal-test', PaymentId: '123', OrderId: 'payment-1', Amount: 125000, Status: 'CONFIRMED', Success: true, ErrorCode: '0' };
    payload.Token = tbankToken(payload, 'test-pass');
    await expect(gateway.verifyNotification(payload)).resolves.toEqual({ id: '123', orderId: 'payment-1' });
    await expect(gateway.verifyNotification({ ...payload, OrderId: 'payment-2' })).rejects.toThrow();
  });
  it('не принимает GetState другого платежа, даже если номер заказа и сумма совпадают', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '456', Amount: 125000, Status: 'CONFIRMED' }) } as any);
    await expect(gateway.getPayment('123', request)).rejects.toThrow(/идентификатор/i);
  });
  it('не подтверждает обработку возврата как обычного ожидающего платежа', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '123', Amount: 125000, Status: 'PARTIAL_REFUNDED' }) } as any);
    await expect(gateway.getPayment('123', request)).rejects.toThrow(/ручной сверки/);
  });
  it('сверяет статус возврата по GetState и не доверяет другому платежу или сумме', async () => {
    const body: any = { Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '123', Amount: 125000, Status: 'REFUNDED' };
    fetchMock.mockResolvedValue({ ok: true, json: async () => body } as any);
    await expect(gateway.getRefundState('123', request)).resolves.toEqual({ id: '123', status: 'REFUNDED', test: true });
    body.Amount = 1; await expect(gateway.getRefundState('123', request)).rejects.toThrow();
    body.Amount = 125000; body.PaymentId = '999'; await expect(gateway.getRefundState('123', request)).rejects.toThrow();
    body.PaymentId = '123'; body.Status = 'CONFIRMED'; await expect(gateway.getRefundState('123', request)).rejects.toThrow();
  });
  it('при выключенных внешних вызовах не обращается к провайдеру', async () => {
    gateway = new TBankGateway({} as any, {} as any, { get: () => 'false' } as any);
    await expect(gateway.createPayment(request)).rejects.toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('отправляет в Init неизменный чек курса с явно подтверждёнными настройками и не даёт оплатить товары без EXTERNAL', async () => {
    const fiscalConfig = { terminalKey: 'terminal-test', courseFiscalMode: 'PROVIDER', courseFiscalConfirmed: 'YES', courseIssuerName: 'Иванова Анна Ивановна', courseIssuerInn: '500100732259', courseTaxation: 'usn_income', courseTax: 'none', coursePaymentMethod: 'full_payment', coursePaymentObject: 'service' };
    const version = new Date('2026-01-01T00:00:00.000Z');
    const row = { id: 'integration', updatedAt: version, isEnabled: true, environment: 'TEST', config: fiscalConfig, encryptedSecrets: 'fixture' };
    gateway = new TBankGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(row) } } as any, { decrypt: () => ({ password: 'test-pass' }) } as any, { get: (key: string) => ({ STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true', PUBLIC_APP_URL: 'https://site.example' } as any)[key] } as any);
    const receipt = makeCourseFiscalSnapshot({ name: 'Курс маникюра', amount: '1250.00', email: 'buyer@example.invalid', policy: { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' } });
    const fiscal = { receipt, issuerName: fiscalConfig.courseIssuerName, issuerInn: fiscalConfig.courseIssuerInn, integrationId: row.id, integrationVersion: version.toISOString() };
    expect(await gateway.capabilities()).toMatchObject({ available: false, courseAvailable: true });
    await expect(gateway.createPayment(request)).rejects.toThrow(/фискализац/i); expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Success: true, ErrorCode: '0', TerminalKey: 'terminal-test', OrderId: 'payment-1', PaymentId: '123', Amount: 125000, Status: 'NEW', PaymentURL: 'https://securepayments.tinkoff.ru/abc' }) } as any);
    await gateway.createPayment({ ...request, courseFiscal: fiscal });
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.Receipt).toEqual({ Taxation: 'usn_income', Email: 'buyer@example.invalid', Items: [{ Name: 'Курс маникюра', Price: 125000, Quantity: 1, Amount: 125000, Tax: 'none', PaymentMethod: 'full_payment', PaymentObject: 'service' }] });
    expect(payload.Token).toBe(tbankToken(payload, 'test-pass'));
    fetchMock.mockClear(); row.updatedAt = new Date('2026-01-02T00:00:00.000Z');
    await expect(gateway.createPayment({ ...request, courseFiscal: fiscal })).rejects.toThrow(/изменились/); expect(fetchMock).not.toHaveBeenCalled();
  });
});
