import { NotFoundException } from '@nestjs/common';
import { MarketplaceChannel, OrderSource, OrderStatus, Prisma } from '@prisma/client';
import { CrmReadAccess } from '../crm/read-access';
import { OperationalContext, withOperationalAccess } from '../common/operational-access';
import { PrismaService } from '../prisma/prisma.service';
import { OmsOrderListDto } from './dto/order-list.dto';

export const marketplaceSources: OrderSource[] = ['WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET'];
export function orderAccessWhere(ctx: OperationalContext, domain = 'oms'): Prisma.OrderWhereInput {
  return { AND: [ctx.read.orders(domain + '.read'), ...(ctx.write ? [ctx.write.orders(domain + '.write')] : [])] };
}
export function orderSelect(ctx: OperationalContext, detail = false): Prisma.OrderSelect {
  // Never return checkout/guest hashes, raw source payloads or payment metadata.
  return {
    id: true, orderNumber: true, source: true, status: true, managerId: true, externalOrderId: true,
    buyerName: true, buyerEmail: true, buyerPhone: true, customerId: true, organizationId: true,
    totalAmount: true, discountAmount: true, finalAmount: true, currency: true, shippingAddress: true,
    shippingProvider: true, shippingCost: true, trackingNumber: true, deliveryDate: true,
    paymentStatus: true, paymentMethod: true, internalNotes: true, comments: true, createdAt: true, updatedAt: true,
    user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
    items: { select: { id: true, productName: true, variantName: true, price: true, quantity: true, total: true, externalSku: true, offerId: true } },
    history: { select: { id: true, fromStatus: true, toStatus: true, comment: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: detail ? 100 : 5 },
    ...(detail ? {
      payments: { select: { id: true, amount: true, currency: true, provider: true, status: true, createdAt: true } },
      helpdeskTickets: { where: ctx.visible.tickets, select: { id: true, number: true, subject: true, status: true } },
    } : {}),
  };
}
export class OmsReadService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  private run<T>(actor: string, domain: 'oms' | 'marketplace', fn: (ctx: OperationalContext) => Promise<T>) {
    return withOperationalAccess(this.prisma, this.access, actor, domain, false, fn);
  }
  async views(ctx: OperationalContext, rows: any[], domain = 'oms') {
    if (!rows.length) return [];
    const ids = (key: string) => [...new Set<string>(rows.map(row => row[key]).filter(Boolean))];
    const [customers, organizations, writable] = await Promise.all([
      ctx.db.customer.findMany({ where: { AND: [ctx.visible.customers, { id: { in: ids('customerId') } }] }, select: { id: true, firstName: true, lastName: true, email: true, phone: true, segment: true } }),
      ctx.db.organization.findMany({ where: { AND: [ctx.visible.organizations, { id: { in: ids('organizationId') } }] }, select: { id: true, name: true, inn: true } }),
      ctx.read.allowed(domain + '.write') ? (async () => {
        const write = ctx.write || await this.access.resolve(ctx.db, ctx.read.actorId, domain + '.write');
        return ctx.db.order.findMany({ where: { AND: [ctx.read.orders(domain + '.read'), write.orders(domain + '.write'), { id: { in: ids('id') } }] }, select: { id: true } });
      })() : [] as { id: string }[],
    ]);
    return rows.map(row => {
      const customer = customers.find(item => item.id === row.customerId) || null, organization = organizations.find(item => item.id === row.organizationId) || null;
      return { ...row, customer, organization, customerId: customer?.id || null, organizationId: organization?.id || null, canWrite: writable.some(item => item.id === row.id) };
    });
  }
  private filter(ctx: OperationalContext, source?: OrderSource, status?: OrderStatus, search?: string): Prisma.OrderWhereInput {
    const query = search?.trim();
    return { AND: [orderAccessWhere(ctx), { ...(source ? { source } : {}), ...(status ? { status } : {}), ...(query ? { OR: [
      { orderNumber: { contains: query, mode: 'insensitive' } }, { externalOrderId: { contains: query, mode: 'insensitive' } },
      { buyerName: { contains: query, mode: 'insensitive' } }, { buyerEmail: { contains: query, mode: 'insensitive' } }, { buyerPhone: { contains: query } },
      { organization: { is: { AND: [ctx.visible.organizations, { OR: [{ name: { contains: query, mode: 'insensitive' } }, { inn: { contains: query } }] }] } } },
      { user: { email: { contains: query, mode: 'insensitive' } } },
    ] } : {}) }] };
  }
  dashboard(actor: string) { return this.run(actor, 'oms', async ctx => {
    const where = orderAccessWhere(ctx), db = ctx.db;
    const [total, attention, revenue, channels] = await Promise.all([
      db.order.count({ where }), db.order.count({ where: { AND: [where, { status: { in: ['NEW', 'CONFIRMED', 'PAYMENT_WAITING'] } }] } }),
      db.order.aggregate({ where: { AND: [where, { status: { notIn: ['CANCELLED', 'REFUNDED'] } }] }, _sum: { finalAmount: true } }),
      db.order.groupBy({ by: ['source'], orderBy: { source: 'asc' }, where, _count: true, _sum: { finalAmount: true } }),
    ]);
    return { total, attention, revenue: Number(revenue._sum.finalAmount || 0), channels: channels.map(item => ({ source: item.source, orders: item._count, revenue: Number(item._sum?.finalAmount || 0) })) };
  }); }
  orders(actor: string, source?: OrderSource, status?: OrderStatus, search?: string) { return this.run(actor, 'oms', async ctx =>
    this.views(ctx, await ctx.db.order.findMany({ where: this.filter(ctx, source, status, search), select: orderSelect(ctx), orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 300 }))
  ); }
  order(actor: string, id: string) { return this.run(actor, 'oms', async ctx => {
    const order = await ctx.db.order.findFirst({ where: { AND: [orderAccessWhere(ctx), { OR: [{ id }, { orderNumber: id }] }] }, select: orderSelect(ctx, true) });
    if (!order) throw new NotFoundException('Заказ не найден или недоступен');
    return (await this.views(ctx, [order]))[0];
  }); }
  listOrders(actor: string, query: OmsOrderListDto) { return this.run(actor, 'oms', async ctx => {
    const { page = 1, limit = 30 } = query, where = this.filter(ctx, query.source, query.status, query.search);
    const [items, total] = await Promise.all([
      ctx.db.order.findMany({ where, select: orderSelect(ctx), orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }), ctx.db.order.count({ where }),
    ]);
    return { items: await this.views(ctx, items), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }); }
  marketplaceOrders(actor: string, channel?: MarketplaceChannel) { return this.run(actor, 'marketplace', async ctx => {
    const rows = await ctx.db.order.findMany({ where: { AND: [orderAccessWhere(ctx, 'marketplace'), { source: channel ? channel as unknown as OrderSource : { in: marketplaceSources } }] }, select: orderSelect(ctx), orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 200 });
    return this.views(ctx, rows, 'marketplace');
  }); }
  marketplaceDashboard(actor: string) { return this.run(actor, 'marketplace', async ctx => {
    const where: Prisma.OrderWhereInput = { AND: [orderAccessWhere(ctx, 'marketplace'), { source: { in: marketplaceSources } }] };
    const [total, open, channels] = await Promise.all([
      ctx.db.order.count({ where }), ctx.db.order.count({ where: { AND: [where, { status: { in: ['NEW', 'CONFIRMED', 'ASSEMBLING'] } }] } }),
      ctx.db.order.groupBy({ by: ['source'], orderBy: { source: 'asc' }, where, _count: { _all: true }, _sum: { finalAmount: true } }),
    ]);
    return { total, open, channels: channels.map(item => ({ channel: item.source, _count: item._count, _sum: { totalAmount: item._sum?.finalAmount || 0 } })) };
  }); }
}
