import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrderStatusDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [orders, paidOrders, customers, products, lowStock] = await this.prisma.$transaction([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      this.prisma.user.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    ]);
    return { orders, paidOrders, customers, products, lowStock };
  }

  products() {
    return this.prisma.product.findMany({ include: { variants: true, categories: { include: { category: true } } }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  orders() {
    return this.prisma.order.findMany({ include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, items: true, history: { orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async updateOrderStatus(orderNumber: string, dto: UpdateOrderStatusDto, changedBy: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Заказ не найден');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id: order.id }, data: { status: dto.status } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: dto.status, comment: dto.comment, changedBy } });
      return updated;
    });
  }
}
