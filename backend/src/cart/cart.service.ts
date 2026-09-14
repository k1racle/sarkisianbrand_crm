import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreate(sessionId: string) {
    const existing = await this.prisma.cart.findUnique({ where: { sessionId }, include: { items: { include: { variant: { include: { product: true } } } } } });
    if (existing) return existing;
    return this.prisma.cart.create({ data: { sessionId }, include: { items: { include: { variant: { include: { product: true } } } } } });
  }

  async get(sessionId: string) {
    return this.getOrCreate(sessionId);
  }

  async add(sessionId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id: dto.variantId }, include: { product: true } });
    if (!variant || !variant.product.isActive) throw new NotFoundException('Вариант товара не найден');
    const cart = await this.getOrCreate(sessionId);
    const item = await this.prisma.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId: dto.variantId } }, update: { quantity: { increment: dto.quantity } }, create: { cartId: cart.id, variantId: dto.variantId, quantity: dto.quantity } });
    return this.recalculate(cart.id, item.id);
  }

  async update(sessionId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreate(sessionId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Позиция корзины не найдена');
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity: dto.quantity } });
    return this.recalculate(cart.id);
  }

  async remove(sessionId: string, itemId: string) {
    const cart = await this.getOrCreate(sessionId);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.recalculate(cart.id);
  }

  private async recalculate(cartId: string, _changedItemId?: string) {
    const items = await this.prisma.cartItem.findMany({ where: { cartId }, include: { variant: true } });
    const total = items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
    await this.prisma.cart.update({ where: { id: cartId }, data: { total } });
    return this.prisma.cart.findUnique({ where: { id: cartId }, include: { items: { include: { variant: { include: { product: true } } } } } });
  }
}
