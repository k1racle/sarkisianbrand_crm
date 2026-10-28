import { OrderStatus, Prisma } from '@prisma/client';
import { executionSnapshot } from './execution-snapshot';
import { oneCFinanceState } from '../1c-sync/finance-policy';

const assembling = new Set(['PICKING', 'PICKED', 'CHECKING', 'CHECKED', 'PACKED', 'READY_TO_SHIP', 'PARTIALLY_SHIPPED']);

/**
 * Project 1C's already-confirmed facts after every SKU is covered by a fresh
 * warehouse stock snapshot. Caller locks all supplied Orders, then Variants,
 * in stable order in the same transaction. The integration row is locked
 * afterwards so a settings change cannot invalidate the projection mid-commit.
 * Never moves physical stock here.
 */
export async function projectCoveredOrders(tx: Prisma.TransactionClient, orderIds: string[], now = new Date()) {
  const result = { projected: 0, pending: 0, review: 0 };
  await tx.$queryRaw`SELECT id FROM "EcosystemIntegration" WHERE "key" = ${'ONE_C'} FOR SHARE`;
  const integration = await tx.ecosystemIntegration.findUnique({ where: { key: 'ONE_C' }, select: { isEnabled: true, config: true } });
  const config = integration?.config as Record<string, unknown> | null | undefined;
  for (const id of [...new Set(orderIds)].sort()) {
    const order = await tx.order.findUnique({
      where: { id },
      include: {
        execution: true, warehouseExecution: true, oneCFinance: true, payments: true,
        items: { include: { warehouseCoverage: true, variant: { include: { product: { select: { externalId: true } }, oneCWarehouseStock: true } } } },
      },
    });
    if (!order || order.fulfillmentManaged || !order.execution || !order.warehouseExecution) { result.pending++; continue; }
    const snapshot = order.warehouseExecution;
    if (!integration?.isEnabled || !config?.warehouseId || config.warehouseId !== snapshot.warehouseId || snapshot.owner !== 'ONE_C' || snapshot.basisHash !== executionSnapshot(order) || snapshot.executionVersion !== order.execution.version || snapshot.validUntil <= now || order.reservationState !== 'ACTIVE' || !Array.isArray(snapshot.lines)) { result.pending++; continue; }
    const items = order.items.filter(item => item.productType === 'PHYSICAL');
    if (!items.length || items.length !== order.items.length || snapshot.lines.length !== items.length) { result.review++; continue; }
    const facts = new Map((snapshot.lines as any[]).map(line => [line.orderItemId, line]));
    const covered = items.every(item => {
      const fact = facts.get(item.id), coverage = item.warehouseCoverage, variant = item.variant, stock = variant?.oneCWarehouseStock;
      return fact && coverage && variant && stock && coverage.eventId === snapshot.eventId && coverage.revision === snapshot.revision &&
        coverage.reserved === fact.reserved && coverage.shipped === fact.shipped && coverage.cancelled === fact.cancelled &&
        stock.warehouseId === snapshot.warehouseId && stock.sku === variant.sku && stock.externalProductId === variant.product.externalId &&
        stock.validUntil > now && stock.asOf >= snapshot.asOf && Array.isArray(stock.coveredEventIds) && stock.coveredEventIds.includes(snapshot.eventId) &&
        variant.stock === stock.stock && variant.reserved === stock.reserved1C + stock.localPending;
    });
    if (!covered) { result.pending++; continue; }
    // Cancellations, returns and corrections carry separate financial consequences.
    // Preserve the confirmed 1C facts for review until those consequences are reconciled.
    if (items.some(item => { const fact = facts.get(item.id); return fact.cancelled || fact.returned || fact.damaged || fact.picked < item.pickedQuantity || fact.shipped < item.shippedQuantity; })) { result.review++; continue; }
    if (!assembling.has(snapshot.status) && snapshot.status !== 'SHIPPED') { result.pending++; continue; }
    const complete = snapshot.status === 'SHIPPED' && items.every(item => facts.get(item.id).shipped === item.quantity);
    if (snapshot.status === 'SHIPPED' && !complete) { result.review++; continue; }
    if (order.source === 'WEB' && !(order.paymentStatus === 'SUCCEEDED' && order.payments.some(payment => payment.status === 'SUCCEEDED'))) { result.review++; continue; }
    if (order.source === 'B2B' && items.some(item => facts.get(item.id).shipped > 0) && !oneCFinanceState(order, now).releaseAllowed) { result.review++; continue; }
    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status) || (order.status === OrderStatus.SHIPPED && !complete)) { result.review++; continue; }
    const nextStatus = complete ? OrderStatus.SHIPPED : OrderStatus.ASSEMBLING;
    for (const item of items) {
      const fact = facts.get(item.id);
      if (item.pickedQuantity !== fact.picked || item.shippedQuantity !== fact.shipped) {
        await tx.orderItem.update({ where: { id: item.id }, data: { pickedQuantity: fact.picked, shippedQuantity: fact.shipped } });
      }
    }
    if (order.status !== nextStatus || complete) {
      const previousStatus = order.status;
      await tx.order.update({ where: { id }, data: { status: nextStatus, ...(complete ? { reservationState: 'CONSUMED', reservationExpiresAt: null } : {}) } });
      if (previousStatus !== nextStatus) await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: previousStatus, toStatus: nextStatus, comment: `Подтверждено складом 1С: ${snapshot.status}` } });
      result.projected++;
    }
  }
  return result;
}
