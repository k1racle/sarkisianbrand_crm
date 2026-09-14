import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingAddressDto } from './dto/shipping.dto';
import { ShippingProvider } from './shipping-provider';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService, private readonly provider: ShippingProvider) {}

  async calculate(orderNumber: string, dto: ShippingAddressDto) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: { include: { variant: true } } } });
    if (!order) throw new NotFoundException('Заказ не найден');
    const weight = dto.weightGrams || order.items.reduce((sum, item) => sum + item.quantity * 500, 0);
    return this.provider.calculate(dto, weight);
  }

  async createShipment(orderNumber: string, dto: ShippingAddressDto) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: { include: { variant: true } } } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.CONFIRMED) throw new BadRequestException('Отправление можно создать только для подтверждённого или оплаченного заказа');
    const weight = dto.weightGrams || order.items.reduce((sum, item) => sum + item.quantity * 500, 0);
    const [quote, shipment] = await Promise.all([this.provider.calculate(dto, weight), this.provider.createShipment(orderNumber, dto, weight)]);
    await this.prisma.order.update({ where: { id: order.id }, data: { shippingAddress: dto as unknown as Prisma.InputJsonValue, shippingProvider: shipment.provider, trackingNumber: shipment.trackingNumber, shippingCost: quote.amount, status: OrderStatus.SHIPPED } });
    return { quote, shipment };
  }
}
