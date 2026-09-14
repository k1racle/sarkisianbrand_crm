import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(sessionId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({ where: { sessionId }, include: { items: { include: { variant: { include: { product: true } } } } } });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Корзина пуста');
    const total = cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    const orderNumber = `SB-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const reserved = await tx.productVariant.updateMany({ where: { id: item.variantId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity }, reserved: { increment: item.quantity } } });
        if (reserved.count !== 1) throw new BadRequestException(`Недостаточно товара: ${item.variant.product.nameRu}`);
      }
      const order = await tx.order.create({ data: { orderNumber, status: OrderStatus.NEW, totalAmount: total, finalAmount: total, currency: cart.currency, shippingAddress: dto.shippingAddress as Prisma.InputJsonValue, paymentMethod: dto.paymentMethod, comments: dto.comments, items: { create: cart.items.map((item) => ({ variantId: item.variantId, productName: item.variant.product.nameRu, variantName: item.variant.name, price: item.variant.price, quantity: item.quantity, total: Number(item.variant.price) * item.quantity })) }, history: { create: { toStatus: OrderStatus.NEW, comment: 'Заказ создан из корзины' } } }, include: { items: true } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { total: 0 } });
      return order;
    });
  }

  async findOne(orderNumber: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber }, include: { items: true, history: { orderBy: { createdAt: 'asc' } }, payments: true } });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }
}
