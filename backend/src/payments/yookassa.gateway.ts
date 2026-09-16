import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { PaymentCapabilities, PaymentGateway, PaymentRequest, VerifiedPayment } from './payment-gateway';

const API_URL = 'https://api.yookassa.ru/v3';
const PAYMENT_ID = /^[a-zA-Z0-9-]{1,64}$/;
const MONEY = /^\d{1,13}\.\d{2}$/;

@Injectable()
export class YooKassaGateway extends PaymentGateway {
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService, private readonly config: ConfigService) { super(); }

  private externalCallsEnabled() { return String(this.config.get('STOREFRONT_EXTERNAL_CALLS_ENABLED', 'false')) === 'true'; }

  private async settings() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'YOOKASSA' } });
    const publicConfig = (integration?.config || {}) as Record<string, unknown>;
    const credentials = this.secrets.decrypt(integration?.encryptedSecrets);
    const shopId = String(publicConfig.shopId || '').trim();
    const secretKey = String(credentials.secretKey || '').trim();
    return { integration, shopId, secretKey, configured: /^\d+$/.test(shopId) && Boolean(secretKey) };
  }

  async capabilities(): Promise<PaymentCapabilities> {
    if (!this.externalCallsEnabled()) return { provider: 'YOOKASSA', available: false, externalCallsEnabled: false, configured: false, environment: null, reason: 'Онлайн-оплата отключена до проверки интеграции на VPS.' };
    const { integration, configured } = await this.settings();
    let reason: string | null = null;
    if (!integration?.isEnabled) reason = 'Онлайн-оплата отключена в настройках экосистемы.';
    else if (!configured) reason = 'ЮKassa не настроена. Обратитесь к администратору.';
    try { this.validateReturnUrl(); } catch { reason = 'Не настроен адрес возврата после оплаты.'; }
    return { provider: 'YOOKASSA', available: !reason, externalCallsEnabled: true, configured, environment: integration?.environment || null, reason };
  }

  async assertAvailable() {
    const capability = await this.capabilities();
    if (!capability.available) throw new ServiceUnavailableException(capability.reason!);
  }

  validateReturnUrl(returnUrl?: string) {
    let app: URL;
    try {
      app = new URL(String(this.config.get('PUBLIC_APP_URL') || ''));
      if (!['https:', 'http:'].includes(app.protocol) || app.username || app.password || app.search || app.hash) throw new Error();
      if (app.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(app.hostname)) throw new Error();
    } catch { throw new ServiceUnavailableException('Укажите корректный PUBLIC_APP_URL: HTTPS или локальный адрес разработки.'); }
    if (!returnUrl) return new URL('/payment/return', app.origin).href;
    try {
      const candidate = new URL(returnUrl, app.origin);
      if (candidate.origin !== app.origin || candidate.username || candidate.password || candidate.hash) throw new Error();
      return candidate.href;
    } catch { throw new BadRequestException('Адрес возврата должен вести на этот интернет-магазин.'); }
  }

  async createPayment(request: PaymentRequest): Promise<VerifiedPayment> {
    await this.assertAvailable();
    if (!MONEY.test(request.amount) || Number(request.amount) <= 0 || request.currency !== 'RUB') throw new BadRequestException('Некорректная сумма или валюта платежа.');
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(request.idempotenceKey)) throw new BadRequestException('Некорректный ключ платежа.');
    const returnUrl = this.validateReturnUrl(request.returnUrl || `/orders/${encodeURIComponent(request.orderNumber)}`);
    return this.request('/payments', 'POST', {
      amount: { value: request.amount, currency: request.currency }, capture: true,
      confirmation: { type: 'redirect', return_url: returnUrl },
      description: ('Заказ ' + request.orderNumber).slice(0, 128),
      metadata: { order_id: request.orderId, order_number: request.orderNumber, payment_id: request.localPaymentId },
    }, request.idempotenceKey);
  }

  async getPayment(paymentId: string): Promise<VerifiedPayment> {
    await this.assertAvailable();
    if (!PAYMENT_ID.test(paymentId)) throw new BadRequestException('Некорректный идентификатор платежа.');
    return this.request('/payments/' + encodeURIComponent(paymentId), 'GET');
  }

  private async request(path: string, method: 'GET' | 'POST', body?: unknown, idempotenceKey?: string): Promise<VerifiedPayment> {
    if (!this.externalCallsEnabled()) throw new ServiceUnavailableException('Внешние вызовы платёжного провайдера отключены.');
    const { integration, shopId, secretKey, configured } = await this.settings();
    if (!integration?.isEnabled || !configured) throw new ServiceUnavailableException('ЮKassa отключена или не настроена.');
    try {
      const response = await fetch(API_URL + path, {
        method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: 'Basic ' + Buffer.from(shopId + ':' + secretKey).toString('base64'), 'Content-Type': 'application/json', ...(idempotenceKey ? { 'Idempotence-Key': idempotenceKey } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new Error('provider response');
      const data = await response.json() as VerifiedPayment;
      if (!PAYMENT_ID.test(data.id || '') || !['pending', 'waiting_for_capture', 'succeeded', 'canceled'].includes(data.status)
        || typeof data.paid !== 'boolean' || typeof data.test !== 'boolean' || !MONEY.test(data.amount?.value || '')
        || typeof data.amount?.currency !== 'string' || !data.metadata || typeof data.metadata !== 'object' || Array.isArray(data.metadata)) throw new Error('invalid provider response');
      if (data.test !== (integration.environment === 'TEST')) throw new Error('unexpected provider environment');
      if (data.confirmation?.confirmation_url) {
        const url = new URL(data.confirmation.confirmation_url);
        if (url.protocol !== 'https:' || url.username || url.password || !['yoomoney.ru', 'yookassa.ru'].some(host => url.hostname === host || url.hostname.endsWith('.' + host))) throw new Error('invalid confirmation url');
      }
      return data;
    } catch {
      throw new BadGatewayException('Не удалось подтвердить операцию в ЮKassa. Повторите попытку позже; новый платёж автоматически не создаётся.');
    }
  }
}
