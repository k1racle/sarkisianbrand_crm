import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorefrontAddressDto } from './dto/storefront.dto';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService, private readonly loyaltyService: LoyaltyService) {}

  async dashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    if (!user?.isActive) throw new NotFoundException('Учётная запись недоступна');
    const [orders, loyalty, addresses, favoriteCount, orderCount, paid, settings, giftCards] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        select: {
          id: true, orderNumber: true, status: true, createdAt: true, finalAmount: true,
          items: { select: { id: true, variantId: true, productName: true, variantName: true, quantity: true, price: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      user.role === 'CUSTOMER_B2C' ? this.loyaltyService.account(userId) : Promise.resolve(null),
      this.prisma.storefrontAddress.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.productFavorite.count({ where: { userId } }),
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.aggregate({
        where: {
          userId, status: { in: ['PAID', 'ASSEMBLING', 'SHIPPED', 'DELIVERED'] },
          // Verified payments take precedence; imported legacy paid orders have no payment rows.
          OR: [{ payments: { some: { status: 'SUCCEEDED' } } }, { payments: { none: {} } }],
        },
        _sum: { finalAmount: true },
      }),
      this.prisma.loyaltyProgramSetting.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' } }),
      this.prisma.giftCard.findMany({
        where: { sourceOrder: { userId } },
        select: {
          id: true, maskedCode: true, faceValue: true, balance: true, reserved: true,
          expiresAt: true, isActive: true, sourceOrder: { select: { orderNumber: true } },
        },
        orderBy: { id: 'desc' },
      }),
    ]);
    const level = loyalty ? this.loyaltyView(loyalty.balance, settings) : null;
    return {
      summary: { orders: orderCount, spent: Number(paid._sum.finalAmount || 0), favoriteCount },
      orders,
      addresses,
      giftCards: giftCards.flatMap(card => {
        const orderNumber = card.sourceOrder?.orderNumber;
        if (!orderNumber) return [];
        return [{
        id: card.id, maskedCode: card.maskedCode, faceValue: card.faceValue,
        balance: card.balance, reserved: card.reserved, expiresAt: card.expiresAt,
        isActive: card.isActive, orderNumber,
        }];
      }),
      loyalty: loyalty ? { ...loyalty, ...level, isEligible: true } : { isEligible: false, isEnabled: false, programName: settings.programName, balance: 0, entries: [] },
    };
  }

  async bindCart(userId: string, sessionId: string) {
    if (!sessionId || !/^[a-zA-Z0-9_-]{16,128}$/.test(sessionId)) throw new BadRequestException('Не найдена сессия корзины');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'cart-user:' + userId}))`;
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'cart-session:' + sessionId}))`;
      const guest = await tx.cart.findUnique({ where: { sessionId }, include: { items: true } });
      const owned = await tx.cart.findUnique({ where: { userId }, include: { items: true } });
      for (const id of [...new Set([guest?.id, owned?.id].filter(Boolean))].sort()) await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${id} FOR UPDATE`;
      const freshGuest = guest ? await tx.cart.findUniqueOrThrow({ where: { id: guest.id }, include: { items: true } }) : null;
      if (freshGuest?.userId && freshGuest.userId !== userId) throw new BadRequestException('Корзина принадлежит другой учётной записи');
      let cartId: string;
      const adjustments: string[] = [];
      if (owned && freshGuest && owned.id !== freshGuest.id) {
        for (const item of freshGuest.items) {
          const current = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: owned.id, variantId: item.variantId } } });
          const requested = (current?.quantity || 0) + item.quantity;
          const quantity = Math.min(99, requested);
          if (quantity !== requested) adjustments.push('Количество одной из позиций ограничено 99 штуками. Проверьте корзину');
          await tx.cartItem.upsert({ where: { cartId_variantId: { cartId: owned.id, variantId: item.variantId } },
            create: { cartId: owned.id, variantId: item.variantId, quantity }, update: { quantity } });
        }
        await tx.cart.delete({ where: { id: freshGuest.id } });
        await tx.cart.update({ where: { id: owned.id }, data: { sessionId } });
        cartId = owned.id;
      } else if (freshGuest) {
        await tx.cart.update({ where: { id: freshGuest.id }, data: { userId } });
        cartId = freshGuest.id;
      } else if (owned) {
        await tx.cart.update({ where: { id: owned.id }, data: { sessionId } });
        cartId = owned.id;
      } else cartId = (await tx.cart.create({ data: { sessionId, userId } })).id;
      const cart = await tx.cart.findUniqueOrThrow({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } } });
      const total = cart.items.reduce((sum, item) => sum + Math.round(Number(item.variant.price) * 100) * item.quantity, 0) / 100;
      await tx.cart.update({ where: { id: cartId }, data: { total } });
      return { ...cart, total, adjustments };
    }, { timeout: 30_000 });
  }

  favorites(userId: string) {
    return this.prisma.productFavorite.findMany({
      where: { userId, product: { isActive: true } },
      include: { product: { include: { images: true, variants: true, categories: { include: { category: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) throw new NotFoundException('Товар не найден');
    return this.prisma.productFavorite.upsert({ where: { userId_productId: { userId, productId } }, update: {}, create: { userId, productId } });
  }

  async removeFavorite(userId: string, productId: string) {
    await this.prisma.productFavorite.deleteMany({ where: { userId, productId } });
    return { productId, removed: true };
  }

  addresses(userId: string) {
    return this.prisma.storefrontAddress.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  }

  async createAddress(userId: string, dto: StorefrontAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.storefrontAddress.count({ where: { userId } });
      const makeDefault = dto.isDefault || count === 0;
      if (makeDefault) await tx.storefrontAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.storefrontAddress.create({ data: { ...dto, label: dto.label || 'Основной', userId, isDefault: makeDefault } });
    });
  }

  async updateAddress(userId: string, id: string, dto: StorefrontAddressDto) {
    if (!await this.prisma.storefrontAddress.findFirst({ where: { id, userId } })) throw new NotFoundException('Адрес не найден');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.storefrontAddress.updateMany({ where: { userId, id: { not: id } }, data: { isDefault: false } });
      return tx.storefrontAddress.update({ where: { id }, data: dto });
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.prisma.storefrontAddress.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Адрес не найден');
    await this.prisma.storefrontAddress.delete({ where: { id } });
    if (address.isDefault) {
      const next = await this.prisma.storefrontAddress.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.storefrontAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { id, deleted: true };
  }

  private loyaltyView(balance: number, settings: {
    proThreshold: number; premiumThreshold: number; programName: string;
    isEnabled: boolean; earnPercent: number; maxWriteOffPercent: number;
  }) {
    const level = balance >= settings.premiumThreshold ? 'PREMIUM' : balance >= settings.proThreshold ? 'PRO' : 'START';
    const labels: Record<string, string> = { START: 'Старт', PRO: 'Профессионал', PREMIUM: 'Премиум' };
    const floor = level === 'PREMIUM' ? settings.premiumThreshold : level === 'PRO' ? settings.proThreshold : 0;
    const ceiling = level === 'START' ? settings.proThreshold : settings.premiumThreshold;
    return {
      level, levelLabel: labels[level],
      progress: level === 'PREMIUM' ? 100 : Math.max(0, Math.min(100, Math.round(((balance - floor) / Math.max(1, ceiling - floor)) * 100))),
      toNextLevel: Math.max(0, ceiling - balance), nextLevelLabel: level === 'START' ? labels.PRO : level === 'PRO' ? labels.PREMIUM : null,
      programName: settings.programName, isEnabled: settings.isEnabled,
      earnPercent: settings.earnPercent, maxWriteOffPercent: settings.maxWriteOffPercent,
    };
  }

  private async recalculateCart(cartId: string) {
    const items = await this.prisma.cartItem.findMany({ where: { cartId }, include: { variant: true } });
    const total = items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    await this.prisma.cart.update({ where: { id: cartId }, data: { total } });
    return this.cartView(cartId);
  }

  private cartView(cartId: string) {
    return this.prisma.cart.findUnique({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } } });
  }
}
