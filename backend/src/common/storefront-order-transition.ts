import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import type { NotificationsService } from '../notifications/notifications.service';
import { loyaltyCreditMetadata } from '../loyalty/loyalty-core.helpers';
import { moneyMinor } from './storefront-utils';
import { applyB2BStockTransition } from '../b2b/b2b-order-lifecycle';
import { partnerOrderDelivered } from '../partners/partner-lifecycle';

/** Order must be locked first. Releases only unspent certificate reservations,
 * using a conditional redemption claim so concurrent/replayed releases cannot
 * credit the balance or release somebody else's reservation twice.
 */
export async function releaseStorefrontGiftReservation(tx: Prisma.TransactionClient, order: any): Promise<void> {
  let expectedMinor: number;
  try { expectedMinor = moneyMinor(order.giftCardAmount ?? 0); }
  catch { throw new ConflictException('Некорректная сумма подарочного сертификата в заказе'); }
  if (!expectedMinor) return;
  const redemptions = await tx.giftCardRedemption.findMany({ where: { orderId: order.id, status: 'RESERVED' }, orderBy: [{ cardId: 'asc' }, { id: 'asc' }] });
  let reservedMinor = 0n;
  for (const redemption of redemptions) {
    let amountMinor: number;
    try { amountMinor = moneyMinor(redemption.amount); }
    catch { throw new ConflictException('Некорректный резерв подарочного сертификата'); }
    if (!redemption.cardId || !amountMinor) throw new ConflictException('Некорректный резерв подарочного сертификата');
    reservedMinor += BigInt(amountMinor);
  }
  if (reservedMinor !== BigInt(expectedMinor)) throw new ConflictException('Резерв сертификата не соответствует заказу. Требуется ручная проверка');
  for (const redemption of redemptions) {
    await tx.$queryRaw`SELECT id FROM "GiftCard" WHERE id = ${redemption.cardId} FOR UPDATE`;
    const claimed = await tx.giftCardRedemption.updateMany({ where: { id: redemption.id, orderId: order.id, status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: new Date() } });
    if (!claimed.count) continue;
    if (claimed.count !== 1) throw new ConflictException('Не удалось снять резерв сертификата');
    const released = await tx.giftCard.updateMany({ where: { id: redemption.cardId, reserved: { gte: redemption.amount } }, data: { reserved: { decrement: redemption.amount }, revision: { increment: 1 } } });
    if (released.count !== 1) throw new ConflictException('Не удалось снять резерв сертификата. Требуется ручная проверка');
  }
}

/** Caller must lock Order and reread items/payments inside this same transaction.
 * Returns fields to merge into the caller's status update/history transaction.
 * Never creates a payment/refund or marks an unverified charge as successful.
 */
