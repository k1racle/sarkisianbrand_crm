import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorefrontAddressDto } from './dto/storefront.dto';

@Injectable()
export class StorefrontService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(userId: string) {
    const [orders, loyalty, addresses, favoriteCount] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.prisma.loyaltyAccount.upsert({
        where: { userId }, update: {}, create: { userId },
        include: { entries: { orderBy: { createdAt: 'desc' }, take: 30 } },
      }),
      this.prisma.storefrontAddress.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.productFavorite.count({ where: { userId } }),
    ]);
    const spent = orders.filter((order) => !['CANCELLED', 'REFUNDED'].includes(order.status)).reduce((sum, order) => sum + Number(order.finalAmount), 0);
    const level = this.loyaltyView(loyalty.balance, loyalty.level);
    return {
      summary: { orders: orders.length, spent, favoriteCount },
      orders,
      addresses,
      loyalty: { ...loyalty, ...level },
    };
  }

  async bindCart(userId: string, sessionId: string) {
    const guest = await this.prisma.cart.findUnique({ where: { sessionId }, include: { items: true } });
    const owned = await this.prisma.cart.findUnique({ where: { userId }, include: { items: true } });
    if (guest?.userId && guest.userId !== userId) throw new BadRequestException('Корзина принадлежит другой учётной записи');
    if (guest && guest.id === owned?.id) return this.cartView(guest.id);

    if (owned && guest) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of guest.items) {
          await tx.cartItem.upsert({
            where: { cartId_variantId: { cartId: owned.id, variantId: item.variantId } },
            update: { quantity: { increment: item.quantity } },
            create: { cartId: owned.id, variantId: item.variantId, quantity: item.quantity },
          });
        }
        await tx.cart.delete({ where: { id: guest.id } });
        await tx.cart.update({ where: { id: owned.id }, data: { sessionId } });
      });
      return this.recalculateCart(owned.id);
    }
    if (guest) {
      await this.prisma.cart.update({ where: { id: guest.id }, data: { userId } });
      return this.recalculateCart(guest.id);
    }
    if (owned) {
      await this.prisma.cart.update({ where: { id: owned.id }, data: { sessionId } });
      return this.recalculateCart(owned.id);
    }
    const created = await this.prisma.cart.create({ data: { userId, sessionId } });
    return this.cartView(created.id);
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

  private loyaltyView(balance: number, storedLevel: string) {
    const level = storedLevel === 'PREMIUM' || balance >= 10000 ? 'PREMIUM' : storedLevel === 'PRO' || balance >= 3000 ? 'PRO' : 'START';
    const labels: Record<string, string> = { START: 'Старт', PRO: 'Профессионал', PREMIUM: 'Премиум' };
    const floor = level === 'PREMIUM' ? 10000 : level === 'PRO' ? 3000 : 0;
    const ceiling = level === 'PREMIUM' ? 10000 : level === 'PRO' ? 10000 : 3000;
    return { level, levelLabel: labels[level], progress: level === 'PREMIUM' ? 100 : Math.round(((balance - floor) / (ceiling - floor)) * 100), toNextLevel: Math.max(0, ceiling - balance) };
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
