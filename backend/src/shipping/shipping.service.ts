import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingAddressDto, ShippingEstimateDto } from './dto/shipping.dto';
import { ShippingProvider } from './shipping-provider';
import { CdekProvider, unavailableShipping } from './cdek.provider';
import { hashCartSession, hashShippingDestination } from '../common/storefront-utils';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService, private readonly provider: ShippingProvider, private readonly cdek: CdekProvider) {}

  async capabilities() {
    return { providers: [await this.cdek.capabilities(), { provider: 'OZON_DELIVERY', configured: false, available: false, requiresConfiguration: true, canEstimate: false, canListPickupPoints: false, canCreateShipment: false, message: 'Автоматическая доставка Ozon пока не подключена. Условия будут согласованы до оплаты' }] };
  }

  private weight(items: Array<{ quantity: number; variant: { options: unknown } | null }>): number | null {
    let total = 0;
    for (const item of items) {
      const options = item.variant?.options as Record<string, unknown> | null;
      const weight = options?.weightGrams;
      if (typeof weight !== 'number' || !Number.isInteger(weight) || weight <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0) return null;
      total += weight * item.quantity;
    }
    return Number.isSafeInteger(total) && total > 0 ? total : null;
  }

  async estimate(session: string | undefined, dto: ShippingEstimateDto, userId?: string) {
    if (!session || !/^[A-Za-z0-9_-]{16,128}$/.test(session) || session === 'anonymous-session') throw new BadRequestException('Необходимо передать идентификатор корзины');
    if (!dto.city.trim() || (dto.deliveryMethod === 'COURIER' && (!dto.street?.trim() || !dto.house?.trim()))) throw new BadRequestException('Укажите город и адрес доставки');
    const cart = await this.prisma.cart.findUnique({ where: { sessionId: session }, include: { items: { include: { variant: true } } } });
    if (cart?.userId && cart.userId !== userId) throw new ForbiddenException('Нет доступа к корзине');
    if (!cart?.items.length) throw new BadRequestException('Корзина пуста');
    if (cart.items.some(item => !item.variant.isActive || item.variant.stock - item.variant.reserved < item.quantity)) throw new BadRequestException('Некоторые товары недоступны в указанном количестве');
    if (dto.provider === 'OZON_DELIVERY') return { ...unavailableShipping('OZON_DELIVERY', 'Доставка Ozon пока не подключена. Стоимость будет подтверждена до оплаты'), canPay: false };
    const capability = await this.cdek.capabilities();
    if (!capability.available) return { ...unavailableShipping('CDEK', capability.message), canPay: false };
    const weight = this.weight(cart.items);
    if (weight === null) return { ...unavailableShipping('CDEK', 'У товаров не заполнен вес. Стоимость доставки будет подтверждена до оплаты'), canPay: false };
    if (!dto.cityCode) return { ...unavailableShipping('CDEK', 'Выберите город из подтверждённого справочника СДЭК'), canPay: false };
    const cities = await this.cdek.cities(dto.city);
    const verifiedCity = cities.available ? cities.cities.find(city => city.code === dto.cityCode && city.city.trim().toLocaleLowerCase('ru') === dto.city.trim().toLocaleLowerCase('ru')) : undefined;
    if (!verifiedCity) return { ...unavailableShipping('CDEK', 'Не удалось подтвердить город доставки. Выберите город и регион заново'), canPay: false };
    const canonical: ShippingEstimateDto = { provider: dto.provider, deliveryMethod: dto.deliveryMethod, city: verifiedCity.city.trim(), cityCode: verifiedCity.code, ...(dto.deliveryMethod === 'COURIER' ? { street: dto.street!.trim(), house: dto.house!.trim() } : { pickupPointCode: dto.pickupPointCode }) };
    let verifiedPickup: { pickupPointAddress: string; pickupPointName: string } | undefined;
    if (dto.deliveryMethod === 'PICKUP_POINT') {
      if (!dto.pickupPointCode || !dto.cityCode) return { ...unavailableShipping('CDEK', 'Выберите подтверждённый пункт выдачи СДЭК'), canPay: false };
      const points = await this.cdek.pickupPoints(dto.cityCode);
      const selected = points.available ? points.points.find(point => point.code === dto.pickupPointCode && point.cityCode === verifiedCity.code) : undefined;
      if (!selected || !selected.address.trim()) return { ...unavailableShipping('CDEK', 'Не удалось подтвердить выбранный пункт выдачи'), canPay: false };
      canonical.pickupPointCode = selected.code;
      verifiedPickup = { pickupPointAddress: selected.address.trim(), pickupPointName: selected.name.trim() || selected.code };
    }
    const quote = await this.provider.calculate({ ...canonical, address: verifiedPickup?.pickupPointAddress || [canonical.street, canonical.house].filter(Boolean).join(', ') }, weight);
    if (!quote.available || quote.amount === null) return { ...quote, canPay: false };
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const saved = await this.prisma.shippingQuote.create({ data: { sessionHash: hashCartSession(session), destinationHash: hashShippingDestination(canonical), provider: canonical.provider, deliveryMethod: canonical.deliveryMethod, amount: quote.amount, currency: 'RUB', requestSnapshot: { ...canonical, region: verifiedCity.region, country: verifiedCity.country, countryCode: verifiedCity.countryCode, ...(verifiedPickup || {}), weightGrams: weight, cartItems: cart.items.map(item => ({ variantId: item.variantId, quantity: item.quantity })).sort((a, b) => a.variantId.localeCompare(b.variantId)) } as unknown as Prisma.InputJsonValue, expiresAt } });
    return { ...quote, canPay: true, quoteId: saved.id, expiresAt: expiresAt.toISOString() };
  }

  async pickupPoints(provider: string | undefined, cityCode: number) {
    if (provider === 'OZON_DELIVERY') return { available: false, points: [], message: 'Автоматический выбор пунктов выдачи Ozon пока не подключён' };
    return this.cdek.pickupPoints(cityCode);
  }

  async calculate(orderNumber: string, dto: ShippingAddressDto) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: { include: { variant: true } } } });
    if (!order) throw new NotFoundException('Заказ не найден');
    const weight = this.weight(order.items);
    if (weight === null) return unavailableShipping('CDEK', 'У товаров не заполнен вес. Стоимость доставки будет подтверждена до оплаты');
    return this.provider.calculate(dto, weight);
  }

  async createShipment(orderNumber: string, dto: ShippingAddressDto) {
    // No order writes, stock changes or 1C calls until a real shipment adapter is implemented.
    return this.provider.createShipment(orderNumber, dto, 0);
  }
}