export async function applyStorefrontTransition(
  tx: Prisma.TransactionClient, order: any, target: OrderStatus, notifications?: NotificationsService,
): Promise<Prisma.OrderUpdateInput> {
  if(order.source==='B2B')return applyB2BStockTransition(tx,order,target);
  if (order.source !== 'WEB' || !order.reservationState || order.reservationState === 'LEGACY') return {};
  const terminal: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.DELIVERED];
  if (terminal.includes(order.status) && target !== order.status) throw new ConflictException('Завершённый заказ не может вернуться в обработку');
  if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status) && target === order.status) return {};
  if (!['ACTIVE', 'DIGITAL', 'CONSUMED', 'RELEASED'].includes(order.reservationState)) throw new ConflictException('Неизвестное состояние резерва заказа');
  if (order.reservationState === 'RELEASED') throw new ConflictException('Резерв заказа уже снят. Создайте новый заказ');
  const payments = order.payments || [];
  const succeeded = payments.some((payment: any) => payment.status === 'SUCCEEDED');
  const verifiedPaid = order.paymentStatus === 'SUCCEEDED' && succeeded;
  const financiallyPaid = succeeded || order.paymentStatus === 'SUCCEEDED' ||
    ([OrderStatus.PAID, OrderStatus.ASSEMBLING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(order.status);
  if (target === OrderStatus.REFUNDED || (target === OrderStatus.CANCELLED && financiallyPaid)) {
    throw new BadRequestException('Отмена оплаченного заказа и возврат требуют подтверждённого возврата платежа. Автоматический возврат пока не подключён');
  }
  if (([OrderStatus.PAID, OrderStatus.ASSEMBLING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(target) && !verifiedPaid) {
    throw new BadRequestException('Оплата должна быть подтверждена платёжной системой до обработки и отгрузки заказа');
  }
  const rank: Partial<Record<OrderStatus, number>> = { NEW: 0, CONFIRMED: 1, PAYMENT_WAITING: 1, PAID: 2, ASSEMBLING: 3, SHIPPED: 4, DELIVERED: 5 };
  if (target !== OrderStatus.CANCELLED && (rank[target] ?? -1) < (rank[order.status as OrderStatus] ?? -1)) throw new ConflictException('Заказ не может вернуться на предыдущий этап');
  if(target===OrderStatus.DELIVERED)await partnerOrderDelivered(tx,order);
  if (order.reservationState === 'CONSUMED') {
    if (!([OrderStatus.SHIPPED, OrderStatus.DELIVERED] as OrderStatus[]).includes(target)) throw new ConflictException('Товары уже отгружены');
    return {};
  }
  const items = [...(order.items || [])].sort((a, b) => String(a.variantId).localeCompare(String(b.variantId)));
  const digitalDelivery = order.reservationState === 'DIGITAL' || order.priceSnapshot?.digitalDelivery === true;
  if (digitalDelivery ? items.some(item => item.productType !== 'GIFT_CARD') : items.some(item => item.productType === 'GIFT_CARD')) {
    throw new ConflictException('Снимок типа товара и способ доставки не совпадают. Требуется ручная проверка');
  }
  if (digitalDelivery && ([OrderStatus.ASSEMBLING, OrderStatus.SHIPPED] as OrderStatus[]).includes(target)) {
    throw new BadRequestException('Электронные сертификаты не требуют складской сборки или отгрузки');
  }
  const shipment = target === OrderStatus.SHIPPED || target === OrderStatus.DELIVERED;
  if (target !== OrderStatus.CANCELLED && !shipment) return {};
  if (!shipment && payments.some((payment: any) => ['CREATING', 'PENDING'].includes(payment.status))) {
    throw new ConflictException('Платёж уже начат. Дождитесь итогового статуса перед отменой');
  }
  if (!shipment && (!Number.isSafeInteger(order.bonusAmount ?? 0) || (order.bonusAmount ?? 0) < 0 || (order.bonusAmount > 0 && !order.userId))) {
    throw new ConflictException('Некорректное списание бонусов. Требуется ручная проверка');
  }
  if (!items.length) throw new ConflictException('В заказе нет товаров. Требуется проверка резерва');
  if (items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) throw new ConflictException('Некорректный состав заказа');
  // Match checkout's Card -> Loyalty -> Variant lock order. All changes roll back together.
  if (!shipment) {
    await releaseStorefrontGiftReservation(tx, order);
    if (order.bonusAmount && order.userId) {
      const account = await tx.loyaltyAccount.findUnique({ where: { userId: order.userId } });
      if (!account) throw new ConflictException('Не найден бонусный счёт для возврата списанных бонусов');
      await tx.$queryRaw`SELECT id FROM "LoyaltyAccount" WHERE id = ${account.id} FOR UPDATE`;
      const settings = await tx.loyaltyProgramSetting.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
      const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { balance: { increment: order.bonusAmount } } });
      const level = updated.balance >= settings.premiumThreshold ? 'PREMIUM' : updated.balance >= settings.proThreshold ? 'PRO' : 'START';
      await tx.loyaltyAccount.update({ where: { id: account.id }, data: { level } });
      await tx.loyaltyTransaction.create({ data: { accountId: account.id, orderId: order.id, amount: order.bonusAmount, type: 'REVERSAL', reason: 'Возврат бонусов при отмене неоплаченного заказа', metadata: loyaltyCreditMetadata(settings) } });
    }
  }
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new ConflictException('Некорректный состав заказа');
    if (digitalDelivery) continue;
    if (!item.variantId) {
      if (shipment) throw new ConflictException('Товар удалён из каталога. Отгрузка требует ручной проверки');
      // Deleted variants no longer hold a physical reservation.
      continue;
    }
    const changed = await tx.productVariant.updateMany({
      where: { id: item.variantId, reserved: { gte: item.quantity }, ...(shipment ? { stock: { gte: item.quantity } } : {}) },
      data: { reserved: { decrement: item.quantity }, ...(shipment ? { stock: { decrement: item.quantity } } : {}) },
    });
    if (changed.count !== 1) throw new ConflictException('Не удалось изменить резерв или остатки. Требуется проверка склада');
  }
  if (shipment) return { reservationState: 'CONSUMED', reservationExpiresAt: null };

  await tx.promoRedemption.updateMany({ where: { orderId: order.id, status: 'RESERVED' }, data: { status: 'RELEASED' } });
  if (notifications && order.buyerEmail) {
    const owner = order.userId ? await tx.user.findUnique({ where: { id: order.userId }, select: { notificationPreferences: true } }) : null;
    const preferences = owner?.notificationPreferences;
    const disabled = preferences && typeof preferences === 'object' && !Array.isArray(preferences) && preferences.email === false;
    if (!disabled) {
      await tx.mailOutbox.create({ data: notifications.prepare({ kind: 'ORDER_CANCELLED', recipient: order.buyerEmail,
        subject: 'Заказ отменён: ' + order.orderNumber,
        text: digitalDelivery ? 'Электронный заказ ' + order.orderNumber + ' отменён. Оплата не была подтверждена.' : 'Заказ ' + order.orderNumber + ' отменён. Резерв товаров и сертификата снят, списанные бонусы возвращены.',
        dedupeKey: 'ORDER_CANCELLED:' + order.id }) });
    }
  }
  return { reservationState: 'RELEASED', reservationExpiresAt: null, paymentStatus: 'CANCELED' };
}
