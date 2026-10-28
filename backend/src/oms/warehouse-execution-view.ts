import { executionSnapshot } from './execution-snapshot';

/** Expose only confirmed 1C facts, with a freshness check against the current order. */
export function warehouseExecutionView(snapshot: any, order: any, now = new Date()) {
  if (!snapshot) return null;
  const { basisHash, ...safe } = snapshot;
  const matchesOrder = basisHash === executionSnapshot(order) && (snapshot.executionVersion ?? null) === (order.execution?.version ?? null);
  const expiresAt = new Date(snapshot.validUntil).getTime();
  const fresh = Number.isFinite(expiresAt) && expiresAt > now.getTime();
  return { ...safe, isCurrent: matchesOrder && fresh, staleReason: !matchesOrder ? 'ORDER_CHANGED' : !fresh ? 'EXPIRED' : null };
}

/** Customer-facing progress omits 1C identifiers, staff, errors and line details. */
export function customerWarehouseView(snapshot: any, order: any, now = new Date()) {
  const view = warehouseExecutionView(snapshot, order, now);
  if (!view) return null;
  const stages = new Set(['RECEIVED', 'RESERVING', 'RESERVED', 'PARTIAL_RESERVE', 'READY_FOR_PICKING', 'PICKING', 'PICKED', 'CHECKING', 'CHECKED', 'PACKED', 'READY_TO_SHIP', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_RETURNED', 'RETURNED', 'CANCELLED']);
  const stage = view.isCurrent ? (stages.has(view.status) ? view.status : 'NEEDS_ATTENTION') : null;
  return { stage, asOf: view.asOf, isCurrent: view.isCurrent };
}
