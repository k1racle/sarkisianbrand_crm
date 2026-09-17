import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, Prisma } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto } from './dto/order.dto';
import { OneCSyncService } from '../1c-sync/1c-sync.service';
import { StorefrontPricingService } from './storefront-pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { moneyMinor } from '../common/storefront-utils';
import { pricedCart } from '../common/product-merchandising';
import { DEFAULT_LOYALTY_SETTINGS, loyaltyCreditMetadata, loyaltyWriteOffMetadata, maintainAccount } from '../loyalty/loyalty-core.helpers';
import { GiftCardsService } from '../gift-cards/gift-cards.service';
import { giftCodeHash } from '../gift-cards/gift-cards.helpers';
import { ecosystemAutomationEnabled } from '../common/ecosystem-automation';
type Actor = { sub: string; role?: string };
const STAFF = ['ADMIN', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE', 'IT_SUPPORT'];
const UNPAID = [OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_WAITING];
const includes = { items: { include: { variant: { include: { product: { include: { images: true } } } } } }, history: { orderBy: { createdAt: 'asc' as const } }, payments: true };

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService, private readonly oneC: OneCSyncService,
    private readonly pricing: StorefrontPricingService, private readonly notifications: NotificationsService,
    private readonly config: ConfigService, @Optional() private readonly giftCards?: GiftCardsService) {}
  onModuleInit() {
    if(!ecosystemAutomationEnabled())return;
    this.timer = setInterval(() => { void this.expireReservations().catch(() => undefined); }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async quote(session: string, dto: CheckoutDto, actor?: Actor) {
    this.validateSession(session);
    if (actor?.role === 'CUSTOMER_B2C') await this.prisma.$transaction(async tx => {
      const cart = await tx.cart.findUnique({ where: { sessionId: session }, include: { items: { include: { variant: { include: { product: true } } } } } });
      if (cart?.userId !== actor.sub || this.digitalBasket(cart)) return;
      const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || DEFAULT_LOYALTY_SETTINGS;
      await maintainAccount(tx, actor.sub, settings);
    }, { timeout: 30_000 });
    return (await this.pricing.quote(session, dto, actor)).publicQuote;
  }
  async checkout(session: string, dto: CheckoutDto, actor?: Actor, key?: string) {
    this.validateSession(session);
    if (!key || !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new BadRequestException('Обновите страницу оформления заказа');
    if (dto.acceptedTerms !== true) throw new BadRequestException('Подтвердите согласие с условиями заказа');
    if (!dto.contact?.firstName?.trim() || !dto.contact.email?.trim() || !dto.contact.phone?.trim()) throw new BadRequestException('Заполните контактные данные');
    const checkoutKey = this.hash(session + ':' + key);
    const requestHash = this.hash(JSON.stringify(this.canonical({ ...dto, actor: actor?.sub || null })));
    const accessToken = this.guestToken(checkoutKey, session);
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${checkoutKey}))`;
      const previous = await tx.order.findUnique({ where: { checkoutKey }, include: includes });
      if (previous) {
        if (previous.checkoutRequestHash !== requestHash) throw new ConflictException('Данные заказа изменились. Начните оформление заново');
        if (previous.userId && previous.userId !== actor?.sub) throw new NotFoundException('Заказ не найден');
        return { order: previous, created: false };
      }
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE "sessionId" = ${session} FOR UPDATE`;
      if (dto.promoCode) await tx.$queryRaw`SELECT code FROM "PromoCode" WHERE code = ${dto.promoCode.trim().toUpperCase()} FOR UPDATE`;
      if (dto.giftCardCode?.trim()) {
        this.requireGiftCards();
        await this.lockGiftCard(tx, dto.giftCardCode);
      }
      let loyaltyEntries: any[] = [];
      if (actor?.sub && actor.role === 'CUSTOMER_B2C') {
        const cart = await tx.cart.findUnique({ where: { sessionId: session }, include: { items: { include: { variant: { include: { product: true } } } } } });
        if (cart?.userId === actor.sub && !this.digitalBasket(cart)) {
          const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || DEFAULT_LOYALTY_SETTINGS;
          loyaltyEntries = (await maintainAccount(tx, actor.sub, settings)).entries;
        }
      }
      const price = await this.pricing.quote(session, dto, actor, tx);
      const digital = price.publicQuote.digitalDelivery === true;
      const giftCardMinor = price.giftCardMinor || 0;
      if (digital || giftCardMinor > 0) this.requireGiftCards();
      if (!digital && (!['COURIER', 'PICKUP_POINT'].includes(dto.deliveryMethod || '') ||
        !String(dto.shippingAddress?.city || '').trim() || !String(dto.shippingAddress?.address || '').trim())) throw new BadRequestException('Заполните адрес и выберите способ доставки');
      if (digital && (giftCardMinor > 0 || price.bonusAmount > 0 || price.promoDiscountMinor > 0 || price.shippingMinor > 0)) throw new BadRequestException('Сертификаты оформляются отдельно без скидок и доставки');
      if (giftCardMinor > 0 && (!dto.giftCardCode?.trim() || !price.deliveryConfirmed)) throw new BadRequestException('Подтвердите сертификат и стоимость доставки');
      if (dto.expectedTotal !== undefined && moneyMinor(dto.expectedTotal) !== price.finalMinor) throw new ConflictException('Цена или условия заказа изменились. Проверьте обновлённую сумму перед оформлением');
      let shippingAddress: Record<string, unknown> = digital ? { deliveryMethod: 'DIGITAL', email: dto.contact!.email.trim().toLowerCase() } : { ...dto.shippingAddress, deliveryMethod: dto.deliveryMethod, provider: dto.shippingProvider || null };
      if (!digital && price.deliveryConfirmed) {
        const savedQuote = dto.shippingQuoteId ? await tx.shippingQuote.findUnique({ where: { id: dto.shippingQuoteId } }) : null;
        const destination = savedQuote?.requestSnapshot as Record<string, unknown> | undefined;
        if (!destination?.city || !destination.cityCode ||
          (dto.deliveryMethod === 'COURIER' ? !destination.street || !destination.house : !destination.pickupPointCode || !destination.pickupPointAddress)) {
          throw new ConflictException('Подтверждённый адрес доставки устарел. Выберите адрес и рассчитайте доставку заново');
        }
        const apartment = String(dto.shippingAddress?.apartment || '').trim();
        shippingAddress = {
          city: destination.city, cityCode: destination.cityCode,
          country: destination.country || 'Россия', region: destination.region || '',
          deliveryMethod: dto.deliveryMethod, provider: dto.shippingProvider || null,
          ...(dto.deliveryMethod === 'COURIER' ? {
            street: destination.street, house: destination.house, apartment,
            address: [destination.street, destination.house, apartment ? 'кв. ' + apartment : ''].filter(Boolean).join(', '),
          } : {
            pickupPointCode: destination.pickupPointCode, pickupPointName: destination.pickupPointName || destination.pickupPointCode,
            pickupPointAddress: destination.pickupPointAddress, address: destination.pickupPointAddress,
          }),
        };
      }
      const cart = price.cart;
      for (const item of [...cart.items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
        if (item.variant.product.productType === 'GIFT_CARD') continue;
        const rows = await tx.$queryRaw<{ id: string }[]>`
          UPDATE "ProductVariant" SET reserved = reserved + ${item.quantity}
          WHERE id = ${item.variantId} AND "isActive" = true AND stock - reserved >= ${item.quantity} RETURNING id`;
        if (rows.length !== 1) throw new ConflictException('Товар «' + item.variant.product.nameRu + '» закончился. Обновите корзину');
      }
      let order = await tx.order.create({ data: {
        orderNumber: 'SB-' + new Date().getFullYear() + '-' + randomUUID().slice(0, 8).toUpperCase(),
        checkoutKey, checkoutRequestHash: requestHash, userId: actor?.sub, customerId: cart.user?.customer?.id,
        source: 'WEB', sourceChannel: 'WEB', buyerName: [dto.contact!.firstName.trim(), dto.contact!.lastName?.trim()].filter(Boolean).join(' '),
        buyerEmail: dto.contact!.email.trim().toLowerCase(), buyerPhone: dto.contact!.phone.trim(),
        status: OrderStatus.NEW, totalAmount: price.subtotalMinor / 100, discountAmount: price.promoDiscountMinor / 100,
        bonusAmount: price.bonusAmount, giftCardAmount: giftCardMinor / 100, shippingCost: price.shippingMinor / 100, shippingProvider: digital ? null : dto.shippingProvider, finalAmount: price.finalMinor / 100,
        currency: 'RUB', promoCode: price.promoCode || null, reservationState: 'ACTIVE', reservationExpiresAt: new Date(Date.now() + 30 * 60_000),
        guestAccessHash: actor ? null : this.hash(accessToken), guestAccessExpiresAt: actor ? null : new Date(Date.now() + 30 * 86400_000),
        shippingAddress: shippingAddress as Prisma.InputJsonValue,
        paymentMethod: giftCardMinor > 0 && price.finalMinor === 0 ? 'GIFT_CARD' : 'YOOKASSA', comments: dto.comments,
        priceSnapshot: { ...price.publicQuote, deliveryConfirmed: price.deliveryConfirmed, digitalDelivery: digital, shippingQuoteId: digital ? null : dto.shippingQuoteId || null, acceptedTermsAt: new Date().toISOString() } as Prisma.InputJsonValue,
        items: { create: cart.items.map(item => ({ variantId: item.variantId, externalSku: item.variant.sku, productName: item.variant.product.nameRu,
          productType: item.variant.product.productType || 'PHYSICAL', giftCardValidityDays: item.variant.product.productType === 'GIFT_CARD' ? this.giftValidityDays(item.variant) : null,
          variantName: item.variant.name, price: item.variant.price, quantity: item.quantity, total: moneyMinor(item.variant.price) * item.quantity / 100 })) },
        history: { create: { toStatus: OrderStatus.NEW, comment: 'Заказ оформлен на сайте. Товары зарезервированы на 30 минут' } },
      }, include: includes });
      if (giftCardMinor > 0) await this.requireGiftCards().reserve(tx, order.id, dto.giftCardCode!, giftCardMinor);
      if (price.promoCode) await tx.promoRedemption.create({ data: { code: price.promoCode, orderId: order.id, customerHash: price.customerHash } });
      if (price.bonusAmount && price.loyaltyAccount) {
        const account = await tx.loyaltyAccount.update({ where: { id: price.loyaltyAccount.id }, data: { balance: { decrement: price.bonusAmount } } });
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: { level: this.level(account.balance, price.settings) } });
        await tx.loyaltyTransaction.create({ data: { accountId: account.id, amount: -price.bonusAmount, type: 'WRITE_OFF', reason: 'Списание при оформлении заказа', orderId: order.id, metadata: loyaltyWriteOffMetadata(price.loyaltyAccount.balance, loyaltyEntries, price.bonusAmount) } });
      }
      await this.mail(tx, order, 'ORDER_CREATED', 'Заказ принят', digital ? 'Электронный сертификат будет доступен после оплаты. Итого: ' + price.finalMinor / 100 + ' ₽.' : price.deliveryConfirmed ? 'Итого с доставкой: ' + price.finalMinor / 100 + ' ₽.' : 'Стоимость доставки ещё не подтверждена. Оплата пока недоступна.');
      if (giftCardMinor > 0 && price.finalMinor === 0) {
        await this.applyGiftHold(tx, order);
        const redemption = await tx.giftCardRedemption.findUnique({ where: { orderId: order.id }, select: { id: true, status: true } });
        if (!redemption || redemption.status !== 'APPLIED') throw new ConflictException('Оплата сертификатом не подтверждена');
        await tx.payment.create({ data: { orderId: order.id, provider: 'GIFT_CARD', amount: 0, currency: order.currency,
          status: 'SUCCEEDED', transactionId: randomUUID(), metadata: { giftCardAmount: (giftCardMinor / 100).toFixed(2), redemptionId: redemption.id } } });
        order = await this.finishPaid(tx, order, 'Оплата полностью покрыта подарочным сертификатом', true);
      }
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { total: 0 } });
      return { order, created: true };
    }, { timeout: 30_000 });
    if (result.created && !this.digitalOrder(result.order)) await this.enqueue(result.order.id, actor?.sub);
    const safe = await this.withGiftCards(result.order, actor, result.order.userId ? undefined : accessToken);
    return { ...safe, ...(result.order.userId ? {} : { accessToken }),
      canPay: ((result.order.priceSnapshot as any)?.deliveryConfirmed === true || this.digitalOrder(result.order)) && UNPAID.includes(result.order.status as any) && result.order.reservationState === 'ACTIVE' && Number(result.order.finalAmount) > 0 && !!result.order.reservationExpiresAt && result.order.reservationExpiresAt > new Date(), requiresDeliveryConfirmation: !this.digitalOrder(result.order) && (result.order.priceSnapshot as any)?.deliveryConfirmed !== true };
  }
  async getAccessible(number: string, actor?: Actor, token?: string) {
    const order = await this.prisma.order.findUnique({ where: { orderNumber: number }, include: includes });
    let allowed = !!order && !!actor && (order.userId === actor.sub || STAFF.includes(actor.role || ''));
    if (order && !order.userId && token && order.guestAccessHash && order.guestAccessExpiresAt && order.guestAccessExpiresAt > new Date()) {
      const expected = Buffer.from(order.guestAccessHash), actual = Buffer.from(this.hash(token));
      allowed ||= actual.length === expected.length && timingSafeEqual(actual, expected);
    }
    if (!order || !allowed) throw new NotFoundException('Заказ не найден');
    return order;
  }
  async findOne(number: string, actor?: Actor, token?: string) { return this.withGiftCards(await this.getAccessible(number, actor, token), actor, token); }
  async cancel(number: string, actor: Actor) {
    const accessible = await this.getAccessible(number, actor);
    if (accessible.userId !== actor.sub) throw new NotFoundException('Заказ не найден');
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${accessible.id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id: accessible.id }, include: { items: true, payments: true } });
      if (order.status === OrderStatus.CANCELLED) return;
      if (!UNPAID.includes(order.status as any) || order.reservationState !== 'ACTIVE') throw new BadRequestException('Свяжитесь с поддержкой для отмены этого заказа');
      if (order.payments.some(p => ['CREATING', 'PENDING', 'SUCCEEDED'].includes(p.status))) throw new ConflictException('Платёж уже начат. Дождитесь итогового статуса или свяжитесь с поддержкой');
      await this.release(tx, order, 'Заказ отменён покупателем');
    }, { timeout: 30_000 });
    await this.enqueue(accessible.id);
    return this.findOne(number, actor);
  }
  async expireReservations() {
    const orders = await this.prisma.order.findMany({ where: { reservationState: 'ACTIVE', reservationExpiresAt: { lte: new Date() }, status: { in: UNPAID },
      payments: { none: { status: { in: ['CREATING', 'PENDING', 'SUCCEEDED'] } } } }, select: { id: true }, take: 100 });
    for (const candidate of orders) {
      await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${candidate.id} FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: candidate.id }, include: { items: true, payments: true } });
        if (order && order.reservationState === 'ACTIVE' && order.reservationExpiresAt && order.reservationExpiresAt <= new Date() &&
          UNPAID.includes(order.status as any) && !order.payments.some(p => ['CREATING', 'PENDING', 'SUCCEEDED'].includes(p.status))) await this.release(tx, order, 'Время резервирования истекло');
      }, { timeout: 30_000 });
      await this.enqueue(candidate.id);
    }
    return { checked: orders.length };
  }
  async settleVerifiedPayment(id: string, status: 'SUCCEEDED' | 'CANCELED' | 'PENDING', metadata: any) {
    const payment = await this.prisma.payment.findUnique({ where: { transactionId: id } });
    if (!payment) throw new NotFoundException('Платёж не найден');
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${payment.orderId} FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true, user: true } });
      if (metadata?.provider !== 'YOOKASSA' || current.provider !== 'YOOKASSA' || metadata.localPaymentId !== current.id || metadata.orderId !== order.id ||
        metadata.currency !== order.currency || moneyMinor(metadata.amount) !== moneyMinor(current.amount) || moneyMinor(current.amount) !== moneyMinor(order.finalAmount)) throw new BadRequestException('Сумма или принадлежность платежа не подтверждены');
      if (current.status === 'SUCCEEDED') return { duplicate: true, orderNumber: order.orderNumber, status: current.status };
      if (current.status === 'CANCELED' && status !== 'CANCELED') throw new ConflictException('Статус завершённого платежа не может измениться');
      if (status === 'PENDING') return { duplicate: current.status === 'PENDING', orderNumber: order.orderNumber, status };
      await tx.payment.update({ where: { id: current.id }, data: { status, metadata: metadata as Prisma.InputJsonValue } });
      if (status === 'CANCELED') {
        if (order.reservationState === 'ACTIVE' && UNPAID.includes(order.status as any)) await this.release(tx, order, 'Платёж отменён платёжной системой');
        return { duplicate: current.status === 'CANCELED', orderNumber: order.orderNumber, status };
      }
      if (metadata.paid !== true || !UNPAID.includes(order.status as any) || order.reservationState !== 'ACTIVE') throw new ConflictException('Оплата требует ручной проверки');
      await this.finishPaid(tx, order, 'Оплата проверена по данным ЮKassa');
      return { duplicate: false, orderNumber: order.orderNumber, status };
    }, { timeout: 30_000 });
    if (!result.duplicate) {
      const order = await this.prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
      if (order && !this.digitalOrder(order)) await this.enqueue(payment.orderId);
    }
    return result;
  }
  async repeat(number: string, actor: Actor, session: string) {
    this.validateSession(session);
    const order = await this.getAccessible(number, actor);
    if (order.userId !== actor.sub) throw new NotFoundException('Заказ не найден');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'cart-user:' + actor.sub}))`;
      const repeatInclude = { items: { include: { variant: { include: { product: true } } } } };
      let cart = await tx.cart.findUnique({ where: { sessionId: session }, include: repeatInclude });
      if (cart?.userId && cart.userId !== actor.sub) throw new NotFoundException('Корзина не найдена');
      const owned = await tx.cart.findUnique({ where: { userId: actor.sub }, include: repeatInclude });
      if (owned && cart && owned.id !== cart.id) throw new ConflictException('Обновите корзину перед повтором заказа');
      cart = cart || owned || await tx.cart.create({ data: { sessionId: session, userId: actor.sub }, include: repeatInclude });
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;
      cart = await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include: repeatInclude });
      if (cart.userId && cart.userId !== actor.sub) throw new NotFoundException('Корзина не найдена');
      const type = this.digitalOrder(order) ? 'GIFT_CARD' : 'PHYSICAL';
      if (cart.items.some(item => (item.variant.product.productType || 'PHYSICAL') !== type)) throw new ConflictException('Сертификаты и физические товары оформляются отдельно. Очистите корзину перед повтором заказа');
      await tx.cart.update({ where: { id: cart.id }, data: { userId: actor.sub, sessionId: session } });
      const unavailable: { productName: string; reason: string }[] = [];
      let added = 0;
      for (const item of order.items) {
        if (!item.variantId) { unavailable.push({ productName: item.productName, reason: 'Товар удалён из каталога' }); continue; }
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId }, include: { product: true } });
        if (variant && (variant.product.productType || 'PHYSICAL') !== (item.productType || 'PHYSICAL')) {
          unavailable.push({ productName: item.productName, reason: 'Тип товара изменился. Выберите товар заново в каталоге' }); continue;
        }
        const current = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } } });
        const available = variant?.isActive && variant.product.isActive ? variant.product.productType === 'GIFT_CARD' ? 99 - (current?.quantity || 0) : Math.max(0, variant.stock - variant.reserved - (current?.quantity || 0)) : 0;
        const quantity = Math.max(0, Math.min(item.quantity, available, 99 - (current?.quantity || 0)));
        if (quantity > 0) {
          await tx.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } },
            create: { cartId: cart.id, variantId: item.variantId, quantity }, update: { quantity: { increment: quantity } } });
          added += quantity;
        }
        if (quantity < item.quantity) unavailable.push({ productName: item.productName, reason: quantity ? 'Добавлено только доступное количество' : 'Товар недоступен или уже добавлен' });
      }
      const rawUpdated = await tx.cart.findUniqueOrThrow({
        where: {id:cart.id},
        include: {items: {include: {variant: {include: {product: {include: {images:true}}}}}}},
      });
      const updated=pricedCart(rawUpdated);
      const total = updated.items.reduce((sum, item) => sum + moneyMinor(item.variant.price) * item.quantity, 0) / 100;
      await tx.cart.update({ where: { id: cart.id }, data: { total } });
      return { cart: { ...updated, total }, added, unavailable };
    }, { timeout: 30_000 });
  }
  private async release(tx: Prisma.TransactionClient, order: any, comment: string) {
    // Same lock order as checkout: Order -> GiftCard -> LoyaltyAccount -> ProductVariant.
    if (moneyMinor(order.giftCardAmount || 0) > 0) {
      const reservation = await this.requireGiftCards().release(tx, order.id);
      if (!reservation || reservation.status !== 'RELEASED' || reservation.amountMinor !== moneyMinor(order.giftCardAmount)) throw new ConflictException('Резерв сертификата не соответствует отменяемому заказу');
    }
    if (order.bonusAmount && order.userId) {
      const account = await tx.loyaltyAccount.findUnique({ where: { userId: order.userId } });
      if (account) {
        await tx.$queryRaw`SELECT id FROM "LoyaltyAccount" WHERE id = ${account.id} FOR UPDATE`;
        const settings = await tx.loyaltyProgramSetting.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
        const updated = await tx.loyaltyAccount.update({ where: { id: account.id }, data: { balance: { increment: order.bonusAmount } } });
        await tx.loyaltyAccount.update({ where: { id: account.id }, data: { level: this.level(updated.balance, settings) } });
        await tx.loyaltyTransaction.create({ data: { accountId: account.id, orderId: order.id, amount: order.bonusAmount, type: 'REVERSAL', reason: 'Возврат бонусов за отменённый заказ', metadata: loyaltyCreditMetadata(settings) } });
      }
    }
    for (const item of [...order.items].sort((a, b) => String(a.variantId).localeCompare(String(b.variantId)))) {
      if (!item.variantId || item.productType === 'GIFT_CARD') continue;
      const released = await tx.productVariant.updateMany({ where: { id: item.variantId, reserved: { gte: item.quantity } }, data: { reserved: { decrement: item.quantity } } });
      if (released.count !== 1) throw new ConflictException('Не удалось снять резерв. Требуется проверка остатков');
    }
    await tx.promoRedemption.updateMany({ where: { orderId: order.id, status: 'RESERVED' }, data: { status: 'RELEASED' } });
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED, paymentStatus: 'CANCELED', reservationState: 'RELEASED', reservationExpiresAt: null,
      history: { create: { fromStatus: order.status, toStatus: OrderStatus.CANCELLED, comment } } } });
    await this.mail(tx, order, 'ORDER_CANCELLED', 'Заказ отменён', comment + '. Резерв товаров снят, списанные бонусы возвращены.');
  }
  private async finishPaid(tx: Prisma.TransactionClient, order: any, comment: string, giftAlreadyApplied = false) {
    const digital = this.digitalOrder(order);
    if (!giftAlreadyApplied && moneyMinor(order.giftCardAmount || 0) > 0) await this.applyGiftHold(tx, order);
    // Earn only on cash-funded merchandise, excluding shipping; never earn on a gift-card purchase.
    if (!digital) {
      const settings = await tx.loyaltyProgramSetting.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } });
      if (order.userId && order.user?.role === 'CUSTOMER_B2C' && settings.isEnabled && !order.loyaltyAccruedAt && moneyMinor(order.finalAmount) > moneyMinor(order.shippingCost)) {
        const { account: locked } = await maintainAccount(tx, order.userId, settings);
        const level = this.level(locked.balance, settings);
        const multiplier = level === 'PREMIUM' ? settings.premiumMultiplierPercent : level === 'PRO' ? settings.proMultiplierPercent : 100;
        const amount = Math.floor(Math.max(0, moneyMinor(order.finalAmount) - moneyMinor(order.shippingCost)) * settings.earnPercent * multiplier / 1_000_000);
        if (amount > 0) {
          await tx.loyaltyTransaction.create({ data: { accountId: locked.id, orderId: order.id, amount, type: 'ACCRUAL', reason: 'Бонусы за оплаченный заказ', metadata: loyaltyCreditMetadata(settings) } });
          await tx.loyaltyAccount.update({ where: { id: locked.id }, data: { balance: { increment: amount }, level: this.level(locked.balance + amount, settings) } });
        }
      }
    }
    await tx.promoRedemption.updateMany({ where: { orderId: order.id, status: 'RESERVED' }, data: { status: 'APPLIED' } });
    let paid = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paymentStatus: 'SUCCEEDED', loyaltyAccruedAt: new Date(), reservationExpiresAt: null,
      history: { create: { fromStatus: order.status, toStatus: OrderStatus.PAID, comment } } }, include: includes });
    if (digital) {
      await this.requireGiftCards().issueForPaidOrder(tx, paid);
      paid = await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.DELIVERED, reservationState: 'CONSUMED',
        history: { create: { fromStatus: OrderStatus.PAID, toStatus: OrderStatus.DELIVERED, comment: 'Электронные сертификаты выпущены и доступны покупателю' } } }, include: includes });
      const cards = await this.requireGiftCards().revealForOrder(tx, paid.id);
      if (cards.length !== paid.items.reduce((total, item) => total + item.quantity, 0)) throw new ConflictException('Не удалось подготовить доставку всех сертификатов');
      const details = cards.map((card, index) => `Сертификат ${index + 1}\nКод: ${card.code}\nНоминал: ${card.faceValue} ₽\nДействителен до: ${new Date(card.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`).join('\n\n');
      await this.mail(tx, paid, 'GIFT_CARDS_ISSUED', 'Ваши подарочные сертификаты',
        'Спасибо за покупку! Ваши электронные подарочные сертификаты:\n\n' + details +
        '\n\nВведите код в поле «Подарочный сертификат» при оформлении заказа на сайте. Любой человек, у которого есть код, может использовать сертификат. Храните это письмо в безопасности и передавайте код только получателю подарка.', true);
    }
    await this.mail(tx, paid, 'ORDER_PAID', 'Заказ оплачен', digital ? 'Оплата подтверждена. Электронные сертификаты доступны на странице заказа.' : 'Оплата подтверждена. Сумма: ' + Number(order.finalAmount) + ' ₽. Заказ передан в обработку.');
    return paid;
  }
  private digitalBasket(cart: any): boolean { return !!cart?.items?.length && cart.items.every((item: any) => item.variant?.product?.productType === 'GIFT_CARD'); }
  private digitalOrder(order: any): boolean {
    return order.priceSnapshot?.digitalDelivery === true || (!!order.items?.length && order.items.every((item: any) => item.productType === 'GIFT_CARD'));
  }
  private giftValidityDays(variant: any): number {
    const days = variant.options?.validityDays ?? variant.options?.giftCardValidityDays ?? variant.product.giftCardValidityDays;
    if (!Number.isSafeInteger(days) || days < 1 || days > 3650) throw new BadRequestException('Некорректный срок действия сертификата');
    return days;
  }
  private requireGiftCards(): GiftCardsService {
    if (!this.giftCards) throw new ConflictException('Подарочные сертификаты пока недоступны');
    return this.giftCards;
  }
  private async applyGiftHold(tx: Prisma.TransactionClient, order: any) {
    const reservation = await this.requireGiftCards().apply(tx, order.id);
    if (!reservation || reservation.status !== 'APPLIED' || reservation.amountMinor !== moneyMinor(order.giftCardAmount)) throw new ConflictException('Списание сертификата не соответствует заказу');
  }
  private async lockGiftCard(tx: Prisma.TransactionClient, code: string) {
    const codeHash = giftCodeHash(code);
    await tx.$queryRaw`SELECT id FROM "GiftCard" WHERE "codeHash" = ${codeHash} FOR UPDATE`;
  }
  private async withGiftCards(order: any, actor?: Actor, token?: string) {
    const safe = this.publicOrder(order);
    const customerAccess = order.userId ? actor?.sub === order.userId : !!token && !!order.guestAccessHash && !!order.guestAccessExpiresAt && order.guestAccessExpiresAt > new Date() && this.hash(token) === order.guestAccessHash;
    if (!this.giftCards || !customerAccess || !this.digitalOrder(order) || order.paymentStatus !== 'SUCCEEDED') return safe;
    const cards = await this.prisma.$transaction(tx => this.giftCards!.revealForOrder(tx, order.id));
    return { ...safe, giftCards: cards };
  }
  private async mail(tx: Prisma.TransactionClient, order: any, kind: string, subject: string, text: string, essential = false) {
    if (!order.buyerEmail) {
      if (essential) throw new ConflictException('Не указан email для доставки сертификатов');
      return;
    }
    if (order.userId && !essential) {
      const owner = await tx.user.findUnique({ where: { id: order.userId }, select: { notificationPreferences: true } });
      const preferences = owner?.notificationPreferences;
      if (preferences && typeof preferences === 'object' && !Array.isArray(preferences) && preferences.email === false) return;
    }
    await tx.mailOutbox.create({ data: this.notifications.prepare({ kind, recipient: order.buyerEmail, subject: subject + ': ' + order.orderNumber,
      text: 'Здравствуйте!\n' + text + '\nНомер заказа: ' + order.orderNumber + (essential ? '.' : '. Проверить заказ можно в личном кабинете. Неоплаченный заказ без активного платежа отменяется через 30 минут.'), dedupeKey: kind + ':' + order.id }) });
  }
  private async enqueue(id: string, userId?: string) { if (process.env.STOREFRONT_EXTERNAL_CALLS_ENABLED === 'true') await this.oneC.enqueueOrder(id, userId).catch(() => undefined); }
  private publicOrder(order: any) {
    const { checkoutKey, checkoutRequestHash, guestAccessHash, guestAccessExpiresAt, internalNotes, sourcePayload, oneCSyncError,
      giftCards, giftCardReservations, giftCardRedemptions, giftRedemption, giftCardCode, giftCardHash, codeHash, encryptedCode, ...safe } = order;
    return { ...safe, payments: order.payments?.map(({ metadata, ...payment }: any) => payment) };
  }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private guestToken(key: string, session: string) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) throw new ConflictException('Не настроен ключ безопасности оформления заказа');
    return createHmac('sha256', secret).update('guest-order:' + key + ':' + session).digest('hex');
  }
  private canonical(value: any): any { return Array.isArray(value) ? value.map(item => this.canonical(item)) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, this.canonical(value[key])])) : value; }
  private validateSession(session: string) { if (!session || !/^[a-zA-Z0-9_-]{16,160}$/.test(session)) throw new BadRequestException('Корзина не найдена. Обновите страницу'); }
  private level(balance: number, settings: { premiumThreshold: number; proThreshold: number }) { return balance >= settings.premiumThreshold ? 'PREMIUM' : balance >= settings.proThreshold ? 'PRO' : 'START'; }
}
