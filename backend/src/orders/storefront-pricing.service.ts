import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { hashCartSession, hashShippingDestination, moneyMinor } from '../common/storefront-utils';
import { PrismaService } from '../prisma/prisma.service';
import { replayLoyaltyLedger } from '../loyalty/loyalty-core.helpers';
import { giftCodeHash, giftMoneyMinor, giftNominal, giftValidityDays } from '../gift-cards/gift-cards.helpers';

const DEFAULT_SETTINGS = {
  id: 'default', programName: 'SARKISIAN CLUB', isEnabled: true, earnPercent: 1,
  maxWriteOffPercent: 30, signupBonus: 0, birthdayBonus: 0, bonusValidityDays: 365,
  proThreshold: 3000, premiumThreshold: 10000, proMultiplierPercent: 120,
  premiumMultiplierPercent: 150,
};

/** A read-only estimate. Checkout must lock/revalidate stock, promo limits and balance. */
@Injectable()
export class StorefrontPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quote(sessionId: string, dto: any, actor?: { sub: string; role?: string }, tx?: Prisma.TransactionClient) {
    const db = tx || this.prisma;
    if (!sessionId?.trim()) throw new BadRequestException('Не найдена сессия корзины');
    const cart = await db.cart.findUnique({
      where: { sessionId },
      include: {
        user: { include: { customer: true, b2bProfile: true, organizationMemberships: { where: { isActive: true }, take: 1 } } },
        items: { include: { variant: { include: { product: true } } } },
      },
    });
    if (cart?.userId && cart.userId !== actor?.sub) throw new ForbiddenException('Нет доступа к корзине');
    if (!cart || !cart.items.length) throw new BadRequestException('Корзина пуста');
    if (cart.currency !== 'RUB') throw new BadRequestException('Оформление доступно только в рублях');
    if (cart.user && !cart.user.isActive) throw new ForbiddenException('Учётная запись недоступна');

    const productTypes = cart.items.map(item => item.variant.product.productType || 'PHYSICAL');
    if (productTypes.some(type => type !== 'PHYSICAL' && type !== 'GIFT_CARD')) throw new BadRequestException('Неизвестный тип товара');
    if (new Set(productTypes).size > 1) throw new BadRequestException('Подарочные сертификаты и физические товары оформляются отдельными заказами. Разделите корзину');
    const digitalDelivery = productTypes.every(type => type === 'GIFT_CARD');
    if (digitalDelivery && (String(dto?.promoCode || '').trim() || dto?.useBonuses === true || String(dto?.giftCardCode || '').trim())) {
      throw new BadRequestException('Подарочные сертификаты нельзя покупать с промокодом, бонусами или другим сертификатом');
    }

    let subtotalMinor = 0;
    for (const item of cart.items) {
      const { variant, quantity } = item;
      if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new BadRequestException('Некорректное количество товара');
      if (!variant.isActive || !variant.product.isActive) throw new BadRequestException(`Товар недоступен: ${variant.product.nameRu}`);
      if (variant.product.currency !== 'RUB') throw new BadRequestException('Все товары должны иметь цену в рублях');
      const unitMinor = this.minor(variant.price);
      if (digitalDelivery) {
        const options = variant.options as Prisma.JsonObject | null;
        const nominal = giftNominal(options?.nominal);
        giftValidityDays(options?.validityDays);
        if (unitMinor <= 0 || BigInt(unitMinor) !== BigInt(nominal) * 100n) {
          throw new BadRequestException('У подарочного сертификата некорректно настроены номинал, цена или срок действия');
        }
      } else if (!Number.isSafeInteger(variant.stock) || !Number.isSafeInteger(variant.reserved) || variant.reserved < 0 || variant.stock - variant.reserved < quantity) {
        throw new BadRequestException(`Недостаточно товара: ${variant.product.nameRu}`);
      }
      subtotalMinor = this.safe(BigInt(subtotalMinor) + BigInt(unitMinor) * BigInt(quantity));
    }

