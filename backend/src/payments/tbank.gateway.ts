import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { PaymentCapabilities, PaymentGateway, PaymentRequest, VerifiedPayment } from './payment-gateway';
import { courseFiscalPolicyFromConfig, courseReceiptForTBank } from './course-fiscal-receipt';

// T-Bank signs sorted root scalar values. Nested Receipt/DATA are excluded.
// https://developer.tbank.ru/eacq/intro/developer/notification
export function tbankToken(data: Record<string, unknown>, password: string): string {
  if (!password) throw new Error('Missing terminal password');
  const values: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(data)) {
    if (key === 'Token' || key === 'Password' || value === null || value === undefined || typeof value === 'object') continue;
    if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isSafeInteger(value))) throw new Error('Invalid signed value');
    values[key] = String(value);
  }
  values.Password = password;
  return createHash('sha256').update(Object.keys(values).sort().map(key => values[key]).join(''), 'utf8').digest('hex');
}

const externalId = (value: unknown) => typeof value === 'string' ? value : typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : '';
const numericId = /^\d{1,20}$/;

@Injectable()
export class TBankGateway extends PaymentGateway {
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService, private readonly config: ConfigService) { super(); }
  private callsEnabled() { return String(this.config.get('STOREFRONT_EXTERNAL_CALLS_ENABLED', 'false')) === 'true'; }
  private async settings() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'TBANK' } });
    const settings = (integration?.config || {}) as Record<string, unknown>, secrets = this.secrets.decrypt(integration?.encryptedSecrets);
    const terminalKey = String(settings.terminalKey || '').trim(), password = String(secrets.password || '');
    return { integration, terminalKey, password, settings, fiscalMode: String(settings.fiscalMode || '').trim().toUpperCase(), configured: !!terminalKey && terminalKey.length <= 64 && !!password };
  }
  async capabilities(): Promise<PaymentCapabilities> {
    if (!this.callsEnabled()) return { provider: 'TBANK', available: false, externalCallsEnabled: false, configured: false, environment: null, reason: 'Онлайн-оплата отключена до проверки интеграции.' };
    const s = await this.settings();
    const baseReason = !s.integration?.isEnabled ? 'Т-Банк отключён в настройках CRM.' : !s.configured ? 'Заполните терминал и пароль Т-Банка.' : null;
    let courseReason = baseReason;
    if (!courseReason) try { courseFiscalPolicyFromConfig(s.settings); } catch { courseReason = 'Настройте и подтвердите кассу и налоговые данные курсов в CRM.'; }
    const reason = baseReason || (s.fiscalMode !== 'EXTERNAL' ? 'Сначала настройте выдачу чеков товаров и подтвердите внешнюю фискализацию.' : null);
    return { provider: 'TBANK', available: !reason, externalCallsEnabled: true, configured: s.configured, environment: s.integration?.environment || null, reason, courseAvailable: !courseReason, courseReason };
  }
  async assertAvailable(scope: 'goods' | 'course' | 'any' = 'any') { const value = await this.capabilities(); if (!(scope === 'goods' ? value.available : scope === 'course' ? value.courseAvailable : value.available || value.courseAvailable)) throw new ServiceUnavailableException((scope === 'course' ? value.courseReason : value.reason) || 'Т-Банк не настроен.'); }
  validateReturnUrl(value?: string) {
    let app: URL;
    try { app = new URL(String(this.config.get('PUBLIC_APP_URL') || '')); if (!['http:', 'https:'].includes(app.protocol) || app.username || app.password || app.search || app.hash || (app.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(app.hostname))) throw new Error(); }
    catch { throw new ServiceUnavailableException('Укажите корректный PUBLIC_APP_URL.'); }
    try { const url = new URL(value || '/payment/return', app.origin); if (url.origin !== app.origin || url.username || url.password || url.hash) throw new Error(); return url.href; }
    catch { throw new BadRequestException('Адрес возврата должен вести на этот интернет-магазин.'); }
  }
  async verifyNotification(payload: Record<string, unknown>) {
    await this.assertAvailable();
    const settings = await this.settings();
    if (!this.callsEnabled() || !settings.integration?.isEnabled || !settings.configured) throw new ServiceUnavailableException('Т-Банк отключён или настройки изменились.');
    const { terminalKey, password } = settings;
    if (!payload || Array.isArray(payload) || payload.TerminalKey !== terminalKey || typeof payload.Token !== 'string' || !/^[a-f0-9]{64}$/i.test(payload.Token)) throw new BadRequestException('Некорректное уведомление Т-Банка.');
    let expected: string; try { expected = tbankToken(payload, password); } catch { throw new BadRequestException('Некорректная подпись Т-Банка.'); }
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(payload.Token, 'hex'))) throw new BadRequestException('Некорректная подпись Т-Банка.');
    const id = externalId(payload.PaymentId), orderId = String(payload.OrderId || '');
    if (!numericId.test(id) || !/^[a-zA-Z0-9-]{1,50}$/.test(orderId)) throw new BadRequestException('Некорректный номер платежа.');
    return { id, orderId };
  }
  async createPayment(request: PaymentRequest): Promise<VerifiedPayment> {
    await this.assertAvailable(request.courseFiscal ? 'course' : 'goods');
    if (!/^\d{1,13}\.\d{2}$/.test(request.amount) || request.currency !== 'RUB' || !/^[a-zA-Z0-9-]{1,50}$/.test(request.localPaymentId)) throw new BadRequestException('Некорректная сумма платежа.');
    const amount = new Prisma.Decimal(request.amount).mul(100).toNumber();
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new BadRequestException('Некорректная сумма платежа.');
    const returnUrl = this.validateReturnUrl(request.returnUrl);
    const notificationUrl = new URL('/api/v1/payments/webhook/tbank', returnUrl).href;
    let receipt: ReturnType<typeof courseReceiptForTBank> | undefined;
    if (request.courseFiscal) {
      const settings = await this.settings(), fiscal = request.courseFiscal;
      if (!settings.integration || settings.integration.id !== fiscal.integrationId || settings.integration.updatedAt?.toISOString() !== fiscal.integrationVersion) throw new ServiceUnavailableException('Настройки кассы изменились; платёж требует сверки.');
      const policy = courseFiscalPolicyFromConfig(settings.settings);
      if (policy.issuerName !== fiscal.issuerName || policy.issuerInn !== fiscal.issuerInn || fiscal.receipt.amount !== request.amount || fiscal.receipt.taxation !== policy.taxation || fiscal.receipt.tax !== policy.tax || fiscal.receipt.paymentMethod !== policy.paymentMethod || fiscal.receipt.paymentObject !== policy.paymentObject) throw new ServiceUnavailableException('Снимок фискальных данных не совпадает с настройками кассы.');
      try { receipt = courseReceiptForTBank(fiscal.receipt); } catch { throw new BadRequestException('Некорректные данные фискального чека.'); }
    }
    const response = await this.call('Init', { Amount: amount, OrderId: request.localPaymentId, Description: `Заказ ${request.orderNumber}`.slice(0, 140), PayType: 'O', DATA: { OperationInitiatorType: '0' }, NotificationURL: notificationUrl, SuccessURL: returnUrl, FailURL: returnUrl, ...(receipt ? { Receipt: receipt } : {}) }, request.courseFiscal);
    return this.toVerified(response.data, request, true, response.test);
  }
  async getPayment(paymentId: string, request?: PaymentRequest): Promise<VerifiedPayment> {
    if (!numericId.test(paymentId) || !request) throw new BadRequestException('Некорректный платёж Т-Банка.');
    const response = await this.call('GetState', { PaymentId: paymentId });
    if (externalId(response.data.PaymentId) !== paymentId) throw new BadGatewayException('Идентификатор ответа Т-Банка не совпадает с запросом.');
    return this.toVerified(response.data, request, false, response.test);
  }
  async getRefundState(paymentId: string, request: PaymentRequest) {
    if (!numericId.test(paymentId)) throw new BadRequestException('Некорректный платёж Т-Банка.');
    const response = await this.call('GetState', { PaymentId: paymentId });
    const data = response.data, amount = Number(data.Amount), expected = new Prisma.Decimal(request.amount).mul(100).toNumber();
    if (externalId(data.PaymentId) !== paymentId || data.OrderId !== request.localPaymentId || request.currency !== 'RUB' || !Number.isSafeInteger(amount) || amount !== expected) throw new BadGatewayException('Данные Т-Банка не совпадают с заказом.');
    const status = String(data.Status || '');
    if (!['REFUNDING','REFUNDED','PARTIAL_REFUNDED','REVERSING','REVERSED','PARTIAL_REVERSED'].includes(status)) throw new BadGatewayException('Состояние возврата Т-Банка пока не подтверждено.');
    return { id: paymentId, status, test: response.test };
  }
  private async call(method: 'Init' | 'GetState', parameters: Record<string, unknown>, fiscal?: PaymentRequest['courseFiscal']) {
    await this.assertAvailable();
    const s = await this.settings();
    if (!this.callsEnabled() || !s.integration?.isEnabled || !s.configured) throw new ServiceUnavailableException('Т-Банк отключён или настройки изменились.');
    if (method === 'Init' && !fiscal && s.fiscalMode !== 'EXTERNAL') throw new ServiceUnavailableException('Фискализация товаров не настроена.');
    if (fiscal && (s.integration.id !== fiscal.integrationId || s.integration.updatedAt?.toISOString() !== fiscal.integrationVersion)) throw new ServiceUnavailableException('Настройки кассы изменились; платёж требует сверки.');
    const payload = { TerminalKey: s.terminalKey, ...parameters };
    try {
      const base = s.integration!.environment === 'TEST' ? 'https://rest-api-test.tinkoff.ru' : 'https://securepay.tinkoff.ru';
      const response = await fetch(`${base}/v2/${method}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, Token: tbankToken(payload, s.password) }) });
      if (!response.ok) throw new Error('provider response');
      const data = await response.json() as Record<string, unknown>;
      if (data.Success !== true || String(data.ErrorCode) !== '0' || data.TerminalKey !== s.terminalKey) throw new Error('provider rejected');
      return { data, test: s.integration!.environment === 'TEST' };
    } catch { throw new BadGatewayException('Результат Т-Банка не подтверждён. Не создавайте повторный платёж до сверки.'); }
  }
  private toVerified(data: Record<string, unknown>, request: PaymentRequest, requireUrl: boolean, test: boolean): VerifiedPayment {
    const id = externalId(data.PaymentId), amount = Number(data.Amount), status = String(data.Status || '');
    const expected = new Prisma.Decimal(request.amount).mul(100).toNumber();
    if (!numericId.test(id) || data.OrderId !== request.localPaymentId || !Number.isSafeInteger(amount) || amount !== expected) throw new BadGatewayException('Данные Т-Банка не совпадают с заказом.');
    // Refund/reversal needs financial reconciliation and cannot be treated as a
    // routine pending notification for an already paid order.
    if (['REFUNDING', 'REFUNDED', 'PARTIAL_REFUNDED', 'REVERSING', 'REVERSED', 'PARTIAL_REVERSED'].includes(status)) throw new BadGatewayException('Возврат или отмена в Т-Банке требуют ручной сверки.');
    let url: string | undefined;
    if (data.PaymentURL !== undefined) {
      try { const value = new URL(String(data.PaymentURL)); if (value.protocol !== 'https:' || value.username || value.password || !['securepayments.tinkoff.ru', 'securepayments.tbank.ru'].includes(value.hostname)) throw new Error(); url = value.href; }
      catch { throw new BadGatewayException('Т-Банк вернул небезопасную ссылку оплаты.'); }
    }
    if (requireUrl && status !== 'CONFIRMED' && !url) throw new BadGatewayException('Т-Банк не вернул ссылку оплаты.');
    const mapped = status === 'CONFIRMED' ? 'succeeded' : ['REJECTED', 'DEADLINE_EXPIRED', 'CANCELED'].includes(status) ? 'canceled' : 'pending';
    return { id, status: mapped, paid: mapped === 'succeeded', test, amount: { value: new Prisma.Decimal(amount).div(100).toFixed(2), currency: 'RUB' }, metadata: { order_id: request.orderId, order_number: request.orderNumber, payment_id: request.localPaymentId }, ...(url ? { confirmation: { type: 'redirect', confirmation_url: url } } : {}) };
  }
}
