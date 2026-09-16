import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';

type OneCSettings = {
  integrationId: string;
  baseUrl: string;
  username: string;
  password: string;
  exchangeSecret?: string;
  timeout: number;
  config: Record<string, unknown>;
};

@Injectable()
export class OneCClientService {
  constructor(private readonly prisma: PrismaService, private readonly secrets: IntegrationSecretsService) {}

  async status() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' } });
    return integration ? {
      enabled: integration.isEnabled,
      status: integration.status,
      environment: integration.environment,
      configured: Boolean((integration.config as any)?.baseUrl && integration.configuredSecretKeys.includes('password')),
      baseUrl: this.safeUrl(String((integration.config as any)?.baseUrl || '')),
      lastTestAt: integration.lastTestAt,
      lastTestMessage: integration.lastTestMessage,
    } : { enabled: false, status: IntegrationStatus.NOT_CONFIGURED, configured: false };
  }

  async testConnection() {
    const startedAt = Date.now();
    try {
      const settings = await this.settings();
      const path = String(settings.config.healthPath || '/hs/sarkisian/v1/health');
      const result = await this.request(settings, path, { method: 'GET' });
      const latencyMs = Date.now() - startedAt;
      const message = `1С доступна, ответ ${result.status}, ${latencyMs} мс`;
      await this.prisma.$transaction([
        this.prisma.ecosystemIntegration.update({ where: { id: settings.integrationId }, data: { status: IntegrationStatus.CONNECTED, lastTestAt: new Date(), lastTestMessage: message } }),
        this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'CONNECTION_TEST', status: 'SUCCESS', message, details: { latencyMs, httpStatus: result.status } } }),
      ]);
      return { success: true, message, latencyMs, response: result.data };
    } catch (error: any) {
      const message = String(error?.message || error).slice(0, 1000);
      const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { id: true } });
      await Promise.allSettled([
        integration ? this.prisma.ecosystemIntegration.update({ where: { id: integration.id }, data: { status: IntegrationStatus.ERROR, lastTestAt: new Date(), lastTestMessage: message } }) : Promise.resolve(),
        this.prisma.syncLog.create({ data: { system: '1C_KA', action: 'CONNECTION_TEST', status: 'ERROR', message } }),
      ]);
      throw error;
    }
  }

  async get(pathKey: string, fallback: string) {
    const settings = await this.settings();
    return (await this.request(settings, String(settings.config[pathKey] || fallback), { method: 'GET' })).data;
  }

  async post(pathKey: string, fallback: string, body: unknown) {
    const settings = await this.settings();
    return (await this.request(settings, String(settings.config[pathKey] || fallback), { method: 'POST', body })).data;
  }

  async verifyInboundSecret(value?: string) {
    if (!value) return false;
    const settings = await this.settings();
    if (!settings.exchangeSecret) return false;
    const provided = Buffer.from(value);
    const expected = Buffer.from(settings.exchangeSecret);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  async configuration() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { config: true } });
    return (integration?.config || {}) as Record<string, unknown>;
  }

  private async settings(): Promise<OneCSettings> {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' } });
    if (!integration?.isEnabled) throw new ServiceUnavailableException('Интеграция с 1С выключена');
    if (integration.status === IntegrationStatus.NOT_CONFIGURED || integration.status === IntegrationStatus.DISABLED) throw new ServiceUnavailableException('Заполните обязательные настройки интеграции с 1С');
    const config = (integration.config || {}) as Record<string, unknown>;
    const secrets = this.secrets.decrypt(integration.encryptedSecrets);
    const baseUrl = String(config.baseUrl || '').trim();
    if (!baseUrl || !config.username || !secrets.password) throw new ServiceUnavailableException('Не заданы адрес, пользователь или пароль 1С');
    let parsed: URL;
    try { parsed = new URL(baseUrl); } catch { throw new ServiceUnavailableException('Адрес HTTP-сервиса 1С некорректен'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new ServiceUnavailableException('Для 1С разрешены только HTTP и HTTPS');
    return {
      integrationId: integration.id,
      baseUrl: parsed.toString(),
      username: String(config.username),
      password: secrets.password,
      exchangeSecret: secrets.exchangeSecret,
      timeout: Math.min(120000, Math.max(2000, Number(config.requestTimeoutMs || 15000))),
      config,
    };
  }

  private async request(settings: OneCSettings, path: string, options: { method: 'GET' | 'POST'; body?: unknown }) {
    if (process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException('Внешние вызовы отключены. Проверка 1С будет доступна после разрешения интеграций на VPS');
    }
    const url = new URL(path.replace(/^\//, ''), settings.baseUrl.endsWith('/') ? settings.baseUrl : `${settings.baseUrl}/`);
    const body = options.body === undefined ? '' : JSON.stringify(options.body);
    const timestamp = String(Date.now());
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${settings.username}:${settings.password}`).toString('base64')}`,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Sarkisian-Timestamp': timestamp,
      'X-Correlation-Id': `1c-${timestamp}`,
    };
    if (settings.exchangeSecret) headers['X-Sarkisian-Signature'] = createHmac('sha256', settings.exchangeSecret).update(`${timestamp}.${body}`).digest('hex');
    let response: Response;
    try {
      response = await fetch(url, { method: options.method, headers, body: options.body === undefined ? undefined : body, signal: AbortSignal.timeout(settings.timeout) });
    } catch (error: any) {
      throw new BadGatewayException(`Нет соединения с 1С: ${error?.cause?.code || error?.message || 'сетевая ошибка'}`);
    }
    const text = await response.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text.slice(0, 2000); }
    if (!response.ok) throw new BadGatewayException(`1С вернула HTTP ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    return { status: response.status, data };
  }

  private safeUrl(value: string) {
    try { const url = new URL(value); return `${url.protocol}//${url.host}${url.pathname}`; } catch { return null; }
  }
}