    const email = String(dto?.contact?.email || cart.user?.email || '').trim().toLowerCase();
    // Authenticated identity is stable even if the contact email is edited.
    // Guest email is self-declared, not verified: this is an email-based usage
    // limit, not a strong per-person identity or an anti-abuse/security control.
    // Preview falls back to session identity; checkout requires contact email
    // and must call quote again to check the final email-based limit.
    const customerHash = createHash('sha256').update(actor?.sub || email || sessionId).digest('hex');
    const requestedCode = String(dto?.promoCode || '').trim().toUpperCase();
    const messages: string[] = [];
    let promoCode: string | undefined;
    let promoDiscountMinor = 0;
    const now = new Date();
    if (requestedCode) {
      const promo = await db.promoCode.findUnique({ where: { code: requestedCode } });
      if (!promo || !promo.isActive || (promo.startsAt && promo.startsAt > now) || (promo.endsAt && promo.endsAt <= now)) {
        throw new BadRequestException('Промокод недействителен или срок его действия истёк');
      }
      if (subtotalMinor < this.minor(promo.minimumAmount)) throw new BadRequestException('Сумма товаров меньше минимальной для этого промокода');
      const where = { code: promo.code, status: { in: ['RESERVED', 'APPLIED'] } };
      const [used, customerUsed] = await Promise.all([
        db.promoRedemption.count({ where }),
        db.promoRedemption.count({ where: { ...where, customerHash } }),
      ]);
      if (promo.usageLimit !== null && used >= promo.usageLimit) throw new BadRequestException('Лимит использования промокода исчерпан');
      if (customerUsed >= promo.perCustomerLimit) throw new BadRequestException('Вы уже использовали этот промокод');
      if (promo.discountType === 'PERCENT') {
        const basisPoints = this.minor(promo.amount);
        if (basisPoints > 10000) throw new BadRequestException('Некорректные условия промокода');
        promoDiscountMinor = this.ratio(subtotalMinor, basisPoints, 10000);
      } else if (promo.discountType === 'FIXED') {
        promoDiscountMinor = this.minor(promo.amount);
      } else throw new BadRequestException('Некорректные условия промокода');
      if (promo.maximumDiscount !== null) promoDiscountMinor = Math.min(promoDiscountMinor, this.minor(promo.maximumDiscount));
      promoDiscountMinor = Math.min(promoDiscountMinor, subtotalMinor);
      promoCode = promo.code;
      if (!actor?.sub && !email) messages.push('Окончательно проверим лимит промокода после заполнения контактных данных');
    }

