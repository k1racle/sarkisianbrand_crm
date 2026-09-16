import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';
import { ShippingAddress, Shipment, ShippingProvider, ShippingQuote } from './shipping-provider';

export const externalShippingCallsEnabled = (config: ConfigService) => config.get<string>('STOREFRONT_EXTERNAL_CALLS_ENABLED') === 'true';
export function unavailableShipping(provider = 'CDEK', message = 'Стоимость доставки будет подтверждена до оплаты'): ShippingQuote {
  return { provider, available: false, amount: null, currency: 'RUB', requiresConfirmation: true, message };
}

@Injectable()
export class CdekProvider extends ShippingProvider {
  private token?: { key: string; value: string; expiresAt: number };
  private readonly cityCache = new Map<string, { expiresAt: number; cities: Array<{ code: number; city: string; region: string; country: string; countryCode: string }> }>();
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly secrets: IntegrationSecretsService) { super(); }
  private async settings() {
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key: 'CDEK' } });
    if (!integration?.isEnabled) return null;
    const values = { ...(integration.config as Record<string, string> || {}), ...this.secrets.decrypt(integration.encryptedSecrets) };
    const senderCityCode = Number(values.senderCityCode);
    if (!values.clientId || !values.clientSecret || !Number.isInteger(senderCityCode) || senderCityCode < 1) return null;
    return { clientId: values.clientId, clientSecret: values.clientSecret, senderCityCode, baseUrl: integration.environment === 'PRODUCTION' ? 'https://api.cdek.ru/v2' : 'https://api.edu.cdek.ru/v2' };
  }
  async capabilities() {
    const configured = Boolean(await this.settings());
    const enabled = externalShippingCallsEnabled(this.config);
    return { provider: 'CDEK', configured, available: configured && enabled, requiresConfiguration: !configured, canEstimate: configured && enabled, canListPickupPoints: configured && enabled, canCreateShipment: false, message: !enabled ? 'Внешние запросы отключены. Доставка подтверждается до оплаты' : configured ? 'Для расчёта нужны веса товаров и код города' : 'Заполните реквизиты СДЭК и код города отправителя в настройках экосистемы' };
  }
  private async request(path: string, settings: NonNullable<Awaited<ReturnType<CdekProvider['settings']>>>, body?: unknown) {
    // The guard covers OAuth as well as every carrier request.
    if (!externalShippingCallsEnabled(this.config)) throw new ServiceUnavailableException('Внешние запросы доставки отключены');
    const key = createHash('sha256').update(`${settings.baseUrl}:${settings.clientId}:${settings.clientSecret}`).digest('hex');
    if (!this.token || this.token.key !== key || this.token.expiresAt <= Date.now()) {
      const response = await fetch(`${settings.baseUrl}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: settings.clientId, client_secret: settings.clientSecret }), signal: AbortSignal.timeout(10000), redirect: 'error' });
      if (!response.ok) throw new ServiceUnavailableException('Не удалось авторизоваться в службе доставки');
      const result = await response.json() as { access_token?: string; expires_in?: number };
      if (!result.access_token || !Number.isFinite(Number(result.expires_in)) || Number(result.expires_in) <= 60) throw new ServiceUnavailableException('Некорректный ответ авторизации службы доставки');
      this.token = { key, value: result.access_token, expiresAt: Date.now() + (Number(result.expires_in) - 60) * 1000 };
    }
    const response = await fetch(`${settings.baseUrl}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.token.value}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) { if (response.status === 401) this.token = undefined; throw new ServiceUnavailableException('Служба доставки временно недоступна'); }
    return response.json();
  }
  async calculate(address: ShippingAddress, weightGrams: number): Promise<ShippingQuote> {
    if (!externalShippingCallsEnabled(this.config)) return unavailableShipping();
    const settings = await this.settings();
    if (!settings) return unavailableShipping('CDEK', 'Для расчёта нужно настроить интеграцию СДЭК');
    if (!Number.isInteger(weightGrams) || weightGrams <= 0 || !Number.isInteger(address.cityCode) || Number(address.cityCode) <= 0) return unavailableShipping('CDEK', 'Для расчёта необходимы вес товаров и код города СДЭК');
    try {
      const result = await this.request('/calculator/tariff', settings, { type: 1, currency: 1, tariff_code: address.deliveryMethod === 'PICKUP_POINT' ? 136 : 137, from_location: { code: settings.senderCityCode }, to_location: { code: address.cityCode }, packages: [{ weight: weightGrams }] }) as { total_sum?: number; period_max?: number; errors?: unknown[] };
      if (result.errors?.length || typeof result.total_sum !== 'number' || !Number.isFinite(result.total_sum) || result.total_sum < 0) return unavailableShipping('CDEK', 'Служба доставки не смогла рассчитать тариф');
      return { provider: 'CDEK', available: true, amount: Math.round(result.total_sum * 100) / 100, currency: 'RUB', requiresConfirmation: false, ...(Number.isInteger(result.period_max) ? { estimatedDays: result.period_max } : {}), message: 'Стоимость рассчитана службой доставки' };
    } catch { return unavailableShipping('CDEK', 'Не удалось рассчитать доставку. Стоимость будет подтверждена до оплаты'); }
  }
  async cities(search: string) {
    const unavailable = (message: string) => ({ provider: 'CDEK', available: false, cities: [], message });
    // Safe mode must not serve a previously cached live result as a new confirmed lookup.
    if (!externalShippingCallsEnabled(this.config)) return unavailable('Внешние запросы отключены. Город доставки будет согласован до оплаты');
    if (typeof search !== 'string' || search.trim().length < 2 || search.trim().length > 100) return unavailable('Введите название города: от 2 до 100 символов');
    const settings = await this.settings();
    if (!settings) return unavailable('Для поиска городов настройте интеграцию СДЭК');
    const normalized = search.trim();
    const cacheKey = createHash('sha256').update(`${settings.baseUrl}:${settings.clientId}:${settings.clientSecret}:${normalized.toLocaleLowerCase('ru')}`).digest('hex');
    const cached = this.cityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { provider: 'CDEK', available: true, cities: cached.cities, message: cached.cities.length ? 'Выберите город и регион' : 'Города не найдены. Уточните название' };
    try {
      const query = new URLSearchParams({ city: normalized, country_code: 'RU', size: '20', page: '0' });
      const response = await this.request(`/location/cities?${query}`, settings);
      if (!Array.isArray(response)) throw new Error('Invalid city response');
      const unique = new Map<number, { code: number; city: string; region: string; country: string; countryCode: string }>();
      for (const value of response) {
        if (!value || !Number.isInteger(value.code) || value.code < 1 || typeof value.city !== 'string' || !value.city.trim() || value.country_code !== 'RU') continue;
        if (unique.has(value.code)) continue;
        unique.set(value.code, { code: value.code, city: value.city.trim(), region: typeof value.region === 'string' ? value.region : '', country: typeof value.country === 'string' ? value.country : '', countryCode: value.country_code });
        if (unique.size === 20) break;
      }
      const cities = [...unique.values()];
      for (const [key, value] of this.cityCache) if (value.expiresAt <= Date.now()) this.cityCache.delete(key);
      if (this.cityCache.size >= 100) this.cityCache.delete(this.cityCache.keys().next().value!);
      this.cityCache.set(cacheKey, { cities, expiresAt: Date.now() + 5 * 60 * 1000 });
      return { provider: 'CDEK', available: true, cities, message: cities.length ? 'Выберите город и регион' : 'Города не найдены. Уточните название' };
    } catch { return unavailable('Не удалось получить города СДЭК. Доставка будет согласована до оплаты'); }
  }
  async pickupPoints(cityCode: number) {
    if (!externalShippingCallsEnabled(this.config)) return { available: false, points: [], message: 'Внешние запросы отключены. Пункт выдачи будет согласован до оплаты' };
    const settings = await this.settings();
    if (!settings) return { available: false, points: [], message: 'Необходимо настроить интеграцию СДЭК' };
    try {
      const response = await this.request(`/deliverypoints?city_code=${cityCode}&type=PVZ`, settings);
      if (!Array.isArray(response)) throw new Error('Invalid response');
      const points = response.filter(point => point.code && point.location?.address).map(point => ({ code: String(point.code), name: String(point.name || point.code), address: String(point.location.address), cityCode: point.location.city_code, latitude: point.location.latitude, longitude: point.location.longitude, workTime: point.work_time }));
      return { available: true, points, message: points.length ? 'Пункты выдачи СДЭК' : 'В этом городе пункты выдачи не найдены' };
    } catch { return { available: false, points: [], message: 'Не удалось получить пункты выдачи. Выбор будет согласован до оплаты' }; }
  }
  async createShipment(_orderNumber: string, _address: ShippingAddress, _weightGrams: number): Promise<Shipment> {
    throw new ServiceUnavailableException('Создание отправлений пока недоступно. Отправление оформляется сотрудником после подтверждения доставки');
  }
}
