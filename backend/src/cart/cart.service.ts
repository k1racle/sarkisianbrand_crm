import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { moneyMinor } from '../common/storefront-utils';
import { pricedCart } from '../common/product-merchandising';
const view = {
  items: {
    include: {
      variant: {
        include: {
          product: { include: { images: true, categories: { include: { category: true } } } },
        },
      },
    },
  },
};
@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}
  private async getOrCreate(db: Prisma.TransactionClient | PrismaClient, sessionId: string, userId?: string) {
    const cart = await db.cart.upsert({ where: { sessionId }, update: {}, create: { sessionId }, include: view });
    if (cart.userId && cart.userId !== userId) throw new ForbiddenException('Корзина принадлежит другой учётной записи');
    return cart;
  }
  async get(sessionId: string, userId?: string) {
    const cart=pricedCart(await this.getOrCreate(this.prisma,sessionId,userId));
    return {...cart,total:cart.items.reduce((sum,item)=>sum+moneyMinor(item.variant.price)*item.quantity,0)/100};
  }
  private async modify<T>(sessionId: string, userId: string | undefined, action: (tx: Prisma.TransactionClient, cart: any) => Promise<T>) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'cart-session:' + sessionId}))`;
      const cart = await this.getOrCreate(tx, sessionId, userId);
      await tx.$queryRaw`SELECT id FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;
      const current = await tx.cart.findUniqueOrThrow({ where: { id: cart.id } });
      if (current.userId && current.userId !== userId) throw new ForbiddenException('Нет доступа к корзине');
      await action(tx, cart);
      const updated = pricedCart(await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include: view }));
      const total = updated.items.reduce((sum, item) => sum + moneyMinor(item.variant.price) * item.quantity, 0) / 100;
      await tx.cart.update({ where: { id: cart.id }, data: { total } });
      return { ...updated, total };
    }, { timeout: 15_000 });
  }
  async add(sessionId: string, dto: AddCartItemDto, userId?: string) {
    return this.modify(sessionId, userId, async (tx, cart) => {
      const variant = await tx.productVariant.findUnique({ where: { id: dto.variantId }, include: { product: true } });
      if (!variant?.isActive || !variant.product.isActive) throw new NotFoundException('Товар недоступен');
      const gift = variant.product.productType === 'GIFT_CARD';
      if (cart.items.some((item: any) => (item.variant.product.productType === 'GIFT_CARD') !== gift)) throw new BadRequestException('Подарочную карту нужно оформить отдельно от других товаров');
      const current = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } } });
      const quantity = (current?.quantity || 0) + dto.quantity;
      if (quantity > 99 || (!gift && variant.stock - variant.reserved < quantity)) throw new BadRequestException('Недостаточно товара для добавления в корзину');
      await tx.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } }, update: { quantity }, create: { cartId: cart.id, variantId: dto.variantId, quantity } });
    });
  }
  async update(sessionId: string, itemId: string, dto: UpdateCartItemDto, userId?: string) {
    return this.modify(sessionId, userId, async (tx, cart) => {
      const item = await tx.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { include: { product: true } } } });
      if (!item) throw new NotFoundException('Позиция корзины не найдена');
      if (!item.variant.isActive || !item.variant.product.isActive || dto.quantity > 99 || (item.variant.product.productType !== 'GIFT_CARD' && item.variant.stock - item.variant.reserved < dto.quantity)) throw new BadRequestException('Это количество товара недоступно');
      await tx.cartItem.update({ where: { id: itemId }, data: { quantity: dto.quantity } });
    });
  }
  async remove(sessionId: string, itemId: string, userId?: string) {
    return this.modify(sessionId, userId, async (tx, cart) => { await tx.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } }); });
  }
}
