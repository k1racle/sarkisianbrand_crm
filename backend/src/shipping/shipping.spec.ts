import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CdekProvider } from './cdek.provider';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PickupPointsQueryDto, ShippingEstimateDto } from './dto/shipping.dto';

describe('Доставка: только локальные проверки', () => {
  const integration = { isEnabled: true, environment: 'TEST', config: { clientId: 'mock-id', senderCityCode: '44' }, encryptedSecrets: 'mock' };
  let prisma: any;
  let network: jest.SpyInstance;
  let cdek: CdekProvider;
  let service: ShippingService;
  const dto: ShippingEstimateDto = { provider: 'CDEK', deliveryMethod: 'COURIER', city: 'Москва', cityCode: 44, street: 'Тестовая', house: '1' };
  beforeEach(() => {
    network = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Real network forbidden in tests'));
    prisma = { ecosystemIntegration: { findUnique: jest.fn().mockResolvedValue(integration) }, cart: { findUnique: jest.fn().mockResolvedValue({ items: [{ variantId: 'variant-1', quantity: 2, variant: { isActive: true, stock: 10, reserved: 2, options: { weightGrams: 100 } } }] }) }, shippingQuote: { create: jest.fn().mockResolvedValue({ id: 'mock-quote' }) }, order: { update: jest.fn(), findUnique: jest.fn() } };
    cdek = new CdekProvider(prisma, new ConfigService({}), { decrypt: () => ({ clientSecret: 'mock-secret' }) } as any);
    service = new ShippingService(prisma, cdek, cdek);
  });
  afterEach(() => jest.restoreAllMocks());

  it('по умолчанию не отправляет даже OAuth и не выдаёт фиктивный тариф/ПВЗ', async () => {
    expect(await cdek.calculate({ city: 'Москва', address: 'Тестовая', cityCode: 44 }, 200)).toMatchObject({ available: false, amount: null, requiresConfirmation: true });
    expect(await cdek.pickupPoints(44)).toMatchObject({ available: false, points: [] });
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ available: false, amount: null, canPay: false });
    expect((await service.capabilities()).providers.every(provider => !provider.available)).toBe(true);
    expect(network).not.toHaveBeenCalled();
    expect(prisma.shippingQuote.create).not.toHaveBeenCalled();
  });
  it('отправление не создаётся и не меняет заказ, резерв или склад', async () => {
    await expect(service.createShipment('TEST', { city: 'Москва', address: 'Тестовая' })).rejects.toThrow('Создание отправлений пока недоступно');
    expect(network).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
  it('Ozon не подменяется тарифом СДЭК', async () => {
    expect(await service.estimate('mock-session-123456', { ...dto, provider: 'OZON_DELIVERY' })).toMatchObject({ provider: 'OZON_DELIVERY', available: false, amount: null, canPay: false });
    expect(network).not.toHaveBeenCalled();
  });
  it('нет общей анонимной корзины или расчёта недоступного остатка', async () => {
    await expect(service.estimate(undefined, dto)).rejects.toThrow('идентификатор');
    await expect(service.estimate('anonymous-session', dto)).rejects.toThrow('идентификатор');
    prisma.cart.findUnique.mockResolvedValue({ items: [{ quantity: 5, variant: { isActive: true, stock: 10, reserved: 8, options: {} } }] });
    await expect(service.estimate('mock-session-123456', dto)).rejects.toThrow('недоступны');
    expect(network).not.toHaveBeenCalled();
  });
  it('сохраняет подтверждённый mock-расчёт с хешами и сроком 15 минут', async () => {
    jest.spyOn(cdek, 'capabilities').mockResolvedValue({ provider: 'CDEK', configured: true, available: true, requiresConfiguration: false, canEstimate: true, canListPickupPoints: true, canCreateShipment: false, message: 'mock' });
    jest.spyOn(cdek, 'cities').mockResolvedValue({ provider: 'CDEK', available: true, cities: [{ code: 44, city: 'Москва', region: 'Москва', country: 'Россия', countryCode: 'RU' }], message: 'mock' });
    jest.spyOn(cdek, 'calculate').mockResolvedValue({ provider: 'CDEK', available: true, amount: 420, currency: 'RUB', requiresConfirmation: false, message: 'mock' });
    const before = Date.now();
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ quoteId: 'mock-quote', amount: 420, canPay: true });
    const data = prisma.shippingQuote.create.mock.calls[0][0].data;
    expect(data.sessionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.destinationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.requestSnapshot.weightGrams).toBe(200);
    expect(data.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 900000);
    expect(network).not.toHaveBeenCalled();
  });
  it('сохраняет название/адрес ПВЗ исключительно из ответа перевозчика', async () => {
    jest.spyOn(cdek, 'capabilities').mockResolvedValue({ provider: 'CDEK', configured: true, available: true, requiresConfiguration: false, canEstimate: true, canListPickupPoints: true, canCreateShipment: false, message: 'mock' });
    jest.spyOn(cdek, 'cities').mockResolvedValue({ provider: 'CDEK', available: true, cities: [{ code: 44, city: 'Москва', region: 'Москва', country: 'Россия', countryCode: 'RU' }], message: 'mock' });
    jest.spyOn(cdek, 'pickupPoints').mockResolvedValue({ available: true, points: [{ code: 'MOCK-PVZ', cityCode: 44, name: 'Подтверждённый ПВЗ', address: 'Официальная, 10', latitude: 1, longitude: 2, workTime: '' }], message: 'mock' });
    jest.spyOn(cdek, 'calculate').mockResolvedValue({ provider: 'CDEK', available: true, amount: 420, currency: 'RUB', requiresConfirmation: false, message: 'mock' });
    await service.estimate('mock-session-123456', { ...dto, deliveryMethod: 'PICKUP_POINT', street: undefined, house: undefined, city: '  москва ', pickupPointCode: 'MOCK-PVZ', pickupPointAddress: 'Подменённый адрес', pickupPointName: 'Подменённое название' } as ShippingEstimateDto);
    expect(prisma.shippingQuote.create.mock.calls[0][0].data.requestSnapshot).toMatchObject({ city: 'Москва', cityCode: 44, pickupPointAddress: 'Официальная, 10', pickupPointName: 'Подтверждённый ПВЗ' });
    expect(network).not.toHaveBeenCalled();
  });
  it('не сохраняет расчёт при противоречии города/кода или недоступном справочнике', async () => {
    jest.spyOn(cdek, 'capabilities').mockResolvedValue({ provider: 'CDEK', configured: true, available: true, requiresConfiguration: false, canEstimate: true, canListPickupPoints: true, canCreateShipment: false, message: 'mock' });
    const lookup = jest.spyOn(cdek, 'cities').mockResolvedValue({ provider: 'CDEK', available: true, cities: [{ code: 99, city: 'Москва', region: '', country: '', countryCode: 'RU' }], message: 'mock' });
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ amount: null, canPay: false });
    lookup.mockResolvedValue({ provider: 'CDEK', available: true, cities: [{ code: 44, city: 'Другой город', region: '', country: '', countryCode: 'RU' }], message: 'mock' });
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ amount: null, canPay: false });
    lookup.mockResolvedValue({ provider: 'CDEK', available: false, cities: [], message: 'mock' });
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ amount: null, canPay: false });
    expect(prisma.shippingQuote.create).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
  it('не подставляет вес 500 г при отсутствии метаданных', async () => {
    jest.spyOn(cdek, 'capabilities').mockResolvedValue({ provider: 'CDEK', configured: true, available: true, requiresConfiguration: false, canEstimate: true, canListPickupPoints: true, canCreateShipment: false, message: 'mock' });
    prisma.cart.findUnique.mockResolvedValue({ items: [{ quantity: 1, variant: { isActive: true, stock: 10, reserved: 0, options: {} } }] });
    expect(await service.estimate('mock-session-123456', dto)).toMatchObject({ amount: null, canPay: false });
    expect(network).not.toHaveBeenCalled();
  });
  it('оба старых маршрута ограничены сотрудниками склада/руководителем/админом', () => {
    for (const method of ['calculate', 'createShipment']) {
      expect(Reflect.getMetadata('roles', ShippingController.prototype[method])).toEqual(['ADMIN', 'WAREHOUSE', 'SUPERVISOR']);
      expect(Reflect.getMetadata('__guards__', ShippingController.prototype[method])).toHaveLength(2);
    }
  });
  it('проверяет провайдера, метод, адрес и код города на границе HTTP', async () => {
    expect(await validate(plainToInstance(ShippingEstimateDto, dto))).toHaveLength(0);
    for (const bad of [{ ...dto, provider: 'FAKE' }, { ...dto, deliveryMethod: 'OTHER' }, { ...dto, street: '' }, { ...dto, cityCode: -1 }]) expect((await validate(plainToInstance(ShippingEstimateDto, bad))).length).toBeGreaterThan(0);
    expect(await validate(plainToInstance(PickupPointsQueryDto, { cityCode: '44' }))).toHaveLength(0);
    expect((await validate(plainToInstance(PickupPointsQueryDto, { cityCode: 'bad' }))).length).toBeGreaterThan(0);
  });
});
