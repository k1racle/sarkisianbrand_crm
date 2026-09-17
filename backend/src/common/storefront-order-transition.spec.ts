import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { applyStorefrontTransition, releaseStorefrontGiftReservation } from './storefront-order-transition';
import { AdminService } from '../admin/admin.service';
import { OmsService } from '../oms/oms.service';
import { OneCSyncService } from '../1c-sync/1c-sync.service';

describe('Storefront transitions (mock only, no provider calls)', () => {
  function fixture(paid = false) {
    const order: any = { id: 'mock-order', orderNumber: 'MOCK-ORDER', source: 'WEB', status: paid ? OrderStatus.PAID : OrderStatus.NEW,
      paymentStatus: paid ? 'SUCCEEDED' : 'PENDING', reservationState: 'ACTIVE', reservationExpiresAt: new Date(),
      userId: 'mock-user', buyerEmail: 'mock@example.test', bonusAmount: 50, giftCardAmount: 0, marketplaceStaging: null,
      items: [{ variantId: 'mock-variant', productType: 'PHYSICAL', quantity: 2 }], payments: paid ? [{ status: 'SUCCEEDED' }] : [] };
    const state = { stock: 10, reserved: 4, balance: 950, entries: [] as any[], mails: [] as any[], promo: 'RESERVED', giftBalanceMinor: 100000, giftReservedMinor: 25000, giftRedemptions: [] as any[] };
    const notifications: any = { prepare: jest.fn((data: any) => ({ ...data, encryptedPayload: 'mock-only' })) };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: { findUnique: jest.fn().mockResolvedValue({ notificationPreferences: { email: true } }) },
      productVariant: { updateMany: jest.fn(async ({ where, data }: any) => {
        if (state.reserved < where.reserved.gte || (where.stock && state.stock < where.stock.gte)) return { count: 0 };
        state.reserved -= data.reserved.decrement; state.stock -= data.stock?.decrement || 0;
        return { count: 1 };
      }) },
      loyaltyAccount: {
        findUnique: jest.fn().mockResolvedValue({ id: 'mock-account' }),
        update: jest.fn(async ({ data }: any) => { state.balance += data.balance?.increment || 0; return { id: 'mock-account', balance: state.balance }; }),
      },
      loyaltyProgramSetting: { upsert: jest.fn().mockResolvedValue({ bonusValidityDays: 45, proThreshold: 1000, premiumThreshold: 3000 }) },
      loyaltyTransaction: { create: jest.fn(async ({ data }: any) => { state.entries.push(data); return data; }) },
      promoRedemption: { updateMany: jest.fn(async ({ data }: any) => { state.promo = data.status; return { count: 1 }; }) },
      giftCardRedemption: {
        findMany: jest.fn(async ({ where }: any) => state.giftRedemptions.filter(item => item.orderId === where.orderId && item.status === where.status).map(item => ({ ...item }))),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const record = state.giftRedemptions.find(item => item.id === where.id && item.orderId === where.orderId && item.status === where.status);
          if (!record) return { count: 0 };
          Object.assign(record, data); return { count: 1 };
        }),
      },
      giftCard: { updateMany: jest.fn(async ({ where, data }: any) => {
        const amount = Math.round(Number(where.reserved.gte) * 100);
        if (state.giftReservedMinor < amount) return { count: 0 };
        state.giftReservedMinor -= Math.round(Number(data.reserved.decrement) * 100); return { count: 1 };
      }) },
      mailOutbox: { create: jest.fn(async ({ data }: any) => { state.mails.push(data); return data; }) },
      order: {
        findUnique: jest.fn(async () => ({ ...order })), findFirst: jest.fn(async () => ({ ...order })),
        update: jest.fn(async ({ data }: any) => { Object.assign(order, data); return { ...order }; }),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      marketplaceOrder: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: jest.fn(async (callback: any) => callback(tx)), syncLog: { create: jest.fn().mockResolvedValue({}) } };
    const oneC: any = { enqueueOrder: jest.fn().mockResolvedValue(undefined) };
    return { order, state, tx, notifications, prisma, oneC };
  }

  it('skips cancellation email when the owner disabled email, without skipping stock/bonus/promo release', async () => {
    const ctx = fixture();
    ctx.tx.user.findUnique.mockResolvedValue({ notificationPreferences: { email: false } });
    expect(await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications)).toEqual({
      reservationState: 'RELEASED', reservationExpiresAt: null, paymentStatus: 'CANCELED',
    });
    expect(ctx.tx.user.findUnique).toHaveBeenCalledWith({ where: { id: 'mock-user' }, select: { notificationPreferences: true } });
    expect(ctx.state).toMatchObject({ reserved: 2, balance: 1000, promo: 'RELEASED' });
    expect(ctx.state.entries).toHaveLength(1);
    expect(ctx.notifications.prepare).not.toHaveBeenCalled();
    expect(ctx.tx.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('keeps guest transactional cancellation email unchanged and does not query owner preferences', async () => {
    const ctx = fixture(); ctx.order.userId = null; ctx.order.bonusAmount = 0;
    ctx.tx.user.findUnique.mockResolvedValue({ notificationPreferences: { email: false } });
    await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications);
    expect(ctx.tx.user.findUnique).not.toHaveBeenCalled();
    expect(ctx.state.mails).toHaveLength(1);
    expect(ctx.notifications.prepare).toHaveBeenCalledWith(expect.objectContaining({ kind: 'ORDER_CANCELLED', recipient: 'mock@example.test' }));
  });

  it.each([OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED])('does not touch LEGACY lifecycle for %s', async (target) => {
    expect(await applyStorefrontTransition({} as any, { source: 'WEB', reservationState: 'LEGACY' }, target)).toEqual({});
  });
  it('does not guess historic B2B or marketplace reservation semantics', async () => {
    expect(await applyStorefrontTransition({} as any, { source: 'B2B', reservationState: 'LEGACY' }, OrderStatus.SHIPPED)).toEqual({});
    expect(await applyStorefrontTransition({} as any, { source: 'OZON', reservationState: 'ACTIVE' }, OrderStatus.SHIPPED)).toEqual({});
  });
  it('dispatches new B2B reservations through the stock lifecycle', async () => {
    const tx:any={productVariant:{updateMany:jest.fn().mockResolvedValue({count:1})}};
    const result=await applyStorefrontTransition(tx,{source:'B2B',reservationState:'ACTIVE',items:[{variantId:'mock-v',quantity:2}]},OrderStatus.SHIPPED);
    expect(result.reservationState).toBe('CONSUMED');expect(tx.productVariant.updateMany.mock.calls[0][0].data).toEqual({stock:{decrement:2},reserved:{decrement:2}});
  });
  it.each([OrderStatus.PAID, OrderStatus.ASSEMBLING, OrderStatus.SHIPPED, OrderStatus.DELIVERED])('prohibits unverified unpaid %s transition', async (target) => {
    const ctx = fixture();
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, target)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it.each(['missingSucceeded', 'missingPaymentStatus'])('requires both successful payment and verified order status: %s', async (change) => {
    const ctx = fixture(true);
    if (change === 'missingSucceeded') ctx.order.payments = [];
    else ctx.order.paymentStatus = 'PENDING';
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.SHIPPED)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('allows PAID only with succeeded evidence, without creating financial records', async () => {
    const ctx = fixture(true); ctx.order.status = OrderStatus.PAYMENT_WAITING;
    expect(await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.PAID)).toEqual({});
    expect(ctx.tx.loyaltyTransaction.create).not.toHaveBeenCalled();
  });
  it.each([OrderStatus.CANCELLED, OrderStatus.REFUNDED])('prohibits paid %s without a verified refund implementation', async (target) => {
    const ctx = fixture(true);
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, target)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not claim a refund for an unpaid order', async () => {
    const ctx = fixture();
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.REFUNDED)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('unpaid cancellation releases only reserved stock and reverses bonus once with configured TTL and mail', async () => {
    const ctx = fixture(); const before = Date.now();
    const fields = await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications);
    expect(fields).toEqual({ reservationState: 'RELEASED', reservationExpiresAt: null, paymentStatus: 'CANCELED' });
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(2); expect(ctx.state.balance).toBe(1000); expect(ctx.state.promo).toBe('RELEASED');
    expect(ctx.state.entries[0]).toMatchObject({ type: 'REVERSAL', amount: 50, orderId: 'mock-order', metadata: { ledgerVersion: 1, expiresAt: expect.any(String) } });
    expect(new Date(ctx.state.entries[0].metadata.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 45 * 86400000);
    expect(ctx.tx.$queryRaw.mock.calls[0][0].join('?')).toContain('"LoyaltyAccount"');
    expect(ctx.tx.loyaltyAccount.update).toHaveBeenLastCalledWith({ where: { id: 'mock-account' }, data: { level: 'PRO' } });
    expect(ctx.notifications.prepare).toHaveBeenCalledWith(expect.objectContaining({ kind: 'ORDER_CANCELLED', recipient: 'mock@example.test', dedupeKey: 'ORDER_CANCELLED:mock-order' }));
    Object.assign(ctx.order, fields, { status: OrderStatus.CANCELLED });
    expect(await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications)).toEqual({});
    expect(ctx.state.entries).toHaveLength(1); expect(ctx.state.mails).toHaveLength(1); expect(ctx.state.reserved).toBe(2);
  });
  it.each(['CREATING', 'PENDING'])('prohibits cancellation while payment is %s before touching stock', async (status) => {
    const ctx = fixture(); ctx.order.payments = [{ status }];
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it('fails honestly when the bonus account cannot be restored', async () => {
    const ctx = fixture(); ctx.tx.loyaltyAccount.findUnique.mockResolvedValue(null);
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(ConflictException);
  });
  it.each([-1, 1.5])('rejects invalid bonus amount %s', async (bonusAmount) => {
    const ctx = fixture(); ctx.order.bonusAmount = bonusAmount;
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it.each([OrderStatus.SHIPPED, OrderStatus.DELIVERED])('paid %s atomically consumes stock/reserved exactly once', async (target) => {
    const ctx = fixture(true); const fields = await applyStorefrontTransition(ctx.tx, ctx.order, target);
    expect(fields).toEqual({ reservationState: 'CONSUMED', reservationExpiresAt: null });
    expect(ctx.tx.productVariant.updateMany).toHaveBeenCalledWith({ where: { id: 'mock-variant', reserved: { gte: 2 }, stock: { gte: 2 } }, data: { reserved: { decrement: 2 }, stock: { decrement: 2 } } });
    expect(ctx.state.stock).toBe(8); expect(ctx.state.reserved).toBe(2); expect(ctx.state.balance).toBe(950);
    Object.assign(ctx.order, fields, { status: target });
    expect(await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.DELIVERED)).toEqual({});
    expect(ctx.tx.productVariant.updateMany).toHaveBeenCalledTimes(1);
  });
  it.each(['stock', 'reserved', 'deletedVariant', 'quantity'])('fails shipment for invalid %s', async (invalid) => {
    const ctx = fixture(true);
    if (invalid === 'stock') ctx.state.stock = 1;
    if (invalid === 'reserved') ctx.state.reserved = 1;
    if (invalid === 'deletedVariant') ctx.order.items[0].variantId = null;
    if (invalid === 'quantity') ctx.order.items[0].quantity = 0;
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.SHIPPED)).rejects.toBeInstanceOf(ConflictException);
  });
  it.each([OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.DELIVERED])('prohibits terminal %s regression', async (status) => {
    const ctx = fixture(true); ctx.order.status = status;
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.NEW)).rejects.toBeInstanceOf(ConflictException);
  });
  it('prohibits shipped and consumed stock regressing to assembling', async () => {
    const ctx = fixture(true); ctx.order.status = OrderStatus.SHIPPED; ctx.order.reservationState = 'CONSUMED';
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.ASSEMBLING)).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['admin', 'oms', 'oneC'])('%s locks and rereads before transitioning unpaid cancellation', async (caller) => {
    const ctx = fixture();
    if (caller === 'admin') await new AdminService(ctx.prisma, ctx.oneC, {} as any, ctx.notifications).updateOrderStatus('MOCK-ORDER', { status: OrderStatus.CANCELLED }, 'mock-staff');
    if (caller === 'oms') await new OmsService(ctx.prisma, ctx.oneC, ctx.notifications).update('MOCK-ORDER', { status: OrderStatus.CANCELLED }, 'mock-staff');
    if (caller === 'oneC') await new OneCSyncService(ctx.prisma, {} as any, {} as any, ctx.notifications).importOrderStatuses({ statuses: [{ platformOrderId: 'mock-order', status: 'CANCELLED' }] });
    const read = caller === 'admin' ? ctx.tx.order.findUnique : ctx.tx.order.findFirst;
    expect(ctx.tx.$queryRaw.mock.calls[0][0].join('?')).toContain('FOR UPDATE');
    expect(ctx.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({ items: true, payments: true }) }));
    expect(ctx.order).toMatchObject({ status: OrderStatus.CANCELLED, reservationState: 'RELEASED', reservationExpiresAt: null });
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(2); expect(ctx.state.balance).toBe(1000);
    expect(ctx.tx.orderStatusHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fromStatus: OrderStatus.NEW, toStatus: OrderStatus.CANCELLED }) });
  });
  it.each(['admin', 'oms', 'oneC'])('%s prohibits unpaid fulfillment through the shared helper', async (caller) => {
    const ctx = fixture(); ctx.order.status = OrderStatus.CONFIRMED;
    const call = caller === 'admin' ? new AdminService(ctx.prisma, ctx.oneC, {} as any).updateOrderStatus('MOCK-ORDER', { status: OrderStatus.ASSEMBLING }, 'mock-staff') :
      caller === 'oms' ? new OmsService(ctx.prisma, ctx.oneC).update('MOCK-ORDER', { status: OrderStatus.ASSEMBLING }, 'mock-staff') :
      new OneCSyncService(ctx.prisma, {} as any, {} as any).importOrderStatuses({ statuses: [{ platformOrderId: 'mock-order', status: 'PICKING' }] });
    await expect(call).rejects.toBeInstanceOf(BadRequestException); expect(ctx.tx.order.update).not.toHaveBeenCalled();
  });
  it('1C mapping rereads current locked terminal status and does not consume again', async () => {
    const ctx = fixture(true); ctx.order.status = OrderStatus.DELIVERED; ctx.order.reservationState = 'CONSUMED';
    await new OneCSyncService(ctx.prisma, {} as any, {} as any).importOrderStatuses({ statuses: [{ platformOrderId: 'mock-order', status: 'ACCEPTED' }] });
    expect(ctx.order.status).toBe(OrderStatus.DELIVERED); expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled(); expect(ctx.tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });
  it('unpaid admin-style cancellation releases certificate reserved funds without crediting its balance, exactly once', async () => {
    const ctx = fixture(); ctx.order.giftCardAmount = '125.50';
    ctx.state.giftRedemptions.push({ id: 'redemption', cardId: 'gift-card', orderId: ctx.order.id, amount: '125.50', status: 'RESERVED' });
    const fields = await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications);
    expect(ctx.state.giftReservedMinor).toBe(12450); expect(ctx.state.giftBalanceMinor).toBe(100000);
    expect(ctx.state.giftRedemptions[0].status).toBe('RELEASED');
    expect(ctx.tx.giftCard.updateMany).toHaveBeenCalledWith({ where: { id: 'gift-card', reserved: { gte: '125.50' } }, data: { reserved: { decrement: '125.50' }, revision: { increment: 1 } } });
    expect(ctx.tx.giftCardRedemption.updateMany).toHaveBeenCalledWith({ where: { id: 'redemption', orderId: 'mock-order', status: 'RESERVED' }, data: { status: 'RELEASED', releasedAt: expect.any(Date) } });
    Object.assign(ctx.order, fields, { status: OrderStatus.CANCELLED });
    await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications);
    expect(ctx.tx.giftCard.updateMany).toHaveBeenCalledTimes(1); expect(ctx.state.giftBalanceMinor).toBe(100000);
  });
  it('zero gift amount never queries gift tables, preserving historic fixtures', async () => {
    const ctx = fixture(); await releaseStorefrontGiftReservation(ctx.tx, ctx.order);
    expect(ctx.tx.giftCardRedemption.findMany).not.toHaveBeenCalled(); expect(ctx.tx.giftCard.updateMany).not.toHaveBeenCalled();
  });
  it.each(['missingRedemption', 'wrongAmount', 'missingCardId', 'insufficientReserved'])('rejects inconsistent certificate reserve %s', async (invalid) => {
    const ctx = fixture(); ctx.order.giftCardAmount = '125.50';
    const redemption = { id: 'redemption', cardId: invalid === 'missingCardId' ? '' : 'gift-card', orderId: ctx.order.id, amount: invalid === 'wrongAmount' ? '125.49' : '125.50', status: 'RESERVED' };
    if (invalid !== 'missingRedemption') ctx.state.giftRedemptions.push(redemption);
    if (invalid === 'insufficientReserved') ctx.state.giftReservedMinor = 100;
    await expect(releaseStorefrontGiftReservation(ctx.tx, ctx.order)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.state.giftBalanceMinor).toBe(100000);
  });
  it('a lost conditional redemption claim cannot release funds twice', async () => {
    const ctx = fixture(); ctx.order.giftCardAmount = '125.50';
    ctx.state.giftRedemptions.push({ id: 'redemption', cardId: 'gift-card', orderId: ctx.order.id, amount: '125.50', status: 'RESERVED' });
    ctx.tx.giftCardRedemption.updateMany.mockResolvedValue({ count: 0 });
    await releaseStorefrontGiftReservation(ctx.tx, ctx.order);
    expect(ctx.tx.giftCard.updateMany).not.toHaveBeenCalled(); expect(ctx.state.giftReservedMinor).toBe(25000);
  });
  it.each(['ACTIVE', 'DIGITAL'])('digital cancellation with state %s never releases physical stock', async (state) => {
    const ctx = fixture(); ctx.order.reservationState = state; ctx.order.bonusAmount = 0;
    ctx.order.priceSnapshot = { digitalDelivery: true }; ctx.order.items[0].productType = 'GIFT_CARD';
    const fields = await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED, ctx.notifications);
    expect(fields).toMatchObject({ reservationState: 'RELEASED' });
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(ctx.state.stock).toBe(10); expect(ctx.state.reserved).toBe(4);
    expect(ctx.notifications.prepare.mock.calls[0][0].text).toContain('Электронный заказ');
  });
  it('paid digital delivery consumes lifecycle but never physical stock', async () => {
    const ctx = fixture(true); ctx.order.reservationState = 'DIGITAL'; ctx.order.priceSnapshot = { digitalDelivery: true };
    ctx.order.items[0].productType = 'GIFT_CARD';
    expect(await applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.DELIVERED)).toEqual({ reservationState: 'CONSUMED', reservationExpiresAt: null });
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it.each([OrderStatus.ASSEMBLING, OrderStatus.SHIPPED])('digital certificates cannot falsely enter warehouse status %s', async (target) => {
    const ctx = fixture(true); ctx.order.priceSnapshot = { digitalDelivery: true }; ctx.order.items[0].productType = 'GIFT_CARD';
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, target)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it('digital flag cannot hide a physical item from reservation handling', async () => {
    const ctx = fixture(); ctx.order.priceSnapshot = { digitalDelivery: true };
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(ConflictException);
    expect(ctx.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it('paid certificate-funded physical order still needs verified refund before cancellation', async () => {
    const ctx = fixture(true); ctx.order.giftCardAmount = '125.50'; ctx.order.payments = [{ provider: 'GIFT_CARD', status: 'SUCCEEDED' }];
    await expect(applyStorefrontTransition(ctx.tx, ctx.order, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(BadRequestException);
    expect(ctx.tx.giftCardRedemption.findMany).not.toHaveBeenCalled();
  });
});