    const settings = await db.loyaltyProgramSetting.findUnique({ where: { id: 'default' } }) || { ...DEFAULT_SETTINGS };
    const eligible = !digitalDelivery && !!actor?.sub && cart.userId === actor.sub && cart.user?.role === 'CUSTOMER_B2C' && settings.isEnabled;
    const loyaltyAccount = eligible ? await db.loyaltyAccount.findUnique({
      where: { userId: actor!.sub }, include: { entries: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
    }) : undefined;
    const discountedSubtotal = subtotalMinor - promoDiscountMinor;
    const nominalBalance = Math.max(0, loyaltyAccount?.balance || 0);
    if (!Number.isSafeInteger(nominalBalance)) throw new BadRequestException('Некорректный бонусный баланс');
    // Read-only projection: expired credits cannot be previewed/spent even
    // before checkout's maintainAccount transaction persists their expiry.
    // Missing historic entries preserve the protected legacy opening balance.
    const balance = replayLoyaltyLedger(nominalBalance, loyaltyAccount?.entries || [], now).availableBalance;
    const maxBonusAmount = eligible ? Math.min(balance, this.ratio(discountedSubtotal, this.percent(settings.maxWriteOffPercent), 10000)) : 0;
    const bonusAmount = dto?.useBonuses === true ? maxBonusAmount : 0;
    const merchandiseMinor = discountedSubtotal - bonusAmount * 100;
    let shippingMinor = 0;
    let deliveryConfirmed = digitalDelivery;
    if (digitalDelivery) {
      messages.push('Электронные сертификаты отправим на email после подтверждения оплаты. Доставка не требуется.');
    } else if (dto?.shippingQuoteId) {
      const shipping = await db.shippingQuote.findUnique({ where: { id: dto.shippingQuoteId } });
      const destination = { ...(dto.shippingAddress || {}), provider: dto.shippingProvider, deliveryMethod: dto.deliveryMethod };
      if (!shipping || shipping.expiresAt <= now || shipping.sessionHash !== hashCartSession(sessionId) ||
          shipping.currency !== 'RUB' || shipping.provider !== dto.shippingProvider || shipping.deliveryMethod !== dto.deliveryMethod ||
          shipping.destinationHash !== hashShippingDestination(destination)) {
        throw new BadRequestException('Расчёт доставки устарел или не соответствует адресу. Рассчитайте доставку заново');
      }
      // ShippingService stores sorted variantId/quantity pairs and the total
      // weight in requestSnapshot. Recheck both: unchanged IDs/quantities alone
      // do not detect an updated variant weight after the estimate.
      const snapshot = shipping.requestSnapshot as Prisma.JsonObject | null;
      const savedItems = snapshot?.cartItems;
      const currentItems = cart.items.map(item => ({ variantId: item.variantId, quantity: item.quantity }))
        .sort((a, b) => a.variantId.localeCompare(b.variantId));
      if (!Array.isArray(savedItems) || savedItems.length !== currentItems.length ||
          savedItems.some(item => !item || typeof item !== 'object' || Array.isArray(item) ||
            typeof item.variantId !== 'string' || !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0)) {
        throw new BadRequestException('Состав корзины изменился или расчёт доставки неполный. Рассчитайте доставку заново');
      }
      const sortedSaved = (savedItems as Array<{ variantId: string; quantity: number }>).slice()
        .sort((a, b) => a.variantId.localeCompare(b.variantId));
      let weight = 0n;
      for (const item of cart.items) {
        const grams = (item.variant.options as Prisma.JsonObject | null)?.weightGrams;
        if (typeof grams !== 'number' || !Number.isSafeInteger(grams) || grams <= 0) {
          throw new BadRequestException('Вес товаров изменился или не указан. Рассчитайте доставку заново');
        }
        weight += BigInt(grams) * BigInt(item.quantity);
      }
      if (sortedSaved.some((item, index) => item.variantId !== currentItems[index].variantId || item.quantity !== currentItems[index].quantity) ||
          weight > BigInt(Number.MAX_SAFE_INTEGER) || snapshot?.weightGrams !== Number(weight)) {
        throw new BadRequestException('Состав корзины или вес товаров изменился. Рассчитайте доставку заново');
      }
      shippingMinor = this.minor(shipping.amount);
      deliveryConfirmed = true;
    } else {
      messages.push('Стоимость доставки пока не рассчитана. Указанная сумма включает только товары; это не бесплатная доставка. Оплата станет доступна после подтверждения доставки.');
    }
    if (dto?.useBonuses === true && !eligible) messages.push('Списание бонусов доступно участникам SARKISIAN CLUB после входа в аккаунт покупателя.');
    const beforeGiftMinor = this.safe(BigInt(merchandiseMinor) + BigInt(shippingMinor));
    let giftCardMinor = 0;
    let giftCardId: string | undefined;
    const giftCardCode = dto?.giftCardCode;
    if (String(giftCardCode || '').trim()) {
      // Normalization must match issuance; the raw bearer code is never returned.
      const codeHash = giftCodeHash(giftCardCode);
      const card = await db.giftCard.findUnique({ where: { codeHash }, select: { id: true, balance: true, reserved: true, expiresAt: true, isActive: true, currency: true } });
      if (!card?.isActive || card.currency !== 'RUB' || !card.expiresAt || !Number.isFinite(card.expiresAt.getTime()) || card.expiresAt <= now) throw new BadRequestException('Сертификат недействителен или срок его действия истёк');
      const available = giftMoneyMinor(card.balance) - giftMoneyMinor(card.reserved);
      if (available <= 0) throw new BadRequestException('Баланс сертификата исчерпан или уже зарезервирован');
      giftCardMinor = Math.min(available, beforeGiftMinor);
      giftCardId = card.id;
    }
    const finalMinor = beforeGiftMinor - giftCardMinor;
    let earnEstimate = 0;
    if (eligible) {
      const multiplier = balance >= settings.premiumThreshold ? settings.premiumMultiplierPercent : balance >= settings.proThreshold ? settings.proMultiplierPercent : 100;
      if (!Number.isSafeInteger(multiplier) || multiplier < 0) throw new BadRequestException('Некорректные условия бонусной программы');
      const earnableCashMinor = Math.max(0, finalMinor - shippingMinor);
      earnEstimate = this.safe(BigInt(earnableCashMinor) * BigInt(this.percent(settings.earnPercent)) * BigInt(multiplier) / 1000000n);
    }
    if (finalMinor === 0 && giftCardMinor === 0) messages.push('Заказ с нулевой суммой требует подтверждения менеджером; онлайн-оплата недоступна.');
    return {
      cart, subtotalMinor, promoDiscountMinor, bonusAmount, shippingMinor, finalMinor, deliveryConfirmed,
      promoCode, customerHash, settings, loyaltyAccount, digitalDelivery, giftCardMinor, giftCardId,
      publicQuote: {
        subtotal: subtotalMinor / 100, discount: promoDiscountMinor / 100, bonusAmount,
        shippingAmount: deliveryConfirmed ? shippingMinor / 100 : null, total: finalMinor / 100,
        currency: 'RUB' as const, digitalDelivery, giftCardAmount: giftCardMinor / 100, deliveryConfirmed,
        canPay: deliveryConfirmed && (finalMinor > 0 || giftCardMinor > 0),
        maxBonusAmount, earnEstimate, messages,
      },
    };
  }

  private minor(value: unknown): number {
    if (value === null || value === undefined || value === '') throw new BadRequestException('Некорректная денежная сумма');
    try { return moneyMinor(value); } catch { throw new BadRequestException('Некорректная денежная сумма'); }
  }

  private safe(value: bigint): number {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new BadRequestException('Сумма заказа превышает допустимое значение');
    return Number(value);
  }

  private ratio(value: number, multiplier: number, denominator: number): number {
    return this.safe(BigInt(value) * BigInt(multiplier) / BigInt(denominator));
  }

  private percent(value: number): number {
    if (!Number.isSafeInteger(value) || value < 0 || value > 100) throw new BadRequestException('Некорректные условия бонусной программы');
    return value;
  }
}
