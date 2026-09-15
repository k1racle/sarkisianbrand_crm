import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/order.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService) {}

  async checkout(sessionId: string, dto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({ where: { sessionId }, include: { user: { include: { customer: true, b2bProfile: true, organizationMemberships: { where: { isActive: true }, take: 1 } } }, items: { include: { variant: { include: { product: true } } } } } });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Корзина пуста');
    const total = cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    const orderNumber = `SB-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const reserved = await tx.productVariant.updateMany({ where: { id: item.variantId, isActive: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity }, reserved: { increment: item.quantity } } });
        if (reserved.count !== 1) throw new BadRequestException(`Недостаточно товара: ${item.variant.product.nameRu}`);
      }
      const source = cart.user?.organizationMemberships[0] ? OrderSource.B2B : OrderSource.WEB;
      const order = await tx.order.create({ data: { orderNumber, userId: cart.userId, customerId: cart.user?.customer?.id, organizationId: cart.user?.organizationMemberships[0]?.organizationId, b2bProfileId: cart.user?.b2bProfile?.id, source, sourceChannel: source, buyerName: cart.user ? [cart.user.firstName, cart.user.lastName].filter(Boolean).join(' ') || undefined : undefined, buyerEmail: cart.user?.email, buyerPhone: cart.user?.phone, status: OrderStatus.NEW, totalAmount: total, finalAmount: total, currency: cart.currency, shippingAddress: dto.shippingAddress as Prisma.InputJsonValue, paymentMethod: dto.paymentMethod, comments: dto.comments, items: { create: cart.items.map((item) => ({ variantId: item.variantId, externalSku: item.variant.sku, productName: item.variant.product.nameRu, variantName: item.variant.name, price: item.variant.price, quantity: item.quantity, total: Number(item.variant.price) * item.quantity })) }, history: { create: { toStatus: OrderStatus.NEW, comment: 'Заказ создан из корзины' } } }, include: { items: true } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { total: 0 } });
      return order;
    });
    await this.oneC.enqueueOrder(order.id, cart.userId || undefined);
    return order;
  }

  async findOne(orderNumber: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber }, include: { customer: true, organization: true, items: true, history: { orderBy: { createdAt: 'asc' } }, payments: true } });
    if (!order) throw new NotFoundException('Заказ не найден');
    return order;
  }
}
