import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrmReadAccess } from '../crm/read-access';
import { customerVisibility } from '../customer360/customer-access';

@Injectable()
export class LeadershipService {
  constructor(private readonly prisma: PrismaService, private readonly access: CrmReadAccess) {}
  overview(actor: string) {
    return this.prisma.$transaction(async db => {
      const policy = await this.access.resolve(db, actor, 'leadership.read');
      const visible = await customerVisibility(db, policy);
      const access = { sales: policy.allowed('oms.read'), customers: policy.allowed('customers.read'), crm: policy.allowed('crm.read'), helpdesk: policy.allowed('helpdesk.read'), inventory: policy.company('catalog.read') && policy.company('leadership.read') };
      const ordersWhere: Prisma.OrderWhereInput = { AND: [visible.orders, policy.orders('leadership.read')] };
      const customersWhere: Prisma.CustomerWhereInput = { AND: [visible.customers, policy.customers('leadership.read')] };
      const ticketsWhere: Prisma.HelpdeskTicketWhereInput = { AND: [visible.tickets, policy.tickets('leadership.read')] };
      const now = new Date(), currentFrom = new Date(now.getTime() - 30 * 86400000), previousFrom = new Date(now.getTime() - 60 * 86400000);
      const paid: Prisma.OrderWhereInput = { paymentStatus: 'SUCCEEDED', status: { notIn: ['CANCELLED', 'REFUNDED'] } };
      const currentWhere = { ...paid, createdAt: { gte: currentFrom, lt: now }, AND: [ordersWhere] };
      const [current, previous, customers, newCustomers, lowStock, openLeads, activeTasks, helpdeskOpen, helpdeskOverdue, recentOrders, channels] = await Promise.all([
        access.sales ? db.order.aggregate({ where: currentWhere, _count: true, _sum: { finalAmount: true } }) : null,
        access.sales ? db.order.aggregate({ where: { ...paid, createdAt: { gte: previousFrom, lt: currentFrom }, AND: [ordersWhere] }, _count: true, _sum: { finalAmount: true } }) : null,
        access.customers ? db.customer.count({ where: customersWhere }) : null,
        access.customers ? db.customer.count({ where: { AND: [customersWhere, { createdAt: { gte: currentFrom, lt: now } }] } }) : null,
        access.inventory ? db.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }) : null,
        access.crm ? db.lead.count({ where: { AND: [visible.leads, policy.leads('leadership.read')], status: { notIn: ['WON', 'LOST'] } } }) : null,
        access.crm ? db.task.count({ where: { AND: [visible.tasks, policy.tasks('leadership.read')], status: { notIn: ['DONE', 'CANCELLED'] } } }) : null,
        access.helpdesk ? db.helpdeskTicket.count({ where: { AND: [ticketsWhere], status: { notIn: ['RESOLVED', 'CLOSED'] } } }) : null,
        access.helpdesk ? db.helpdeskTicket.count({ where: { AND: [ticketsWhere], resolutionDueAt: { lt: now }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }) : null,
        access.sales ? db.order.findMany({ where: ordersWhere, take: 6, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { id: true, orderNumber: true, finalAmount: true, status: true, source: true, createdAt: true } }) : [],
        access.sales ? db.order.groupBy({ by: ['source'], where: currentWhere, _count: true, _sum: { finalAmount: true } }) : [],
      ]);
      const revenue = current ? Number(current._sum.finalAmount || 0) : null;
      const previousRevenue = previous ? Number(previous._sum.finalAmount || 0) : null;
      const growth = revenue === null || previousRevenue === null ? null : previousRevenue ? (revenue - previousRevenue) / previousRevenue * 100 : revenue ? null : 0;
      const channelRows = channels.map(item => ({ channel: item.source, orders: item._count, revenue: Number(item._sum.finalAmount || 0) }));
      return {
        access, scope: policy.company('leadership.read') ? 'COMPANY_WITH_DOMAIN_LIMITS' : 'SCOPED', period: { from: currentFrom, to: now },
        sales: { revenue, orders: current?._count ?? null, averageOrder: current ? current._count ? revenue! / current._count : 0 : null, previousRevenue, growth, basis: 'CONFIRMED_PAYMENTS' },
        customers: { total: customers, new: newCustomers }, operations: { lowStock, openLeads, activeTasks, helpdeskOpen, helpdeskOverdue },
        channels: channelRows, marketplaces: channelRows.filter(item => ['WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET'].includes(item.channel)), recentOrders,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
  }
}
