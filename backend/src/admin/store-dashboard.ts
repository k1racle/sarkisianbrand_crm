import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MOSCOW_OFFSET = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export function dashboardPeriod(value: string | number = 30, now = new Date()) {
  const days = Number(value);
  if (![7, 30].includes(days)) throw new BadRequestException('Выберите период 7 или 30 дней');
  const today = new Date(new Date(now.getTime() + MOSCOW_OFFSET).toISOString().slice(0, 10) + 'T00:00:00Z').getTime() - MOSCOW_OFFSET;
  return { days, from: new Date(today - (days - 1) * DAY), to: new Date(today + DAY) };
}

// Read-only WEB snapshot. Cancelled/refunded orders never inflate sales;
// gift cards do not create physical inventory warnings. Dates use Moscow time.
export async function storeDashboard(db: PrismaService, days: string | number = 30, now = new Date()) {
  const period = dashboardPeriod(days, now);
  const trash = await db.dataTrashEntry.findMany({ where: { entityType: 'PRODUCT', status: 'TRASHED' }, select: { entityId: true } });
  const published: Prisma.ProductWhereInput = { isActive: true, id: { notIn: trash.map(item => item.entityId) } };
  const physical: Prisma.ProductWhereInput = { ...published, productType: { not: 'GIFT_CARD' } };
  const paid: Prisma.OrderWhereInput = { source: 'WEB', paymentStatus: { in: ['PAID', 'SUCCEEDED'] }, status: { notIn: ['CANCELLED', 'REFUNDED'] } };
  const inPeriod: Prisma.OrderWhereInput = { source: 'WEB', createdAt: { gte: period.from, lt: period.to } };
  const [orders, paidOrders, customers, products, sales, periodOrders, stages, recentOrders, missingImages, uncategorized, outOfStock, lowStock, syncErrors, daily] = await db.$transaction([
    db.order.count({ where: { source: 'WEB' } }),
    db.order.count({ where: paid }),
    db.customer.count(),
    db.product.count({ where: published }),
    db.order.aggregate({ where: { ...paid, ...inPeriod }, _sum: { finalAmount: true }, _count: { _all: true } }),
    db.order.count({ where: inPeriod }),
    db.order.groupBy({ by: ['status'], orderBy: { status: 'asc' }, where: { source: 'WEB' }, _count: { _all: true } }),
    db.order.findMany({ where: { source: 'WEB' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 6, select: { id: true, orderNumber: true, createdAt: true, finalAmount: true, status: true, paymentStatus: true } }),
    db.product.count({ where: { ...physical, images: { none: {} } } }),
    db.product.count({ where: { ...physical, categories: { none: {} } } }),
    db.product.count({ where: { ...physical, NOT: { variants: { some: { isActive: true, stock: { gt: db.productVariant.fields.reserved } } } } } }),
    db.productVariant.count({ where: { product: physical, isActive: true, stock: { gt: db.productVariant.fields.reserved, lte: 5 } } }),
    db.order.count({ where: { source: 'WEB', isSynced1C: false, oneCSyncError: { not: null }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
    db.$queryRaw<Array<{ day: string; revenue: Prisma.Decimal; count: bigint }>>(Prisma.sql`
      SELECT to_char("createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day,
             SUM("finalAmount") AS revenue, COUNT(*) AS count
      FROM "Order" WHERE source = 'WEB' AND "paymentStatus" IN ('PAID', 'SUCCEEDED')
        AND status NOT IN ('CANCELLED', 'REFUNDED')
        AND "createdAt" >= ${period.from} AND "createdAt" < ${period.to}
      GROUP BY day ORDER BY day
    `),
  ]);
  const byDay = new Map(daily.map(item => [item.day, item]));
  const revenue = Number(sales._sum.finalAmount || 0);
  const salesCount = sales._count._all;
  const queue = Object.fromEntries(stages.map(item => [item.status, typeof item._count === 'object' ? item._count._all || 0 : 0]));
  const trend = Array.from({ length: period.days }, (_, index) => {
    const day = new Date(period.from.getTime() + index * DAY + MOSCOW_OFFSET).toISOString().slice(0, 10);
    return { day, revenue: Number(byDay.get(day)?.revenue || 0), orders: Number(byDay.get(day)?.count || 0) };
  });
  return { orders, paidOrders, customers, products, lowStock, newOrders: queue.NEW || 0, period: { days: period.days, from: period.from, to: period.to }, sales: { revenue, paidOrders: salesCount, orders: periodOrders, averageOrder: salesCount ? revenue / salesCount : 0 }, queue, recentOrders, issues: { missingImages, uncategorized, outOfStock, lowStock, syncErrors }, trend, generatedAt: now.toISOString() };
}
