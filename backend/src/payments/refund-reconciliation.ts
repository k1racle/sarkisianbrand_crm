import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** A trusted provider lookup has already verified the payment ID, ownership,
 * currency and original amount. This function never initiates a refund. */
export async function recordVerifiedRefund(
  db: PrismaService,
  input: { paymentId: string; provider: 'YOOKASSA' | 'TBANK'; externalId: string; state: 'FULL' | 'PARTIAL' | 'REVIEW'; refundedAmount?: string; providerState?: string },
) {
  return db.$transaction(async tx => {
    const initial = await tx.payment.findUnique({ where: { id: input.paymentId }, select: { orderId: true } });
    if (!initial) throw new BadRequestException('Платёж для сверки не найден.');
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${initial.orderId} FOR UPDATE`;
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
    const order = await tx.order.findUniqueOrThrow({ where: { id: initial.orderId } });
    const expectedExternal = input.provider === 'TBANK' ? `TBANK:${input.externalId}` : input.externalId;
    if (payment.provider !== input.provider || payment.transactionId !== expectedExternal || payment.status !== 'SUCCEEDED' || order.paymentStatus !== 'SUCCEEDED' && order.paymentStatus !== 'REFUNDED' || !new Prisma.Decimal(payment.amount).equals(order.finalAmount) || payment.currency !== order.currency) throw new ConflictException('Возврат требует ручной сверки платежа и заказа.');
    const existing = payment.metadata && typeof payment.metadata === 'object' && !Array.isArray(payment.metadata) ? payment.metadata as Record<string, any> : {};
    const old = existing.refundReconciliation as Record<string, any> | undefined;
    if (old?.state === 'FULL') return { duplicate: true, state: 'FULL' };
    if (old?.state === input.state && old?.refundedAmount === (input.refundedAmount ?? null) && old?.providerState === (input.providerState ?? null)) return { duplicate: true, state: input.state };
    if (input.refundedAmount !== undefined && (!/^\d{1,13}\.\d{2}$/.test(input.refundedAmount) || new Prisma.Decimal(input.refundedAmount).lte(0) || new Prisma.Decimal(input.refundedAmount).gt(payment.amount))) throw new BadRequestException('Некорректная сумма возврата.');
    if (old?.refundedAmount && input.refundedAmount && new Prisma.Decimal(input.refundedAmount).lt(old.refundedAmount)) throw new ConflictException('Сумма возврата уменьшилась; нужна ручная сверка.');
    if (input.state === 'FULL' && (!input.refundedAmount || !new Prisma.Decimal(input.refundedAmount).equals(payment.amount))) throw new ConflictException('Полная сумма возврата не подтверждена.');

    let access = 'NOT_APPLICABLE';
    let completed = false;
    if (input.state === 'FULL' && order.sourceChannel === 'COURSE') {
      const purchase = await tx.coursePurchase.findUnique({ where: { orderId: order.id } });
      if (!purchase || purchase.status !== 'PAID' || purchase.userId !== order.userId || purchase.currency !== order.currency || !purchase.amount.equals(order.finalAmount)) throw new ConflictException('Возврат курса требует ручной сверки доступа.');
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${purchase.courseId} FOR UPDATE`;
      // A late refund of an earlier purchase must never revoke a later renewal.
      const latest = await tx.coursePurchase.findFirst({ where: { userId: purchase.userId, courseId: purchase.courseId, status: 'PAID' }, orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] });
      const enrollment = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: purchase.userId, courseId: purchase.courseId } } });
      const sameExpiration = enrollment?.accessExpiresAt?.getTime() === purchase.accessExpiresAt?.getTime();
      if (latest?.id === purchase.id && enrollment?.accessStatus === 'ACTIVE' && sameExpiration) {
        await tx.enrollment.update({ where: { id: enrollment.id }, data: { accessStatus: 'REFUNDED' } });
        access = 'REVOKED';
      } else if (latest?.id !== purchase.id) access = 'NEWER_PURCHASE';
      else if (!enrollment || enrollment.accessStatus !== 'ACTIVE') access = 'NOT_ACTIVE';
      else access = 'REVIEW';
      await tx.coursePurchase.update({ where: { id: purchase.id }, data: { status: 'REFUNDED', accountingStatus: 'NEEDS_REVIEW' } });
      completed = true;
    }
    const summary = { provider: input.provider, state: input.state, refundedAmount: input.refundedAmount ?? null, providerState: input.providerState ?? null, access, accountingReview: true, observedAt: new Date().toISOString() };
    await tx.payment.update({ where: { id: payment.id }, data: { metadata: { ...existing, refundReconciliation: summary } as Prisma.InputJsonValue } });
    const message = completed ? `Провайдер подтвердил полный возврат курса. ${access === 'REVOKED' ? 'Доступ закрыт.' : access === 'NEWER_PURCHASE' ? 'Новая покупка и доступ сохранены.' : 'Доступ требует проверки.'} Чек и учёт в 1С требуют сверки.` : `Провайдер сообщил о возврате${input.providerState ? ` (${input.providerState})` : ''}. ${input.state === 'PARTIAL' ? 'Частичный возврат' : 'Операция'} требует финансовой сверки; статус заказа автоматически не изменён.`;
    await tx.order.update({ where: { id: order.id }, data: { ...(completed ? { status: OrderStatus.REFUNDED, paymentStatus: 'REFUNDED' } : {}), history: { create: { fromStatus: order.status, toStatus: completed ? OrderStatus.REFUNDED : order.status, comment: message } } } });
    return { duplicate: false, state: input.state, access, completed };
  }, { timeout: 30000 });
}
