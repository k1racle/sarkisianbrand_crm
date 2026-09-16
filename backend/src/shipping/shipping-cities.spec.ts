import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CdekProvider } from './cdek.provider';
import { ShippingCitiesQueryDto } from './dto/shipping.dto';

describe('Поиск городов СДЭК: только mock HTTP', () => {
  let network: jest.SpyInstance;
  const values = { STOREFRONT_EXTERNAL_CALLS_ENABLED: 'true' };
  const integration = { isEnabled: true, environment: 'TEST', config: { clientId: 'mock', senderCityCode: '44' } };
  let provider: CdekProvider;
  const response = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
  beforeEach(() => {
    values.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'true';
    network = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('No real HTTP allowed'));
    provider = new CdekProvider({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(integration) } } as any, { get: key => values[key] } as ConfigService, { decrypt: () => ({ clientSecret: 'mock-secret' }) } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it('проверяет query: 2–100 символов после trim, не принимает числа', async () => {
    const valid = plainToInstance(ShippingCitiesQueryDto, { search: '  Москва  ' }, { enableImplicitConversion: true });
    expect(valid.search).toBe('Москва');
    expect(await validate(valid)).toHaveLength(0);
    for (const search of [' ', 'М', 'x'.repeat(101), 123, true]) expect((await validate(plainToInstance(ShippingCitiesQueryDto, { search }, { enableImplicitConversion: true }))).length).toBeGreaterThan(0);
  });
  it('не делает OAuth/HTTP при выключенном флаге, неверном query или выключенной интеграции', async () => {
    values.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'false';
    expect(await provider.cities('Москва')).toMatchObject({ available: false, cities: [] });
    values.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'true';
    expect(await provider.cities('М')).toMatchObject({ available: false, cities: [] });
    const disabled = new CdekProvider({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue({ ...integration, isEnabled: false }) } } as any, new ConfigService(values), { decrypt: () => ({}) } as any);
    expect(await disabled.cities('Москва')).toMatchObject({ available: false, cities: [] });
    expect(network).not.toHaveBeenCalled();
  });
  it('возвращает только полученные валидные коды России, кэширует и не отдаёт кэш в safe mode', async () => {
    network.mockResolvedValueOnce(response({ access_token: 'mock-token', expires_in: 3600 })).mockResolvedValueOnce(response([
      { code: 44, city: 'Москва', region: 'Москва', country: 'Россия', country_code: 'RU' },
      { code: 44, city: 'Москва', country_code: 'RU' },
      { code: 99, city: 'Москва', region: 'Другой регион', country_code: 'RU' },
      { code: -1, city: 'Неверный', country_code: 'RU' },
      { code: '12', city: 'Строковый код', country_code: 'RU' },
      { code: 123, city: 'Не Россия', country_code: 'OTHER' },
    ]));
    const result = await provider.cities('Москва');
    expect(result).toMatchObject({ available: true, cities: [{ code: 44, city: 'Москва', countryCode: 'RU' }, { code: 99, city: 'Москва', region: 'Другой регион' }] });
    const url = new URL(network.mock.calls[1][0]);
    expect(url.pathname).toBe('/v2/location/cities');
    expect(url.searchParams.get('city')).toBe('Москва');
    expect(url.searchParams.get('country_code')).toBe('RU');
    expect(url.searchParams.get('size')).toBe('20');
    expect(await provider.cities(' москва ')).toEqual(result);
    expect(network).toHaveBeenCalledTimes(2);
    values.STOREFRONT_EXTERNAL_CALLS_ENABLED = 'false';
    expect(await provider.cities('Москва')).toMatchObject({ available: false, cities: [] });
    expect(network).toHaveBeenCalledTimes(2);
  });
  it('ограничивает результат 20 городами и не выдумывает код при ошибке', async () => {
    network.mockResolvedValueOnce(response({ access_token: 'mock-token', expires_in: 3600 })).mockResolvedValueOnce(response(Array.from({ length: 35 }, (_, index) => ({ code: index + 1, city: 'Город', country_code: 'RU' }))));
    expect((await provider.cities('Город')).cities).toHaveLength(20);
    network.mockRejectedValue(new Error('Timeout'));
    expect(await provider.cities('Другой')).toMatchObject({ available: false, cities: [] });
  });
});
