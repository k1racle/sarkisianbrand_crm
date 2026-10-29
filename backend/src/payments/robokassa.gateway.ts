import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { PaymentCapabilities, PaymentGateway, PaymentRequest, VerifiedPayment } from './payment-gateway';
import { makeRobokassaUrl, RobokassaHash, verifyRobokassaResult } from './robokassa.protocol';

@Injectable()
export class RobokassaGateway extends PaymentGateway {
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService, private readonly config: ConfigService) { super(); }
  private callsEnabled() { return String(this.config.get('STOREFRONT_EXTERNAL_CALLS_ENABLED', 'false')) === 'true'; }
  private async settings() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ROBOKASSA' } });
    const config = (integration?.config || {}) as Record<string, unknown>, secrets = this.secrets.decrypt(integration?.encryptedSecrets);
    const merchantLogin = String(config.merchantLogin || '').trim(), algorithm = String(config.signatureAlgorithm || '').toUpperCase() as RobokassaHash;
    const production1 = String(secrets.password1 || ''), production2 = String(secrets.password2 || ''), test1 = String(secrets.testPassword1 || ''), test2 = String(secrets.testPassword2 || '');
    const isolatedSecrets = !!production1 && !!production2 && !!test1 && !!test2 && production1 !== test1 && production2 !== test2;
    const password1 = integration?.environment === 'TEST' ? test1 : production1, password2 = integration?.environment === 'TEST' ? test2 : production2;
    const fiscalMode = String(config.fiscalMode || '').trim().toUpperCase();
    const configured = !!merchantLogin && !/[:\s]/.test(merchantLogin) && merchantLogin.length <= 100 && isolatedSecrets && ['MD5', 'SHA256', 'SHA512'].includes(algorithm);
    return { integration, merchantLogin, algorithm, password1, password2, fiscalMode, configured, isolatedSecrets };
  }
  async capabilities(): Promise<PaymentCapabilities> {
    if (!this.callsEnabled()) return { provider: 'ROBOKASSA', available: false, externalCallsEnabled: false, configured: false, environment: null, reason: 'Онлайн-оплата отключена до проверки интеграции.' };
    const s = await this.settings();
    const reason = !s.integration?.isEnabled ? 'Робокасса отключена в настройках CRM.' : !s.isolatedSecrets ? 'Укажите разные тестовые и рабочие пары паролей Робокассы для одного магазина.' : !s.configured ? 'Заполните идентификатор магазина и алгоритм подписи.' : s.fiscalMode !== 'EXTERNAL' ? 'Сначала настройте выдачу чеков и подтвердите внешнюю фискализацию.' : null;
    return { provider: 'ROBOKASSA', available: !reason, externalCallsEnabled: true, configured: s.configured, environment: s.integration?.environment || null, reason };
  }
  async assertAvailable() { const value = await this.capabilities(); if (!value.available) throw new ServiceUnavailableException(value.reason!); }
  validateReturnUrl(value?: string) {
    let app: URL;
    try { app = new URL(String(this.config.get('PUBLIC_APP_URL') || '')); if (!['http:', 'https:'].includes(app.protocol) || app.username || app.password || app.search || app.hash || (app.protocol !== 'https:' && !['localhost','127.0.0.1','[::1]'].includes(app.hostname))) throw new Error(); }
    catch { throw new ServiceUnavailableException('Укажите корректный PUBLIC_APP_URL.'); }
    try { const url = new URL(value || '/payment/return', app.origin); if (url.origin !== app.origin || url.username || url.password || url.hash) throw new Error(); return url.href; }
    catch { throw new BadRequestException('Адрес возврата должен вести на этот интернет-магазин.'); }
  }
  async createPayment(request: PaymentRequest): Promise<VerifiedPayment> {
    await this.assertAvailable();
    if (!request.invoiceId || request.currency !== 'RUB') throw new BadRequestException('Некорректный номер или валюта платежа.');
    this.validateReturnUrl(request.returnUrl);
    const s = await this.settings();
    if (!this.callsEnabled() || !s.integration?.isEnabled || !s.configured || s.fiscalMode !== 'EXTERNAL') throw new ServiceUnavailableException('Робокасса отключена или настройки изменились.');
    let confirmationUrl: string;
    try { confirmationUrl = makeRobokassaUrl({ merchantLogin: s.merchantLogin, password1: s.password1, algorithm: s.algorithm, isTest: s.integration?.environment === 'TEST', amount: request.amount, invoiceId: request.invoiceId, localPaymentId: request.localPaymentId, description: `Заказ ${request.orderNumber}` }); }
    catch { throw new BadRequestException('Не удалось сформировать платёж Робокассы. Проверьте настройки.'); }
    return { id: String(request.invoiceId), status: 'pending', paid: false, test: s.integration?.environment === 'TEST', amount: { value: request.amount, currency: 'RUB' }, metadata: { order_id: request.orderId, order_number: request.orderNumber, payment_id: request.localPaymentId }, confirmation: { type: 'redirect', confirmation_url: confirmationUrl } };
  }
  async getPayment(): Promise<VerifiedPayment> { throw new ConflictException('Для сверки платежа Робокассы дождитесь подтверждения ResultURL или проверьте операцию в личном кабинете.'); }
  async verifyNotification(payload: Record<string, unknown>) {
    await this.assertAvailable();
    const s = await this.settings();
    if (!this.callsEnabled() || !s.integration?.isEnabled || !s.configured || s.fiscalMode !== 'EXTERNAL') throw new ServiceUnavailableException('Робокасса отключена или настройки изменились.');
    try { return verifyRobokassaResult({ outSum: payload.OutSum, invId: payload.InvId, signatureValue: payload.SignatureValue, extra: payload }, s.password2, s.algorithm); }
    catch { throw new BadRequestException('Некорректная подпись или параметры Робокассы.'); }
  }
}
