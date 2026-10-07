import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { OperationalContext, withOperationalAccess } from '../common/operational-access';
import { InventoryPageDto, InventoryQueryDto } from './dto/inventory.dto';
import { orderAccessWhere } from './oms-read.service';

// An expired reservation still holds inventory until its release is actually committed.
export const reservedOrders: Prisma.OrderWhereInput = { reservationState: 'ACTIVE', status: { notIn: ['CANCELLED','REFUNDED','DELIVERED','SHIPPED'] } };
const sums = { quantity: true, shippedQuantity: true, cancelledQuantity: true, pickedQuantity: true } as const;
export function pendingQuantities(sum: any) {
 const remaining = Math.max(0, Number(sum?.quantity || 0) - Number(sum?.shippedQuantity || 0) - Number(sum?.cancelledQuantity || 0));
 const picked = Math.min(remaining, Math.max(0, Number(sum?.pickedQuantity || 0) - Number(sum?.shippedQuantity || 0)));
 return { remaining, picked, toPick: remaining - picked };
}
export function stockQuantities(stock: number, reserved: number, allocated: number) {
 return { available: Math.max(0, stock - reserved), shortage: Math.max(0, reserved - stock), reservationDifference: reserved - allocated };
}
const variantSelect = {
 id: true, sku: true, name: true, options: true, price: true, stock: true, reserved: true, damagedStock: true, isActive: true,
 product: { select: { id: true, nameRu: true, sku: true, vendorCode: true, currency: true, isActive: true, externalId: true,
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' as const }, take: 1 },
  categories: { select: { category: { select: { id: true, nameRu: true } } } } } },
} satisfies Prisma.ProductVariantSelect;

