import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGateway } from './payment-gateway';
import { CreatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { OneCSyncService } from '../1c-sync/1c-sync.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: PaymentGateway, private readonly loyalty: LoyaltyService, private readonly oneC: OneCSyncService) {}

  async create(orderNumber: string, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.status === OrderStatus.PAID) throw new BadRequestException('Заказ уже оплачен');
    const session = await this.gateway.createPayment({ orderNumber, amount: Number(order.finalAmount), currency: order.currency, returnUrl: dto.returnUrl });
    await this.prisma.payment.create({ data: { orderId: order.id, amount: order.finalAmount, currency: order.currency, provider: session.provider, transactionId: session.paymentId, status: 'PENDING' } });
    await this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAYMENT_WAITING, paymentStatus: 'PENDING', isSynced1C: false } });
    await this.oneC.enqueueOrder(order.id, order.userId || undefined);
    return session;
  }

  async webhook(dto: PaymentWebhookDto) {
    const saved = await this.prisma.idempotencyKey.findUnique({ where: { key: dto.idempotencyKey } });
    if (saved?.response) return saved.response;
    let loyaltyUserId: string | null = null;
    let loyaltyAmount = 0;
    let orderIdForSync: string | null = null;
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { transactionId: dto.paymentId }, include: { order: true } });
      if (!payment || payment.order.orderNumber !== dto.orderNumber) throw new BadRequestException('Платёж или заказ не найден');
      const successful = dto.status === 'SUCCEEDED';
      loyaltyUserId = payment.order.userId;
      loyaltyAmount = Math.floor(Number(payment.amount) / 100);
      orderIdForSync = payment.orderId;
      await tx.payment.update({ where: { id: payment.id }, data: { status: successful ? 'SUCCEEDED' : dto.status } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: successful ? OrderStatus.PAID : OrderStatus.PAYMENT_WAITING, paymentStatus: successful ? 'PAID' : dto.status, isSynced1C: false } });
      const response = { accepted: true, paymentId: dto.paymentId, status: dto.status };
      await tx.idempotencyKey.create({ data: { key: dto.idempotencyKey, requestId: dto.paymentId, response: response as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
      return response;
    });
    if (dto.status === 'SUCCEEDED' && loyaltyUserId && loyaltyAmount > 0) {
      await this.loyalty.operation(loyaltyUserId, { amount: loyaltyAmount, reason: `Бонус за оплату заказа ${dto.orderNumber}`, orderId: result.paymentId }, 'ACCRUAL');
    }
    if (orderIdForSync) await this.oneC.enqueueOrder(orderIdForSync);
    return result;
  }
}
