import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadershipService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const currentFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const closedStatuses = ['CANCELLED', 'REFUNDED'] as const;
    const [current, previous, customers, newCustomers, lowStock, openLeads, activeTasks, helpdeskOpen, helpdeskOverdue, recentOrders, channelGroups] = await Promise.all([
      this.prisma.order.aggregate({ where: { createdAt: { gte: currentFrom }, status: { notIn: [...closedStatuses] } }, _count: true, _sum: { finalAmount: true }, _avg: { finalAmount: true } }),
      this.prisma.order.aggregate({ where: { createdAt: { gte: previousFrom, lt: currentFrom }, status: { notIn: [...closedStatuses] } }, _count: true, _sum: { finalAmount: true } }),
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: currentFrom } } }),
      this.prisma.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
      this.prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
      this.prisma.task.count({ where: { status: { not: 'DONE' } } }),
      this.prisma.helpdeskTicket.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.helpdeskTicket.count({ where: { resolutionDueAt: { lt: now }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.order.findMany({ take: 6, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, externalOrderId: true, finalAmount: true, status: true, source: true, sourceChannel: true, createdAt: true } }),
      this.prisma.order.groupBy({ by: ['source'], where: { createdAt: { gte: currentFrom }, status: { notIn: [...closedStatuses] } }, _count: true, _sum: { finalAmount: true } }),
    ]);
    const revenue = Number(current._sum.finalAmount || 0);
    const orders = current._count;
    const previousRevenue = Number(previous._sum.finalAmount || 0);
    const growth = previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : revenue ? 100 : 0;
    return {
      period: { from: currentFrom, to: now },
      sales: { revenue, orders, averageOrder: orders ? revenue / orders : 0, previousRevenue, growth },
      customers: { total: customers, new: newCustomers },
      operations: { lowStock, openLeads, activeTasks, helpdeskOpen, helpdeskOverdue },
      channels: channelGroups.map(item => ({ channel: item.source, orders: item._count, revenue: Number(item._sum.finalAmount || 0) })),
      marketplaces: channelGroups.filter(item => ['WILDBERRIES', 'OZON', 'YANDEX_MARKET', 'MEGAMARKET'].includes(item.source)).map(item => ({ channel: item.source, orders: item._count, revenue: Number(item._sum.finalAmount || 0) })),
      recentOrders,
    };
  }
}