export class OmsInventoryService {
 constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
 private run<T>(actor: string, action: (ctx: OperationalContext) => Promise<T>) {
  return withOperationalAccess(this.prisma, this.access, actor, 'oms', false, async ctx => {
   const inventory = await this.access.resolve(ctx.db, actor, 'inventory.read');
   if (!inventory.company('inventory.read')) throw new ForbiddenException('Для просмотра общих остатков требуется область «Вся компания»');
   return action(ctx);
  });
 }
 private filter(ctx: OperationalContext, query: InventoryQueryDto): Prisma.ProductVariantWhereInput {
  const search = query.search?.trim(), fields = ctx.db.productVariant.fields;
  return { AND: [
   { product: { productType: 'PHYSICAL', ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}) } },
   ...(query.activity === 'ACTIVE' ? [{ isActive: true, product: { isActive: true } }] : query.activity === 'INACTIVE' ? [{ OR: [{ isActive: false }, { product: { isActive: false } }] }] : []),
   ...(search ? [{ OR: [{ sku: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }, { product: { OR: ['nameRu','sku','vendorCode'].map(key => ({ [key]: { contains: search, mode: 'insensitive' } })) } }] }] : []),
   ...(query.stock === 'RESERVED' ? [{ reserved: { gt: 0 } }] : query.stock === 'AVAILABLE' ? [{ stock: { gt: fields.reserved } }] : query.stock === 'SHORTAGE' ? [{ reserved: { gt: fields.stock } }] : query.stock === 'EMPTY' ? [{ stock: { lte: 0 } }] : query.stock === 'DAMAGED' ? [{ damagedStock: { gt: 0 } }] : []),
  ] };
 }
 private row(variant: any, allocated: any, visible: any) {
  const all = pendingQuantities(allocated), permitted = pendingQuantities(visible);
  return { id: variant.id, sku: variant.sku, name: variant.product.nameRu, variantName: variant.name, options: variant.options, productId: variant.product.id, productSku: variant.product.sku, vendorCode: variant.product.vendorCode,
   image: variant.product.images[0] || null, categories: variant.product.categories.map((item: any) => item.category), active: variant.isActive && variant.product.isActive,
   price: variant.price, currency: variant.product.currency, externalId: variant.product.externalId,
   stock: variant.stock, reserved: variant.reserved, damaged: variant.damagedStock, ...stockQuantities(variant.stock, variant.reserved, all.remaining),
   allocated: all.remaining, visibleReserved: permitted.remaining, toShip: permitted.remaining, picked: permitted.picked, toPick: permitted.toPick };
 }
 list(actor: string, query: InventoryQueryDto) { return this.run(actor, async ctx => {
  const db = ctx.db, where = this.filter(ctx, query), page = query.page || 1, limit = query.limit || 30;
  const visibleOrder = { AND: [reservedOrders, orderAccessWhere(ctx)] };
  const [rows, total, totals, pending, categories] = await Promise.all([
   db.productVariant.findMany({ where, select: variantSelect, orderBy: [{ product: { nameRu: 'asc' } }, { sku: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
   db.productVariant.count({ where }), db.productVariant.aggregate({ where, _sum: { stock: true, reserved: true } }),
   db.orderItem.aggregate({ where: { variant: { is: where }, order: visibleOrder }, _sum: sums }),
   db.category.findMany({ where: { products: { some: { product: { productType: 'PHYSICAL' } } } }, select: { id: true, nameRu: true }, orderBy: [{ nameRu: 'asc' }, { id: 'asc' }] }),
  ]);
  const ids = rows.map(row => row.id);
  const all = ids.length ? await db.orderItem.groupBy({ by: ['variantId'], where: { variantId: { in: ids }, order: reservedOrders }, _sum: sums }) : [];
  const visible = ctx.read.company('oms.read') ? all : ids.length ? await db.orderItem.groupBy({ by: ['variantId'], where: { variantId: { in: ids }, order: visibleOrder }, _sum: sums }) : [];
  return { items: rows.map(row => this.row(row, all.find(item => item.variantId === row.id)?._sum, visible.find(item => item.variantId === row.id)?._sum)), total, page, pages: Math.max(1, Math.ceil(total / limit)),
   summary: { positions: total, stock: totals._sum.stock || 0, reserved: totals._sum.reserved || 0, toShip: pendingQuantities(pending._sum).remaining },
   categories, allOrdersVisible: ctx.read.company('oms.read'), asOf: new Date() };
 }); }
 detail(actor: string, id: string, query: InventoryPageDto) { return this.run(actor, async ctx => {
  const db = ctx.db, page = query.page || 1, limit = query.limit || 30;
  const variant = await db.productVariant.findFirst({ where: { id, product: { productType: 'PHYSICAL' } }, select: variantSelect });
  if (!variant) throw new NotFoundException('Товарная позиция не найдена');
  const orderWhere = { AND: [reservedOrders, orderAccessWhere(ctx)] };
  const [allocated, groups] = await Promise.all([
   db.orderItem.aggregate({ where: { variantId: id, order: reservedOrders }, _sum: sums }),
   db.orderItem.groupBy({ by: ['orderId'], where: { variantId: id, order: orderWhere }, _sum: sums }),
  ]);
  const pending = groups.map(group => ({ id: group.orderId, ...pendingQuantities(group._sum) })).filter(group => group.remaining > 0);
  const orderIds = pending.map(group => group.id);
  const orders = orderIds.length ? await db.order.findMany({ where: { AND: [orderWhere, { id: { in: orderIds } }] },
   select: { id: true, orderNumber: true, source: true, status: true, createdAt: true, deliveryDate: true, reservationExpiresAt: true, fulfillmentManaged: true, buyerName: true, organizationId: true, shippingAddress: true, shippingProvider: true, manager: { select: { firstName: true, lastName: true } } },
   orderBy: [{ deliveryDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit,
  }) : [];
  const organizations = await db.organization.findMany({ where: { AND: [ctx.visible.organizations, { id: { in: orders.map(row => row.organizationId).filter((value): value is string => !!value) } }] }, select: { id: true, name: true } });
  const totals = pending.reduce((sum, item) => ({ remaining: sum.remaining + item.remaining, picked: sum.picked + item.picked }), { remaining: 0, picked: 0 });
  const item = this.row(variant, allocated._sum, { quantity: totals.remaining, pickedQuantity: totals.picked });
  const now = new Date();
  return { item, orders: orders.map(order => ({ id: order.id, orderNumber: order.orderNumber, source: order.source, status: order.status, createdAt: order.createdAt, deliveryDate: order.deliveryDate,
   destination: organizations.find(org => org.id === order.organizationId)?.name || order.buyerName || 'Получатель не указан',
   shippingAddress: order.shippingAddress, shippingProvider: order.shippingProvider, manager: [order.manager?.firstName, order.manager?.lastName].filter(Boolean).join(' ') || null,
   fulfillmentManaged: order.fulfillmentManaged, reservationExpiresAt: order.reservationExpiresAt, reservationExpired: !!order.reservationExpiresAt && order.reservationExpiresAt <= now,
   ...pending.find(group => group.id === order.id),
  })), total: pending.length, page, pages: Math.max(1, Math.ceil(pending.length / limit)), allOrdersVisible: ctx.read.company('oms.read'), asOf: now };
 }); }
}
