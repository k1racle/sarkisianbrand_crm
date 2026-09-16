import { ConfigService } from '@nestjs/config';
import { CdekProvider } from './cdek.provider';

describe('Адаптер СДЭК: исключительно mock HTTP', () => {
  let network: jest.SpyInstance;
  const address = { city: 'Москва', cityCode: 44, address: 'Тестовая', deliveryMethod: 'COURIER' as const };
  const integration = { isEnabled: true, environment: 'TEST', config: { clientId: 'mock-id', senderCityCode: '44' }, encryptedSecrets: 'mock' };
  const make = (flag: string | undefined = 'true', record: any = integration) => new CdekProvider({ ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(record) } } as any, new ConfigService(flag === undefined ? {} : { STOREFRONT_EXTERNAL_CALLS_ENABLED: flag }), { decrypt: () => ({ clientSecret: 'mock-secret' }) } as any);
  const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  beforeEach(() => { network = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('No real network')); });
  afterEach(() => jest.restoreAllMocks());

  it('собирает OAuth/calculator запросы и кэширует токен, но не обращается к настоящей сети', async () => {
    network.mockResolvedValueOnce(response({ access_token: 'mock-token', expires_in: 3600 })).mockResolvedValue(response({ total_sum: 456.78, period_max: 4 }));
    const provider = make();
    expect(await provider.calculate(address, 200)).toMatchObject({ available: true, amount: 456.78, estimatedDays: 4, requiresConfirmation: false });
    await provider.calculate({ ...address, deliveryMethod: 'PICKUP_POINT' }, 200);
    expect(network).toHaveBeenCalledTimes(3);
    expect(network.mock.calls[0][0]).toBe('https://api.edu.cdek.ru/v2/oauth/token');
    expect(network.mock.calls[0][1].body.get('grant_type')).toBe('client_credentials');
    expect(network.mock.calls[1][0]).toBe('https://api.edu.cdek.ru/v2/calculator/tariff');
    expect(JSON.parse(network.mock.calls[1][1].body)).toMatchObject({ tariff_code: 137, packages: [{ weight: 200 }], from_location: { code: 44 }, to_location: { code: 44 } });
    expect(JSON.parse(network.mock.calls[2][1].body).tariff_code).toBe(136);
  });
  it('разрешает только точное true, отклоняет ненастроенные реквизиты и неверный вес', async () => {
    for (const flag of ['', 'false', 'TRUE', '1']) expect(await make(flag).calculate(address, 200)).toMatchObject({ amount: null, available: false });
    expect(await make('true', { ...integration, isEnabled: false }).calculate(address, 200)).toMatchObject({ amount: null });
    expect(await make().calculate(address, 0)).toMatchObject({ amount: null });
    expect(await make().calculate({ ...address, cityCode: undefined }, 200)).toMatchObject({ amount: null });
    expect(network).not.toHaveBeenCalled();
  });
  it('ошибки, таймауты и некорректные суммы не превращаются в бесплатную доставку', async () => {
    for (const body of [{ total_sum: -1 }, { total_sum: '391' }, { total_sum: 0, errors: [{ code: 'ERROR' }] }, {}]) {
      network.mockReset().mockResolvedValueOnce(response({ access_token: 'mock-token', expires_in: 3600 })).mockResolvedValueOnce(response(body));
      expect(await make().calculate(address, 200)).toMatchObject({ amount: null, available: false, requiresConfirmation: true });
    }
    network.mockReset().mockRejectedValue(new Error('Timeout'));
    expect(await make().calculate(address, 200)).toMatchObject({ amount: null, available: false });
  });
  it('возвращает только полученные ПВЗ без фиктивных точек', async () => {
    network.mockResolvedValueOnce(response({ access_token: 'mock-token', expires_in: 3600 })).mockResolvedValueOnce(response([{ code: 'MOCK', name: 'Тестовый', location: { address: 'Тестовая, 1', city_code: 44, latitude: 1, longitude: 2 } }, { code: 'NO_ADDRESS' }]));
    expect(await make().pickupPoints(44)).toMatchObject({ available: true, points: [{ code: 'MOCK', address: 'Тестовая, 1' }] });
    expect(network.mock.calls[1][0]).toBe('https://api.edu.cdek.ru/v2/deliverypoints?city_code=44&type=PVZ');
  });
});
