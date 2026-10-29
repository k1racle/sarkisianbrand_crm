import { createHash } from 'crypto';
import { RobokassaGateway } from './robokassa.gateway';
import { makeCourseFiscalSnapshot } from './course-fiscal-receipt';

describe('Робокасса: форма и подтверждения без сети', () => {
  const integration = { isEnabled: true, environment: 'TEST', config: { merchantLogin: 'test-shop', signatureAlgorithm: 'SHA256', fiscalMode: 'EXTERNAL' }, encryptedSecrets: 'fixture' };
  const fixtureSecrets = { password1: 'production-one', password2: 'production-two', testPassword1: 'pass-one', testPassword2: 'pass-two' };
  const gateway = new RobokassaGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(integration) } } as any, { decrypt: () => fixtureSecrets } as any, { get: (key: string) => ({ STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true', PUBLIC_APP_URL: 'https://site.example' } as any)[key] } as any);
  const request = { invoiceId: 123, orderId: 'order-1', orderNumber: 'SB-1', localPaymentId: '8ea0bc49-2481-4fdc-9322-9d16e4866f20', idempotenceKey: 'key-1', amount: '1250.00', currency: 'RUB', returnUrl: 'https://site.example/orders/SB-1' };
  it('формирует тестовую форму с неизменной суммой и номером', async () => {
    const result = await gateway.createPayment(request), url = new URL(result.confirmation!.confirmation_url!);
    expect(result).toMatchObject({ id: '123', paid: false, status: 'pending', test: true });
    expect(url.origin).toBe('https://auth.robokassa.ru'); expect(url.searchParams.get('OutSum')).toBe('1250.00'); expect(url.searchParams.get('InvId')).toBe('123'); expect(url.searchParams.get('IsTest')).toBe('1');
    expect(url.searchParams.get('Shp_payment')).toBe(request.localPaymentId);
  });
  it('проверяет подписанные сумму и идентификатор попытки, отклоняет лишние параметры', async () => {
    const payload = { OutSum: '1250.000000', InvId: '123', Shp_payment: request.localPaymentId, SignatureValue: createHash('sha256').update(`1250.000000:123:pass-two:Shp_payment=${request.localPaymentId}`).digest('hex') };
    await expect(gateway.verifyNotification(payload)).resolves.toEqual({ invoiceId: 123, amount: '1250.00', localPaymentId: request.localPaymentId });
    await expect(gateway.verifyNotification({ ...payload, OutSum: '1.00' })).rejects.toThrow();
    await expect(gateway.verifyNotification({ ...payload, Shp_order: 'attacker' })).rejects.toThrow();
  });
  it('не активируется без внешнего разрешения и согласованной фискализации', async () => {
    const off = new RobokassaGateway({} as any, {} as any, { get: () => 'false' } as any);
    await expect(off.createPayment(request)).rejects.toThrow();
    const bad = new RobokassaGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue({ ...integration, config: { ...integration.config, fiscalMode: '' } }) } } as any, { decrypt: () => fixtureSecrets } as any, { get: (key: string) => key === 'STOREFRONT_EXTERNAL_CALLS_ENABLED' ? 'true' : 'https://site.example' } as any);
    await expect(bad.createPayment(request)).rejects.toThrow(/чек/);
  });
  it('рабочий режим заблокирован без тестовых паролей или при совпадении хотя бы одного пароля', async () => {
    const production = { ...integration, environment: 'PRODUCTION' };
    for (const secrets of [
      { password1: 'one', password2: 'two' },
      { password1: 'one', password2: 'two', testPassword1: 'one', testPassword2: 'test-two' },
      { password1: 'one', password2: 'two', testPassword1: 'test-one', testPassword2: 'two' },
    ]) {
      const candidate = new RobokassaGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(production) } } as any, { decrypt: () => secrets } as any, { get: (key: string) => key === 'STOREFRONT_EXTERNAL_CALLS_ENABLED' ? 'true' : 'https://site.example' } as any);
      await expect(candidate.assertAvailable()).rejects.toThrow(/разные тестовые и рабочие/);
    }
  });
  it('боевой ResultURL не принимает подпись тестовым паролем', async () => {
    const candidate = new RobokassaGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue({ ...integration, environment: 'PRODUCTION' }) } } as any, { decrypt: () => fixtureSecrets } as any, { get: (key: string) => key === 'STOREFRONT_EXTERNAL_CALLS_ENABLED' ? 'true' : 'https://site.example' } as any);
    const payload = { OutSum: '1250.00', InvId: '123', Shp_payment: request.localPaymentId, SignatureValue: createHash('sha256').update(`1250.00:123:pass-two:Shp_payment=${request.localPaymentId}`).digest('hex') };
    await expect(candidate.verifyNotification(payload)).rejects.toThrow();
    payload.SignatureValue = createHash('sha256').update(`1250.00:123:production-two:Shp_payment=${request.localPaymentId}`).digest('hex');
    await expect(candidate.verifyNotification(payload)).resolves.toMatchObject({ localPaymentId: request.localPaymentId });
  });
  it('подписывает чек курса и возвращает только POST-форму с зафиксированным адресом', async () => {
    const fiscalConfig = { merchantLogin: 'test-shop', signatureAlgorithm: 'SHA256', courseFiscalMode: 'PROVIDER', courseFiscalConfirmed: 'YES', courseIssuerName: 'Иванова Анна Ивановна', courseIssuerInn: '500100732259', courseTaxation: 'usn_income', courseTax: 'none', coursePaymentMethod: 'full_payment', coursePaymentObject: 'service' };
    const version = new Date('2026-01-01T00:00:00.000Z'), row = { id: 'integration', updatedAt: version, isEnabled: true, environment: 'TEST', config: fiscalConfig, encryptedSecrets: 'fixture' };
    const candidate = new RobokassaGateway({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(row) } } as any, { decrypt: () => fixtureSecrets } as any, { get: (key: string) => key === 'STOREFRONT_EXTERNAL_CALLS_ENABLED' ? 'true' : 'https://site.example' } as any);
    const receipt = makeCourseFiscalSnapshot({ name: 'Курс маникюра', amount: '1250.00', email: 'buyer@example.invalid', policy: { taxation: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' } });
    const courseFiscal = { receipt, issuerName: fiscalConfig.courseIssuerName, issuerInn: fiscalConfig.courseIssuerInn, integrationId: row.id, integrationVersion: version.toISOString() };
    expect(await candidate.capabilities()).toMatchObject({ available: false, courseAvailable: true });
    await expect(candidate.createPayment(request)).rejects.toThrow(/фискализац/i);
    const result = await candidate.createPayment({ ...request, courseFiscal }), form = result.confirmation!.form!;
    expect(form).toMatchObject({ action: 'https://auth.robokassa.ru/Merchant/Index.aspx', method: 'POST', fields: { Email: 'buyer@example.invalid', IsTest: '1', Shp_payment: request.localPaymentId } });
    expect(result.confirmation!.confirmation_url).toBeUndefined();
    const parsedReceipt = JSON.parse(decodeURIComponent(form.fields.Receipt));
    expect(parsedReceipt).toEqual({ sno: 'usn_income', items: [{ name: 'Курс маникюра', quantity: 1, sum: 1250, tax: 'none', payment_method: 'full_payment', payment_object: 'service' }] });
    const expected = createHash('sha256').update(`test-shop:1250.00:123:${form.fields.Receipt}:pass-one:Shp_payment=${request.localPaymentId}`).digest('hex');
    expect(form.fields.SignatureValue).toBe(expected);
    expect(Object.keys(form.fields).sort()).toEqual(['Description','Email','InvId','IsTest','MerchantLogin','OutSum','Receipt','Shp_payment','SignatureValue'].sort());
    row.updatedAt = new Date('2026-01-02T00:00:00.000Z');
    await expect(candidate.createPayment({ ...request, courseFiscal })).rejects.toThrow(/изменились/);
  });
});
