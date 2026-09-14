import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGateway } from './payment-gateway';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: PaymentGateway) {}

  async create(orderNumber: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.status === OrderStatus.PAID) throw new BadRequestException('Заказ уже оплачен');
    const session = await this.gateway.createPayment({ orderNumber, amount: Number(order.finalAmount), currency: order.currency, returnUrl: dto.returnUrl });
    await this.prisma.payment.create({ data: { orderId: order.id, amount: order.finalAmount, currency: order.currency, provider: session.provider, transactionId: session.paymentId, status: 'PENDING' } });
    await this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_WAITING, paymentStatus: 'PENDING' } });
    return session;
  }

  async webhook(dto: PaymentWebhookDto) {
    const saved = await this.prisma.idempotencyKey.findUnique({ where: { key: dto.idempotencyKey } });
    if (saved?.response) return saved.response;
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { transactionId: dto.paymentId }, include: { order: true } });
      if (!payment || payment.order.orderNumber !== dto.orderNumber) throw new BadRequestException('Платёж или заказ не найден');
      const successful = dto.status === 'SUCCEEDED';
      await tx.payment.update({ where: { id: payment.id }, data: { status: successful ? 'SUCCEEDED' : dto.status } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: successful ? OrderStatus.PAID : OrderStatus.PAYMENT_WAITING, paymentStatus: successful ? 'PAID' : dto.status } });
      const response = { accepted: true, paymentId: dto.paymentId, status: dto.status };
      await tx.idempotencyKey.create({ data: { key: dto.idempotencyKey, requestId: dto.paymentId, response: response as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return response;
    });
    return result;
  }
}
